# 🏠 Family Command Center - Código de Ejemplo

## 📝 Configuración Específica para Barcelona

### Configuración Regional

```python
# config_barcelona.py

from datetime import datetime
import locale

# Configurar localización española
try:
    locale.setlocale(locale.LC_TIME, 'es_ES.UTF-8')
except:
    try:
        locale.setlocale(locale.LC_TIME, 'Spanish_Spain')
    except:
        pass  # Usar default

class BarcelonaConfig:
    """Configuración específica para familia en Barcelona"""
    
    # Información familiar
    FAMILY_SIZE = 5
    ADULTS = 3
    CHILDREN = 2
    CHILDREN_AGES = [4, 12]
    
    # Localización
    TIMEZONE = 'Europe/Madrid'
    LOCALE = 'es_ES'
    CITY = 'Barcelona'
    
    # Horarios típicos en Barcelona
    BREAKFAST_TIME = '08:00'
    LUNCH_TIME = '14:00'
    SNACK_TIME = '17:30'
    DINNER_TIME = '21:00'
    
    # Días de la semana en español
    WEEKDAYS = {
        0: 'lunes',
        1: 'martes',
        2: 'miércoles',
        3: 'jueves',
        4: 'viernes',
        5: 'sábado',
        6: 'domingo'
    }
    
    # Comidas típicas catalanas/españolas
    TYPICAL_DISHES = [
        'Paella',
        'Fideuá',
        'Escalivada',
        'Pan con tomate',
        'Crema catalana',
        'Esqueixada',
        'Butifarra con judías',
        'Suquet de pescado'
    ]
    
    # Supermercados locales para lista de compra
    NEARBY_SUPERMARKETS = [
        {'name': 'Mercadona', 'distance': '5 min'},
        {'name': 'Carrefour', 'distance': '10 min'},
        {'name': 'Lidl', 'distance': '7 min'},
        {'name': 'Caprabo', 'distance': '8 min'}
    ]
    
    # Festividades locales
    LOCAL_HOLIDAYS = [
        '2026-04-06',  # Lunes de Pascua
        '2026-04-23',  # Sant Jordi
        '2026-06-24',  # Sant Joan
        '2026-09-11',  # Diada de Catalunya
        '2026-09-24',  # La Mercè
    ]
```

---

## 🧹 Sistema de Limpieza Adaptado a Barcelona

### Rutina de Limpieza para Familia de 5

