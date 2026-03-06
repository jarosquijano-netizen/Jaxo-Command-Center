// ============================================
// DASHBOARD MANAGER - Integración con Base de Datos
// ============================================

class DashboardManager {
    constructor() {
        this.currentMenuDay = new Date().getDay();
        this.currentCleaningDay = new Date().getDay();
        this.currentCalendarDay = new Date().getDay();
        this.currentShoppingList = null;
        this.currentWeek = null;
        this.currentCalendarFilter = 'all';
        this.daysOfWeek = ['Domingo', 'Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado'];
        this.daysShort = ['Dom', 'Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb'];
        this.apiBase = 'http://localhost:9000/api';
        
        this.init();
    }

    async init() {
        this.updateCurrentDate();
        this.setupEventListeners();
        this.setupDayTabs();
        
        // Initialize Lucide icons
        if (typeof lucide !== 'undefined') {
            lucide.createIcons();
        }
        
        // Cargar datos reales
        await this.loadRealData();
        
        // Configurar auto-actualización diaria
        this.setupDailyRefresh();
    }

    setupDailyRefresh() {
        // Verificar si ya es un nuevo día
        const checkForNewDay = () => {
            const now = new Date();
            const currentDay = now.getDate();
            const currentMonth = now.getMonth();
            const currentYear = now.getFullYear();
            
            // Obtener el día almacenado
            const storedDay = localStorage.getItem('dashboard_last_day');
            const storedDate = storedDay ? new Date(storedDay) : null;
            
            if (storedDate) {
                const storedDayNum = storedDate.getDate();
                const storedMonth = storedDate.getMonth();
                const storedYear = storedDate.getFullYear();
                
                // Si es un día nuevo, recargar datos
                if (currentDay !== storedDayNum || currentMonth !== storedMonth || currentYear !== storedYear) {
                    console.log('🌅 Nuevo día detectado, actualizando dashboard...');
                    this.loadRealData();
                    
                    // Actualizar fecha del día almacenado
                    localStorage.setItem('dashboard_last_day', now.toISOString());
                }
            } else {
                // Primera vez que se carga, guardar la fecha
                localStorage.setItem('dashboard_last_day', now.toISOString());
            }
        };
        
        // Verificar cada minuto si es un nuevo día
        setInterval(checkForNewDay, 60000); // Cada minuto
        
        // Verificar inmediatamente
        checkForNewDay();
        
        // También configurar actualización a medianoche (12:00 PM)
        this.scheduleMiddayRefresh();
        
        // Configurar actualización al inicio de cada día (00:05 AM)
        this.scheduleMidnightRefresh();
    }

    scheduleMiddayRefresh() {
        const now = new Date();
        const tomorrow = new Date(now);
        tomorrow.setDate(tomorrow.getDate() + 1);
        tomorrow.setHours(12, 0, 0, 0); // Mañana a las 12:00 PM
        
        const timeUntilMidday = tomorrow - now;
        
        if (timeUntilMidday > 0) {
            setTimeout(() => {
                console.log('🌞️ Actualización del mediodía - recargando dashboard...');
                this.loadRealData();
                this.scheduleMiddayRefresh(); // Programar el siguiente día
            }, timeUntilMidday);
        }
    }

    scheduleMidnightRefresh() {
        const now = new Date();
        const tomorrow = new Date(now);
        tomorrow.setDate(tomorrow.getDate() + 1);
        tomorrow.setHours(0, 5, 0, 0); // Mañana a las 00:05 AM
        
        const timeUntilMidnight = tomorrow - now;
        
        if (timeUntilMidnight > 0) {
            setTimeout(() => {
                console.log('🌙️ Actualización de medianoche - recargando dashboard...');
                this.loadRealData();
                this.scheduleMidnightRefresh(); // Programar el siguiente día
            }, timeUntilMidnight);
        }
    }

    async loadRealData() {
        try {
            console.log('🔄 Dashboard: Cargando datos reales...');
            
            // Cargar datos en paralelo
            const [familyData, menuData, cleaningData, calendarData] = await Promise.all([
                this.fetchFamilyMembers(),
                this.fetchCurrentMenu(),
                this.fetchCleaningSchedule(),
                this.fetchCalendarEvents()
            ]);

            console.log('📊 Datos recibidos:', {
                familyData: familyData?.length || 0,
                menuData: menuData ? 'OK' : 'NULL',
                cleaningData: cleaningData?.length || 0,
                calendarData: calendarData?.events?.length || 0
            });

            // Actualizar dashboard con datos reales
            this.updateFamilyAvatars(familyData);
            this.updateMenuSection(menuData);
            this.updateShoppingListSection(menuData);
            this.updateCleaningSection(cleaningData);
            this.updateCalendarSection(calendarData);
            this.updateStatCards(familyData, menuData, cleaningData, calendarData);
            
            console.log('✅ Dashboard: Datos actualizados correctamente');
            
        } catch (error) {
            console.error('❌ Error cargando datos reales:', error);
            this.showError('Error cargando datos del servidor');
        }
    }

