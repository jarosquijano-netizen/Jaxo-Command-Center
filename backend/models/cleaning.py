"""
Modelos de datos para el módulo de limpieza
"""

from extensions import db
from datetime import datetime
import json

class CleaningTask(db.Model):
    """
    Catálogo de tareas de limpieza
    """
    
    __tablename__ = 'cleaning_tasks'
    
    id = db.Column(db.Integer, primary_key=True)
    nombre = db.Column(db.String(100), nullable=False)
    nombre_alternativo = db.Column(db.String(100))  # ej: "Poner lavavajillas" si tiene lavavajillas
    area = db.Column(db.String(50), nullable=False)  # cocina, bano, salon, dormitorio, exterior, general, mascotas
    icono = db.Column(db.String(50))  # nombre lucide icon
    dificultad = db.Column(db.String(20), default='media')  # simple, media, compleja
    edad_minima = db.Column(db.Integer, default=18)
    duracion_minutos = db.Column(db.Integer, default=15)
    frecuencia = db.Column(db.String(20), default='semanal')  # diaria, semanal, quincenal, mensual
    dias_especificos = db.Column(db.Text)  # JSON array: ["lunes", "jueves"]
    requiere_equipamiento = db.Column(db.String(50))  # "aspiradora", "lavavajillas", etc.
    aplica_si = db.Column(db.Text)  # JSON: {"tiene_jardin": true}
    multiplicar_por = db.Column(db.String(50))  # "banos", "dormitorios" para crear múltiples
    activa = db.Column(db.Boolean, default=True)
    created_at = db.Column(db.DateTime, default=datetime.utcnow)
    
    def __repr__(self):
        return f'<CleaningTask {self.nombre}>'
    
    def to_dict(self):
        return {
            'id': self.id,
            'nombre': self.nombre,
            'nombre_alternativo': self.nombre_alternativo,
            'area': self.area,
            'icono': self.icono,
            'dificultad': self.dificultad,
            'edad_minima': self.edad_minima,
            'duracion_minutos': self.duracion_minutos,
            'frecuencia': self.frecuencia,
            'dias_especificos': json.loads(self.dias_especificos) if self.dias_especificos else [],
            'requiere_equipamiento': self.requiere_equipamiento,
            'aplica_si': json.loads(self.aplica_si) if self.aplica_si else {},
            'multiplicar_por': self.multiplicar_por,
            'activa': self.activa,
            'created_at': self.created_at.isoformat() if self.created_at else None
        }

class CleaningSchedule(db.Model):
    """
    Asignaciones semanales de tareas
    """
    
    __tablename__ = 'cleaning_schedule'
    
    id = db.Column(db.Integer, primary_key=True)
    task_id = db.Column(db.Integer, db.ForeignKey('cleaning_tasks.id'), nullable=False)
    task_nombre = db.Column(db.String(100), nullable=False)  # copia para mostrar sin JOIN
    member_id = db.Column(db.Integer, db.ForeignKey('family_members.id'), nullable=False)
    member_nombre = db.Column(db.String(100), nullable=False)  # copia para mostrar
    fecha_programada = db.Column(db.Date, nullable=False)
    semana_inicio = db.Column(db.Date, nullable=False)  # lunes de esa semana
    area = db.Column(db.String(50))
    duracion_minutos = db.Column(db.Integer)
    completada = db.Column(db.Boolean, default=False)
    completada_at = db.Column(db.DateTime)
    completada_por = db.Column(db.Integer, db.ForeignKey('family_members.id'))  # si otro miembro la hizo
    notas = db.Column(db.Text)
    created_at = db.Column(db.DateTime, default=datetime.utcnow)
    
    # Relaciones
    task = db.relationship('CleaningTask', backref='schedule_items')
    member = db.relationship('FamilyMember', backref='cleaning_assignments', foreign_keys=[member_id])
    completed_by = db.relationship('FamilyMember', foreign_keys=[completada_por])
    
    def __repr__(self):
        return f'<CleaningSchedule {self.task_nombre} - {self.member_nombre}>'
    
    def to_dict(self):
        return {
            'id': self.id,
            'task_id': self.task_id,
            'task_nombre': self.task_nombre,
            'member_id': self.member_id,
            'member_nombre': self.member_nombre,
            'fecha_programada': self.fecha_programada.isoformat() if self.fecha_programada else None,
            'semana_inicio': self.semana_inicio.isoformat() if self.semana_inicio else None,
            'area': self.area,
            'duracion_minutos': self.duracion_minutos,
            'completada': self.completada,
            'completada_at': self.completada_at.isoformat() if self.completada_at else None,
            'completada_por': self.completada_por,
            'notas': self.notas,
            'created_at': self.created_at.isoformat() if self.created_at else None
        }
