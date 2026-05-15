/**
 * Módulo de Limpieza - Plan Semanal
 */

class CleaningManager {
    constructor() {
        this.currentWeek = null;
        this.schedule = [];
        this.members = [];
        this.filters = { member: '', area: '' };
        this.init();
    }

    async init() {
        console.log('[cleaning] Inicializando módulo de limpieza...');
        this.getCurrentWeek();
        await this.loadMembers();
        await this.loadSchedule();
        await this.initializeCleaning();
        this.renderWeekGrid();
        this.renderStatusCard();
        this.populateFilters();
    }

    getCurrentWeek() {
        const today = new Date();
        const monday = new Date(today);
        monday.setDate(today.getDate() - today.getDay() + (today.getDay() === 0 ? -6 : 1));
        monday.setHours(0, 0, 0, 0);
        this.currentWeek = {
            start: monday,
            end: new Date(monday.getTime() + 6 * 24 * 60 * 60 * 1000)
        };
        this.updateWeekDisplay();
    }

    async loadCurrentWeek() {
        this.getCurrentWeek();
        await this.loadMembers();
        await this.loadSchedule();
        this.renderWeekGrid();
        this.renderStatusCard();
        this.populateFilters();
    }

    updateWeekDisplay() {
        const opts = { day: 'numeric', month: 'long', year: 'numeric' };
        const startStr = this.currentWeek.start.toLocaleDateString('es-ES', opts);
        const endStr = this.currentWeek.end.toLocaleDateString('es-ES', opts);
        const el = document.getElementById('week-range');
        if (el) el.textContent = `${startStr} - ${endStr}`;

        // Update week badge (ISO week number)
        const badge = document.getElementById('cleaningWeekBadge');
        if (badge) {
            const weekNum = this.getISOWeekNumber(this.currentWeek.start);
            badge.textContent = `Semana ${weekNum}`;
        }
    }

    getISOWeekNumber(date) {
        const d = new Date(date);
        d.setHours(0, 0, 0, 0);
        d.setDate(d.getDate() + 3 - ((d.getDay() + 6) % 7));
        const week1 = new Date(d.getFullYear(), 0, 4);
        return 1 + Math.round(((d - week1) / 86400000 - 3 + ((week1.getDay() + 6) % 7)) / 7);
    }

    async loadMembers() {
        try {
            const response = await api.get('/api/family/members');
            if (response.success && Array.isArray(response.data)) {
                this.members = response.data.filter(m => m.activo);
            } else {
                this.members = [];
            }
            console.log('[ok] Miembros cargados:', this.members);
        } catch (error) {
            console.error('[err] Error cargando miembros:', error);
            this.members = [];
        }
    }

    async loadSchedule() {
        try {
            const weekStart = this.formatDate(this.currentWeek.start);
            const response = await api.get(`/api/cleaning/schedule?week_start=${weekStart}`);
            this.schedule = response.data || [];
            console.log('[ok] Schedule cargado:', this.schedule);
        } catch (error) {
            console.error('[err] Error cargando schedule:', error);
        }
    }

    formatDate(date) {
        const y = date.getFullYear();
        const m = String(date.getMonth() + 1).padStart(2, '0');
        const d = String(date.getDate()).padStart(2, '0');
        return `${y}-${m}-${d}`;
    }

    async initializeCleaning() {
        try {
            const response = await api.post('/api/cleaning/initialize');
            if (response.success) {
                console.log('[ok] Catálogo de limpieza inicializado:', response.message);
            }
        } catch (error) {
            console.error('[err] Error inicializando limpieza:', error);
        }
    }

    async generateWeek() {
        try {
            const weekStart = this.formatDate(this.currentWeek.start);
            const response = await api.post('/api/cleaning/generate', {
                week_start: weekStart,
                regenerate: true
            });
            if (response.success) {
                console.log('[ok] Semana generada:', response.message);
                await this.loadSchedule();
                this.renderWeekGrid();
                this.renderStatusCard();
                this.showNotification('Plan semanal generado exitosamente', 'success');
            } else {
                this.showNotification('Error generando plan semanal', 'error');
            }
        } catch (error) {
            console.error('[err] Error generando semana:', error);
            this.showNotification('Error generando plan semanal', 'error');
        }
    }

