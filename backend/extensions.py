"""
Extensions Flask - Centralizadas para evitar imports circulares
"""

from flask_sqlalchemy import SQLAlchemy

db = SQLAlchemy()

# Rate limiter — initialised in create_app(); imported here so blueprints
# can use @limiter.limit() as a decorator before the app is created.
try:
    from flask_limiter import Limiter
    from flask_limiter.util import get_remote_address
    limiter = Limiter(key_func=get_remote_address, storage_uri="memory://")
except ImportError:
    limiter = None
