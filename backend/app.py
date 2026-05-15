"""
Family Command Center - Main Application
Servidor Flask principal
"""

import os
# Solo permitir HTTP inseguro en desarrollo
if os.getenv('FLASK_ENV') == 'development':
    os.environ['OAUTHLIB_INSECURE_TRANSPORT'] = '1'

from flask import Flask, jsonify, send_from_directory
from flask_cors import CORS
from config import get_config
from extensions import db
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
    
    # Configurar logging
    logging.basicConfig(
        level=logging.INFO,
        format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
    )
    
    # Registrar blueprints
    from routes.family_routes import family_bp
    from routes.menu_routes import menu_bp
    # from routes.shopping_routes import shopping_bp
    from routes.cleaning_routes import cleaning_bp
    from routes.settings_routes import settings_bp
    from routes.calendar_routes import calendar_bp
    from routes.todo_routes import todo_bp
    from routes.google_routes import google_bp
    from routes.voice_routes import voice_bp
    # from routes.dashboard_routes import dashboard_bp

    app.register_blueprint(family_bp, url_prefix='/api/family')
    app.register_blueprint(menu_bp, url_prefix='/api/menu')
    # app.register_blueprint(shopping_bp, url_prefix='/api/shopping')
    app.register_blueprint(cleaning_bp, url_prefix='/api/cleaning')
    app.register_blueprint(settings_bp, url_prefix='/api/settings')
    app.register_blueprint(calendar_bp, url_prefix='/api/calendar')
    app.register_blueprint(todo_bp, url_prefix='/api/todos')
    app.register_blueprint(google_bp, url_prefix='/api/google')
    app.register_blueprint(voice_bp, url_prefix='/api/voice')
    # app.register_blueprint(dashboard_bp, url_prefix='/api/dashboard')
    
    # Health check endpoint
    @app.route('/health')
    def health_check():
        return jsonify({'status': 'ok', 'message': 'Family Command Center is running', 'version': '1.0.0'})

    # No-cache for HTML pages so browsers always get fresh JS version strings
    @app.after_request
    def no_cache_html(response):
        if response.content_type and 'text/html' in response.content_type:
            response.headers['Cache-Control'] = 'no-cache, no-store, must-revalidate'
            response.headers['Pragma'] = 'no-cache'
            response.headers['Expires'] = '0'
        return response

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
    
    # TV View endpoint
    @app.route('/tv')
    def tv_view():
        """Servir la vista optimizada para TV"""
        import os
        frontend_path = os.path.join(os.path.dirname(__file__), '..', 'frontend')
        return send_from_directory(frontend_path, 'tv.html')
    
    # Error handlers
    @app.errorhandler(404)
    def not_found(error):
        """Handler para 404 Not Found"""
        return jsonify({
            'success': False,
            'error': 'Endpoint no encontrado',
            'code': 404
        }), 404
    
    @app.errorhandler(500)
    def internal_error(error):
        """Handler para 500 Internal Server Error"""
        return jsonify({
            'success': False,
            'error': 'Error interno del servidor',
            'code': 500
        }), 500
    
    with app.app_context():
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
    
    return app


# Create app instance for production deployment
app = create_app()


if __name__ == '__main__':
    app = create_app()
    
    # Validar configuración
    try:
        from config import Config
        # Config.validate()  # Descomentar cuando tengas las API keys
        print("Configuración validada")
    except ValueError as e:
        print(f"WARNING:  Advertencia: {e}")
        print("Configura el archivo .env con las credenciales necesarias")
    
    # Ejecutar servidor
    print(f"""
    ╔════════════════════════════════════════════╗
    ║   Family Command Center                ║
    ║   Servidor corriendo en:                  ║
    ║   http://localhost:{app.config['PORT']}                      ║
    ╚════════════════════════════════════════════╝
    """)
    
    app.run(
        host=app.config['HOST'],
        port=app.config['PORT'],
        debug=app.config['DEBUG']
    )