```python
# cleaning_barcelona.py

from datetime import datetime, timedelta
from typing import List, Dict

class BarcelonaCleaningSystem:
    """Sistema de limpieza adaptado a familias en Barcelona"""
    
    def __init__(self, db):
        self.db = db
        self.family_members = self.get_family_members()
    
    def get_family_members(self):
        """Obtener miembros de la familia con capacidad de limpieza"""
        return [
            {'name': 'Adulto 1', 'age': None, 'can_clean': True, 'heavy_duty': True},
            {'name': 'Adulto 2', 'age': None, 'can_clean': True, 'heavy_duty': True},
            {'name': 'Adulto 3', 'age': None, 'can_clean': True, 'heavy_duty': True},
            {'name': 'Niña 12 años', 'age': 12, 'can_clean': True, 'heavy_duty': False},
            {'name': 'Niña 4 años', 'age': 4, 'can_clean': True, 'heavy_duty': False}
        ]
    
    def get_barcelona_cleaning_tasks(self):
        """Tareas de limpieza específicas para piso en Barcelona"""
        return [
            # Tareas diarias
            {
                'name': 'Limpiar cocina después de comidas',
                'frequency': 'diaria',
                'times_per_week': 7,
                'minutes': 20,
                'suitable_for_children': True,
                'min_age': 10,
                'area': 'cocina',
                'priority': 'alta'
            },
            {
                'name': 'Fregar platos',
                'frequency': 'diaria',
                'times_per_week': 14,  # 2 veces al día
                'minutes': 15,
                'suitable_for_children': True,
                'min_age': 10,
                'area': 'cocina',
                'priority': 'alta'
            },
            {
                'name': 'Ordenar salón/comedor',
                'frequency': 'diaria',
                'times_per_week': 7,
                'minutes': 15,
                'suitable_for_children': True,
                'min_age': 4,
                'area': 'salón',
                'priority': 'media'
            },
            {
                'name': 'Recoger juguetes (niñas)',
                'frequency': 'diaria',
                'times_per_week': 7,
                'minutes': 10,
                'suitable_for_children': True,
                'min_age': 4,
                'area': 'habitaciones',
                'priority': 'media'
            },
            {
                'name': 'Sacar basura y reciclaje',
                'frequency': 'diaria',
                'times_per_week': 7,
                'minutes': 10,
                'suitable_for_children': True,
                'min_age': 10,
                'area': 'general',
                'priority': 'alta',
                'notes': 'Barcelona tiene recogida selectiva: orgánico, papel, vidrio, plástico'
            },
            
            # Tareas semanales
            {
                'name': 'Limpiar baños completo',
                'frequency': 'semanal',
                'times_per_week': 2,  # Miércoles y domingo
                'minutes': 45,
                'suitable_for_children': False,
                'area': 'baños',
                'priority': 'alta'
            },
            {
                'name': 'Aspirar y fregar suelos',
                'frequency': 'semanal',
                'times_per_week': 2,
                'minutes': 60,
                'suitable_for_children': False,
                'area': 'general',
                'priority': 'alta',
                'notes': 'Todo el piso incluyendo pasillos'
            },
            {
                'name': 'Cambiar sábanas',
                'frequency': 'semanal',
                'times_per_week': 1,
                'minutes': 40,
                'suitable_for_children': True,
                'min_age': 12,
                'area': 'habitaciones',
                'priority': 'media'
            },
            {
                'name': 'Limpiar ventanas y balcón',
                'frequency': 'semanal',
                'times_per_week': 1,
                'minutes': 30,
                'suitable_for_children': False,
                'area': 'general',
                'priority': 'baja',
                'notes': 'Importante en Barcelona por la calima y polvo'
            },
            {
                'name': 'Limpiar nevera',
                'frequency': 'semanal',
                'times_per_week': 1,
                'minutes': 20,
                'suitable_for_children': True,
                'min_age': 12,
                'area': 'cocina',
                'priority': 'media'
            },
            {
                'name': 'Planchar ropa',
                'frequency': 'semanal',
                'times_per_week': 2,
                'minutes': 45,
                'suitable_for_children': False,
                'area': 'lavandería',
                'priority': 'media'
            },
            
            # Tareas mensuales
            {
                'name': 'Limpieza profunda de cocina',
                'frequency': 'mensual',
                'times_per_month': 1,
                'minutes': 90,
                'suitable_for_children': False,
                'area': 'cocina',
                'priority': 'media',
                'notes': 'Incluye horno, campana extractora, armarios'
            },
            {
                'name': 'Ordenar armarios y cajones',
                'frequency': 'mensual',
                'times_per_month': 1,
                'minutes': 60,
                'suitable_for_children': True,
                'min_age': 12,
                'area': 'habitaciones',
                'priority': 'baja'
            }
        ]
    
    def generate_smart_schedule(self, week_start: str):
        """Generar horario inteligente considerando edad y capacidad"""
        tasks = self.get_barcelona_cleaning_tasks()
        schedule = []
        
        # Filtrar tareas semanales
        weekly_tasks = [t for t in tasks if t['frequency'] == 'semanal']
        daily_tasks = [t for t in tasks if t['frequency'] == 'diaria']
        
        # Distribuir tareas diarias
        for day in range(7):
            day_date = datetime.fromisoformat(week_start) + timedelta(days=day)
            
            for task in daily_tasks:
                # Encontrar miembro apropiado
                suitable_member = self.find_suitable_member(task)
                
                if suitable_member:
                    schedule.append({
                        'task': task['name'],
                        'assigned_to': suitable_member['name'],
                        'date': day_date.date(),
                        'day_of_week': day,
                        'estimated_minutes': task['minutes'],
                        'priority': task['priority'],
                        'area': task['area']
                    })
        
        # Distribuir tareas semanales estratégicamente
        weekly_distribution = {
            0: ['Limpiar nevera'],  # Lunes
            2: ['Limpiar baños completo', 'Planchar ropa'],  # Miércoles
            4: ['Aspirar y fregar suelos'],  # Viernes
            5: ['Cambiar sábanas'],  # Sábado
            6: ['Limpiar baños completo', 'Limpiar ventanas y balcón']  # Domingo
        }
        
        for day, task_names in weekly_distribution.items():
            day_date = datetime.fromisoformat(week_start) + timedelta(days=day)
            
            for task_name in task_names:
                task = next((t for t in weekly_tasks if t['name'] == task_name), None)
                if task:
                    suitable_member = self.find_suitable_member(task)
                    
                    if suitable_member:
                        schedule.append({
                            'task': task['name'],
                            'assigned_to': suitable_member['name'],
                            'date': day_date.date(),
                            'day_of_week': day,
                            'estimated_minutes': task['minutes'],
                            'priority': task['priority'],
                            'area': task['area'],
                            'notes': task.get('notes', '')
                        })
        
        return schedule
    
    def find_suitable_member(self, task: Dict):
        """Encontrar miembro apropiado para la tarea"""
        suitable = []
        
        for member in self.family_members:
            # Verificar si puede hacer la tarea
            if not member['can_clean']:
                continue
            
            # Si requiere "heavy duty" y el miembro no puede
            if task.get('suitable_for_children') == False and not member['heavy_duty']:
                continue
            
            # Verificar edad mínima
            min_age = task.get('min_age', 0)
            if member['age'] and member['age'] < min_age:
                continue
            
            suitable.append(member)
        
        # Rotar entre miembros aptos
        if suitable:
            import random
            return random.choice(suitable)
        
        return None
    
    def get_task_distribution_by_member(self, week_start: str):
        """Análisis de distribución de tareas por miembro"""
        schedule = self.generate_smart_schedule(week_start)
        
        distribution = {}
        for assignment in schedule:
            member = assignment['assigned_to']
            if member not in distribution:
                distribution[member] = {
                    'total_tasks': 0,
                    'total_minutes': 0,
                    'tasks_by_day': [0] * 7
                }
            
            distribution[member]['total_tasks'] += 1
            distribution[member]['total_minutes'] += assignment['estimated_minutes']
            distribution[member]['tasks_by_day'][assignment['day_of_week']] += 1
        
        return distribution
```

