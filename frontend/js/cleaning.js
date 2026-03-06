/**
 * Módulo de Limpieza - Plan Semanal
 */

class CleaningManager {
    constructor() {
        this.currentWeek = null;
        this.schedule = [];
        this.members = [];
        this.filters = {
            member: '',
            area: ''
        };
    }

    async init() {
        console.log('🧹 Inicializando módulo de limpieza...');
        
        // Obtener semana actual
        this.getCurrentWeek();
        
        // Cargar datos iniciales
        await this.loadMembers();
        await this.loadSchedule();
        await this.initializeCleaning();
        
        // Renderizar UI
        this.renderWeekGrid();
        this.renderSummary();
        this.populateFilters();
        
        // Inicializar Lucide icons
        this.initializeLucideIcons();
        
        // Setup click outside to close dropdowns
        this.setupDropdownListeners();
    }

    getCurrentWeek() {
        const today = new Date();
        const monday = new Date(today);
        monday.setDate(today.getDate() - today.getDay() + 1);
        
        this.currentWeek = {
            start: monday,
            end: new Date(monday.getTime() + 6 * 24 * 60 * 60 * 1000)
        };
        
        this.updateWeekDisplay();
    }

    loadCurrentWeek() {
        // Alias para compatibilidad con la navegación
        this.getCurrentWeek();
        this.loadSchedule();
    }

    updateWeekDisplay() {
        const options = { day: 'numeric', month: 'long', year: 'numeric' };
        const startStr = this.currentWeek.start.toLocaleDateString('es-ES', options);
        const endStr = this.currentWeek.end.toLocaleDateString('es-ES', options);
        
        document.getElementById('week-range').textContent = `${startStr} - ${endStr}`;
    }

    async loadMembers() {
        try {
            const response = await api.get('/api/family/members');
            this.members = response.data.filter(m => m.activo);
            console.log('✅ Miembros cargados:', this.members);
        } catch (error) {
            console.error('❌ Error cargando miembros:', error);
        }
    }

    async loadSchedule() {
        try {
            const weekStart = this.currentWeek.start.toISOString().split('T')[0];
            const response = await api.get(`/api/cleaning/schedule?week_start=${weekStart}`);
            this.schedule = response.data || [];
            console.log('✅ Schedule cargado:', this.schedule);
        } catch (error) {
            console.error('❌ Error cargando schedule:', error);
        }
    }

    async initializeCleaning() {
        try {
            const response = await api.post('/api/cleaning/initialize');
            if (response.success) {
                console.log('✅ Catálogo de limpieza inicializado:', response.message);
            }
        } catch (error) {
            console.error('❌ Error inicializando limpieza:', error);
        }
    }

    initializeLucideIcons() {
        if (typeof lucide !== 'undefined') {
            lucide.createIcons();
        }
    }

    setupDropdownListeners() {
        // Close dropdowns when clicking outside
        document.addEventListener('click', (e) => {
            if (!e.target.closest('.custom-dropdown')) {
                document.querySelectorAll('.dropdown-content').forEach(dd => {
                    dd.classList.remove('show');
                    dd.previousElementSibling.classList.remove('active');
                });
            }
        });
    }

    async generateWeek() {
        try {
            const weekStart = this.currentWeek.start.toISOString().split('T')[0];
            const response = await api.post('/api/cleaning/generate', {
                week_start: weekStart,
                regenerate: true
            });
            
            if (response.success) {
                console.log('✅ Semana generada:', response.message);
                await this.loadSchedule();
                this.renderWeekGrid();
                this.renderSummary();
                this.initializeLucideIcons();
                this.showNotification('Plan semanal generado exitosamente', 'success');
            }
        } catch (error) {
            console.error('❌ Error generando semana:', error);
            this.showNotification('Error generando plan semanal', 'error');
        }
    }

