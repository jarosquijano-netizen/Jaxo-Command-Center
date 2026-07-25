"""
Rutas API para integración con Mercadona Online
"""

import json
import logging
import threading
import uuid
from datetime import datetime
from flask import Blueprint, request, jsonify
from extensions import limiter

logger = logging.getLogger(__name__)

mercadona_bp = Blueprint("mercadona", __name__)

# In-memory job store (good enough for single-instance Railway deploy)
_jobs: dict = {}


def _run_job(job_id: str, items: list):
    """Background thread: runs Playwright and updates job status."""
    from services.mercadona_service import mercadona_service
    _jobs[job_id]["status"] = "running"
    try:
        result = mercadona_service.sync_cart(items)
        _jobs[job_id].update({"status": "done", "result": result, "finished_at": datetime.utcnow().isoformat()})
        # Persist successfully added items for pantry-awareness in future menus
        if result.get("success") and result.get("added_detail"):
            _save_purchase_history(result["added_detail"], job_id)
    except Exception as e:
        _jobs[job_id].update({"status": "error", "result": {"success": False, "error": str(e)}, "finished_at": datetime.utcnow().isoformat()})


def _save_purchase_history(added_items: list, job_id: str):
    """Saves purchased items to DB so the AI can avoid re-buying non-perishables."""
    try:
        from app import app
        from extensions import db
        from models.shopping import PurchaseHistory
        with app.app_context():
            for item in added_items:
                if isinstance(item, dict):
                    name = item.get("query") or item.get("nombre") or item.get("producto") or ""
                    qty  = item.get("cantidad") or item.get("quantity") or ""
                else:
                    name, qty = str(item), ""
                if not name:
                    continue
                db.session.add(PurchaseHistory(item_name=name, quantity=qty, job_id=job_id))
            db.session.commit()
            logger.info(f"[mercadona] saved {len(added_items)} items to purchase_history")
    except Exception as e:
        logger.warning(f"[mercadona] could not save purchase history: {e}")


# ── Endpoints ──────────────────────────────────────────────────────────────

@mercadona_bp.route("/status", methods=["GET"])
def status():
    """Check if Mercadona credentials are configured."""
    from services.mercadona_service import mercadona_service
    return jsonify({
        "success": True,
        "configured": mercadona_service.is_configured(),
        "postal_code": mercadona_service.postal_code,
        "email_hint": (mercadona_service.email[:3] + "***@***") if mercadona_service.email else None,
    })