---

## 📅 Integración con Horarios Escolares Barcelona

```python
# school_schedule_barcelona.py

class BarcelonaSchoolSchedule:
    """Integración con horarios escolares típicos en Barcelona"""
    
    def __init__(self):
        self.school_calendar = self.get_school_calendar_2025_2026()
    
    def get_school_calendar_2025_2026(self):
        """Calendario escolar Barcelona 2025-2026"""
        return {
            'year': '2025-2026',
            'term_1_start': '2025-09-12',
            'term_1_end': '2025-12-23',
            'term_2_start': '2026-01-08',
            'term_2_end': '2026-03-27',
            'term_3_start': '2026-04-07',
            'term_3_end': '2026-06-22',
            
            'holidays': {
                'Navidad': ('2025-12-23', '2026-01-07'),
                'Semana Santa': ('2026-03-28', '2026-04-06'),
                'Verano': ('2026-06-23', '2026-09-11')
            },
            
            'non_school_days': [
                '2025-10-12',  # Fiesta Nacional
                '2025-11-01',  # Todos los Santos
                '2025-12-06',  # Constitución
                '2025-12-08',  # Inmaculada
                '2026-04-06',  # Lunes de Pascua
                '2026-05-01',  # Día del Trabajo
                '2026-06-24',  # Sant Joan
            ]
        }
    
    def is_school_day(self, date_str: str) -> bool:
        """Verificar si es día escolar"""
        from datetime import datetime
        
        date = datetime.fromisoformat(date_str).date()
        
        # Verificar si es fin de semana
        if date.weekday() >= 5:
            return False
        
        # Verificar si está en periodo de vacaciones
        for holiday_name, (start, end) in self.school_calendar['holidays'].items():
            start_date = datetime.fromisoformat(start).date()
            end_date = datetime.fromisoformat(end).date()
            if start_date <= date <= end_date:
                return False
        
        # Verificar días festivos individuales
        if date_str in self.school_calendar['non_school_days']:
            return False
        
        return True
    
    def get_school_schedule_for_age(self, age: int):
        """Horario escolar típico según edad"""
        if age <= 6:  # Infantil
            return {
                'morning_start': '09:00',
                'morning_end': '12:30',
                'afternoon_start': '15:00',
                'afternoon_end': '17:00',
                'has_lunch_at_school': True
            }
        elif age <= 12:  # Primaria
            return {
                'morning_start': '09:00',
                'morning_end': '13:00',
                'afternoon_start': '15:00',
                'afternoon_end': '17:00',
                'has_lunch_at_school': True
            }
        else:  # Secundaria
            return {
                'morning_start': '08:00',
                'morning_end': '14:30',
                'has_lunch_at_school': False
            }
    
    def adjust_menu_for_school_day(self, menu: Dict, date_str: str, children_ages: List[int]):
        """Ajustar menú según si las niñas comen en el colegio"""
        is_school = self.is_school_day(date_str)
        
        if is_school:
            # Las niñas comen en el colegio
            menu['notes'] = 'Niñas comen en el colegio'
            menu['lunch_portions_adults'] = 3  # Solo adultos
            menu['lunch_portions_children'] = 0
            
            # Cena importante (comida principal del día para niñas)
            menu['dinner_importance'] = 'alta'
            menu['dinner_notes'] = 'Cena completa - las niñas no han comido en casa'
        else:
            # Fin de semana o vacaciones - todos en casa
            menu['lunch_portions_adults'] = 3
            menu['lunch_portions_children'] = 2
            menu['dinner_importance'] = 'normal'
        
        return menu
```