    renderWeekGrid() {
        const grid = document.getElementById('week-grid');
        const days = ['lunes', 'martes', 'miercoles', 'jueves', 'viernes', 'sabado', 'domingo'];
        const dayNames = ['Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado', 'Domingo'];
        
        grid.innerHTML = '';
        
        // Header
        const header = document.createElement('div');
        header.className = 'week-header';
        dayNames.forEach((day, index) => {
            const dayHeader = document.createElement('div');
            dayHeader.className = 'day-header';
            
            // Calculate day stats
            const dayTasks = this.getFilteredTasks().filter(task => {
                const taskDate = new Date(task.fecha_programada);
                return taskDate.getDay() === (index + 1) % 7;
            });
            
            const totalTasks = dayTasks.length;
            const totalMinutes = dayTasks.reduce((sum, task) => sum + (task.duracion_minutos || 0), 0);
            const hours = Math.floor(totalMinutes / 60);
            const minutes = totalMinutes % 60;
            const timeStr = hours > 0 ? `${hours}h ${minutes}m` : `${minutes}m`;
            
            dayHeader.innerHTML = `
                <div class="day-name">${day}</div>
                <div class="day-date">${this.formatDate(this.currentWeek.start, index)}</div>
                <div class="day-stats">
                    <div class="day-tasks-count">
                        <i data-lucide="check-square" style="width: 12px; height: 12px;"></i>
                        <span>${totalTasks} tareas</span>
                    </div>
                    <div class="day-time-count">
                        <i data-lucide="clock" style="width: 12px; height: 12px;"></i>
                        <span>${timeStr}</span>
                    </div>
                </div>
            `;
            header.appendChild(dayHeader);
        });
        grid.appendChild(header);
        
        // Tasks grid
        const tasksGrid = document.createElement('div');
        tasksGrid.className = 'tasks-grid';
        
        days.forEach((day, dayIndex) => {
            const dayColumn = document.createElement('div');
            dayColumn.className = 'day-column';
            dayColumn.dataset.day = day;
            
            // Filter tasks for this day
            const dayTasks = this.getFilteredTasks().filter(task => {
                const taskDate = new Date(task.fecha_programada);
                return taskDate.getDay() === (dayIndex + 1) % 7;
            });
            
            dayTasks.forEach(task => {
                const taskCard = this.createTaskCard(task);
                dayColumn.appendChild(taskCard);
            });
            
            // Add "more tasks" indicator
            const remainingTasks = dayTasks.length - 3; // Show max 3 tasks
            if (remainingTasks > 0) {
                const moreIndicator = document.createElement('div');
                moreIndicator.className = 'more-tasks';
                moreIndicator.textContent = `+${remainingTasks} más`;
                dayColumn.appendChild(moreIndicator);
            }
            
            tasksGrid.appendChild(dayColumn);
        });
        
        grid.appendChild(tasksGrid);
        
        // Initialize Lucide icons for new elements
        this.initializeLucideIcons();
    }

    createTaskCard(task) {
        const card = document.createElement('div');
        card.className = `task-card ${task.completada ? 'completed' : ''} ${this.isOverdue(task) ? 'overdue' : ''}`;
        card.dataset.taskId = task.id;
        card.dataset.area = task.area;
        card.dataset.memberId = task.member_id;
        
        const member = this.members.find(m => m.id === task.member_id);
        const memberColor = member ? member.avatar_color : '#666';
        const memberName = member ? member.nombre : task.member_nombre;
        
        card.innerHTML = `
            <div class="task-header">
                <div class="task-icon" style="flex-shrink: 0; color: var(--gaudi-gold);">
                    ${this.getTaskIcon(task.area)}
                </div>
                <div class="task-title">${task.task_nombre}</div>
            </div>
            <div class="task-assignee">
                <div class="assignee-avatar" style="background-color: ${memberColor}">
                    ${memberName.charAt(0).toUpperCase()}
                </div>
                <div class="assignee-name">${memberName}</div>
            </div>
            <div class="task-footer">
                <span class="task-duration">
                    <i data-lucide="clock" style="width: 14px; height: 14px;"></i>
                    ${task.duracion_minutos} min
                </span>
                <span class="task-area">
                    <i data-lucide="home" style="width: 14px; height: 14px;"></i>
                    ${this.getAreaLabel(task.area)}
                </span>
            </div>
            <div class="task-actions">
                <button class="task-checkbox ${task.completada ? 'checked' : ''}" 
                        onclick="cleaningManager.toggleComplete(${task.id})">
                    ${task.completada ? '<i data-lucide="check" style="width: 16px; height: 16px;"></i>' : ''}
                </button>
            </div>
        `;
        
        // Add click event for task details
        card.addEventListener('click', (e) => {
            if (!e.target.classList.contains('task-checkbox')) {
                this.showTaskDetails(task);
            }
        });
        
        return card;
    }

