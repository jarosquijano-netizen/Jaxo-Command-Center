"""
Servicio de integración con Mercadona Online
Automatiza la adición de la lista de la compra al carrito de tienda.mercadona.es
"""

import asyncio
import json
import logging
import os
import re
from typing import List, Dict, Optional

logger = logging.getLogger(__name__)

MERCADONA_URL = "https://tienda.mercadona.es"


class MercadonaService:

    def __init__(self):
        self.email       = os.getenv("MERCADONA_EMAIL", "").strip()
        self.password    = os.getenv("MERCADONA_PASSWORD", "").strip()
        self.postal_code = os.getenv("MERCADONA_POSTAL_CODE", "08001").strip()

    def is_configured(self) -> bool:
        return bool(self.email and self.password)

    # ── Public entry point (sync wrapper) ────────────────────────────────

    def sync_cart(self, items: List[Dict]) -> Dict:
        """
        Abre Mercadona en un navegador headless y añade los items al carrito.
        `items` comes from lista_compra.items in the menu JSON.
        Returns a summary dict.
        """
        if not self.is_configured():
            return {
                "success": False,
                "error": "Credenciales de Mercadona no configuradas. "
                         "Añade MERCADONA_EMAIL y MERCADONA_PASSWORD en Railway → Variables.",
            }
        try:
            return asyncio.run(self._sync_cart_async(items))
        except Exception as e:
            logger.error(f"[mercadona] sync_cart error: {e}", exc_info=True)
            return {"success": False, "error": str(e)}

    def search_product(self, query: str) -> Dict:
        """Single product search — useful for testing connectivity."""
        if not self.is_configured():
            return {"success": False, "error": "Credenciales no configuradas."}
        try:
            return asyncio.run(self._search_product_async(query))
        except Exception as e:
            return {"success": False, "error": str(e)}

    # ── Async internals ───────────────────────────────────────────────────

    async def _sync_cart_async(self, items: List[Dict]) -> Dict:
        from playwright.async_api import async_playwright, TimeoutError as PWTimeout

        added, not_found, errors = [], [], []

        async with async_playwright() as pw:
            browser = await pw.chromium.launch(
                headless=True,
                args=[
                    "--no-sandbox",
                    "--disable-setuid-sandbox",
                    "--disable-dev-shm-usage",
                    "--disable-gpu",
                    "--single-process",
                ],
                executable_path=self._chromium_path(),
            )
            context = await browser.new_context(
                viewport={"width": 1280, "height": 900},
                user_agent=(
                    "Mozilla/5.0 (X11; Linux x86_64) "
                    "AppleWebKit/537.36 (KHTML, like Gecko) "
                    "Chrome/124.0.0.0 Safari/537.36"
                ),
                locale="es-ES",
            )
            page = await context.new_page()

            try:
                # 1. Set postal code + home page
                await self._set_postal_code(page)

                # 2. Login
                logged_in = await self._login(page)
                if not logged_in:
                    return {"success": False, "error": "Login fallido. Verifica email/contraseña."}

                # 3. Process each item
                for item in items:
                    name = item.get("nombre", "")
                    qty  = item.get("cantidad", "")
                    query = f"{name} {qty}".strip()
                    try:
                        result = await self._add_item_to_cart(page, query, name)
                        if result["found"]:
                            added.append({"query": name, "producto": result["product_name"], "precio": result.get("price")})
                        else:
                            not_found.append(name)
                    except PWTimeout:
                        errors.append(f"{name} (timeout)")
                    except Exception as e:
                        errors.append(f"{name} ({str(e)[:60]})")

            finally:
                await browser.close()

        return {
            "success": True,
            "summary": {
                "añadidos": len(added),
                "no_encontrados": len(not_found),
                "errores": len(errors),
            },
            "añadidos": added,
            "no_encontrados": not_found,
            "errores": errors,
        }

    async def _set_postal_code(self, page):
        """Navigate to Mercadona and set the postal code."""
        from playwright.async_api import TimeoutError as PWTimeout
        await page.goto(MERCADONA_URL, wait_until="domcontentloaded", timeout=30000)
        await page.wait_for_timeout(2000)

        # Accept cookies if present
        try:
            await page.click("button:has-text('Aceptar')", timeout=4000)
            await page.wait_for_timeout(1000)
        except Exception:
            pass

        # Postal code modal
        try:
            cp_input = await page.wait_for_selector("input[placeholder*='postal'], input[name*='postal'], input[id*='postal']", timeout=6000)
            await cp_input.fill(self.postal_code)
            await page.keyboard.press("Enter")
            await page.wait_for_timeout(2000)
            # Confirm if a button appears
            try:
                await page.click("button:has-text('Continuar'), button:has-text('Aceptar')", timeout=3000)
                await page.wait_for_timeout(1500)
            except Exception:
                pass
        except PWTimeout:
            logger.info("[mercadona] no postal code modal found, continuing")

    async def _login(self, page) -> bool:
        """Login to Mercadona. Returns True if successful."""
        from playwright.async_api import TimeoutError as PWTimeout
        try:
            # Look for login/account button
            await page.click("a[href*='login'], button:has-text('Iniciar sesión'), [aria-label*='cuenta'], [aria-label*='login']", timeout=6000)
            await page.wait_for_timeout(1500)

            email_input = await page.wait_for_selector("input[type='email'], input[name='email']", timeout=6000)
            await email_input.fill(self.email)

            pwd_input = await page.wait_for_selector("input[type='password']", timeout=4000)
            await pwd_input.fill(self.password)

            await page.keyboard.press("Enter")
            await page.wait_for_timeout(3000)

            # Verify login worked (look for account-related element)
            try:
                await page.wait_for_selector(
                    "[data-testid='user-menu'], .user-menu, [aria-label*='cuenta'], a[href*='cuenta']",
                    timeout=5000,
                )
                logger.info("[mercadona] login OK")
                return True
            except PWTimeout:
                # Check for error message
                err = await page.query_selector(".error, [role='alert']")
                if err:
                    msg = await err.inner_text()
                    logger.warning(f"[mercadona] login error: {msg}")
                return False
        except PWTimeout as e:
            logger.warning(f"[mercadona] login timeout: {e}")
            return False

    async def _add_item_to_cart(self, page, query: str, display_name: str) -> Dict:
        """Search for `query` and add the first matching product to cart."""
        from playwright.async_api import TimeoutError as PWTimeout

        # Navigate to search
        safe_query = re.sub(r"[^a-zA-Z0-9áéíóúñÁÉÍÓÚÑüÜ\s]", " ", query).strip()
        search_url = f"{MERCADONA_URL}/buscar?query={safe_query.replace(' ', '+')}"
        await page.goto(search_url, wait_until="domcontentloaded", timeout=20000)
        await page.wait_for_timeout(1500)

        # Find first product card
        product_selector = ".product-cell, [data-testid='product-cell'], .product-card, article.product"
        try:
            await page.wait_for_selector(product_selector, timeout=8000)
        except PWTimeout:
            return {"found": False}

        products = await page.query_selector_all(product_selector)
        if not products:
            return {"found": False}

        first = products[0]

        # Get product name and price for the summary
        product_name = display_name
        price = None
        try:
            name_el = await first.query_selector(".product-cell__description-name, .product-name, h4, h3")
            if name_el:
                product_name = (await name_el.inner_text()).strip()
            price_el = await first.query_selector(".price-item, .product-price, [class*='price']")
            if price_el:
                price = (await price_el.inner_text()).strip()
        except Exception:
            pass

        # Click "Add to cart" button inside the first product
        add_btn_selector = "button[aria-label*='añadir'], button:has-text('+'), button.add-to-cart, [data-testid='add-button']"
        try:
            add_btn = await first.query_selector(add_btn_selector)
            if not add_btn:
                # Fallback: click anywhere on the product to open it, then add
                await first.click()
                await page.wait_for_timeout(1000)
                add_btn = await page.wait_for_selector(add_btn_selector, timeout=4000)
            await add_btn.click()
            await page.wait_for_timeout(800)
            return {"found": True, "product_name": product_name, "price": price}
        except Exception as e:
            logger.warning(f"[mercadona] add_to_cart failed for '{query}': {e}")
            return {"found": False}

    async def _search_product_async(self, query: str) -> Dict:
        """Search only, no cart. Used by the test/status endpoint."""
        from playwright.async_api import async_playwright
        async with async_playwright() as pw:
            browser = await pw.chromium.launch(
                headless=True,
                args=["--no-sandbox", "--disable-dev-shm-usage", "--single-process"],
                executable_path=self._chromium_path(),
            )
            page = await (await browser.new_context()).new_page()
            try:
                await self._set_postal_code(page)
                safe = re.sub(r"[^a-zA-Z0-9áéíóúñ\s]", " ", query).strip()
                await page.goto(f"{MERCADONA_URL}/buscar?query={safe.replace(' ', '+')}", timeout=20000)
                await page.wait_for_timeout(1500)
                cards = await page.query_selector_all(".product-cell, .product-card, article.product")
                results = []
                for card in cards[:5]:
                    try:
                        name_el = await card.query_selector(".product-cell__description-name, .product-name, h4")
                        price_el = await card.query_selector(".price-item, [class*='price']")
                        results.append({
                            "nombre": (await name_el.inner_text()).strip() if name_el else "—",
                            "precio": (await price_el.inner_text()).strip() if price_el else "—",
                        })
                    except Exception:
                        pass
                return {"success": True, "query": query, "resultados": results}
            finally:
                await browser.close()

    # ── Helpers ───────────────────────────────────────────────────────────

    def _chromium_path(self) -> Optional[str]:
        """Resolve the Chromium executable path across environments."""
        candidates = [
            os.getenv("CHROMIUM_PATH"),               # explicit env override
            "/usr/bin/chromium",                       # nixpacks nix install
            "/usr/bin/chromium-browser",               # Ubuntu/Debian
            "/usr/bin/google-chrome",                  # Chrome
            "/nix/var/nix/profiles/default/bin/chromium",
        ]
        for p in candidates:
            if p and os.path.isfile(p):
                return p
        return None  # let Playwright use its own bundled binary


mercadona_service = MercadonaService()
