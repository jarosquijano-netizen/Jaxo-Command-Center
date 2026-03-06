# 🏠 Family Command Center - Plan de Expansión

**Proyecto:** Expansión de k[AI]tchen a Family Command Center  
**Familia:** 5 miembros (3 adultos, 2 niñas: 4 y 12 años)  
**Ubicación:** Barcelona, España  
**Fecha:** Enero 2026

---

## 📋 Visión General

Transformar k[AI]tchen de un sistema de menús semanales a un **centro de comando familiar completo** que integre:

1. ✅ **k[AI]tchen** - Sistema de menús semanales (ya existente)
2. 🗓️ **Google Calendar Sync** - Sincronización de calendarios familiares
3. ✅ **Todo List** - Lista de tareas desde Google Keep/Tasks
4. 🧹 **Plan de Limpieza** - Sistema de rotación de tareas del hogar
5. 📺 **Vista TV** - Dashboard optimizado para cocina/salón

---

## 🏗️ Arquitectura Propuesta

### Estructura del Sistema

```
Family Command Center
├── k[AI]tchen (Menús)
│   ├── Generación con IA
│   ├── Base de recetas
│   └── Lista de compra
├── Calendar Module
│   ├── Google Calendar API
│   ├── Vista semanal/mensual
│   └── Eventos familiares
├── Todo Module
│   ├── Google Tasks API
│   ├── Google Keep API (opcional)
│   └── Gestión de listas
├── Cleaning Module
│   ├── Plantillas de tareas
│   ├── Sistema de rotación
│   └── Seguimiento de completado
└── Dashboard/TV View
    ├── Vista unificada
    ├── Widgets configurables
    └── Auto-refresh
```

### Stack Técnico Actualizado

**Backend:**
- Flask (existente)
- PostgreSQL (existente)
- **Nuevas APIs:**
  - Google Calendar API
  - Google Tasks API
  - Google Keep API (no oficial, usar Tasks)

**Frontend:**
- JavaScript vanilla (existente)
- **Nuevo:** Diseño de widgets/módulos
- **Nuevo:** Sistema de layouts para dashboard

**Autenticación:**
- Google OAuth 2.0 (para acceso a servicios)

---

## 🔧 Plan de Implementación por Fases

### 📅 FASE 1: Google Calendar Integration (2-3 semanas)

#### Objetivos
- Conectar con Google Calendar API
- Mostrar eventos de múltiples calendarios
- Vista semanal en dashboard

#### Tareas Técnicas

**1.1 Setup de Google Cloud Project**
```bash
# Crear proyecto en Google Cloud Console
# Habilitar APIs:
- Google Calendar API
- Google Tasks API

# Descargar credenciales OAuth 2.0
# Configurar consent screen
```

**1.2 Backend - Nuevo módulo `calendar_sync.py`**
```python
# calendar_sync.py
from google.oauth2.credentials import Credentials
from googleapiclient.discovery import build
from google.auth.transport.requests import Request
import pickle
import os.path

class CalendarSync:
    def __init__(self):
        self.SCOPES = ['https://www.googleapis.com/auth/calendar.readonly']
        self.creds = None
        
    def authenticate(self):
        """Autenticar con Google OAuth"""
        if os.path.exists('token.pickle'):
            with open('token.pickle', 'rb') as token:
                self.creds = pickle.load(token)
        
        if not self.creds or not self.creds.valid:
            if self.creds and self.creds.expired and self.creds.refresh_token:
                self.creds.refresh(Request())
            else:
                # Flujo de autenticación inicial
                from google_auth_oauthlib.flow import InstalledAppFlow
                flow = InstalledAppFlow.from_client_secrets_file(
                    'credentials.json', self.SCOPES)
                self.creds = flow.run_local_server(port=0)
            
            with open('token.pickle', 'wb') as token:
                pickle.dump(self.creds, token)
    
    def get_week_events(self, calendar_ids: list, week_start: str):
        """Obtener eventos de la semana"""
        service = build('calendar', 'v3', credentials=self.creds)
        
        # Calcular inicio y fin de semana
        from datetime import datetime, timedelta
        start = datetime.fromisoformat(week_start)
        end = start + timedelta(days=7)
        
        all_events = []
        for calendar_id in calendar_ids:
            events_result = service.events().list(
                calendarId=calendar_id,
                timeMin=start.isoformat() + 'Z',
                timeMax=end.isoformat() + 'Z',
                singleEvents=True,
                orderBy='startTime'
            ).execute()
            
            events = events_result.get('items', [])
            all_events.extend(events)
        
        return all_events
    
    def get_family_calendars(self):
        """Listar todos los calendarios disponibles"""
        service = build('calendar', 'v3', credentials=self.creds)
        
        calendars = service.calendarList().list().execute()
        return calendars.get('items', [])
```

