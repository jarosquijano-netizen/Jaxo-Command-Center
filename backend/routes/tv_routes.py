"""
TV Kitchen Dashboard — server-side rendered with live data
"""

import logging
from datetime import datetime, date, timedelta

import requests
from flask import Blueprint, render_template, jsonify

logger = logging.getLogger(__name__)

tv_bp = Blueprint('tv', __name__)


@tv_bp.route('/api/tv-debug')
def tv_debug():
    """Diagnostic endpoint — shows raw menu data for TV troubleshooting."""
    from services.menu_service import menu_service
    weekly = menu_service.get_weekly_menu()
    latest = menu_service.get_latest_menu()
    today_key = _DAY_KEYS[datetime.now().weekday()]
    result = {
        'today_key': today_key,
        'weekly_menu_found': weekly is not None,
        'latest_menu_found': latest is not None,
    }
    if latest:
        md = latest.get('menu_data') or {}
        result['menu_data_keys'] = list(md.keys())
        adultos = md.get('menu_adultos', {})
        result['adultos_days'] = list(adultos.keys())
        result['adultos_today'] = adultos.get(today_key)
        ninos = md.get('menu_ninos', {})
        result['ninos_today'] = ninos.get(today_key)
    return jsonify(result)


# ---------------------------------------------------------------------------
# Helpers
# ---------------------------------------------------------------------------

_DAY_KEYS = ['lunes', 'martes', 'miercoles', 'jueves', 'viernes', 'sabado', 'domingo']
_DAY_NAMES_ES = ['Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado', 'Domingo']
_DAY_ABBR_ES = ['Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb', 'Dom']
_MONTH_NAMES_ES = [
    'enero', 'febrero', 'marzo', 'abril', 'mayo', 'junio',
    'julio', 'agosto', 'septiembre', 'octubre', 'noviembre', 'diciembre'
]


def _weather_desc(code):
    if code == 0:
        return 'Soleado'
    if code <= 3:
        return 'Parcialmente nublado'
    if code <= 48:
        return 'Niebla'
    if code <= 67:
        return 'Lluvia'
    if code <= 77:
        return 'Nieve'
    if code <= 82:
        return 'Chubascos'
    if code <= 86:
        return 'Nevada'
    return 'Tormenta'


def _normalise_meal(raw):
    """Accept str or dict meal entry, return unified dict or None."""
    if raw is None:
        return None
    if isinstance(raw, str):
        return {'nombre': raw, 'tiempo': None, 'dificultad': None, 'calorias': None}
    if isinstance(raw, dict):
        return {
            'nombre': raw.get('nombre') or raw.get('plato') or raw.get('name', ''),
            'tiempo': raw.get('tiempo') or raw.get('tiempo_prep') or raw.get('time'),
            'dificultad': raw.get('dificultad') or raw.get('difficulty'),
            'calorias': raw.get('calorias') or raw.get('kcal') or raw.get('calories'),
            'ingredientes': raw.get('ingredientes') or [],
            'preparacion': raw.get('preparacion') or [],
        }
    return None


def _diff_class(dificultad):
    if not dificultad:
        return ''
    d = dificultad.lower()
    if 'fácil' in d or 'facil' in d or 'easy' in d:
        return 'easy'
    if 'media' in d or 'medio' in d or 'medium' in d:
        return 'medium'
    return 'hard'


# ---------------------------------------------------------------------------
# Route
# ---------------------------------------------------------------------------

