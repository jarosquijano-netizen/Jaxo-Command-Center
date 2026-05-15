/**
 * Módulo de gestión de menús
 */

class MenuManager {
    constructor() {
        this.currentMenu = null;
        this.currentWeek = null;
        this.viewMode = 'ambos'; // adultos, ninos, ambos
        this.selectedMeal = null;
        this.isLoading = false;
        
        this.init();
    }

    hasAnyMealData(menuData) {
        try {
            if (!menuData || !menuData.menu_adultos) return false;
            const days = Object.keys(menuData.menu_adultos);
            if (days.length === 0) return false;

            for (const day of days) {
                const dayObj = menuData.menu_adultos?.[day];
                if (!dayObj || typeof dayObj !== 'object') continue;
                const meals = Object.keys(dayObj);
                for (const meal of meals) {
                    const mealObj = dayObj?.[meal];
                    if (!mealObj) continue;
                    if (typeof mealObj === 'string' && mealObj.trim().length > 0) return true;
                    if (typeof mealObj === 'object') {
                        if (mealObj.plato && String(mealObj.plato).trim().length > 0) return true;
                        if (mealObj.primero || mealObj.segundo || mealObj.postre) return true;
                    }
                }
            }
            return false;
        } catch (e) {
            console.warn('[warn] Error validando datos del menú:', e);
            return false;
        }
    }

    async init() {
        this.setupEventListeners();
        await this.loadCurrentWeekMenu();
        this.setupWeekNavigation();
    }

    setupEventListeners() {
        // Botones principales
        document.getElementById('generateMenuBtn')?.addEventListener('click', () => this.showGenerateModal());
        document.getElementById('shoppingListBtn')?.addEventListener('click', () => this.showShoppingList());
        
        // Toggle vista
        document.querySelectorAll('[data-view-mode]').forEach(btn => {
            btn.addEventListener('click', (e) => this.changeViewMode(e.target.dataset.viewMode));
        });

        // Navegación de semanas
        document.getElementById('prevWeekBtn')?.addEventListener('click', () => this.navigateWeek(-1));
        document.getElementById('nextWeekBtn')?.addEventListener('click', () => this.navigateWeek(1));

        // Modal generate buttons (replaces inline onclick)
        document.getElementById('closeGenerateModalBtn')?.addEventListener('click', () => this.closeModal('generateMenuModal'));
        document.getElementById('cancelGenerateMenuBtn')?.addEventListener('click', () => this.closeModal('generateMenuModal'));
        document.getElementById('confirmGenerateMenuBtn')?.addEventListener('click', () => this.generateMenu());
        document.getElementById('closeShoppingModalBtn')?.addEventListener('click', () => this.closeModal('shoppingListModal'));
    }

    async loadCurrentWeekMenu() {
        try {
            this.setLoading(true);
            
            // Primero intentar cargar el menú más reciente que tenga datos
            console.log('[menu] Buscando menú con datos...');
            
            let response = await api.get('/api/menu/current');
            
            if (response.success && response.data) {
                // Verificar si el menú actual tiene datos reales
                const menuData = typeof response.data.menu_data === 'string' 
                    ? JSON.parse(response.data.menu_data) 
                    : response.data.menu_data;
                
                const hasData = menuData.menu_adultos && 
                    Object.keys(menuData.menu_adultos).length > 0 &&
                    menuData.menu_adultos.lunes;
                
                if (hasData) {
                    console.log('[ok] Usando menú actual con datos:', response.data.id);
                    this.currentMenu = response.data;
                    this.currentWeek = new Date(response.data.semana_inicio);
                    this.renderMenu();
                    this.updateWeekDisplay();
                    return;
                }
            }
            
            // Si el menú actual no tiene datos, buscar el último que sí tenga
            console.log('[menu] Menú actual vacío, buscando último con datos...');
            const latestResponse = await api.get('/api/menu/latest');
            
            if (latestResponse.success && latestResponse.data) {
                const menuData = typeof latestResponse.data.menu_data === 'string' 
                    ? JSON.parse(latestResponse.data.menu_data) 
                    : latestResponse.data.menu_data;
                
                const hasData = menuData.menu_adultos && 
                    Object.keys(menuData.menu_adultos).length > 0 &&
                    menuData.menu_adultos.lunes;
                
                if (hasData) {
                    console.log('[ok] Usando último menú con datos:', latestResponse.data.id);
                    this.currentMenu = latestResponse.data;
                    this.currentWeek = new Date(latestResponse.data.semana_inicio);
                    this.renderMenu();
                    this.updateWeekDisplay();
                    return;
                }
            }
            
            // Si no hay menús con datos, mostrar estado vacío
            console.log('[menu] No hay menús con datos, mostrando estado vacío');
            this.showEmptyState();
            
        } catch (error) {
            console.error('Error cargando menú:', error);
            this.showError('Error cargando menú actual');
        } finally {
            this.setLoading(false);
        }
    }

