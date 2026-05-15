class CalendarManager {
    constructor() {
        this.currentWeek = null;
        this.events = [];
        this.currentFilter = 'all';
        this.init();
    }

    async init() {
        console.log('[cal] CalendarManager init');
        // Verificar que la sección calendario existe
        const calendarSection = document.getElementById('calendar');
        const calendarGrid = document.getElementById('calendarGrid');
        console.log('[cal] calendarSection:', calendarSection);
        console.log('[cal] calendarGrid:', calendarGrid);
        if (!calendarSection) {
            console.error('[err] Sección #calendar no encontrada en el DOM');
            return;
        }
        if (!calendarGrid) {
            console.error('[err] Contenedor #calendarGrid no encontrado en el DOM');
            return;
        }

        // Verificar si la sección está activa (clase 'active')
        console.log('[cal] calendarSection.classList:', calendarSection.classList);
        console.log('[cal] calendarSection computed display:', getComputedStyle(calendarSection).display);
        console.log('[cal] calendarSection offsetParent:', calendarSection.offsetParent);
        console.log('[cal] calendarSection offsetWidth:', calendarSection.offsetWidth);
        console.log('[cal] calendarSection offsetHeight:', calendarSection.offsetHeight);

        // NO forzar visibilidad aquí, solo configurar listeners
        this.setupEventListeners();
        await this.loadCurrentWeek();
    }

    setupEventListeners() {
        // Navigation buttons
        document.getElementById('prevWeek')?.addEventListener('click', () => this.navigateWeek(-1));
        document.getElementById('nextWeek')?.addEventListener('click', () => this.navigateWeek(1));
        document.getElementById('todayWeek')?.addEventListener('click', () => this.goToToday());

        // Sync button
        document.getElementById('syncCalendarBtn')?.addEventListener('click', () => this.syncGoogleCalendar());

        // Add event button
        document.getElementById('addEventBtn')?.addEventListener('click', () => this.addEvent());

        // Filter buttons
        document.querySelectorAll('.filter-btn').forEach(btn => {
            btn.addEventListener('click', () => {
                this.setFilter(btn.dataset.filter);
            });
        });

        // Listener para cuando se activa la sección calendario
        const calendarLink = document.querySelector('a[href="#calendar"]');
        if (calendarLink) {
            calendarLink.addEventListener('click', () => {
                setTimeout(() => {
                    console.log('[cal] Sección calendario activada, recargando eventos');
                    this.loadCurrentWeek();
                }, 100);
            });
        }
    }

    async loadCurrentWeek(weekStart = null) {
        try {
            const url = weekStart ? `/api/calendar/week?week=${weekStart}` : '/api/calendar/week';
            const response = await api.get(url);
            console.log('[cal] Calendar response:', response);
            if (!response.success) {
                console.error('[err] Error cargando calendario:', response.message);
                this.showError(response.message || 'Error cargando calendario');
                return;
            }
            const data = response.data;
            this.currentWeek = new Date(data.week_start);
            this.events = data.events || [];
            console.log('[cal] Events loaded:', this.events);
            this.renderWeek();
            this.updateWeekDisplay();
        } catch (e) {
            console.error('[err] Error cargando calendario:', e);
            this.showError('Error cargando calendario');
        }
    }

    showError(message) {
        // Simple inline error display below week navigation
        const container = document.querySelector('.module-content');
        if (!container) return;
        let errEl = container.querySelector('.calendar-error');
        if (!errEl) {
            errEl = document.createElement('div');
            errEl.className = 'calendar-error';
            errEl.style.cssText = `
                color: var(--error, #ef4444);
                background: var(--bg-secondary);
                padding: var(--spacing-sm);
                border-radius: var(--radius-sm);
                margin-bottom: var(--spacing-md);
                text-align: center;
                font-size: 0.875rem;
            `;
            container.insertBefore(errEl, container.firstChild);
        }
        errEl.textContent = message;
    }

    navigateWeek(direction) {
        if (!this.currentWeek) return;
        const newWeek = new Date(this.currentWeek);
        newWeek.setDate(newWeek.getDate() + (direction * 7));
        this.loadCurrentWeek(newWeek.toISOString().split('T')[0]);
    }

    goToToday() {
        this.loadCurrentWeek();
    }

    updateWeekDisplay() {
        const weekDisplay = document.getElementById('weekDisplay');
        if (weekDisplay && this.currentWeek) {
            const start = new Date(this.currentWeek);
            const end = new Date(start);
            end.setDate(end.getDate() + 6);
            const options = { day: '2-digit', month: 'short' };
            const txt = `${start.toLocaleDateString('es-ES', options)} - ${end.toLocaleDateString('es-ES', options)}`;
            weekDisplay.textContent = txt;
        }
    }

    renderWeek() {
        const container = document.getElementById('calendarGrid');
        if (!container) {
            console.error('[err] #calendarGrid no encontrado');
            return;
        }

        console.log('[cal] Renderizando calendario con eventos:', this.events);

        // Remove any existing error message
        const errEl = container.parentElement?.querySelector('.calendar-error');
        if (errEl) errEl.remove();

        // Filtrar eventos según el filtro actual
        const filteredEvents = this.filterEvents(this.events);

        // Renderizado mejorado con estructura de calendario
        let html = '<div class="calendar-week-view">';
        
        // Header con días de la semana
        const days = ['Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado', 'Domingo'];
        html += '<div class="calendar-header">';
        days.forEach(day => {
            html += `<div class="calendar-day-header">${day}</div>`;
        });
        html += '</div>';

        // Agrupar eventos por día
        const eventsByDay = {};
        if (this.currentWeek) {
            for (let i = 0; i < 7; i++) {
                const date = new Date(this.currentWeek);
                date.setDate(date.getDate() + i);
                const dateKey = date.toISOString().split('T')[0];
                eventsByDay[dateKey] = [];
            }
        }

        filteredEvents.forEach(event => {
            const eventDate = new Date(event.start).toISOString().split('T')[0];
            if (eventsByDay[eventDate]) {
                eventsByDay[eventDate].push(event);
            }
        });

        // Renderizar eventos por día
        html += '<div class="calendar-days">';
        Object.keys(eventsByDay).forEach(dateKey => {
            const dayEvents = eventsByDay[dateKey];
            const date = new Date(dateKey);
            const dayName = date.toLocaleDateString('es-ES', { weekday: 'short', day: 'numeric' });
            
            html += `<div class="calendar-day">`;
            html += `<div class="calendar-date">${dayName}</div>`;
            
            if (dayEvents.length > 0) {
                html += '<div class="calendar-events">';
                dayEvents.forEach(event => {
                    const time = new Date(event.start).toLocaleTimeString('es-ES', { hour: '2-digit', minute: '2-digit' });
                    const title = event.title || '(sin título)';
                    const source = event.source || 'unknown';
                    const color = event.color || '#666';
                    
                    const subtitle = event.subtitle ? `<span class="event-subtitle">${event.subtitle}</span>` : '';
                    html += `<div class="calendar-event-item" style="border-left: 3px solid ${color}; background: ${color}20;">
                        <span class="event-time">${time}</span>
                        <span class="event-title">${title}</span>
                        ${subtitle}
                        <span class="event-source" style="color: ${color}">${this.getSourceLabel(source)}</span>
                    </div>`;
                });
                html += '</div>';
            } else {
                html += '<div class="calendar-events empty">Sin eventos</div>';
            }
            
            html += '</div>';
        });
        html += '</div>';
        html += '</div>';

        container.innerHTML = html;
        console.log('[cal] Calendario renderizado con estructura semanal');
    }

    renderEvent(event) {
        const minutes = new Date(event.start).getMinutes();
        const top = (minutes / 60) * 60; // 60px per hour slot
        const duration = (new Date(event.end) - new Date(event.start)) / (1000 * 60);
        const height = Math.max(20, (duration / 60) * 60); // min 20px height
        const title = event.title || '(sin título)';
        const sourceClass = event.source || 'google';
        const tooltip = this.buildTooltip(event);
        return `<div class="calendar-event ${sourceClass}" style="top:${top}px;height:${height}px;" title="${tooltip}">${title}</div>`;
    }

    buildTooltip(event) {
        const start = new Date(event.start).toLocaleString('es-ES', { weekday: 'short', day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' });
        const end = new Date(event.end).toLocaleString('es-ES', { hour: '2-digit', minute: '2-digit' });
        const location = event.location ? `\nUbicación: ${event.location}` : '';
        const assigned = event.assigned_to ? `\nAsignado: ${event.assigned_to}` : '';
        const area = event.area ? `\nÁrea: ${event.area}` : '';
        const description = event.description ? `\n${event.description}` : '';
        return `${event.title}\n${start} - ${end}${location}${assigned}${area}${description}`;
    }

    getEventsForSlot(date, hour) {
        const slotStart = new Date(date);
        slotStart.setHours(hour, 0, 0, 0);
        const slotEnd = new Date(slotStart);
        slotEnd.setHours(hour + 1, 0, 0, 0);
        return this.events.filter(ev => {
            const evStart = new Date(ev.start);
            const evEnd = new Date(ev.end);
            return evStart < slotEnd && evEnd > slotStart;
        });
    }

    isSameDay(d1, d2) {
        return d1.getFullYear() === d2.getFullYear() &&
               d1.getMonth() === d2.getMonth() &&
               d1.getDate() === d2.getDate();
    }

    async syncGoogleCalendar() {
        const syncBtn = document.getElementById('syncCalendarBtn');
        const originalHTML = syncBtn ? syncBtn.innerHTML : '';
        try {
            console.log('[cal] Verificando estado de Google Calendar...');
            if (syncBtn) { syncBtn.textContent = 'Verificando...'; syncBtn.disabled = true; }

            // 1. Check auth status
            const statusResp = await api.get('/api/google/auth/status');
            const connected = statusResp.success && statusResp.data && statusResp.data.connected;

            if (!connected) {
                // 2. Start OAuth flow
                if (syncBtn) syncBtn.textContent = 'Abriendo autorización...';
                const startResp = await api.get('/api/google/auth/start');
                if (!startResp.success || !startResp.data?.auth_url) {
                    this.showError(startResp.message || 'Error: configura Google Credentials en Configuración primero');
                    return;
                }
                // Open OAuth in a new tab
                window.open(startResp.data.auth_url, '_blank');
                this.showInfo('Autoriza en la ventana de Google y vuelve aquí. Luego pulsa Sincronizar de nuevo.');
                return;
            }

            // 3. Already connected — import events
            if (syncBtn) { syncBtn.textContent = 'Sincronizando...'; }
            const weekStart = this.currentWeek ? this.currentWeek.toISOString().split('T')[0] : null;
            const weekEnd = this.currentWeek
                ? new Date(this.currentWeek.getTime() + 6 * 24 * 60 * 60 * 1000).toISOString().split('T')[0]
                : null;

            const importResp = await api.post('/api/google/import', { from: weekStart, to: weekEnd });
            if (importResp.success) {
                const d = importResp.data;
                this.showSuccess(`Sincronización completada: ${d.created} nuevos, ${d.updated} actualizados`);
                await this.loadCurrentWeek();
            } else {
                this.showError('Error sincronizando: ' + (importResp.message || 'desconocido'));
            }
        } catch (error) {
            console.error('[err] Error sincronizando Google Calendar:', error);
            this.showError('Error sincronizando Google Calendar');
        } finally {
            if (syncBtn) { syncBtn.innerHTML = originalHTML || '<span class="material-symbols-outlined">sync</span> Sincronizar'; syncBtn.disabled = false; }
        }
    }

    addEvent() {
        // TODO: Implementar formulario para añadir eventos
        this.showInfo('Función para añadir eventos próximamente');
    }

    showSuccess(message) {
        this.showMessage(message, 'success');
    }

    showError(message) {
        this.showMessage(message, 'error');
    }

    showInfo(message) {
        this.showMessage(message, 'info');
    }

    showMessage(message, type = 'info') {
        const container = document.getElementById('calendarGrid');
        if (!container) return;

        const colors = {
            success: '#34A853',
            error: '#EA4335',
            info: '#4285F4'
        };

        const messageEl = document.createElement('div');
        messageEl.style.cssText = `
            background: ${colors[type]};
            color: white;
            padding: 12px;
            border-radius: 8px;
            margin-bottom: 16px;
            text-align: center;
            font-size: 0.875rem;
        `;
        messageEl.textContent = message;

        container.insertBefore(messageEl, container.firstChild);

        // Auto-remover después de 3 segundos
        setTimeout(() => {
            if (messageEl.parentNode) {
                messageEl.remove();
            }
        }, 3000);
    }

    getSourceLabel(source) {
        const labels = {
            'google': 'Google',
            'cleaning': 'Limpieza',
            'menu': 'Menú',
            'unknown': 'Evento'
        };
        return labels[source] || labels.unknown;
    }

    setFilter(filter) {
        this.currentFilter = filter;
        
        // Actualizar botones activos
        document.querySelectorAll('.filter-btn').forEach(btn => {
            btn.classList.remove('active');
        });
        document.querySelector(`[data-filter="${filter}"]`).classList.add('active');
        
        // Re-renderizar con el filtro aplicado
        this.renderWeek();
        
        console.log(`[cal] Filtro aplicado: ${filter}`);
    }

    filterEvents(events) {
        if (this.currentFilter === 'all') {
            return events;
        }
        
        return events.filter(event => event.source === this.currentFilter);
    }
}

// Instancia global
const calendarManager = new CalendarManager();
