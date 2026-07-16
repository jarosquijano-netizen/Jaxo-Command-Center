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
    except Exception as e:
        _jobs[job_id].update({"status": "error", "result": {"success": False, "error": str(e)}, "finished_at": datetime.utcnow().isoformat()})


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
        "items": [{"nombre": "Tomates", "cantidad": "1 kg"}, ...]
        // if omitted, loads from current week's menu automatically
    }
    """
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

    # Auto-load from current week's menu if no items provided
    if not items:
        try:
            menu = menu_service.get_weekly_menu()
            if not menu:
                menu = menu_service.get_latest_menu()
            if not menu:
                return jsonify({"success": False, "error": "No hay menú disponible."}), 400

            menu_data = menu.get("menu_data", {})
            if isinstance(menu_data, str):
                menu_data = json.loads(menu_data)

            items = menu_data.get("lista_compra", {}).get("items", [])
            if not items:
                return jsonify({"success": False, "error": "La lista de la compra está vacía. Genera el menú primero."}), 400
        except Exception as e:
            logger.error(f"[mercadona] error loading menu: {e}")
            return jsonify({"success": False, "error": f"Error cargando menú: {str(e)}"}), 500

    # Validate item count (max 50 to avoid very long sessions)
    if len(items) > 50:
        items = items[:50]

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