**1.3 Nuevos endpoints en `app.py`**
```python
# En app.py

# Autenticación Google
@app.route('/api/google/auth/start')
def google_auth_start():
    """Iniciar flujo de autenticación"""
    calendar_sync = CalendarSync()
    auth_url = calendar_sync.get_auth_url()
    return jsonify({'auth_url': auth_url})

@app.route('/api/google/auth/callback')
def google_auth_callback():
    """Callback de autenticación"""
    code = request.args.get('code')
    calendar_sync = CalendarSync()
    success = calendar_sync.complete_auth(code)
    
    if success:
        return redirect('/?auth=success')
    else:
        return redirect('/?auth=error')

# Calendarios
@app.route('/api/calendar/list')
def list_calendars():
    """Listar calendarios disponibles"""
    calendar_sync = CalendarSync()
    calendars = calendar_sync.get_family_calendars()
    return jsonify({'success': True, 'data': calendars})

@app.route('/api/calendar/week')
def get_week_calendar():
    """Obtener eventos de la semana"""
    week_start = request.args.get('week_start')
    calendar_ids = request.args.getlist('calendar_ids')
    
    calendar_sync = CalendarSync()
    events = calendar_sync.get_week_events(calendar_ids, week_start)
    
    return jsonify({'success': True, 'data': events})

@app.route('/api/calendar/settings', methods=['GET', 'POST'])
def calendar_settings():
    """Guardar/obtener calendarios seleccionados"""
    if request.method == 'POST':
        data = request.json
        calendar_ids = data.get('calendar_ids', [])
        # Guardar en base de datos
        db.save_calendar_settings(calendar_ids)
        return jsonify({'success': True})
    else:
        settings = db.get_calendar_settings()
        return jsonify({'success': True, 'data': settings})
```

**1.4 Base de datos - Nueva tabla**
```sql
CREATE TABLE calendar_settings (
    id INTEGER PRIMARY KEY,
    calendar_ids TEXT NOT NULL,  -- JSON array
    sync_enabled BOOLEAN DEFAULT TRUE,
    last_sync TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE calendar_cache (
    id INTEGER PRIMARY KEY,
    calendar_id TEXT NOT NULL,
    event_id TEXT NOT NULL,
    event_data TEXT NOT NULL,  -- JSON
    start_time TIMESTAMP,
    end_time TIMESTAMP,
    cached_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
```

**1.5 Frontend - Widget de Calendar**
```javascript
// static/js/calendar_widget.js

class CalendarWidget {
    constructor(containerId) {
        this.container = document.getElementById(containerId);
        this.events = [];
        this.selectedCalendars = [];
    }
    
    async loadEvents(weekStart) {
        const params = new URLSearchParams({
            week_start: weekStart,
            calendar_ids: this.selectedCalendars
        });
        
        const response = await fetch(`/api/calendar/week?${params}`);
        const data = await response.json();
        
        if (data.success) {
            this.events = data.data;
            this.render();
        }
    }
    
    render() {
        const html = `
            <div class="calendar-widget">
                <h3>📅 Eventos de la Semana</h3>
                <div class="calendar-events">
                    ${this.renderEvents()}
                </div>
            </div>
        `;
        this.container.innerHTML = html;
    }
    
    renderEvents() {
        const days = this.groupEventsByDay(this.events);
        return Object.entries(days).map(([day, events]) => `
            <div class="calendar-day">
                <h4>${day}</h4>
                ${events.map(event => `
                    <div class="calendar-event">
                        <span class="time">${this.formatTime(event.start)}</span>
                        <span class="title">${event.summary}</span>
                    </div>
                `).join('')}
            </div>
        `).join('');
    }
    
    groupEventsByDay(events) {
        // Agrupar eventos por día
        const grouped = {};
        events.forEach(event => {
            const day = new Date(event.start.dateTime).toLocaleDateString('es-ES', {
                weekday: 'long',
                day: 'numeric',
                month: 'short'
            });
            if (!grouped[day]) grouped[day] = [];
            grouped[day].push(event);
        });
        return grouped;
    }
    
    formatTime(dateTime) {
        return new Date(dateTime).toLocaleTimeString('es-ES', {
            hour: '2-digit',
            minute: '2-digit'
        });
    }
}
```

#### Dependencias Nuevas
```txt
# Añadir a requirements.txt
google-auth==2.25.2
google-auth-oauthlib==1.2.0
google-auth-httplib2==0.2.0
google-api-python-client==2.111.0
```

---

### ✅ FASE 2: Todo List Integration (1-2 semanas)

#### Objetivos
- Conectar con Google Tasks API
- Mostrar listas de tareas familiares
- Permitir marcar como completadas

#### Tareas Técnicas

**2.1 Backend - Módulo `tasks_sync.py`**
```python
# tasks_sync.py
from googleapiclient.discovery import build
from google.oauth2.credentials import Credentials

class TasksSync:
    def __init__(self, credentials: Credentials):
        self.service = build('tasks', 'v1', credentials=credentials)
    
    def get_task_lists(self):
        """Obtener todas las listas de tareas"""
        results = self.service.tasklists().list().execute()
        return results.get('items', [])
    
    def get_tasks(self, tasklist_id: str, show_completed: bool = False):
        """Obtener tareas de una lista"""
        results = self.service.tasks().list(
            tasklist=tasklist_id,
            showCompleted=show_completed
        ).execute()
        return results.get('items', [])
    
    def add_task(self, tasklist_id: str, title: str, notes: str = None):
        """Añadir nueva tarea"""
        task = {
            'title': title,
            'notes': notes
        }
        result = self.service.tasks().insert(
            tasklist=tasklist_id,
            body=task
        ).execute()
        return result
    
    def complete_task(self, tasklist_id: str, task_id: str):
        """Marcar tarea como completada"""
        task = {
            'id': task_id,
            'status': 'completed'
        }
        result = self.service.tasks().update(
            tasklist=tasklist_id,
            task=task_id,
            body=task
        ).execute()
        return result
```