    async fetchFamilyMembers() {
        try {
            const response = await fetch(`${this.apiBase}/family/members`);
            const result = await response.json();
            return result.success ? result.data : [];
        } catch (error) {
            console.error('Error fetching family members:', error);
            return [];
        }
    }

    async fetchCurrentMenu() {
        try {
            // Primero intentar con current, si no hay datos, usar latest
            let response = await fetch(`${this.apiBase}/menu/current`);
            let result = await response.json();
            
            if (!result.success || !result.data) {
                console.log('📝 Menú actual vacío, buscando último con datos...');
                response = await fetch(`${this.apiBase}/menu/latest`);
                result = await response.json();
            }
            
            return result.success ? result.data : null;
        } catch (error) {
            console.error('Error fetching menu:', error);
            return null;
        }
    }

    async fetchCleaningSchedule() {
        try {
            const response = await fetch(`${this.apiBase}/cleaning/schedule`);
            const result = await response.json();
            return result.success ? result.data : [];
        } catch (error) {
            console.error('Error fetching cleaning schedule:', error);
            return [];
        }
    }

    async fetchCalendarEvents() {
        try {
            const response = await fetch(`${this.apiBase}/calendar/week`);
            const result = await response.json();
            return result.success ? result.data : { events: [] };
        } catch (error) {
            console.error('Error fetching calendar events:', error);
            return { events: [] };
        }
    }

    updateFamilyAvatars(members) {
        const avatarsContainer = document.querySelector('.family-avatars');
        if (!avatarsContainer || !members.length) return;

        avatarsContainer.innerHTML = '';
        
        members.forEach(member => {
            const avatar = document.createElement('div');
            avatar.className = `avatar-circle avatar-${member.nombre.toLowerCase()}`;
            avatar.title = member.nombre;
            avatar.textContent = member.nombre.charAt(0).toUpperCase();
            
            // Usar color personalizado si existe
            if (member.avatar_color) {
                avatar.style.background = member.avatar_color;
            }
            
            avatarsContainer.appendChild(avatar);
        });
    }

    updateMenuSection(menuData) {
        if (!menuData) {
            console.log('No hay datos de menú disponibles');
            return;
        }

        const menuContent = document.querySelector('.menu-content');
        if (!menuContent) return;

        // Parsear datos del menú
        let menuParsed;
        try {
            menuParsed = typeof menuData.menu_data === 'string' 
                ? JSON.parse(menuData.menu_data) 
                : menuData.menu_data;
        } catch (error) {
            console.error('Error parseando menu data:', error);
            return;
        }

        console.log('🍽️ Menu data parsed:', menuParsed);

        // Obtener el día actual (hoy)
        const today = new Date();
        const dayNames = ['domingo', 'lunes', 'martes', 'miercoles', 'jueves', 'viernes', 'sabado'];
        const currentDay = dayNames[today.getDay()];
        
        console.log(`📅 Mostrando menú para hoy: ${currentDay}`);
        
        // Buscar en ambos menús (adultos y niños) para el día actual
        const adultMenu = menuParsed.menu_adultos?.[currentDay];
        const kidsMenu = menuParsed.menu_ninos?.[currentDay];
        
        if (!adultMenu && !kidsMenu) {
            console.log(`No hay menú para hoy (${currentDay})`);
            menuContent.innerHTML = '<p style="text-align: center; color: var(--text-secondary);">No hay menú para hoy</p>';
            return;
        }

        // Actualizar contenido del menú sin encabezado duplicado
        menuContent.innerHTML = '';
        
        // Comidas disponibles en el menú de hoy
        const availableMeals = new Set();
        if (adultMenu) {
            Object.keys(adultMenu).forEach(meal => availableMeals.add(meal));
        }
        if (kidsMenu) {
            Object.keys(kidsMenu).forEach(meal => availableMeals.add(meal));
        }

        // Mostrar cada comida disponible para hoy
        availableMeals.forEach(meal => {
            const mealSection = document.createElement('div');
            mealSection.className = 'meal-section';
            
            // Obtener datos del plato
            const adultMeal = adultMenu?.[meal];
            const kidsMeal = kidsMenu?.[meal];
            
            // Extraer nombre del plato
            const adultPlate = adultMeal?.plato || 'Sin definir';
            const kidsPlate = kidsMeal?.plato || 'Sin definir';
            
            mealSection.innerHTML = `
                <div class="meal-header">
                    <i data-lucide="${this.getMealIcon(meal)}" class="meal-icon"></i>
                    <span class="meal-title">${this.formatMealName(meal)}</span>
                </div>
                <div class="meal-content">
                    ${adultMeal ? `
                        <div class="meal-group">
                            <div class="meal-group-label adultos-label">Adultos</div>
                            <div class="meal-item">
                                <div class="meal-plate">${adultPlate}</div>
                                ${adultMeal.ingredientes ? `
                                    <div class="meal-details">
                                        <div class="meal-ingredients">
                                            <strong>Ingredientes:</strong> ${adultMeal.ingredientes}
                                        </div>
                                        ${adultMeal.preparacion ? `
                                            <div class="meal-preparation">
                                                <strong>Preparación:</strong> ${adultMeal.preparacion}
                                            </div>
                                        ` : ''}
                                        ${adultMeal.tiempo ? `
                                            <div class="meal-time">
                                                <strong>Tiempo:</strong> ${adultMeal.tiempo}
                                            </div>
                                        ` : ''}
                                    </div>
                                ` : ''}
                            </div>
                        </div>
                    ` : ''}
                    ${kidsMeal ? `
                        <div class="meal-group">
                            <div class="meal-group-label ninas-label">Niñas</div>
                            <div class="meal-item">
                                <div class="meal-plate">${kidsPlate}</div>
                                ${kidsMeal.ingredientes ? `
                                    <div class="meal-details">
                                        <div class="meal-ingredients">
                                            <strong>Ingredientes:</strong> ${kidsMeal.ingredientes}
                                        </div>
                                        ${kidsMeal.preparacion ? `
                                            <div class="meal-preparation">
                                                <strong>Preparación:</strong> ${kidsMeal.preparacion}
                                            </div>
                                        ` : ''}
                                        ${kidsMeal.tiempo ? `
                                            <div class="meal-time">
                                                <strong>Tiempo:</strong> ${kidsMeal.tiempo}
                                            </div>
                                        ` : ''}
                                    </div>
                                ` : ''}
                            </div>
                        </div>
                    ` : ''}
                </div>
            `;
            
            menuContent.appendChild(mealSection);
        });

        // Re-inicializar icons
        if (typeof lucide !== 'undefined') {
            lucide.createIcons();
        }
    }

