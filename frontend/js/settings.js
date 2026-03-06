class SettingsManager {
    constructor() {
        this.settings = {};
        this.init();
    }

    async init() {
        await this.loadSettings();
        this.setupEventListeners();
        this.render();
        this.refreshGoogleCalendarStatus();
    }

    async loadSettings() {
        try {
            const response = await api.get('/api/settings');
            this.settings = response.data || {};
            console.log('✅ Configuración cargada:', this.settings);
        } catch (error) {
            console.error('❌ Error cargando configuración:', error);
        }
    }

    setupEventListeners() {
        // Tab switching
        document.querySelectorAll('.tab-btn').forEach(btn => {
            btn.addEventListener('click', (e) => {
                this.switchTab(e.target.dataset.tab);
            });
        });
    }

    switchTab(tabName) {
        // Remove active class from all tabs and contents
        document.querySelectorAll('.tab-btn').forEach(btn => btn.classList.remove('active'));
        document.querySelectorAll('.tab-content').forEach(content => content.classList.remove('active'));
        
        // Add active class to selected tab and content
        document.querySelector(`[data-tab="${tabName}"]`).classList.add('active');
        document.getElementById(`${tabName}-tab`).classList.add('active');
    }

    render() {
        if (!this.settings || Object.keys(this.settings).length === 0) return;

        // General tab
        document.getElementById('nombre_familia').value = this.settings.nombre_familia || '';
        document.getElementById('ciudad').value = this.settings.ciudad || '';
        document.getElementById('idioma').value = this.settings.idioma || 'es';
        document.getElementById('zona_horaria').value = this.settings.zona_horaria || 'Europe/Madrid';
        
        // House tab
        const houseConfig = this.settings.house_config || {};
        this.renderHouseTab(houseConfig);
        
        // Menu tab - checkboxes for days
        const diasMenu = this.settings.dias_menu || [];
        document.querySelectorAll('[name^="dias_menu_"]').forEach(checkbox => {
            const day = checkbox.name.replace('dias_menu_', '');
            checkbox.checked = diasMenu.includes(day);
        });
        
        // Menu tab - checkboxes for meals
        const comidasPorDia = this.settings.comidas_por_dia || [];
        document.querySelectorAll('[name^="comidas_"]').forEach(checkbox => {
            const meal = checkbox.name.replace('comidas_', '');
            checkbox.checked = comidasPorDia.includes(meal);
        });
        
        document.getElementById('presupuesto_semanal').value = this.settings.presupuesto_semanal || '';
        document.getElementById('supermercado_preferido').value = this.settings.supermercado_preferido || '';
        
        // Cleaning tab - checkboxes for cleaning days
        const diasLimpieza = this.settings.dias_limpieza_profunda || [];
        document.querySelectorAll('[name^="dias_limpieza_"]').forEach(checkbox => {
            const day = checkbox.name.replace('dias_limpieza_', '');
            checkbox.checked = diasLimpieza.includes(day);
        });
        
        document.getElementById('edad_minima_tareas_simples').value = this.settings.edad_minima_tareas_simples || 4;
        document.getElementById('edad_minima_tareas_medias').value = this.settings.edad_minima_tareas_medias || 10;
        document.getElementById('incluir_ninos_tareas').checked = this.settings.incluir_ninos_tareas || false;
        
        // API tab
        document.getElementById('anthropic_api_key').value = this.settings.anthropic_api_key || '';
        document.getElementById('google_credentials').value = this.settings.google_credentials || '';
    }

    renderHouseTab(houseConfig) {
        // Información Básica
        document.getElementById('tipo_vivienda').value = houseConfig.tipo_vivienda || 'piso';
        document.getElementById('metros_cuadrados').value = houseConfig.metros_cuadrados || '';
        document.getElementById('numero_plantas').value = houseConfig.numero_plantas || 1;
        
        // Habitaciones
        document.getElementById('dormitorios').value = houseConfig.dormitorios || 3;
        document.getElementById('banos').value = houseConfig.banos || 2;
        document.getElementById('aseos').value = houseConfig.aseos || 0;
        document.getElementById('tiene_salon').checked = houseConfig.tiene_salon !== false;
        document.getElementById('tiene_comedor_separado').checked = houseConfig.tiene_comedor_separado || false;
        document.getElementById('tiene_cocina_separada').checked = houseConfig.tiene_cocina_separada !== false;
        document.getElementById('tiene_office').checked = houseConfig.tiene_office || false;
        document.getElementById('tiene_lavadero').checked = houseConfig.tiene_lavadero !== false;
        document.getElementById('tiene_trastero').checked = houseConfig.tiene_trastero || false;
        
        // Espacios Exteriores
        document.getElementById('tiene_terraza').checked = houseConfig.tiene_terraza || false;
        document.getElementById('tiene_balcon').checked = houseConfig.tiene_balcon || false;
        document.getElementById('tiene_jardin').checked = houseConfig.tiene_jardin || false;
        document.getElementById('metros_exterior').value = houseConfig.metros_exterior || '';
        
        // Mascotas
        const tieneMascotas = houseConfig.tiene_mascotas || false;
        document.getElementById('tiene_mascotas').checked = tieneMascotas;
        document.getElementById('mascotas-details').style.display = tieneMascotas ? 'block' : 'none';
        
        if (tieneMascotas && houseConfig.mascotas) {
            // Tipos de mascotas
            const tiposMascotas = houseConfig.mascotas.map(m => m.tipo);
            document.querySelectorAll('[name="tipo_mascota"]').forEach(checkbox => {
                checkbox.checked = tiposMascotas.includes(checkbox.value);
            });
            
            // Nombres de mascotas
            const nombresMascotas = houseConfig.mascotas.map(m => m.nombre).join(', ');
            document.getElementById('nombres_mascotas').value = nombresMascotas;
        }
        
        // Plantas
        document.getElementById('tiene_plantas').checked = houseConfig.tiene_plantas || false;
        document.getElementById('cantidad_plantas').value = houseConfig.cantidad_plantas || 'pocas';
        
        // Equipamiento
        document.getElementById('tiene_lavavajillas').checked = houseConfig.tiene_lavavajillas !== false;
        document.getElementById('tiene_aspiradora').checked = houseConfig.tiene_aspiradora !== false;
        document.getElementById('tiene_robot_aspiradora').checked = houseConfig.tiene_robot_aspiradora || false;
        document.getElementById('tiene_secadora').checked = houseConfig.tiene_secadora !== false;
        document.getElementById('tiene_plancha_vapor').checked = houseConfig.tiene_plancha_vapor || false;
        document.getElementById('tiene_chimenea').checked = houseConfig.tiene_chimenea || false;
        document.getElementById('tiene_piscina').checked = houseConfig.tiene_piscina || false;
        
        // Preferencias
        document.getElementById('frecuencia_limpieza_profunda').value = houseConfig.frecuencia_limpieza_profunda || 'semanal';
        document.getElementById('dia_limpieza_profunda').value = houseConfig.dia_limpieza_profunda || 'sabado';
        
        const areasPrioritarias = houseConfig.areas_prioritarias || [];
        document.querySelectorAll('[name="area_prioritaria"]').forEach(checkbox => {
            checkbox.checked = areasPrioritarias.includes(checkbox.value);
        });
        
        document.getElementById('productos_preferidos').value = houseConfig.productos_preferidos || '';
        document.getElementById('notas_limpieza').value = houseConfig.notas_limpieza || '';
        
        // Setup collapsible sections
        this.setupCollapsibleSections();
    }

    setupCollapsibleSections() {
        document.querySelectorAll('.section-header').forEach(header => {
            header.addEventListener('click', () => {
                const section = header.parentElement;
                const content = section.querySelector('.section-content');
                const chevron = header.querySelector('.chevron');
                
                content.classList.toggle('collapsed');
                header.classList.toggle('collapsed');
            });
        });
        
        // Toggle mascotas details
        document.getElementById('tiene_mascotas').addEventListener('change', (e) => {
            document.getElementById('mascotas-details').style.display = e.target.checked ? 'block' : 'none';
        });
    }

    collectHouseConfig() {
        // Información básica
        const houseConfig = {
            tipo_vivienda: document.getElementById('tipo_vivienda').value,
            metros_cuadrados: parseInt(document.getElementById('metros_cuadrados').value) || null,
            numero_plantas: parseInt(document.getElementById('numero_plantas').value) || 1,
            
            // Habitaciones
            dormitorios: parseInt(document.getElementById('dormitorios').value) || 3,
            banos: parseInt(document.getElementById('banos').value) || 2,
            aseos: parseInt(document.getElementById('aseos').value) || 0,
            tiene_salon: document.getElementById('tiene_salon').checked,
            tiene_comedor_separado: document.getElementById('tiene_comedor_separado').checked,
            tiene_cocina_separada: document.getElementById('tiene_cocina_separada').checked,
            tiene_office: document.getElementById('tiene_office').checked,
            tiene_lavadero: document.getElementById('tiene_lavadero').checked,
            tiene_trastero: document.getElementById('tiene_trastero').checked,
            
            // Espacios exteriores
            tiene_terraza: document.getElementById('tiene_terraza').checked,
            tiene_balcon: document.getElementById('tiene_balcon').checked,
            tiene_jardin: document.getElementById('tiene_jardin').checked,
            metros_exterior: parseInt(document.getElementById('metros_exterior').value) || null,
            
            // Mascotas
            tiene_mascotas: document.getElementById('tiene_mascotas').checked,
            
            // Plantas
            tiene_plantas: document.getElementById('tiene_plantas').checked,
            cantidad_plantas: document.getElementById('cantidad_plantas').value,
            
            // Equipamiento
            tiene_lavavajillas: document.getElementById('tiene_lavavajillas').checked,
            tiene_aspiradora: document.getElementById('tiene_aspiradora').checked,
            tiene_robot_aspiradora: document.getElementById('tiene_robot_aspiradora').checked,
            tiene_secadora: document.getElementById('tiene_secadora').checked,
            tiene_plancha_vapor: document.getElementById('tiene_plancha_vapor').checked,
            tiene_chimenea: document.getElementById('tiene_chimenea').checked,
            tiene_piscina: document.getElementById('tiene_piscina').checked,
            
            // Preferencias
            frecuencia_limpieza_profunda: document.getElementById('frecuencia_limpieza_profunda').value,
            dia_limpieza_profunda: document.getElementById('dia_limpieza_profunda').value,
            productos_preferidos: document.getElementById('productos_preferidos').value,
            notas_limpieza: document.getElementById('notas_limpieza').value
        };
        
        // Collect áreas prioritarias
        const areasPrioritarias = [];
        document.querySelectorAll('[name="area_prioritaria"]').forEach(checkbox => {
            if (checkbox.checked) {
                areasPrioritarias.push(checkbox.value);
            }
        });
        houseConfig.areas_prioritarias = areasPrioritarias;
        
        // Collect mascotas si hay
        if (houseConfig.tiene_mascotas) {
            const tiposMascotas = [];
            document.querySelectorAll('[name="tipo_mascota"]:checked').forEach(checkbox => {
                tiposMascotas.push(checkbox.value);
            });
            
            const nombresMascotas = document.getElementById('nombres_mascotas').value
                .split(',')
                .map(n => n.trim())
                .filter(n => n);
            
            houseConfig.mascotas = tiposMascotas.map((tipo, index) => ({
                tipo: tipo,
                nombre: nombresMascotas[index] || `Mascota ${index + 1}`
            }));
        }
        
        return houseConfig;
    }

    async saveSettings() {
        try {
            // Collect menu days
            const diasMenu = [];
            document.querySelectorAll('[name^="dias_menu_"]').forEach(checkbox => {
                if (checkbox.checked) {
                    const day = checkbox.name.replace('dias_menu_', '');
                    diasMenu.push(day);
                }
            });
            
            // Collect meals
            const comidasPorDia = [];
            document.querySelectorAll('[name^="comidas_"]').forEach(checkbox => {
                if (checkbox.checked) {
                    const meal = checkbox.name.replace('comidas_', '');
                    comidasPorDia.push(meal);
                }
            });
            
            // Collect cleaning days
            const diasLimpieza = [];
            document.querySelectorAll('[name^="dias_limpieza_"]').forEach(checkbox => {
                if (checkbox.checked) {
                    const day = checkbox.name.replace('dias_limpieza_', '');
                    diasLimpieza.push(day);
                }
            });

            // Collect house configuration
            const houseConfig = this.collectHouseConfig();

            const formData = {
                nombre_familia: document.getElementById('nombre_familia').value,
                ciudad: document.getElementById('ciudad').value,
                idioma: document.getElementById('idioma').value,
                zona_horaria: document.getElementById('zona_horaria').value,
                dias_menu: diasMenu,
                comidas_por_dia: comidasPorDia,
                presupuesto_semanal: parseInt(document.getElementById('presupuesto_semanal').value) || 0,
                supermercado_preferido: document.getElementById('supermercado_preferido').value,
                dias_limpieza_profunda: diasLimpieza,
                edad_minima_tareas_simples: parseInt(document.getElementById('edad_minima_tareas_simples').value) || 4,
                edad_minima_tareas_medias: parseInt(document.getElementById('edad_minima_tareas_medias').value) || 10,
                incluir_ninos_tareas: document.getElementById('incluir_ninos_tareas').checked,
                house_config: houseConfig,
                anthropic_api_key: document.getElementById('anthropic_api_key').value,
                google_credentials: document.getElementById('google_credentials').value
            };

            const response = await api.put('/api/settings', formData);
            this.settings = response.data;
            this.showNotification('Configuración guardada exitosamente', 'success');
            this.refreshGoogleCalendarStatus();
        } catch (error) {
            console.error('❌ Error guardando configuración:', error);
            this.showNotification('Error al guardar configuración', 'error');
        }
    }

    setGoogleCalendarStatus(text) {
        const el = document.getElementById('googleCalendarStatus');
        if (el) el.textContent = text || '';
    }

    async refreshGoogleCalendarStatus() {
        try {
            const statusResp = await api.get('/api/google/auth/status');
            if (!statusResp.success) {
                this.setGoogleCalendarStatus('Estado: error');
                return;
            }
            const connected = !!statusResp.data?.connected;
            this.setGoogleCalendarStatus(connected ? 'Estado: conectado' : 'Estado: no conectado');

            if (connected) {
                const calResp = await api.get('/api/google/calendars');
                if (calResp.success) {
                    const select = document.getElementById('google_calendar_id');
                    if (select) {
                        const current = select.value || 'primary';
                        select.innerHTML = '';
                        calResp.data.forEach(c => {
                            const opt = document.createElement('option');
                            opt.value = c.id;
                            opt.textContent = c.primary ? `${c.summary} (Primary)` : c.summary;
                            select.appendChild(opt);
                        });
                        const match = Array.from(select.options).find(o => o.value === current);
                        if (match) select.value = current;
                    }
                }
            }
        } catch (e) {
            this.setGoogleCalendarStatus('Estado: error');
        }
    }

    async connectGoogleCalendar() {
        try {
            this.setGoogleCalendarStatus('Abriendo autorización...');
            const resp = await api.get('/api/google/auth/start');
            if (!resp.success) {
                this.showNotification(resp.message || 'Error iniciando OAuth', 'error');
                this.setGoogleCalendarStatus('Estado: no conectado');
                return;
            }
            const url = resp.data?.auth_url;
            if (!url) {
                this.showNotification('No se recibió auth_url', 'error');
                return;
            }
            window.open(url, '_blank');
            this.showNotification('Autoriza en la ventana de Google y vuelve aquí', 'info');
        } catch (e) {
            this.showNotification('Error iniciando conexión Google Calendar', 'error');
        }
    }

    async disconnectGoogleCalendar() {
        try {
            const resp = await api.post('/api/google/auth/disconnect', {});
            if (resp.success) {
                this.showNotification('Google Calendar desconectado', 'success');
            } else {
                this.showNotification(resp.message || 'Error desconectando', 'error');
            }
            this.refreshGoogleCalendarStatus();
        } catch (e) {
            this.showNotification('Error desconectando Google Calendar', 'error');
        }
    }

    async importFromGoogle() {
        try {
            const select = document.getElementById('google_calendar_id');
            const calendarId = select?.value || 'primary';

            const today = new Date();
            const monday = new Date(today);
            const day = monday.getDay();
            const diff = monday.getDate() - day + (day === 0 ? -6 : 1);
            const weekStart = new Date(monday.setDate(diff)).toISOString().split('T')[0];
            const sunday = new Date(monday.setDate(diff + 6)).toISOString().split('T')[0];

            const resp = await api.post('/api/google/import', {
                calendar_id: calendarId,
                from: weekStart,
                to: sunday
            });

            if (resp.success) {
                const d = resp.data;
                this.showNotification(`Importados: ${d.created} nuevos, ${d.updated} actualizados`, 'success');
            } else {
                this.showNotification(resp.message || 'Error importando', 'error');
            }
        } catch (e) {
            this.showNotification('Error importando eventos', 'error');
        }
    }

    async viewImportedEvents() {
        try {
            const today = new Date();
            const monday = new Date(today);
            const day = monday.getDay();
            const diff = monday.getDate() - day + (day === 0 ? -6 : 1);
            const weekStart = new Date(monday.setDate(diff)).toISOString().split('T')[0];
            const sunday = new Date(monday.setDate(diff + 6)).toISOString().split('T')[0];

            const resp = await api.get(`/api/google/imported?from=${weekStart}&to=${sunday}`);
            if (!resp.success) {
                this.showNotification(resp.message || 'Error obteniendo importados', 'error');
                return;
            }
            const events = resp.data || [];
            const lines = events.map(e => {
                const start = new Date(e.start_datetime).toLocaleString('es-ES', { weekday: 'short', day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' });
                const summary = e.summary || '(sin título)';
                return `${start} — ${summary}`;
            });
            const msg = lines.length ? lines.join('\n') : 'No hay eventos importados esta semana.';
            alert(`Eventos importados (esta semana):\n\n${msg}`);
        } catch (e) {
            this.showNotification('Error obteniendo eventos importados', 'error');
        }
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
const settingsManager = new SettingsManager();