---

## 🗓️ Widget de Calendar con Eventos Típicos de Barcelona

```javascript
// barcelona_calendar.js

class BarcelonaCalendarWidget {
    constructor(containerId) {
        this.container = document.getElementById(containerId);
        this.barcelonaEvents = this.getTypicalBarcelonaEvents();
    }
    
    getTypicalBarcelonaEvents() {
        return {
            'recurring_weekly': [
                {
                    day: 1,  // Martes
                    time: '17:30',
                    title: 'Actividades extraescolares (Niña 12)',
                    icon: '⚽'
                },
                {
                    day: 3,  // Jueves
                    time: '17:30',
                    title: 'Clase de natación (Niña 4)',
                    icon: '🏊'
                },
                {
                    day: 5,  // Sábado
                    time: '10:00',
                    title: 'Compra en Mercadona',
                    icon: '🛒'
                }
            ],
            'local_holidays': [
                {
                    date: '2026-04-23',
                    title: 'Sant Jordi 🌹📚',
                    description: 'Día del libro y de la rosa',
                    type: 'cultural'
                },
                {
                    date: '2026-06-23',
                    title: 'Verbena de Sant Joan 🔥',
                    description: 'Noche más corta del año',
                    type: 'cultural'
                },
                {
                    date: '2026-09-11',
                    title: 'Diada de Catalunya',
                    description: 'Fiesta nacional de Cataluña',
                    type: 'holiday'
                },
                {
                    date: '2026-09-24',
                    title: 'Fiestas de la Mercè 🎉',
                    description: 'Fiestas mayores de Barcelona',
                    type: 'cultural'
                }
            ]
        };
    }
    
    addRecurringEvents(events) {
        const today = new Date();
        const weekStart = this.getWeekStart(today);
        
        this.barcelonaEvents.recurring_weekly.forEach(recurring => {
            const eventDate = new Date(weekStart);
            eventDate.setDate(eventDate.getDate() + recurring.day);
            
            events.push({
                summary: `${recurring.icon} ${recurring.title}`,
                start: {
                    dateTime: `${eventDate.toISOString().split('T')[0]}T${recurring.time}:00`
                },
                type: 'recurring'
            });
        });
        
        return events;
    }
    
    renderWithLocalContext(events) {
        const today = new Date().toISOString().split('T')[0];
        const todayEvents = events.filter(e => 
            e.start.dateTime && e.start.dateTime.startsWith(today)
        );
        
        // Añadir eventos recurrentes
        const allEvents = this.addRecurringEvents(todayEvents);
        
        // Verificar si hay fiestas locales
        const localHoliday = this.barcelonaEvents.local_holidays.find(
            h => h.date === today
        );
        
        let html = '<div class="barcelona-calendar">';
        
        if (localHoliday) {
            html += `
                <div class="local-holiday-banner">
                    🎊 ${localHoliday.title}
                    <p>${localHoliday.description}</p>
                </div>
            `;
        }
        
        html += '<h3>📅 Eventos de Hoy</h3>';
        
        if (allEvents.length === 0) {
            html += '<p class="no-events">No hay eventos programados</p>';
        } else {
            // Ordenar por hora
            allEvents.sort((a, b) => 
                a.start.dateTime.localeCompare(b.start.dateTime)
            );
            
            allEvents.forEach(event => {
                const time = new Date(event.start.dateTime).toLocaleTimeString('es-ES', {
                    hour: '2-digit',
                    minute: '2-digit'
                });
                
                html += `
                    <div class="calendar-event">
                        <span class="event-time">${time}</span>
                        <span class="event-title">${event.summary}</span>
                    </div>
                `;
            });
        }
        
        html += '</div>';
        this.container.innerHTML = html;
    }
    
    getWeekStart(date) {
        const day = date.getDay();
        const diff = date.getDate() - day + (day === 0 ? -6 : 1);
        return new Date(date.setDate(diff));
    }
}
```