    getFilteredTasks() {
        let filtered = [...this.schedule];
        if (this.filters.member) {
            filtered = filtered.filter(t => String(t.member_id) === String(this.filters.member));
        }
        if (this.filters.area) {
            filtered = filtered.filter(t => t.area === this.filters.area);
        }
        return filtered;
    }

    getAreaIcon(area) {
        const icons = {
            cocina: 'restaurant',
            bano: 'bathtub',
            salon: 'living',
            dormitorio: 'bed',
            general: 'home',
            exterior: 'yard',
            mascotas: 'pets'
        };
        return icons[area] || 'cleaning_services';
    }

    getAreaLabel(area) {
        const labels = {
            cocina: 'Cocina', bano: 'Baño', salon: 'Salón',
            dormitorio: 'Dorm.', general: 'General',
            exterior: 'Exterior', mascotas: 'Mascotas'
        };
        return labels[area] || area;
    }

    isToday(date) {
        const today = new Date();
        return date.getFullYear() === today.getFullYear() &&
               date.getMonth() === today.getMonth() &&
               date.getDate() === today.getDate();
    }

    isOverdue(task) {
        if (task.completada) return false;
        const taskDate = new Date(task.fecha_programada);
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        return taskDate < today;
    }

    renderWeekGrid() {
        const grid = document.getElementById('week-grid');
        if (!grid) return;

        const days = ['lunes','martes','miercoles','jueves','viernes','sabado','domingo'];
        const dayNames = ['Lunes','Martes','Miércoles','Jueves','Viernes','Sábado','Domingo'];
        const filtered = this.getFilteredTasks();
        const today = new Date();
        today.setHours(0, 0, 0, 0);

        grid.innerHTML = '';

        days.forEach((day, idx) => {
            const colDate = new Date(this.currentWeek.start);
            colDate.setDate(colDate.getDate() + idx);
            const colDateStr = this.formatDate(colDate);
            const isTodayCol = this.isToday(colDate);

            const dayTasks = filtered.filter(t => {
                if (!t.fecha_programada) return false;
                return t.fecha_programada.split('T')[0] === colDateStr;
            });

            const totalMin = dayTasks.reduce((s, t) => s + (t.duracion_minutos || 0), 0);
            const h = Math.floor(totalMin / 60);
            const m = totalMin % 60;
            const timeStr = h > 0 ? `${h}h ${m}m` : `${m}m`;

            const col = document.createElement('div');
            col.className = 'cl-col';

            // Day header
            col.innerHTML = `
                <div class="cl-day-head${isTodayCol ? ' cl-day-head--today' : ''}">
                    <span class="cl-day-name">${dayNames[idx]}</span>
                    <span class="cl-day-num">${colDate.getDate()}</span>
                    <div class="cl-day-stats">
                        <span class="cl-day-stat"><span class="material-symbols-outlined">task_alt</span>${dayTasks.length} tareas</span>
                        <span class="cl-day-stat"><span class="material-symbols-outlined">schedule</span>${timeStr}</span>
                    </div>
                </div>
            `;

            // Tasks
            const tasksWrap = document.createElement('div');
            tasksWrap.className = 'cl-tasks';

            if (dayTasks.length === 0) {
                tasksWrap.innerHTML = `<div class="cl-col-empty">Sin tareas</div>`;
            } else {
                dayTasks.forEach(task => {
                    const member = this.members.find(m => m.id === task.member_id);
                    const memberColor = member ? (member.avatar_color || '#adc6ff') : '#adc6ff';
                    const memberName = member ? member.nombre : (task.member_nombre || '?');
                    const memberInitial = memberName.charAt(0).toUpperCase();
                    const areaIcon = this.getAreaIcon(task.area);
                    const areaLabel = this.getAreaLabel(task.area);
                    const isDone = task.completada;
                    const isOver = this.isOverdue(task);

                    const card = document.createElement('div');
                    card.className = `cl-task-card${isDone ? ' cl-task-done' : ''}${isOver ? ' cl-task-overdue' : ''}`;
                    card.style.borderLeft = `4px solid ${memberColor}`;
                    card.dataset.taskId = task.id;

                    card.innerHTML = `
                        <div class="cl-task-top">
                            <div class="cl-task-name-row">
                                <span class="material-symbols-outlined cl-task-icon" style="color:${memberColor}">${areaIcon}</span>
                                <span class="cl-task-name">${task.task_nombre}</span>
                            </div>
                            <button class="cl-task-check${isDone ? ' cl-checked' : ''}"
                                    onclick="cleaningManager.toggleComplete(${task.id}); event.stopPropagation()">
                                ${isDone ? '<span class="material-symbols-outlined">check</span>' : ''}
                            </button>
                        </div>
                        <div class="cl-task-assignee">
                            <div class="cl-avatar" style="background:${memberColor};border-color:${memberColor}">${memberInitial}</div>
                            <span class="cl-assignee-name">${memberName}</span>
                        </div>
                        <div class="cl-task-footer">
                            <span class="cl-task-meta"><span class="material-symbols-outlined">schedule</span>${task.duracion_minutos} min</span>
                            <span class="cl-task-meta"><span class="material-symbols-outlined">${areaIcon}</span>${areaLabel}</span>
                        </div>
                    `;

                    tasksWrap.appendChild(card);
                });
            }

            col.appendChild(tasksWrap);
            grid.appendChild(col);
        });
    }