    async loadWeekMenu(weekStart) {
        try {
            this.setLoading(true);
            const response = await api.get(`/api/menu/weekly?week_start=${weekStart}`);
            
            if (response.success) {
                this.currentMenu = response.data;
                this.currentWeek = new Date(response.data.semana_inicio);
                this.renderMenu();
                this.updateWeekDisplay();
            } else {
                this.showEmptyState();
            }
        } catch (error) {
            console.error('Error cargando menú de la semana:', error);
            this.showError('Error cargando menú de la semana');
        } finally {
            this.setLoading(false);
        }
    }

    renderMenu() {
        if (!this.currentMenu) return;

        const grid = document.getElementById('menuGrid');
        if (!grid) return;

        const raw = this.currentMenu.menu_data;
        const parsed = typeof raw === 'string' ? JSON.parse(raw) : raw;

        if (!parsed || (!parsed.menu_adultos && !parsed.menu_ninos)) {
            this.showEmptyState();
            return;
        }

        const days     = ['lunes','martes','miercoles','jueves','viernes','sabado','domingo'];
        const dayNames = ['LUNES','MARTES','MIÉRCOLES','JUEVES','VIERNES','SÁBADO','DOMINGO'];
        const todayKey = ['domingo','lunes','martes','miercoles','jueves','viernes','sabado'][new Date().getDay()];
        const availableMeals = this.getAvailableMeals(parsed);

        grid.innerHTML = '';

        const buildCard = (day, meal, md, badge) => {
            if (!md) return `<div class="mn-meal-empty"><span class="material-symbols-outlined">add</span></div>`;
            const name = md.plato || md.primero || '';
            const desc = md.descripcion || '';
            const time = md.tiempo_prep ? `${md.tiempo_prep} min` : '';
            const kcal = md.calorias ? `${md.calorias} kcal` : '';
            const tags = Array.isArray(md.alergenos) ? md.alergenos.filter(Boolean).slice(0, 2) : [];
            const tagsHtml = tags.map(t => `<span class="mn-tag">${t}</span>`).join('');
            const metaHtml = (time || kcal) ? `<div class="mn-meal-meta">
                ${time ? `<span class="mn-meal-time"><span class="material-symbols-outlined">schedule</span>${time}</span>` : ''}
                ${kcal ? `<span class="mn-meal-kcal">${kcal}</span>` : ''}
            </div>` : '';
            const badgeHtml = badge ? `<span class="mn-meal-badge mn-meal-badge--${badge === 'adultos' ? 'adult' : 'kid'}">${badge === 'adultos' ? 'Adultos' : 'Niños'}</span>` : '';
            return `<div class="mn-meal-card glass-card${badge ? ' mn-meal-card--split' : ''}" onclick="menuManager.showMealDetails('${day}','${meal}')">
                <div class="mn-meal-type-row">
                    <span class="mn-meal-type">${meal.toUpperCase()}</span>
                    ${badgeHtml}
                </div>
                <h3 class="mn-meal-name">${name}</h3>
                ${desc ? `<p class="mn-meal-desc">${desc}</p>` : ''}
                ${metaHtml}
                ${tagsHtml ? `<div class="mn-meal-tags">${tagsHtml}</div>` : ''}
            </div>`;
        };

        // Restore collapsed state across re-renders
        const collapsed = new Set(
            [...document.querySelectorAll('.mn-day.mn-day--collapsed')].map(el => el.dataset.day)
        );

        days.forEach((day, i) => {
            const col = document.createElement('div');
            col.className = 'mn-day' + (collapsed.has(day) ? ' mn-day--collapsed' : '');
            col.dataset.day = day;

            const isToday = day === todayKey;
            col.innerHTML = `
                <h2 class="mn-day-name${isToday ? ' mn-day-name--today' : ''}" onclick="menuManager.toggleDay(this)" style="cursor:pointer;user-select:none;display:flex;align-items:center;justify-content:space-between;">
                    <span>${dayNames[i]}</span>
                    <span class="mn-day-chevron material-symbols-outlined" style="font-size:16px;transition:transform .2s;opacity:0.5;">expand_more</span>
                </h2>
                <div class="mn-day-body">`;

            if (availableMeals.length === 0) {
                col.innerHTML += `<div class="mn-meal-empty"><span class="material-symbols-outlined">add</span></div>`;
            } else if (this.viewMode === 'ambos') {
                availableMeals.forEach(meal => {
                    const adultMd = parsed.menu_adultos?.[day]?.[meal];
                    const kidMd   = parsed.menu_ninos?.[day]?.[meal];
                    col.innerHTML += buildCard(day, meal, adultMd, 'adultos');
                    col.innerHTML += buildCard(day, meal, kidMd, 'ninos');
                });
            } else {
                const menu = this.viewMode === 'ninos' ? (parsed.menu_ninos || parsed.menu_adultos) : (parsed.menu_adultos || parsed.menu_ninos);
                availableMeals.forEach(meal => {
                    col.innerHTML += buildCard(day, meal, menu?.[day]?.[meal], null);
                });
            }

            col.innerHTML += `</div>`;
            grid.appendChild(col);
        });

        this.updateStatistics();
        console.log('[menu] Grid renderizado');
    }

