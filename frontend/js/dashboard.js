// ============================================
// DASHBOARD MANAGER — Glassmorphic Bento Layout
// ============================================

class DashboardManager {
    constructor() {
        this.currentCalendarMonday = this.getThisMonday();
        this.daysOfWeek = ['Domingo', 'Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado'];
        this.init();
    }

    async init() {
        this.updateCurrentDate();
        window.dashboardManager = this;

        if (typeof lucide !== 'undefined') lucide.createIcons();

        await this.loadRealData();
        this.setupCalendarNav();
        this.setupDailyRefresh();
    }

    // ─── Date helpers ───────────────────────────────────────────────────

    getThisMonday() {
        const today = new Date();
        const d = today.getDay(); // 0=Sun
        const diff = today.getDate() - d + (d === 0 ? -6 : 1);
        return new Date(today.getFullYear(), today.getMonth(), diff);
    }

    updateCurrentDate() {
        const now = new Date();
        const opts = { weekday: 'long', day: 'numeric', month: 'long' };
        const txt = now.toLocaleDateString('es-ES', opts);
        const el = document.getElementById('currentDate');
        if (el) el.textContent = txt.charAt(0).toUpperCase() + txt.slice(1);
    }

    // ─── Data loading ────────────────────────────────────────────────────

    async loadRealData() {
        try {
            const [familyData, menuData, cleaningData, calendarData] = await Promise.all([
                this.fetchFamilyMembers(),
                this.fetchCurrentMenu(),
                this.fetchCleaningSchedule(),
                this.fetchCalendarEvents(this.currentCalendarMonday),
            ]);

            this.renderFamilyAvatars(familyData);
            this.renderMeals(menuData);
            this.renderCalendar(calendarData, this.currentCalendarMonday);
            this.renderCleaning(cleaningData);
            this.renderStatCards(familyData, menuData, cleaningData, calendarData);
        } catch (err) {
            console.error('❌ Dashboard load error:', err);
        }
    }

    async fetchFamilyMembers() {
        try {
            const r = await api.get('/api/family/members');
            return r.success ? r.data : [];
        } catch { return []; }
    }

    async fetchCurrentMenu() {
        try {
            let r = await api.get('/api/menu/current');
            if (!r.success || !r.data) r = await api.get('/api/menu/latest');
            return r.success ? r.data : null;
        } catch { return null; }
    }

    async fetchCleaningSchedule() {
        try {
            const r = await api.get('/api/cleaning/schedule');
            return r.success ? r.data : [];
        } catch { return []; }
    }

    async fetchCalendarEvents(monday) {
        try {
            const start = monday.toISOString().split('T')[0];
            const end = new Date(monday.getTime() + 6 * 86400000).toISOString().split('T')[0];
            const r = await api.get(`/api/calendar/week?start=${start}&end=${end}`);
            return r.success ? r.data : { events: [] };
        } catch { return { events: [] }; }
    }

    // ─── Renderers ───────────────────────────────────────────────────────

    renderFamilyAvatars(members) {
        const container = document.getElementById('dash-family-avatars');
        if (!container || !members.length) return;
        container.innerHTML = members.map(m => `
            <div class="avatar-circle" title="${m.nombre}"
                 style="background:${m.avatar_color || '#4d8eff'}">
                ${m.nombre.charAt(0).toUpperCase()}
            </div>`).join('');
    }

    renderMeals(menuData) {
        const container = document.getElementById('dash-meals-content');
        if (!container) return;

        const mealSlots = [
            { key: 'desayuno',  label: 'DESAYUNO',  icon: 'breakfast_dining', cls: 'primary' },
            { key: 'almuerzo',  label: 'ALMUERZO',  icon: 'set_meal',         cls: 'secondary', accent: true },
            { key: 'merienda',  label: 'MERIENDA',  icon: 'nutrition',        cls: 'tertiary' },
            { key: 'cena',      label: 'CENA',      icon: 'egg_alt',          cls: 'muted' },
        ];

        let dayMenu = {};
        if (menuData?.menu_data) {
            try {
                const parsed = typeof menuData.menu_data === 'string'
                    ? JSON.parse(menuData.menu_data) : menuData.menu_data;
                const dayNames = ['domingo','lunes','martes','miercoles','jueves','viernes','sabado'];
                const today = dayNames[new Date().getDay()];
                dayMenu = parsed.menu_adultos?.[today] || parsed.menu_ninos?.[today] || {};
            } catch { /* ignore */ }
        }

        container.innerHTML = mealSlots.map(slot => {
            const data = dayMenu[slot.key] || dayMenu['comida'];
            const name = data?.plato || '—';
            const desc = data?.preparacion ? data.preparacion.split('.')[0] : '';
            return `
            <div class="dash-meal-row">
                <p class="dash-meal-label${slot.accent ? ' dash-meal-label--secondary' : ''}">${slot.label}</p>
                <div class="dash-meal-item">
                    <div class="dash-meal-icon dash-meal-icon--${slot.cls}">
                        <span class="material-symbols-outlined">${slot.icon}</span>
                    </div>
                    <div>
                        <p class="dash-meal-name">${name}</p>
                        ${desc ? `<p class="dash-meal-desc">${desc}</p>` : ''}
                    </div>
                </div>
            </div>`;
        }).join('');
    }