---

## 🍽️ Menú Adaptado a Barcelona

```python
# menu_barcelona_adapter.py

class BarcelonaMenuAdapter:
    """Adaptador de menús con preferencias típicas de Barcelona"""
    
    def __init__(self):
        self.catalan_preferences = self.get_catalan_food_preferences()
    
    def get_catalan_food_preferences(self):
        return {
            'breakfast': {
                'typical': [
                    'Pan con tomate y aceite',
                    'Croissant',
                    'Magdalenas',
                    'Galletas María con cola cao'
                ],
                'beverages': ['Café con leche', 'Cola cao', 'Zumo natural']
            },
            'lunch': {
                'starters': [
                    'Ensalada catalana',
                    'Esqueixada',
                    'Pa amb tomàquet',
                    'Escalivada'
                ],
                'mains': [
                    'Paella',
                    'Fideuá',
                    'Suquet de peix',
                    'Butifarra con judías',
                    'Escudella i carn d\'olla',
                    'Canelones (especialmente en Navidad)'
                ],
                'time': '14:00 - 15:00'
            },
            'merienda': {
                'typical': [
                    'Bocadillo',
                    'Fruta',
                    'Yogur',
                    'Pan con chocolate'
                ],
                'time': '17:30 - 18:00'
            },
            'dinner': {
                'typical': [
                    'Truita de patates',
                    'Embutidos catalanes',
                    'Croquetas',
                    'Verduras a la plancha',
                    'Pescado al horno'
                ],
                'time': '21:00 - 21:30'
            },
            'seasonal': {
                'spring': ['Calçots', 'Guisantes', 'Habas'],
                'summer': ['Ensalada', 'Gazpacho', 'Melón'],
                'autumn': ['Setas', 'Castañas', 'Boniatos'],
                'winter': ['Escudella', 'Carn d\'olla', 'Calçots']
            }
        }
    
    def enhance_menu_prompt(self, base_prompt: str):
        """Mejorar prompt con preferencias catalanas"""
        barcelona_additions = """
        
        PREFERENCIAS ESPECÍFICAS DE BARCELONA:
        - La comida principal es al mediodía (14:00-15:00), más abundante que la cena
        - Merienda importante para los niños (17:30-18:00)
        - Cena más ligera, alrededor de las 21:00
        - Incluir platos típicos catalanes cuando sea apropiado
        - Considerar productos de temporada del mercado de La Boqueria
        - Pan con tomate (pa amb tomàquet) como acompañamiento frecuente
        - Uso abundante de aceite de oliva virgen extra
        - Pescado fresco del Mediterráneo 2-3 veces por semana
        
        CONSIDERACIONES ESCOLARES:
        - Lunes a viernes: las niñas comen en el colegio
        - Fines de semana: comida familiar completa
        - Adaptar porciones según quién come en casa
        """
        
        return base_prompt + barcelona_additions
    
    def add_local_shopping_list(self, menu: Dict):
        """Añadir sugerencias de dónde comprar en Barcelona"""
        shopping_locations = {
            'pescado_fresco': 'Mercado de la Barceloneta o La Boqueria',
            'verduras_frescas': 'Mercado de Sant Antoni o La Concepció',
            'pan': 'Panadería del barrio',
            'carne': 'Carnicería local o Mercadona',
            'conservas': 'Casa Gispert (Carrer dels Sombrerers)',
            'embutidos': 'La Pineda (Mercat de la Llibertat)'
        }
        
        menu['shopping_suggestions'] = shopping_locations
        return menu
```

