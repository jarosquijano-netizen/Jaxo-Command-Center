/**
 * Family Manager - Gestión de perfiles familiares
 */

class FamilyManager {
    constructor() {
        this.members = [];
        this.init();
    }

    async init() {
        await this.loadMembers();
        this.setupEventListeners();
        this.render();
    }

    async loadMembers() {
        try {
            const response = await api.get('/api/family/members');
            this.members = response.data || [];
            console.log('✅ Miembros cargados:', this.members);
        } catch (error) {
            console.error('❌ Error cargando miembros:', error);
        }
    }

    setupEventListeners() {
        // Event listeners para el formulario de añadir miembro
        const addMemberForm = document.getElementById('add-member-form');
        if (addMemberForm) {
            addMemberForm.addEventListener('submit', (e) => {
                e.preventDefault();
                this.addMember();
            });
        }
    }

    async addMember() {
        const form = document.getElementById('add-member-form');
        const formData = new FormData(form);
        
        const memberData = {
            name: formData.get('name'),
            age: parseInt(formData.get('age')),
            role: formData.get('role'),
            dietary_preferences: formData.get('dietary_preferences')?.split(',').map(p => p.trim()) || [],
            allergies: formData.get('allergies')?.split(',').map(a => a.trim()) || [],
            favorite_foods: formData.get('favorite_foods')?.split(',').map(f => f.trim()) || [],
            disliked_foods: formData.get('disliked_foods')?.split(',').map(f => f.trim()) || [],
            cleaning_capacity: parseInt(formData.get('cleaning_capacity')) || 1
        };

        try {
            const response = await api.post('/api/family/members', memberData);
            this.members.push(response.data);
            this.render();
            form.reset();
            this.showNotification('Miembro añadido exitosamente', 'success');
        } catch (error) {
            console.error('❌ Error añadiendo miembro:', error);
            this.showNotification('Error al añadir miembro', 'error');
        }
    }

    async updateMember(memberId, memberData) {
        try {
            const response = await api.put(`/api/family/members/${memberId}`, memberData);
            const index = this.members.findIndex(m => m.id === memberId);
            if (index !== -1) {
                this.members[index] = response.data;
            }
            this.render();
            this.showNotification('Miembro actualizado exitosamente', 'success');
        } catch (error) {
            console.error('❌ Error actualizando miembro:', error);
            this.showNotification('Error al actualizar miembro', 'error');
        }
    }

    async deleteMember(memberId) {
        if (!confirm('¿Estás seguro de eliminar este miembro?')) return;

        try {
            await api.delete(`/api/family/members/${memberId}`);
            this.members = this.members.filter(m => m.id !== memberId);
            this.render();
            this.showNotification('Miembro eliminado exitosamente', 'success');
        } catch (error) {
            console.error('❌ Error eliminando miembro:', error);
            this.showNotification('Error al eliminar miembro', 'error');
        }
    }

    render() {
        const familySection = document.getElementById('family');
        if (!familySection) return;

        const membersGrid = familySection.querySelector('.members-grid');
        if (!membersGrid) return;

        const membersHTML = this.members.map(member => this.renderMemberCard(member)).join('');
        membersGrid.innerHTML = membersHTML;
        
        // Re-inicializar Lucide icons
        lucide.createIcons();
    }

    renderMemberCard(member) {
        const isEmpleado = member.rol_hogar === 'empleado_hogar';
        const isNino = member.tipo === 'nino';
        
        return `
            <div class="member-card">
                <div class="member-avatar" style="background-color: ${member.avatar_color}">
                    <span class="member-emoji">${member.emoji}</span>
                </div>
                <div class="member-info">
                    <h3>${member.nombre}</h3>
                    <div class="member-badges">
                        <span class="badge ${isEmpleado ? 'badge-empleado' : 'badge-familia'}">
                            ${isEmpleado ? 'Empleado' : 'Familia'}
                        </span>
                        <span class="badge badge-tipo">
                            ${isNino ? `${member.edad} años` : 'Adulto'}
                        </span>
                    </div>
                    <div class="member-tasks">
                        ${member.puede_cocinar ? '<span class="task-badge cooking">🍳</span>' : ''}
                        ${member.puede_limpiar ? '<span class="task-badge cleaning">🧹</span>' : ''}
                        ${member.puede_compras ? '<span class="task-badge shopping">🛒</span>' : ''}
                    </div>
                    ${isEmpleado ? `
                        <div class="employee-schedule">
                            <span class="schedule-info">
                                <i data-lucide="clock"></i>
                                ${member.horario_entrada} - ${member.horario_salida}
                            </span>
                            <span class="schedule-days">
                                ${member.dias_trabajo.join(', ')}
                            </span>
                        </div>
                    ` : ''}
                </div>
                <div class="member-actions">
                    <button class="btn-icon" onclick="familyManager.editMember(${member.id})">
                        <i data-lucide="edit-2"></i>
                    </button>
                    <button class="btn-icon btn-danger" onclick="familyManager.deleteMember(${member.id})">
                        <i data-lucide="trash-2"></i>
                    </button>
                </div>
            </div>
        `;
    }

