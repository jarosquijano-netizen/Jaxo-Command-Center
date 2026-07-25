"""
Servicio de integración con Alcampo Online (compraonline.alcampo.es).

Alcampo tiene una web estándar (sin el anti-bot agresivo de Mercadona):
- Búsqueda: /search?q=QUERY  → botones "Añadir" en cada producto
- Login:    /login → #uname1 (email), #pwd1 (password), #btnSubmit_login

Reutiliza el Chromium de Playwright y los flags estables ya probados.
"""

import asyncio
import logging
import os
from typing import List, Dict, Optional
from urllib.parse import quote

# Reutilizar constantes de navegador ya probadas
from services.mercadona_service import CHROMIUM_ARGS, REALISTIC_UA

logger = logging.getLogger(__name__)

ALCAMPO_URL = "https://www.compraonline.alcampo.es"


class AlcampoService:

    def __init__(self):
        self.email = os.getenv("ALCAMPO_EMAIL", "").strip()
        self.password = os.getenv("ALCAMPO_PASSWORD", "").strip()
        # Reutiliza el CP de Mercadona si no hay uno específico de Alcampo
        self.postal_code = (
            os.getenv("ALCAMPO_POSTAL_CODE")
            or os.getenv("MERCADONA_POSTAL_CODE")
            or "08800"
        ).strip()

    def is_configured(self) -> bool:
        return bool(self.email and self.password)

    # ── Entrada pública ──────────────────────────────────────────────────

    def sync_cart(self, items: List[Dict]) -> Dict:
        if not self.is_configured():
            return {
                "success": False,
                "error": (
                    "Credenciales de Alcampo no configuradas. Añade ALCAMPO_EMAIL "
                    "y ALCAMPO_PASSWORD en Railway → Variables."
                ),
            }
        try:
            return asyncio.run(self._sync_cart_async(items))
        except Exception as e:
            logger.error(f"[alcampo] sync_cart error: {e}", exc_info=True)
            return {"success": False, "error": str(e)}

    # ── Helpers de navegador ─────────────────────────────────────────────

    async def _block_heavy(self, context):
        async def _route(route):
            try:
                if route.request.resource_type in ("image", "media", "font"):
                    await route.abort()
                else:
                    await route.continue_()
            except Exception:
                try:
                    await route.continue_()
                except Exception:
                    pass
        await context.route("**/*", _route)

    async def _goto(self, page, url, attempts=3):
        last = None
        for n in range(1, attempts + 1):
            try:
                await page.goto(url, wait_until="commit", timeout=45000)
                try:
                    await page.wait_for_load_state("domcontentloaded", timeout=20000)
                except Exception:
                    pass
                await page.wait_for_timeout(1500)
                if page.url.startswith("chrome-error"):
                    raise RuntimeError("chrome-error (conexión reseteada)")
                return
            except Exception as e:
                last = e
                logger.warning(f"[alcampo] goto {n}/{attempts} falló: {str(e)[:100]}")
                await page.wait_for_timeout(2500 * n)
        raise last

    async def _accept_cookies(self, page):
        for sel in ("button:has-text('Aceptar todas')",
                    "button:has-text('Aceptar cookies')",
                    "#onetrust-accept-btn-handler"):
            try:
                await page.click(sel, timeout=3000)
                await page.wait_for_timeout(1000)
                return
            except Exception:
                continue

    async def _login(self, page) -> bool:
        from playwright.async_api import TimeoutError as PWTimeout
        try:
            await self._goto(page, ALCAMPO_URL + "/login")
            await self._accept_cookies(page)
            email = await page.wait_for_selector("#uname1, input[type='email']", timeout=15000)
            await email.fill(self.email)
            pwd = await page.wait_for_selector("#pwd1, input[type='password']", timeout=8000)
            await pwd.fill(self.password)
            try:
                await page.click("#btnSubmit_login", timeout=5000)
            except Exception:
                await page.keyboard.press("Enter")
            # Esperar a volver al dominio de la tienda (login OK) o detectar error
            for _ in range(20):
                await page.wait_for_timeout(1000)
                if "compraonline.alcampo.es" in page.url and "/login" not in page.url:
                    logger.info("[alcampo] login OK")
                    return True
            # ¿mensaje de error?
            logger.warning(f"[alcampo] login no confirmado, url={page.url}")
            return "compraonline.alcampo.es" in page.url
        except PWTimeout as e:
            logger.warning(f"[alcampo] login timeout: {e}")
            return False
        except Exception as e:
            logger.warning(f"[alcampo] login error: {e}")
            return False

    async def _add_item(self, page, query: str) -> Dict:
        """Busca `query` y añade el primer producto (botón 'Añadir')."""
        from playwright.async_api import TimeoutError as PWTimeout
        url = f"{ALCAMPO_URL}/search?q={quote(query)}"
        await self._goto(page, url)
        await self._accept_cookies(page)
        # Esperar resultados
        try:
            await page.wait_for_selector("button:has-text('Añadir')", timeout=12000)
        except PWTimeout:
            return {"found": False}
        # Clic en el primer 'Añadir'
        try:
            btn = page.locator("button:has-text('Añadir')").first
            await btn.scroll_into_view_if_needed(timeout=5000)
            await btn.click(timeout=8000)
            await page.wait_for_timeout(1500)
            return {"found": True}
        except Exception as e:
            logger.warning(f"[alcampo] no se pudo añadir '{query}': {str(e)[:80]}")
            return {"found": False}

    # ── Flujo principal ──────────────────────────────────────────────────

    async def _sync_cart_async(self, items: List[Dict]) -> Dict:
        from playwright.async_api import async_playwright

        added, not_found, errors = [], [], []
        launch_env = dict(os.environ)
        launch_env["HOME"] = "/tmp"

        async with async_playwright() as pw:
            browser = await pw.chromium.launch(
                headless=True, executable_path=None, chromium_sandbox=False,
                timeout=90000, env=launch_env, args=CHROMIUM_ARGS,
            )
            try:
                context = await browser.new_context(
                    viewport={"width": 1366, "height": 900},
                    user_agent=REALISTIC_UA, locale="es-ES",
                    extra_http_headers={"Accept-Language": "es-ES,es;q=0.9"},
                )
                await self._block_heavy(context)
                page = await context.new_page()

                # 1. Login (necesario para que el carrito quede en su cuenta)
                if not await self._login(page):
                    return {"success": False, "error": "Login fallido. Verifica ALCAMPO_EMAIL/ALCAMPO_PASSWORD."}

                # 2. Añadir cada producto
                for item in items:
                    if isinstance(item, str):
                        name, qty = item, ""
                    else:
                        name = item.get("nombre") or item.get("name") or item.get("producto") or item.get("item") or ""
                        qty = item.get("cantidad") or item.get("quantity") or item.get("qty") or ""
                    name = str(name).strip()
                    if not name:
                        continue
                    try:
                        res = await self._add_item(page, name)
                        if res["found"]:
                            added.append(name)
                        else:
                            not_found.append(name)
                    except Exception as e:
                        errors.append(f"{name} ({str(e)[:50]})")
            finally:
                await browser.close()

        return {
            "success": True,
            "summary": {"added": len(added), "not_found": len(not_found), "errors": len(errors)},
            "added": added,
            "not_found": not_found,
            "errors": errors,
            "added_detail": [{"query": a} for a in added],
        }


alcampo_service = AlcampoService()