---

## 📱 Notificaciones Push (Preparación Futura)

```python
# notifications.py

class FamilyNotifications:
    """Sistema de notificaciones para la familia"""
    
    def __init__(self):
        self.notification_rules = self.get_notification_rules()
    
    def get_notification_rules(self):
        return {
            'morning_routine': {
                'time': '07:30',
                'weekdays_only': True,
                'message': '¡Buenos días! Revisa el menú del día y las tareas',
                'recipients': ['all_adults']
            },
            'meal_reminders': {
                'lunch': {
                    'time': '13:30',
                    'message': 'Recordatorio: Comida en 30 minutos - {meal}',
                    'recipients': ['all']
                },
                'dinner': {
                    'time': '20:30',
                    'message': 'Recordatorio: Cena en 30 minutos - {meal}',
                    'recipients': ['all']
                }
            },
            'cleaning_reminders': {
                'time': '19:00',
                'message': 'Pendiente: {task} ({assigned_to})',
                'recipients': ['task_assigned']
            },
            'shopping_day': {
                'time': '09:00',
                'days': [5],  # Sábado
                'message': '🛒 Día de compra - Lista preparada',
                'recipients': ['all_adults']
            },
            'school_reminders': {
                'sunday_night': {
                    'time': '20:00',
                    'day': 6,
                    'message': 'Preparar mochilas y ropa para mañana',
                    'recipients': ['all']
                }
            }
        }
    
    def should_send_notification(self, rule_name: str, current_time: datetime):
        """Verificar si debe enviarse una notificación"""
        # Implementar lógica
        pass
    
    def send_notification(self, recipient: str, message: str):
        """Enviar notificación (preparado para integración futura)"""
        # Para ahora, solo log
        print(f"[NOTIFICACIÓN] Para {recipient}: {message}")
        
        # Futuro: Integrar con:
        # - Telegram Bot
        # - WhatsApp Business API
        # - Push notifications móvil
        # - Email
        pass
```

---

## 🔧 Script de Instalación Rápida