@tv_bp.route('/tv')
def tv_view():
    # Ensure OAuth token file is present (may be missing after container restart)
    try:
        from routes.google_routes import _ensure_token_file
        _ensure_token_file()
    except Exception:
        pass

    now = datetime.now()
    today_date = date.today()
    tomorrow_date = today_date + timedelta(days=1)

    date_str = f"{_DAY_NAMES_ES[now.weekday()]} {now.day} de {_MONTH_NAMES_ES[now.month - 1]}"
    today_key = _DAY_KEYS[now.weekday()]

    # ------------------------------------------------------------------
    # Menu
    # ------------------------------------------------------------------
    COMIDAS = ('desayuno', 'comida', 'merienda', 'cena')
    meals_adultos = {c: None for c in COMIDAS}
    meals_ninos = {c: None for c in COMIDAS}
    try:
        from services.menu_service import menu_service
        menu_dict = menu_service.get_weekly_menu()
        if not menu_dict:
            logger.info('[tv] no menu for current week, falling back to latest')
            menu_dict = menu_service.get_latest_menu()
        if menu_dict:
            md = menu_dict.get('menu_data') or {}
            adultos_day = md.get('menu_adultos', {}).get(today_key, {})
            ninos_day = md.get('menu_ninos', {}).get(today_key, {})
            logger.info('[tv] menu loaded — adultos today keys: %s', list(adultos_day.keys()))
            for c in COMIDAS:
                meals_adultos[c] = _normalise_meal(adultos_day.get(c))
                meals_ninos[c] = _normalise_meal(ninos_day.get(c))
        else:
            logger.warning('[tv] no menu data found in DB at all')
    except Exception as e:
        logger.warning(f'[tv] menu: {e}')

    # ------------------------------------------------------------------
    # Today's cleaning tasks (auto-generate current week if empty)
    # ------------------------------------------------------------------
    tasks = []
    try:
        from models.cleaning import CleaningSchedule, CleaningTask
        from extensions import db

        # Check if current week has any schedule
        current_lunes = today_date - timedelta(days=today_date.weekday())
        week_count = CleaningSchedule.query.filter_by(semana_inicio=current_lunes).count()
        if week_count == 0:
            try:
                from routes.cleaning_routes import generar_semana
                schedule_data = generar_semana(current_lunes)
                for item in schedule_data:
                    task = CleaningTask.query.filter_by(
                        nombre=item['task_nombre'], area=item['area']
                    ).first()
                    if not task:
                        task = CleaningTask(
                            nombre=item['task_nombre'], area=item['area'],
                            duracion_minutos=item['duracion_minutos'],
                            frecuencia='diaria', activa=True
                        )
                        db.session.add(task)
                        db.session.flush()
                    db.session.add(CleaningSchedule(
                        task_id=task.id,
                        task_nombre=item['task_nombre'],
                        member_id=item['member_id'],
                        member_nombre=item['member_nombre'],
                        fecha_programada=item['fecha_programada'],
                        semana_inicio=item['semana_inicio'],
                        area=item['area'],
                        duracion_minutos=item['duracion_minutos'],
                        completada=item['completada']
                    ))
                db.session.commit()
            except Exception as gen_err:
                db.session.rollback()
                logger.warning(f'[tv] auto-generate tasks: {gen_err}')

        rows = (
            CleaningSchedule.query
            .filter_by(fecha_programada=today_date)
            .order_by(CleaningSchedule.completada, CleaningSchedule.task_nombre)
            .all()
        )
        tasks = [
            {'nombre': r.task_nombre, 'member': r.member_nombre, 'completada': r.completada}
            for r in rows
        ]
    except Exception as e:
        logger.warning(f'[tv] tasks: {e}')

    completed_count = sum(1 for t in tasks if t['completada'])

    # ------------------------------------------------------------------
    # Next 3 calendar events
    # ------------------------------------------------------------------
    events = []
    try:
        from models.google_imported_event import GoogleImportedEvent
        try:
            import pytz
            madrid = pytz.timezone('Europe/Madrid')
            use_pytz = True
        except ImportError:
            use_pytz = False

        now_utc = datetime.utcnow()
        # Start of today in UTC: subtract local offset so we get all of today's events
        utc_offset = timedelta(hours=2)  # CEST; pytz will override below
        if use_pytz:
            local_now = datetime.now(madrid)
            utc_offset = local_now.utcoffset()
        today_start_utc = datetime.combine(today_date, datetime.min.time()) - utc_offset

        upcoming = (
            GoogleImportedEvent.query
            .filter(GoogleImportedEvent.start_datetime >= today_start_utc)
            .order_by(GoogleImportedEvent.start_datetime)
            .limit(20)
            .all()
        )
        for ev in upcoming:
            start_utc = ev.start_datetime
            if use_pytz:
                start_local = start_utc.replace(tzinfo=pytz.utc).astimezone(madrid)
                ev_date = start_local.date()
            else:
                start_local = start_utc + utc_offset
                ev_date = start_local.date()

            if ev_date == today_date:
                day_label = 'Hoy'
            elif ev_date == tomorrow_date:
                day_label = 'Mañana'
            else:
                day_label = _DAY_ABBR_ES[ev_date.weekday()]

            diff_min = (start_utc - now_utc).total_seconds() / 60
            events.append({
                'title': ev.summary or 'Evento',
                'time': start_local.strftime('%H:%M'),
                'day_label': day_label,
                'is_live': -30 <= diff_min <= 60,
            })
            if len(events) >= 5:
                break
    except Exception as e:
        logger.warning(f'[tv] events: {e}')

    # ------------------------------------------------------------------
    # Family member avatar colours
    # ------------------------------------------------------------------
    member_colors = {}
    try:
        from models.family import FamilyMember
        members = FamilyMember.query.filter_by(activo=True).all()
        for m in members:
            member_colors[m.nombre] = {
                'initial': (m.nombre[0].upper() if m.nombre else '?'),
                'color': m.avatar_color or '#4A90E2',
            }
    except Exception as e:
        logger.warning(f'[tv] members: {e}')

    # ------------------------------------------------------------------
    # Weather — Open-Meteo free API (Barcelona)
    # ------------------------------------------------------------------
    weather = {'temp': '--', 'desc': 'Barcelona'}
    try:
        resp = requests.get(
            'https://api.open-meteo.com/v1/forecast',
            params={
                'latitude': 41.3874,
                'longitude': 2.1686,
                'current_weather': True,
                'timezone': 'Europe/Madrid',
            },
            timeout=3,
        )
        if resp.ok:
            cw = resp.json().get('current_weather', {})
            weather = {
                'temp': round(cw.get('temperature', 0)),
                'desc': _weather_desc(cw.get('weathercode', 0)),
            }
    except Exception as e:
        logger.warning(f'[tv] weather: {e}')

    return render_template(
        'tv_display.html',
        date_str=date_str,
        meals_adultos=meals_adultos,
        meals_ninos=meals_ninos,
        tasks=tasks,
        completed_count=completed_count,
        events=events,
        member_colors=member_colors,
        weather=weather,
        last_refresh=now.strftime('%H:%M'),
        diff_class=_diff_class,
    )