    showAddMemberForm() {
        const modal = document.getElementById('add-member-modal');
        if (modal) {
            modal.classList.remove('hidden');
        }
    }

    hideAddMemberForm() {
        const modal = document.getElementById('add-member-modal');
        if (modal) {
            modal.classList.add('hidden');
        }
    }

    editMember(memberId) {
        const member = this.members.find(m => m.id === memberId);
        if (!member) return;
        
        // Create modal for editing
        const modal = document.createElement('div');
        modal.className = 'modal';
        modal.innerHTML = `
            <div class="modal-content">
                <h3>Editar Miembro: ${member.nombre}</h3>
                <form id="edit-member-form">
                    <div class="form-group">
                        <label>Nombre</label>
                        <input type="text" name="nombre" value="${member.nombre}" required>
                    </div>
                    <div class="form-group">
                        <label>Edad</label>
                        <input type="number" name="edad" value="${member.edad}" required>
                    </div>
                    <div class="form-group">
                        <label>Tipo</label>
                        <select name="tipo" required>
                            <option value="adulto" ${member.tipo === 'adulto' ? 'selected' : ''}>Adulto</option>
                            <option value="nino" ${member.tipo === 'nino' ? 'selected' : ''}>Niño</option>
                        </select>
                    </div>
                    <div class="form-group">
                        <label>Rol en Hogar</label>
                        <select name="rol_hogar" required>
                            <option value="familia" ${member.rol_hogar === 'familia' ? 'selected' : ''}>Familia</option>
                            <option value="empleado_hogar" ${member.rol_hogar === 'empleado_hogar' ? 'selected' : ''}>Empleado Hogar</option>
                        </select>
                    </div>
                    <div class="form-group">
                        <label>Color Avatar</label>
                        <input type="color" name="avatar_color" value="${member.avatar_color}">
                    </div>
                    <div class="form-group">
                        <label>Emoji</label>
                        <input type="text" name="emoji" value="${member.emoji}" maxlength="2">
                    </div>
                    
                    <div class="form-section">
                        <h4>Capacidades</h4>
                        <div class="checkbox-group">
                            <label>
                                <input type="checkbox" name="puede_cocinar" ${member.puede_cocinar ? 'checked' : ''}>
                                Puede cocinar
                            </label>
                            <label>
                                <input type="checkbox" name="puede_limpiar" ${member.puede_limpiar ? 'checked' : ''}>
                                Puede limpiar
                            </label>
                            <label>
                                <input type="checkbox" name="puede_compras" ${member.puede_compras ? 'checked' : ''}>
                                Puede hacer compras
                            </label>
                        </div>
                    </div>
                    
                    <!-- Adult-specific fields -->
                    <div class="form-section" id="adult-fields">
                        <h4>Preferencias Alimentarias</h4>
                        <div class="form-group">
                            <label>Objetivo Alimentario</label>
                            <select name="objetivo_alimentario">
                                <option value="Mantener" ${member.objetivo_alimentario === 'Mantener' ? 'selected' : ''}>Mantener</option>
                                <option value="Salud" ${member.objetivo_alimentario === 'Salud' ? 'selected' : ''}>Salud</option>
                                <option value="Perder peso" ${member.objetivo_alimentario === 'Perder peso' ? 'selected' : ''}>Perder peso</option>
                                <option value="Ganar músculo" ${member.objetivo_alimentario === 'Ganar músculo' ? 'selected' : ''}>Ganar músculo</option>
                            </select>
                        </div>
                        <div class="form-group">
                            <label>Estilo Alimentación</label>
                            <select name="estilo_alimentacion">
                                <option value="Mediterranea" ${member.estilo_alimentacion === 'Mediterranea' ? 'selected' : ''}>Mediterránea</option>
                                <option value="Tradicional" ${member.estilo_alimentacion === 'Tradicional' ? 'selected' : ''}>Tradicional</option>
                                <option value="Internacional" ${member.estilo_alimentacion === 'Internacional' ? 'selected' : ''}>Internacional</option>
                            </select>
                        </div>
                        <div class="form-group">
                            <label>Nivel Picante</label>
                            <select name="nivel_picante">
                                <option value="Nada" ${member.nivel_picante === 'Nada' ? 'selected' : ''}>Nada</option>
                                <option value="Suave" ${member.nivel_picante === 'Suave' ? 'selected' : ''}>Suave</option>
                                <option value="Medio" ${member.nivel_picante === 'Medio' ? 'selected' : ''}>Medio</option>
                                <option value="Fuerte" ${member.nivel_picante === 'Fuerte' ? 'selected' : ''}>Fuerte</option>
                            </select>
                        </div>
                        <div class="form-group">
                            <label>Alergias (separadas por comas)</label>
                            <input type="text" name="alergias" value="${member.alergias ? member.alergias.join(', ') : ''}" placeholder="nueces, mariscos...">
                        </div>
                        <div class="form-group">
                            <label>Plato Favorito</label>
                            <input type="text" name="plato_favorito" value="${member.plato_favorito || ''}" placeholder="Paella">
                        </div>
                    </div>
                    
                    <!-- Child-specific fields -->
                    <div class="form-section" id="child-fields" style="display: none;">
                        <h4>Preferencias Infantiles</h4>
                        <div class="form-group">
                            <label>Come Solo</label>
                            <select name="come_solo">
                                <option value="Solo" ${member.come_solo === 'Solo' ? 'selected' : ''}>Solo</option>
                                <option value="Con ayuda" ${member.come_solo === 'Con ayuda' ? 'selected' : ''}>Con ayuda</option>
                                <option value="Necesita mucha ayuda" ${member.come_solo === 'Necesita mucha ayuda' ? 'selected' : ''}>Necesita mucha ayuda</option>
                            </select>
                        </div>
                        <div class="form-group">
                            <label>Nivel Exigencia</label>
                            <select name="nivel_exigencia">
                                <option value="Bajo" ${member.nivel_exigencia === 'Bajo' ? 'selected' : ''}>Bajo</option>
                                <option value="Medio" ${member.nivel_exigencia === 'Medio' ? 'selected' : ''}>Medio</option>
                                <option value="Alto" ${member.nivel_exigencia === 'Alto' ? 'selected' : ''}>Alto</option>
                            </select>
                        </div>
                        <div class="form-group">
                            <label>Acepta Comida Nueva</label>
                            <select name="acepta_comida_nueva">
                                <option value="Sí" ${member.acepta_comida_nueva === 'Sí' ? 'selected' : ''}>Sí</option>
                                <option value="A veces" ${member.acepta_comida_nueva === 'A veces' ? 'selected' : ''}>A veces</option>
                                <option value="No" ${member.acepta_comida_nueva === 'No' ? 'selected' : ''}>No</option>
                            </select>
                        </div>
                        <div class="form-group">
                            <label>Comentarios de los Padres</label>
                            <textarea name="comentarios_padres" rows="3">${member.comentarios_padres || ''}</textarea>
                        </div>
                    </div>
                    
                    <!-- Employee-specific fields -->
                    <div class="form-section" id="employee-fields" style="display: none;">
                        <h4>Información Laboral</h4>
                        <div class="form-group">
                            <label>Días de Trabajo</label>
                            <div class="checkbox-group">
                                <label><input type="checkbox" name="dias_trabajo_lunes" ${member.dias_trabajo?.includes('lunes') ? 'checked' : ''}> Lunes</label>
                                <label><input type="checkbox" name="dias_trabajo_martes" ${member.dias_trabajo?.includes('martes') ? 'checked' : ''}> Martes</label>
                                <label><input type="checkbox" name="dias_trabajo_miercoles" ${member.dias_trabajo?.includes('miercoles') ? 'checked' : ''}> Miércoles</label>
                                <label><input type="checkbox" name="dias_trabajo_jueves" ${member.dias_trabajo?.includes('jueves') ? 'checked' : ''}> Jueves</label>
                                <label><input type="checkbox" name="dias_trabajo_viernes" ${member.dias_trabajo?.includes('viernes') ? 'checked' : ''}> Viernes</label>
                            </div>
                        </div>
                        <div class="form-group">
                            <label>Horario</label>
                            <div style="display: flex; gap: var(--spacing-sm);">
                                <input type="time" name="horario_entrada" value="${member.horario_entrada || ''}" style="flex: 1;">
                                <span>a</span>
                                <input type="time" name="horario_salida" value="${member.horario_salida || ''}" style="flex: 1;">
                            </div>
                        </div>
                        <div class="form-group">
                            <label>Notas del Empleador</label>
                            <textarea name="notas_empleador" rows="3">${member.notas_empleador || ''}</textarea>
                        </div>
                    </div>
                    
                    <!-- Task percentages -->
                    <div class="form-section">
                        <h4>Porcentajes de Tareas</h4>
                        <div class="slider-group">
                            <label>Limpieza: ${member.porcentaje_tareas_limpieza}%</label>
                            <input type="range" name="porcentaje_tareas_limpieza" min="0" max="100" value="${member.porcentaje_tareas_limpieza}">
                        </div>
                        <div class="slider-group">
                            <label>Cocina: ${member.porcentaje_tareas_cocina}%</label>
                            <input type="range" name="porcentaje_tareas_cocina" min="0" max="100" value="${member.porcentaje_tareas_cocina}">
                        </div>
                    </div>
                    
                    <div class="form-actions">
                        <button type="submit" class="btn-primary">Guardar</button>
                        <button type="button" class="btn-secondary" onclick="familyManager.closeEditModal()">Cancelar</button>
                    </div>
                </form>
            </div>
        `;
        
        document.body.appendChild(modal);
        
        // Setup form submission
        const form = document.getElementById('edit-member-form');
        form.addEventListener('submit', (e) => {
            e.preventDefault();
            this.updateMember(memberId, this.getFormData(form));
        });
        
        // Setup type change handler
        const tipoSelect = form.querySelector('[name="tipo"]');
        tipoSelect.addEventListener('change', (e) => {
            this.toggleFieldsByType(e.target.value);
        });
        
        // Setup role change handler
        const rolSelect = form.querySelector('[name="rol_hogar"]');
        rolSelect.addEventListener('change', (e) => {
            this.toggleFieldsByRole(e.target.value);
        });
        
        // Initialize field visibility
        this.toggleFieldsByType(member.tipo);
        this.toggleFieldsByRole(member.rol_hogar);
        
        // Setup sliders
        const sliders = modal.querySelectorAll('input[type="range"]');
        sliders.forEach(slider => {
            slider.addEventListener('input', (e) => {
                const label = e.target.previousElementSibling;
                const value = e.target.value;
                const name = e.target.name;
                if (name === 'porcentaje_tareas_limpieza') {
                    label.textContent = `Limpieza: ${value}%`;
                } else if (name === 'porcentaje_tareas_cocina') {
                    label.textContent = `Cocina: ${value}%`;
                }
            });
        });
        
        // Setup modal close on background click
        modal.addEventListener('click', (e) => {
            if (e.target === modal) {
                this.closeEditModal();
            }
        });
    }