```bash
#!/bin/bash
# install_family_command_center.sh

echo "🏠 Instalando Family Command Center..."
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"

# 1. Verificar Python
echo "✓ Verificando Python..."
python --version || { echo "❌ Python no encontrado"; exit 1; }

# 2. Crear entorno virtual
echo "✓ Creando entorno virtual..."
python -m venv venv
source venv/bin/activate  # Linux/Mac
# venv\Scripts\activate  # Windows

# 3. Instalar dependencias
echo "✓ Instalando dependencias..."
pip install -r requirements.txt

# 4. Configurar variables de entorno
echo "✓ Configurando variables de entorno..."
if [ ! -f .env ]; then
    cp .env.example .env
    echo "⚠️  Edita .env y añade tus API keys"
fi

# 5. Inicializar base de datos
echo "✓ Inicializando base de datos..."
python init.py

# 6. Cargar datos de ejemplo para Barcelona
echo "✓ Cargando plantillas de limpieza..."
python load_cleaning_defaults_barcelona.py

# 7. Configurar Google OAuth
echo "✓ Configuración de Google OAuth..."
echo "   1. Ve a https://console.cloud.google.com/"
echo "   2. Crea un proyecto"
echo "   3. Habilita Calendar API y Tasks API"
echo "   4. Descarga credentials.json"
echo "   5. Coloca credentials.json en la raíz del proyecto"

# 8. Test de instalación
echo "✓ Ejecutando tests..."
python -m pytest tests/ -v

echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "✅ Instalación completa!"
echo ""
echo "Para iniciar el servidor:"
echo "  python app.py"
echo ""
echo "URLs disponibles:"
echo "  Admin: http://localhost:7000"
echo "  TV Dashboard: http://localhost:7000/tv-dashboard"
echo ""
```

---

## 🎨 CSS para Dashboard Barcelona

```css
/* barcelona_theme.css */

:root {
    /* Colores inspirados en Barcelona */
    --barcelona-blue: #004D98;      /* Azul Barça */
    --barcelona-red: #A50044;       /* Rojo Barça */
    --mediterranean: #0077BE;       /* Azul Mediterráneo */
    --gaudi-gold: #D4AF37;         /* Dorado Gaudí */
    --rambla-green: #2E7D32;       /* Verde Las Ramblas */
    
    /* Tonos cálidos mediterráneos */
    --warm-sand: #F5E6D3;
    --terracotta: #D4745E;
    --olive-green: #6B7F39;
    
    /* UI */
    --widget-shadow: 0 4px 6px rgba(0,0,0,0.1);
    --widget-border-radius: 16px;
}

body {
    font-family: 'Montserrat', 'Segoe UI', sans-serif;
    background: linear-gradient(135deg, var(--mediterranean) 0%, var(--barcelona-blue) 100%);
}

.dashboard-container {
    max-width: 1400px;
    margin: 0 auto;
    padding: 20px;
}

.dashboard-header {
    text-align: center;
    color: white;
    margin-bottom: 40px;
    text-shadow: 2px 2px 4px rgba(0,0,0,0.2);
}

.dashboard-header h1 {
    font-size: 3rem;
    margin-bottom: 10px;
}

.dashboard-date {
    font-size: 1.5rem;
    opacity: 0.9;
}

.dashboard-widgets {
    display: grid;
    grid-template-columns: repeat(auto-fit, minmax(350px, 1fr));
    gap: 24px;
    margin-bottom: 30px;
}

.widget {
    background: rgba(255, 255, 255, 0.95);
    border-radius: var(--widget-border-radius);
    padding: 24px;
    box-shadow: var(--widget-shadow);
    transition: transform 0.2s, box-shadow 0.2s;
}

.widget:hover {
    transform: translateY(-4px);
    box-shadow: 0 8px 12px rgba(0,0,0,0.15);
}

.widget h3 {
    font-size: 1.8rem;
    margin-bottom: 16px;
    color: var(--barcelona-blue);
}

/* Calendar widget específico */
.calendar-widget {
    border-left: 4px solid var(--rambla-green);
}

/* Menu widget específico */
.menu-widget {
    border-left: 4px solid var(--terracotta);
}

/* Tasks widget específico */
.tasks-widget {
    border-left: 4px solid var(--mediterranean);
}

/* Cleaning widget específico */
.cleaning-widget-full {
    background: rgba(255, 255, 255, 0.95);
    border-radius: var(--widget-border-radius);
    padding: 24px;
    box-shadow: var(--widget-shadow);
    border-left: 4px solid var(--gaudi-gold);
}

/* Eventos */
.event-item, .meal, .task-item, .cleaning-item {
    padding: 12px;
    margin: 8px 0;
    background: var(--warm-sand);
    border-radius: 8px;
    display: flex;
    align-items: center;
    gap: 12px;
}

.event-time, .task-time {
    font-weight: bold;
    color: var(--barcelona-blue);
    min-width: 60px;
}

/* Mobile responsive */
@media (max-width: 768px) {
    .dashboard-widgets {
        grid-template-columns: 1fr;
    }
    
    .dashboard-header h1 {
        font-size: 2rem;
    }
    
    .widget h3 {
        font-size: 1.5rem;
    }
}

/* TV Mode (pantallas grandes) */
@media (min-width: 1920px) {
    .dashboard-header h1 {
        font-size: 4rem;
    }
    
    .widget {
        font-size: 1.3rem;
    }
    
    .widget h3 {
        font-size: 2.5rem;
    }
}
```

