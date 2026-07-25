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

# Flags de lanzamiento de Chromium probados en Railway (via /diag).
# --disable-http2 evita ERR_HTTP2_PROTOCOL_ERROR intermitente con Mercadona.
# NO añadir --single-process ni --disable-features=VizDisplayCompositor (crashean).
CHROMIUM_ARGS = [
    "--no-sandbox",
    "--disable-setuid-sandbox",
    "--disable-dev-shm-usage",
    "--disable-gpu",
    "--disable-software-rasterizer",
    "--no-zygote",
    "--disable-extensions",
    "--memory-pressure-off",
    "--disable-accelerated-2d-canvas",
    "--disable-webgl",
]

# User-agent realista y actual (coincide con Chromium 130 que trae nix)
REALISTIC_UA = (
    "Mozilla/5.0 (Windows NT 10.0; Win64; x64) "
    "AppleWebKit/537.36 (KHTML, like Gecko) "
    "Chrome/130.0.0.0 Safari/537.36"
)


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

        # HOME escribible: Chromium necesita escribir su perfil/crashpad o
        # crashea al arrancar. En Railway el HOME por defecto puede no serlo.
        launch_env = dict(os.environ)
        launch_env["HOME"] = "/tmp"
        # DEBUG=pw:browser hace que Playwright vuelque el stdout/stderr de
        # Chromium al log del proceso (visible en Railway) → causa real del crash.
        launch_env.setdefault("DEBUG", "pw:browser")

        # Por defecto usa el Chromium de Playwright (executable_path=None), más
        # estable. Con USE_NIX_CHROMIUM=1 se puede volver al de nix.
        chromium_bin = self._chromium_path() if os.getenv("USE_NIX_CHROMIUM") == "1" else None
        logger.info(f"[mercadona] lanzando Chromium: {chromium_bin or '(bundled Playwright)'}")

        async with async_playwright() as pw:
            browser = await pw.chromium.launch(
                headless=True,
                executable_path=chromium_bin,
                chromium_sandbox=False,
                timeout=90000,
                env=launch_env,
                args=CHROMIUM_ARGS,
            )
            context = await browser.new_context(
                viewport={"width": 1366, "height": 900},
                user_agent=REALISTIC_UA,
                locale="es-ES",
                extra_http_headers={
                    "Accept-Language": "es-ES,es;q=0.9",
                },
            )
            await self._block_heavy_resources(context)
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
                    if isinstance(item, str):
                        name, qty = item, ""
                    else:
                        name = item.get("nombre") or item.get("name") or item.get("producto") or item.get("item") or ""
                        qty  = item.get("cantidad") or item.get("quantity") or item.get("qty") or ""
                    name = str(name).strip()
                    if not name:
                        continue
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
                "added": len(added),
                "not_found": len(not_found),
                "errors": len(errors),
            },
            "added": [a["query"] if isinstance(a, dict) else a for a in added],
            "not_found": not_found,
            "errors": errors,
            "added_detail": added,
        }

    async def _block_heavy_resources(self, context):
        """Aborta imágenes/vídeo/fuentes para reducir memoria (evita OOM del renderer).
        Mantiene CSS/JS para que la SPA funcione y los selectores existan."""
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

    async def _goto_with_retry(self, page, url, attempts=3):
        """Navega con reintentos. Usa wait_until='commit' (se resuelve en cuanto
        el servidor responde) y luego espera el DOM sin que sea fatal — la SPA de
        Mercadona a veces no dispara 'domcontentloaded' a tiempo."""
        last_err = None
        for n in range(1, attempts + 1):
            try:
                await page.goto(url, wait_until="commit", timeout=45000)
                try:
                    await page.wait_for_load_state("domcontentloaded", timeout=20000)
                except Exception:
                    pass
                await page.wait_for_timeout(2000)
                # Detectar página de error de Chrome (conexión reseteada por anti-bot)
                if page.url.startswith("chrome-error"):
                    raise RuntimeError("chrome-error (conexión reseteada, posible anti-bot)")
                return
            except Exception as e:
                last_err = e
                logger.warning(f"[mercadona] goto intento {n}/{attempts} falló: {str(e)[:120]}")
                await page.wait_for_timeout(3000 * n)
        raise last_err

    def explore(self, url: str) -> Dict:
        """Mapea la estructura de una web (enlaces, inputs, botones) para diseñar la automatización."""
        try:
            return asyncio.run(self._explore_async(url))
        except Exception as e:
            return {"ok": False, "error": f"wrapper: {e}"}

    async def _explore_async(self, url: str) -> Dict:
        from playwright.async_api import async_playwright
        result: Dict = {"url_requested": url}
        launch_env = dict(os.environ); launch_env["HOME"] = "/tmp"
        async with async_playwright() as pw:
            browser = await pw.chromium.launch(
                headless=True, executable_path=None, chromium_sandbox=False,
                timeout=90000, env=launch_env, args=CHROMIUM_ARGS,
            )
            try:
                context = await browser.new_context(
                    viewport={"width": 1366, "height": 900}, user_agent=REALISTIC_UA,
                    locale="es-ES", extra_http_headers={"Accept-Language": "es-ES,es;q=0.9"},
                )
                await self._block_heavy_resources(context)
                page = await context.new_page()
                await self._goto_with_retry(page, url, attempts=3)
                await page.wait_for_timeout(3000)
                result["final_url"] = page.url
                result["title"] = await page.title()
                # Enlaces con texto+href relevantes (login, buscar, carrito, cuenta)
                result["links"] = await page.eval_on_selector_all(
                    "a[href]",
                    """els => els.map(e => ({t:(e.innerText||'').trim().slice(0,30), href:e.getAttribute('href')}))
                        .filter(x => /login|acced|entrar|sesi|cuenta|buscar|search|carrito|cart|registr/i.test((x.t||'')+' '+(x.href||'')))
                        .slice(0,25)""",
                )
                result["inputs"] = await page.eval_on_selector_all(
                    "input, [role=searchbox], [contenteditable=true]",
                    "els => els.map(e => ({type:e.type||e.tagName, name:e.name, id:e.id, placeholder:e.placeholder, aria:e.getAttribute('aria-label')})).slice(0,25)",
                )
                result["buttons"] = await page.eval_on_selector_all(
                    "button, [role=button]",
                    "els => els.map(e => ((e.innerText||e.getAttribute('aria-label')||'').trim())).filter(Boolean).slice(0,30)",
                )
                result["ok"] = True
            except Exception as e:
                result["ok"] = False
                result["error"] = str(e)[:300]
            finally:
                await browser.close()
        return result

    def diagnose_login(self) -> Dict:
        """Captura la estructura real de la página de login para ajustar selectores."""
        try:
            return asyncio.run(self._diagnose_login_async())
        except Exception as e:
            return {"ok": False, "error": f"wrapper: {e}"}

    async def _diagnose_login_async(self) -> Dict:
        from playwright.async_api import async_playwright
        result: Dict = {}
        launch_env = dict(os.environ); launch_env["HOME"] = "/tmp"

        async def snapshot(page, label):
            data = {"label": label, "url": page.url}
            try:
                data["title"] = await page.title()
            except Exception:
                pass
            try:
                data["inputs"] = await page.eval_on_selector_all(
                    "input",
                    "els => els.map(e => ({type:e.type, name:e.name, id:e.id, placeholder:e.placeholder, ariaLabel:e.getAttribute('aria-label')}))",
                )
            except Exception as e:
                data["inputs_err"] = str(e)[:100]
            try:
                data["buttons"] = await page.eval_on_selector_all(
                    "button, a",
                    "els => els.map(e => (e.innerText||'').trim()).filter(t => t && t.length < 40).slice(0, 40)",
                )
            except Exception as e:
                data["buttons_err"] = str(e)[:100]
            return data

        async with async_playwright() as pw:
            browser = await pw.chromium.launch(
                headless=True, executable_path=None, chromium_sandbox=False,
                timeout=90000, env=launch_env, args=CHROMIUM_ARGS,
            )
            try:
                context = await browser.new_context(
                    viewport={"width": 1366, "height": 900}, user_agent=REALISTIC_UA,
                    locale="es-ES", extra_http_headers={"Accept-Language": "es-ES,es;q=0.9"},
                )
                await self._block_heavy_resources(context)
                page = await context.new_page()
                await self._set_postal_code(page)
                result["after_postal"] = await snapshot(page, "after_postal")

                # Intentar llegar al login
                clicked = None
                for sel in ["a[href*='login']", "button:has-text('Iniciar sesión')",
                            "a:has-text('Iniciar sesión')", "[aria-label*='cuenta']",
                            "[aria-label*='sesión']", "button:has-text('Entrar')"]:
                    try:
                        await page.click(sel, timeout=3000)
                        clicked = sel
                        await page.wait_for_timeout(2500)
                        break
                    except Exception:
                        continue
                result["login_clicked"] = clicked
                result["after_login_click"] = await snapshot(page, "after_login_click")
                result["ok"] = True
            except Exception as e:
                result["ok"] = False
                result["error"] = str(e)[:300]
            finally:
                await browser.close()
        return result

    async def _set_postal_code(self, page):
        """Navigate to Mercadona and set the postal code."""
        from playwright.async_api import TimeoutError as PWTimeout
        await self._goto_with_retry(page, MERCADONA_URL)
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

    def diagnose(self, url: str = "about:blank", opts: Optional[Dict] = None) -> Dict:
        """Lanza Chromium navegando a `url`, capturando su stderr real. Para depurar el crash."""
        try:
            return asyncio.run(self._diagnose_async(url, opts or {}))
        except Exception as e:
            return {"ok": False, "error": f"wrapper: {e}"}

    def _mem_info(self) -> Dict:
        """Límite y uso de memoria del contenedor (cgroup) + /proc/meminfo."""
        info: Dict = {}
        try:
            for path in ("/sys/fs/cgroup/memory.max",
                         "/sys/fs/cgroup/memory/memory.limit_in_bytes"):
                if os.path.isfile(path):
                    info["cgroup_limit"] = open(path).read().strip()
                    break
            for path in ("/sys/fs/cgroup/memory.current",
                         "/sys/fs/cgroup/memory/memory.usage_in_bytes"):
                if os.path.isfile(path):
                    info["cgroup_usage"] = open(path).read().strip()
                    break
            with open("/proc/meminfo") as f:
                mi = {}
                for line in f:
                    k, _, v = line.partition(":")
                    mi[k.strip()] = v.strip()
            info["MemTotal"] = mi.get("MemTotal")
            info["MemAvailable"] = mi.get("MemAvailable")
        except Exception as e:
            info["error"] = str(e)
        return info

    async def _diagnose_async(self, url: str = "about:blank", opts: Optional[Dict] = None) -> Dict:
        import tempfile
        from playwright.async_api import async_playwright

        opts = opts or {}
        # Toggles para aislar la causa del crash (sin redeploy):
        #   block=0 → no bloquear recursos ; http2=1 → permitir http2
        #   zygote=1 → quitar --no-zygote ; gpu=1 → quitar disable-gpu
        block = opts.get("block", "1") != "0"
        allow_http2 = opts.get("http2", "0") == "1"
        keep_zygote = opts.get("zygote", "0") == "1"
        use_bundled = opts.get("bundled", "0") == "1"  # Chromium de Playwright

        args = [a for a in CHROMIUM_ARGS]
        if allow_http2 and "--disable-http2" in args:
            args.remove("--disable-http2")
        if keep_zygote and "--no-zygote" in args:
            args.remove("--no-zygote")

        exec_path = None if use_bundled else self._chromium_path()
        result: Dict = {
            "chromium_path": exec_path or "(bundled Playwright)", "mem": self._mem_info(),
            "opts": {"block": block, "allow_http2": allow_http2, "keep_zygote": keep_zygote, "bundled": use_bundled},
            "args": args,
        }
        crash_events = []

        # Capturar fd 2 (stderr) a un fichero temporal para leer la salida de Chromium
        saved_fd = os.dup(2)
        tmp = tempfile.NamedTemporaryFile(mode="w+", delete=False, suffix=".log")
        os.dup2(tmp.fileno(), 2)

        launch_env = dict(os.environ)
        launch_env["HOME"] = "/tmp"
        launch_env["DEBUG"] = "pw:browser"

        try:
            async with async_playwright() as pw:
                browser = await pw.chromium.launch(
                    headless=True,
                    executable_path=exec_path,
                    chromium_sandbox=False,
                    timeout=90000,
                    env=launch_env,
                    args=args,
                )
                try:
                    result["version"] = browser.version
                except Exception:
                    pass
                context = await browser.new_context(
                    viewport={"width": 1366, "height": 900},
                    user_agent=REALISTIC_UA,
                    locale="es-ES",
                    extra_http_headers={"Accept-Language": "es-ES,es;q=0.9"},
                )
                browser.on("disconnected", lambda: crash_events.append("browser disconnected"))
                if block:
                    await self._block_heavy_resources(context)
                page = await context.new_page()
                page.on("crash", lambda p: crash_events.append("page crashed"))
                await self._goto_with_retry(page, url, attempts=3)
                await page.wait_for_timeout(2000)
                result["ok"] = True
                result["final_url"] = page.url
                try:
                    result["title"] = await page.title()
                except Exception:
                    pass
                await browser.close()
        except Exception as e:
            result["ok"] = False
            result["error"] = str(e)
        finally:
            result["crash_events"] = crash_events
            result["mem_after"] = self._mem_info()
            os.dup2(saved_fd, 2)
            os.close(saved_fd)
            try:
                tmp.flush(); tmp.seek(0)
                data = tmp.read()
                tmp.close()
                os.unlink(tmp.name)
            except Exception:
                data = ""
            # Últimos 4000 chars del stderr de Chromium
            result["chromium_stderr"] = data[-4000:] if data else "(vacío)"
        return result

    def _chromium_path(self) -> Optional[str]:
        """Resolve the Chromium executable path across environments."""
        import shutil
        candidates = [
            os.getenv("CHROMIUM_PATH"),               # explicit env override
            shutil.which("chromium"),                  # nix pone chromium en PATH
            shutil.which("chromium-browser"),
            "/usr/bin/chromium",                       # nixpacks nix install
            "/usr/bin/chromium-browser",               # Ubuntu/Debian
            "/usr/bin/google-chrome",                  # Chrome
            "/nix/var/nix/profiles/default/bin/chromium",
            "/root/.nix-profile/bin/chromium",
        ]
        for p in candidates:
            if p and (os.path.isfile(p) or os.path.islink(p)):
                return p
        return None  # let Playwright use its own bundled binary


mercadona_service = MercadonaService()
