/**
 * Family Manager — Gestión de perfiles familiares
 * Campos completos para adultos y niños según briefing k[AI]tchen
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

    // ============================================================
    // DATA LOADING
    // ============================================================

    async loadMembers() {
        try {
            const response = await api.get('/api/family/members');
            this.members = response.data || [];
        } catch (error) {
            console.error('Error cargando miembros:', error);
            this.showNotification('Error al cargar los perfiles familiares', 'error');
        }
    }

    setupEventListeners() {
        document.addEventListener('click', (e) => {
            if (e.target.classList.contains('modal-backdrop')) {
                this.closeModal();
            }
        });
    }

    // ============================================================
    // RENDER MEMBERS GRID
    // ============================================================

    render() {
        const membersGrid = document.querySelector('#family .members-grid');
        if (!membersGrid) return;

        if (this.members.length === 0) {
            membersGrid.innerHTML = `
                <div class="empty-state">
                    <div class="empty-icon"><span class="material-symbols-outlined" style="font-size:48px">family_restroom</span></div>
                    <h3>No hay perfiles aún</h3>
                    <p>Añade los miembros de tu familia para que la IA pueda generar menús personalizados.</p>
                    <button class="btn-primary" onclick="familyManager.showAddMemberForm()">
                        <i data-lucide="user-plus"></i> Añadir primer miembro
                    </button>
                </div>`;
            if (typeof lucide !== 'undefined') lucide.createIcons();
            return;
        }

        membersGrid.innerHTML = this.members.map(m => this.renderMemberCard(m)).join('');
        if (typeof lucide !== 'undefined') lucide.createIcons();
    }

    renderMemberCard(member) {
        const completeness = this.calcCompleteness(member);
        const isNino = member.tipo === 'nino';
        const isEmpleado = member.rol_hogar === 'empleado_hogar';
        const roleLabel = isEmpleado ? 'Empleado' : (isNino ? 'Niño/a' : 'Adulto/a');
        const roleBadgeClass = isEmpleado ? 'badge-empleado' : (isNino ? 'badge-nino' : 'badge-adulto');

        const completenessColor = completeness >= 80 ? '#10B981' : completeness >= 50 ? '#F59E0B' : '#EF4444';
        const completenessLabel = completeness >= 80 ? 'Perfil completo' : completeness >= 50 ? 'Perfil parcial' : 'Perfil incompleto';

        const allergiesHtml = member.alergias && member.alergias.length
            ? member.alergias.slice(0, 3).map(a => `<span class="tag tag-alergia">${a}</span>`).join('')
            : '';

        const taskBadges = [
            member.puede_cocinar ? 'cocina' : '',
            member.puede_limpiar ? 'limpieza' : '',
            member.puede_compras ? 'compras' : '',
        ].filter(Boolean).join(' ');

        return `
        <div class="member-card glass-card" data-id="${member.id}">
            <div class="member-card-header">
                <div class="member-avatar-wrap">
                    <div class="member-avatar" style="background: ${member.avatar_color}">
                        <span class="material-symbols-outlined" style="font-size:20px">${isNino ? 'child_care' : 'person'}</span>
                    </div>
                    <div class="completeness-ring" title="${completenessLabel}: ${completeness}%"
                         style="--pct:${completeness}; --color:${completenessColor}">
                        <span>${completeness}%</span>
                    </div>
                </div>
                <div class="member-card-info">
                    <h3>${member.nombre}</h3>
                    <div class="member-meta">
                        <span class="badge ${roleBadgeClass}">${roleLabel}</span>
                        <span class="member-age">${member.edad} años</span>
                    </div>
                    ${taskBadges ? `<div class="task-badges">${taskBadges}</div>` : ''}
                </div>
                <div class="member-card-actions">
                    <button class="btn-icon" title="Editar perfil" onclick="familyManager.editMember(${member.id})">
                        <i data-lucide="edit-2"></i>
                    </button>
                    <button class="btn-icon btn-danger" title="Eliminar" onclick="familyManager.deleteMember(${member.id})">
                        <i data-lucide="trash-2"></i>
                    </button>
                </div>
            </div>

            ${member.plato_favorito ? `
            <div class="member-card-detail">
                <i data-lucide="heart"></i>
                <span>Favorito: <strong>${member.plato_favorito}</strong></span>
            </div>` : ''}

            ${allergiesHtml ? `
            <div class="member-card-tags">
                <span class="tags-label">Alergias:</span>
                ${allergiesHtml}
            </div>` : ''}

            ${completeness < 80 ? `
            <button class="btn-complete-profile" onclick="familyManager.editMember(${member.id})">
                <i data-lucide="arrow-right"></i> Completar perfil
            </button>` : ''}
        </div>`;
    }

    calcCompleteness(member) {
        const isNino = member.tipo === 'nino';
        let filled = 0;
        let total = 0;

        const check = (val) => {
            total++;
            if (val !== null && val !== undefined && val !== '' && !(Array.isArray(val) && val.length === 0)) filled++;
        };

        // Campos comunes
        check(member.nombre);
        check(member.edad);
        check(member.emoji);

        if (isNino) {
            check(member.come_solo);
            check(member.nivel_exigencia);
            check(member.acepta_comida_nueva);
            check(member.alergias);
            check(member.desayuno_preferido);
            check(member.plato_favorito);
            check(member.plato_nunca_comeria);
            check(member.verduras_aceptadas);
            check(member.texturas_no_gustan);
        } else {
            check(member.objetivo_alimentario);
            check(member.estilo_alimentacion);
            check(member.nivel_picante);
            check(member.alergias);
            check(member.intolerancias);
            check(member.ingredientes_no_gustan);
            check(member.plato_favorito);
            check(member.tiempo_max_cocinar);
            check(member.nivel_cocina);
            check(member.tipo_desayuno);
        }

        return total === 0 ? 0 : Math.round((filled / total) * 100);
    }

    // ============================================================
    // MODAL — ADD / EDIT
    // ============================================================

    showAddMemberForm() {
        this.openProfileModal(null);
    }

    editMember(memberId) {
        const member = this.members.find(m => m.id === memberId);
        if (member) this.openProfileModal(member);
    }

    openProfileModal(member) {
        this.closeModal();

        const isEdit = !!member;
        const isNino = member?.tipo === 'nino';

        const backdrop = document.createElement('div');
        backdrop.className = 'modal-backdrop';
        backdrop.id = 'family-profile-modal';

        backdrop.innerHTML = `
        <div class="modal-content modal-profile">
            <div class="modal-header">
                <h3>${isEdit ? `Editar perfil: ${member.nombre}` : 'Nuevo miembro'}</h3>
                <button class="close-btn" onclick="familyManager.closeModal()">
                    <i data-lucide="x"></i>
                </button>
            </div>

            <div class="modal-body">
                <form id="profile-form">

                    <!-- SECCIÓN: Datos básicos -->
                    <div class="profile-section">
                        <h4 class="section-title"><i data-lucide="user"></i> Datos básicos</h4>
                        <div class="form-row">
                            <div class="form-group">
                                <label>Nombre *</label>
                                <input type="text" name="nombre" required
                                    value="${member?.nombre || ''}" placeholder="Nombre del miembro">
                            </div>
                            <div class="form-group form-group-sm">
                                <label>Edad *</label>
                                <input type="number" name="edad" required min="0" max="120"
                                    value="${member?.edad || ''}" placeholder="Años">
                            </div>
                        </div>
                        <div class="form-row">
                            <div class="form-group">
                                <label>Tipo *</label>
                                <select name="tipo" id="modal-tipo" onchange="familyManager.onTipoChange(this.value)">
                                    <option value="adulto" ${!isNino ? 'selected' : ''}>Adulto/a</option>
                                    <option value="nino" ${isNino ? 'selected' : ''}>Niño/a</option>
                                </select>
                            </div>
                            <div class="form-group">
                                <label>Rol en hogar</label>
                                <select name="rol_hogar" id="modal-rol"
                                    onchange="familyManager.onRolChange(this.value)">
                                    <option value="familia" ${member?.rol_hogar !== 'empleado_hogar' ? 'selected' : ''}>Familia</option>
                                    <option value="empleado_hogar" ${member?.rol_hogar === 'empleado_hogar' ? 'selected' : ''}>Empleado del hogar</option>
                                </select>
                            </div>
                        </div>
                        <div class="form-row form-row-avatar">
                            <div class="form-group form-group-sm">
                                <label>Emoji</label>
                                <input type="text" name="emoji" maxlength="2"
                                    value="" class="emoji-input" style="display:none">
                            </div>
                            <div class="form-group form-group-sm">
                                <label>Color avatar</label>
                                <div class="color-picker-wrap">
                                    <input type="color" name="avatar_color"
                                        value="${member?.avatar_color || '#4A90E2'}">
                                    <span class="color-presets">
                                        ${['#4A90E2','#F5A623','#9B59B6','#10B981','#EF4444','#D4AF37'].map(c =>
                                            `<span class="color-dot" style="background:${c}"
                                                onclick="document.querySelector('[name=avatar_color]').value='${c}'"></span>`
                                        ).join('')}
                                    </span>
                                </div>
                            </div>
                        </div>
                    </div>

                    <!-- SECCIÓN: Tareas del hogar -->
                    <div class="profile-section">
                        <h4 class="section-title"><i data-lucide="home"></i> Tareas del hogar</h4>
                        <div class="checkbox-row">
                            <label class="checkbox-label">
                                <input type="checkbox" name="puede_cocinar" ${member?.puede_cocinar ? 'checked' : ''}>
                                <span>Puede cocinar</span>
                            </label>
                            <label class="checkbox-label">
                                <input type="checkbox" name="puede_limpiar" ${member?.puede_limpiar ? 'checked' : ''}>
                                <span>Puede limpiar</span>
                            </label>
                            <label class="checkbox-label">
                                <input type="checkbox" name="puede_compras" ${member?.puede_compras ? 'checked' : ''}>
                                <span>Puede hacer compras</span>
                            </label>
                        </div>
                        <div class="slider-group">
                            <label>
                                <span>% Tareas limpieza</span>
                                <strong id="lbl-limpieza">${member?.porcentaje_tareas_limpieza || 0}%</strong>
                            </label>
                            <input type="range" name="porcentaje_tareas_limpieza" min="0" max="100" step="5"
                                value="${member?.porcentaje_tareas_limpieza || 0}"
                                oninput="document.getElementById('lbl-limpieza').textContent=this.value+'%'">
                        </div>
                        <div class="slider-group">
                            <label>
                                <span>% Tareas cocina</span>
                                <strong id="lbl-cocina">${member?.porcentaje_tareas_cocina || 0}%</strong>
                            </label>
                            <input type="range" name="porcentaje_tareas_cocina" min="0" max="100" step="5"
                                value="${member?.porcentaje_tareas_cocina || 0}"
                                oninput="document.getElementById('lbl-cocina').textContent=this.value+'%'">
                        </div>
                    </div>

                    <!-- SECCIÓN: Perfil Adulto -->
                    <div class="profile-section" id="section-adulto" style="display:${!isNino ? 'block' : 'none'}">
                        <h4 class="section-title"><i data-lucide="utensils"></i> Preferencias alimentarias</h4>

                        <div class="form-row">
                            <div class="form-group">
                                <label>Objetivo alimentario</label>
                                <select name="objetivo_alimentario">
                                    <option value="">Seleccionar...</option>
                                    ${['Salud','Perder peso','Ganar músculo','Mantener'].map(o =>
                                        `<option value="${o}" ${member?.objetivo_alimentario === o ? 'selected' : ''}>${o}</option>`
                                    ).join('')}
                                </select>
                            </div>
                            <div class="form-group">
                                <label>Estilo de alimentación</label>
                                <select name="estilo_alimentacion">
                                    <option value="">Seleccionar...</option>
                                    ${['Mediterránea','Tradicional','Internacional','Vegetariana','Vegana','Sin gluten'].map(o =>
                                        `<option value="${o}" ${member?.estilo_alimentacion === o ? 'selected' : ''}>${o}</option>`
                                    ).join('')}
                                </select>
                            </div>
                        </div>

                        <div class="form-row">
                            <div class="form-group">
                                <label>Nivel de picante</label>
                                <select name="nivel_picante">
                                    <option value="">Seleccionar...</option>
                                    ${['Nada','Suave','Medio','Fuerte'].map(o =>
                                        `<option value="${o}" ${member?.nivel_picante === o ? 'selected' : ''}>${o}</option>`
                                    ).join('')}
                                </select>
                            </div>
                            <div class="form-group">
                                <label>Preocupación principal</label>
                                <select name="preocupacion_principal">
                                    <option value="">Seleccionar...</option>
                                    ${['Ninguna','Azúcar','Sal','Grasas saturadas','Calorías','Proteínas'].map(o =>
                                        `<option value="${o}" ${member?.preocupacion_principal === o ? 'selected' : ''}>${o}</option>`
                                    ).join('')}
                                </select>
                            </div>
                        </div>

                        <div class="form-group">
                            <label>Alergias</label>
                            ${this.buildTagInput('alergias', member?.alergias || [], 'Ej: nueces, mariscos, lactosa...')}
                        </div>
                        <div class="form-group">
                            <label>Intolerancias</label>
                            ${this.buildTagInput('intolerancias', member?.intolerancias || [], 'Ej: gluten, lactosa, fructosa...')}
                        </div>
                        <div class="form-group">
                            <label>Ingredientes favoritos</label>
                            ${this.buildTagInput('ingredientes_favoritos', member?.ingredientes_favoritos || [], 'Ej: tomate, pollo, arroz...')}
                        </div>
                        <div class="form-group">
                            <label>Ingredientes que NO le gustan</label>
                            ${this.buildTagInput('ingredientes_no_gustan', member?.ingredientes_no_gustan || [], 'Ej: cebolla, pimiento...')}
                        </div>
                        <div class="form-group">
                            <label>Cocinas favoritas</label>
                            ${this.buildTagInput('cocinas_favoritas', member?.cocinas_favoritas || [], 'Ej: italiana, japonesa, catalana...')}
                        </div>

                        <div class="form-row">
                            <div class="form-group">
                                <label>Restricciones personales/religiosas</label>
                                <input type="text" name="restricciones_religiosas"
                                    value="${member?.restricciones_religiosas || ''}"
                                    placeholder="Ej: halal, kosher, sin cerdo...">
                            </div>
                            <div class="form-group form-group-sm">
                                <label>Tiempo máximo cocinar (min)</label>
                                <input type="number" name="tiempo_max_cocinar" min="5" max="240"
                                    value="${member?.tiempo_max_cocinar || ''}" placeholder="30">
                            </div>
                        </div>

                        <div class="form-row">
                            <div class="form-group">
                                <label>Nivel de cocina</label>
                                <select name="nivel_cocina">
                                    <option value="">Seleccionar...</option>
                                    ${['Principiante','Básico','Intermedio','Avanzado','Chef'].map(o =>
                                        `<option value="${o}" ${member?.nivel_cocina === o ? 'selected' : ''}>${o}</option>`
                                    ).join('')}
                                </select>
                            </div>
                            <div class="form-group">
                                <label>Tipo de desayuno</label>
                                <select name="tipo_desayuno">
                                    <option value="">Seleccionar...</option>
                                    ${['Ligero','Completo','Continental','Sin desayuno','Variable'].map(o =>
                                        `<option value="${o}" ${member?.tipo_desayuno === o ? 'selected' : ''}>${o}</option>`
                                    ).join('')}
                                </select>
                            </div>
                        </div>

                        <div class="form-row">
                            <div class="form-group">
                                <label>Plato favorito</label>
                                <input type="text" name="plato_favorito"
                                    value="${member?.plato_favorito || ''}" placeholder="Ej: Paella valenciana">
                            </div>
                            <div class="form-group">
                                <label>Plato menos favorito</label>
                                <input type="text" name="plato_menos_favorito"
                                    value="${member?.plato_menos_favorito || ''}" placeholder="Ej: Hígado">
                            </div>
                        </div>

                        <label class="checkbox-label" style="margin-bottom: 12px;">
                            <input type="checkbox" name="le_gustan_snacks" ${member?.le_gustan_snacks !== false ? 'checked' : ''}>
                            <span>Le gustan los snacks</span>
                        </label>

                        <div class="form-group">
                            <label>Comentarios adicionales</label>
                            <textarea name="comentarios" rows="3"
                                placeholder="Notas importantes para el generador de menús...">${member?.comentarios || ''}</textarea>
                        </div>
                    </div>

                    <!-- SECCIÓN: Perfil Niño/a -->
                    <div class="profile-section" id="section-nino" style="display:${isNino ? 'block' : 'none'}">
                        <h4 class="section-title"><i data-lucide="star"></i> Perfil infantil</h4>

                        <div class="form-row">
                            <div class="form-group">
                                <label>Come</label>
                                <select name="come_solo">
                                    <option value="">Seleccionar...</option>
                                    ${['Solo','Con ayuda','Necesita mucha ayuda'].map(o =>
                                        `<option value="${o}" ${member?.come_solo === o ? 'selected' : ''}>${o}</option>`
                                    ).join('')}
                                </select>
                            </div>
                            <div class="form-group">
                                <label>Nivel de exigencia al comer</label>
                                <select name="nivel_exigencia">
                                    <option value="">Seleccionar...</option>
                                    ${['Bajo','Medio','Alto'].map(o =>
                                        `<option value="${o}" ${member?.nivel_exigencia === o ? 'selected' : ''}>${o}</option>`
                                    ).join('')}
                                </select>
                            </div>
                        </div>

                        <div class="form-row">
                            <div class="form-group">
                                <label>Acepta comida nueva</label>
                                <select name="acepta_comida_nueva">
                                    <option value="">Seleccionar...</option>
                                    ${['Sí','A veces','No'].map(o =>
                                        `<option value="${o}" ${member?.acepta_comida_nueva === o ? 'selected' : ''}>${o}</option>`
                                    ).join('')}
                                </select>
                            </div>
                            <div class="form-group">
                                <label>Nivel de picante</label>
                                <select name="nivel_picante">
                                    <option value="Nada" ${!member?.nivel_picante || member?.nivel_picante === 'Nada' ? 'selected' : ''}>Nada</option>
                                    <option value="Suave" ${member?.nivel_picante === 'Suave' ? 'selected' : ''}>Suave</option>
                                </select>
                            </div>
                        </div>

                        <div class="form-group">
                            <label>Alergias</label>
                            ${this.buildTagInput('alergias', member?.alergias || [], 'Ej: nueces, leche, huevo...')}
                        </div>
                        <div class="form-group">
                            <label>Intolerancias</label>
                            ${this.buildTagInput('intolerancias', member?.intolerancias || [], 'Ej: lactosa, gluten...')}
                        </div>
                        <div class="form-group">
                            <label>Verduras aceptadas</label>
                            ${this.buildTagInput('verduras_aceptadas', member?.verduras_aceptadas || [], 'Ej: zanahoria, guisantes...')}
                        </div>
                        <div class="form-group">
                            <label>Verduras rechazadas</label>
                            ${this.buildTagInput('verduras_rechazadas', member?.verduras_rechazadas || [], 'Ej: brócoli, espinacas...')}
                        </div>
                        <div class="form-group">
                            <label>Texturas que no le gustan</label>
                            ${this.buildTagInput('texturas_no_gustan', member?.texturas_no_gustan || [], 'Ej: baboso, crujiente muy duro...')}
                        </div>
                        <div class="form-group">
                            <label>Snacks favoritos</label>
                            ${this.buildTagInput('snacks_favoritos', member?.snacks_favoritos || [], 'Ej: fruta, yogur, galletas...')}
                        </div>

                        <div class="form-row">
                            <div class="form-group">
                                <label>Desayuno preferido</label>
                                <input type="text" name="desayuno_preferido"
                                    value="${member?.desayuno_preferido || ''}"
                                    placeholder="Ej: tostada con tomate y aceite">
                            </div>
                        </div>

                        <div class="form-row">
                            <div class="form-group">
                                <label>Plato favorito</label>
                                <input type="text" name="plato_favorito"
                                    value="${member?.plato_favorito || ''}" placeholder="Ej: macarrones">
                            </div>
                            <div class="form-group">
                                <label>Plato que nunca comería</label>
                                <input type="text" name="plato_nunca_comeria"
                                    value="${member?.plato_nunca_comeria || ''}" placeholder="Ej: hígado">
                            </div>
                        </div>

                        <div class="form-group">
                            <label>Comentarios de los padres</label>
                            <textarea name="comentarios_padres" rows="3"
                                placeholder="Notas para la IA sobre los hábitos de tu hijo/a...">${member?.comentarios_padres || ''}</textarea>
                        </div>
                    </div>

                    <!-- SECCIÓN: Empleado del hogar -->
                    <div class="profile-section" id="section-empleado"
                        style="display:${member?.rol_hogar === 'empleado_hogar' ? 'block' : 'none'}">
                        <h4 class="section-title"><i data-lucide="briefcase"></i> Información laboral</h4>

                        <div class="form-group">
                            <label>Días de trabajo</label>
                            <div class="checkbox-row">
                                ${['lunes','martes','miercoles','jueves','viernes','sabado','domingo'].map(d =>
                                    `<label class="checkbox-label">
                                        <input type="checkbox" name="dias_trabajo_${d}"
                                            ${member?.dias_trabajo?.includes(d) ? 'checked' : ''}>
                                        <span>${d.charAt(0).toUpperCase() + d.slice(1)}</span>
                                    </label>`
                                ).join('')}
                            </div>
                        </div>
                        <div class="form-row">
                            <div class="form-group">
                                <label>Hora entrada</label>
                                <input type="time" name="horario_entrada"
                                    value="${member?.horario_entrada || ''}">
                            </div>
                            <div class="form-group">
                                <label>Hora salida</label>
                                <input type="time" name="horario_salida"
                                    value="${member?.horario_salida || ''}">
                            </div>
                        </div>
                        <div class="form-group">
                            <label>Notas del empleador</label>
                            <textarea name="notas_empleador" rows="3"
                                placeholder="Instrucciones, responsabilidades...">${member?.notas_empleador || ''}</textarea>
                        </div>
                    </div>

                </form>
            </div>

            <div class="modal-footer">
                <button class="btn btn-secondary" onclick="familyManager.closeModal()">Cancelar</button>
                <button class="btn btn-primary" onclick="familyManager.saveProfile(${member?.id || 'null'})">
                    <i data-lucide="save"></i>
                    ${isEdit ? 'Guardar cambios' : 'Crear perfil'}
                </button>
            </div>
        </div>`;

        document.body.appendChild(backdrop);
        this.initTagInputs(backdrop);
        if (typeof lucide !== 'undefined') lucide.createIcons();
    }

    onTipoChange(tipo) {
        document.getElementById('section-adulto').style.display = tipo === 'adulto' ? 'block' : 'none';
        document.getElementById('section-nino').style.display = tipo === 'nino' ? 'block' : 'none';
    }

    onRolChange(rol) {
        document.getElementById('section-empleado').style.display = rol === 'empleado_hogar' ? 'block' : 'none';
    }

    // ============================================================
    // TAG INPUT COMPONENT
    // ============================================================

    buildTagInput(name, values, placeholder) {
        const tagsHtml = values.map((v, i) =>
            `<span class="tag-chip">${v}<button type="button" class="tag-remove" data-field="${name}" data-index="${i}">×</button></span>`
        ).join('');

        return `
        <div class="tag-input-wrap" data-field="${name}">
            <div class="tags-display">${tagsHtml}</div>
            <input type="text" class="tag-input-field" placeholder="${placeholder}"
                data-field="${name}">
            <input type="hidden" name="${name}" value="${JSON.stringify(values).replace(/"/g, '&quot;')}">
        </div>`;
    }

    initTagInputs(container) {
        container.querySelectorAll('.tag-input-field').forEach(input => {
            input.addEventListener('keydown', (e) => {
                if (e.key === 'Enter' || e.key === ',') {
                    e.preventDefault();
                    const val = input.value.trim().replace(/,$/, '');
                    if (val) this.addTag(input.dataset.field, val, container);
                    input.value = '';
                }
            });
            input.addEventListener('blur', () => {
                const val = input.value.trim().replace(/,$/, '');
                if (val) { this.addTag(input.dataset.field, val, container); input.value = ''; }
            });
        });

        container.querySelectorAll('.tag-remove').forEach(btn => {
            btn.addEventListener('click', () => {
                this.removeTag(btn.dataset.field, parseInt(btn.dataset.index), container);
            });
        });
    }

    addTag(fieldName, value, container) {
        const wrap = container.querySelector(`.tag-input-wrap[data-field="${fieldName}"]`);
        if (!wrap) return;
        const hidden = wrap.querySelector(`input[name="${fieldName}"]`);
        let current = [];
        try { current = JSON.parse(hidden.value.replace(/&quot;/g, '"')); } catch { current = []; }
        if (!current.includes(value)) {
            current.push(value);
            hidden.value = JSON.stringify(current).replace(/"/g, '&quot;');
            this.refreshTagDisplay(fieldName, current, wrap);
        }
    }

    removeTag(fieldName, index, container) {
        const wrap = container.querySelector(`.tag-input-wrap[data-field="${fieldName}"]`);
        if (!wrap) return;
        const hidden = wrap.querySelector(`input[name="${fieldName}"]`);
        let current = [];
        try { current = JSON.parse(hidden.value.replace(/&quot;/g, '"')); } catch { current = []; }
        current.splice(index, 1);
        hidden.value = JSON.stringify(current).replace(/"/g, '&quot;');
        this.refreshTagDisplay(fieldName, current, wrap);
    }

    refreshTagDisplay(fieldName, values, wrap) {
        const display = wrap.querySelector('.tags-display');
        display.innerHTML = values.map((v, i) =>
            `<span class="tag-chip">${v}<button type="button" class="tag-remove" data-field="${fieldName}" data-index="${i}">×</button></span>`
        ).join('');
        display.querySelectorAll('.tag-remove').forEach(btn => {
            btn.addEventListener('click', () => {
                this.removeTag(btn.dataset.field, parseInt(btn.dataset.index), wrap.closest('.modal-backdrop'));
            });
        });
    }

    // ============================================================
    // SAVE PROFILE
    // ============================================================

    async saveProfile(memberId) {
        const form = document.getElementById('profile-form');
        if (!form) return;
        if (!form.checkValidity()) { form.reportValidity(); return; }

        const data = this.extractFormData(form);

        try {
            let response;
            if (memberId) {
                response = await api.put(`/api/family/members/${memberId}`, data);
            } else {
                response = await api.post('/api/family/members', data);
            }

            if (response.success) {
                if (memberId) {
                    const idx = this.members.findIndex(m => m.id === memberId);
                    if (idx !== -1) this.members[idx] = response.data;
                } else {
                    this.members.push(response.data);
                }
                this.closeModal();
                this.render();
                this.showNotification(memberId ? 'Perfil actualizado' : 'Perfil creado', 'success');
            } else {
                this.showNotification(response.error || 'Error guardando perfil', 'error');
            }
        } catch (error) {
            console.error('Error guardando perfil:', error);
            this.showNotification('Error al conectar con el servidor', 'error');
        }
    }

    extractFormData(form) {
        const fd = new FormData(form);
        const data = {};

        // Campos simples (string, number)
        const simpleFields = [
            'nombre','edad','tipo','rol_hogar','avatar_color','emoji',
            'objetivo_alimentario','estilo_alimentacion','nivel_picante',
            'restricciones_religiosas','preocupacion_principal','tiempo_max_cocinar',
            'nivel_cocina','tipo_desayuno','plato_favorito','plato_menos_favorito',
            'comentarios','come_solo','nivel_exigencia','acepta_comida_nueva',
            'desayuno_preferido','plato_nunca_comeria','comentarios_padres',
            'porcentaje_tareas_limpieza','porcentaje_tareas_cocina',
            'horario_entrada','horario_salida','notas_empleador'
        ];

        for (const field of simpleFields) {
            const val = fd.get(field);
            if (val !== null) {
                if (['edad','tiempo_max_cocinar','porcentaje_tareas_limpieza','porcentaje_tareas_cocina'].includes(field)) {
                    data[field] = val === '' ? null : parseInt(val);
                } else {
                    data[field] = val;
                }
            }
        }

        // Checkboxes
        data.puede_cocinar = fd.get('puede_cocinar') === 'on';
        data.puede_limpiar = fd.get('puede_limpiar') === 'on';
        data.puede_compras = fd.get('puede_compras') === 'on';
        data.le_gustan_snacks = fd.get('le_gustan_snacks') === 'on';

        // Arrays desde tag inputs (hidden fields con JSON)
        const arrayFields = [
            'alergias','intolerancias','ingredientes_favoritos','ingredientes_no_gustan',
            'cocinas_favoritas','verduras_aceptadas','verduras_rechazadas',
            'texturas_no_gustan','snacks_favoritos'
        ];
        for (const field of arrayFields) {
            const val = fd.get(field);
            if (val !== null) {
                try { data[field] = JSON.parse(val.replace(/&quot;/g, '"')); }
                catch { data[field] = []; }
            }
        }

        // Días de trabajo (checkboxes múltiples)
        const diasTrabajo = [];
        ['lunes','martes','miercoles','jueves','viernes','sabado','domingo'].forEach(d => {
            if (fd.get(`dias_trabajo_${d}`) === 'on') diasTrabajo.push(d);
        });
        data.dias_trabajo = diasTrabajo;

        return data;
    }

    // ============================================================
    // DELETE
    // ============================================================

    async deleteMember(memberId) {
        const member = this.members.find(m => m.id === memberId);
        if (!confirm(`¿Eliminar el perfil de ${member?.nombre || 'este miembro'}?`)) return;

        try {
            const response = await api.delete(`/api/family/members/${memberId}`);
            if (response.success) {
                this.members = this.members.filter(m => m.id !== memberId);
                this.render();
                this.showNotification('Perfil eliminado', 'success');
            } else {
                this.showNotification('Error al eliminar', 'error');
            }
        } catch (error) {
            this.showNotification('Error al conectar con el servidor', 'error');
        }
    }

    // ============================================================
    // MODAL CLOSE
    // ============================================================

    closeModal() {
        const modal = document.getElementById('family-profile-modal');
        if (modal) modal.remove();
    }

    // ============================================================
    // NOTIFICATIONS
    // ============================================================

    showNotification(message, type = 'info') {
        const existing = document.getElementById('family-toast');
        if (existing) existing.remove();

        const toast = document.createElement('div');
        toast.id = 'family-toast';
        toast.className = `toast toast-${type}`;
        const icons = { success: 'check_circle', error: 'error', info: 'info', warning: 'warning' };
        toast.textContent = `${icons[type] || ''} ${message}`;
        document.body.appendChild(toast);

        setTimeout(() => {
            toast.classList.add('toast-visible');
            setTimeout(() => {
                toast.classList.remove('toast-visible');
                setTimeout(() => toast.remove(), 300);
            }, 3000);
        }, 10);
    }
}

// Instancia global
const familyManager = new FamilyManager();
