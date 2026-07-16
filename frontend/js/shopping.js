class ShoppingManager {
    constructor() {
        this.currentShoppingList = null;
        this.currentWeek = null;
        this._extraKey = 'shopping_extras_v1';
        this.init();
    }

    async init() {
        this.setupEventListeners();
        await this.loadShoppingList();
    }

    setupEventListeners() {
        // Botón de actualizar → recalcula la lista desde el menú actual
        const refreshBtn = document.getElementById('refreshShoppingBtn');
        if (refreshBtn) {
            refreshBtn.addEventListener('click', () => {
                this.refreshShoppingList();
            });
        }

        // Botón de exportar PDF
        const exportBtn = document.getElementById('exportPdfBtn');
        if (exportBtn) {
            exportBtn.addEventListener('click', () => {
                this.exportToPDF();
            });
        }

        // Botón de sincronizar con Mercadona
        const mercadonaBtn = document.getElementById('syncMercadonaBtn');
        if (mercadonaBtn) {
            mercadonaBtn.addEventListener('click', () => {
                this.startMercadonaSync();
            });
        }

        // Cerrar modal Mercadona
        const closeBtn = document.getElementById('closeMercadonaBtn');
        if (closeBtn) {
            closeBtn.addEventListener('click', () => {
                document.getElementById('mercadonaModal').style.display = 'none';
            });
        }

        // Navegación semanal
        const prevWeekBtn = document.getElementById('prevWeekShopping');
        if (prevWeekBtn) {
            prevWeekBtn.addEventListener('click', () => {
                this.navigateWeek(-1);
            });
        }

        const nextWeekBtn = document.getElementById('nextWeekShopping');
        if (nextWeekBtn) {
            nextWeekBtn.addEventListener('click', () => {
                this.navigateWeek(1);
            });
        }

        const todayWeekBtn = document.getElementById('todayWeekShopping');
        if (todayWeekBtn) {
            todayWeekBtn.addEventListener('click', () => {
                this.navigateToToday();
            });
        }
    }

    async refreshShoppingList() {
        // Recalcula la lista de compra en el servidor (agrega todos los días
        // del menú, incluidos los generados individualmente) y recarga.
        const btn = document.getElementById('refreshShoppingBtn');
        const weekStart = this.currentWeek
            ? DateUtils.localISO(DateUtils.getMonday(DateUtils.parseWeek(this.currentWeek)))
            : DateUtils.localISO(DateUtils.currentMonday());
        try {
            if (btn) { btn.disabled = true; }
            this.setLoading(true);
            const content = document.getElementById('shoppingListContent');
            if (content) content.innerHTML = '<div class="loading">Recalculando lista de la compra…</div>';

            const res = await fetch('/api/menu/rebuild-shopping-list', {
                method: 'POST',
                headers: this._apiHeaders(),
                body: JSON.stringify({ week_start: weekStart })
            });
            const data = await res.json();
            if (!data.success) {
                console.warn('[shopping] rebuild:', data.message);
            }
        } catch (e) {
            console.error('[shopping] error recalculando lista:', e);
        } finally {
            if (btn) { btn.disabled = false; }
            // Recargar la lista (ya actualizada en el servidor)
            await this.loadShoppingList(weekStart);
        }
    }

    async loadShoppingList(targetWeek = null) {
        try {
            this.setLoading(true);

            // Por defecto SIEMPRE la semana de calendario actual (no el último menú).
            const weekStart = targetWeek || DateUtils.localISO(DateUtils.currentMonday());
            await this.loadShoppingListForWeek(weekStart);
        } catch (error) {
            console.error('Error cargando lista de compras:', error);
            this.showError('Error cargando lista de compras');
        } finally {
            this.setLoading(false);
        }
    }

    async loadShoppingListForWeek(weekStart) {
        // Anclar SIEMPRE a la semana solicitada (aunque no haya menú)
        this.currentWeek = weekStart;
        this.updateWeekDisplay();
        try {
            const result = await api.get(`/api/menu/week/${weekStart}`);

            if (result.success && result.data) {
                const menuData = result.data;
                this.currentShoppingList = menuData.lista_compra;
                this.renderShoppingList();
                this.updateWeekDisplay();
                this.updateStats();
            } else {
                this.showEmptyStateForWeek(weekStart);
            }
        } catch (error) {
            console.error('Error cargando lista de compras para semana específica:', error);
            this.showEmptyStateForWeek(weekStart);
        }
    }

    navigateWeek(direction) {
        if (!this.currentWeek) {
            this.navigateToToday();
            return;
        }

        const currentWeekDate = DateUtils.parseWeek(this.currentWeek);
        currentWeekDate.setDate(currentWeekDate.getDate() + (direction * 7));

        const weekStart = DateUtils.getMonday(currentWeekDate);
        this.loadShoppingList(DateUtils.localISO(weekStart));
    }

    navigateToToday() {
        this.loadShoppingList(DateUtils.localISO(DateUtils.currentMonday()));
    }

    getMonday(date) {
        return DateUtils.getMonday(date);
    }

    renderShoppingList() {
        const content = document.getElementById('shoppingListContent');
        if (!content || !this.currentShoppingList) return;

        let shoppingList;
        try {
            shoppingList = typeof this.currentShoppingList === 'string' 
                ? JSON.parse(this.currentShoppingList) 
                : this.currentShoppingList;
        } catch (error) {
            console.error('Error parseando lista de compras:', error);
            content.innerHTML = '<p style="text-align: center; color: var(--text-secondary);">Error al procesar la lista de compras</p>';
            return;
        }

        if (!shoppingList || Object.keys(shoppingList).length === 0) {
            content.innerHTML = '<p style="text-align: center; color: var(--text-secondary);">No hay lista de compras disponible</p>';
            return;
        }

        content.innerHTML = '';

        // Estructura NUEVA: { coste_estimado_semana: N, items: [{nombre, cantidad, categoria/seccion_super, precio_estimado}, ...] }
        // Estructura VIEJA: { verduras: [...], carniceria: [...], ... }
        const flatItems = Array.isArray(shoppingList.items) ? shoppingList.items : null;

        // Banner de coste estimado (si existe)
        const coste = shoppingList.coste_estimado_semana || shoppingList.coste_estimado || null;
        if (coste) {
            const banner = document.createElement('div');
            banner.className = 'shopping-cost-banner';
            banner.style.cssText = 'display:flex;align-items:center;justify-content:space-between;padding:12px 16px;margin-bottom:12px;background:rgba(37,99,235,.12);border:1px solid rgba(37,99,235,.35);border-radius:10px;';
            banner.innerHTML = `<span style="color:#93c5fd;font-weight:600;">Coste estimado de la semana</span><span style="color:#e2e8f0;font-weight:700;font-size:18px;">~${Number(coste).toFixed(2)}€</span>`;
            content.appendChild(banner);
        }

        // Construir grupos { categoria: [items] }
        let groups = {};
        if (flatItems) {
            // Agrupar la lista plana por sección/categoría
            flatItems.forEach(item => {
                const cat = (item.seccion_super || item.categoria || item.category || 'otros');
                const key = String(cat).toLowerCase().trim();
                (groups[key] = groups[key] || []).push(item);
            });
        } else {
            // Estructura vieja: ya viene agrupada por claves; ignorar claves no-lista
            Object.entries(shoppingList).forEach(([category, items]) => {
                if (Array.isArray(items)) groups[category] = items;
                else if (items && Array.isArray(items.items)) groups[category] = items.items;
            });
        }

        // Renderizar cada grupo
        Object.entries(groups).forEach(([category, categoryItems]) => {
            const categorySection = document.createElement('div');
            categorySection.className = 'shopping-category';

            const formattedCategory = this.formatCategoryName(category);

            categorySection.innerHTML = `
                <div class="category-header">
                    <h3>${formattedCategory}</h3>
                    <span class="item-count">${categoryItems.length} items</span>
                </div>
                <div class="items-list">
                    ${categoryItems.map((item, index) => {
                        const name = typeof item === 'string' ? item : (item.name || item.nombre || item.item || item.producto || '');
                        const qty  = (typeof item === 'object' && (item.quantity || item.cantidad || item.qty)) || '';
                        const precioNum = (typeof item === 'object') ? (item.precio_estimado || item.estimado_eur) : null;
                        const price = precioNum ? ` ~${Number(precioNum).toFixed(2)}€` : '';
                        const safeCat = String(category).replace(/[^a-z0-9]/gi, '');
                        return `
                        <div class="shopping-item">
                            <input type="checkbox" id="item-${safeCat}-${index}" ${item.completed ? 'checked' : ''}>
                            <label for="item-${safeCat}-${index}">
                                <span class="item-name">${name}</span>
                                ${qty ? `<span class="item-quantity">(${qty}${price})</span>` : (price ? `<span class="item-quantity">(${price.trim()})</span>` : '')}
                            </label>
                        </div>`;
                    }).join('')}
                </div>
            `;

            content.appendChild(categorySection);
        });

        // Añadir event listeners a los checkboxes del menú
        content.querySelectorAll('.shopping-item input[type="checkbox"]').forEach(checkbox => {
            checkbox.addEventListener('change', () => {
                this.updateStats();
            });
        });

        // Renderizar sección de extras al final
        this._renderExtrasSection();
        this.updateStats();
    }

    formatCategoryName(category) {
        const categoryNames = {
            'verduras': 'VERDURAS',
            'carniceria': 'CARNICERÍA',
            'pescaderia': 'PESCADERÍA',
            'huevos_lacteos': 'HUEVOS Y LÁCTEOS',
            'despensa': 'DESPENSA',
            'frutas': 'FRUTAS',
            'congelados': 'CONGELADOS',
            'bebidas': 'BEBIDAS',
            'limpieza': 'LIMPIEZA',
            'higiene': 'HIGIENE',
            'otros': 'OTROS',
            // Secciones del menú nuevo (seccion_super)
            'frutas y verduras': 'FRUTAS Y VERDURAS',
            'carnes y pescados': 'CARNES Y PESCADOS',
            'carne y pescado': 'CARNES Y PESCADOS',
            'lácteos y huevos': 'LÁCTEOS Y HUEVOS',
            'lacteos y huevos': 'LÁCTEOS Y HUEVOS',
            'pan y cereales': 'PAN Y CEREALES',
            'panadería': 'PANADERÍA',
        };

        return categoryNames[category.toLowerCase()] || category.toUpperCase();
    }

    updateWeekDisplay() {
        const weekDisplay = document.getElementById('shoppingWeekDisplay');
        if (weekDisplay && this.currentWeek) {
            const weekStart = DateUtils.parseWeek(this.currentWeek);
            const weekEnd = DateUtils.weekEnd(weekStart);

            const options = { day: 'numeric', month: 'long', year: 'numeric' };
            const startStr = weekStart.toLocaleDateString('es-ES', options);
            const endStr = weekEnd.toLocaleDateString('es-ES', options);

            let label = `${startStr} - ${endStr}`;
            if (DateUtils.isCurrentWeek(this.currentWeek)) {
                label = 'Esta semana · ' + label;
            }
            weekDisplay.textContent = label;
        }
    }

    updateStats() {
        const totalItemsEl = document.getElementById('totalItems');
        const completedItemsEl = document.getElementById('completedItems');
        
        if (!totalItemsEl || !completedItemsEl) return;
        
        const checkboxes = document.querySelectorAll('.shopping-item input[type="checkbox"]');
        const total = checkboxes.length;
        const completed = document.querySelectorAll('.shopping-item input[type="checkbox"]:checked').length;
        
        totalItemsEl.textContent = total;
        completedItemsEl.textContent = completed;
    }

    // ── Extras (custom items not from menu) ────────────────────────────────

    _loadExtras() {
        try {
            return JSON.parse(localStorage.getItem(this._extraKey) || '[]');
        } catch { return []; }
    }

    _saveExtras(extras) {
        localStorage.setItem(this._extraKey, JSON.stringify(extras));
    }

    _renderExtrasSection() {
        const content = document.getElementById('shoppingListContent');
        if (!content) return;

        const extras = this._loadExtras();

        let section = document.getElementById('extras-section');
        if (!section) {
            section = document.createElement('div');
            section.id = 'extras-section';
            section.className = 'shopping-category';
            content.appendChild(section);
        }

        section.innerHTML = `
            <div class="category-header" style="border-color:#6366f1;">
                <h3 style="color:#a5b4fc;">EXTRAS / LISTA LIBRE</h3>
                <span class="item-count">${extras.length} items</span>
            </div>
            <div class="items-list" id="extras-items-list">
                ${extras.map((item, i) => `
                <div class="shopping-item" data-extra-index="${i}">
                    <input type="checkbox" id="extra-${i}" ${item.done ? 'checked' : ''}>
                    <label for="extra-${i}" style="flex:1;">
                        <span class="item-name">${this._escapeHtml(item.name)}</span>
                        ${item.qty ? `<span class="item-quantity">(${this._escapeHtml(item.qty)})</span>` : ''}
                    </label>
                    <button data-del="${i}" title="Eliminar" style="background:none;border:none;color:#64748b;cursor:pointer;padding:2px 6px;font-size:16px;line-height:1;">✕</button>
                </div>`).join('')}
            </div>
            <div style="display:flex;gap:8px;margin-top:10px;padding:0 4px;">
                <input id="extra-item-name" type="text" placeholder="Añadir artículo..." maxlength="80"
                    style="flex:1;background:#1e293b;border:1px solid #334155;border-radius:8px;color:#e2e8f0;padding:8px 12px;font-size:14px;outline:none;">
                <input id="extra-item-qty" type="text" placeholder="Cantidad" maxlength="20"
                    style="width:90px;background:#1e293b;border:1px solid #334155;border-radius:8px;color:#e2e8f0;padding:8px 10px;font-size:14px;outline:none;">
                <button id="extra-add-btn"
                    style="background:#4f46e5;border:none;border-radius:8px;color:#fff;padding:8px 14px;font-size:14px;font-weight:600;cursor:pointer;white-space:nowrap;">
                    + Añadir
                </button>
            </div>
        `;

        // Add item
        const addBtn = section.querySelector('#extra-add-btn');
        const nameInput = section.querySelector('#extra-item-name');
        const qtyInput = section.querySelector('#extra-item-qty');

        const doAdd = () => {
            const name = nameInput.value.trim();
            if (!name) return;
            const qty = qtyInput.value.trim();
            const list = this._loadExtras();
            list.push({ name, qty, done: false });
            this._saveExtras(list);
            nameInput.value = '';
            qtyInput.value = '';
            this._renderExtrasSection();
            this.updateStats();
        };

        addBtn.addEventListener('click', doAdd);
        nameInput.addEventListener('keydown', e => { if (e.key === 'Enter') doAdd(); });

        // Delete items
        section.querySelectorAll('[data-del]').forEach(btn => {
            btn.addEventListener('click', () => {
                const idx = parseInt(btn.dataset.del);
                const list = this._loadExtras();
                list.splice(idx, 1);
                this._saveExtras(list);
                this._renderExtrasSection();
                this.updateStats();
            });
        });

        // Sync done state with localStorage
        section.querySelectorAll('input[type="checkbox"]').forEach((cb, i) => {
            cb.addEventListener('change', () => {
                const list = this._loadExtras();
                if (list[i]) list[i].done = cb.checked;
                this._saveExtras(list);
                this.updateStats();
            });
        });
    }

    _escapeHtml(str) {
        return String(str).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;');
    }

    exportToPDF() {
        try {
            // Verificar si jsPDF está disponible
            if (typeof window.jspdf === 'undefined') {
                alert('La librería PDF no está cargada. Por favor, recarga la página.');
                console.error('jsPDF no está disponible');
                return;
            }

            if (!this.currentShoppingList) {
                alert('No hay lista de compras para exportar');
                return;
            }

            console.log('[pdf] Iniciando generación de PDF...');

            // Parsear lista de compras
            let shoppingList;
            try {
                shoppingList = typeof this.currentShoppingList === 'string' 
                    ? JSON.parse(this.currentShoppingList) 
                    : this.currentShoppingList;
                console.log('[shopping] Lista parseada:', shoppingList);
            } catch (error) {
                console.error('Error parseando lista de compras:', error);
                alert('Error al procesar la lista de compras');
                return;
            }

            // Inicializar jsPDF
            const { jsPDF } = window.jspdf;
            console.log('[pdf] jsPDF disponible:', jsPDF);
            const doc = new jsPDF();
            console.log('[pdf] Documento PDF creado');

            // Configuración de fuentes y estilos
            doc.setFont('helvetica');
            
            // Título
            doc.setFontSize(20);
            doc.text('LISTA DE COMPRAS', 105, 20, { align: 'center' });
            
            // Semana
            if (this.currentWeek) {
                const weekStart = new Date(this.currentWeek);
                const weekEnd = new Date(weekStart);
                weekEnd.setDate(weekEnd.getDate() + 6);
                
                const options = { day: 'numeric', month: 'long', year: 'numeric' };
                const startStr = weekStart.toLocaleDateString('es-ES', options);
                const endStr = weekEnd.toLocaleDateString('es-ES', options);
                
                doc.setFontSize(12);
                doc.text(`Semana: ${startStr} - ${endStr}`, 105, 30, { align: 'center' });
            }

            // Fecha de generación
            const today = new Date();
            const dateStr = today.toLocaleDateString('es-ES', { 
                day: 'numeric', 
                month: 'long', 
                year: 'numeric',
                hour: '2-digit',
                minute: '2-digit'
            });
            doc.setFontSize(10);
            doc.text(`Generado: ${dateStr}`, 105, 40, { align: 'center' });

            // Línea separadora
            doc.setLineWidth(0.5);
            doc.line(20, 45, 190, 45);

            let currentY = 55;

            // Recorrer categorías
            Object.entries(shoppingList).forEach(([category, items]) => {
                // Verificar si hay espacio para la categoría
                if (currentY > 250) {
                    doc.addPage();
                    currentY = 20;
                }

                // Formatear nombre de categoría
                const formattedCategory = this.formatCategoryName(category);
                
                // Manejar diferentes formatos de items
                let categoryItems = [];
                if (Array.isArray(items)) {
                    categoryItems = items;
                } else if (items.items && Array.isArray(items.items)) {
                    categoryItems = items.items;
                }

                if (categoryItems.length === 0) return;

                // Título de categoría
                doc.setFontSize(14);
                doc.setFont('helvetica', 'bold');
                doc.text(formattedCategory, 20, currentY);
                currentY += 8;

                // Items de la categoría
                doc.setFontSize(11);
                doc.setFont('helvetica', 'normal');
                
                categoryItems.forEach((item, index) => {
                    // Verificar espacio para siguiente item
                    if (currentY > 270) {
                        doc.addPage();
                        currentY = 20;
                        // Repetir título de categoría en nueva página
                        doc.setFontSize(14);
                        doc.setFont('helvetica', 'bold');
                        doc.text(`${formattedCategory} (cont.)`, 20, currentY);
                        currentY += 8;
                        doc.setFontSize(11);
                        doc.setFont('helvetica', 'normal');
                    }

                    const itemName = typeof item === 'string' ? item : (item.name || item.nombre || item.item || item.producto || '');
                    const quantity = item.quantity || item.cantidad ? ` (${item.quantity || item.cantidad})` : '';
                    const checkbox = item.completed ? '[X]' : '[ ]';
                    
                    // Limpiar el nombre del item de caracteres especiales
                    const cleanItemName = itemName.replace(/[^\x00-\x7F]/g, "");
                    
                    doc.text(`${checkbox} ${cleanItemName}${quantity}`, 25, currentY);
                    currentY += 6;
                });

                // Espacio después de cada categoría
                currentY += 5;
            });

            // Total de items
            const totalItems = Object.values(shoppingList).reduce((total, items) => {
                const categoryItems = Array.isArray(items) ? items : (items.items || []);
                return total + categoryItems.length;
            }, 0);

            // Pie de página
            const pageCount = doc.internal.getNumberOfPages();
            for (let i = 1; i <= pageCount; i++) {
                doc.setPage(i);
                doc.setFontSize(8);
                doc.text(`Total items: ${totalItems} | Página ${i} de ${pageCount}`, 105, 285, { align: 'center' });
            }

            // Descargar PDF
            const fileName = `lista_compras_${new Date().toISOString().split('T')[0]}.pdf`;
            console.log('[pdf] Guardando PDF como:', fileName);
            doc.save(fileName);

            console.log('[ok] PDF generado exitosamente');
            alert('PDF generado exitosamente');
            
        } catch (error) {
            console.error('[err] Error generando PDF:', error);
            alert('Error al generar el PDF: ' + error.message);
        }
    }

    setLoading(loading) {
        const content = document.getElementById('shoppingListContent');
        if (loading) {
            content.innerHTML = '<div class="loading">Cargando lista de compras...</div>';
        }
    }

    showEmptyState() {
        const content = document.getElementById('shoppingListContent');
        if (content) {
            content.innerHTML = '<p style="text-align: center; color: var(--text-secondary);">No hay lista de compras del menú. Genera un menú primero o añade artículos en Extras.</p>';
        }
        // Los extras (bebidas, limpieza…) siguen disponibles aunque no haya menú
        this.currentShoppingList = null;
        this._renderExtrasSection();
        this.updateStats();
    }

    showEmptyStateForWeek(weekStartStr) {
        const content = document.getElementById('shoppingListContent');
        if (content) {
            const ws = DateUtils.parseWeek(weekStartStr);
            const we = DateUtils.weekEnd(ws);

            const options = { day: 'numeric', month: 'long', year: 'numeric' };
            const startStr = ws.toLocaleDateString('es-ES', options);
            const endStr = we.toLocaleDateString('es-ES', options);

            content.innerHTML = `<p style="text-align: center; color: var(--text-secondary);">No hay lista de compras del menú para la semana del ${startStr} - ${endStr}. Añade artículos en Extras o genera el menú.</p>`;
        }
        // Los extras siguen disponibles
        this.currentShoppingList = null;
        this._renderExtrasSection();
        this.updateStats();
    }

    showError(message) {
        const content = document.getElementById('shoppingListContent');
        if (content) {
            content.innerHTML = `<p style="text-align: center; color: var(--error-color);">${message}</p>`;
        }
    }

    // ── Mercadona integration ──────────────────────────────────────────────

    _apiHeaders() {
        const pin = sessionStorage.getItem('app_pin') || localStorage.getItem('app_pin') || '';
        const h = { 'Content-Type': 'application/json' };
        if (pin) h['X-App-Pin'] = pin;
        return h;
    }

    _mercadonaLog(msg) {
        const log = document.getElementById('mercadonaLog');
        if (!log) return;
        const line = document.createElement('div');
        line.textContent = msg;
        log.appendChild(line);
        log.scrollTop = log.scrollHeight;
    }

    _mercadonaSetProgress(pct) {
        const bar = document.getElementById('mercadonaProgressBar');
        const txt = document.getElementById('mercadonaProgressText');
        if (bar) bar.style.width = pct + '%';
        if (txt) txt.textContent = Math.round(pct) + '%';
    }

    async startMercadonaSync() {
        // First check credentials are configured
        try {
            const statusRes = await fetch('/api/mercadona/status', { headers: this._apiHeaders() });
            const statusData = await statusRes.json();
            if (!statusData.configured) {
                alert('Mercadona no está configurado. Añade MERCADONA_EMAIL, MERCADONA_PASSWORD y MERCADONA_POSTAL_CODE en Railway → Variables.');
                return;
            }
        } catch (e) {
            alert('No se pudo conectar con el servidor. Intenta de nuevo.');
            return;
        }

        // Open modal and reset state
        const modal = document.getElementById('mercadonaModal');
        document.getElementById('mercadonaStatus').textContent = 'Iniciando sincronización...';
        document.getElementById('mercadonaLog').innerHTML = '<div>Conectando con Mercadona...</div>';
        document.getElementById('mercadonaSummary').style.display = 'none';
        document.getElementById('closeMercadonaBtn').style.display = 'none';
        document.getElementById('syncMercadonaBtn').disabled = true;
        this._mercadonaSetProgress(0);
        modal.style.display = 'flex';

        // Build combined items: menu items + unchecked extras
        const extraItems = this._loadExtras()
            .filter(e => !e.done)
            .map(e => ({ nombre: e.name, cantidad: e.qty || '' }));

        // Sincronizar la semana que se está viendo (importante: el domingo
        // planificas la compra de la semana que viene).
        const bodyPayload = {};
        if (this.currentWeek) {
            bodyPayload.week_start = DateUtils.localISO(DateUtils.getMonday(DateUtils.parseWeek(this.currentWeek)));
        }
        if (extraItems.length) bodyPayload.extra_items = extraItems;

        try {
            const res = await fetch('/api/mercadona/sync', {
                method: 'POST',
                headers: this._apiHeaders(),
                body: JSON.stringify(bodyPayload)
            });
            const data = await res.json();

            if (!data.success) {
                this._mercadonaLog('Error: ' + (data.error || 'Error desconocido'));
                document.getElementById('mercadonaStatus').textContent = 'Error al iniciar';
                document.getElementById('closeMercadonaBtn').style.display = '';
                document.getElementById('syncMercadonaBtn').disabled = false;
                return;
            }

            this._mercadonaLog(`Job iniciado: ${data.job_id} (${data.total_items} productos)`);
            document.getElementById('mercadonaStatus').textContent = `Procesando ${data.total_items} productos...`;
            this._pollMercadonaJob(data.job_id, data.total_items);

        } catch (e) {
            this._mercadonaLog('Error de red: ' + e.message);
            document.getElementById('mercadonaStatus').textContent = 'Error de conexión';
            document.getElementById('closeMercadonaBtn').style.display = '';
            document.getElementById('syncMercadonaBtn').disabled = false;
        }
    }

    async _pollMercadonaJob(jobId, totalItems) {
        const pollInterval = 3000;
        let lastStatus = '';
        let notFoundRetries = 0;
        const MAX_NOT_FOUND = 5; // tolera reinicios de worker antes de rendirse

        const poll = async () => {
            try {
                const res = await fetch(`/api/mercadona/job/${jobId}`, { headers: this._apiHeaders() });
                const job = await res.json();

                if (!job.success) {
                    // El job puede tardar un instante en aparecer, o el worker
                    // pudo reiniciarse. Reintentar unas cuantas veces antes de fallar.
                    notFoundRetries++;
                    if (notFoundRetries <= MAX_NOT_FOUND) {
                        setTimeout(poll, pollInterval);
                        return;
                    }
                    this._mercadonaLog('Error consultando job: ' + (job.error || 'Job no encontrado'));
                    document.getElementById('closeMercadonaBtn').style.display = '';
                    document.getElementById('syncMercadonaBtn').disabled = false;
                    return;
                }
                notFoundRetries = 0;

                const status = job.status;

                if (status !== lastStatus) {
                    lastStatus = status;
                    const labels = { pending: 'En espera...', running: 'Ejecutando navegador...', done: 'Completado', error: 'Error' };
                    document.getElementById('mercadonaStatus').textContent = labels[status] || status;
                }

                // Update progress from result if available
                if (job.result) {
                    const r = job.result;
                    const added = (r.added || []).length;
                    const notFound = (r.not_found || []).length;
                    const errors = (r.errors || []).length;
                    const processed = added + notFound + errors;
                    if (totalItems > 0) {
                        this._mercadonaSetProgress(Math.min(100, (processed / totalItems) * 100));
                    }
                }

                if (status === 'running') {
                    this._mercadonaSetProgress(30 + Math.random() * 5);
                } else if (status === 'pending') {
                    this._mercadonaSetProgress(5);
                }

                if (status === 'done' || status === 'error') {
                    this._mercadonaSetProgress(100);
                    this._showMercadonaResult(job.result, status);
                    document.getElementById('closeMercadonaBtn').style.display = '';
                    document.getElementById('syncMercadonaBtn').disabled = false;
                    return;
                }

                // Continue polling
                setTimeout(poll, pollInterval);

            } catch (e) {
                this._mercadonaLog('Error de red al consultar: ' + e.message);
                setTimeout(poll, pollInterval * 2);
            }
        };

        setTimeout(poll, pollInterval);
    }

    _showMercadonaResult(result, status) {
        if (!result) return;

        const added = result.added || [];
        const notFound = result.not_found || [];
        const errors = result.errors || [];

        if (status === 'error' && result.error) {
            this._mercadonaLog('Error: ' + result.error);
        } else {
            if (added.length) this._mercadonaLog(`✓ Añadidos: ${added.join(', ')}`);
            if (notFound.length) this._mercadonaLog(`? No encontrados: ${notFound.join(', ')}`);
            if (errors.length) this._mercadonaLog(`✗ Con error: ${errors.join(', ')}`);
        }

        const summary = document.getElementById('mercadonaSummary');
        const title = document.getElementById('mercadonaSummaryTitle');
        const detail = document.getElementById('mercadonaSummaryDetail');

        summary.style.display = '';

        if (status === 'done') {
            title.textContent = `✓ ${added.length} productos añadidos al carrito`;
            const parts = [];
            if (notFound.length) parts.push(`${notFound.length} no encontrados`);
            if (errors.length) parts.push(`${errors.length} con error`);
            detail.textContent = parts.length ? parts.join(' · ') : 'Todo añadido correctamente';
            summary.style.background = '#0f2a1a';
            summary.style.borderColor = '#16a34a';
            title.style.color = '#4ade80';
        } else {
            title.textContent = '✗ Error en la sincronización';
            detail.textContent = result.error || 'Revisa los logs arriba';
            summary.style.background = '#2a0f0f';
            summary.style.borderColor = '#dc2626';
            title.style.color = '#f87171';
        }
    }
}

// Instancia global
const shoppingManager = new ShoppingManager();