**2.2 Endpoints API**
```python
# En app.py

@app.route('/api/tasks/lists')
def get_task_lists():
    """Obtener listas de tareas"""
    tasks_sync = TasksSync(get_user_credentials())
    lists = tasks_sync.get_task_lists()
    return jsonify({'success': True, 'data': lists})

@app.route('/api/tasks/<tasklist_id>')
def get_tasks(tasklist_id):
    """Obtener tareas de una lista"""
    tasks_sync = TasksSync(get_user_credentials())
    tasks = tasks_sync.get_tasks(tasklist_id)
    return jsonify({'success': True, 'data': tasks})

@app.route('/api/tasks/<tasklist_id>/add', methods=['POST'])
def add_task(tasklist_id):
    """Añadir nueva tarea"""
    data = request.json
    tasks_sync = TasksSync(get_user_credentials())
    result = tasks_sync.add_task(
        tasklist_id, 
        data['title'], 
        data.get('notes')
    )
    return jsonify({'success': True, 'data': result})

@app.route('/api/tasks/<tasklist_id>/<task_id>/complete', methods=['POST'])
def complete_task(tasklist_id, task_id):
    """Completar tarea"""
    tasks_sync = TasksSync(get_user_credentials())
    result = tasks_sync.complete_task(tasklist_id, task_id)
    return jsonify({'success': True, 'data': result})
```

**2.3 Frontend - Widget de Tasks**
```javascript
// static/js/tasks_widget.js

class TasksWidget {
    constructor(containerId) {
        this.container = document.getElementById(containerId);
        this.tasks = [];
        this.selectedList = null;
    }
    
    async loadTasks(listId) {
        const response = await fetch(`/api/tasks/${listId}`);
        const data = await response.json();
        
        if (data.success) {
            this.tasks = data.data;
            this.render();
        }
    }
    
    async completeTask(listId, taskId) {
        const response = await fetch(
            `/api/tasks/${listId}/${taskId}/complete`,
            { method: 'POST' }
        );
        
        if (response.ok) {
            await this.loadTasks(listId);
        }
    }
    
    render() {
        const html = `
            <div class="tasks-widget">
                <h3>✅ Tareas Pendientes</h3>
                <div class="tasks-list">
                    ${this.renderTasks()}
                </div>
                <button onclick="tasksWidget.showAddForm()">
                    ➕ Nueva Tarea
                </button>
            </div>
        `;
        this.container.innerHTML = html;
    }
    
    renderTasks() {
        return this.tasks
            .filter(task => task.status !== 'completed')
            .map(task => `
                <div class="task-item">
                    <input type="checkbox" 
                           onclick="tasksWidget.completeTask('${this.selectedList}', '${task.id}')">
                    <span class="task-title">${task.title}</span>
                    ${task.notes ? `<p class="task-notes">${task.notes}</p>` : ''}
                </div>
            `).join('');
    }
}
```

---

### 🧹 FASE 3: Cleaning Schedule (1-2 semanas)

#### Objetivos
- Sistema de gestión de tareas de limpieza
- Rotación semanal entre miembros de la familia
- Tracking de completado

#### Tareas Técnicas

**3.1 Base de datos - Tablas de limpieza**
```sql
-- Plantillas de tareas de limpieza
CREATE TABLE cleaning_tasks (
    id INTEGER PRIMARY KEY,
    name TEXT NOT NULL,
    description TEXT,
    area TEXT,  -- cocina, baños, salón, etc.
    frequency TEXT,  -- diaria, semanal, mensual
    estimated_minutes INTEGER,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Asignaciones semanales
CREATE TABLE cleaning_schedule (
    id INTEGER PRIMARY KEY,
    task_id INTEGER,
    assigned_to TEXT,  -- nombre del miembro
    week_start_date DATE,
    day_of_week INTEGER,  -- 0=lunes, 6=domingo
    completed BOOLEAN DEFAULT FALSE,
    completed_at TIMESTAMP,
    FOREIGN KEY (task_id) REFERENCES cleaning_tasks(id)
);

-- Miembros de la familia (para rotación)
CREATE TABLE family_members (
    id INTEGER PRIMARY KEY,
    name TEXT NOT NULL,
    is_adult BOOLEAN,
    age INTEGER,
    can_do_cleaning BOOLEAN DEFAULT TRUE
);
```

