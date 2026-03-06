// ============================================
// TO-DO LIST MANAGER - Gestión de Tareas
// ============================================

class TodoManager {
    constructor() {
        this.todos = [];
        this.currentFilter = 'all';
        this.apiBase = 'http://localhost:9000/api';
        this.recognition = null;
        this.isRecording = false;
        this.voiceTranscript = '';
        this.init();
    }

    async init() {
        await this.loadTodos();
        this.setupEventListeners();
        this.renderTodos();
    }

    setupEventListeners() {
        // Botón añadir tarea
        document.getElementById('addTodoBtn')?.addEventListener('click', () => {
            this.showTodoForm();
        });

        // Botón limpiar completadas
        document.getElementById('clearCompletedBtn')?.addEventListener('click', () => {
            this.clearCompletedTodos();
        });

        // Botón de voz
        document.getElementById('voiceTodoBtn')?.addEventListener('click', () => {
            this.startVoiceRecording();
        });

        // Botón detener voz
        document.getElementById('stopVoiceBtn')?.addEventListener('click', () => {
            this.stopVoiceRecording();
        });

        // Botón crear tarea desde voz
        document.getElementById('createVoiceTodoBtn')?.addEventListener('click', () => {
            this.createTodoFromVoice();
        });

        // Botón cancelar voz
        document.getElementById('cancelVoiceBtn')?.addEventListener('click', () => {
            this.hideVoiceInterface();
        });

        // Filtros
        document.querySelectorAll('.filter-tab').forEach(tab => {
            tab.addEventListener('click', () => {
                this.setFilter(tab.dataset.filter);
            });
        });

        // Formulario
        const todoForm = document.getElementById('todoForm');
        if (todoForm) {
            todoForm.addEventListener('submit', (e) => {
                e.preventDefault();
                this.saveTodo();
            });
        }

        // Botón cancelar
        document.getElementById('cancelTodoBtn')?.addEventListener('click', () => {
            this.hideTodoForm();
        });
    }

    async loadTodos() {
        try {
            const response = await fetch(`${this.apiBase}/todos`);
            const result = await response.json();
            this.todos = result.success ? result.data : [];
            console.log('✅ Todos cargados:', this.todos);
        } catch (error) {
            console.error('❌ Error cargando todos:', error);
            this.todos = this.getLocalTodos(); // Fallback a localStorage
        }
    }

    getLocalTodos() {
        const stored = localStorage.getItem('todos');
        return stored ? JSON.parse(stored) : [];
    }

    saveTodosToLocal() {
        localStorage.setItem('todos', JSON.stringify(this.todos));
    }

