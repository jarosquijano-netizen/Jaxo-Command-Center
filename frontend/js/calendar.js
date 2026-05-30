class CalendarManager {
    constructor() {
        this.currentWeek = null;
        this.events = [];
        this.currentFilter = 'all';
        this.init();
    }

    async init() {
        const calendarSection = document.getElementById('calendar');
        if (!calendarSection) return;
        this.setupEventListeners();
        await this.loadCurrentWeek();
    }

    setupEventListeners() {
        document.getElementById('prevWeek')?.addEventListener('click', () => this.navigateWeek(-1));
        document.getElementById('nextWeek')?.addEventListener('click', () => this.navigateWeek(1));
        document.getElementById('todayWeek')?.addEventListener('click', () => this.goToToday());
        document.getElementById('syncCalendarBtn')?.addEventListener('click', () => this.syncGoogleCalendar());
        document.getElementById('addEventBtn')?.addEventListener('click', () => this.addEvent());

        document.querySelectorAll('.ca-filter-btn').forEach(btn => {
            btn.addEventListener('click', () => this.setFilter(btn.dataset.filter));
        });

        const calendarLink = document.querySelector('a[href="#calendar"]');
        if (calendarLink) {
            calendarLink.addEventListener('click', () => {
                setTimeout(() => this.loadCurrentWeek(), 100);
            });
        }
    }

    async loadCurrentWeek(weekStart = null) {
        try {
            const url = weekStart ? `/api/calendar/week?week=${weekStart}` : '/api/calendar/week';
            const response = await api.get(url);
            if (!response.success) {
                this.showMessage(response.message || 'Error cargando calendario', 'error');
                return;
            }
            const data = response.data;
            // Append T12:00:00 to avoid UTC midnight → previous-day shift in UTC+ zones
            this.currentWeek = new Date(data.week_start + 'T12:00:00');
            this.events = data.events || [];
            this.renderWeek();
            this.updateWeekDisplay();
        } catch (e) {
            console.error('[cal] Error:', e);
            this.showMessage('Error cargando calendario', 'error');
        }
    }

    navigateWeek(direction) {
        if (!this.currentWeek) return;
        const newWeek = new Date(this.currentWeek);
        newWeek.setDate(newWeek.getDate() + direction * 7);
        const iso = `${newWeek.getFullYear()}-${String(newWeek.getMonth()+1).padStart(2,'0')}-${String(newWeek.getDate()).padStart(2,'0')}`;
        this.loadCurrentWeek(iso);
    }

    goToToday() { this.loadCurrentWeek(); }

    updateWeekDisplay() {
        const el = document.getElementById('weekDisplay');
        if (!el || !this.currentWeek) return;
        const start = new Date(this.currentWeek);
        const end = new Date(start);
        end.setDate(end.getDate() + 6);
        const fmt = d => d.toLocaleDateString('es-ES', { day: 'numeric', month: 'short' });
        el.textContent = `${fmt(start)} — ${fmt(end)}`;
    }

    renderWeek() {
        const container = document.getElementById('calendarGrid');
        if (!container) return;

        const filtered = this.filterEvents(this.events);
        const today = new Date();
        const todayKey = `${today.getFullYear()}-${String(today.getMonth()+1).padStart(2,'0')}-${String(today.getDate()).padStart(2,'0')}`;

        // Build day map
        const dayNames = ['Lunes','Martes','Miércoles','Jueves','Viernes','Sábado','Domingo'];
        const days = [];
        for (let i = 0; i < 7; i++) {
            const d = new Date(this.currentWeek);
            d.setDate(d.getDate() + i);
            const key = `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`;
            days.push({ name: dayNames[i], num: d.getDate(), key, isToday: key === todayKey, events: [] });
        }

        filtered.forEach(ev => {
            const evDate = new Date(ev.start);
            const evKey = `${evDate.getFullYear()}-${String(evDate.getMonth()+1).padStart(2,'0')}-${String(evDate.getDate()).padStart(2,'0')}`;
            const day = days.find(d => d.key === evKey);
            if (day) day.events.push(ev);
        });

        // Update status bar
        this.updateStatusBar(days, todayKey);

        // Render grid
        const gridHTML = `<div class="ca-grid">${days.map(day => this.renderDayCol(day)).join('')}</div>`;
        container.innerHTML = gridHTML;
    }

    updateStatusBar(days, todayKey) {
        const allEvents = days.flatMap(d => d.events);
        const todayEvents = days.find(d => d.key === todayKey)?.events || [];
        const total = allEvents.length;

        // Next upcoming event from now
        const now = new Date();
        const upcoming = allEvents
            .filter(ev => new Date(ev.start) > now)
            .sort((a, b) => new Date(a.start) - new Date(b.start))[0];

        // Progress: use cleaning events completion as proxy (all are "pending" since no completion data)
        const pct = total > 0 ? Math.min(100, Math.round((total / Math.max(total, 20)) * 100)) : 0;
        const circ = 175.93;
        const offset = circ * (1 - pct / 100);

        const ringFill = document.getElementById('caRingFill');
        if (ringFill) ringFill.setAttribute('stroke-dashoffset', offset.toFixed(2));

        const ringPct = document.getElementById('caRingPct');
        if (ringPct) ringPct.textContent = pct + '%';

        const progressTitle = document.getElementById('caProgressTitle');
        if (progressTitle) {
            progressTitle.textContent = pct >= 80 ? 'Excelente semana' : pct >= 50 ? 'Buen progreso' : 'En marcha';
        }

        const statTotal = document.getElementById('caStatTotal');
        if (statTotal) statTotal.textContent = `Total: ${total} evento${total !== 1 ? 's' : ''}`;

        const statToday = document.getElementById('caStatToday');
        if (statToday) statToday.textContent = `Hoy: ${todayEvents.length} evento${todayEvents.length !== 1 ? 's' : ''}`;

        const statFlag = document.getElementById('caStatTodayFlag');
        if (statFlag) statFlag.textContent = todayEvents.length > 0 ? '!' : '';

        const nextEl = document.getElementById('caNextEvent');
        if (nextEl) {
            if (upcoming) {
                const time = new Date(upcoming.start).toLocaleTimeString('es-ES', { hour: '2-digit', minute: '2-digit' });
                nextEl.textContent = `${upcoming.title} (${time})`;
            } else {
                nextEl.textContent = 'Sin próximos eventos';
            }
        }
    }

    renderDayCol(day) {
        const headClass = day.isToday ? 'ca-day-head today' : 'ca-day-head';
        const eventsHTML = day.events.length > 0
            ? day.events.map(ev => this.renderEventCard(ev)).join('')
            : `<div class="ca-day-empty">Sin eventos</div>`;

        return `
        <div class="ca-day-col">
            <div class="${headClass}">
                <span class="ca-day-name">${day.name}</span>
                <span class="ca-day-num">${day.num}</span>
            </div>
            <div class="ca-day-events">${eventsHTML}</div>
        </div>`;
    }

    renderEventCard(ev) {
        const src = ev.source || 'google';
        const time = new Date(ev.start).toLocaleTimeString('es-ES', { hour: '2-digit', minute: '2-digit' });
        const title = ev.title || '(sin título)';
        const badgeLabel = this.getSourceLabel(src);

        return `
        <div class="ca-event-card ca-src-${src}">
            <span class="ca-event-time ca-time-${src}">${time}</span>
            <p class="ca-event-title">${title}</p>
            <span class="ca-event-badge ca-badge-${src}">${badgeLabel}</span>
        </div>`;
    }

    getSourceLabel(source) {
        return { google: 'Google', cleaning: 'Limpieza', menu: 'Menú' }[source] || 'Evento';
    }

    filterEvents(events) {
        if (this.currentFilter === 'all') return events;
        return events.filter(ev => ev.source === this.currentFilter);
    }

    setFilter(filter) {
        this.currentFilter = filter;
        document.querySelectorAll('.ca-filter-btn').forEach(btn => btn.classList.remove('active'));
        document.querySelector(`.ca-filter-btn[data-filter="${filter}"]`)?.classList.add('active');
        this.renderWeek();
    }

    async syncGoogleCalendar() {
        const syncBtn = document.getElementById('syncCalendarBtn');
        const originalHTML = syncBtn ? syncBtn.innerHTML : '';
        try {
            if (syncBtn) { syncBtn.innerHTML = '<span class="material-symbols-outlined">hourglass_empty</span> Verificando...'; syncBtn.disabled = true; }

            const statusResp = await api.get('/api/google/auth/status');
            const connected = statusResp.success && statusResp.data?.connected;

            if (!connected) {
                if (syncBtn) syncBtn.innerHTML = '<span class="material-symbols-outlined">sync</span> Abriendo...';
                const startResp = await api.get('/api/google/auth/start');
                if (!startResp.success || !startResp.data?.auth_url) {
                    this.showMessage(startResp.message || 'Error: configura Google Credentials en Configuración', 'error');
                    return;
                }
                window.open(startResp.data.auth_url, '_blank');
                this.showMessage('Autoriza en la ventana de Google y vuelve aquí. Luego pulsa Sincronizar de nuevo.', 'info');
                return;
            }

            if (syncBtn) syncBtn.innerHTML = '<span class="material-symbols-outlined">sync</span> Sincronizando...';
            const _toLocalISO = d => d ? `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}` : null;
            const weekStart = _toLocalISO(this.currentWeek);
            const weekEnd = this.currentWeek ? _toLocalISO(new Date(this.currentWeek.getTime() + 6 * 24 * 60 * 60 * 1000)) : null;

            const importResp = await api.post('/api/google/import', { from: weekStart, to: weekEnd });
            if (importResp.success) {
                const d = importResp.data;
                this.showMessage(`Sincronización completada: ${d.created} nuevos, ${d.updated} actualizados`, 'success');
                await this.loadCurrentWeek();
            } else {
                this.showMessage('Error sincronizando: ' + (importResp.message || 'desconocido'), 'error');
            }
        } catch (error) {
            console.error('[cal] Sync error:', error);
            this.showMessage('Error sincronizando Google Calendar', 'error');
        } finally {
            if (syncBtn) { syncBtn.innerHTML = originalHTML || '<span class="material-symbols-outlined">sync</span> Sincronizar'; syncBtn.disabled = false; }
        }
    }

    addEvent() {
        this.showMessage('Función para añadir eventos próximamente', 'info');
    }

    showMessage(message, type = 'info') {
        const colors = { success: '#34A853', error: '#EA4335', info: '#4285F4' };
        const el = document.createElement('div');
        el.style.cssText = `
            position: fixed; top: 24px; right: 24px; z-index: 9999;
            background: ${colors[type]}; color: white;
            padding: 12px 20px; border-radius: 12px;
            font-size: 0.875rem; font-weight: 500;
            box-shadow: 0 8px 32px rgba(0,0,0,0.4);
            max-width: 360px;
        `;
        el.textContent = message;
        document.body.appendChild(el);
        setTimeout(() => el.remove(), 4000);
    }
}

const calendarManager = new CalendarManager();