@mercadona_bp.route("/sync", methods=["POST"])
@(limiter.limit("5 per hour") if limiter else (lambda f: f))
def start_sync():
    """
    Launches Playwright in a background thread to add shopping list to Mercadona cart.
    Returns a job_id immediately; poll /api/mercadona/job/<job_id> for progress.

    Body (optional):
    {
        "items": [{"nombre": "Tomates", "cantidad": "1 kg"}, ...],
        "week_start": "2026-07-20",  // semana a sincronizar (por defecto la actual)
        "extra_items": [...]
        // si items se omite, carga la lista del menú de la semana indicada
    }
    """
    from datetime import datetime as _dt
    from services.mercadona_service import mercadona_service
    from services.menu_service import menu_service

    if not mercadona_service.is_configured():
        return jsonify({
            "success": False,
            "error": (
                "Credenciales no configuradas. "
                "Añade MERCADONA_EMAIL, MERCADONA_PASSWORD y MERCADONA_POSTAL_CODE "
                "en Railway → Variables."
            ),
        }), 400

    data = request.get_json() or {}
    items = data.get("items")
    extra_items = data.get("extra_items", [])
    week_start_str = data.get("week_start")

    # Parsear la semana solicitada (o usar la actual)
    week_start = None
    if week_start_str:
        try:
            week_start = _dt.strptime(week_start_str, "%Y-%m-%d").date()
        except ValueError:
            return jsonify({"success": False, "error": "week_start inválida (usa YYYY-MM-DD)"}), 400

    # Auto-load from the requested week's menu if no items provided
    if not items:
        try:
            menu = menu_service.get_weekly_menu(week_start)  # None = semana actual
            if not menu:
                items = []  # no menu, just use extras below
            else:
                menu_data = menu.get("menu_data", {})
                if isinstance(menu_data, str):
                    menu_data = json.loads(menu_data)

                lista = menu_data.get("lista_compra", {})
                # lista may be a dict with category keys or have an "items" list
                if isinstance(lista, dict) and "items" not in lista:
                    # flatten all category items
                    flat = []
                    for cat_items in lista.values():
                        if isinstance(cat_items, list):
                            flat.extend(cat_items)
                        elif isinstance(cat_items, dict):
                            flat.extend(cat_items.get("items", []))
                    items = flat
                else:
                    items = lista.get("items", []) if isinstance(lista, dict) else []
        except Exception as e:
            logger.error(f"[mercadona] error loading menu: {e}")
            return jsonify({"success": False, "error": f"Error cargando menú: {str(e)}"}), 500

    # Merge extras (bebidas, limpieza, etc. added manually by user)
    if extra_items:
        items = list(items) + [e for e in extra_items if isinstance(e, (str, dict))]

    if not items:
        return jsonify({"success": False, "error": "No hay artículos en la lista. Genera el menú o añade extras primero."}), 400

    # Validate item count (max 60 to avoid very long sessions)
    if len(items) > 60:
        items = items[:60]

    job_id = str(uuid.uuid4())[:8]
    _jobs[job_id] = {
        "status": "pending",
        "total_items": len(items),
        "started_at": datetime.utcnow().isoformat(),
        "result": None,
    }

    t = threading.Thread(target=_run_job, args=(job_id, items), daemon=True)
    t.start()

    logger.info(f"[mercadona] job {job_id} started with {len(items)} items")
    return jsonify({
        "success": True,
        "job_id": job_id,
        "total_items": len(items),
        "message": f"Sincronización iniciada ({len(items)} productos). Consulta el estado en /api/mercadona/job/{job_id}",
    })


@mercadona_bp.route("/job/<job_id>", methods=["GET"])
def job_status(job_id: str):
    """Poll the status of a sync job."""
    job = _jobs.get(job_id)
    if not job:
        return jsonify({"success": False, "error": "Job no encontrado"}), 404
    return jsonify({"success": True, "job_id": job_id, **job})


@mercadona_bp.route("/diag", methods=["GET"])
def diag():
    """Diagnóstico: lanza Chromium y navega a ?url= (about:blank por defecto).
    Toggles: ?block=0 ?http2=1 ?zygote=1 para aislar la causa del crash."""
    from services.mercadona_service import mercadona_service
    url = request.args.get("url", "about:blank")
    opts = {k: request.args.get(k) for k in ("block", "http2", "zygote", "gpu", "bundled") if request.args.get(k) is not None}
    return jsonify(mercadona_service.diagnose(url, opts))


@mercadona_bp.route("/explore", methods=["GET"])
def explore():
    """Mapea la estructura de una web (?url=). Para diseñar la automatización."""
    from services.mercadona_service import mercadona_service
    url = request.args.get("url", "")
    if not url:
        return jsonify({"ok": False, "error": "url requerida"}), 400
    return jsonify(mercadona_service.explore(url))


@mercadona_bp.route("/diag-login", methods=["GET"])
def diag_login():
    """Diagnóstico: captura la estructura de la página de login de Mercadona."""
    from services.mercadona_service import mercadona_service
    return jsonify(mercadona_service.diagnose_login())


@mercadona_bp.route("/search", methods=["POST"])
@(limiter.limit("20 per hour") if limiter else (lambda f: f))
def search():
    """
    Test: search a single product on Mercadona (checks connectivity + credentials).
    Body: { "query": "leche entera" }
    """
    from services.mercadona_service import mercadona_service
    data = request.get_json() or {}
    query = str(data.get("query", "")).strip()[:100]
    if not query:
        return jsonify({"success": False, "error": "query requerida"}), 400
    return jsonify(mercadona_service.search_product(query))
