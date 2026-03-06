from flask import Blueprint, request, jsonify
from datetime import datetime, date, timedelta

from extensions import db
from models.settings import Settings
from models.cleaning import CleaningSchedule
from models.google_calendar import GoogleEventMapping
from models.google_imported_event import GoogleImportedEvent
from services.google_calendar_service import google_calendar_service


google_bp = Blueprint('google', __name__)


@google_bp.route('/auth/status', methods=['GET'])
def auth_status():
    try:
        status = google_calendar_service.get_connection_status()
        settings = Settings.query.first()
        status['has_credentials_json'] = bool(settings and settings.google_credentials)
        return jsonify({
            'success': True,
            'data': status
        })
    except Exception as e:
        return jsonify({
            'success': False,
            'message': str(e)
        }), 500


@google_bp.route('/auth/start', methods=['GET'])
def auth_start():
    try:
        settings = Settings.query.first()
        if not settings or not settings.google_credentials:
            return jsonify({
                'success': False,
                'message': 'Faltan Google Credentials en Configuración'
            }), 400

        redirect_uri = request.args.get('redirect_uri')
        if not redirect_uri:
            redirect_uri = request.host_url.rstrip('/') + '/api/google/auth/callback'

        auth_url, state = google_calendar_service.get_authorization_url(
            google_credentials_json=settings.google_credentials,
            redirect_uri=redirect_uri,
        )

        return jsonify({
            'success': True,
            'data': {
                'auth_url': auth_url
            }
        })
    except ValueError as e:
        return jsonify({
            'success': False,
            'message': str(e)
        }), 400
    except Exception as e:
        return jsonify({
            'success': False,
            'message': str(e)
        }), 500


@google_bp.route('/auth/callback', methods=['GET'])
def auth_callback():
    try:
        settings = Settings.query.first()
        if not settings or not settings.google_credentials:
            return 'Missing Google Credentials', 400

        google_calendar_service.exchange_code_for_token(
            google_credentials_json=settings.google_credentials,
            redirect_uri=None,
            authorization_response=request.url,
            state=None,
        )

        return (
            '<html><body style="font-family: Arial; padding: 16px;">'
            '<h3>Google Calendar conectado</h3>'
            '<p>Puedes cerrar esta ventana y volver a Family Command Center.</p>'
            '</body></html>'
        )
    except Exception as e:
        return (
            '<html><body style="font-family: Arial; padding: 16px;">'
            '<h3>Error conectando Google Calendar</h3>'
            f'<pre>{str(e)}</pre>'
            '</body></html>'
        ), 500


@google_bp.route('/auth/disconnect', methods=['POST'])
def auth_disconnect():
    try:
        google_calendar_service.disconnect()
        GoogleEventMapping.query.delete()
        db.session.commit()
        return jsonify({
            'success': True,
            'message': 'Desconectado'
        })
    except Exception as e:
        db.session.rollback()
        return jsonify({
            'success': False,
            'message': str(e)
        }), 500


@google_bp.route('/calendars', methods=['GET'])
def list_calendars():
    try:
        calendars = google_calendar_service.list_calendars()
        return jsonify({
            'success': True,
            'data': calendars
        })
    except Exception as e:
        return jsonify({
            'success': False,
            'message': str(e)
        }), 500


@google_bp.route('/events', methods=['GET'])
def list_events():
    try:
        calendar_id = request.args.get('calendar_id', 'primary')
        from_str = request.args.get('from')
        to_str = request.args.get('to')

        if not from_str or not to_str:
            today = date.today()
            monday = today - timedelta(days=today.weekday())
            sunday = monday + timedelta(days=6)
            from_date = monday
            to_date = sunday
        else:
            from_date = datetime.strptime(from_str, '%Y-%m-%d').date()
            to_date = datetime.strptime(to_str, '%Y-%m-%d').date()

        events = google_calendar_service.list_events(calendar_id, from_date, to_date)
        return jsonify({
            'success': True,
            'data': events,
            'from': from_date.isoformat(),
            'to': to_date.isoformat(),
        })
    except Exception as e:
        return jsonify({
            'success': False,
            'message': str(e)
        }), 500


