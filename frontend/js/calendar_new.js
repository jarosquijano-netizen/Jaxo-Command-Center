class CalendarManager {
    constructor() {
        console.log('[cal] CalendarManager constructor');
        this.currentWeek = null;
        this.events = [];
        // No inicializar aquí, esperar a init()
    }

    async init() {
        console.log('[cal] CalendarManager init - START');
        this.setupEventListeners();
        await this.loadWeek();
        console.log('[cal] CalendarManager init - END');
    }

    setupEventListeners() {
        console.log('[cal] Setting up event listeners');
        const prevBtn = document.getElementById('prevWeek');
        const nextBtn = document.getElementById('nextWeek');
        const todayBtn = document.getElementById('todayWeek');
        
        console.log('[cal] prevWeek:', prevBtn);
        console.log('[cal] nextWeek:', nextBtn);
        console.log('[cal] todayWeek:', todayBtn);
        
        if (prevBtn) prevBtn.addEventListener('click', () => this.navigateWeek(-1));
        if (nextBtn) nextBtn.addEventListener('click', () => this.navigateWeek(1));
        if (todayBtn) todayBtn.addEventListener('click', () => this.goToToday());
    }

    async loadWeek(weekStart = null) {
        console.log('[cal] loadWeek called with:', weekStart);
        try {
            const url = weekStart ? `/api/calendar/week?week=${weekStart}` : '/api/calendar/week';
            console.log('[cal] Fetching URL:', url);
            const response = await api.get(url);
            console.log('[cal] Calendar response:', response);
            
            if (!response.success) {
                throw new Error(response.message || 'Error cargando calendario');
            }
            
            this.currentWeek = new Date(response.data.week_start);
            this.events = response.data.events || [];
            console.log('[cal] Events loaded:', this.events);
            this.renderWeek();
            this.updateWeekDisplay();
        } catch (error) {
            console.error('[cal] Error cargando calendario:', error);
            this.showError(error.message);
        }
    }

    renderWeek() {
        console.log('[cal] renderWeek called');
        const container = document.getElementById('eventsContainer');
        console.log('[cal] eventsContainer:', container);
        
        if (!container) {
            console.error('[err] #eventsContainer no encontrado');
            return;
        }

        // FORZAR que la sección calendario sea visible con estilos agresivos
        const calendarSection = document.getElementById('calendar');
        if (calendarSection) {
            console.log('[cal] Forzando visibilidad de la sección calendario');
            calendarSection.style.display = 'block !important';
            calendarSection.style.visibility = 'visible !important';
            calendarSection.style.opacity = '1 !important';
            calendarSection.style.position = 'relative !important';
            calendarSection.style.zIndex = '9999 !important';
            calendarSection.style.height = 'auto !important';
            calendarSection.style.minHeight = '500px !important';
            calendarSection.style.overflow = 'visible !important';
            
            // También forzar el contenedor principal
            const moduleContent = calendarSection.querySelector('.module-content');
            if (moduleContent) {
                moduleContent.style.display = 'block !important';
                moduleContent.style.height = 'auto !important';
                moduleContent.style.overflow = 'visible !important';
            }
        }

        if (this.events.length === 0) {
            container.innerHTML = '<div class="no-events">No hay eventos esta semana</div>';
            return;
        }

        const sortedEvents = [...this.events].sort((a, b) => new Date(a.start) - new Date(b.start));
        console.log('[cal] Sorted events:', sortedEvents);
        
        const html = sortedEvents.map(event => {
            const start = new Date(event.start);
            const end = new Date(event.end);
            const timeStr = start.toLocaleString('es-ES', { 
                weekday: 'short', 
                day: '2-digit', 
                month: '2-digit',
                hour: '2-digit',
                minute: '2-digit'
            }) + ' - ' + end.toLocaleTimeString('es-ES', { hour: '2-digit', minute: '2-digit' });
            
            const colorClass = `event-${event.source || 'google'}`;
            const title = event.title || '(sin título)';
            
            return `
                <div class="event-card" style="background: white !important; border: 1px solid #ccc !important; padding: 12px !important; margin: 8px 0 !important; border-radius: 8px !important;">
                    <div class="event-color ${colorClass}" style="width: 12px; height: 12px; background: ${event.color || '#4285F4'}; border-radius: 3px; display: inline-block; margin-right: 8px;"></div>
                    <div class="event-details" style="display: inline-block;">
                        <div class="event-title" style="font-weight: 600; color: #333;">${title}</div>
                        <div class="event-time" style="font-size: 0.875rem; color: #666;">${timeStr}</div>
                    </div>
                </div>
            `;
        }).join('');
        
        console.log('[cal] Setting HTML to container');
        container.innerHTML = html;
        console.log('[cal] renderWeek completed');
    }

    updateWeekDisplay() {
        if (!this.currentWeek) return;
        const start = new Date(this.currentWeek);
        const end = new Date(start);
        end.setDate(end.getDate() + 6);
        const options = { day: '2-digit', month: 'short' };
        const txt = `${start.toLocaleDateString('es-ES', options)} - ${end.toLocaleDateString('es-ES', options)}`;
        const display = document.getElementById('weekDisplay');
        console.log('[cal] Updating week display to:', txt);
        if (display) display.textContent = txt;
    }

    navigateWeek(direction) {
        console.log('[cal] navigateWeek:', direction);
        if (!this.currentWeek) return;
        const newWeek = new Date(this.currentWeek);
        newWeek.setDate(newWeek.getDate() + (direction * 7));
        this.loadWeek(newWeek.toISOString().split('T')[0]);
    }

    goToToday() {
        console.log('[cal] goToToday');
        this.loadWeek();
    }

    showError(message) {
        console.log('[cal] showError:', message);
        const container = document.getElementById('eventsContainer');
        if (container) {
            container.innerHTML = `
                <div class="no-events">
                    Error: ${message}<br>
                    Asegúrate de que el backend esté corriendo
                </div>
            `;
        }
    }
}

// Crear instancia global SIN inicializar automáticamente
console.log('[cal] Creating calendarManager instance');
const calendarManager = new CalendarManager();