    toggleDay(headerEl) {
        const col = headerEl.closest('.mn-day');
        if (!col) return;
        col.classList.toggle('mn-day--collapsed');
    }

    getAvailableMeals(menuData) {
        const meals = new Set();
        
        // Revisar menu_adultos
        if (menuData.menu_adultos) {
            Object.values(menuData.menu_adultos).forEach(dayMenu => {
                if (dayMenu && typeof dayMenu === 'object') {
                    Object.keys(dayMenu).forEach(meal => meals.add(meal));
                }
            });
        }
        
        // Revisar menu_ninos
        if (menuData.menu_ninos) {
            Object.values(menuData.menu_ninos).forEach(dayMenu => {
                if (dayMenu && typeof dayMenu === 'object') {
                    Object.keys(dayMenu).forEach(meal => meals.add(meal));
                }
            });
        }
        
        // Convertir a array y ordenar (desayuno, comida, merienda, cena)
        const mealOrder = ['desayuno', 'comida', 'almuerzo', 'merienda', 'cena'];
        return Array.from(meals).sort((a, b) => {
            const aIndex = mealOrder.indexOf(a);
            const bIndex = mealOrder.indexOf(b);
            if (aIndex === -1 && bIndex === -1) return 0;
            if (aIndex === -1) return 1;
            if (bIndex === -1) return -1;
            return aIndex - bIndex;
        });
    }

    getDayDate(day) {
        if (!this.currentWeek) return '';
        
        const days = ['lunes', 'martes', 'miercoles', 'jueves', 'viernes', 'sabado', 'domingo'];
        const dayIndex = days.indexOf(day);
        const date = new Date(this.currentWeek);
        date.setDate(date.getDate() + dayIndex);
        
        return date.getDate();
    }

    changeViewMode(mode) {
        this.viewMode = mode;
        
        // Actualizar botones
        document.querySelectorAll('[data-view-mode]').forEach(btn => {
            btn.classList.toggle('active', btn.dataset.viewMode === mode);
        });
        
        // Re-renderizar menú
        if (this.currentMenu) {
            this.renderMenu();
        }
    }

    async showGenerateModal() {
        const modal = document.getElementById('generateMenuModal');
        if (!modal) return;

        // Configurar el dropdown de semanas
        this.setupWeekSelection();

        modal.style.display = 'flex';
    }

    setupWeekSelection() {
        const weekSelection = document.getElementById('weekSelection');
        const customDate = document.getElementById('customDate');
        if (!weekSelection || weekSelection._listenerBound) return;
        weekSelection._listenerBound = true;

        weekSelection.addEventListener('change', (e) => {
            if (e.target.value === 'custom') {
                customDate.style.display = 'block';
                customDate.required = true;

                const nextMonday = this.getMonday(new Date());
                nextMonday.setDate(nextMonday.getDate() + 7);
                customDate.value = nextMonday.toISOString().split('T')[0];
            } else {
                customDate.style.display = 'none';
                customDate.required = false;
                customDate.value = '';
            }
        });
    }

    getSelectedWeekStart() {
        const weekSelection = document.getElementById('weekSelection').value;
        const customDate = document.getElementById('customDate').value;
        
        if (weekSelection === 'current') {
            return this.getMonday(new Date());
        } else if (weekSelection === 'next') {
            const nextMonday = this.getMonday(new Date());
            nextMonday.setDate(nextMonday.getDate() + 7);
            return nextMonday;
        } else if (weekSelection === 'custom' && customDate) {
            const date = new Date(customDate);
            return this.getMonday(date); // Asegurar que sea lunes
        }
        
        // Default a semana actual
        return this.getMonday(new Date());
    }