    getTaskIcon(area) {
        const icons = {
            cocina: 'utensils',
            bano: 'bath',
            salon: 'sofa',
            dormitorio: 'bed',
            general: 'home',
            exterior: 'trees',
            mascotas: 'heart'
        };
        return `<i data-lucide="${icons[area] || 'sparkles'}"></i>`;
    }

    getAreaLabel(area) {
        const labels = {
            cocina: 'Cocina',
            bano: 'Baño',
            salon: 'Salón',
            dormitorio: 'Dormitorio',
            general: 'General',
            exterior: 'Exterior',
            mascotas: 'Mascotas'
        };
        return labels[area] || area;
    }

    isOverdue(task) {
        if (task.completada) return false;
        const taskDate = new Date(task.fecha_programada);
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        return taskDate < today;
    }

    formatDate(startDate, dayIndex) {
        const date = new Date(startDate);
        date.setDate(date.getDate() + dayIndex);
        return date.getDate();
    }

    getFilteredTasks() {
        let filtered = [...this.schedule];
        
        if (this.filters.member) {
            filtered = filtered.filter(task => task.member_id == this.filters.member);
        }
        
        if (this.filters.area) {
            filtered = filtered.filter(task => task.area === this.filters.area);
        }
        
        return filtered;
    }

    renderSummary() {
        const summaryGrid = document.getElementById('summary-grid');
        if (!summaryGrid) return;
        
        // Verificar que los miembros estén cargados
        if (!this.members || this.members.length === 0) {
            console.warn('⚠️ Miembros no cargados, esperando...');
            setTimeout(() => this.renderSummary(), 500);
            return;
        }
        
        summaryGrid.innerHTML = '';
        
        // Calculate stats per member
        const memberStats = {};
        this.getFilteredTasks().forEach(task => {
            const memberId = task.member_id;
            if (!memberStats[memberId]) {
                const member = this.members.find(m => m.id === memberId);
                memberStats[memberId] = {
                    member: member,
                    total: 0,
                    completed: 0,
                    minutes: 0
                };
            }
            
            memberStats[memberId].total++;
            memberStats[memberId].minutes += task.duracion_minutos || 0;
            if (task.completada) {
                memberStats[memberId].completed++;
            }
        });
        
        // Render member summaries
        Object.values(memberStats).forEach(stat => {
            // Skip if member is not found
            if (!stat.member) {
                console.warn('⚠️ Miembro no encontrado para estadísticas:', stat);
                return;
            }
            
            const completionRate = stat.total > 0 ? (stat.completed / stat.total * 100) : 0;
            const hours = Math.floor(stat.minutes / 60);
            const minutes = stat.minutes % 60;
            
            const avatarColor = stat.member.avatar_color || '#4A90E2'; // Color por defecto
            
            const summaryCard = document.createElement('div');
            summaryCard.className = 'summary-card';
            summaryCard.innerHTML = `
                <div class="summary-header" style="border-left: 3px solid ${avatarColor}">
                    <div class="summary-avatar" style="background-color: ${avatarColor}">
                        ${stat.member.nombre.charAt(0).toUpperCase()}
                    </div>
                    <div class="summary-info">
                        <div class="summary-name">${stat.member.nombre}</div>
                        <div class="summary-stats">
                            ${stat.completed}/${stat.total} tareas (${completionRate.toFixed(0)}%)
                        </div>
                    </div>
                </div>
                <div class="summary-time">
                    <i data-lucide="clock" style="width: 14px; height: 14px; margin-right: 4px;"></i>
                    ${hours}h ${minutes}min
                </div>
                <div class="summary-progress">
                    <div class="progress-bar">
                        <div class="progress-fill" style="width: ${completionRate}%"></div>
                    </div>
                </div>
            `;
            
            summaryGrid.appendChild(summaryCard);
        });
        
        // Initialize Lucide icons for new elements
        this.initializeLucideIcons();
    }

    populateFilters() {
        // Populate member dropdown
        const memberDropdown = document.getElementById('member-dropdown');
        memberDropdown.innerHTML = '<div class="dropdown-item" onclick="cleaningManager.selectMember(\'\')">Todos los miembros</div>';
        
        this.members.forEach(member => {
            const item = document.createElement('div');
            item.className = 'dropdown-item';
            item.textContent = member.nombre;
            item.onclick = () => this.selectMember(member.id);
            memberDropdown.appendChild(item);
        });
    }

