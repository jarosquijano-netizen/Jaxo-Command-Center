"""
Utilidades de fecha/semana — FUENTE ÚNICA DE VERDAD para todos los módulos.

Todos los módulos (menú, lista de compra, tareas, calendario, TV) deben calcular
"hoy" y "el inicio de la semana" a través de estas funciones para evitar
desincronización entre módulos.

Reglas:
- La semana SIEMPRE empieza en lunes (weekday()==0).
- "Hoy" se calcula en la zona horaria de la familia (Europe/Madrid por defecto),
  NO en la hora UTC del servidor. Así el límite de semana coincide con España.
"""

import os
from datetime import date, datetime, timedelta

# Zona horaria de la familia. Configurable con la env var TIMEZONE.
_TZ_NAME = os.getenv("TIMEZONE", "Europe/Madrid")

# Nombres de días en español, indexados por weekday() (0=lunes ... 6=domingo)
DIA_KEYS = ['lunes', 'martes', 'miercoles', 'jueves', 'viernes', 'sabado', 'domingo']
DIA_NOMBRES = ['Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado', 'Domingo']
MES_NOMBRES = ['Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio',
               'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre']


def _get_tz():
    """Devuelve un tzinfo para la zona de la familia. Prefiere zoneinfo (stdlib),
    cae a pytz, y en último caso a None (hora naive)."""
    try:
        from zoneinfo import ZoneInfo
        return ZoneInfo(_TZ_NAME)
    except Exception:
        pass
    try:
        import pytz
        return pytz.timezone(_TZ_NAME)
    except Exception:
        return None


def now_local() -> datetime:
    """Datetime actual en la zona horaria de la familia."""
    tz = _get_tz()
    if tz is None:
        return datetime.now()  # fallback naive
    return datetime.now(tz)


def today_local() -> date:
    """La fecha de HOY en la zona horaria de la familia (no en UTC del servidor)."""
    return now_local().date()


def week_start_for(d: date) -> date:
    """Lunes de la semana que contiene la fecha `d`."""
    return d - timedelta(days=d.weekday())


def current_week_start() -> date:
    """Lunes de la semana actual (según la hora de la familia)."""
    return week_start_for(today_local())


def next_week_start() -> date:
    """Lunes de la próxima semana."""
    return current_week_start() + timedelta(days=7)


def week_end_for(week_start: date) -> date:
    """Domingo de la semana que empieza en `week_start`."""
    return week_start + timedelta(days=6)


def is_current_week(week_start: date) -> bool:
    """True si `week_start` es el lunes de la semana actual."""
    return week_start == current_week_start()


def today_key() -> str:
    """Clave del día de hoy en minúsculas sin acentos: 'lunes'..'domingo'."""
    return DIA_KEYS[today_local().weekday()]