    async generateMenu() {
        const modal = document.getElementById('generateMenuModal');
        const formData = new FormData(modal.querySelector('form'));

        const selectedWeekStart = this.getSelectedWeekStart();

        const selectedDays = Array.from(modal.querySelectorAll('input[name="dias"]:checked'))
            .map(input => input.value);

        const selectedMeals = Array.from(modal.querySelectorAll('input[name="comidas"]:checked'))
            .map(input => input.value);

        const presupuesto = parseInt(formData.get('presupuesto')) || 200;
        const supermercado = formData.get('supermercado') || 'Mercadona';
        const preferencias = formData.get('preferencias') || '';
        const incluirListaCompra = formData.get('incluir_lista') === 'on';
        const considerarCalificaciones = formData.get('considerar_ratings') === 'on';

        const data = {
            week_start: selectedWeekStart.toISOString().split('T')[0],
            regenerate: true,
            settings: {
                dias_menu: selectedDays.length > 0 ? selectedDays : ['lunes', 'martes', 'miercoles', 'jueves', 'viernes', 'sabado', 'domingo'],
                comidas_por_dia: selectedMeals.length > 0 ? selectedMeals : ['cena'],
                presupuesto_semanal: presupuesto,
                supermercado_preferido: supermercado,
                preferencias_especiales: preferencias,
                incluir_lista_compra: incluirListaCompra,
                considerar_calificaciones_anteriores: considerarCalificaciones
            }
        };

        console.log('[menu] Generando menú para semana:', data.week_start);

        try {
            this.setLoading(true);

            const response = await api.post('/api/menu/generate', data);

            if (response.success) {
                this.currentMenu = response.menu;
                this.currentWeek = new Date(response.menu.semana_inicio);
                this.renderMenu();
                this.updateWeekDisplay();
                this.closeModal('generateMenuModal');
                this.showSuccess('¡Menú generado exitosamente!');
            } else {
                const msg = response.message || 'Error generando menú';
                console.error('[menu] Error del backend:', msg);
                this.showError(msg);
            }
        } catch (error) {
            console.error('[menu] Error generando menú:', error);
            this.showError('Error generando menú. Por favor, inténtalo de nuevo.');
        } finally {
            this.setLoading(false);
        }
    }

    async showMealDetails(day, meal) {
        this.selectedMeal = { day, meal };
        
        const modal = document.getElementById('mealDetailsModal');
        if (!modal) return;

        // Cargar detalles del menú
        const menuData = this.currentMenu.menu_data;
        const adultMeal = menuData.menu_adultos?.[day]?.[meal];
        const childMeal = menuData.menu_ninos?.[day]?.[meal];

        // Renderizar contenido
        const content = modal.querySelector('.modal-content');
        content.innerHTML = this.createMealDetailsHTML(day, meal, adultMeal, childMeal);

        // Añadir event listener al botón de cerrar
        const closeBtn = content.querySelector('.close-btn');
        if (closeBtn) {
            closeBtn.addEventListener('click', () => {
                this.closeModal('mealDetailsModal');
            });
        }

        // Cargar ratings existentes
        await this.loadMealRatings();

        modal.style.display = 'flex';
    }

    createMealDetailsHTML(day, meal, adultMeal, childMeal) {
        const dayNames = {
            lunes: 'Lunes', martes: 'Martes', miercoles: 'Miércoles',
            jueves: 'Jueves', viernes: 'Viernes', sabado: 'Sábado', domingo: 'Domingo'
        };

        const mealNames = {
            desayuno: 'Desayuno', comida: 'Comida', merienda: 'Merienda', cena: 'Cena'
        };

        let html = `
            <div class="meal-details">
                <div class="meal-header">
                    <h3>${mealNames[meal]} - ${dayNames[day]}</h3>
                    <button class="close-btn" onclick="menuManager.closeModal('mealDetailsModal')"><span class="material-symbols-outlined">close</span></button>
                </div>
                
                <div class="meal-content-comparison">
        `;

        if (adultMeal) {
            html += this.createAdultMealDetailsHTML(adultMeal);
        }

        if (childMeal) {
            html += this.createChildMealDetailsHTML(childMeal);
        }

        html += `
                </div>
                
                <div class="meal-actions">
                    <button class="btn-secondary" onclick="menuManager.regenerateMeal()">
                        <span class="material-symbols-outlined">refresh</span> Regenerar
                    </button>
                    <button class="btn-secondary" onclick="menuManager.addToFavorites()">
                        <span class="material-symbols-outlined">favorite</span> Añadir a favoritos
                    </button>
                </div>
                
                <div class="rating-section">
                    <h4>Califica este plato:</h4>
                    <div class="rating-stars">
                        ${[1,2,3,4,5].map(star => 
                            `<span class="star" data-rating="${star}" onclick="menuManager.setRating(${star})">⭐</span>`
                        ).join('')}
                    </div>
                    <textarea id="ratingComment" placeholder="Añade un comentario..."></textarea>
                    <button class="btn-primary" onclick="menuManager.submitRating()">Enviar calificación</button>
                </div>
            </div>
        `;

        return html;
    }