    closeEditModal() {
        const modal = document.querySelector('.modal');
        if (modal) {
            document.body.removeChild(modal);
        }
    }

    toggleFieldsByType(tipo) {
        const adultFields = document.getElementById('adult-fields');
        const childFields = document.getElementById('child-fields');
        
        if (tipo === 'nino') {
            adultFields.style.display = 'none';
            childFields.style.display = 'block';
        } else {
            adultFields.style.display = 'block';
            childFields.style.display = 'none';
        }
    }

    toggleFieldsByRole(rol) {
        const employeeFields = document.getElementById('employee-fields');
        
        if (rol === 'empleado_hogar') {
            employeeFields.style.display = 'block';
        } else {
            employeeFields.style.display = 'none';
        }
    }

    getFormData(form) {
        const formData = new FormData(form);
        const data = {};
        
        // Basic fields
        for (let [key, value] of formData.entries()) {
            if (key.includes('porcentaje_')) {
                data[key] = parseInt(value);
            } else if (key === 'puede_cocinar' || key === 'puede_limpiar' || key === 'puede_compras') {
                data[key] = value === 'on';
            } else if (key.includes('dias_trabajo_')) {
                // Handle work days checkboxes
                if (!data.dias_trabajo) data.dias_trabajo = [];
                const day = key.replace('dias_trabajo_', '');
                if (value === 'on') data.dias_trabajo.push(day);
            } else {
                data[key] = value;
            }
        }
        
        // Handle arrays
        if (data.alergias) {
            data.alergias = data.alergias.split(',').map(s => s.trim()).filter(s => s);
        }
        
        return data;
    }

    showNotification(message, type = 'info') {
        // TODO: Implementar sistema de notificaciones
        console.log(`${type.toUpperCase()}: ${message}`);
    }
}

// Instancia global
const familyManager = new FamilyManager();