@google_bp.route('/import', methods=['POST'])
def import_events():
    try:
        payload = request.get_json() or {}
        calendar_id = payload.get('calendar_id', 'primary')
        from_str = payload.get('from')
        to_str = payload.get('to')

        if not from_str or not to_str:
            today = date.today()
            monday = today - timedelta(days=today.weekday())
            sunday = monday + timedelta(days=6)
            from_date = monday
            to_date = sunday
        else:
            from_date = datetime.strptime(from_str, '%Y-%m-%d').date()
            to_date = datetime.strptime(to_str, '%Y-%m-%d').date()

        events = google_calendar_service.list_events(calendar_id, from_date, to_date)
        created = 0
        updated = 0
        for ev in events:
            event_id = ev['id']
            summary = ev.get('summary')
            description = ev.get('description')
            location = ev.get('location')
            status = ev.get('status')
            all_day = ev.get('all_day', False)
            start_dt_str = ev.get('start_datetime')
            end_dt_str = ev.get('end_datetime')
            google_updated_str = ev.get('updated')

            if not start_dt_str or not end_dt_str:
                continue

            start_dt = datetime.fromisoformat(start_dt_str.replace('Z', '+00:00'))
            end_dt = datetime.fromisoformat(end_dt_str.replace('Z', '+00:00'))
            google_updated = datetime.fromisoformat(google_updated_str.replace('Z', '+00:00')) if google_updated_str else None

            # Convertir a naive datetime para evitar problemas de comparación
            if start_dt.tzinfo is not None:
                start_dt = start_dt.replace(tzinfo=None)
            if end_dt.tzinfo is not None:
                end_dt = end_dt.replace(tzinfo=None)
            if google_updated and google_updated.tzinfo is not None:
                google_updated = google_updated.replace(tzinfo=None)

            existing = GoogleImportedEvent.query.filter_by(calendar_id=calendar_id, event_id=event_id).first()
            if existing:
                if google_updated and existing.google_updated and google_updated > existing.google_updated:
                    existing.summary = summary
                    existing.description = description
                    existing.location = location
                    existing.status = status
                    existing.all_day = all_day
                    existing.start_datetime = start_dt
                    existing.end_datetime = end_dt
                    existing.google_updated = google_updated
                    updated += 1
            else:
                existing = GoogleImportedEvent(
                    calendar_id=calendar_id,
                    event_id=event_id,
                    summary=summary,
                    description=description,
                    location=location,
                    status=status,
                    all_day=all_day,
                    start_datetime=start_dt,
                    end_datetime=end_dt,
                    google_updated=google_updated,
                )
                db.session.add(existing)
                created += 1

        db.session.commit()
        return jsonify({
            'success': True,
            'data': {
                'calendar_id': calendar_id,
                'from': from_date.isoformat(),
                'to': to_date.isoformat(),
                'created': created,
                'updated': updated,
                'total': len(events)
            }
        })
    except Exception as e:
        db.session.rollback()
        return jsonify({
            'success': False,
            'message': str(e)
        }), 500


@google_bp.route('/imported', methods=['GET'])
def get_imported_events():
    try:
        from_str = request.args.get('from')
        to_str = request.args.get('to')
        if not from_str or not to_str:
            today = date.today()
            monday = today - timedelta(days=today.weekday())
            sunday = monday + timedelta(days=6)
            from_date = monday
            to_date = sunday
        else:
            from_date = datetime.strptime(from_str, '%Y-%m-%d').date()
            to_date = datetime.strptime(to_str, '%Y-%m-%d').date()

        events = GoogleImportedEvent.query.filter(
            GoogleImportedEvent.start_datetime >= datetime.combine(from_date, datetime.min.time()),
            GoogleImportedEvent.end_datetime <= datetime.combine(to_date, datetime.max.time())
        ).order_by(GoogleImportedEvent.start_datetime).all()
        return jsonify({
            'success': True,
            'data': [e.to_dict() for e in events],
            'from': from_date.isoformat(),
            'to': to_date.isoformat(),
        })
    except Exception as e:
        return jsonify({
            'success': False,
            'message': str(e)
        }), 500


@google_bp.route('/sync/cleaning', methods=['POST'])
def sync_cleaning():
    try:
        payload = request.get_json() or {}
        week_start_str = payload.get('week_start')
        calendar_id = payload.get('calendar_id') or 'primary'

        if week_start_str:
            week_start = datetime.strptime(week_start_str, '%Y-%m-%d').date()
        else:
            today = date.today()
            week_start = today - timedelta(days=today.weekday())

        schedule_items = CleaningSchedule.query.filter_by(semana_inicio=week_start).all()

        if not schedule_items:
            return jsonify({
                'success': False,
                'message': 'No hay tareas de limpieza para esa semana'
            }), 400

        created = 0
        updated = 0

        for item in schedule_items:
            source = 'cleaning_schedule'
            source_id = item.id

            summary = f"🧹 {item.task_nombre} — {item.member_nombre}"
            desc_parts = []
            if item.area:
                desc_parts.append(f"Área: {item.area}")
            if item.duracion_minutos:
                desc_parts.append(f"Duración: {item.duracion_minutos} min")
            desc_parts.append(f"Asignado a: {item.member_nombre}")
            description = '\n'.join(desc_parts)

            start_date = item.fecha_programada.isoformat()
            end_date = (item.fecha_programada + timedelta(days=1)).isoformat()

            event_body = {
                'summary': summary,
                'description': description,
                'start': {'date': start_date},
                'end': {'date': end_date},
                'extendedProperties': {
                    'private': {
                        'fcc_source': source,
                        'fcc_source_id': str(source_id)
                    }
                }
            }

            mapping = GoogleEventMapping.query.filter_by(source=source, source_id=source_id).first()
            if mapping and mapping.calendar_id == calendar_id:
                google_calendar_service.update_event(calendar_id=calendar_id, event_id=mapping.event_id, event_body=event_body)
                updated += 1
            else:
                created_event_id = google_calendar_service.create_event(calendar_id=calendar_id, event_body=event_body)
                if mapping:
                    mapping.calendar_id = calendar_id
                    mapping.event_id = created_event_id
                else:
                    mapping = GoogleEventMapping(
                        source=source,
                        source_id=source_id,
                        calendar_id=calendar_id,
                        event_id=created_event_id,
                    )
                    db.session.add(mapping)
                created += 1

        db.session.commit()

        return jsonify({
            'success': True,
            'data': {
                'week_start': week_start.isoformat(),
                'calendar_id': calendar_id,
                'created': created,
                'updated': updated,
                'total': len(schedule_items)
            }
        })
    except Exception as e:
        db.session.rollback()
        return jsonify({
            'success': False,
            'message': str(e)
        }), 500