    getMealIcon(meal) {
        const icons = {
            'desayuno': 'sun',
            'comida': 'sun',
            'almuerzo': 'sun',
            'merienda': 'coffee',
            'cena': 'moon'
        };
        return icons[meal] || 'utensils';
    }

    formatMealName(meal) {
        const names = {
            'desayuno': 'Desayuno',
            'comida': 'Comida',
            'almuerzo': 'Almuerzo',
            'merienda': 'Merienda',
            'cena': 'Cena'
        };
        return names[meal] || meal.charAt(0).toUpperCase() + meal.slice(1);
    }

    updateCleaningSection(cleaningData) {
        const cleaningContent = document.querySelector('.cleaning-tasks-content');
        if (!cleaningContent) return;

        // Obtener tareas de hoy
        const today = new Date().toISOString().split('T')[0];
        const todayTasks = cleaningData.filter(task => 
            task.fecha_programada && task.fecha_programada.startsWith(today)
        );

        // Actualizar contenido sin encabezado duplicado
        cleaningContent.innerHTML = '';

        if (todayTasks.length === 0) {
            cleaningContent.innerHTML = '<p style="text-align: center; color: var(--text-secondary);">No hay tareas de limpieza para hoy</p>';
            return;
        }

        // Agrupar tareas por área
        const tasksByArea = {};
        todayTasks.forEach(task => {
            if (!tasksByArea[task.area]) {
                tasksByArea[task.area] = [];
            }
            tasksByArea[task.area].push(task);
        });

        // Mostrar tareas por área
        Object.entries(tasksByArea).forEach(([area, tasks]) => {
            const areaSection = document.createElement('div');
            areaSection.className = 'cleaning-area-section';
            
            areaSection.innerHTML = `
                <div class="area-header">
                    <h4 style="margin: 0 0 10px 0; color: var(--text-secondary); text-transform: capitalize;">${area}</h4>
                </div>
                <div class="tasks-list">
                    ${tasks.map(task => `
                        <div class="cleaning-task ${task.completada ? 'completed' : ''}">
                            <input type="checkbox" ${task.completada ? 'checked' : ''} 
                                   onchange="dashboardManager.toggleCleaningTask(${task.id}, this.checked)">
                            <div class="task-info">
                                <div class="task-name">${task.task_nombre}</div>
                                <div class="task-details">
                                    <span class="task-duration">${task.duracion_minutos || 0} min</span>
                                    ${task.member_nombre ? `<span class="task-member">• ${task.member_nombre}</span>` : ''}
                                </div>
                            </div>
                        </div>
                    `).join('')}
                </div>
            `;
            
            cleaningContent.appendChild(areaSection);
        });

        // Re-inicializar icons
        if (typeof lucide !== 'undefined') {
            lucide.createIcons();
        }
    }