    renderCalendar(calendarData, monday) {
        this.renderCalendarDays(monday);
        this.renderCalendarEvents(calendarData, monday);
    }

    renderCalendarDays(monday) {
        const container = document.getElementById('dash-cal-days');
        if (!container) return;

        const todayStr = new Date().toISOString().split('T')[0];
        container.innerHTML = Array.from({ length: 7 }, (_, i) => {
            const d = new Date(monday.getTime() + i * 86400000);
            const dStr = d.toISOString().split('T')[0];
            const isToday = dStr === todayStr;
            return `
            <div class="dash-cal-day${isToday ? ' dash-cal-day--today' : ''}">
                <span class="dash-cal-day-number">${d.getDate()}</span>
                ${isToday ? '<span class="dash-cal-day-lbl">hoy</span>' : ''}
            </div>`;
        }).join('');
    }

    renderCalendarEvents(calendarData, monday) {
        const container = document.getElementById('dash-cal-events');
        if (!container) return;

        const events = calendarData?.events || [];
        const todayStr = new Date().toISOString().split('T')[0];

        // Show today's events; fallback to the whole week if none
        let todayEvents = events.filter(e => e.start?.startsWith(todayStr));
        if (!todayEvents.length && events.length) todayEvents = events.slice(0, 3);

        if (!todayEvents.length) {
            container.innerHTML = '<p class="dash-cal-empty">Sin eventos para hoy</p>';
            return;
        }

        const colors = ['', '--tertiary', '--primary'];
        container.innerHTML = todayEvents.slice(0, 4).map((ev, i) => {
            const time = ev.start?.includes('T') ? ev.start.split('T')[1].substring(0, 5) : '';
            const colorCls = colors[i % colors.length];
            return `
            <div class="dash-cal-event${colorCls}">
                <p class="dash-cal-event-time">${time || '—'}</p>
                <div>
                    <p class="dash-cal-event-title">${ev.title || 'Evento'}</p>
                    ${ev.location ? `<p class="dash-cal-event-sub">${ev.location}</p>` : ''}
                </div>
            </div>`;
        }).join('');
    }

    renderCleaning(cleaningData) {
        const container = document.getElementById('dash-cleaning-list');
        if (!container) return;

        const todayStr = new Date().toISOString().split('T')[0];
        const tasks = cleaningData.filter(t => t.fecha_programada?.startsWith(todayStr));

        if (!tasks.length) {
            container.innerHTML = '<p class="dash-empty-msg">Sin tareas de limpieza hoy</p>';
            return;
        }

        container.innerHTML = tasks.slice(0, 6).map(task => {
            const memberName = task.member_nombre || '?';
            const avatarColor = task.member_color || '#4d8eff';
            const memberColor = this.getMemberAccentColor(memberName);
            const checked = task.completada;
            return `
            <div class="dash-clean-task">
                <div class="dash-clean-task-left">
                    <div class="dash-clean-avatar" style="background:${avatarColor}; border-color:${avatarColor}40">
                        ${memberName.charAt(0).toUpperCase()}
                    </div>
                    <div>
                        <p class="dash-clean-name">${task.task_nombre}</p>
                        <p class="dash-clean-member" style="color:${memberColor}">${memberName.toUpperCase()}</p>
                    </div>
                </div>
                <button class="dash-clean-check${checked ? ' done' : ''}"
                        onclick="dashboardManager.toggleCleaningTask(${task.id}, ${!checked})">
                    <span class="material-symbols-outlined" style="font-variation-settings:'FILL' ${checked ? 1 : 0}">
                        ${checked ? 'check_circle' : 'radio_button_unchecked'}
                    </span>
                </button>
            </div>`;
        }).join('');
    }

    getMemberAccentColor(name) {
        const map = {
            'papá':   '#adc6ff', 'papa': '#adc6ff',
            'mamá':   '#4cd7f6', 'mama': '#4cd7f6',
            'abuelo': '#d0bcff',
        };
        return map[name.toLowerCase()] || '#adc6ff';
    }

