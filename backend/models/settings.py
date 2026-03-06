"""
Modelo de configuración general del sistema
"""

from extensions import db
from datetime import datetime
import json

class Settings(db.Model):
    """
    Modelo para almacenar configuración general del Family Command Center
    """
    
    __tablename__ = 'settings'
    
    id = db.Column(db.Integer, primary_key=True)
    
    # Configuración general
    nombre_familia = db.Column(db.String(100), default='Familia')
    ciudad = db.Column(db.String(100), default='Barcelona')
    idioma = db.Column(db.String(10), default='es')
    zona_horaria = db.Column(db.String(50), default='Europe/Madrid')
    
    # Preferencias de menú
    dias_menu = db.Column(db.Text, default='["lunes", "martes", "miercoles", "jueves", "viernes", "sabado", "domingo"]')  # JSON array
    comidas_por_dia = db.Column(db.Text, default='["desayuno", "comida", "merienda", "cena"]')  # JSON array
    presupuesto_semanal = db.Column(db.Integer, default=0)
    supermercado_preferido = db.Column(db.String(100))
    
    # Preferencias de limpieza
    dias_limpieza_profunda = db.Column(db.Text, default='["sabado"]')  # JSON array
    incluir_ninos_tareas = db.Column(db.Boolean, default=True)
    edad_minima_tareas_simples = db.Column(db.Integer, default=4)
    edad_minima_tareas_medias = db.Column(db.Integer, default=10)
    
    # API Keys
    anthropic_api_key = db.Column(db.String(500))
    google_credentials = db.Column(db.Text)
    
    # Configuración de la Casa
    house_config = db.Column(db.Text, default='{}')  # JSON object
    
    # Metadatos
    created_at = db.Column(db.DateTime, default=datetime.utcnow)
    updated_at = db.Column(db.DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
    
    def __repr__(self):
        return f'<Settings {self.nombre_familia}>'
    
    def to_dict(self):
        """Convierte el objeto a diccionario"""
        return {
            'id': self.id,
            'nombre_familia': self.nombre_familia,
            'ciudad': self.ciudad,
            'idioma': self.idioma,
            'zona_horaria': self.zona_horaria,
            'dias_menu': json.loads(self.dias_menu) if self.dias_menu else [],
            'comidas_por_dia': json.loads(self.comidas_por_dia) if self.comidas_por_dia else [],
            'presupuesto_semanal': self.presupuesto_semanal,
            'supermercado_preferido': self.supermercado_preferido,
            'dias_limpieza_profunda': json.loads(self.dias_limpieza_profunda) if self.dias_limpieza_profunda else [],
            'incluir_ninos_tareas': self.incluir_ninos_tareas,
            'edad_minima_tareas_simples': self.edad_minima_tareas_simples,
            'edad_minima_tareas_medias': self.edad_minima_tareas_medias,
            'anthropic_api_key': self.anthropic_api_key,
            'google_credentials': self.google_credentials,
            'house_config': json.loads(self.house_config) if self.house_config else {},
            'created_at': self.created_at.isoformat() if self.created_at else None,
            'updated_at': self.updated_at.isoformat() if self.updated_at else None
        }