    updateCalendarSection(calendarData) {
        const calendarGrid = document.getElementById('calendarWeekGrid');
        if (!calendarGrid) return;

        const events = calendarData.events || [];
        const today = new Date();
        
        // Obtener el inicio de la semana actual (lunes)
        const currentWeek = new Date(today);
        const dayOfWeek = today.getDay();
        const diff = today.getDate() - dayOfWeek + (dayOfWeek === 0 ? -6 : 1);
        const monday = new Date(today.setDate(diff));
        
        // Actualizar display de la semana
        const weekDisplay = document.getElementById('calendarWeekDisplay');
        if (weekDisplay) {
            const sunday = new Date(monday);
            sunday.setDate(sunday.getDate() + 6);
            const startStr = monday.toLocaleDateString('es-ES', { day: 'numeric', month: 'short' });
            const endStr = sunday.toLocaleDateString('es-ES', { day: 'numeric', month: 'short', year: 'numeric' });
            weekDisplay.textContent = `${startStr} - ${endStr}`;
        }

        // Limpiar grid
        calendarGrid.innerHTML = '';

        // Crear días de la semana
        const dayNames = ['Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado', 'Domingo'];
        const dayKeys = ['lunes', 'martes', 'miercoles', 'jueves', 'viernes', 'sabado', 'domingo'];

        for (let i = 0; i < 7; i++) {
            const currentDay = new Date(monday);
            currentDay.setDate(monday.getDate() + i);
            const dayKey = dayKeys[i];
            const dayDate = currentDay.toISOString().split('T')[0];
            
            // Crear columna del día
            const dayColumn = document.createElement('div');
            dayColumn.className = 'calendar-day-column';
            
            // Header del día
            const dayHeader = document.createElement('div');
            dayHeader.className = 'calendar-day-header';
            const isToday = dayDate === today.toISOString().split('T')[0];
            dayHeader.innerHTML = `
                ${dayNames[i]}
                ${isToday ? ' 📅' : ''}
            `;
            dayColumn.appendChild(dayHeader);
            
            // Filtrar eventos para este día según el filtro actual
            const dayEvents = events.filter(event => {
                const matchesDay = event.start && event.start.startsWith(dayDate);
                const matchesFilter = this.currentCalendarFilter === 'all' || 
                                  this.getEventType(event) === this.currentCalendarFilter;
                return matchesDay && matchesFilter;
            });
            
            // Renderizar eventos del día
            dayEvents.forEach(event => {
                const eventItem = document.createElement('div');
                eventItem.className = `calendar-event-item ${this.getEventType(event)}`;
                
                const startTime = event.start ? event.start.split('T')[1].substring(0, 5) : '';
                const eventIcon = this.getEventIcon(event);
                
                eventItem.innerHTML = `
                    <div style="font-size: 0.7rem; color: var(--text-muted);">${startTime}</div>
                    <div>${eventIcon} ${event.title}</div>
                `;
                
                dayColumn.appendChild(eventItem);
            });
            
            calendarGrid.appendChild(dayColumn);
        }

        // Configurar navegación y filtros
        this.setupCalendarNavigation(monday);
        this.setupCalendarFilters();
    }

    setupCalendarFilters() {
        const filterButtons = document.querySelectorAll('.filter-btn');
        
        filterButtons.forEach(button => {
            button.addEventListener('click', () => {
                // Actualizar botón activo
                filterButtons.forEach(btn => btn.classList.remove('active'));
                button.classList.add('active');
                
                // Actualizar filtro
                this.currentCalendarFilter = button.dataset.filter;
                
                // Recargar calendario con el nuevo filtro
                this.loadCalendarWeek(this.getCurrentMonday());
            });
        });
    }

    getCurrentMonday() {
        const today = new Date();
        const dayOfWeek = today.getDay();
        const diff = today.getDate() - dayOfWeek + (dayOfWeek === 0 ? -6 : 1);
        return new Date(today.setDate(diff));
    }

    setupCalendarNavigation(currentMonday) {
        const prevBtn = document.getElementById('prevWeekBtn');
        const nextBtn = document.getElementById('nextWeekBtn');
        const todayBtn = document.getElementById('todayWeekBtn');
        
        if (prevBtn) {
            prevBtn.onclick = () => {
                const prevWeek = new Date(currentMonday);
                prevWeek.setDate(prevWeek.getDate() - 7);
                this.loadCalendarWeek(prevWeek);
            };
        }
        
        if (nextBtn) {
            nextBtn.onclick = () => {
                const nextWeek = new Date(currentMonday);
                nextWeek.setDate(nextWeek.getDate() + 7);
                this.loadCalendarWeek(nextWeek);
            };
        }
        
        if (todayBtn) {
            todayBtn.onclick = () => {
                const today = new Date();
                const monday = new Date(today);
                const dayOfWeek = today.getDay();
                const diff = today.getDate() - dayOfWeek + (dayOfWeek === 0 ? -6 : 1);
                monday.setDate(diff);
                this.loadCalendarWeek(monday);
            };
        }
    }