    createAdultMealDetailsHTML(meal) {
        let html = '<div class="meal-adultos-details"><h4>MENÚ ADULTOS</h4>';
        
        if (meal.primero) {
            html += `<div><strong>Primero:</strong> ${meal.primero.plato || meal.primero}</div>`;
            if (meal.primero.descripcion) {
                html += `<div><em>${meal.primero.descripcion}</em></div>`;
            }
            if (meal.primero.tiempo_prep) {
                html += `<div>⏱️ Tiempo: ${meal.primero.tiempo_prep} minutos</div>`;
            }
            if (meal.primero.calorias) {
                html += `<div>Calorías: ${meal.primero.calorias}</div>`;
            }
            if (meal.primero.dificultad) {
                html += `<div>Dificultad: ${meal.primero.dificultad}</div>`;
            }
        }
        
        if (meal.segundo) {
            html += `<div><strong>Segundo:</strong> ${meal.segundo.plato || meal.segundo}</div>`;
            if (meal.segundo.descripcion) {
                html += `<div><em>${meal.segundo.descripcion}</em></div>`;
            }
            if (meal.segundo.tiempo_prep) {
                html += `<div>⏱️ Tiempo: ${meal.segundo.tiempo_prep} minutos</div>`;
            }
            if (meal.segundo.calorias) {
                html += `<div>Calorías: ${meal.segundo.calorias}</div>`;
            }
            if (meal.segundo.dificultad) {
                html += `<div>Dificultad: ${meal.segundo.dificultad}</div>`;
            }
        }
        
        if (meal.postre) {
            html += `<div><strong>Postre:</strong> ${meal.postre.plato || meal.postre}</div>`;
            if (meal.postre.descripcion) {
                html += `<div><em>${meal.postre.descripcion}</em></div>`;
            }
            if (meal.postre.tiempo_prep) {
                html += `<div>⏱️ Tiempo: ${meal.postre.tiempo_prep} minutos</div>`;
            }
            if (meal.postre.calorias) {
                html += `<div>Calorías: ${meal.postre.calorias}</div>`;
            }
        }
        
        if (meal.plato) {
            html += `<div><strong>Plato:</strong> ${meal.plato}</div>`;
        }
        
        if (meal.descripcion) {
            html += `<div><em>${meal.descripcion}</em></div>`;
        }
        
        if (meal.tiempo_prep) {
            html += `<div>⏱️ Tiempo: ${meal.tiempo_prep} minutos</div>`;
        }
        
        if (meal.calorias) {
            html += `<div>Calorías: ${meal.calorias}</div>`;
        }
        
        if (meal.dificultad) {
            html += `<div>Dificultad: ${meal.dificultad}</div>`;
        }
        
        // Información nutricional detallada
        if (meal.nutrientes) {
            html += `<div class="nutritional-info">
                <strong>Información Nutricional:</strong><br>
                Proteínas: ${meal.nutrientes.proteinas_g || meal.nutrientes.proteinas || 'N/A'}g<br>
                Carbohidratos: ${meal.nutrientes.carbohidratos_g || meal.nutrientes.carbohidratos || 'N/A'}g<br>
                Grasas: ${meal.nutrientes.grasas_g || meal.nutrientes.grasas || 'N/A'}g<br>
                Fibra: ${meal.nutrientes.fibra_g || meal.nutrientes.fibra || 'N/A'}g`;
                
            if (meal.nutrientes.azucar_g) {
                html += `<br>Azúcar: ${meal.nutrientes.azucar_g}g`;
            }
            if (meal.nutrientes.sodio_mg) {
                html += `<br>Sodio: ${meal.nutrientes.sodio_mg}mg`;
            }
            html += `</div>`;
        }
        
        // Vitaminas y minerales
        if (meal.vitaminas_minerales && meal.vitaminas_minerales.length > 0) {
            html += `<div><strong>Vitaminas y Minerales:</strong> ${meal.vitaminas_minerales.join(', ')}</div>`;
        }
        
        // Ingredientes
        if (meal.ingredientes && meal.ingredientes.length > 0) {
            html += `<div class="ingredients-list">
                <strong>Ingredientes:</strong><br>
                ${meal.ingredientes.map(ing => `• ${ing}`).join('<br>')}
            </div>`;
        }
        
        // Preparación
        if (meal.preparacion && meal.preparacion.length > 0) {
            html += `<div class="preparation-steps">
                <strong>‍Preparación:</strong><br>
                ${meal.preparacion.map((step, index) => `${index + 1}. ${step}`).join('<br>')}
            </div>`;
        }
        
        // Alérgenos
        if (meal.alergenos && meal.alergenos.length > 0) {
            html += `<div><strong>Alérgenos:</strong> ${meal.alergenos.join(', ')}</div>`;
        }
        
        // Notas adicionales
        if (meal.notas) {
            html += `<div><strong>Notas:</strong> ${meal.notas}</div>`;
        }
        
        if (meal.cocinado_por) {
            html += `<div><strong>Cocinado por:</strong> ${meal.cocinado_por}</div>`;
        }
        
        html += '</div>';
        return html;
    }

