from flask import Blueprint, request, jsonify
from datetime import datetime, date, timedelta

from extensions import db
from models.google_imported_event import GoogleImportedEvent
from models.cleaning import CleaningSchedule
from models.menu import WeeklyMenu

calendar_bp = Blueprint('calendar', __name__)


@calendar_bp.route('/week', methods=['GET'])
def get_week_calendar():
    try:
        week_str = request.args.get('week')
        if week_str:
            try:
                week_start = datetime.strptime(week_str, '%Y-%m-%d').date()
            except ValueError:
                return jsonify({
                    'success': False,
                    'message': 'Formato de semana inválido. Use YYYY-MM-DD (lunes)'
                }), 400
        else:
            # SIEMPRE usar la semana actual, independientemente de si hay menú guardado
            today = date.today()
            week_start = today - timedelta(days=today.weekday())
            print(f"[debug] today={today}, week_start={week_start}")
        week_end = week_start + timedelta(days=6)

        # 1. Google imported events
        google_events_raw = GoogleImportedEvent.query.filter(
            GoogleImportedEvent.start_datetime >= datetime.combine(week_start, datetime.min.time()),
            GoogleImportedEvent.end_datetime <= datetime.combine(week_end, datetime.max.time())
        ).all()
        google_events = []
        for e in google_events_raw:
            google_events.append({
                'id': f'google-{e.id}',
                'source': 'google',
                'title': e.summary or '(sin título)',
                'start': e.start_datetime.isoformat(),
                'end': e.end_datetime.isoformat(),
                'all_day': e.all_day,
                'location': e.location,
                'description': e.description,
                'color': '#4285F4',  # Google blue
            })

        # 2. Cleaning schedule events
        cleaning_items_raw = CleaningSchedule.query.filter_by(semana_inicio=week_start).all()
        cleaning_events = []
        for item in cleaning_items_raw:
            if not item.fecha_programada:
                continue
            # Asignar una hora por defecto si no tiene (ej: 10:00)
            start_dt = datetime.combine(item.fecha_programada, datetime.min.time()).replace(hour=10)
            end_dt = start_dt + timedelta(minutes=item.duracion_minutos or 60)
            cleaning_events.append({
                'id': f'cleaning-{item.id}',
                'source': 'cleaning',
                'title': f'{item.task_nombre}',
                'start': start_dt.isoformat(),
                'end': end_dt.isoformat(),
                'all_day': False,
                'assigned_to': item.member_nombre,
                'area': item.area,
                'color': '#34A853',  # Green
            })

        # 3. Weekly menu events (solo para visualización; no ocupan tiempo real)
        menu_week = WeeklyMenu.query.filter_by(semana_inicio=week_start).first()
        menu_events = []
        import json as _json
        dias = ['lunes', 'martes', 'miercoles', 'jueves', 'viernes', 'sabado', 'domingo']
        meal_slots = [
            ('desayuno', 8,  0.5),
            ('comida',   14, 1.0),
            ('merienda', 17, 0.5),
            ('cena',     20, 1.0),
        ]
        if menu_week and menu_week.menu_data:
            try:
                menu_data = _json.loads(menu_week.menu_data) if isinstance(menu_week.menu_data, str) else menu_week.menu_data
                adultos = menu_data.get('menu_adultos', {})
                for i, dia in enumerate(dias):
                    day_date = week_start + timedelta(days=i)
                    day_data = adultos.get(dia, {})
                    for comida, hour, dur in meal_slots:
                        meal = day_data.get(comida) or {}
                        # Try different field names the AI may use
                        plato = (meal.get('plato') or meal.get('primero') or
                                 meal.get('nombre') or meal.get('dish') or '').strip()
                        title = plato if plato else comida.capitalize()
                        start_dt = datetime.combine(day_date, datetime.min.time()).replace(hour=hour)
                        end_dt = start_dt + timedelta(hours=dur)
                        menu_events.append({
                            'id': f'menu-{week_start.isoformat()}-{dia}-{comida}',
                            'source': 'menu',
                            'title': title,
                            'subtitle': comida.capitalize(),
                            'start': start_dt.isoformat(),
                            'end': end_dt.isoformat(),
                            'all_day': False,
                            'color': '#EA4335',
                        })
            except Exception:
                pass  # fall through to placeholders
        if not menu_events:
            # No menu saved — minimal placeholders (comida + cena only)
            for i, dia in enumerate(dias):
                day_date = week_start + timedelta(days=i)
                for comida, hour, dur in [('comida', 14, 1.0), ('cena', 20, 1.0)]:
                    start_dt = datetime.combine(day_date, datetime.min.time()).replace(hour=hour)
                    end_dt = start_dt + timedelta(hours=dur)
                    menu_events.append({
                        'id': f'menu-placeholder-{week_start.isoformat()}-{dia}-{comida}',
                        'source': 'menu',
                        'title': comida.capitalize(),
                        'start': start_dt.isoformat(),
                        'end': end_dt.isoformat(),
                        'all_day': False,
                        'color': '#EA4335',
                    })

        all_events = google_events + cleaning_events + menu_events
        all_events.sort(key=lambda x: x['start'])

        return jsonify({
            'success': True,
            'data': {
                'week_start': week_start.isoformat(),
                'week_end': week_end.isoformat(),
                'events': all_events,
                'sources': {
                    'google': {'label': 'Google Calendar', 'color': '#4285F4'},
                    'cleaning': {'label': 'Limpieza', 'color': '#34A853'},
                    'menu': {'label': 'Menú', 'color': '#EA4335'},
                }
            }
        })
    except Exception as e:
        return jsonify({
            'success': False,
            'message': str(e)
        }), 500
