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
        await this.updateShoppingDropdown(); // sets _hasNext, then calls checkWeekendBanner
    }

    setupEventListeners() {
        // Botones principales
        document.getElementById('generateMenuBtn')?.addEventListener('click', () => this.showGenerateModal());

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

        // Shopping dropdown toggle
        document.getElementById('shoppingListBtn')?.addEventListener('click', (e) => {
            e.stopPropagation();
            const dd = document.getElementById('shoppingDropdown');
            if (dd) dd.style.display = dd.style.display === 'none' ? 'block' : 'none';
        });
        document.querySelectorAll('.sl-opt').forEach(opt => {
            opt.addEventListener('mouseenter', () => opt.style.background = 'rgba(76,215,246,.06)');
            opt.addEventListener('mouseleave', () => opt.style.background = '');
            opt.addEventListener('click', () => {
                const week = opt.dataset.week;
                document.getElementById('shoppingDropdown').style.display = 'none';
                this.showShoppingList(week);
            });
        });
        document.addEventListener('click', (e) => {
            if (!document.getElementById('shoppingDropdownWrap')?.contains(e.target)) {
                const dd = document.getElementById('shoppingDropdown');
                if (dd) dd.style.display = 'none';
            }
        });

        // Weekend banner CTA
        document.getElementById('weekendBannerBtn')?.addEventListener('click', () => {
            const nextMonday = new Date(this.getMonday(new Date()));
            nextMonday.setDate(nextMonday.getDate() + 7);
            const weekStr = nextMonday.toISOString().split('T')[0];
            this.loadWeekMenu(weekStr).then(() => this.showGenerateModal());
        });

        // Event delegation for dynamically-rendered menu grid
        document.getElementById('menuGrid')?.addEventListener('click', (e) => {
            const regenBtn = e.target.closest('.mn-regen-btn');
            if (regenBtn) {
                e.stopPropagation();
                this.openGenerateDayModal(regenBtn.dataset.day || null);
                return;
            }
            const emptyCard = e.target.closest('.mn-meal-empty');
            if (emptyCard) {
                this.openGenerateDayModal(emptyCard.dataset.day || null);
                return;
            }
        });

        // Generate day modal — backdrop close
        document.getElementById('generateDayModal')?.addEventListener('click', (e) => {
            if (e.target.id === 'generateDayModal') this.closeGenerateDayModal();
        });

        // Generate day modal — all static buttons (X, next, back, generate)
        document.getElementById('generateDayModal')?.addEventListener('click', (e) => {
            const btn = e.target.closest('button[data-gd-action]');
            if (!btn) return;
            const action = btn.dataset.gdAction;
            if (action === 'close')    this.closeGenerateDayModal();
            if (action === 'step2')    this.gdNextStep(2);
            if (action === 'step3')    this.gdNextStep(3);
            if (action === 'back1')    this.gdNextStep(1);
            if (action === 'back2')    this.gdNextStep(2);
            if (action === 'generate') this.submitGenerateDay();
        });

        // Bind static modal buttons once
        this._bindGenerateDayModal();
    }

    async loadCurrentWeekMenu() {
        try {
            this.setLoading(true);
            console.log('[menu] Buscando menú con datos...');

            let response = await api.get('/api/menu/current');

            if (response.success && response.data) {
                const menuData = typeof response.data.menu_data === 'string'
                    ? JSON.parse(response.data.menu_data)
                    : response.data.menu_data;

                if (this.hasAnyMealData(menuData)) {
                    console.log('[ok] Usando menú actual con datos:', response.data.id);
                    this.currentMenu = response.data;
                    this.currentWeek = new Date(response.data.semana_inicio + 'T12:00:00');
                    this.renderMenu();
                    this.updateWeekDisplay();
                    this.checkWeekendBanner();
                    return;
                }
            }

            console.log('[menu] Menú actual vacío, buscando último con datos...');
            const latestResponse = await api.get('/api/menu/latest');

            if (latestResponse.success && latestResponse.data) {
                const menuData = typeof latestResponse.data.menu_data === 'string'
                    ? JSON.parse(latestResponse.data.menu_data)
                    : latestResponse.data.menu_data;

                if (this.hasAnyMealData(menuData)) {
                    console.log('[ok] Usando último menú con datos:', latestResponse.data.id);
                    this.currentMenu = latestResponse.data;
                    this.currentWeek = new Date(latestResponse.data.semana_inicio + 'T12:00:00');
                    this.renderMenu();
                    this.updateWeekDisplay();
                    this.checkWeekendBanner();
                    return;
                }
            }

            console.log('[menu] No hay menús con datos, mostrando semana vacía');
            this.currentMenu = null;
            this.currentWeek = this.getMonday(new Date());
            this.updateWeekDisplay();
            this.showEmptyWeek();
            this.checkWeekendBanner();

        } catch (error) {
            console.error('Error cargando menú:', error);
            this.currentWeek = this.getMonday(new Date());
            this.updateWeekDisplay();
            this.showEmptyWeek();
        } finally {
            this.setLoading(false);
        }
    }

    async loadWeekMenu(weekStart) {
        try {
            this.setLoading(true);
            console.log('[menu] Solicitando semana:', weekStart);
            // Always set currentWeek to the REQUESTED week, not the found one
            const [y, m, d] = weekStart.split('-').map(Number);
            this._requestedWeek = new Date(y, m - 1, d);
            this.currentWeek = this._requestedWeek;
            this.updateWeekDisplay();

            const response = await api.get(`/api/menu/weekly?week_start=${weekStart}`);
            console.log('[menu] Respuesta del servidor:', response.success, response.data?.semana_inicio);

            if (response.success && response.data) {
                this.currentMenu = response.data;
                this.renderMenu();
            } else {
                // No menu for this week — show empty grid so user can generate
                this.currentMenu = null;
                this.showEmptyWeek();
            }
            this.updateShoppingDropdown();
            this.checkWeekendBanner();
        } catch (error) {
            console.error('[menu] Error cargando semana:', error);
            this.showEmptyWeek();
        } finally {
            this.setLoading(false);
        }
    }

    showEmptyWeek() {
        const grid = document.getElementById('menuGrid');
        if (!grid) return;
        const days     = ['lunes','martes','miercoles','jueves','viernes','sabado','domingo'];
        const dayNames = ['LUNES','MARTES','MIÉRCOLES','JUEVES','VIERNES','SÁBADO','DOMINGO'];
        grid.innerHTML = '';
        days.forEach((day, i) => {
            const col = document.createElement('div');
            col.className = 'mn-day';
            col.dataset.day = day;
            col.innerHTML = `
                <h2 class="mn-day-name" style="cursor:pointer;user-select:none;display:flex;align-items:center;justify-content:space-between;">
                    <span onclick="menuManager.toggleDay(this.closest('h2'))" style="flex:1;">${dayNames[i]}</span>
                    <span style="display:flex;align-items:center;gap:4px;">
                        <button class="mn-regen-btn" data-day="${day}" title="Generar día" tabindex="-1">
                            <span class="material-symbols-outlined" style="font-size:16px;">refresh</span>
                        </button>
                        <span class="mn-day-chevron material-symbols-outlined" style="font-size:16px;transition:transform .2s;opacity:0.5;" onclick="menuManager.toggleDay(this.closest('h2'))">expand_more</span>
                    </span>
                </h2>
                <div class="mn-day-body">
                    <div class="mn-meal-empty" data-day="${day}" style="cursor:pointer;height:80px;" title="Generar día">
                        <span class="material-symbols-outlined">add</span>
                    </div>
                </div>`;
            grid.appendChild(col);
        });
        document.getElementById('menuStatistics').innerHTML = '';
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
            if (!md) return `<div class="mn-meal-empty" data-day="${day}" title="Generar comida" style="cursor:pointer;"><span class="material-symbols-outlined">add</span></div>`;
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
                <h2 class="mn-day-name${isToday ? ' mn-day-name--today' : ''}" style="cursor:pointer;user-select:none;display:flex;align-items:center;justify-content:space-between;">
                    <span onclick="menuManager.toggleDay(this.closest('h2'))" style="flex:1;">${dayNames[i]}</span>
                    <span style="display:flex;align-items:center;gap:4px;">
                        <button class="mn-regen-btn" data-day="${day}" title="Generar día" tabindex="-1">
                            <span class="material-symbols-outlined" style="font-size:16px;">refresh</span>
                        </button>
                        <span class="mn-day-chevron material-symbols-outlined" style="font-size:16px;transition:transform .2s;opacity:0.5;" onclick="menuManager.toggleDay(this.closest('h2'))">expand_more</span>
                    </span>
                </h2>
                <div class="mn-day-body">`;

            if (availableMeals.length === 0) {
                col.innerHTML += `<div class="mn-meal-empty" data-day="${day}" style="cursor:pointer;" title="Generar día"><span class="material-symbols-outlined">add</span></div>`;
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
                this.currentWeek = new Date(response.menu.semana_inicio + 'T12:00:00');
                this.renderMenu();
                this.updateWeekDisplay();
                this.closeModal('generateMenuModal');
                this.updateShoppingDropdown();
                this.showSuccess('¡Menú generado exitosamente!');

                // Over-budget check
                try {
                    const md = typeof response.menu.menu_data === 'string' ? JSON.parse(response.menu.menu_data) : response.menu.menu_data;
                    const coste = md?.lista_compra?.coste_estimado_semana;
                    const budget = parseInt(formData.get('presupuesto')) || 0;
                    if (coste && budget && coste > budget) {
                        this._showOverBudgetAlert(coste, budget, data);
                    }
                } catch(_) {}
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

    async showShoppingList(weekParam = 'current') {
        const modal = document.getElementById('shoppingListModal');
        const content = document.getElementById('shoppingListContent');
        const title = document.getElementById('slModalTitle');
        const subtitle = document.getElementById('slModalSubtitle');
        if (!modal || !content) return;

        content.innerHTML = '<div style="text-align:center;padding:32px;color:#6b7a99;">Cargando...</div>';
        modal.style.display = 'flex';

        try {
            const res = await api.get(`/api/menu/shopping-list?week=${weekParam}`);
            if (!res.success) {
                content.innerHTML = `<div style="text-align:center;padding:32px;color:#f87171;">No hay menú disponible para generar la lista.</div>`;
                return;
            }
            const data = res.data;
            if (title) title.textContent = data.title || 'Lista de Compra';
            if (subtitle) subtitle.textContent = `Semana: ${data.subtitle || ''}`;

            this._currentShoppingWeek = weekParam;

            const catIcons = { 'Verduras & Frutas':'🥦','Proteínas':'🥩','Lácteos':'🧀','Despensa':'🫙','Otros':'📦' };
            let html = '';

            // Budget bar (only when we have cost estimate and budget set)
            const coste = data.coste_estimado;
            const presup = data.presupuesto;
            if (coste && presup) {
                const pct = Math.min(coste / presup, 1);
                const overBudget = coste > presup;
                const nearBudget = coste / presup >= 0.8;
                const barColor = overBudget ? '#f87171' : (nearBudget ? '#fbbf24' : '#4ade80');
                const ahorro = presup - coste;
                html += `<div style="margin-bottom:20px;padding:16px;background:rgba(25,31,49,.8);border:1px solid rgba(173,198,255,.1);border-radius:12px;">
                    <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:10px;">
                        <span style="color:#adc6ff;font-size:13px;font-weight:700;">Estimado presupuesto</span>
                        ${overBudget ? `<span style="color:#f87171;font-size:11px;font-weight:700;background:rgba(248,113,113,.1);padding:2px 8px;border-radius:10px;">⚠ Excede ${Math.round((coste/presup-1)*100)}%</span>` : ''}
                    </div>
                    <div style="display:flex;gap:16px;margin-bottom:10px;">
                        <div style="flex:1;text-align:center;">
                            <div style="color:${barColor};font-size:22px;font-weight:700;">€${coste.toFixed(2)}</div>
                            <div style="color:#6b7a99;font-size:10px;letter-spacing:.08em;">ESTIMADO</div>
                        </div>
                        <div style="width:1px;background:rgba(173,198,255,.1);"></div>
                        <div style="flex:1;text-align:center;">
                            <div style="color:#adc6ff;font-size:22px;font-weight:700;">€${presup}</div>
                            <div style="color:#6b7a99;font-size:10px;letter-spacing:.08em;">PRESUPUESTO</div>
                        </div>
                        <div style="width:1px;background:rgba(173,198,255,.1);"></div>
                        <div style="flex:1;text-align:center;">
                            <div style="color:${ahorro >= 0 ? '#4ade80' : '#f87171'};font-size:22px;font-weight:700;">${ahorro >= 0 ? '+' : ''}€${Math.abs(ahorro).toFixed(2)}</div>
                            <div style="color:#6b7a99;font-size:10px;letter-spacing:.08em;">${ahorro >= 0 ? 'AHORRO' : 'EXCESO'}</div>
                        </div>
                    </div>
                    <div style="background:rgba(255,255,255,.06);border-radius:6px;height:8px;overflow:hidden;">
                        <div style="height:100%;width:${(pct*100).toFixed(1)}%;background:${barColor};border-radius:6px;transition:width .4s ease;"></div>
                    </div>
                </div>`;
            }

            const hasPrices = Object.values(data.categories || {}).some(items => items.some(i => i.precio != null));

            for (const [cat, items] of Object.entries(data.categories || {})) {
                const subtotal = data.subtotals?.[cat];
                html += `<div style="margin-bottom:18px;">
                    <div style="display:flex;align-items:center;gap:8px;margin-bottom:8px;">
                        <span style="font-size:16px;">${catIcons[cat] || '📦'}</span>
                        <span style="color:#4cd7f6;font-size:11px;font-weight:700;letter-spacing:.1em;">${cat.toUpperCase()}</span>
                        ${subtotal ? `<span style="margin-left:auto;color:#6b7a99;font-size:11px;">€${subtotal.toFixed(2)}</span>` : ''}
                    </div>
                    <div style="display:flex;flex-direction:column;gap:4px;">
                        ${items.map(item => {
                            const nombre = typeof item === 'object' ? item.nombre : item;
                            const precio = typeof item === 'object' ? item.precio : undefined;
                            return `<label style="display:flex;align-items:center;gap:10px;padding:6px 10px;border-radius:8px;background:rgba(25,31,49,.6);cursor:pointer;">
                                <input type="checkbox" style="accent-color:#4cd7f6;width:15px;height:15px;">
                                <span style="color:#dce1fb;font-size:13px;flex:1;">${nombre}</span>
                                ${precio != null ? `<span style="color:#6b7a99;font-size:12px;white-space:nowrap;">€${precio.toFixed(2)}</span>` : (hasPrices ? '<span style="width:40px;"></span>' : '')}
                            </label>`;
                        }).join('')}
                    </div>
                </div>`;
            }
            content.innerHTML = html || '<div style="padding:24px;color:#6b7a99;text-align:center;">No se encontraron ingredientes.</div>';

            // Wire download button
            document.getElementById('slDownloadBtn')?.removeEventListener('click', this._slDownload);
            this._slDownload = () => window.open(`/api/menu/shopping-list?week=${weekParam}&format=txt`, '_blank');
            document.getElementById('slDownloadBtn')?.addEventListener('click', this._slDownload);

        } catch (e) {
            content.innerHTML = `<div style="color:#f87171;padding:24px;">Error cargando lista: ${e.message}</div>`;
        }
    }

    // Shopping dropdown state
    async updateShoppingDropdown() {
        const thisMonday = this.getMonday(new Date());
        const nextMonday = new Date(thisMonday);
        nextMonday.setDate(thisMonday.getDate() + 7);

        const fmt = (d) => {
            const sun = new Date(d); sun.setDate(d.getDate() + 6);
            return `${d.getDate()}–${sun.getDate()} ${d.toLocaleDateString('es-ES',{month:'short'})}`;
        };

        // Check which weeks have menus
        let hasCurrent = false, hasNext = false;
        try {
            const [rc, rn] = await Promise.all([
                api.get(`/api/menu/weekly?week_start=${thisMonday.toISOString().split('T')[0]}`),
                api.get(`/api/menu/weekly?week_start=${nextMonday.toISOString().split('T')[0]}`),
            ]);
            hasCurrent = rc.success && !!rc.data;
            hasNext = rn.success && !!rn.data;
        } catch(_) {}

        // Status pills
        const pills = document.getElementById('weekStatusPills');
        if (pills) {
            const pill = (label, active) => `<span style="font-size:10px;font-weight:600;padding:2px 8px;border-radius:20px;background:${active ? 'rgba(76,215,246,.15)' : 'rgba(74,85,104,.15)'};color:${active ? '#4cd7f6' : '#4a5568'};border:1px solid ${active ? 'rgba(76,215,246,.3)' : 'rgba(74,85,104,.3)'};">${active ? '●' : '○'} ${label}</span>`;
            pills.innerHTML = pill('Esta semana', hasCurrent) + pill('Próx. semana', hasNext);
        }

        // Dropdown options
        const styleOpt = (el, enabled, range) => {
            if (!el) return;
            el.querySelector('.sl-opt-range').textContent = range;
            if (enabled) {
                el.style.opacity = '1'; el.style.pointerEvents = 'auto';
                el.title = '';
            } else {
                el.style.opacity = '0.4'; el.style.pointerEvents = 'none';
                el.title = 'Genera el menú primero';
            }
        };
        styleOpt(document.querySelector('[data-week="current"]'), hasCurrent, fmt(thisMonday));
        styleOpt(document.querySelector('[data-week="next"]'), hasNext, fmt(nextMonday));
        styleOpt(document.querySelector('[data-week="both"]'), hasCurrent && hasNext, '');

        // Weekend banner
        this._hasCurrent = hasCurrent;
        this._hasNext = hasNext;
        this.checkWeekendBanner();
    }

    checkWeekendBanner() {
        const banner = document.getElementById('weekendBanner');
        if (!banner) return;
        const dow = new Date().getDay(); // 0=Sun, 6=Sat
        const isWeekend = dow === 0 || dow === 6;
        const showBanner = isWeekend && !this._hasNext;

        if (showBanner) {
            const nextMonday = new Date(this.getMonday(new Date()));
            nextMonday.setDate(nextMonday.getDate() + 7);
            const label = `Generar semana del ${nextMonday.getDate()} ${nextMonday.toLocaleDateString('es-ES',{month:'long'})}`;
            const bannerLabel = document.getElementById('weekendBannerLabel');
            if (bannerLabel) bannerLabel.textContent = label;
            banner.style.display = '';
        } else {
            banner.style.display = 'none';
        }

        // Never show both the banner and the AI CTA card at the same time
        const aiCta = document.getElementById('generateMenuBtn');
        if (aiCta) aiCta.style.display = showBanner ? 'none' : '';
    }

    updateWeekDisplay() {
        if (!this.currentWeek) return;
        const weekDisplay = document.getElementById('currentWeekDisplay');
        if (!weekDisplay) return;

        const monday = new Date(this.currentWeek);
        const sunday = new Date(monday);
        sunday.setDate(monday.getDate() + 6);

        const thisMonday = this.getMonday(new Date());
        const nextMonday = new Date(thisMonday);
        nextMonday.setDate(thisMonday.getDate() + 7);

        const isThis = monday.toDateString() === thisMonday.toDateString();
        const isNext = monday.toDateString() === nextMonday.toDateString();

        const rangeOpts = { day: 'numeric', month: 'short' };
        const monStr = monday.toLocaleDateString('es-ES', rangeOpts);
        const sunStr = sunday.toLocaleDateString('es-ES', rangeOpts);
        const range = `${monStr} – ${sunStr}`;

        if (isThis) {
            weekDisplay.innerHTML = `<strong>Esta semana</strong> · ${range}`;
        } else if (isNext) {
            weekDisplay.innerHTML = `<strong style="color:#4cd7f6">Próxima semana</strong> · ${range}`;
        } else {
            weekDisplay.textContent = range;
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

    // ── Generate Day Modal ──────────────────────────────────────────────────

    openGenerateDayModal(preselectedDay = null) {
        // Show modal immediately — reset state after
        const modal = document.getElementById('generateDayModal');
        if (!modal) { console.error('[gd] modal element not found'); return; }
        modal.style.display = 'flex';

        try {
            this._gdState = { day: preselectedDay || null, meals: ['desayuno','comida','cena'], tipo: 'ambos', cocina: '', diff: '', time: null, notes: '' };
            this._gdStep = 1;

            document.querySelectorAll('.gd-day-btn').forEach(b => {
                b.classList.toggle('active', b.dataset.day === preselectedDay);
            });
            document.querySelectorAll('.gd-tipo-btn').forEach(b => {
                b.classList.toggle('active', b.dataset.tipo === 'ambos');
            });
            document.querySelectorAll('#gdMealPicker input').forEach(cb => {
                cb.checked = ['desayuno','comida','cena'].includes(cb.value);
            });
            document.querySelectorAll('#gdCuisineChips .gd-chip').forEach(c => c.classList.remove('active'));
            document.querySelector('#gdCuisineChips [data-value=""]')?.classList.add('active');
            document.querySelectorAll('[data-diff]').forEach(c => c.classList.remove('active'));
            document.querySelector('[data-diff=""]')?.classList.add('active');

            const timeInput = document.getElementById('gdTimeInput');
            if (timeInput) timeInput.value = '';
            const notesInput = document.getElementById('gdNotesInput');
            if (notesInput) notesInput.value = '';
            const errEl = document.getElementById('gdError');
            if (errEl) errEl.style.display = 'none';
            const warnEl = document.getElementById('gdWarning');
            if (warnEl) warnEl.style.display = 'none';
            const genBtn = document.getElementById('gdGenerateBtn');
            if (genBtn) {
                genBtn.disabled = false;
                genBtn.innerHTML = '<span class="material-symbols-outlined" style="font-size:18px;">auto_awesome</span> Generar con IA';
            }

            this._showGdStep(1);
        } catch(e) {
            console.error('[gd] openGenerateDayModal error:', e);
        }
    }

    closeGenerateDayModal() {
        document.getElementById('generateDayModal').style.display = 'none';
    }

    _bindGenerateDayModal() {
        // Called once from setupEventListeners — wires up the static modal buttons
        document.querySelectorAll('.gd-day-btn').forEach(b => {
            b.addEventListener('click', () => {
                document.querySelectorAll('.gd-day-btn').forEach(x => x.classList.remove('active'));
                b.classList.add('active');
                if (this._gdState) this._gdState.day = b.dataset.day;
            });
        });

        document.querySelectorAll('.gd-tipo-btn').forEach(b => {
            b.addEventListener('click', () => {
                document.querySelectorAll('.gd-tipo-btn').forEach(x => x.classList.remove('active'));
                b.classList.add('active');
                if (this._gdState) this._gdState.tipo = b.dataset.tipo;
            });
        });

        document.querySelectorAll('#gdCuisineChips .gd-chip').forEach(c => {
            c.addEventListener('click', () => {
                document.querySelectorAll('#gdCuisineChips .gd-chip').forEach(x => x.classList.remove('active'));
                c.classList.add('active');
                if (this._gdState) this._gdState.cocina = c.dataset.value;
            });
        });

        document.querySelectorAll('[data-diff]').forEach(c => {
            c.addEventListener('click', () => {
                document.querySelectorAll('[data-diff]').forEach(x => x.classList.remove('active'));
                c.classList.add('active');
                if (this._gdState) this._gdState.diff = c.dataset.diff;
            });
        });

        // Fridge tag input
        this._fridgeItems = JSON.parse(localStorage.getItem('jaxo_fridge_items') || '[]');
        this._renderFridgeTags();
        this._loadFridgeSuggestions();

        document.getElementById('gdFridgeInput')?.addEventListener('keydown', (e) => {
            if (e.key === 'Enter' || e.key === ',') {
                e.preventDefault();
                const val = e.target.value.trim().replace(/,$/, '');
                if (val) { this._addFridgeItem(val); e.target.value = ''; }
            }
            if (e.key === 'Backspace' && !e.target.value && this._fridgeItems.length) {
                this._fridgeItems.pop();
                this._renderFridgeTags();
            }
        });

        document.getElementById('gdFridgeClear')?.addEventListener('click', () => {
            this._fridgeItems = [];
            this._renderFridgeTags();
            localStorage.removeItem('jaxo_fridge_items');
        });
    }

    _addFridgeItem(text) {
        const clean = text.trim().toLowerCase();
        if (clean && !this._fridgeItems.includes(clean)) {
            this._fridgeItems.push(clean);
            this._renderFridgeTags();
            localStorage.setItem('jaxo_fridge_items', JSON.stringify(this._fridgeItems));
        }
    }

    _renderFridgeTags() {
        const container = document.getElementById('gdFridgeTags');
        const input = document.getElementById('gdFridgeInput');
        if (!container || !input) return;
        // Remove old chips (keep the input)
        [...container.querySelectorAll('.gd-fridge-chip')].forEach(c => c.remove());
        this._fridgeItems.forEach(item => {
            const chip = document.createElement('span');
            chip.className = 'gd-fridge-chip';
            chip.style.cssText = 'display:inline-flex;align-items:center;gap:4px;background:rgba(76,215,246,.15);border:1px solid rgba(76,215,246,.4);border-radius:20px;color:#4cd7f6;font-size:12px;font-weight:600;padding:3px 8px;';
            chip.innerHTML = `${item} <span style="cursor:pointer;opacity:.7;font-size:14px;line-height:1;" data-remove="${item}">&times;</span>`;
            chip.querySelector('[data-remove]').addEventListener('click', () => {
                this._fridgeItems = this._fridgeItems.filter(i => i !== item);
                this._renderFridgeTags();
                localStorage.setItem('jaxo_fridge_items', JSON.stringify(this._fridgeItems));
            });
            container.insertBefore(chip, input);
        });
    }

    _loadFridgeSuggestions() {
        const defaults = ['ajo','cebolla','aceite de oliva','tomate','huevos','limón','pasta','arroz'];
        const suggestions = document.getElementById('gdFridgeSuggestions');
        if (!suggestions) return;
        // Clear existing suggestion chips (keep the label span)
        [...suggestions.querySelectorAll('.gd-sugg-chip')].forEach(c => c.remove());
        defaults.forEach(s => {
            const btn = document.createElement('button');
            btn.className = 'gd-sugg-chip';
            btn.textContent = s;
            btn.style.cssText = 'background:rgba(25,31,49,.8);border:1px solid rgba(173,198,255,.15);border-radius:20px;color:#6b7a99;font-size:11px;padding:3px 10px;cursor:pointer;';
            btn.addEventListener('click', () => { this._addFridgeItem(s); });
            suggestions.appendChild(btn);
        });
    }

    _showGdStep(step) {
        this._gdStep = step;
        [1,2,3].forEach(n => {
            const panel = document.getElementById(`gdStep${n}`);
            const tab = document.getElementById(`gdTab${n}`);
            if (panel) panel.style.display = n === step ? 'block' : 'none';
            if (tab) {
                tab.style.color = n === step ? '#adc6ff' : (n < step ? '#6b7a99' : '#4a5568');
                tab.style.borderBottomColor = n === step ? '#4cd7f6' : 'transparent';
            }
        });
    }

    gdNextStep(step) {
        if (step === 2) {
            if (!this._gdState.day) { this.showError('Elige un día para continuar'); return; }
            const checked = [...document.querySelectorAll('#gdMealPicker input:checked')].map(c => c.value);
            if (checked.length === 0) { this.showError('Elige al menos una comida'); return; }
            this._gdState.meals = checked;
        }
        if (step === 3) {
            this._gdState.time = document.getElementById('gdTimeInput').value || null;
            this._gdState.notes = document.getElementById('gdNotesInput').value.trim();
            this._gdState.fridgeItems = [...(this._fridgeItems || [])];
            this._gdState.fridgeMode = document.querySelector('input[name="gdFridgeMode"]:checked')?.value || 'base';
            this._buildGdSummary();
        }
        this._showGdStep(step);
    }

    _buildGdSummary() {
        const dayLabel = { lunes:'Lunes', martes:'Martes', miercoles:'Miércoles', jueves:'Jueves', viernes:'Viernes', sabado:'Sábado', domingo:'Domingo' };
        const s = this._gdState;
        const lines = [
            `<strong style="color:#4cd7f6">Día:</strong> ${dayLabel[s.day] || s.day}`,
            `<strong style="color:#4cd7f6">Comidas:</strong> ${s.meals.join(', ')}`,
            `<strong style="color:#4cd7f6">Para:</strong> ${s.tipo}`,
        ];
        if (s.fridgeItems?.length) {
            const modeLabel = s.fridgeMode === 'strict' ? 'solo estos' : 'base + básicos';
            lines.push(`<strong style="color:#4cd7f6">🧊 Nevera (${modeLabel}):</strong> ${s.fridgeItems.join(', ')}`);
        }
        if (s.cocina) lines.push(`<strong style="color:#4cd7f6">Cocina:</strong> ${s.cocina}`);
        if (s.time) lines.push(`<strong style="color:#4cd7f6">Tiempo máx:</strong> ${s.time} min`);
        if (s.diff) lines.push(`<strong style="color:#4cd7f6">Dificultad:</strong> ${s.diff}`);
        if (s.notes) lines.push(`<strong style="color:#4cd7f6">Notas:</strong> ${s.notes}`);
        document.getElementById('gdSummary').innerHTML = lines.join('<br>');

        // Check if day already has data
        if (this.currentMenu) {
            const md = typeof this.currentMenu.menu_data === 'string' ? JSON.parse(this.currentMenu.menu_data) : this.currentMenu.menu_data;
            const hasData = md?.menu_adultos?.[s.day] && Object.keys(md.menu_adultos[s.day]).length > 0;
            document.getElementById('gdWarning').style.display = hasData ? 'block' : 'none';
        }
    }

    _showOverBudgetAlert(coste, budget, originalData) {
        const excess = (coste - budget).toFixed(2);
        const pct = Math.round((coste / budget - 1) * 100);
        const el = document.createElement('div');
        el.id = 'overBudgetAlert';
        el.style.cssText = 'position:fixed;bottom:24px;left:50%;transform:translateX(-50%);z-index:9999;background:rgba(12,19,36,.97);border:1px solid rgba(248,113,113,.4);border-radius:14px;padding:16px 20px;max-width:480px;width:92%;box-shadow:0 8px 32px rgba(0,0,0,.6);';
        el.innerHTML = `
            <div style="display:flex;align-items:flex-start;gap:12px;">
                <span style="font-size:22px;line-height:1;">⚠️</span>
                <div style="flex:1;">
                    <div style="color:#f87171;font-weight:700;font-size:14px;margin-bottom:4px;">Presupuesto superado (+${pct}%)</div>
                    <div style="color:#9ca3af;font-size:12px;margin-bottom:12px;">Estimado <strong style="color:#f87171;">€${coste.toFixed(2)}</strong> vs presupuesto <strong style="color:#adc6ff;">€${budget}</strong> (exceso €${excess})</div>
                    <div style="display:flex;gap:8px;flex-wrap:wrap;">
                        <button id="regenBudgetBtn" style="background:linear-gradient(135deg,#4cd7f6,#adc6ff);border:none;border-radius:8px;color:#0c1324;font-size:12px;font-weight:700;padding:8px 14px;cursor:pointer;">Regenerar ajustando presupuesto</button>
                        <button id="dismissBudgetBtn" style="background:rgba(255,255,255,.06);border:1px solid rgba(255,255,255,.1);border-radius:8px;color:#6b7a99;font-size:12px;padding:8px 14px;cursor:pointer;">Mantener este menú</button>
                    </div>
                </div>
            </div>`;
        document.body.appendChild(el);

        el.querySelector('#dismissBudgetBtn').addEventListener('click', () => el.remove());
        el.querySelector('#regenBudgetBtn').addEventListener('click', async () => {
            el.remove();
            // Re-generate with explicit budget constraint note
            const tightData = { ...originalData };
            tightData.settings = { ...(tightData.settings || {}), presupuesto_semanal: budget, regenerate: true };
            tightData.settings.preferencias_especiales = `IMPORTANTE: el presupuesto MÁXIMO es ${budget}€ esta semana, usa ingredientes económicos y de temporada.`;
            try {
                this.setLoading(true);
                const r = await api.post('/api/menu/generate', tightData);
                if (r.success) {
                    this.currentMenu = r.menu;
                    this.currentWeek = new Date(r.menu.semana_inicio + 'T12:00:00');
                    this.renderMenu();
                    this.updateWeekDisplay();
                    this.updateShoppingDropdown();
                    this.showSuccess('Menú regenerado dentro del presupuesto');
                } else {
                    this.showError(r.message || 'Error regenerando');
                }
            } catch(e) {
                this.showError('Error regenerando menú');
            } finally {
                this.setLoading(false);
            }
        });

        // Auto-dismiss after 15s
        setTimeout(() => el.remove(), 15000);
    }

    async submitGenerateDay() {
        const s = this._gdState;
        const btn = document.getElementById('gdGenerateBtn');
        btn.disabled = true;
        btn.innerHTML = '<span class="material-symbols-outlined" style="font-size:18px;animation:spin 1s linear infinite;">refresh</span> Generando...';
        document.getElementById('gdError').style.display = 'none';

        // Show shimmer on target day column
        const dayCol = document.querySelector(`.mn-day[data-day="${s.day}"]`);
        let origContent = null;
        if (dayCol) {
            const body = dayCol.querySelector('.mn-day-body');
            origContent = body?.innerHTML;
            if (body) body.innerHTML = s.meals.map(() => `<div class="mn-card-shimmer"></div><div class="mn-card-shimmer" style="height:64px;margin-top:4px;"></div>`).join('');
        }

        try {
            const payload = {
                dia: s.day,
                comidas: s.meals,
                tipo: s.tipo,
                cocina: s.cocina,
                dificultad: s.diff,
                notas: s.notes,
                fridge_items: s.fridgeItems || [],
                fridge_mode: s.fridgeMode || 'base',
            };
            if (s.time) payload.tiempo_max = parseInt(s.time);
            if (this.currentMenu?.id) payload.menu_id = this.currentMenu.id;

            const result = await api.post('/api/menu/generate-day', payload);

            if (result.success) {
                this.currentMenu = result.menu;
                this.closeGenerateDayModal();
                this.renderMenu();
                // Glow the updated day
                setTimeout(() => {
                    const col = document.querySelector(`.mn-day[data-day="${s.day}"]`);
                    if (col) { col.classList.add('mn-day--glow'); setTimeout(() => col.classList.remove('mn-day--glow'), 3600); }
                }, 50);
                this.showSuccess(`Menú del ${s.day} generado correctamente`);
            } else {
                throw new Error(result.message || 'Error desconocido');
            }
        } catch (err) {
            // Restore original content on error
            if (dayCol && origContent) {
                const body = dayCol.querySelector('.mn-day-body');
                if (body) body.innerHTML = origContent;
            }
            const errEl = document.getElementById('gdError');
            errEl.textContent = `Error: ${err.message}`;
            errEl.style.display = 'block';
            btn.disabled = false;
            btn.innerHTML = '<span class="material-symbols-outlined" style="font-variation-settings:\'FILL\' 1;font-size:18px;">auto_awesome</span> Reintentar';
        }
    }
}

// Instancia global
let menuManager;