**3.2 Backend - Módulo `cleaning_manager.py`**
```python
# cleaning_manager.py
from datetime import datetime, timedelta
from typing import List, Dict
import random

class CleaningManager:
    def __init__(self, db):
        self.db = db
    
    def create_task_template(self, task_data: Dict):
        """Crear plantilla de tarea de limpieza"""
        cursor = self.db.get_connection().cursor()
        cursor.execute('''
            INSERT INTO cleaning_tasks 
            (name, description, area, frequency, estimated_minutes)
            VALUES (?, ?, ?, ?, ?)
        ''', (
            task_data['name'],
            task_data.get('description', ''),
            task_data.get('area', ''),
            task_data.get('frequency', 'semanal'),
            task_data.get('estimated_minutes', 30)
        ))
        return cursor.lastrowid
    
    def generate_weekly_schedule(self, week_start: str):
        """Generar horario semanal de limpieza"""
        # Obtener todas las tareas semanales
        tasks = self.get_weekly_tasks()
        
        # Obtener miembros que pueden hacer limpieza
        members = self.get_cleaning_members()
        
        # Distribuir tareas equitativamente
        schedule = self.distribute_tasks(tasks, members, week_start)
        
        # Guardar en base de datos
        for assignment in schedule:
            self.save_assignment(assignment)
        
        return schedule
    
    def distribute_tasks(self, tasks: List, members: List, week_start: str):
        """Distribuir tareas entre miembros"""
        schedule = []
        member_index = 0
        
        for task in tasks:
            # Asignar a siguiente miembro (rotación)
            assigned_member = members[member_index % len(members)]
            
            # Determinar día de la semana
            day = self.get_best_day_for_task(task)
            
            schedule.append({
                'task_id': task['id'],
                'task_name': task['name'],
                'assigned_to': assigned_member['name'],
                'week_start_date': week_start,
                'day_of_week': day,
                'estimated_minutes': task['estimated_minutes']
            })
            
            member_index += 1
        
        return schedule
    
    def get_best_day_for_task(self, task: Dict) -> int:
        """Determinar mejor día para una tarea"""
        area_schedule = {
            'cocina': [0, 2, 4],  # lunes, miércoles, viernes
            'baños': [5],  # sábado
            'salón': [6],  # domingo
            'habitaciones': [1, 3]  # martes, jueves
        }
        
        possible_days = area_schedule.get(task.get('area', ''), [0, 3, 6])
        return random.choice(possible_days)
    
    def mark_completed(self, assignment_id: int):
        """Marcar tarea como completada"""
        cursor = self.db.get_connection().cursor()
        cursor.execute('''
            UPDATE cleaning_schedule 
            SET completed = TRUE, completed_at = ?
            WHERE id = ?
        ''', (datetime.now(), assignment_id))
        self.db.get_connection().commit()
    
    def get_week_schedule(self, week_start: str):
        """Obtener horario de la semana"""
        cursor = self.db.get_connection().cursor()
        cursor.execute('''
            SELECT cs.*, ct.name, ct.area, ct.estimated_minutes
            FROM cleaning_schedule cs
            JOIN cleaning_tasks ct ON cs.task_id = ct.id
            WHERE cs.week_start_date = ?
            ORDER BY cs.day_of_week, cs.assigned_to
        ''', (week_start,))
        
        return cursor.fetchall()
```

**3.3 Plantillas por Defecto**
```python
# Default cleaning tasks para una familia en Barcelona
DEFAULT_CLEANING_TASKS = [
    {
        'name': 'Limpiar cocina',
        'description': 'Limpiar encimeras, fogones y suelo',
        'area': 'cocina',
        'frequency': 'diaria',
        'estimated_minutes': 20
    },
    {
        'name': 'Fregar platos',
        'description': 'Lavar y guardar platos después de comidas',
        'area': 'cocina',
        'frequency': 'diaria',
        'estimated_minutes': 15
    },
    {
        'name': 'Limpiar baños',
        'description': 'Limpieza completa de baños',
        'area': 'baños',
        'frequency': 'semanal',
        'estimated_minutes': 45
    },
    {
        'name': 'Aspirar y fregar suelos',
        'description': 'Toda la casa',
        'area': 'general',
        'frequency': 'semanal',
        'estimated_minutes': 60
    },
    {
        'name': 'Ordenar salón',
        'description': 'Recoger y ordenar',
        'area': 'salón',
        'frequency': 'diaria',
        'estimated_minutes': 15
    },
    {
        'name': 'Cambiar sábanas',
        'description': 'Todas las habitaciones',
        'area': 'habitaciones',
        'frequency': 'semanal',
        'estimated_minutes': 30
    },
    {
        'name': 'Limpiar nevera',
        'description': 'Revisar caducidades y limpiar',
        'area': 'cocina',
        'frequency': 'semanal',
        'estimated_minutes': 20
    },
    {
        'name': 'Sacar basura',
        'description': 'Todos los cubos',
        'area': 'general',
        'frequency': 'diaria',
        'estimated_minutes': 10
    }
]
```

**3.4 Frontend - Widget de Limpieza**
```javascript
// static/js/cleaning_widget.js

class CleaningWidget {
    constructor(containerId) {
        this.container = document.getElementById(containerId);
        this.schedule = [];
    }
    
    async loadWeekSchedule(weekStart) {
        const response = await fetch(`/api/cleaning/week?week_start=${weekStart}`);
        const data = await response.json();
        
        if (data.success) {
            this.schedule = data.data;
            this.render();
        }
    }
    
    async markCompleted(assignmentId) {
        const response = await fetch(
            `/api/cleaning/${assignmentId}/complete`,
            { method: 'POST' }
        );
        
        if (response.ok) {
            await this.loadWeekSchedule(this.getCurrentWeekStart());
        }
    }
    
    render() {
        const byDay = this.groupByDay(this.schedule);
        
        const html = `
            <div class="cleaning-widget">
                <h3>🧹 Plan de Limpieza Semanal</h3>
                <div class="cleaning-schedule">
                    ${Object.entries(byDay).map(([day, tasks]) => `
                        <div class="cleaning-day">
                            <h4>${this.getDayName(day)}</h4>
                            ${tasks.map(task => this.renderTask(task)).join('')}
                        </div>
                    `).join('')}
                </div>
                <button onclick="cleaningWidget.regenerateWeek()">
                    🔄 Regenerar Semana
                </button>
            </div>
        `;
        
        this.container.innerHTML = html;
    }
    
    renderTask(task) {
        const completedClass = task.completed ? 'completed' : '';
        return `
            <div class="cleaning-task ${completedClass}">
                <input type="checkbox" 
                       ${task.completed ? 'checked' : ''}
                       onclick="cleaningWidget.markCompleted(${task.id})">
                <div class="task-info">
                    <span class="task-name">${task.name}</span>
                    <span class="task-assigned">👤 ${task.assigned_to}</span>
                    <span class="task-time">⏱️ ${task.estimated_minutes} min</span>
                </div>
            </div>
        `;
    }
    
    groupByDay(schedule) {
        const days = {};
        schedule.forEach(task => {
            if (!days[task.day_of_week]) {
                days[task.day_of_week] = [];
            }
            days[task.day_of_week].push(task);
        });
        return days;
    }
    
    getDayName(dayNum) {
        const days = ['Lunes', 'Martes', 'Miércoles', 'Jueves', 
                      'Viernes', 'Sábado', 'Domingo'];
        return days[dayNum];
    }
}
```