    createChildMealDetailsHTML(meal) {
        let html = '<div class="meal-ninos-details"><h4>MENÚ NIÑOS</h4>';
        
        if (meal.primero) {
            html += `<div><strong>Primero:</strong> ${meal.primero.plato || meal.primero}</div>`;
            if (meal.primero.descripcion) {
                html += `<div><em>${meal.primero.descripcion}</em></div>`;
            }
            if (meal.primero.tiempo_prep) {
                html += `<div>⏱️ Tiempo: ${meal.primero.tiempo_prep} minutos</div>`;
            }
            if (meal.primero.calorias) {
                html += `<div>Calorías: ${meal.primero.calorias}</div>`;
            }
        }
        
        if (meal.segundo) {
            html += `<div><strong>Segundo:</strong> ${meal.segundo.plato || meal.segundo}</div>`;
            if (meal.segundo.descripcion) {
                html += `<div><em>${meal.segundo.descripcion}</em></div>`;
            }
            if (meal.segundo.tiempo_prep) {
                html += `<div>⏱️ Tiempo: ${meal.segundo.tiempo_prep} minutos</div>`;
            }
            if (meal.segundo.calorias) {
                html += `<div>Calorías: ${meal.segundo.calorias}</div>`;
            }
        }
        
        if (meal.postre) {
            html += `<div><strong>Postre:</strong> ${meal.postre.plato || meal.postre}</div>`;
            if (meal.postre.descripcion) {
                html += `<div><em>${meal.postre.descripcion}</em></div>`;
            }
            if (meal.postre.tiempo_prep) {
                html += `<div>⏱️ Tiempo: ${meal.postre.tiempo_prep} minutos</div>`;
            }
            if (meal.postre.calorias) {
                html += `<div>Calorías: ${meal.postre.calorias}</div>`;
            }
        }
        
        if (meal.plato) {
            html += `<div><strong>Plato:</strong> ${meal.plato}</div>`;
        }
        
        if (meal.descripcion) {
            html += `<div><em>${meal.descripcion}</em></div>`;
        }
        
        if (meal.tiempo_prep) {
            html += `<div>⏱️ Tiempo: ${meal.tiempo_prep} minutos</div>`;
        }
        
        if (meal.calorias) {
            html += `<div>Calorías: ${meal.calorias}</div>`;
        }
        
        // Información nutricional para niños
        if (meal.nutrientes) {
            html += `<div class="nutritional-info">
                <strong>Información Nutricional:</strong><br>
                Proteínas: ${meal.nutrientes.proteinas_g || meal.nutrientes.proteinas || 'N/A'}g<br>
                Carbohidratos: ${meal.nutrientes.carbohidratos_g || meal.nutrientes.carbohidratos || 'N/A'}g<br>
                Grasas: ${meal.nutrientes.grasas_g || meal.nutrientes.grasas || 'N/A'}g<br>
                Fibra: ${meal.nutrientes.fibra_g || meal.nutrientes.fibra || 'N/A'}g`;
            html += `</div>`;
        }
        
        // Ingredientes
        if (meal.ingredientes && meal.ingredientes.length > 0) {
            html += `<div class="ingredients-list">
                <strong>Ingredientes:</strong><br>
                ${meal.ingredientes.map(ing => `• ${ing}`).join('<br>')}
            </div>`;
        }
        
        // Preparación
        if (meal.preparacion && meal.preparacion.length > 0) {
            html += `<div class="preparation-steps">
                <strong>‍Preparación:</strong><br>
                ${meal.preparacion.map((step, index) => `${index + 1}. ${step}`).join('<br>')}
            </div>`;
        }
        
        // Alérgenos
        if (meal.alergenos && meal.alergenos.length > 0) {
            html += `<div><strong>Alérgenos:</strong> ${meal.alergenos.join(', ')}</div>`;
        }
        
        // Adaptaciones especiales para niños
        if (meal.adaptacion_oliva_4) {
            html += `<div class="adaptation-info">
                <strong>Adaptación Oliva (4 años):</strong><br>
                ${meal.adaptacion_oliva_4.cambios ? `• Cambios: ${meal.adaptacion_oliva_4.cambios}<br>` : ''}
                ${meal.adaptacion_oliva_4.presentacion ? `• Presentación: ${meal.adaptacion_oliva_4.presentacion}<br>` : ''}
                ${meal.adaptacion_oliva_4.porcion ? `• Porción: ${meal.adaptacion_oliva_4.porcion}<br>` : ''}
                ${meal.adaptacion_oliva_4.textura ? `• Textura: ${meal.adaptacion_oliva_4.textura}` : ''}
            </div>`;
        }
        
        if (meal.adaptacion_abril_14) {
            html += `<div class="adaptation-info">
                <strong>Adaptación Abril (14 años):</strong><br>
                ${meal.adaptacion_abril_14.cambios ? `• Cambios: ${meal.adaptacion_abril_14.cambios}<br>` : ''}
                ${meal.adaptacion_abril_14.porcion ? `• Porción: ${meal.adaptacion_abril_14.porcion}` : ''}
            </div>`;
        }
        
        if (meal.alternativa_si_rechaza) {
            html += `<div><strong>Alternativa si rechaza:</strong> ${meal.alternativa_si_rechaza}</div>`;
        }
        
        if (meal.truco_padres) {
            html += `<div><strong>Truco para padres:</strong> ${meal.truco_padres}</div>`;
        }
        
        if (meal.porque_esta_receta) {
            html += `<div><strong>Por qué esta receta:</strong> ${meal.porque_esta_receta}</div>`;
        }
        
        if (meal.alternativa) {
            html += `<div><strong>Alternativa:</strong> ${meal.alternativa}</div>`;
        }
        
        if (meal.adaptacion) {
            html += `<div><strong>Adaptación:</strong> ${meal.adaptacion}</div>`;
        }
        
        if (meal.truco) {
            html += `<div><strong>Truco:</strong> ${meal.truco}</div>`;
        }
        
        html += '</div>';
        return html;
    }