    renderStatusCard() {
        const el = document.getElementById('cleaningStatus');
        if (!el) return;

        const total = this.schedule.length;
        const completed = this.schedule.filter(t => t.completada).length;
        const pct = total > 0 ? Math.round(completed / total * 100) : 0;

        // Status label
        let statusLabel = 'Sin datos';
        if (total > 0) {
            if (pct >= 80) statusLabel = 'Excelente';
            else if (pct >= 50) statusLabel = 'Bien';
            else if (pct >= 20) statusLabel = 'Regular';
            else statusLabel = 'Por empezar';
        }

        // Today's pending
        const todayStr = this.formatDate(new Date());
        const pendingToday = this.schedule.filter(t =>
            !t.completada && t.fecha_programada && t.fecha_programada.split('T')[0] === todayStr
        ).length;

        // Next task
        const upcoming = this.schedule
            .filter(t => !t.completada && t.fecha_programada)
            .sort((a, b) => new Date(a.fecha_programada) - new Date(b.fecha_programada));
        const nextTask = upcoming[0];
        let nextTaskName = '—';
        let nextAssigneeName = '';
        if (nextTask) {
            nextTaskName = `${nextTask.task_nombre} (${nextTask.duracion_minutos} min)`;
            nextAssigneeName = nextTask.member_nombre || '';
        }

        // SVG ring: circumference = 2π×28 ≈ 175.93
        const circ = 175.93;
        const dashOffset = circ * (1 - pct / 100);

        if (total === 0) {
            el.innerHTML = `<div class="cl-status-empty">Genera el plan semanal para ver el estado del hogar.</div>`;
            return;
        }

        el.innerHTML = `
            <div class="cl-status-inner">
                <div class="cl-ring-wrap">
                    <svg class="cl-ring-svg" viewBox="0 0 64 64">
                        <circle class="cl-ring-bg" cx="32" cy="32" r="28"/>
                        <circle class="cl-ring-fill" cx="32" cy="32" r="28"
                            stroke-dasharray="${circ}" stroke-dashoffset="${dashOffset.toFixed(1)}"/>
                    </svg>
                    <span class="cl-ring-pct">${pct}%</span>
                </div>
                <div class="cl-status-info">
                    <span class="cl-status-kpi">Estado del Hogar</span>
                    <h2 class="cl-status-title">${statusLabel}</h2>
                    <p class="cl-status-pending">
                        <span class="material-symbols-outlined">notification_important</span>
                        ${pendingToday} tarea${pendingToday !== 1 ? 's' : ''} pendiente${pendingToday !== 1 ? 's' : ''} hoy
                    </p>
                </div>
                <div class="cl-status-divider"></div>
                <div class="cl-status-next">
                    <span class="cl-next-label">Próxima Tarea</span>
                    <span class="cl-next-task">${nextTaskName}</span>
                    <span class="cl-next-assignee">${nextAssigneeName ? 'Asignado a ' + nextAssigneeName : ''}</span>
                </div>
            </div>
        `;
    }

