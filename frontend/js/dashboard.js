// ============================================
// DASHBOARD MANAGER — Glassmorphic Command Rebuild
// ============================================

class DashboardManager {
    constructor() {
        this.currentCalendarMonday = this.getThisMonday();
        this.calendarFilter = 'all';
        this.daysShort = ['Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb', 'Dom'];
        this.monthNames = ['ene', 'feb', 'mar', 'abr', 'may', 'jun',
                           'jul', 'ago', 'sep', 'oct', 'nov', 'dic'];
        this.init();
    }

    async init() {
        this.updateDayTag();
        window.dashboardManager = this;
        await this.loadAll();
        this.setupCalendarNav();
        this.setupCalendarFilters();
        this.setupDailyRefresh();
    }

    // ─── Date Helpers ────────────────────────────────────────────────────

    getThisMonday() {
        const today = new Date();
        const d = today.getDay();
        const diff = today.getDate() - d + (d === 0 ? -6 : 1);
        return new Date(today.getFullYear(), today.getMonth(), diff);
    }

    updateDayTag() {
        const dayNames = ['Domingo', 'Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado'];
        const el = document.getElementById('db-day-tag');
        if (el) el.textContent = dayNames[new Date().getDay()];
    }

    // ─── Data Loading ─────────────────────────────────────────────────────

    async loadAll() {
        try {
            const [familyData, menuData, cleaningData, calendarData] = await Promise.all([
                this.fetchJSON('/api/family/members'),
                this.fetchMenu(),
                this.fetchJSON('/api/cleaning/schedule'),
                this.fetchCalendar(this.currentCalendarMonday),
            ]);
            this.familyData    = familyData;
            this.menuData      = menuData;
            this.cleaningData  = cleaningData;
            this.calendarData  = calendarData;

            this.renderChips(menuData, cleaningData, calendarData);
            this.renderMenuPanel(menuData);
            this.renderShoppingPanel(menuData);
            this.renderTasksPanel(cleaningData);
            this.renderCalendarPanel(calendarData, this.currentCalendarMonday);
            this.renderAvatar(familyData);
        } catch (err) {
            console.error('[dashboard] load error:', err);
        }
    }

    async fetchJSON(url) {
        try {
            const r = await api.get(url);
            return r.success ? (r.data || []) : [];
        } catch { return []; }
    }

    async fetchMenu() {
        // SOLO el menú de la semana actual — no caer a /latest, que mostraría
        // "el plato de hoy" tomado de otra semana (desincronización).
        try {
            const r = await api.get('/api/menu/current');
            return r.success ? r.data : null;
        } catch { return null; }
    }

    async fetchCalendar(monday) {
        try {
            const d = monday;
            const start = `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`;
            const r = await api.get(`/api/calendar/week?week=${start}`);
            return r.success ? r.data : { events: [] };
        } catch { return { events: [] }; }
    }

    // ─── Avatar ───────────────────────────────────────────────────────────

    renderAvatar(members) {
        const el = document.getElementById('db-avatar');
        if (!el || !Array.isArray(members) || !members.length) return;
        const first = members[0];
        el.textContent = (first.nombre || 'J').charAt(0).toUpperCase();
        if (first.avatar_color) el.style.background = first.avatar_color;
    }

    // ─── Quick-Stat Chips ─────────────────────────────────────────────────