    renderStatCards(familyData, menuData, cleaningData, calendarData) {
        // Menú de Hoy
        const menuEl = document.getElementById('dash-stat-menu-value');
        const menuTypeEl = document.getElementById('dash-stat-menu-type');
        if (menuData?.menu_data) {
            try {
                const parsed = typeof menuData.menu_data === 'string'
                    ? JSON.parse(menuData.menu_data) : menuData.menu_data;
                const dayNames = ['domingo','lunes','martes','miercoles','jueves','viernes','sabado'];
                const today = dayNames[new Date().getDay()];
                const day = parsed.menu_adultos?.[today] || parsed.menu_ninos?.[today] || {};
                const firstMeal = Object.values(day)[0];
                if (menuEl && firstMeal?.plato) {
                    menuEl.textContent = firstMeal.plato.split(' ').slice(0, 3).join(' ');
                }
                if (menuTypeEl) {
                    const mealKey = Object.keys(day)[0] || '';
                    const names = { desayuno: 'Desayuno', almuerzo: 'Almuerzo Familiar', merienda: 'Merienda', cena: 'Cena' };
                    menuTypeEl.textContent = names[mealKey] || 'Menú del día';
                }
            } catch { /* ignore */ }
        } else {
            if (menuEl) menuEl.textContent = 'Sin menú';
            if (menuTypeEl) menuTypeEl.textContent = '—';
        }

        // Tareas Pendientes
        const todayStr = new Date().toISOString().split('T')[0];
        const todayTasks = cleaningData.filter(t => t.fecha_programada?.startsWith(todayStr));
        const pending = todayTasks.filter(t => !t.completada).length;
        const total = todayTasks.length;
        const pct = total > 0 ? Math.round((total - pending) / total * 100) : 0;
        const tasksEl = document.getElementById('dash-stat-tasks-count');
        const tasksBar = document.getElementById('dash-stat-tasks-bar');
        if (tasksEl) tasksEl.textContent = pending;
        if (tasksBar) tasksBar.style.width = `${pct}%`;

        // Próximo Evento
        const evEl = document.getElementById('dash-stat-event-value');
        const evTime = document.getElementById('dash-stat-event-time');
        const events = (calendarData?.events || []).filter(e => {
            const d = e.start?.split('T')[0];
            return d >= todayStr;
        }).sort((a, b) => a.start > b.start ? 1 : -1);
        if (events.length && evEl) {
            evEl.textContent = events[0].title || 'Evento';
            const time = events[0].start?.includes('T')
                ? events[0].start.split('T')[1].substring(0, 5) : '—';
            if (evTime) evTime.textContent = time + (events[0].location ? ` · ${events[0].location}` : '');
        } else {
            if (evEl) evEl.textContent = 'Sin eventos';
            if (evTime) evTime.textContent = '—';
        }

        // Lista de Compras
        const shopEl = document.getElementById('dash-stat-shopping-count');
        if (shopEl && menuData?.lista_compra) {
            try {
                const list = typeof menuData.lista_compra === 'string'
                    ? JSON.parse(menuData.lista_compra) : menuData.lista_compra;
                let count = 0;
                Object.values(list).forEach(cat => {
                    if (Array.isArray(cat)) count += cat.length;
                    else if (cat.items) count += cat.items.length;
                });
                shopEl.textContent = count;
            } catch { shopEl.textContent = '—'; }
        }
    }

    // ─── Calendar navigation ─────────────────────────────────────────────

    setupCalendarNav() {
        document.getElementById('dashCalPrev')?.addEventListener('click', () => {
            this.currentCalendarMonday = new Date(this.currentCalendarMonday.getTime() - 7 * 86400000);
            this.refreshCalendar();
        });
        document.getElementById('dashCalNext')?.addEventListener('click', () => {
            this.currentCalendarMonday = new Date(this.currentCalendarMonday.getTime() + 7 * 86400000);
            this.refreshCalendar();
        });
    }

    async refreshCalendar() {
        const data = await this.fetchCalendarEvents(this.currentCalendarMonday);
        this.renderCalendar(data, this.currentCalendarMonday);
    }

    // ─── Cleaning toggle ─────────────────────────────────────────────────

    async toggleCleaningTask(taskId, completed) {
        try {
            await api.put(`/api/cleaning/schedule/${taskId}/complete`, { completed, completed_by: 1 });
            const data = await this.fetchCleaningSchedule();
            this.renderCleaning(data);
            const calData = await this.fetchCalendarEvents(this.currentCalendarMonday);
            const menuData = await this.fetchCurrentMenu();
            this.renderStatCards([], menuData, data, calData);
        } catch (err) {
            console.error('Error toggling task:', err);
        }
    }

    // ─── Daily refresh ────────────────────────────────────────────────────

    setupDailyRefresh() {
        const now = new Date();
        const tomorrow = new Date(now.getFullYear(), now.getMonth(), now.getDate() + 1, 0, 5, 0);
        setTimeout(() => {
            this.loadRealData();
            this.setupDailyRefresh();
        }, tomorrow - now);
    }
}

document.addEventListener('DOMContentLoaded', () => { new DashboardManager(); });