    // Keep renderSummary as alias
    renderSummary() {
        this.renderStatusCard();
    }

    populateFilters() {
        const memberSel = document.getElementById('memberFilter');
        if (memberSel) {
            memberSel.innerHTML = '<option value="">Todos los miembros</option>';
            this.members.forEach(m => {
                const opt = document.createElement('option');
                opt.value = m.id;
                opt.textContent = m.nombre;
                if (String(m.id) === String(this.filters.member)) opt.selected = true;
                memberSel.appendChild(opt);
            });
        }
    }

    onMemberFilter(value) {
        this.filters.member = value;
        this.renderWeekGrid();
        this.renderStatusCard();
    }

    onAreaFilter(value) {
        this.filters.area = value;
        this.renderWeekGrid();
        this.renderStatusCard();
    }

    async toggleComplete(taskId) {
        try {
            const task = this.schedule.find(t => t.id === taskId);
            if (!task) return;
            const newStatus = !task.completada;
            const response = await api.put(`/api/cleaning/schedule/${taskId}/complete`, {
                completed: newStatus,
                completed_by: newStatus ? this.getCurrentUserId() : null
            });
            if (response.success) {
                task.completada = newStatus;
                this.renderWeekGrid();
                this.renderStatusCard();
                this.showNotification(
                    newStatus ? 'Tarea completada ✓' : 'Tarea marcada como pendiente', 'success'
                );
            }
        } catch (error) {
            console.error('[err] Error cambiando estado:', error);
            this.showNotification('Error cambiando estado de tarea', 'error');
        }
    }

    getCurrentUserId() {
        const adult = this.members.find(m => m.tipo === 'adulto');
        return adult ? adult.id : 1;
    }

    showTaskDetails(task) {
        console.log('Tarea:', task);
    }

    showStats() {
        console.log('Estadísticas de limpieza');
    }

    previousWeek() {
        this.currentWeek.start.setDate(this.currentWeek.start.getDate() - 7);
        this.currentWeek.end.setDate(this.currentWeek.end.getDate() - 7);
        this.updateWeekDisplay();
        this.loadSchedule().then(() => {
            this.renderWeekGrid();
            this.renderStatusCard();
        });
    }

    nextWeek() {
        this.currentWeek.start.setDate(this.currentWeek.start.getDate() + 7);
        this.currentWeek.end.setDate(this.currentWeek.end.getDate() + 7);
        this.updateWeekDisplay();
        this.loadSchedule().then(() => {
            this.renderWeekGrid();
            this.renderStatusCard();
        });
    }

    showNotification(message, type = 'info') {
        const n = document.createElement('div');
        n.className = `notification notification-${type}`;
        n.textContent = message;
        n.style.cssText = `
            position:fixed;top:20px;right:20px;padding:12px 20px;
            border-radius:8px;color:white;font-weight:500;z-index:1000;
            transition:opacity 0.3s ease;font-size:14px;
            background:${type === 'success' ? '#10b981' : type === 'error' ? '#ef4444' : '#3b82f6'};
        `;
        document.body.appendChild(n);
        setTimeout(() => { n.style.opacity = '0'; setTimeout(() => n.remove(), 300); }, 3000);
    }
}

const cleaningManager = new CleaningManager();