    renderChips(menuData, cleaningData, calendarData) {
        // Chip 1 — Menú
        const menuEl = document.getElementById('chip-menu-value');
        if (menuEl) {
            const { adultos } = this.getTodayMenuBoth(menuData);
            const first = Object.values(adultos)[0];
            menuEl.textContent = first?.plato
                ? first.plato.split(' ').slice(0, 3).join(' ')
                : 'Sin menú';
        }

        // Chip 2 — Compras
        const shopEl = document.getElementById('chip-shopping-value');
        if (shopEl && menuData?.lista_compra) {
            try {
                const list = typeof menuData.lista_compra === 'string'
                    ? JSON.parse(menuData.lista_compra) : menuData.lista_compra;
                let count = 0;
                Object.values(list).forEach(cat => {
                    count += Array.isArray(cat) ? cat.length : (cat.items?.length || 0);
                });
                shopEl.textContent = `${count} Items`;
            } catch { shopEl.textContent = '—'; }
        }

        // Chip 3 — Limpieza
        const cleanEl = document.getElementById('chip-cleaning-value');
        if (cleanEl && Array.isArray(cleaningData)) {
            const _td = new Date();
            const todayStr = `${_td.getFullYear()}-${String(_td.getMonth()+1).padStart(2,'0')}-${String(_td.getDate()).padStart(2,'0')}`;
            const todayTask = cleaningData.filter(t => t.fecha_programada?.startsWith(todayStr));
            const done      = todayTask.filter(t => t.completada).length;
            cleanEl.textContent = `${done}/${todayTask.length}`;
        }

        // Chip 4 — Eventos hoy
        const evEl = document.getElementById('chip-events-value');
        if (evEl) {
            const _td = new Date(); const todayStr = `${_td.getFullYear()}-${String(_td.getMonth()+1).padStart(2,'0')}-${String(_td.getDate()).padStart(2,'0')}`;
            const count    = (calendarData?.events || []).filter(e => { const d = new Date(e.start); return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}` === todayStr; }).length;
            evEl.textContent = `${count} hoy`;
        }
    }

    // ─── Menú de Hoy Panel ────────────────────────────────────────────────

    getTodayMenuBoth(menuData) {
        if (!menuData?.menu_data) return { adultos: {}, ninos: {} };
        try {
            const parsed  = typeof menuData.menu_data === 'string'
                ? JSON.parse(menuData.menu_data) : menuData.menu_data;
            const dayKeys = ['domingo','lunes','martes','miercoles','jueves','viernes','sabado'];
            const today   = dayKeys[new Date().getDay()];
            return {
                adultos: parsed.menu_adultos?.[today] || {},
                ninos:   parsed.menu_ninos?.[today]   || {},
            };
        } catch { return { adultos: {}, ninos: {} }; }
    }

    _buildMenuSectionHtml(dayMenu) {
        const meals = Object.entries(dayMenu);
        if (!meals.length) return '<p class="db-menu-empty">Sin menú para hoy</p>';

        const mealLabels = {
            desayuno: 'Desayuno', almuerzo: 'Almuerzo', comida: 'Comida',
            merienda: 'Merienda', cena: 'Cena'
        };
        const mealIcons = {
            desayuno: 'breakfast_dining', almuerzo: 'set_meal', comida: 'set_meal',
            merienda: 'nutrition', cena: 'egg_alt'
        };

        const heroKey = ['comida','almuerzo','cena','desayuno','merienda']
            .find(k => dayMenu[k]) || meals[0][0];
        const heroData = dayMenu[heroKey] || {};

        const desc = heroData.preparacion
            ? (Array.isArray(heroData.preparacion)
                ? heroData.preparacion.slice(0, 2).join('. ')
                : heroData.preparacion.split('.').slice(0, 2).join('.') + '.')
            : (heroData.descripcion || '');

        const heroHtml = `
            <div class="db-menu-hero db-dish-clickable" data-meal="${heroKey}" role="button" tabindex="0" style="cursor:pointer;position:relative;">
                <p class="db-menu-hero-meal">${mealLabels[heroKey] || heroKey}</p>
                <p class="db-menu-hero-name">${heroData.plato || heroData.nombre || '—'}</p>
                ${desc ? `<p class="db-menu-hero-desc">${desc}</p>` : ''}
                <div class="db-menu-hero-tags">
                    ${heroData.dificultad ? `<span class="db-menu-tag">${heroData.dificultad}</span>` : ''}
                    ${heroData.tiempo_prep ? `<span class="db-menu-tag">⏱ ${heroData.tiempo_prep} min</span>` : ''}
                </div>
                <span class="db-menu-more" style="display:inline-flex;align-items:center;gap:3px;margin-top:8px;font-size:0.78rem;font-weight:600;color:#7db1ff;">
                    Ver receta completa
                    <span class="material-symbols-outlined" style="font-size:16px;">chevron_right</span>
                </span>
            </div>`;

        const secondaryHtml = meals
            .filter(([k]) => k !== heroKey)
            .slice(0, 3)
            .map(([k, v]) => `
                <div class="db-menu-row db-dish-clickable" data-meal="${k}" role="button" tabindex="0" style="cursor:pointer;">
                    <span class="db-menu-row-icon">
                        <span class="material-symbols-outlined">${mealIcons[k] || 'restaurant'}</span>
                    </span>
                    <div style="flex:1;">
                        <p class="db-menu-row-label">${mealLabels[k] || k}</p>
                        <p class="db-menu-row-name">${v?.plato || v?.nombre || '—'}</p>
                    </div>
                    <span class="material-symbols-outlined" style="font-size:18px;opacity:0.4;">chevron_right</span>
                </div>`).join('');

        return heroHtml + secondaryHtml;
    }

    renderMenuPanel(menuData) {
        const container = document.getElementById('db-menu-content');
        if (!container) return;

        const { adultos, ninos } = this.getTodayMenuBoth(menuData);
        this._todayMenus = { adultos, ninos };  // para el modal de receta completa
        const hasAdultos = Object.keys(adultos).length > 0;
        const hasNinos   = Object.keys(ninos).length > 0;

        if (!hasAdultos && !hasNinos) {
            container.innerHTML = '<p class="db-menu-empty">Sin menú para hoy</p>';
            return;
        }

        // Build tabs only when both exist
        const showTabs = hasAdultos && hasNinos;
        const tabsHtml = showTabs ? `
            <div class="db-menu-tabs" style="display:flex;gap:6px;margin-bottom:10px;">
                <button class="db-menu-tab active" data-tab="adultos"
                    style="flex:1;padding:5px;border-radius:8px;border:none;cursor:pointer;
                           font-size:0.75rem;font-weight:600;background:rgba(173,198,255,0.15);color:#adc6ff;">
                    👨‍👩 Adultos
                </button>
                <button class="db-menu-tab" data-tab="ninos"
                    style="flex:1;padding:5px;border-radius:8px;border:none;cursor:pointer;
                           font-size:0.75rem;font-weight:600;background:rgba(255,255,255,0.05);color:#94a3b8;">
                    👧 Niños
                </button>
            </div>` : '';

        const adultosHtml = this._buildMenuSectionHtml(adultos);
        const ninosHtml   = hasNinos ? this._buildMenuSectionHtml(ninos) : '';

        container.innerHTML = tabsHtml +
            `<div class="db-menu-pane" data-pane="adultos">${adultosHtml}</div>` +
            (showTabs ? `<div class="db-menu-pane" data-pane="ninos" style="display:none">${ninosHtml}</div>` : '');

        // Tab switching
        if (showTabs) {
            container.querySelectorAll('.db-menu-tab').forEach(btn => {
                btn.addEventListener('click', () => {
                    container.querySelectorAll('.db-menu-tab').forEach(b => {
                        b.classList.remove('active');
                        b.style.background = 'rgba(255,255,255,0.05)';
                        b.style.color = '#94a3b8';
                    });
                    btn.classList.add('active');
                    btn.style.background = 'rgba(173,198,255,0.15)';
                    btn.style.color = '#adc6ff';
                    container.querySelectorAll('.db-menu-pane').forEach(p => {
                        p.style.display = p.dataset.pane === btn.dataset.tab ? '' : 'none';
                    });
                });
            });
        }

        // Tap en un plato → abrir receta completa
        container.querySelectorAll('.db-dish-clickable').forEach(el => {
            const open = () => {
                const pane = el.closest('.db-menu-pane')?.dataset.pane || 'adultos';
                const meal = el.dataset.meal;
                const dish = (this._todayMenus?.[pane] || {})[meal];
                const tipo = pane === 'ninos' ? '👧 Niños' : '👨‍👩 Adultos';
                this.showDishModal(dish, meal, tipo);
            };
            el.addEventListener('click', open);
            el.addEventListener('keydown', (e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); open(); } });
        });
    }

    // ─── Modal de receta completa (móvil) ─────────────────────────────────

    showDishModal(dish, mealKey, tipoLabel) {
        if (!dish || (!dish.plato && !dish.nombre)) return;
        const esc = (s) => String(s ?? '').replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;');
        const mealLabels = { desayuno:'Desayuno', almuerzo:'Almuerzo', comida:'Comida', merienda:'Merienda', cena:'Cena' };
        const nombre = esc(dish.plato || dish.nombre || 'Plato');
        const ingredientes = Array.isArray(dish.ingredientes) ? dish.ingredientes
            : (dish.ingredientes ? String(dish.ingredientes).split(',') : []);
        let prep = dish.preparacion || dish.instrucciones || '';
        const pasos = Array.isArray(prep) ? prep
            : String(prep).split(/\.\s+/).map(s => s.trim()).filter(Boolean);
        const aler = Array.isArray(dish.alergenos) ? dish.alergenos : [];
        const nutr = dish.nutrientes || {};

        const chips = [];
        if (dish.tiempo_prep) chips.push(`⏱ ${esc(dish.tiempo_prep)} min`);
        if (dish.calorias) chips.push(`🔥 ${esc(dish.calorias)} kcal`);
        if (dish.dificultad) chips.push(`📊 ${esc(dish.dificultad)}`);
        if (nutr.proteinas_g) chips.push(`💪 ${esc(nutr.proteinas_g)}g prot`);
        if (nutr.carbohidratos_g != null) chips.push(`🍞 ${esc(nutr.carbohidratos_g)}g carbs`);

        let modal = document.getElementById('dbDishModal');
        if (!modal) { modal = document.createElement('div'); modal.id = 'dbDishModal'; document.body.appendChild(modal); }
        modal.setAttribute('style',
            'position:fixed;inset:0;z-index:9999;background:rgba(2,6,23,0.75);backdrop-filter:blur(3px);' +
            'display:flex;align-items:flex-end;justify-content:center;');
        modal.innerHTML = `
            <div style="background:#0f172a;border:1px solid #1e293b;border-radius:20px 20px 0 0;width:100%;max-width:640px;
                        max-height:88vh;overflow-y:auto;padding:20px 18px 32px;box-shadow:0 -8px 40px rgba(0,0,0,.5);
                        animation:dbSheetUp .22s ease;">
                <div style="display:flex;justify-content:center;margin-bottom:12px;">
                    <span style="width:40px;height:4px;border-radius:99px;background:#334155;"></span>
                </div>
                <div style="display:flex;align-items:flex-start;justify-content:space-between;gap:10px;">
                    <div>
                        <p style="margin:0 0 2px;font-size:0.72rem;text-transform:uppercase;letter-spacing:.5px;color:#7db1ff;">
                            ${esc(mealLabels[mealKey] || mealKey)} · ${esc(tipoLabel)}</p>
                        <h2 style="margin:0;font-size:1.25rem;line-height:1.25;color:#f1f5f9;">${nombre}</h2>
                    </div>
                    <button id="dbDishClose" style="background:#1e293b;border:none;color:#cbd5e1;border-radius:50%;
                        width:34px;height:34px;flex-shrink:0;cursor:pointer;display:flex;align-items:center;justify-content:center;">
                        <span class="material-symbols-outlined" style="font-size:20px;">close</span>
                    </button>
                </div>
                ${dish.descripcion ? `<p style="margin:10px 0 0;font-size:0.9rem;color:#94a3b8;line-height:1.5;">${esc(dish.descripcion)}</p>` : ''}
                ${chips.length ? `<div style="display:flex;flex-wrap:wrap;gap:6px;margin-top:12px;">
                    ${chips.map(c => `<span style="font-size:0.75rem;background:#1e293b;color:#cbd5e1;padding:4px 10px;border-radius:99px;">${c}</span>`).join('')}
                </div>` : ''}
                ${ingredientes.length ? `
                <div style="margin-top:18px;">
                    <h3 style="margin:0 0 8px;font-size:0.95rem;color:#e2e8f0;">🧺 Ingredientes</h3>
                    <ul style="margin:0;padding-left:18px;color:#cbd5e1;font-size:0.88rem;line-height:1.7;">
                        ${ingredientes.map(i => `<li>${esc(String(i).trim())}</li>`).join('')}
                    </ul>
                </div>` : ''}
                ${pasos.length ? `
                <div style="margin-top:18px;">
                    <h3 style="margin:0 0 8px;font-size:0.95rem;color:#e2e8f0;">👩‍🍳 Preparación</h3>
                    <ol style="margin:0;padding-left:20px;color:#cbd5e1;font-size:0.88rem;line-height:1.7;">
                        ${pasos.map(p => `<li style="margin-bottom:6px;">${esc(p.replace(/\.$/,''))}.</li>`).join('')}
                    </ol>
                </div>` : ''}
                ${aler.length ? `<div style="margin-top:16px;font-size:0.8rem;color:#fca5a5;">⚠️ Alérgenos: ${aler.map(esc).join(', ')}</div>` : ''}
            </div>`;

        const close = () => { modal.remove(); };
        modal.addEventListener('click', (e) => { if (e.target === modal) close(); });
        document.getElementById('dbDishClose')?.addEventListener('click', close);
        // Animación (una sola vez)
        if (!document.getElementById('dbSheetAnim')) {
            const st = document.createElement('style'); st.id = 'dbSheetAnim';
            st.textContent = '@keyframes dbSheetUp{from{transform:translateY(30px);opacity:.4}to{transform:translateY(0);opacity:1}}';
            document.head.appendChild(st);
        }
    }

    // ─── Lista de Compras Panel ───────────────────────────────────────────

    renderShoppingPanel(menuData) {
        const listEl    = document.getElementById('db-shopping-list');
        const counterEl = document.getElementById('db-shopping-counter');
        if (!listEl) return;

        if (!menuData?.lista_compra) {
            listEl.innerHTML = '<li class="db-shopping-empty">Sin lista de compras</li>';
            if (counterEl) counterEl.textContent = '—';
            return;
        }

        try {
            const rawList = typeof menuData.lista_compra === 'string'
                ? JSON.parse(menuData.lista_compra) : menuData.lista_compra;

            // Flatten all items across categories
            const allItems = [];
            Object.entries(rawList).forEach(([cat, val]) => {
                const items = Array.isArray(val) ? val : (val.items || []);
                items.forEach(item => {
                    const name = typeof item === 'string' ? item
                        : (item.nombre || item.name || item.item || JSON.stringify(item));
                    const qty  = typeof item === 'object' ? (item.cantidad || item.qty || '') : '';
                    allItems.push({ name, qty, checked: false });
                });
            });

            if (counterEl) counterEl.textContent = `${allItems.length} Items`;

            listEl.innerHTML = allItems.slice(0, 10).map(item => `
                <li class="db-shopping-item">
                    <span class="db-shopping-check"></span>
                    <span class="db-shopping-item-name">${item.name}</span>
                    ${item.qty ? `<span class="db-shopping-item-qty">${item.qty}</span>` : ''}
                </li>`).join('');

            // Clickable checkboxes
            listEl.querySelectorAll('.db-shopping-item').forEach(li => {
                li.addEventListener('click', () => li.classList.toggle('checked'));
            });
        } catch {
            listEl.innerHTML = '<li class="db-shopping-empty">Error cargando lista</li>';
        }
    }

    // ─── Tareas de Hoy Panel ──────────────────────────────────────────────

    renderTasksPanel(cleaningData) {
        const container = document.getElementById('db-tasks-content');
        if (!container) return;

        const _now2 = new Date();
        const todayStr  = `${_now2.getFullYear()}-${String(_now2.getMonth()+1).padStart(2,'0')}-${String(_now2.getDate()).padStart(2,'0')}`;
        const tasks     = Array.isArray(cleaningData)
            ? cleaningData.filter(t => t.fecha_programada?.startsWith(todayStr))
            : [];

        if (!tasks.length) {
            container.innerHTML = `
                <div class="db-task-empty">
                    <svg class="db-task-ring" viewBox="0 0 72 72">
                        <circle class="ring-bg" cx="36" cy="36" r="30"/>
                        <circle class="ring-fill" cx="36" cy="36" r="30"
                            stroke-dasharray="0 188" transform="rotate(-90 36 36)"/>
                    </svg>
                    <p class="db-task-empty-text">No hay tareas de limpieza para hoy</p>
                    <p class="db-task-empty-sub">Disfruta tu día libre</p>
                </div>`;
            return;
        }

        container.innerHTML = tasks.slice(0, 5).map(task => {
            const name   = task.member_nombre || '?';
            const color  = task.member_color || '#4d8eff';
            const done   = task.completada;
            return `
                <div class="db-task-item">
                    <div class="db-task-avatar" style="background:${color}">
                        ${name.charAt(0).toUpperCase()}
                    </div>
                    <div class="db-task-info">
                        <p class="db-task-name">${task.task_nombre}</p>
                        <p class="db-task-member">${name.toUpperCase()}</p>
                    </div>
                    <button class="db-task-check-btn${done ? ' done' : ''}"
                            onclick="dashboardManager.toggleTask(${task.id}, ${!done})">
                        <span class="material-symbols-outlined"
                              style="font-variation-settings:'FILL' ${done ? 1 : 0}">
                            ${done ? 'check_circle' : 'radio_button_unchecked'}
                        </span>
                    </button>
                </div>`;
        }).join('');
    }

    async toggleTask(id, completed) {
        try {
            await api.put(`/api/cleaning/schedule/${id}/complete`, { completed, completed_by: 1 });
            const data = await this.fetchJSON('/api/cleaning/schedule');
            this.cleaningData = data;
            this.renderTasksPanel(data);
            this.renderChips(this.menuData, data, this.calendarData);
        } catch (err) {
            console.error('[dashboard] toggle task error:', err);
        }
    }

    // ─── Calendario Semanal Panel ─────────────────────────────────────────

    renderCalendarPanel(calendarData, monday) {
        const grid = document.getElementById('db-cal-grid');
        if (!grid) return;

        const events   = (calendarData?.events || []).filter(e =>
            this.calendarFilter === 'all' || this.getEventType(e) === this.calendarFilter
        );
        const _now = new Date();
        const todayStr = `${_now.getFullYear()}-${String(_now.getMonth()+1).padStart(2,'0')}-${String(_now.getDate()).padStart(2,'0')}`;

        // Update range label
        const rangeEl = document.getElementById('db-cal-range');
        if (rangeEl) {
            const end   = new Date(monday.getTime() + 6 * 86400000);
            const start = monday;
            rangeEl.textContent =
                `${start.getDate()} - ${end.getDate()} ${this.monthNames[end.getMonth()]} ${end.getFullYear()}`;
        }

        grid.innerHTML = Array.from({ length: 7 }, (_, i) => {
            const d    = new Date(monday.getTime() + i * 86400000);
            const dStr = `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`;
            const isToday = dStr === todayStr;
            const dayEvents = events.filter(e => {
                if (!e.start) return false;
                const evD = new Date(e.start);
                const evStr = `${evD.getFullYear()}-${String(evD.getMonth()+1).padStart(2,'0')}-${String(evD.getDate()).padStart(2,'0')}`;
                return evStr === dStr;
            });

            const eventsHtml = dayEvents.length
                ? dayEvents.slice(0, 4).map(ev => {
                    const type = this.getEventType(ev);
                    const time = ev.start?.includes('T')
                        ? ev.start.split('T')[1].substring(0, 5) + ' ' : '';
                    return `<div class="db-cal-event-pill type-${type}">${time}${ev.title || 'Evento'}</div>`;
                }).join('')
                : '<div class="db-cal-empty-col">·</div>';

            return `
                <div class="db-cal-day">
                    <div class="db-cal-day-hd${isToday ? ' today' : ''}">
                        <p class="db-cal-day-name">${this.daysShort[i]}</p>
                        <span class="db-cal-day-num">${d.getDate()}</span>
                    </div>
                    <div class="db-cal-events-col">${eventsHtml}</div>
                </div>`;
        }).join('');
    }

    getEventType(event) {
        const title  = (event.title || '').toLowerCase();
        const source = (event.source || '').toLowerCase();
        if (source.includes('google') || title.includes('reunión') || title.includes('cita'))
            return 'google';
        if (title.includes('limpieza') || title.includes('tarea') || title.includes('cleaning'))
            return 'cleaning';
        if (title.includes('menú') || title.includes('comida') || title.includes('cena'))
            return 'menu';
        return 'other';
    }

    // ─── Calendar Navigation & Filters ────────────────────────────────────

    setupCalendarNav() {
        document.getElementById('dbCalPrev')?.addEventListener('click', () => {
            this.currentCalendarMonday = new Date(this.currentCalendarMonday.getTime() - 7 * 86400000);
            this.refreshCalendar();
        });
        document.getElementById('dbCalNext')?.addEventListener('click', () => {
            this.currentCalendarMonday = new Date(this.currentCalendarMonday.getTime() + 7 * 86400000);
            this.refreshCalendar();
        });
    }

    setupCalendarFilters() {
        document.querySelectorAll('.db-filter').forEach(btn => {
            btn.addEventListener('click', () => {
                document.querySelectorAll('.db-filter').forEach(b => b.classList.remove('active'));
                btn.classList.add('active');
                this.calendarFilter = btn.dataset.filter;
                this.renderCalendarPanel(this.calendarData, this.currentCalendarMonday);
            });
        });
    }

    async refreshCalendar() {
        const data = await this.fetchCalendar(this.currentCalendarMonday);
        this.calendarData = data;
        this.renderCalendarPanel(data, this.currentCalendarMonday);
    }

    // ─── Daily Refresh ────────────────────────────────────────────────────

    setupDailyRefresh() {
        const now      = new Date();
        const tomorrow = new Date(now.getFullYear(), now.getMonth(), now.getDate() + 1, 0, 5, 0);
        setTimeout(() => { this.loadAll(); this.setupDailyRefresh(); }, tomorrow - now);
    }
}

document.addEventListener('DOMContentLoaded', () => { new DashboardManager(); });
