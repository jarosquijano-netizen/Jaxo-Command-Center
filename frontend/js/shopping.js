class ShoppingManager {
    constructor() {
        this.currentShoppingList = null;
        this.currentWeek = null;
        this.apiBase = 'http://localhost:9000/api';
        
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
                const response = await fetch(`${this.apiBase}/menu/latest`);
                const result = await response.json();
                
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
            const response = await fetch(`${this.apiBase}/menu/week/${weekStart}`);
            const result = await response.json();
            
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
                    ${categoryItems.map((item, index) => `
                        <div class="shopping-item">
                            <input type="checkbox" id="item-${category}-${index}" ${item.completed ? 'checked' : ''}>
                            <label for="item-${category}-${index}">
                                <span class="item-name">${typeof item === 'string' ? item : item.name || item}</span>
                                ${item.quantity ? `<span class="item-quantity">(${item.quantity})</span>` : ''}
                            </label>
                        </div>
                    `).join('')}
                </div>
            `;
            
            content.appendChild(categorySection);
        });

        // Añadir event listeners a los checkboxes
        content.querySelectorAll('.shopping-item input[type="checkbox"]').forEach(checkbox => {
            checkbox.addEventListener('change', () => {
                this.updateStats();
            });
        });
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

            console.log('🔄 Iniciando generación de PDF...');

            // Parsear lista de compras
            let shoppingList;
            try {
                shoppingList = typeof this.currentShoppingList === 'string' 
                    ? JSON.parse(this.currentShoppingList) 
                    : this.currentShoppingList;
                console.log('📋 Lista parseada:', shoppingList);
            } catch (error) {
                console.error('Error parseando lista de compras:', error);
                alert('Error al procesar la lista de compras');
                return;
            }

            // Inicializar jsPDF
            const { jsPDF } = window.jspdf;
            console.log('📄 jsPDF disponible:', jsPDF);
            const doc = new jsPDF();
            console.log('📄 Documento PDF creado');

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

                    const itemName = typeof item === 'string' ? item : item.name || item;
                    const quantity = item.quantity ? ` (${item.quantity})` : '';
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
            console.log('💾 Guardando PDF como:', fileName);
            doc.save(fileName);

            console.log('✅ PDF generado exitosamente');
            alert('PDF generado exitosamente');
            
        } catch (error) {
            console.error('❌ Error generando PDF:', error);
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
}

// Instancia global
const shoppingManager = new ShoppingManager();