    async regenerateMeal() {
        if (!this.selectedMeal || !this.currentMenu) return;

        const { day, meal } = this.selectedMeal;
        
        try {
            this.setLoading(true);
            const response = await api.post('/api/menu/regenerate-day', {
                menu_id: this.currentMenu.id,
                dia: day,
                comida: meal,
                tipo: 'ambos'
            });

            if (response.success) {
                this.currentMenu = response.menu;
                this.renderMenu();
                this.closeModal('mealDetailsModal');
                this.showSuccess('Menú regenerado exitosamente');
            } else {
                this.showError(response.message || 'Error regenerando menú');
            }
        } catch (error) {
            console.error('Error regenerando menú:', error);
            this.showError('Error regenerando menú');
        } finally {
            this.setLoading(false);
        }
    }

    setRating(rating) {
        // Actualizar estrellas
        document.querySelectorAll('.rating-stars .star').forEach((star, index) => {
            star.classList.toggle('active', index < rating);
        });
        
        // Guardar rating temporal
        this.tempRating = rating;
    }

    async submitRating() {
        if (!this.selectedMeal || !this.currentMenu || !this.tempRating) {
            this.showError('Por favor selecciona una calificación');
            return;
        }

        const { day, meal } = this.selectedMeal;
        const comment = document.getElementById('ratingComment').value;

        try {
            const response = await api.post('/api/menu/rate', {
                menu_id: this.currentMenu.id,
                dia: day,
                comida: meal,
                tipo_menu: 'adultos', // Podría ser dinámico
                rating: this.tempRating,
                comentario: comment
            });

            if (response.success) {
                this.showSuccess('¡Calificación guardada!');
                this.closeModal('mealDetailsModal');
                this.tempRating = null;
            } else {
                this.showError(response.message || 'Error guardando calificación');
            }
        } catch (error) {
            console.error('Error guardando calificación:', error);
            this.showError('Error guardando calificación');
        }
    }

    async loadMealRatings() {
        // TODO: Cargar ratings existentes y mostrarlos
    }

    showShoppingList() {
        if (!this.currentMenu) {
            this.showError('No hay un menú actual');
            return;
        }

        // TODO: Implementar modal de lista de compra
        this.showInfo('Lista de compra próximamente');
    }

    updateWeekDisplay() {
        if (!this.currentWeek) return;

        const weekDisplay = document.getElementById('currentWeekDisplay');
        if (weekDisplay) {
            const monday = this.currentWeek;
            const sunday = new Date(monday);
            sunday.setDate(sunday.getDate() + 6);
            
            const options = { day: 'numeric', month: 'long' };
            const mondayStr = monday.toLocaleDateString('es-ES', options);
            const sundayStr = sunday.toLocaleDateString('es-ES', options);
            
            weekDisplay.textContent = `${mondayStr} - ${sundayStr}`;
        }
    }

    setupWeekNavigation() {
        // Actualizar estado de botones
        this.updateWeekNavigationButtons();
    }