    async loadCalendarWeek(monday) {
        try {
            const sunday = new Date(monday);
            sunday.setDate(sunday.getDate() + 6);
            
            const response = await fetch(`${this.apiBase}/calendar/week?start=${monday.toISOString().split('T')[0]}&end=${sunday.toISOString().split('T')[0]}`);
            const result = await response.json();
            
            if (result.success) {
                this.updateCalendarSection(result.data);
            }
        } catch (error) {
            console.error('Error cargando semana del calendario:', error);
        }
    }

    getEventType(event) {
        // Determinar el tipo de evento basado en el título o fuente
        const title = (event.title || '').toLowerCase();
        const source = (event.source || '').toLowerCase();
        
        if (source.includes('google') || title.includes('reunión') || title.includes('cita') || title.includes('meeting')) {
            return 'google';
        } else if (title.includes('tarea') || title.includes('limpieza') || title.includes('limpiar') || title.includes('cleaning')) {
            return 'tareas';
        } else if (title.includes('menú') || title.includes('comida') || title.includes('cena') || title.includes('almuerzo')) {
            return 'menu';
        } else {
            return 'otros';
        }
    }

    getEventIcon(event) {
        const eventType = this.getEventType(event);
        const icons = {
            'google': '📅',
            'tareas': '🧹',
            'menu': '🍽️',
            'otros': '📌'
        };
        return icons[eventType] || '📌';
    }

    setupEventFilters() {
        const filterButtons = document.querySelectorAll('.filter-btn');
        const eventsContainer = document.querySelector('.events-container');
        
        if (!filterButtons.length || !eventsContainer) return;
        
        filterButtons.forEach(button => {
            button.addEventListener('click', () => {
                // Actualizar botón activo
                filterButtons.forEach(btn => btn.classList.remove('active'));
                button.classList.add('active');
                
                // Filtrar eventos
                const filter = button.dataset.filter;
                const allEvents = eventsContainer.querySelectorAll('.calendar-event');
                
                allEvents.forEach(event => {
                    if (filter === 'all') {
                        event.style.display = 'block';
                    } else {
                        const eventType = event.dataset.eventType;
                        event.style.display = eventType === filter ? 'block' : 'none';
                    }
                });
            });
        });
    }

    updateStatCards(familyData, menuData, cleaningData, calendarData) {
        // Actualizar stat cards con datos reales
        const menuCard = document.querySelector('.stat-card:nth-child(1) .stat-value');
        const shoppingCard = document.querySelector('.stat-card:nth-child(2) .stat-value');
        const cleaningCard = document.querySelector('.stat-card:nth-child(3) .stat-value');
        const eventsCard = document.querySelector('.stat-card:nth-child(4) .stat-value');

        // Menú - Plato principal del día
        if (menuData && menuData.menu_data) {
            try {
                const menuParsed = typeof menuData.menu_data === 'string' 
                    ? JSON.parse(menuData.menu_data) 
                    : menuData.menu_data;
                
                // Obtener el día actual (igual que en updateMenuSection)
                const today = new Date();
                const dayNames = ['domingo', 'lunes', 'martes', 'miercoles', 'jueves', 'viernes', 'sabado'];
                const currentDay = dayNames[today.getDay()];
                
                // Buscar en menu_adultos primero
                let dayMenu = menuParsed.menu_adultos?.[currentDay];
                if (!dayMenu) {
                    dayMenu = menuParsed.menu_ninos?.[currentDay];
                }
                
                if (dayMenu) {
                    // Obtener la primera comida disponible
                    const meals = Object.keys(dayMenu);
                    if (meals.length > 0) {
                        const firstMeal = meals[0];
                        const plateName = dayMenu[firstMeal]?.plato || 'Sin menú';
                        if (menuCard) menuCard.textContent = plateName.split(' ').slice(0, 3).join(' '); // Primeras 3 palabras
                    }
                } else {
                    // Si no hay menú para hoy, mostrar mensaje
                    if (menuCard) menuCard.textContent = 'Sin menú hoy';
                }
            } catch (error) {
                console.error('Error actualizando stat card de menú:', error);
                if (menuCard) menuCard.textContent = 'Error';
            }
        }

        // Compras - Contar items de la lista de compras
        if (menuData && menuData.lista_compra) {
            try {
                let shoppingList = typeof menuData.lista_compra === 'string' 
                    ? JSON.parse(menuData.lista_compra) 
                    : menuData.lista_compra;
                
                let totalItems = 0;
                if (shoppingList && typeof shoppingList === 'object') {
                    // Si es un objeto con categorías
                    Object.values(shoppingList).forEach(category => {
                        if (Array.isArray(category)) {
                            totalItems += category.length;
                        } else if (category.items && Array.isArray(category.items)) {
                            totalItems += category.items.length;
                        }
                    });
                }
                
                if (shoppingCard) shoppingCard.textContent = `${totalItems} items`;
            } catch (error) {
                console.error('Error actualizando stat card de compras:', error);
            }
        }

        // Limpieza - Tareas de hoy completadas/total
        const today = new Date().toISOString().split('T')[0];
        const todayCleaningTasks = cleaningData.filter(task => 
            task.fecha_programada && task.fecha_programada.startsWith(today)
        );
        const completedTasks = todayCleaningTasks.filter(task => task.completada).length;
        if (cleaningCard) cleaningCard.textContent = `${completedTasks}/${todayCleaningTasks.length}`;

        // Eventos - Eventos de hoy
        const todayEvents = calendarData.events ? calendarData.events.filter(event => 
            event.start && event.start.startsWith(today)
        ) : [];
        if (eventsCard) eventsCard.textContent = `${todayEvents.length} hoy`;
    }