---

### 📺 FASE 4: Dashboard Unificado (2 semanas)

#### Objetivos
- Vista unificada de todos los módulos
- Dashboard configurable con widgets
- Optimización para TV/tablet
- Auto-refresh inteligente

#### Estructura del Dashboard

```
┌────────────────────────────────────────────────────┐
│  Family Command Center - Dashboard                  │
├────────────────────────────────────────────────────┤
│                                                     │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────┐ │
│  │  📅 Calendar │  │  🍳 k[AI]tchen│  │  ✅ Tasks│ │
│  │              │  │               │  │          │ │
│  │  Hoy:        │  │  Comida:      │  │ - Compra │ │
│  │  10:00 Médico│  │  Paella       │  │ - Llamar │ │
│  │  16:00 Fútbol│  │               │  │          │ │
│  │  Emma        │  │  Cena:        │  │          │ │
│  └──────────────┘  │  Ensalada     │  └──────────┘ │
│                    └──────────────┘                │
│  ┌──────────────────────────────────────────────┐  │
│  │  🧹 Tareas de Limpieza - Hoy                  │  │
│  │  ☐ Limpiar cocina (María) - 20 min           │  │
│  │  ☑ Fregar platos (Emma) - 15 min ✓          │  │
│  └──────────────────────────────────────────────┘  │
│                                                     │
│  [Settings] [Full Calendar] [Full Menu] [TV Mode]  │
└────────────────────────────────────────────────────┘
```

**4.1 Backend - Endpoint del Dashboard**
```python
# En app.py

@app.route('/api/dashboard/data')
def get_dashboard_data():
    """Obtener todos los datos del dashboard"""
    week_start = get_current_week_start()
    today = datetime.now().date()
    
    # Obtener datos de todos los módulos
    data = {
        'calendar': get_today_events(),
        'menu': get_today_menu(),
        'tasks': get_pending_tasks(),
        'cleaning': get_today_cleaning_tasks(today),
        'week_start': week_start,
        'last_updated': datetime.now().isoformat()
    }
    
    return jsonify({'success': True, 'data': data})

def get_today_events():
    """Helper: eventos de hoy"""
    calendar_sync = CalendarSync()
    events = calendar_sync.get_today_events()
    return events[:5]  # Primeros 5 eventos

def get_today_menu():
    """Helper: menú de hoy"""
    menu = db.get_latest_menu()
    if menu:
        today_name = datetime.now().strftime('%A').lower()
        # Traducir día al español
        day_map = {
            'monday': 'lunes',
            'tuesday': 'martes',
            'wednesday': 'miércoles',
            'thursday': 'jueves',
            'friday': 'viernes',
            'saturday': 'sábado',
            'sunday': 'domingo'
        }
        today_es = day_map.get(today_name, 'lunes')
        return menu['menu_data']['dias'].get(today_es, {})
    return {}

def get_pending_tasks():
    """Helper: tareas pendientes"""
    tasks_sync = TasksSync(get_user_credentials())
    lists = tasks_sync.get_task_lists()
    
    all_tasks = []
    for task_list in lists[:2]:  # Primeras 2 listas
        tasks = tasks_sync.get_tasks(task_list['id'])
        all_tasks.extend(tasks[:3])  # 3 tareas por lista
    
    return all_tasks

def get_today_cleaning_tasks(date):
    """Helper: tareas de limpieza de hoy"""
    day_num = date.weekday()
    week_start = date - timedelta(days=day_num)
    
    cleaning_mgr = CleaningManager(db)
    tasks = cleaning_mgr.get_day_tasks(week_start, day_num)
    return tasks
```