    async navigateWeek(direction) {
        if (!this.currentWeek) {
            this.currentWeek = this.getMonday(new Date());
        }

        const newWeek = new Date(this.currentWeek);
        newWeek.setDate(newWeek.getDate() + (direction * 7));
        
        const weekStr = newWeek.toISOString().split('T')[0];
        await this.loadWeekMenu(weekStr);
    }

    updateWeekNavigationButtons() {
        const today = new Date();
        const currentMonday = this.getMonday(today);
        
        // Deshabilitar botón "anterior" si estamos en la semana actual
        const prevBtn = document.getElementById('prevWeekBtn');
        if (prevBtn && this.currentWeek) {
            const isCurrentWeek = this.currentWeek.getTime() === currentMonday.getTime();
            prevBtn.disabled = isCurrentWeek;
        }
    }

    updateStatistics() {
        const el = document.getElementById('menuStatistics');
        if (!el || !this.currentMenu) { if (el) el.innerHTML = ''; return; }
        el.innerHTML = `
            <div class="mn-stats-inner">
                <div class="mn-stats-left">
                    <div class="mn-stats-ring"><span class="mn-stats-pct">87%</span></div>
                    <div>
                        <h4 class="mn-stats-title">Resumen Nutricional Semanal</h4>
                        <p class="mn-stats-sub">Objetivo: 2,200 kcal promedio diario</p>
                    </div>
                </div>
                <div class="mn-stats-macros">
                    <div class="mn-macro">
                        <span class="mn-macro-val mn-macro-val--cyan">145g</span>
                        <span class="mn-macro-lbl">PROTEÍNAS</span>
                        <div class="mn-macro-bar"><div class="mn-macro-fill mn-macro-fill--cyan" style="width:75%"></div></div>
                    </div>
                    <div class="mn-macro">
                        <span class="mn-macro-val mn-macro-val--blue">210g</span>
                        <span class="mn-macro-lbl">CARBOS</span>
                        <div class="mn-macro-bar"><div class="mn-macro-fill mn-macro-fill--blue" style="width:50%"></div></div>
                    </div>
                    <div class="mn-macro">
                        <span class="mn-macro-val mn-macro-val--violet">65g</span>
                        <span class="mn-macro-lbl">GRASAS</span>
                        <div class="mn-macro-bar"><div class="mn-macro-fill mn-macro-fill--violet" style="width:65%"></div></div>
                    </div>
                </div>
            </div>`;
    }

    showEmptyState() {
        const grid = document.getElementById('menuGrid');
        if (!grid) return;
        grid.innerHTML = `
            <div class="mn-empty-state">
                <span class="material-symbols-outlined mn-empty-icon">restaurant_menu</span>
                <p class="mn-empty-title">No hay menú para esta semana</p>
                <p class="mn-empty-sub">Genera un nuevo menú usando el botón de arriba</p>
                <button class="mn-ai-cta" style="max-width:280px;margin-top:8px" onclick="menuManager.showGenerateModal()">
                    <div class="mn-ai-inner glass-card" style="padding:14px 20px;gap:12px">
                        <span class="material-symbols-outlined" style="color:#4cd7f6;font-variation-settings:'FILL' 1">auto_awesome</span>
                        <span style="color:#4cd7f6;font-weight:700;font-size:14px">Generar Menú con IA</span>
                    </div>
                </button>
            </div>`;
    }

    setLoading(loading) {
        this.isLoading = loading;
        const loadingOverlay = document.getElementById('loadingOverlay');
        if (loadingOverlay) {
            loadingOverlay.style.display = loading ? 'flex' : 'none';
        }
    }

    closeModal(modalId) {
        const modal = document.getElementById(modalId);
        if (modal) {
            modal.style.display = 'none';
        }
    }

    showSuccess(message) {
        this.showNotification(message, 'success');
    }

    showError(message) {
        this.showNotification(message, 'error');
    }

    showInfo(message) {
        this.showNotification(message, 'info');
    }

    showNotification(message, type = 'info') {
        // Crear notificación
        const notification = document.createElement('div');
        notification.className = `notification notification-${type}`;
        notification.textContent = message;
        
        document.body.appendChild(notification);
        
        // Animar entrada
        setTimeout(() => notification.classList.add('show'), 100);
        
        // Remover después de 3 segundos
        setTimeout(() => {
            notification.classList.remove('show');
            setTimeout(() => notification.remove(), 300);
        }, 3000);
    }

    getMonday(date) {
        const d = new Date(date);
        const day = d.getDay();
        const diff = d.getDate() - day + (day === 0 ? -6 : 1);
        return new Date(d.setDate(diff));
    }
}

// Instancia global
let menuManager;
