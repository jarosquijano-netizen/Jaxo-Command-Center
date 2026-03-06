"""
Modelos para el sistema de menús
"""

from extensions import db
from datetime import datetime
import json


class WeeklyMenu(db.Model):
    """
    Menús semanales generados por IA
    """
    __tablename__ = 'weekly_menus'
    
    id = db.Column(db.Integer, primary_key=True)
    semana_inicio = db.Column(db.Date, nullable=False, unique=True)
    menu_data = db.Column(db.Text, nullable=False)  # JSON
    lista_compra = db.Column(db.Text)  # JSON
    generado_con = db.Column(db.String(50), default='claude')
    prompt_usado = db.Column(db.Text)
    menu_metadata = db.Column(db.Text)  # JSON - renombrado para evitar conflicto
    created_at = db.Column(db.DateTime, default=datetime.utcnow)
    updated_at = db.Column(db.DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
    
    # Relaciones
    ratings = db.relationship('MenuRating', backref='menu', lazy=True, cascade='all, delete-orphan')
    
    def __repr__(self):
        return f'<WeeklyMenu {self.semana_inicio}>'
    
    def to_dict(self):
        """Convierte el objeto a diccionario"""
        return {
            'id': self.id,
            'semana_inicio': self.semana_inicio.isoformat() if self.semana_inicio else None,
            'menu_data': json.loads(self.menu_data) if self.menu_data else None,
            'lista_compra': json.loads(self.lista_compra) if self.lista_compra else None,
            'generado_con': self.generado_con,
            'prompt_usado': self.prompt_usado,
            'metadata': json.loads(self.menu_metadata) if self.menu_metadata else None,
            'created_at': self.created_at.isoformat() if self.created_at else None,
            'updated_at': self.updated_at.isoformat() if self.updated_at else None,
            'ratings_count': len(self.ratings) if self.ratings else 0
        }


class MenuRating(db.Model):
    """
    Ratings por día/comida para aprendizaje de la IA
    """
    __tablename__ = 'menu_ratings'
    
    id = db.Column(db.Integer, primary_key=True)
    menu_id = db.Column(db.Integer, db.ForeignKey('weekly_menus.id'), nullable=False)
    dia = db.Column(db.String(20), nullable=False)  # lunes, martes, etc.
    comida = db.Column(db.String(20), nullable=False)  # desayuno, comida, merienda, cena
    tipo_menu = db.Column(db.String(20), nullable=False)  # adultos, ninos
    rating = db.Column(db.Integer, db.CheckConstraint('rating >= 1 AND rating <= 5'))
    comentario = db.Column(db.Text)
    rated_by = db.Column(db.Integer, db.ForeignKey('family_members.id'))
    created_at = db.Column(db.DateTime, default=datetime.utcnow)
    
    def __repr__(self):
        return f'<MenuRating {self.dia}_{self.comida}_{self.tipo_menu}>'
    
    def to_dict(self):
        """Convierte el objeto a diccionario"""
        return {
            'id': self.id,
            'menu_id': self.menu_id,
            'dia': self.dia,
            'comida': self.comida,
            'tipo_menu': self.tipo_menu,
            'rating': self.rating,
            'comentario': self.comentario,
            'rated_by': self.rated_by,
            'created_at': self.created_at.isoformat() if self.created_at else None
        }


class SavedRecipe(db.Model):
    """
    Recetas guardadas (opcional, para futuro)
    """
    __tablename__ = 'saved_recipes'
    
    id = db.Column(db.Integer, primary_key=True)
    nombre = db.Column(db.String(200), nullable=False)
    descripcion = db.Column(db.Text)
    ingredientes = db.Column(db.Text)  # JSON
    instrucciones = db.Column(db.Text)
    tiempo_preparacion = db.Column(db.Integer)  # minutos
    tiempo_coccion = db.Column(db.Integer)  # minutos
    porciones = db.Column(db.Integer)
    dificultad = db.Column(db.String(20))  # Fácil, Media, Difícil
    tipo_comida = db.Column(db.String(50))  # desayuno, comida, cena
    apto_ninos = db.Column(db.Boolean, default=True)
    imagen_url = db.Column(db.Text)
    url_origen = db.Column(db.Text)
    es_favorita = db.Column(db.Boolean, default=False)
    veces_usada = db.Column(db.Integer, default=0)
    created_at = db.Column(db.DateTime, default=datetime.utcnow)
    updated_at = db.Column(db.DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
    
    def __repr__(self):
        return f'<SavedRecipe {self.nombre}>'
    
    def to_dict(self):
        """Convierte el objeto a diccionario"""
        return {
            'id': self.id,
            'nombre': self.nombre,
            'descripcion': self.descripcion,
            'ingredientes': json.loads(self.ingredientes) if self.ingredientes else [],
            'instrucciones': self.instrucciones,
            'tiempo_preparacion': self.tiempo_preparacion,
            'tiempo_coccion': self.tiempo_coccion,
            'porciones': self.porciones,
            'dificultad': self.dificultad,
            'tipo_comida': self.tipo_comida,
            'apto_ninos': self.apto_ninos,
            'imagen_url': self.imagen_url,
            'url_origen': self.url_origen,
            'es_favorita': self.es_favorita,
            'veces_usada': self.veces_usada,
            'created_at': self.created_at.isoformat() if self.created_at else None,
            'updated_at': self.updated_at.isoformat() if self.updated_at else None
        }