    async toggleCleaningTask(taskId, completed) {
        try {
            const response = await fetch(`${this.apiBase}/cleaning/schedule/${taskId}/complete`, {
                method: 'PUT',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    completed: completed,
                    completed_by: 1 // TODO: Obtener ID del usuario actual
                })
            });

            if (response.ok) {
                // Recargar datos de limpieza
                const cleaningData = await this.fetchCleaningSchedule();
                this.updateCleaningSection(cleaningData);
            }
        } catch (error) {
            console.error('Error actualizando tarea:', error);
            this.showError('Error al actualizar tarea');
        }
    }

    getTaskIcon(area) {
        const icons = {
            'cocina': 'utensils',
            'bano': 'bath',
            'salon': 'sofa',
            'dormitorio': 'bed',
            'general': 'home',
            'exterior': 'sun',
            'mascotas': 'heart'
        };
        return icons[area] || 'check-circle';
    }

    getMemberColor(memberName) {
        const colors = {
            'Papá': '#0066FF',
            'Mamá': '#FF6B35',
            'Abuelo': '#9B59B6',
            'María': '#D4AF37',
            'Lucía': '#10B981'
        };
        return colors[memberName] || '#4A90E2';
    }

    getEventColorClass(color) {
        if (color.includes('D4AF37') || color.includes('FFD700')) return 'gold';
        if (color.includes('FF6B35') || color.includes('FFA500')) return 'orange';
        return '';
    }

    showError(message) {
        // Implementar notificación de error
        console.error(message);
        // TODO: Mostrar toast o notificación visual
    }

    updateCurrentDate() {
        const now = new Date();
        const options = { weekday: 'long', day: 'numeric', month: 'long' };
        const formattedDate = now.toLocaleDateString('es-ES', options);
        
        const dateElement = document.getElementById('currentDate');
        if (dateElement) {
            const capitalized = formattedDate.charAt(0).toUpperCase() + formattedDate.slice(1);
            dateElement.textContent = capitalized;
        }
        
        const currentDayName = this.daysOfWeek[now.getDay()];
        this.updateDayDisplays(currentDayName);
    }

    updateDayDisplays(dayName) {
        const elements = ['menuCurrentDay', 'cleaningCurrentDay', 'calendarCurrentDay'];
        elements.forEach(id => {
            const element = document.getElementById(id);
            if (element) {
                element.textContent = dayName;
            }
        });
    }

    setupEventListeners() {
        window.dashboardManager = this;
    }

    setupDayTabs() {
        const menuTabs = document.querySelectorAll('#dashboard .day-tab');
        menuTabs.forEach(tab => {
            tab.addEventListener('click', (e) => {
                const parent = e.target.closest('.dashboard-card, .calendar-section');
                if (parent) {
                    parent.querySelectorAll('.day-tab').forEach(t => t.classList.remove('active'));
                    e.target.classList.add('active');
                }
            });
        });
    }

    updateShoppingListSection(menuData) {
        const shoppingContent = document.querySelector('.shopping-list-content');
        if (!shoppingContent) return;

        if (!menuData || !menuData.lista_compra) {
            shoppingContent.innerHTML = '<p style="text-align: center; color: var(--text-secondary);">No hay lista de compras disponible</p>';
            return;
        }

        // Parsear lista de compras
        let shoppingList;
        try {
            shoppingList = typeof menuData.lista_compra === 'string' 
                ? JSON.parse(menuData.lista_compra) 
                : menuData.lista_compra;
        } catch (error) {
            console.error('Error parseando shopping list:', error);
            shoppingContent.innerHTML = '<p style="text-align: center; color: var(--text-secondary);">Error cargando lista de compras</p>';
            return;
        }

        console.log('🛒 Shopping list parsed:', shoppingList);

        shoppingContent.innerHTML = '';
        
        if (!shoppingList || typeof shoppingList !== 'object') {
            shoppingContent.innerHTML = '<p style="text-align: center; color: var(--text-secondary);">Lista de compras vacía</p>';
            return;
        }
        
        // Procesar diferentes formatos de lista de compras
        let totalItems = 0;
        
        Object.entries(shoppingList).forEach(([categoryName, categoryData]) => {
            const categoryElement = document.createElement('div');
            categoryElement.className = 'shopping-category';
            
            let items = [];
            let completedItems = 0;
            
            if (Array.isArray(categoryData)) {
                // Formato simple: array de strings
                items = categoryData.map(item => ({
                    item: typeof item === 'string' ? item : item.item || item,
                    completed: false,
                    quantity: ''
                }));
            } else if (categoryData.items && Array.isArray(categoryData.items)) {
                // Formato con objeto items
                items = categoryData.items.map(item => ({
                    item: item.item || item,
                    completed: item.completed || false,
                    quantity: item.quantity || ''
                }));
            }
            
            completedItems = items.filter(item => item.completed).length;
            totalItems += items.length;
            
            if (items.length === 0) return; // Skip categorías vacías
            
            categoryElement.innerHTML = `
                <div class="category-header">
                    <span class="category-title">${categoryName} (${completedItems}/${items.length})</span>
                    <i data-lucide="chevron-down"></i>
                </div>
                <div class="category-items">
                    ${items.map(item => `
                        <div class="shopping-item ${item.completed ? 'completed' : ''}">
                            <input type="checkbox" ${item.completed ? 'checked' : ''} 
                                   onchange="dashboardManager.toggleShoppingItem('${categoryName}', '${item.item}', this.checked)">
                            <span>${item.item}${item.quantity ? ` (${item.quantity})` : ''}</span>
                        </div>
                    `).join('')}
                </div>
            `;
            
            shoppingContent.appendChild(categoryElement);
        });

        if (totalItems === 0) {
            shoppingContent.innerHTML = '<p style="text-align: center; color: var(--text-secondary);">Lista de compras vacía</p>';
            return;
        }

        // Actualizar progress bar
        this.updateShoppingProgressFromData(shoppingList);

        // Setup event listeners para categorías
        this.setupShoppingList();

        // Re-inicializar icons
        if (typeof lucide !== 'undefined') {
            lucide.createIcons();
        }
    }

    updateShoppingProgressFromData(shoppingList) {
        let totalItems = 0;
        let completedItems = 0;
        
        // Manejar diferentes formatos de shoppingList
        if (Array.isArray(shoppingList)) {
            // Formato antiguo: array de categorías
            totalItems = shoppingList.reduce((sum, category) => sum + category.items.length, 0);
            completedItems = shoppingList.reduce((sum, category) => 
                sum + category.items.filter(item => item.completed).length, 0);
        } else if (shoppingList && typeof shoppingList === 'object') {
            // Formato nuevo: objeto con categorías
            Object.values(shoppingList).forEach(category => {
                if (Array.isArray(category)) {
                    // Array simple de items
                    totalItems += category.length;
                    completedItems += category.filter(item => item.completed).length;
                } else if (category.items && Array.isArray(category.items)) {
                    // Objeto con propiedad items
                    totalItems += category.items.length;
                    completedItems += category.items.filter(item => item.completed).length;
                }
            });
        }
        
        const percentage = totalItems > 0 ? Math.round((completedItems / totalItems) * 100) : 0;

        const progressText = document.querySelector('.shopping-list-content .progress-text');
        const progressPercent = document.querySelector('.shopping-list-content .progress-percent');
        const progressBar = document.querySelector('.shopping-list-content .progress-fill');

        if (progressText) progressText.textContent = `${completedItems} de ${totalItems}`;
        if (progressPercent) progressPercent.textContent = `${percentage}%`;
        if (progressBar) progressBar.style.width = `${percentage}%`;
    }

    async toggleShoppingItem(category, item, completed) {
        try {
            // TODO: Implementar API para actualizar items de la lista de compras
            console.log(`Toggle shopping item: ${category} - ${item} = ${completed}`);
            
            // Por ahora, solo actualizar visualmente
            const shoppingData = await this.fetchCurrentMenu();
            if (shoppingData) {
                this.updateShoppingListSection(shoppingData);
            }
        } catch (error) {
            console.error('Error actualizando item de compra:', error);
            this.showError('Error al actualizar item de compra');
        }
    }

    setupShoppingList() {
        const categoryHeaders = document.querySelectorAll('.category-header');
        categoryHeaders.forEach(header => {
            header.addEventListener('click', (e) => {
                const category = e.target.closest('.shopping-category');
                const items = category.querySelector('.category-items');
                const icon = category.querySelector('.category-header i[data-lucide]');
                
                if (items.style.display === 'none') {
                    items.style.display = 'block';
                    if (icon) icon.setAttribute('data-lucide', 'chevron-down');
                } else {
                    items.style.display = 'none';
                    if (icon) icon.setAttribute('data-lucide', 'chevron-right');
                }
                
                if (typeof lucide !== 'undefined') {
                    lucide.createIcons();
                }
            });
        });
    }

    updateShoppingProgress() {
        const checkboxes = document.querySelectorAll('.shopping-item input[type="checkbox"]');
        const checked = document.querySelectorAll('.shopping-item input[type="checkbox"]:checked');
        const total = checkboxes.length;
        const completed = checked.length;
        const percentage = total > 0 ? Math.round((completed / total) * 100) : 0;

        const progressText = document.querySelector('.shopping-list-content .progress-text');
        const progressPercent = document.querySelector('.shopping-list-content .progress-percent');
        const progressBar = document.querySelector('.shopping-list-content .progress-fill');

        if (progressText) progressText.textContent = `${completed} de ${total}`;
        if (progressPercent) progressPercent.textContent = `${percentage}%`;
        if (progressBar) progressBar.style.width = `${percentage}%`;
    }

    updateCleaningProgress(tasks = null) {
        if (!tasks) {
            const checkboxes = document.querySelectorAll('.cleaning-task input[type="checkbox"]');
            const checked = document.querySelectorAll('.cleaning-task input[type="checkbox"]:checked');
            const total = checkboxes.length;
            const completed = checked.length;
            const percentage = total > 0 ? Math.round((completed / total) * 100) : 0;

            const progressText = document.querySelector('.cleaning-tasks-content .progress-text');
            const progressPercent = document.querySelector('.cleaning-tasks-content .progress-percent');
            const progressBar = document.querySelector('.cleaning-tasks-content .progress-fill');

            if (progressText) progressText.textContent = `${completed} de ${total}`;
            if (progressPercent) progressPercent.textContent = `${percentage}%`;
            if (progressBar) progressBar.style.width = `${percentage}%`;
        } else {
            const completed = tasks.filter(task => task.completada).length;
            const total = tasks.length;
            const percentage = total > 0 ? Math.round((completed / total) * 100) : 0;

            const progressText = document.querySelector('.cleaning-tasks-content .progress-text');
            const progressPercent = document.querySelector('.cleaning-tasks-content .progress-percent');
            const progressBar = document.querySelector('.cleaning-tasks-content .progress-fill');

            if (progressText) progressText.textContent = `${completed} de ${total}`;
            if (progressPercent) progressPercent.textContent = `${percentage}%`;
            if (progressBar) progressBar.style.width = `${percentage}%`;
        }
    }

    // Navigation methods
    previousMenuDay() {
        this.currentMenuDay = (this.currentMenuDay - 1 + 7) % 7;
        this.updateMenuDay();
    }

    nextMenuDay() {
        this.currentMenuDay = (this.currentMenuDay + 1) % 7;
        this.updateMenuDay();
    }

    previousCalendarDay() {
        this.currentCalendarDay = (this.currentCalendarDay - 1 + 7) % 7;
        this.updateCalendarDay();
    }

    nextCalendarDay() {
        this.currentCalendarDay = (this.currentCalendarDay + 1) % 7;
        this.updateCalendarDay();
    }

    updateMenuDay() {
        const dayName = this.daysOfWeek[this.currentMenuDay];
        const menuCurrentDay = document.getElementById('menuCurrentDay');
        if (menuCurrentDay) {
            menuCurrentDay.textContent = dayName;
        }
        
        const menuCard = document.querySelector('.dashboard-card');
        if (menuCard) {
            const tabs = menuCard.querySelectorAll('.day-tab');
            tabs.forEach(tab => tab.classList.remove('active'));
            const activeTab = menuCard.querySelector(`.day-tab[data-day="${this.getDayShort(this.currentMenuDay)}"]`);
            if (activeTab) activeTab.classList.add('active');
        }
        
        // Recargar menú para el nuevo día
        this.fetchCurrentMenu().then(menuData => {
            this.updateMenuSection(menuData);
        });
    }

    updateCalendarDay() {
        const dayName = this.daysOfWeek[this.currentCalendarDay];
        const calendarCurrentDay = document.getElementById('calendarCurrentDay');
        if (calendarCurrentDay) {
            calendarCurrentDay.textContent = dayName;
        }
        
        const calendarSection = document.querySelector('.calendar-section');
        if (calendarSection) {
            const tabs = calendarSection.querySelectorAll('.day-tab');
            tabs.forEach(tab => tab.classList.remove('active'));
            const activeTab = calendarSection.querySelector(`.day-tab[data-day="${this.getDayShort(this.currentCalendarDay)}"]`);
            if (activeTab) activeTab.classList.add('active');
        }
        
        // Recargar eventos para el nuevo día
        this.fetchCalendarEvents().then(calendarData => {
            this.updateCalendarSection(calendarData);
        });
    }

    getDayShort(dayIndex) {
        const shorts = ['dom', 'lun', 'mar', 'mie', 'jue', 'vie', 'sab'];
        return shorts[dayIndex];
    }
}

// Initialize dashboard when DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
    new DashboardManager();
});