    async saveTodo() {
        const title = document.getElementById('todoTitle').value.trim();
        const category = document.getElementById('todoCategory').value;
        const priority = document.getElementById('todoPriority').value;
        const dueDate = document.getElementById('todoDueDate').value;
        const notes = document.getElementById('todoNotes').value.trim();

        if (!title) {
            this.showNotification('El título es requerido', 'error');
            return;
        }

        const todo = {
            id: Date.now().toString(),
            title,
            category,
            priority,
            dueDate,
            notes,
            completed: false,
            createdAt: new Date().toISOString(),
            completedAt: null
        };

        try {
            const response = await fetch(`${this.apiBase}/todos`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify(todo)
            });

            const result = await response.json();
            if (result.success) {
                this.todos.push(result.data);
                this.saveTodosToLocal();
                this.hideTodoForm();
                this.renderTodos();
                this.showNotification('Tarea añadida correctamente', 'success');
            } else {
                throw new Error(result.message || 'Error guardando tarea');
            }
        } catch (error) {
            console.error('❌ Error guardando todo:', error);
            // Fallback: guardar localmente
            this.todos.push(todo);
            this.saveTodosToLocal();
            this.hideTodoForm();
            this.renderTodos();
            this.showNotification('Tarea guardada localmente', 'info');
        }
    }

    async updateTodo(todoId, updates) {
        try {
            const response = await fetch(`${this.apiBase}/todos/${todoId}`, {
                method: 'PUT',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify(updates)
            });

            const result = await response.json();
            if (result.success) {
                const index = this.todos.findIndex(t => t.id === todoId);
                if (index !== -1) {
                    this.todos[index] = { ...this.todos[index], ...result.data };
                    this.saveTodosToLocal();
                    this.renderTodos();
                }
            } else {
                throw new Error(result.message || 'Error actualizando tarea');
            }
        } catch (error) {
            console.error('❌ Error actualizando todo:', error);
            // Fallback: actualizar localmente
            const index = this.todos.findIndex(t => t.id === todoId);
            if (index !== -1) {
                this.todos[index] = { ...this.todos[index], ...updates };
                this.saveTodosToLocal();
                this.renderTodos();
            }
        }
    }

    async deleteTodo(todoId) {
        try {
            const response = await fetch(`${this.apiBase}/todos/${todoId}`, {
                method: 'DELETE'
            });

            const result = await response.json();
            if (result.success) {
                this.todos = this.todos.filter(t => t.id !== todoId);
                this.saveTodosToLocal();
                this.renderTodos();
                this.showNotification('Tarea eliminada', 'info');
            } else {
                throw new Error(result.message || 'Error eliminando tarea');
            }
        } catch (error) {
            console.error('❌ Error eliminando todo:', error);
            // Fallback: eliminar localmente
            this.todos = this.todos.filter(t => t.id !== todoId);
            this.saveTodosToLocal();
            this.renderTodos();
        }
    }

    toggleTodoComplete(todoId) {
        const todo = this.todos.find(t => t.id === todoId);
        if (todo) {
            const updates = {
                completed: !todo.completed,
                completedAt: !todo.completed ? new Date().toISOString() : null
            };
            this.updateTodo(todoId, updates);
        }
    }

    clearCompletedTodos() {
        const completedTodos = this.todos.filter(t => t.completed);
        if (completedTodos.length === 0) {
            this.showNotification('No hay tareas completadas', 'info');
            return;
        }

        if (confirm(`¿Eliminar ${completedTodos.length} tarea(s) completada(s)?`)) {
            completedTodos.forEach(todo => {
                this.deleteTodo(todo.id);
            });
        }
    }

    setFilter(filter) {
        this.currentFilter = filter;
        
        // Actualizar tabs activas
        document.querySelectorAll('.filter-tab').forEach(tab => {
            tab.classList.toggle('active', tab.dataset.filter === filter);
        });
        
        this.renderTodos();
    }

    getFilteredTodos() {
        const today = new Date().toISOString().split('T')[0];
        
        switch (this.currentFilter) {
            case 'completed':
                return this.todos.filter(t => t.completed);
            case 'pending':
                return this.todos.filter(t => !t.completed);
            case 'today':
                return this.todos.filter(t => t.dueDate === today);
            default:
                return this.todos;
        }
    }

    renderTodos() {
        const todoList = document.getElementById('todoList');
        if (!todoList) return;

        const filteredTodos = this.getFilteredTodos();
        
        // Actualizar estadísticas
        this.updateStats();

        if (filteredTodos.length === 0) {
            todoList.innerHTML = `
                <div class="todo-empty">
                    <i data-lucide="check-square"></i>
                    <p>No hay tareas para mostrar</p>
                </div>
            `;
            return;
        }

        // Ordenar por prioridad y fecha
        const sortedTodos = this.sortTodos(filteredTodos);

        todoList.innerHTML = sortedTodos.map(todo => this.createTodoElement(todo)).join('');
        
        // Añadir event listeners
        this.attachTodoEventListeners();
        
        // Re-inicializar icons
        if (typeof lucide !== 'undefined') {
            lucide.createIcons();
        }
    }

    sortTodos(todos) {
        const priorityOrder = { urgente: 4, alta: 3, media: 2, baja: 1 };
        
        return todos.sort((a, b) => {
            // Primero por completado
            if (a.completed !== b.completed) {
                return a.completed ? 1 : -1;
            }
            
            // Luego por prioridad
            const priorityDiff = priorityOrder[b.priority] - priorityOrder[a.priority];
            if (priorityDiff !== 0) {
                return priorityDiff;
            }
            
            // Finalmente por fecha de vencimiento
            if (a.dueDate && b.dueDate) {
                return new Date(a.dueDate) - new Date(b.dueDate);
            }
            
            return 0;
        });
    }

    createTodoElement(todo) {
        const isOverdue = todo.dueDate && new Date(todo.dueDate) < new Date() && !todo.completed;
        
        return `
            <div class="todo-item ${todo.completed ? 'completed' : ''}" data-todo-id="${todo.id}">
                <div class="todo-checkbox ${todo.completed ? 'checked' : ''}" data-todo-id="${todo.id}">
                    ${todo.completed ? '✓' : ''}
                </div>
                <div class="todo-content">
                    <div class="todo-header">
                        <div class="todo-title">${todo.title}</div>
                        <div class="todo-meta">
                            <span class="todo-category">${this.formatCategory(todo.category)}</span>
                            <span class="todo-priority ${todo.priority}">${this.formatPriority(todo.priority)}</span>
                        </div>
                    </div>
                    ${todo.dueDate ? `
                        <div class="todo-due-date ${isOverdue ? 'overdue' : ''}">
                            <i data-lucide="calendar"></i>
                            ${this.formatDate(todo.dueDate)}
                        </div>
                    ` : ''}
                    ${todo.notes ? `
                        <div class="todo-notes">${todo.notes}</div>
                    ` : ''}
                    <div class="todo-actions">
                        <button class="todo-action-btn edit-btn" data-todo-id="${todo.id}">
                            <i data-lucide="edit-2"></i>
                        </button>
                        <button class="todo-action-btn delete-btn" data-todo-id="${todo.id}">
                            <i data-lucide="trash-2"></i>
                        </button>
                    </div>
                </div>
            </div>
        `;
    }

    attachTodoEventListeners() {
        // Checkbox
        document.querySelectorAll('.todo-checkbox').forEach(checkbox => {
            checkbox.addEventListener('click', () => {
                const todoId = checkbox.dataset.todoId;
                this.toggleTodoComplete(todoId);
            });
        });

        // Botones de acción
        document.querySelectorAll('.edit-btn').forEach(btn => {
            btn.addEventListener('click', () => {
                const todoId = btn.dataset.todoId;
                this.editTodo(todoId);
            });
        });

        document.querySelectorAll('.delete-btn').forEach(btn => {
            btn.addEventListener('click', () => {
                const todoId = btn.dataset.todoId;
                if (confirm('¿Eliminar esta tarea?')) {
                    this.deleteTodo(todoId);
                }
            });
        });
    }

    showTodoForm() {
        const formContainer = document.getElementById('todoFormContainer');
        if (formContainer) {
            formContainer.style.display = 'block';
            document.getElementById('todoTitle').focus();
        }
    }

    hideTodoForm() {
        const formContainer = document.getElementById('todoFormContainer');
        if (formContainer) {
            formContainer.style.display = 'none';
            document.getElementById('todoForm').reset();
        }
    }

    editTodo(todoId) {
        const todo = this.todos.find(t => t.id === todoId);
        if (!todo) return;

        // Llenar formulario con datos existentes
        document.getElementById('todoTitle').value = todo.title;
        document.getElementById('todoCategory').value = todo.category;
        document.getElementById('todoPriority').value = todo.priority;
        document.getElementById('todoDueDate').value = todo.dueDate || '';
        document.getElementById('todoNotes').value = todo.notes || '';

        this.showTodoForm();
        
        // Cambiar el texto del botón submit
        const submitBtn = document.querySelector('#todoForm button[type="submit"]');
        if (submitBtn) {
            submitBtn.innerHTML = '<i data-lucide="save"></i> Actualizar Tarea';
        }

        // Modificar el evento submit para actualizar
        const form = document.getElementById('todoForm');
        form.onsubmit = async (e) => {
            e.preventDefault();
            await this.updateTodo(todoId, {
                title: document.getElementById('todoTitle').value.trim(),
                category: document.getElementById('todoCategory').value,
                priority: document.getElementById('todoPriority').value,
                dueDate: document.getElementById('todoDueDate').value,
                notes: document.getElementById('todoNotes').value.trim()
            });
        };
    }

    updateStats() {
        const totalCount = this.todos.length;
        const completedCount = this.todos.filter(t => t.completed).length;
        const pendingCount = totalCount - completedCount;

        document.getElementById('todoTotalCount').textContent = totalCount;
        document.getElementById('todoCompletedCount').textContent = completedCount;
        document.getElementById('todoPendingCount').textContent = pendingCount;
    }

    formatCategory(category) {
        const categories = {
            personal: 'Personal',
            trabajo: 'Trabajo',
            hogar: 'Hogar',
            compras: 'Compras',
            salud: 'Salud',
            finanzas: 'Finanzas',
            otros: 'Otros'
        };
        return categories[category] || category;
    }

    formatPriority(priority) {
        const priorities = {
            baja: 'Baja',
            media: 'Media',
            alta: 'Alta',
            urgente: 'Urgente'
        };
        return priorities[priority] || priority;
    }

    formatDate(dateString) {
        const date = new Date(dateString);
        const today = new Date();
        const diffTime = date - today;
        const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

        if (diffDays === 0) {
            return 'Hoy';
        } else if (diffDays === 1) {
            return 'Mañana';
        } else if (diffDays === -1) {
            return 'Ayer';
        } else if (diffDays > 0) {
            return `En ${diffDays} días`;
        } else {
            return `Hace ${Math.abs(diffDays)} días`;
        }
    }

    showNotification(message, type = 'info') {
        // Crear elemento de notificación
        const notification = document.createElement('div');
        notification.className = `notification notification-${type}`;
        notification.textContent = message;
        notification.style.cssText = `
            position: fixed;
            top: 20px;
            right: 20px;
            padding: 12px 20px;
            background: ${type === 'success' ? 'var(--rambla-green)' : type === 'error' ? '#f44336' : 'var(--gaudi-gold)'};
            color: white;
            border-radius: var(--radius-sm);
            box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
            z-index: 1000;
            animation: slideIn 0.3s ease;
        `;

        document.body.appendChild(notification);

        // Eliminar después de 3 segundos
        setTimeout(() => {
            notification.style.animation = 'slideOut 0.3s ease';
            setTimeout(() => {
                document.body.removeChild(notification);
            }, 300);
        }, 3000);
    }

    // ============================================
    // VOICE RECOGNITION FUNCTIONALITY
    // ============================================

    startVoiceRecording() {
        // Verificar si el navegador soporta reconocimiento de voz
        if (!('webkitSpeechRecognition' in window) && !('SpeechRecognition' in window)) {
            this.showNotification('Tu navegador no soporta reconocimiento de voz', 'error');
            return;
        }

        // Inicializar reconocimiento de voz
        const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
        this.recognition = new SpeechRecognition();
        
        // Configurar reconocimiento
        this.recognition.lang = 'es-ES'; // Español
        this.recognition.continuous = true;
        this.recognition.interimResults = true;
        this.recognition.maxAlternatives = 1;

        // Eventos del reconocimiento
        this.recognition.onstart = () => {
            console.log('🎤 Iniciando reconocimiento de voz...');
            this.isRecording = true;
            this.voiceTranscript = '';
            this.showVoiceInterface();
            this.updateVoiceInterface('recording', 'Escuchando...');
        };

        this.recognition.onresult = (event) => {
            let interimTranscript = '';
            let finalTranscript = '';

            for (let i = event.resultIndex; i < event.results.length; i++) {
                const transcript = event.results[i][0].transcript;
                
                if (event.results[i].isFinal) {
                    finalTranscript += transcript + ' ';
                } else {
                    interimTranscript += transcript;
                }
            }

            this.voiceTranscript = finalTranscript + interimTranscript;
            this.updateTranscript(this.voiceTranscript);
            
            // Habilitar botón de crear si hay texto
            const createBtn = document.getElementById('createVoiceTodoBtn');
            if (createBtn) {
                createBtn.disabled = this.voiceTranscript.trim().length === 0;
            }
        };

        this.recognition.onerror = (event) => {
            console.error('❌ Error en reconocimiento de voz:', event.error);
            let errorMessage = 'Error en el reconocimiento de voz';
            
            switch (event.error) {
                case 'no-speech':
                    errorMessage = 'No se detectó habla. Intenta de nuevo.';
                    break;
                case 'audio-capture':
                    errorMessage = 'No se pudo acceder al micrófono. Verifica los permisos.';
                    break;
                case 'not-allowed':
                    errorMessage = 'Permiso de micrófono denegado. Permite el acceso.';
                    break;
                case 'network':
                    errorMessage = 'Error de red. Revisa tu conexión.';
                    break;
            }
            
            this.showNotification(errorMessage, 'error');
            this.stopVoiceRecording();
        };

        this.recognition.onend = () => {
            console.log('🎤 Reconocimiento de voz finalizado');
            if (this.isRecording) {
                this.updateVoiceInterface('processing', 'Procesando...');
                
                // Si hay transcripción, mostrar botón de crear
                if (this.voiceTranscript.trim().length > 0) {
                    this.updateVoiceInterface('completed', 'Tarea lista para crear');
                } else {
                    this.showNotification('No se detectó ninguna tarea', 'info');
                    setTimeout(() => this.hideVoiceInterface(), 2000);
                }
            }
            this.isRecording = false;
        };

        // Iniciar reconocimiento
        try {
            this.recognition.start();
        } catch (error) {
            console.error('❌ Error iniciando reconocimiento:', error);
            this.showNotification('Error al iniciar el reconocimiento de voz', 'error');
        }
    }

    stopVoiceRecording() {
        if (this.recognition && this.isRecording) {
            this.recognition.stop();
            this.isRecording = false;
        }
    }

    showVoiceInterface() {
        const voiceInterface = document.getElementById('voiceInterface');
        if (voiceInterface) {
            voiceInterface.style.display = 'block';
            // Resetear estado
            this.updateVoiceInterface('ready', 'Di tu tarea...');
            this.updateTranscript('');
            
            // Deshabilitar botón de crear inicialmente
            const createBtn = document.getElementById('createVoiceTodoBtn');
            if (createBtn) {
                createBtn.disabled = true;
            }
        }
    }

    hideVoiceInterface() {
        const voiceInterface = document.getElementById('voiceInterface');
        if (voiceInterface) {
            voiceInterface.style.display = 'none';
        }
        this.voiceTranscript = '';
        this.isRecording = false;
    }

    updateVoiceInterface(state, text) {
        const voiceInterface = document.getElementById('voiceInterface');
        const voiceText = document.getElementById('voiceText');
        
        if (voiceInterface) {
            // Remover clases de estado anteriores
            voiceInterface.classList.remove('recording', 'processing', 'completed');
            
            // Añadir nueva clase de estado
            voiceInterface.classList.add(state);
        }
        
        if (voiceText) {
            voiceText.textContent = text;
        }
    }

    updateTranscript(text) {
        const transcriptElement = document.getElementById('transcriptText');
        if (transcriptElement) {
            transcriptElement.textContent = text || 'Di tu tarea...';
        }
    }

    async createTodoFromVoice() {
        const transcript = this.voiceTranscript.trim();
        if (!transcript) {
            this.showNotification('No hay texto para crear la tarea', 'error');
            return;
        }

        // Extraer información inteligente del texto
        const todoData = this.parseVoiceCommand(transcript);
        
        const todo = {
            id: Date.now().toString(),
            title: todoData.title,
            category: todoData.category,
            priority: todoData.priority,
            dueDate: todoData.dueDate,
            notes: todoData.notes,
            completed: false,
            createdAt: new Date().toISOString(),
            completedAt: null
        };

        try {
            // Intentar guardar en backend
            const response = await fetch(`${this.apiBase}/todos`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify(todo)
            });

            const result = await response.json();
            if (result.success) {
                this.todos.push(result.data);
                this.saveTodosToLocal();
                this.renderTodos();
                this.hideVoiceInterface();
                this.showNotification('Tarea creada por voz correctamente', 'success');
            } else {
                throw new Error(result.message || 'Error guardando tarea');
            }
        } catch (error) {
            console.error('❌ Error guardando todo por voz:', error);
            // Fallback: guardar localmente
            this.todos.push(todo);
            this.saveTodosToLocal();
            this.renderTodos();
            this.hideVoiceInterface();
            this.showNotification('Tarea guardada localmente', 'info');
        }
    }

    parseVoiceCommand(text) {
        const todo = {
            title: text,
            category: 'personal',
            priority: 'media',
            dueDate: null,
            notes: ''
        };

        const lowerText = text.toLowerCase();

        // Detectar categorías
        const categories = {
            'trabajo': ['trabajo', 'oficina', 'reunión', 'proyecto', 'tarea laboral'],
            'hogar': ['casa', 'hogar', 'limpiar', 'cocina', 'comprar', 'mandado'],
            'compras': ['comprar', 'compras', 'supermercado', 'mercado', 'tienda'],
            'salud': ['médico', 'doctor', 'cita médica', 'ejercicio', 'gimnasio', 'salud'],
            'finanzas': ['pago', 'factura', 'banco', 'dinero', 'impuestos', 'finanzas'],
            'personal': ['personal', 'llamar', 'correo', 'cita', 'amigos', 'familia']
        };

        for (const [category, keywords] of Object.entries(categories)) {
            if (keywords.some(keyword => lowerText.includes(keyword))) {
                todo.category = category;
                break;
            }
        }

        // Detectar prioridades
        if (lowerText.includes('urgente') || lowerText.includes('emergencia')) {
            todo.priority = 'urgente';
        } else if (lowerText.includes('importante') || lowerText.includes('alta prioridad')) {
            todo.priority = 'alta';
        } else if (lowerText.includes('baja prioridad') || lowerText.includes('cuando pueda')) {
            todo.priority = 'baja';
        }

        // Detectar fechas
        const today = new Date();
        const tomorrow = new Date(today);
        tomorrow.setDate(tomorrow.getDate() + 1);
        const nextWeek = new Date(today);
        nextWeek.setDate(nextWeek.getDate() + 7);

        if (lowerText.includes('hoy')) {
            todo.dueDate = today.toISOString().split('T')[0];
        } else if (lowerText.includes('mañana')) {
            todo.dueDate = tomorrow.toISOString().split('T')[0];
        } else if (lowerText.includes('próxima semana') || lowerText.includes('la semana que viene')) {
            todo.dueDate = nextWeek.toISOString().split('T')[0];
        }

        // Extraer título limpio (eliminar palabras clave)
        let title = text;
        const keywordsToRemove = [...Object.values(categories).flat(), 
            'urgente', 'importante', 'alta', 'baja', 'hoy', 'mañana', 
            'próxima semana', 'la semana que viene', 'añadir', 'crear', 'nueva'];
        
        keywordsToRemove.forEach(keyword => {
            const regex = new RegExp(keyword, 'gi');
            title = title.replace(regex, '').trim();
        });

        // Limpiar espacios múltiples y capitalizar
        todo.title = title.replace(/\s+/g, ' ').trim();
        if (todo.title) {
            todo.title = todo.title.charAt(0).toUpperCase() + todo.title.slice(1);
        }

        return todo;
    }
}

// Añadir animaciones CSS
const style = document.createElement('style');
style.textContent = `
    @keyframes slideIn {
        from {
            transform: translateX(100%);
            opacity: 0;
        }
        to {
            transform: translateX(0);
            opacity: 1;
        }
    }
    
    @keyframes slideOut {
        from {
            transform: translateX(0);
            opacity: 1;
        }
        to {
            transform: translateX(100%);
            opacity: 0;
        }
    }
`;
document.head.appendChild(style);

// Inicializar cuando el DOM esté listo
document.addEventListener('DOMContentLoaded', () => {
    if (typeof TodoManager !== 'undefined') {
        window.todoManager = new TodoManager();
        console.log('✅ TodoManager inicializado');
    } else {
        console.error('❌ TodoManager no encontrado');
    }
});