---

## ✅ Checklist de Configuración

```markdown
# 📋 Checklist de Configuración - Family Command Center Barcelona

## Paso 1: Configuración Básica
- [ ] Python 3.8+ instalado
- [ ] Git instalado
- [ ] Proyecto clonado
- [ ] Entorno virtual creado

## Paso 2: Dependencias
- [ ] requirements.txt instalado
- [ ] PostgreSQL configurado (producción)
- [ ] SQLite funcionando (desarrollo)

## Paso 3: Variables de Entorno
- [ ] .env creado desde .env.example
- [ ] ANTHROPIC_API_KEY configurada
- [ ] SECRET_KEY generada
- [ ] DATABASE_URL configurada

## Paso 4: Google OAuth
- [ ] Proyecto creado en Google Cloud Console
- [ ] Calendar API habilitada
- [ ] Tasks API habilitada
- [ ] credentials.json descargado
- [ ] Redirect URIs configurados

## Paso 5: Base de Datos
- [ ] Tablas iniciales creadas
- [ ] Perfiles familiares añadidos (3 adultos, 2 niñas)
- [ ] Plantillas de limpieza cargadas
- [ ] Miembros de familia configurados

## Paso 6: Datos de Barcelona
- [ ] Calendario escolar 2025-2026 cargado
- [ ] Horarios escolares configurados
- [ ] Festividades locales añadidas
- [ ] Preferencias catalanas configuradas

## Paso 7: Testing
- [ ] Tests backend pasando
- [ ] Tests frontend pasando
- [ ] Endpoints API funcionando
- [ ] Vista TV operativa

## Paso 8: Deployment (Opcional)
- [ ] Railway configurado
- [ ] PostgreSQL en Railway activo
- [ ] Variables de entorno en Railway
- [ ] URL pública funcionando

## Paso 9: Uso Familiar
- [ ] Todos los miembros tienen acceso
- [ ] Dispositivo TV/tablet configurado
- [ ] Autenticación Google completada
- [ ] Primer menú semanal generado
- [ ] Primera rotación de limpieza creada
```

---

**¡Todo listo para empezar!** 🚀

Este código está específicamente adaptado para:
- 5 miembros de familia en Barcelona
- 2 niñas de 4 y 12 años
- Horarios escolares típicos de Barcelona
- Preferencias culinarias catalanas/españolas
- Sistema de limpieza adaptado a la familia
- Festividades y eventos locales
