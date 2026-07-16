"""
Configuración de la aplicación Family Command Center
"""

import os
from pathlib import Path
from dotenv import load_dotenv

# Cargar variables de entorno
load_dotenv()

class Config:
    """Configuración base"""
    
    # Paths
    BASE_DIR = Path(__file__).parent.parent
    
    # Database — Railway provides DATABASE_URL as postgres://, SQLAlchemy needs postgresql://
    _db_url = os.getenv('DATABASE_URL', 'sqlite:///family_command_center.db')
    if _db_url.startswith('postgres://'):
        _db_url = _db_url.replace('postgres://', 'postgresql://', 1)
    DATABASE_URL = _db_url
    SQLALCHEMY_DATABASE_URI = _db_url
    SQLALCHEMY_TRACK_MODIFICATIONS = False
    SQLALCHEMY_ECHO = os.getenv('FLASK_DEBUG', 'False') == 'True'
    
    # Flask
    SECRET_KEY = os.getenv('SECRET_KEY', 'dev-secret-key-change-in-production')
    FLASK_ENV = os.getenv('FLASK_ENV', 'development')
    DEBUG = os.getenv('FLASK_DEBUG', 'False') == 'True'
    
    # Server
    HOST = os.getenv('HOST', '0.0.0.0')
    PORT = int(os.getenv('PORT', 9000))
    
    # CORS — Flask sirve el frontend, mismo origen, '*' es seguro para este setup
    CORS_ORIGINS = os.getenv('CORS_ORIGINS', '*')
    
    # API Keys
    ANTHROPIC_API_KEY = os.getenv('ANTHROPIC_API_KEY')
    # Modelo de Claude (configurable por env var; por defecto el Sonnet actual)
    ANTHROPIC_MODEL = os.getenv('ANTHROPIC_MODEL', 'claude-sonnet-4-5')
    OPENAI_API_KEY = os.getenv('OPENAI_API_KEY')
    GOOGLE_CLIENT_ID = os.getenv('GOOGLE_CLIENT_ID')
    GOOGLE_CLIENT_SECRET = os.getenv('GOOGLE_CLIENT_SECRET')
    
    # Timezone
    TIMEZONE = os.getenv('TIMEZONE', 'Europe/Madrid')
    
    # Tokens directory
    TOKENS_DIR = Path.home() / '.family-command-center' / 'tokens'
    TOKENS_DIR.mkdir(parents=True, exist_ok=True)
    
    # Google credentials
    GOOGLE_CREDENTIALS_PATH = TOKENS_DIR / 'credentials.json'
    GOOGLE_TOKEN_PATH = TOKENS_DIR / 'token.pickle'
    
    @staticmethod
    def validate():
        """Validar configuración requerida"""
        required = {
            'DATABASE_URL': Config.DATABASE_URL,
            'SECRET_KEY': Config.SECRET_KEY,
            'ANTHROPIC_API_KEY': Config.ANTHROPIC_API_KEY
        }
        
        missing = [key for key, value in required.items() if not value or value == 'dev-secret-key-change-in-production']
        
        if missing:
            raise ValueError(f"Missing required config: {', '.join(missing)}")
        
        return True


class DevelopmentConfig(Config):
    """Configuración para desarrollo"""
    DEBUG = True


class ProductionConfig(Config):
    """Configuración para producción"""
    DEBUG = False
    SQLALCHEMY_ECHO = False


# Diccionario de configuraciones
config = {
    'development': DevelopmentConfig,
    'production': ProductionConfig,
    'default': DevelopmentConfig
}


# Obtener configuración actual
def get_config():
    """Retorna la configuración según FLASK_ENV"""
    env = os.getenv('FLASK_ENV', 'development')
    return config.get(env, config['default'])