**4.2 Frontend - Dashboard Manager**
```javascript
// static/js/dashboard.js

class Dashboard {
    constructor() {
        this.widgets = [];
        this.refreshInterval = 5 * 60 * 1000; // 5 minutos
        this.autoRefreshEnabled = true;
    }
    
    async init() {
        await this.loadData();
        this.setupAutoRefresh();
        this.render();
    }
    
    async loadData() {
        const response = await fetch('/api/dashboard/data');
        const result = await response.json();
        
        if (result.success) {
            this.data = result.data;
        }
    }
    
    setupAutoRefresh() {
        if (this.autoRefreshEnabled) {
            setInterval(() => {
                this.loadData().then(() => this.render());
            }, this.refreshInterval);
        }
    }
    
    render() {
        const container = document.getElementById('dashboard');
        container.innerHTML = `
            <div class="dashboard-container">
                <div class="dashboard-header">
                    <h1>🏠 Family Command Center</h1>
                    <div class="dashboard-date">
                        ${this.getFormattedDate()}
                    </div>
                </div>
                
                <div class="dashboard-widgets">
                    ${this.renderCalendarWidget()}
                    ${this.renderMenuWidget()}
                    ${this.renderTasksWidget()}
                </div>
                
                <div class="dashboard-cleaning">
                    ${this.renderCleaningWidget()}
                </div>
                
                <div class="dashboard-footer">
                    <button onclick="dashboard.goToTVMode()">
                        📺 Modo TV
                    </button>
                    <span class="last-updated">
                        Actualizado: ${this.getLastUpdatedTime()}
                    </span>
                </div>
            </div>
        `;
    }
    
    renderCalendarWidget() {
        const events = this.data.calendar || [];
        return `
            <div class="widget calendar-widget">
                <h3>📅 Hoy</h3>
                ${events.length === 0 ? 
                    '<p class="no-events">No hay eventos hoy</p>' :
                    events.map(event => `
                        <div class="event-item">
                            <span class="time">${this.formatTime(event.start)}</span>
                            <span class="title">${event.summary}</span>
                        </div>
                    `).join('')
                }
                <a href="/calendar" class="widget-link">Ver calendario completo →</a>
            </div>
        `;
    }
    
    renderMenuWidget() {
        const menu = this.data.menu || {};
        return `
            <div class="widget menu-widget">
                <h3>🍳 Menú de Hoy</h3>
                ${Object.keys(menu).length === 0 ?
                    '<p class="no-menu">No hay menú generado</p>' :
                    `
                    <div class="menu-meals">
                        ${menu.comida ? `<div class="meal">
                            <strong>Comida:</strong> ${menu.comida}
                        </div>` : ''}
                        ${menu.cena ? `<div class="meal">
                            <strong>Cena:</strong> ${menu.cena}
                        </div>` : ''}
                    </div>
                    `
                }
                <a href="/menu" class="widget-link">Ver menú completo →</a>
            </div>
        `;
    }
    
    renderTasksWidget() {
        const tasks = this.data.tasks || [];
        return `
            <div class="widget tasks-widget">
                <h3>✅ Tareas Pendientes</h3>
                ${tasks.length === 0 ?
                    '<p class="no-tasks">No hay tareas pendientes</p>' :
                    tasks.slice(0, 5).map(task => `
                        <div class="task-item">
                            <input type="checkbox" 
                                   data-task-id="${task.id}">
                            <span>${task.title}</span>
                        </div>
                    `).join('')
                }
                <a href="/tasks" class="widget-link">Ver todas las tareas →</a>
            </div>
        `;
    }
    
    renderCleaningWidget() {
        const tasks = this.data.cleaning || [];
        return `
            <div class="widget cleaning-widget-full">
                <h3>🧹 Limpieza de Hoy</h3>
                ${tasks.length === 0 ?
                    '<p class="no-cleaning">No hay tareas de limpieza hoy</p>' :
                    tasks.map(task => `
                        <div class="cleaning-item ${task.completed ? 'completed' : ''}">
                            <input type="checkbox" 
                                   ${task.completed ? 'checked' : ''}
                                   data-cleaning-id="${task.id}">
                            <span class="task-name">${task.name}</span>
                            <span class="task-assigned">👤 ${task.assigned_to}</span>
                            <span class="task-time">⏱️ ${task.estimated_minutes} min</span>
                        </div>
                    `).join('')
                }
            </div>
        `;
    }
    
    getFormattedDate() {
        return new Date().toLocaleDateString('es-ES', {
            weekday: 'long',
            year: 'numeric',
            month: 'long',
            day: 'numeric'
        });
    }
    
    formatTime(dateTime) {
        return new Date(dateTime).toLocaleTimeString('es-ES', {
            hour: '2-digit',
            minute: '2-digit'
        });
    }
    
    getLastUpdatedTime() {
        const date = new Date(this.data.last_updated);
        return date.toLocaleTimeString('es-ES');
    }
    
    goToTVMode() {
        window.location.href = '/tv-dashboard';
    }
}

// Inicializar dashboard al cargar página
let dashboard;
document.addEventListener('DOMContentLoaded', () => {
    dashboard = new Dashboard();
    dashboard.init();
});
```

