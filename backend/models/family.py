"""
Modelo de miembros de la familia
"""

from extensions import db
from datetime import datetime
import json

class FamilyMember(db.Model):
    """
    Modelo para almacenar información de cada miembro de la familia
    
    Almacena:
    - Datos básicos (nombre, edad, rol)
    - Campos de asignación de tareas
    - Preferencias alimentarias diferenciadas
    - Campos específicos para adultos/niños
    - Campos específicos para empleados del hogar
    """
    
    __tablename__ = 'family_members'
    
    # CAMPOS COMUNES TODOS LOS MIEMBROS
    id = db.Column(db.Integer, primary_key=True)
    nombre = db.Column(db.String(100), nullable=False)
    edad = db.Column(db.Integer, nullable=False)
    tipo = db.Column(db.String(20), nullable=False)  # "adulto" o "niño"
    rol_hogar = db.Column(db.String(20), default='familia')  # "familia" o "empleado_hogar"
    avatar_color = db.Column(db.String(7), default='#4A90E2')  # hex color
    emoji = db.Column(db.String(10), default='👤')
    activo = db.Column(db.Boolean, default=True)
    
    # CAMPOS PARA ASIGNACIÓN DE TAREAS
    puede_cocinar = db.Column(db.Boolean, default=False)
    puede_limpiar = db.Column(db.Boolean, default=False)
    puede_compras = db.Column(db.Boolean, default=False)
    porcentaje_tareas_limpieza = db.Column(db.Integer, default=0)  # 0-100
    porcentaje_tareas_cocina = db.Column(db.Integer, default=0)  # 0-100
    tareas_excluidas = db.Column(db.Text, default='[]')  # JSON array
    disponibilidad_dias = db.Column(db.Text, default='[]')  # JSON array
    horario_disponible = db.Column(db.String(20), default='todo_el_dia')  # "mañana", "tarde", "noche", "todo_el_dia"
    
    # CAMPOS ADICIONALES ADULTOS
    objetivo_alimentario = db.Column(db.String(50))  # "Salud", "Perder peso", "Ganar músculo", "Mantener"
    estilo_alimentacion = db.Column(db.String(50))  # "Mediterránea", "Tradicional", "Internacional"
    cocinas_favoritas = db.Column(db.Text, default='[]')  # JSON array
    nivel_picante = db.Column(db.String(20))  # "Nada", "Suave", "Medio", "Fuerte"
    ingredientes_favoritos = db.Column(db.Text, default='[]')  # JSON array
    ingredientes_no_gustan = db.Column(db.Text, default='[]')  # JSON array
    alergias = db.Column(db.Text, default='[]')  # JSON array
    intolerancias = db.Column(db.Text, default='[]')  # JSON array
    restricciones_religiosas = db.Column(db.String(100))
    preocupacion_principal = db.Column(db.String(50))  # "Ninguna", "Azúcar", "Sal", "Grasas"
    tiempo_max_cocinar = db.Column(db.Integer)  # minutos
    nivel_cocina = db.Column(db.String(50))
    tipo_desayuno = db.Column(db.String(50))
    le_gustan_snacks = db.Column(db.Boolean, default=True)
    plato_favorito = db.Column(db.String(100))
    plato_menos_favorito = db.Column(db.String(100))
    comentarios = db.Column(db.Text)
    
    # CAMPOS ADICIONALES NIÑOS
    come_solo = db.Column(db.String(20))  # "Solo", "Con ayuda", "Necesita mucha ayuda"
    nivel_exigencia = db.Column(db.String(20))  # "Alto", "Medio", "Bajo"
    acepta_comida_nueva = db.Column(db.String(20))  # "Sí", "A veces", "No"
    verduras_aceptadas = db.Column(db.Text, default='[]')  # JSON array
    verduras_rechazadas = db.Column(db.Text, default='[]')  # JSON array
    texturas_no_gustan = db.Column(db.Text, default='[]')  # JSON array
    desayuno_preferido = db.Column(db.String(100))
    snacks_favoritos = db.Column(db.Text, default='[]')  # JSON array
    plato_nunca_comeria = db.Column(db.String(100))
    comentarios_padres = db.Column(db.Text)
    
    # CAMPOS ESPECÍFICOS EMPLEADO HOGAR
    dias_trabajo = db.Column(db.Text, default='[]')  # JSON array
    horario_entrada = db.Column(db.String(5))  # "18:00"
    horario_salida = db.Column(db.String(5))  # "21:00"
    horas_por_dia = db.Column(db.Float, default=0.0)
    responsabilidades_principales = db.Column(db.Text, default='[]')  # JSON array
    notas_empleador = db.Column(db.Text)
    
    # Metadatos
    created_at = db.Column(db.DateTime, default=datetime.utcnow)
    updated_at = db.Column(db.DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
    
    def __repr__(self):
        return f'<FamilyMember {self.nombre}>'
    
    def to_dict(self):
        """Convierte el objeto a diccionario"""
        return {
            'id': self.id,
            'nombre': self.nombre,
            'edad': self.edad,
            'tipo': self.tipo,
            'rol_hogar': self.rol_hogar,
            'avatar_color': self.avatar_color,
            'emoji': self.emoji,
            'activo': self.activo,
            
            # Tareas
            'puede_cocinar': self.puede_cocinar,
            'puede_limpiar': self.puede_limpiar,
            'puede_compras': self.puede_compras,
            'porcentaje_tareas_limpieza': self.porcentaje_tareas_limpieza,
            'porcentaje_tareas_cocina': self.porcentaje_tareas_cocina,
            'tareas_excluidas': json.loads(self.tareas_excluidas) if self.tareas_excluidas else [],
            'disponibilidad_dias': json.loads(self.disponibilidad_dias) if self.disponibilidad_dias else [],
            'horario_disponible': self.horario_disponible,
            
            # Adultos
            'objetivo_alimentario': self.objetivo_alimentario,
            'estilo_alimentacion': self.estilo_alimentacion,
            'cocinas_favoritas': json.loads(self.cocinas_favoritas) if self.cocinas_favoritas else [],
            'nivel_picante': self.nivel_picante,
            'ingredientes_favoritos': json.loads(self.ingredientes_favoritos) if self.ingredientes_favoritos else [],
            'ingredientes_no_gustan': json.loads(self.ingredientes_no_gustan) if self.ingredientes_no_gustan else [],
            'alergias': json.loads(self.alergias) if self.alergias else [],
            'intolerancias': json.loads(self.intolerancias) if self.intolerancias else [],
            'restricciones_religiosas': self.restricciones_religiosas,
            'preocupacion_principal': self.preocupacion_principal,
            'tiempo_max_cocinar': self.tiempo_max_cocinar,
            'nivel_cocina': self.nivel_cocina,
            'tipo_desayuno': self.tipo_desayuno,
            'le_gustan_snacks': self.le_gustan_snacks,
            'plato_favorito': self.plato_favorito,
            'plato_menos_favorito': self.plato_menos_favorito,
            'comentarios': self.comentarios,
            
            # Niños
            'come_solo': self.come_solo,
            'nivel_exigencia': self.nivel_exigencia,
            'acepta_comida_nueva': self.acepta_comida_nueva,
            'verduras_aceptadas': json.loads(self.verduras_aceptadas) if self.verduras_aceptadas else [],
            'verduras_rechazadas': json.loads(self.verduras_rechazadas) if self.verduras_rechazadas else [],
            'texturas_no_gustan': json.loads(self.texturas_no_gustan) if self.texturas_no_gustan else [],
            'desayuno_preferido': self.desayuno_preferido,
            'snacks_favoritos': json.loads(self.snacks_favoritos) if self.snacks_favoritos else [],
            'plato_nunca_comeria': self.plato_nunca_comeria,
            'comentarios_padres': self.comentarios_padres,
            
            # Empleado hogar
            'dias_trabajo': json.loads(self.dias_trabajo) if self.dias_trabajo else [],
            'horario_entrada': self.horario_entrada,
            'horario_salida': self.horario_salida,
            'horas_por_dia': self.horas_por_dia,
            'responsabilidades_principales': json.loads(self.responsabilidades_principales) if self.responsabilidades_principales else [],
            'notas_empleador': self.notas_empleador,
            
            'created_at': self.created_at.isoformat() if self.created_at else None,
            'updated_at': self.updated_at.isoformat() if self.updated_at else None
        }
