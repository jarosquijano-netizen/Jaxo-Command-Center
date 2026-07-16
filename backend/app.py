"""
Family Command Center - Main Application
Servidor Flask principal
"""

import os
# Solo permitir HTTP inseguro en desarrollo
if os.getenv('FLASK_ENV') == 'development':
    os.environ['OAUTHLIB_INSECURE_TRANSPORT'] = '1'

from flask import Flask, jsonify, send_from_directory, request
from flask_cors import CORS
from config import get_config
from extensions import db, limiter
import logging

def create_app(config_name='default'):
    """Factory para crear la aplicación Flask"""

    app = Flask(__name__)

    # Cargar configuración
    config_class = get_config()
    app.config.from_object(config_class)

    # Inicializar extensiones
    db.init_app(app)
    cors_origins = app.config['CORS_ORIGINS']
    if cors_origins == '*':
        CORS(app)
    else:
        origins_list = cors_origins.split(',') if isinstance(cors_origins, str) else cors_origins
        CORS(app, origins=origins_list)

    # Rate limiting
    if limiter is not None:
        limiter.init_app(app)
        limiter._default_limits = ["300 per hour", "60 per minute"]
    else:
        logging.getLogger(__name__).warning("flask-limiter not installed — rate limiting disabled")

    # Configurar logging
    logging.basicConfig(
        level=logging.INFO,
        format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
    )

    # ── Optional PIN auth ────────────────────────────────────────────────
    _app_pin = os.getenv('APP_PIN', '').strip()

    @app.before_request
    def check_pin():
        """If APP_PIN is set, require it for all /api/* routes."""
        if not _app_pin:
            return  # auth disabled — no APP_PIN configured
        if not request.path.startswith('/api/'):
            return  # only protect API routes; frontend/TV pages are fine
        # Accept PIN via Authorization header ("Bearer <pin>") or X-App-Pin header
        auth_header = request.headers.get('Authorization', '')
        pin_header  = request.headers.get('X-App-Pin', '')
        provided = ''
        if auth_header.startswith('Bearer '):
            provided = auth_header[7:].strip()
        elif pin_header:
            provided = pin_header.strip()
        if provided != _app_pin:
            return jsonify({'success': False, 'error': 'Unauthorized'}), 401

    # ── Security headers ─────────────────────────────────────────────────
    @app.after_request
    def set_security_headers(response):
        # Prevent MIME-type sniffing
        response.headers['X-Content-Type-Options'] = 'nosniff'
        # Allow same-origin framing only (TV iframe is same-origin)
        response.headers['X-Frame-Options'] = 'SAMEORIGIN'
        # Don't send referrer to cross-origin destinations
        response.headers['Referrer-Policy'] = 'strict-origin-when-cross-origin'
        # Disable browser features we don't need
        response.headers['Permissions-Policy'] = 'geolocation=(), payment=()'
        # Don't cache HTML (already handled below, but reinforce for JSON too)
        if response.content_type and 'text/html' in response.content_type:
            response.headers['Cache-Control'] = 'no-cache, no-store, must-revalidate'
            response.headers['Pragma'] = 'no-cache'
            response.headers['Expires'] = '0'
        return response

    # Registrar blueprints
    from routes.family_routes import family_bp
    from routes.menu_routes import menu_bp
    # from routes.shopping_routes import shopping_bp
    from routes.cleaning_routes import cleaning_bp
    from routes.settings_routes import settings_bp
    from routes.calendar_routes import calendar_bp
    from routes.todo_routes import todo_bp
    from routes.google_routes import google_bp
    from routes.tv_routes import tv_bp
    from routes.mercadona_routes import mercadona_bp
    # from routes.dashboard_routes import dashboard_bp

    app.register_blueprint(family_bp, url_prefix='/api/family')
    app.register_blueprint(menu_bp, url_prefix='/api/menu')
    # app.register_blueprint(shopping_bp, url_prefix='/api/shopping')
    app.register_blueprint(cleaning_bp, url_prefix='/api/cleaning')
    app.register_blueprint(settings_bp, url_prefix='/api/settings')
    app.register_blueprint(calendar_bp, url_prefix='/api/calendar')
    app.register_blueprint(todo_bp, url_prefix='/api/todos')
    app.register_blueprint(google_bp, url_prefix='/api/google')
    app.register_blueprint(tv_bp)          # /tv — no prefix, route defined in blueprint
    app.register_blueprint(mercadona_bp, url_prefix='/api/mercadona')
    # app.register_blueprint(dashboard_bp, url_prefix='/api/dashboard')

    # Health check endpoint
    @app.route('/health')
    def health_check():
        return jsonify({'status': 'ok', 'message': 'Family Command Center is running', 'version': '1.0.0'})

    # Main frontend route
    @app.route('/')
    def index():
        """Servir la aplicación principal"""
        import os
        frontend_path = os.path.join(os.path.dirname(__file__), '..', 'frontend')
        return send_from_directory(frontend_path, 'index.html')

    # Static files route
    @app.route('/<path:filename>')
    def static_files(filename):
        """Servir archivos estáticos (CSS, JS, imágenes)"""
        import os
        frontend_path = os.path.join(os.path.dirname(__file__), '..', 'frontend')
        return send_from_directory(frontend_path, filename)

    # Error handlers
    @app.errorhandler(404)
    def not_found(error):
        return jsonify({'success': False, 'error': 'Endpoint no encontrado', 'code': 404}), 404

    @app.errorhandler(429)
    def rate_limited(error):
        return jsonify({'success': False, 'error': 'Demasiadas peticiones. Intenta más tarde.', 'code': 429}), 429

    @app.errorhandler(500)
    def internal_error(error):
        return jsonify({'success': False, 'error': 'Error interno del servidor', 'code': 500}), 500

    with app.app_context():
        # Ensure all models are imported so SQLAlchemy creates their tables
        from models import shopping  # noqa: F401 – registers PurchaseHistory with metadata
        try:
            if os.getenv('RESET_DB', 'false').lower() == 'true':
                print("WARNING:  RESET_DB=true — dropping and recreating all tables...")
                db.drop_all()
                db.create_all()
                print("Base de datos reseteada con esquema actualizado")
            else:
                db.create_all()
                print("Tablas de base de datos creadas/verificadas")
        except Exception as e:
            print(f"WARNING:  Error creando tablas: {e}")

        # Incremental migrations — add new columns to existing tables
        try:
            from sqlalchemy import inspect as _inspect, text as _text
            inspector = _inspect(db.engine)
            if 'settings' in inspector.get_table_names():
                existing_cols = [c['name'] for c in inspector.get_columns('settings')]
                if 'google_token' not in existing_cols:
                    db.session.execute(_text('ALTER TABLE settings ADD COLUMN google_token TEXT'))
                    db.session.commit()
                    print("Migración: columna google_token añadida a settings")
        except Exception as mig_err:
            db.session.rollback()
            print(f"WARNING:  Migración settings: {mig_err}")

        # Warn about insecure defaults
        if os.getenv('SECRET_KEY', '') in ('', 'dev-secret-key-change-in-production'):
            print("WARNING:  SECRET_KEY is using the insecure default — set SECRET_KEY in Railway env vars")
        if _app_pin:
            print("Security: APP_PIN auth enabled for /api/* routes")
        else:
            print("Security: APP_PIN not set — API routes are unauthenticated")

    return app


# Create app instance for production deployment
app = create_app()


if __name__ == '__main__':
    app = create_app()
    app.run(
        host=app.config['HOST'],
        port=app.config['PORT'],
        debug=app.config['DEBUG']
    )

