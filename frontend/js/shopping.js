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
        // Botón de actualizar
        const refreshBtn = document.getElementById('refreshShoppingBtn');
        if (refreshBtn) {
            refreshBtn.addEventListener('click', () => {
                this.loadShoppingList();
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

    async loadShoppingList(targetWeek = null) {
        try {
            this.setLoading(true);
            
            let weekStart = targetWeek;
            if (!weekStart) {
                // Por defecto, buscar el menú más reciente
                const result = await api.get('/api/menu/latest');

                if (result.success && result.data) {
                    const menuData = result.data;
                    this.currentShoppingList = menuData.lista_compra;
                    this.currentWeek = menuData.semana_inicio;
                    
                    this.renderShoppingList();
                    this.updateWeekDisplay();
                    this.updateStats();
                } else {
                    this.showEmptyState();
                }
            } else {
                // Buscar menú para una semana específica
                await this.loadShoppingListForWeek(weekStart);
            }
        } catch (error) {
            console.error('Error cargando lista de compras:', error);
            this.showError('Error cargando lista de compras');
        } finally {
            this.setLoading(false);
        }
    }

    async loadShoppingListForWeek(weekStart) {
        try {
            const result = await api.get(`/api/menu/week/${weekStart}`);
            
            if (result.success && result.data) {
                const menuData = result.data;
                this.currentShoppingList = menuData.lista_compra;
                this.currentWeek = menuData.semana_inicio;
                
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
            // Si no hay semana actual, ir a la semana actual
            this.navigateToToday();
            return;
        }

        const currentWeekDate = new Date(this.currentWeek);
        currentWeekDate.setDate(currentWeekDate.getDate() + (direction * 7));
        
        const weekStart = this.getMonday(currentWeekDate);
        this.loadShoppingList(weekStart.toISOString().split('T')[0]);
    }

    navigateToToday() {
        const today = new Date();
        const monday = this.getMonday(today);
        this.loadShoppingList(monday.toISOString().split('T')[0]);
    }

    getMonday(date) {
        const day = date.getDay();
        const diff = date.getDate() - day + (day === 0 ? -6 : 1); // Adjust for Sunday
        return new Date(date.setDate(diff));
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

        // Renderizar cada categoría
        Object.entries(shoppingList).forEach(([category, items]) => {
            const categorySection = document.createElement('div');
            categorySection.className = 'shopping-category';
            
            // Formatear nombre de categoría
            const formattedCategory = this.formatCategoryName(category);
            
            // Manejar diferentes formatos de items
            let categoryItems = [];
            if (Array.isArray(items)) {
                categoryItems = items;
            } else if (items.items && Array.isArray(items.items)) {
                categoryItems = items.items;
            }
            
            categorySection.innerHTML = `
                <div class="category-header">
                    <h3>${formattedCategory}</h3>
                    <span class="item-count">${categoryItems.length} items</span>
                </div>
                <div class="items-list">
                    ${categoryItems.map((item, index) => {
                        const name = typeof item === 'string' ? item : (item.name || item.nombre || item.item || item.producto || '');
                        const qty  = item.quantity || item.cantidad || item.qty || '';
                        const price = item.estimado_eur ? ` ~${item.estimado_eur}€` : '';
                        return `
                        <div class="shopping-item">
                            <input type="checkbox" id="item-${category}-${index}" ${item.completed ? 'checked' : ''}>
                            <label for="item-${category}-${index}">
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
            'carniceria': 'CARNICERIA',
            'pescaderia': 'PESCADERIA',
            'huevos_lacteos': 'HUEVOS Y LACTEOS',
            'despensa': 'DEPENSA',
            'frutas': 'FRUTAS',
            'congelados': 'CONGELADOS',
            'bebidas': 'BEBIDAS',
            'limpieza': 'LIMPIEZA',
            'higiene': 'HIGIENE',
            'otros': 'OTROS'
        };
        
        return categoryNames[category.toLowerCase()] || category.toUpperCase();
    }

    updateWeekDisplay() {
        const weekDisplay = document.getElementById('shoppingWeekDisplay');
        if (weekDisplay && this.currentWeek) {
            const weekStart = new Date(this.currentWeek);
            const weekEnd = new Date(weekStart);
            weekEnd.setDate(weekEnd.getDate() + 6);
            
            const options = { day: 'numeric', month: 'long', year: 'numeric' };
            const startStr = weekStart.toLocaleDateString('es-ES', options);
            const endStr = weekEnd.toLocaleDateString('es-ES', options);
            
            weekDisplay.textContent = `${startStr} - ${endStr}`;
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
            content.innerHTML = '<p style="text-align: center; color: var(--text-secondary);">No hay lista de compras disponible. Genera un menú primero.</p>';
        }
    }

    showEmptyStateForWeek(weekStart) {
        const content = document.getElementById('shoppingListContent');
        if (content) {
            const weekStart = new Date(weekStart);
            const weekEnd = new Date(weekStart);
            weekEnd.setDate(weekEnd.getDate() + 6);
            
            const options = { day: 'numeric', month: 'long', year: 'numeric' };
            const startStr = weekStart.toLocaleDateString('es-ES', options);
            const endStr = weekEnd.toLocaleDateString('es-ES', options);
            
            content.innerHTML = `<p style="text-align: center; color: var(--text-secondary);">No hay lista de compras para la semana del ${startStr} - ${endStr}</p>`;
        }
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

        const bodyPayload = extraItems.length ? { extra_items: extraItems } : {};

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

        const poll = async () => {
            try {
                const res = await fetch(`/api/mercadona/job/${jobId}`, { headers: this._apiHeaders() });
                const job = await res.json();

                if (!job.success) {
                    this._mercadonaLog('Error consultando job: ' + (job.error || ''));
                    document.getElementById('closeMercadonaBtn').style.display = '';
                    document.getElementById('syncMercadonaBtn').disabled = false;
                    return;
                }

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