    toggleDropdown(dropdownId) {
        const dropdown = document.getElementById(dropdownId);
        const trigger = dropdown.previousElementSibling;
        
        // Close all other dropdowns
        document.querySelectorAll('.dropdown-content').forEach(dd => {
            if (dd.id !== dropdownId) {
                dd.classList.remove('show');
                dd.previousElementSibling.classList.remove('active');
            }
        });
        
        // Toggle current dropdown
        dropdown.classList.toggle('show');
        trigger.classList.toggle('active');
    }

    selectMember(memberId) {
        this.filters.member = memberId;
        
        // Update display
        const selectedText = memberId ? 
            this.members.find(m => m.id == memberId)?.nombre || 'Todos los miembros' : 
            'Todos los miembros';
        document.getElementById('member-selected').textContent = selectedText;
        
        // Close dropdown
        document.getElementById('member-dropdown').classList.remove('show');
        document.getElementById('member-dropdown').previousElementSibling.classList.remove('active');
        
        // Update display
        this.renderWeekGrid();
        this.renderSummary();
    }

    selectArea(area) {
        this.filters.area = area;
        
        // Update display
        const areaLabels = {
            '': 'Todas las áreas',
            'cocina': 'Cocina',
            'bano': 'Baños',
            'salon': 'Salón',
            'dormitorio': 'Dormitorios',
            'general': 'General',
            'exterior': 'Exterior',
            'mascotas': 'Mascotas'
        };
        document.getElementById('area-selected').textContent = areaLabels[area] || 'Todas las áreas';
        
        // Close dropdown
        document.getElementById('area-dropdown').classList.remove('show');
        document.getElementById('area-dropdown').previousElementSibling.classList.remove('active');
        
        // Update display
        this.renderWeekGrid();
        this.renderSummary();
    }

    filterByMember(memberId) {
        this.selectMember(memberId);
    }

    filterByArea(area) {
        this.selectArea(area);
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
                task.completada_at = newStatus ? new Date().toISOString() : null;
                this.renderWeekGrid();
                this.renderSummary();
                this.showNotification(
                    newStatus ? 'Tarea marcada como completada' : 'Tarea marcada como pendiente',
                    'success'
                );
            }
        } catch (error) {
            console.error('❌ Error cambiando estado de tarea:', error);
            this.showNotification('Error cambiando estado de tarea', 'error');
        }
    }

    getCurrentUserId() {
        // TODO: Implementar sistema de autenticación
        // Por ahora, devolver el primer miembro adulto
        const adultMember = this.members.find(m => m.tipo === 'adulto');
        return adultMember ? adultMember.id : 1;
    }

    showTaskDetails(task) {
        // TODO: Implementar modal de detalles de tarea
        console.log('Mostrar detalles de tarea:', task);
    }

    showStats() {
        // TODO: Implementar vista de estadísticas
        console.log('Mostrar estadísticas');
    }

    previousWeek() {
        this.currentWeek.start.setDate(this.currentWeek.start.getDate() - 7);
        this.currentWeek.end.setDate(this.currentWeek.end.getDate() - 7);
        this.updateWeekDisplay();
        this.loadSchedule();
        this.renderWeekGrid();
        this.renderSummary();
    }

    nextWeek() {
        this.currentWeek.start.setDate(this.currentWeek.start.getDate() + 7);
        this.currentWeek.end.setDate(this.currentWeek.end.getDate() + 7);
        this.updateWeekDisplay();
        this.loadSchedule();
        this.renderWeekGrid();
        this.renderSummary();
    }

    showNotification(message, type = 'info') {
        // Simple notification system
        const notification = document.createElement('div');
        notification.className = `notification notification-${type}`;
        notification.textContent = message;
        notification.style.cssText = `
            position: fixed;
            top: 20px;
            right: 20px;
            padding: 12px 20px;
            border-radius: 8px;
            color: white;
            font-weight: 500;
            z-index: 1000;
            transition: all 0.3s ease;
        `;
        
        if (type === 'success') {
            notification.style.backgroundColor = '#10b981';
        } else if (type === 'error') {
            notification.style.backgroundColor = '#ef4444';
        } else {
            notification.style.backgroundColor = '#3b82f6';
        }
        
        document.body.appendChild(notification);
        
        setTimeout(() => {
            notification.style.opacity = '0';
            setTimeout(() => {
                document.body.removeChild(notification);
            }, 300);
        }, 3000);
    }
}

// Instancia global
const cleaningManager = new CleaningManager();