**4.3 Vista TV - Nueva plantilla `tv_dashboard.html`**
```html
<!DOCTYPE html>
<html lang="es">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Family Command Center - TV</title>
    <style>
        * {
            margin: 0;
            padding: 0;
            box-sizing: border-box;
        }
        
        body {
            font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
            background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
            color: white;
            padding: 40px;
            height: 100vh;
            overflow: hidden;
        }
        
        .tv-header {
            text-align: center;
            margin-bottom: 40px;
        }
        
        .tv-header h1 {
            font-size: 4rem;
            text-shadow: 2px 2px 4px rgba(0,0,0,0.3);
        }
        
        .tv-date {
            font-size: 2rem;
            opacity: 0.9;
            margin-top: 10px;
        }
        
        .tv-widgets {
            display: grid;
            grid-template-columns: repeat(3, 1fr);
            gap: 30px;
            margin-bottom: 40px;
        }
        
        .tv-widget {
            background: rgba(255, 255, 255, 0.15);
            backdrop-filter: blur(10px);
            border-radius: 20px;
            padding: 30px;
            border: 2px solid rgba(255, 255, 255, 0.3);
        }
        
        .tv-widget h3 {
            font-size: 2.5rem;
            margin-bottom: 20px;
        }
        
        .tv-event, .tv-meal, .tv-task {
            font-size: 1.8rem;
            padding: 15px;
            margin: 10px 0;
            background: rgba(255, 255, 255, 0.1);
            border-radius: 10px;
        }
        
        .tv-cleaning {
            background: rgba(255, 255, 255, 0.15);
            backdrop-filter: blur(10px);
            border-radius: 20px;
            padding: 30px;
            border: 2px solid rgba(255, 255, 255, 0.3);
        }
        
        .tv-cleaning h3 {
            font-size: 2.5rem;
            margin-bottom: 20px;
        }
        
        .tv-cleaning-item {
            display: flex;
            align-items: center;
            font-size: 1.8rem;
            padding: 15px;
            margin: 10px 0;
            background: rgba(255, 255, 255, 0.1);
            border-radius: 10px;
        }
        
        .tv-cleaning-item.completed {
            opacity: 0.5;
            text-decoration: line-through;
        }
        
        .last-updated {
            text-align: center;
            font-size: 1.5rem;
            margin-top: 30px;
            opacity: 0.7;
        }
    </style>
</head>
<body>
    <div class="tv-header">
        <h1>🏠 Family Command Center</h1>
        <div class="tv-date" id="current-date"></div>
    </div>
    
    <div class="tv-widgets">
        <div class="tv-widget">
            <h3>📅 Hoy</h3>
            <div id="tv-calendar"></div>
        </div>
        
        <div class="tv-widget">
            <h3>🍳 Menú</h3>
            <div id="tv-menu"></div>
        </div>
        
        <div class="tv-widget">
            <h3>✅ Tareas</h3>
            <div id="tv-tasks"></div>
        </div>
    </div>
    
    <div class="tv-cleaning">
        <h3>🧹 Limpieza de Hoy</h3>
        <div id="tv-cleaning"></div>
    </div>
    
    <div class="last-updated">
        Actualizado: <span id="last-update-time"></span>
    </div>
    
    <script>
        // Auto-refresh cada 5 minutos
        let tvDashboard = {
            refreshInterval: 5 * 60 * 1000,
            
            async loadData() {
                const response = await fetch('/api/dashboard/data');
                const result = await response.json();
                
                if (result.success) {
                    this.render(result.data);
                }
            },
            
            render(data) {
                // Fecha actual
                document.getElementById('current-date').textContent = 
                    new Date().toLocaleDateString('es-ES', {
                        weekday: 'long',
                        year: 'numeric',
                        month: 'long',
                        day: 'numeric'
                    });
                
                // Calendar
                const calendarEl = document.getElementById('tv-calendar');
                const events = data.calendar || [];
                calendarEl.innerHTML = events.length === 0 ?
                    '<p>No hay eventos hoy</p>' :
                    events.map(e => `
                        <div class="tv-event">
                            ${this.formatTime(e.start)} - ${e.summary}
                        </div>
                    `).join('');
                
                // Menu
                const menuEl = document.getElementById('tv-menu');
                const menu = data.menu || {};
                menuEl.innerHTML = Object.keys(menu).length === 0 ?
                    '<p>No hay menú</p>' :
                    `
                    ${menu.comida ? `<div class="tv-meal">
                        <strong>Comida:</strong><br>${menu.comida}
                    </div>` : ''}
                    ${menu.cena ? `<div class="tv-meal">
                        <strong>Cena:</strong><br>${menu.cena}
                    </div>` : ''}
                    `;
                
                // Tasks
                const tasksEl = document.getElementById('tv-tasks');
                const tasks = data.tasks || [];
                tasksEl.innerHTML = tasks.length === 0 ?
                    '<p>No hay tareas</p>' :
                    tasks.slice(0, 5).map(t => `
                        <div class="tv-task">• ${t.title}</div>
                    `).join('');
                
                // Cleaning
                const cleaningEl = document.getElementById('tv-cleaning');
                const cleaning = data.cleaning || [];
                cleaningEl.innerHTML = cleaning.length === 0 ?
                    '<p>No hay tareas de limpieza</p>' :
                    cleaning.map(c => `
                        <div class="tv-cleaning-item ${c.completed ? 'completed' : ''}">
                            ${c.completed ? '✓' : '○'} 
                            ${c.name} (${c.assigned_to}) - ${c.estimated_minutes} min
                        </div>
                    `).join('');
                
                // Last updated
                document.getElementById('last-update-time').textContent =
                    new Date().toLocaleTimeString('es-ES');
            },
            
            formatTime(dateTime) {
                return new Date(dateTime).toLocaleTimeString('es-ES', {
                    hour: '2-digit',
                    minute: '2-digit'
                });
            },
            
            init() {
                this.loadData();
                setInterval(() => this.loadData(), this.refreshInterval);
            }
        };
        
        tvDashboard.init();
    </script>
</body>
</html>
```

---

## 📱 Diseño Responsive

### Breakpoints
```css
/* Mobile */
@media (max-width: 768px) {
    .dashboard-widgets {
        grid-template-columns: 1fr;
    }
}

/* Tablet */
@media (min-width: 769px) and (max-width: 1024px) {
    .dashboard-widgets {
        grid-template-columns: repeat(2, 1fr);
    }
}

/* Desktop */
@media (min-width: 1025px) {
    .dashboard-widgets {
        grid-template-columns: repeat(3, 1fr);
    }
}

/* TV */
@media (min-width: 1920px) {
    .dashboard-widgets {
        grid-template-columns: repeat(3, 1fr);
        gap: 40px;
    }
    
    .widget {
        font-size: 1.2rem;
    }
}
```

---

## 🔐 Seguridad y Privacidad

### Google OAuth Setup

1. **Crear proyecto en Google Cloud Console**
2. **Habilitar APIs necesarias**
3. **Configurar OAuth consent screen**
4. **Crear credenciales OAuth 2.0**
5. **Añadir authorized redirect URIs**

### Gestión de Tokens

```python
# config.py
import os
from pathlib import Path

class Config:
    # Ruta para almacenar tokens
    TOKEN_DIR = Path.home() / '.kaitchen' / 'tokens'
    
    # Crear directorio si no existe
    TOKEN_DIR.mkdir(parents=True, exist_ok=True)
    
    # Paths de archivos
    GOOGLE_CREDENTIALS = TOKEN_DIR / 'credentials.json'
    GOOGLE_TOKEN = TOKEN_DIR / 'token.pickle'
    
    # Scopes necesarios
    GOOGLE_SCOPES = [
        'https://www.googleapis.com/auth/calendar.readonly',
        'https://www.googleapis.com/auth/tasks'
    ]
```

---

## 📊 Estimación de Tiempo Total

| Fase | Duración | Complejidad |
|------|----------|-------------|
| Fase 1: Google Calendar | 2-3 semanas | Media-Alta |
| Fase 2: Todo List | 1-2 semanas | Media |
| Fase 3: Cleaning Schedule | 1-2 semanas | Baja-Media |
| Fase 4: Dashboard Unificado | 2 semanas | Media |
| **TOTAL** | **6-9 semanas** | - |

---

## 📦 Nuevas Dependencias

```txt
# Añadir a requirements.txt

# Google APIs
google-auth==2.25.2
google-auth-oauthlib==1.2.0
google-auth-httplib2==0.2.0
google-api-python-client==2.111.0

# Existentes (ya las tienes)
Flask==3.0.0
anthropic==0.8.1
# ... resto de dependencias existentes
```

---

## 🎨 Paleta de Colores Sugerida

```css
:root {
    /* Primary */
    --primary: #667eea;
    --primary-dark: #764ba2;
    
    /* Widgets */
    --calendar-color: #4CAF50;
    --menu-color: #FF9800;
    --tasks-color: #2196F3;
    --cleaning-color: #9C27B0;
    
    /* UI */
    --bg-main: #f5f5f5;
    --widget-bg: white;
    --text-primary: #333;
    --text-secondary: #666;
}
```

---

## 🔄 Flujo de Trabajo Diario

### Para la Familia

**Mañana:**
1. Abrir TV Dashboard en cocina
2. Ver eventos del día
3. Check menú (desayuno/comida/cena)
4. Revisar tareas pendientes
5. Ver asignaciones de limpieza

**Durante el día:**
- Marcar tareas completadas desde móvil/tablet
- Actualizar Google Calendar si hay cambios
- Añadir items a lista de compra

**Noche:**
- Review de tareas completadas
- Preparación para día siguiente

---

## 🚀 Quick Start After Implementation

```bash
# 1. Instalar nuevas dependencias
pip install -r requirements.txt

# 2. Configurar Google OAuth
python setup_google_oauth.py

# 3. Inicializar tablas nuevas
python init.py --update-schema

# 4. Cargar plantillas de limpieza por defecto
python load_cleaning_defaults.py

# 5. Ejecutar servidor
python app.py

# 6. Abrir navegador
# Admin: http://localhost:7000
# TV Dashboard: http://localhost:7000/tv-dashboard
```

---

## 📱 Apps Móviles Futuras

### Consideraciones para Fase 5 (Opcional)

- **React Native** para iOS/Android
- **Flutter** alternativa
- Notificaciones push
- Widgets nativos
- Sincronización offline

---

## 🎯 KPIs de Éxito

1. **Uso Diario**: Familia revisa dashboard al menos 1 vez al día
2. **Completado de Tareas**: >80% de tareas de limpieza completadas
3. **Precisión de Menú**: Menú sigue usándose semanalmente
4. **Sincronización**: Eventos de calendar actualizados en <5 minutos
5. **Satisfacción**: Todos los miembros reportan que es útil

---

## 🆘 Soporte y Troubleshooting

### Problemas Comunes

**Google API no conecta:**
- Verificar credenciales.json
- Revisar scopes configurados
- Comprobar redirect URIs

**Dashboard no actualiza:**
- Verificar auto-refresh enabled
- Revisar logs del servidor
- Comprobar caché del navegador

**Tareas de limpieza no se generan:**
- Verificar plantillas cargadas
- Revisar miembros de familia
- Comprobar fecha de inicio de semana

---

## 🎉 Conclusión

Este plan convierte k[AI]tchen en un **verdadero centro de comando familiar** que:

✅ Integra todos los aspectos de organización familiar  
✅ Aprovecha servicios de Google que ya usas  
✅ Mantiene la arquitectura existente (Flask + PostgreSQL)  
✅ Es escalable y mantenible  
✅ Optimizado para uso familiar real  
✅ Vista TV para uso en cocina  

**Prioridad sugerida:**
1. Fase 1 (Calendar) - Más útil
2. Fase 3 (Cleaning) - Más fácil de implementar
3. Fase 2 (Tasks) - Complementaria
4. Fase 4 (Dashboard) - Unificar todo

---

**¿Comenzamos con alguna fase específica?** 🚀
