"""
Rutas del módulo de limpieza
"""

from flask import Blueprint, request, jsonify
from extensions import db
from models.cleaning import CleaningTask, CleaningSchedule
from models.family import FamilyMember
from models.settings import Settings
from datetime import datetime, timedelta, date
import json
import random

cleaning_bp = Blueprint('cleaning', __name__)

# Catálogo base de tareas
TAREAS_BASE = [
    # COCINA - Diarias
    {
        "nombre": "Fregar platos",
        "nombre_alternativo": "Poner lavavajillas",
        "area": "cocina",
        "icono": "utensils",
        "dificultad": "simple",
        "edad_minima": 10,
        "duracion_minutos": 15,
        "frecuencia": "diaria"
    },
    {
        "nombre": "Limpiar encimera",
        "area": "cocina",
        "icono": "sparkles",
        "dificultad": "simple",
        "edad_minima": 10,
        "duracion_minutos": 10,
        "frecuencia": "diaria"
    },
    {
        "nombre": "Sacar basura",
        "area": "cocina",
        "icono": "trash-2",
        "dificultad": "simple",
        "edad_minima": 10,
        "duracion_minutos": 5,
        "frecuencia": "diaria"
    },
    {
        "nombre": "Separar reciclaje",
        "area": "cocina",
        "icono": "recycle",
        "dificultad": "simple",
        "edad_minima": 8,
        "duracion_minutos": 10,
        "frecuencia": "diaria"
    },
    
    # COCINA - Semanales
    {
        "nombre": "Limpiar nevera",
        "area": "cocina",
        "icono": "refrigerator",
        "dificultad": "media",
        "edad_minima": 14,
        "duracion_minutos": 20,
        "frecuencia": "semanal",
        "dias_especificos": ["viernes"]
    },
    {
        "nombre": "Limpiar horno",
        "area": "cocina",
        "icono": "flame",
        "dificultad": "compleja",
        "edad_minima": 18,
        "duracion_minutos": 30,
        "frecuencia": "quincenal"
    },
    {
        "nombre": "Fregar suelo cocina",
        "area": "cocina",
        "icono": "droplets",
        "dificultad": "media",
        "edad_minima": 14,
        "duracion_minutos": 20,
        "frecuencia": "semanal"
    },
    
    # BAÑOS - Se multiplican por número de baños
    {
        "nombre": "Limpiar lavabo",
        "area": "bano",
        "icono": "bath",
        "dificultad": "media",
        "edad_minima": 12,
        "duracion_minutos": 15,
        "frecuencia": "semanal",
        "multiplicar_por": "banos"
    },
    {
        "nombre": "Limpiar WC",
        "area": "bano",
        "icono": "toilet",
        "dificultad": "media",
        "edad_minima": 14,
        "duracion_minutos": 15,
        "frecuencia": "semanal",
        "multiplicar_por": "banos"
    },
    {
        "nombre": "Limpiar ducha/bañera",
        "area": "bano",
        "icono": "shower-head",
        "dificultad": "media",
        "edad_minima": 14,
        "duracion_minutos": 20,
        "frecuencia": "semanal",
        "multiplicar_por": "banos"
    },
    {
        "nombre": "Cambiar toallas",
        "area": "bano",
        "icono": "towel",
        "dificultad": "simple",
        "edad_minima": 8,
        "duracion_minutos": 5,
        "frecuencia": "semanal",
        "multiplicar_por": "banos"
    },
    
    # SALÓN
    {
        "nombre": "Ordenar salón",
        "area": "salon",
        "icono": "sofa",
        "dificultad": "simple",
        "edad_minima": 6,
        "duracion_minutos": 15,
        "frecuencia": "diaria",
        "aplica_si": {"tiene_salon": True}
    },
    {
        "nombre": "Pasar aspiradora salón",
        "nombre_alternativo": "Activar robot aspiradora",
        "area": "salon",
        "icono": "vacuum",
        "dificultad": "media",
        "edad_minima": 12,
        "duracion_minutos": 20,
        "frecuencia": "semanal",
        "requiere_equipamiento": "aspiradora"
    },
    {
        "nombre": "Quitar polvo",
        "area": "salon",
        "icono": "wind",
        "dificultad": "media",
        "edad_minima": 10,
        "duracion_minutos": 15,
        "frecuencia": "semanal"
    },
    
    # DORMITORIOS - Se multiplican
    {
        "nombre": "Hacer cama",
        "area": "dormitorio",
        "icono": "bed",
        "dificultad": "simple",
        "edad_minima": 6,
        "duracion_minutos": 5,
        "frecuencia": "diaria",
        "multiplicar_por": "dormitorios"
    },
    {
        "nombre": "Ordenar habitación",
        "area": "dormitorio",
        "icono": "layout",
        "dificultad": "simple",
        "edad_minima": 6,
        "duracion_minutos": 15,
        "frecuencia": "diaria",
        "multiplicar_por": "dormitorios"
    },
    {
        "nombre": "Cambiar sábanas",
        "area": "dormitorio",
        "icono": "bed-double",
        "dificultad": "media",
        "edad_minima": 12,
        "duracion_minutos": 15,
        "frecuencia": "semanal",
        "multiplicar_por": "dormitorios"
    },
    {
        "nombre": "Aspirar dormitorio",
        "area": "dormitorio",
        "icono": "vacuum",
        "dificultad": "media",
        "edad_minima": 12,
        "duracion_minutos": 15,
        "frecuencia": "semanal",
        "multiplicar_por": "dormitorios"
    },
    
    # ROPA - General
    {
        "nombre": "Poner lavadora",
        "area": "general",
        "icono": "washing-machine",
        "dificultad": "simple",
        "edad_minima": 12,
        "duracion_minutos": 10,
        "frecuencia": "diaria"
    },
    {
        "nombre": "Tender ropa",
        "area": "general",
        "icono": "shirt",
        "dificultad": "simple",
        "edad_minima": 10,
        "duracion_minutos": 15,
        "frecuencia": "diaria",
        "aplica_si": {"tiene_secadora": False}
    },
    {
        "nombre": "Poner secadora",
        "area": "general",
        "icono": "wind",
        "dificultad": "simple",
        "edad_minima": 12,
        "duracion_minutos": 5,
        "frecuencia": "diaria",
        "aplica_si": {"tiene_secadora": True}
    },
    {
        "nombre": "Recoger ropa tendida",
        "area": "general",
        "icono": "shirt",
        "dificultad": "simple",
        "edad_minima": 8,
        "duracion_minutos": 10,
        "frecuencia": "diaria",
        "aplica_si": {"tiene_secadora": False}
    },
    {
        "nombre": "Doblar ropa",
        "area": "general",
        "icono": "layers",
        "dificultad": "simple",
        "edad_minima": 10,
        "duracion_minutos": 20,
        "frecuencia": "semanal"
    },
    
    # EXTERIOR - Condicionales
    {
        "nombre": "Limpiar terraza",
        "area": "exterior",
        "icono": "sun",
        "dificultad": "media",
        "edad_minima": 14,
        "duracion_minutos": 30,
        "frecuencia": "semanal",
        "aplica_si": {"tiene_terraza": True}
    },
    {
        "nombre": "Regar plantas terraza",
        "area": "exterior",
        "icono": "flower-2",
        "dificultad": "simple",
        "edad_minima": 6,
        "duracion_minutos": 10,
        "frecuencia": "diaria",
        "aplica_si": {"tiene_terraza": True, "tiene_plantas": True}
    },
    {
        "nombre": "Barrer balcón",
        "area": "exterior",
        "icono": "brush",
        "dificultad": "simple",
        "edad_minima": 10,
        "duracion_minutos": 10,
        "frecuencia": "semanal",
        "aplica_si": {"tiene_balcon": True}
    },
    
    # PLANTAS
    {
        "nombre": "Regar plantas interior",
        "area": "general",
        "icono": "flower",
        "dificultad": "simple",
        "edad_minima": 6,
        "duracion_minutos": 10,
        "frecuencia": "diaria",
        "aplica_si": {"tiene_plantas": True}
    },
    
    # MASCOTAS - Condicionales por tipo
    {
        "nombre": "Pasear perro",
        "area": "mascotas",
        "icono": "dog",
        "dificultad": "simple",
        "edad_minima": 12,
        "duracion_minutos": 30,
        "frecuencia": "diaria",
        "aplica_si": {"tiene_mascotas": True, "tipo_mascota": "perro"}
    },
    {
        "nombre": "Dar de comer mascotas",
        "area": "mascotas",
        "icono": "bowl-food",
        "dificultad": "simple",
        "edad_minima": 8,
        "duracion_minutos": 5,
        "frecuencia": "diaria",
        "aplica_si": {"tiene_mascotas": True}
    },
    {
        "nombre": "Limpiar arenero gato",
        "area": "mascotas",
        "icono": "cat",
        "dificultad": "simple",
        "edad_minima": 12,
        "duracion_minutos": 10,
        "frecuencia": "diaria",
        "aplica_si": {"tiene_mascotas": True, "tipo_mascota": "gato"}
    },
    {
        "nombre": "Cepillar mascota",
        "area": "mascotas",
        "icono": "brush",
        "dificultad": "simple",
        "edad_minima": 10,
        "duracion_minutos": 15,
        "frecuencia": "semanal",
        "aplica_si": {"tiene_mascotas": True}
    },
    
    # TAREAS NIÑOS PEQUEÑOS (Oliva 4 años)
    {
        "nombre": "Guardar juguetes",
        "area": "dormitorio",
        "icono": "toy-brick",
        "dificultad": "simple",
        "edad_minima": 4,
        "duracion_minutos": 10,
        "frecuencia": "diaria"
    },
    {
        "nombre": "Ayudar a poner mesa",
        "area": "cocina",
        "icono": "utensils-crossed",
        "dificultad": "simple",
        "edad_minima": 4,
        "duracion_minutos": 5,
        "frecuencia": "diaria"
    },
    {
        "nombre": "Llevar ropa al cesto",
        "area": "general",
        "icono": "basket",
        "dificultad": "simple",
        "edad_minima": 4,
        "duracion_minutos": 5,
        "frecuencia": "diaria"
    }
]

def get_house_config():
    """Obtener configuración de la casa"""
    settings = Settings.query.first()
    if settings and settings.house_config:
        return json.loads(settings.house_config)
    return {}

def cumple_condiciones(condiciones, house_config):
    """Verificar si se cumplen las condiciones para aplicar una tarea"""
    for key, value in condiciones.items():
        if key == "tipo_mascota":
            # Verificar si hay mascota de ese tipo
            mascotas = house_config.get("mascotas", [])
            tiene_tipo = any(m.get("tipo") == value for m in mascotas)
            if not tiene_tipo:
                return False
        else:
            # Verificar condición booleana simple
            if house_config.get(key) != value:
                return False
    return True

def generar_catalogo_personalizado():
    """Generar catálogo de tareas basado en configuración de la casa"""
    house = get_house_config()
    tareas_aplicables = []
    
    for tarea in TAREAS_BASE:
        # Verificar condiciones aplica_si
        if tarea.get('aplica_si'):
            if not cumple_condiciones(tarea['aplica_si'], house):
                continue
        
        # Verificar equipamiento
        if tarea.get('requiere_equipamiento'):
            equipo = tarea['requiere_equipamiento']
            if not house.get(f'tiene_{equipo}', False):
                continue
        
        # Usar nombre alternativo si aplica
        nombre_final = tarea['nombre']
        if tarea.get('nombre_alternativo') and house.get('tiene_lavavajillas'):
            if 'lavavajillas' in tarea.get('requiere_equipamiento', ''):
                nombre_final = tarea['nombre_alternativo']
        
        # Multiplicar por habitaciones si aplica
        if tarea.get('multiplicar_por'):
            campo = tarea['multiplicar_por']
            cantidad = house.get(campo, 1)
            for i in range(cantidad):
                tarea_copia = tarea.copy()
                tarea_copia['nombre'] = f"{nombre_final} ({campo[:-1]} {i+1})"
                tareas_aplicables.append(tarea_copia)
        else:
            tarea_copia = tarea.copy()
            tarea_copia['nombre'] = nombre_final
            tareas_aplicables.append(tarea_copia)
    
    return tareas_aplicables

def generar_semana(fecha_lunes):
    """Generar plan semanal de limpieza"""
    members = FamilyMember.query.filter_by(activo=True).all()
    house = get_house_config()
    tareas = generar_catalogo_personalizado()
    
    dias_semana = ['lunes', 'martes', 'miercoles', 'jueves', 'viernes', 'sabado', 'domingo']
    schedule = []
    
    # Track de minutos asignados por persona esta semana
    minutos_asignados = {m.id: 0 for m in members}
    minutos_objetivo_semana = 240  # 4 horas por persona por semana
    minutos_objetivo_diario = minutos_objetivo_semana / 7  # ~34 min por día
    
    # Primero, recolectar todas las tareas semanales y distribuirlas
    tareas_semanales = []
    tareas_diarias = []
    
    for t in tareas:
        if t['frecuencia'] == 'diaria':
            tareas_diarias.append(t)
        elif t['frecuencia'] in ['semanal', 'quincenal', 'mensual']:
            tareas_semanales.append(t)
    
    # Distribuir tareas semanales equitativamente entre los días
    dias_con_tareas_semanales = []
    if tareas_semanales:
        # Evitar sobrecargar lunes, distribuir entre martes-viernes
        dias_disponibles = ['martes', 'miercoles', 'jueves', 'viernes', 'sabado']
        tareas_por_dia = max(1, len(tareas_semanales) // len(dias_disponibles))
        
        for i, dia in enumerate(dias_disponibles):
            start_idx = i * tareas_por_dia
            end_idx = start_idx + tareas_por_dia
            if i == len(dias_disponibles) - 1:  # Último día, tomar el resto
                end_idx = len(tareas_semanales)
            
            if start_idx < len(tareas_semanales):
                dias_con_tareas_semanales.append({
                    'dia': dia,
                    'tareas': tareas_semanales[start_idx:end_idx]
                })
    
    for i, dia in enumerate(dias_semana):
        fecha = fecha_lunes + timedelta(days=i)
        es_fin_de_semana = dia in ['sabado', 'domingo']
        
        # Filtrar miembros disponibles este día
        miembros_disponibles = []
        for m in members:
            disponibilidad = json.loads(m.disponibilidad_dias) if m.disponibilidad_dias else dias_semana
            if dia in disponibilidad:
                # Marycel solo L-V
                if m.rol_hogar == 'empleado_hogar' and es_fin_de_semana:
                    continue
                miembros_disponibles.append(m)
        
        # Filtrar tareas para hoy
        tareas_hoy = []
        
        # Tareas diarias (siempre)
        tareas_hoy.extend(tareas_diarias)
        
        # Tareas semanales (solo si este día está en la distribución)
        dia_info = next((d for d in dias_con_tareas_semanales if d['dia'] == dia), None)
        if dia_info:
            tareas_hoy.extend(dia_info['tareas'])
        
        # Limitar tareas diarias si hay muchas semanales hoy
        if len(tareas_hoy) > 8:  # Máximo 8 tareas por día
            # Priorizar semanales, reducir diarias
            tareas_semanales_hoy = [t for t in tareas_hoy if t['frecuencia'] != 'diaria']
            tareas_diarias_hoy = [t for t in tareas_hoy if t['frecuencia'] == 'diaria']
            
            # Mantener todas las semanales y algunas diarias
            max_diarias = max(2, 8 - len(tareas_semanales_hoy))
            tareas_hoy = tareas_semanales_hoy + tareas_diarias_hoy[:max_diarias]
        
        # Asignar cada tarea
        for tarea in tareas_hoy:
            # Filtrar por edad mínima
            elegibles = [m for m in miembros_disponibles 
                        if m.edad >= tarea['edad_minima']]
            
            if not elegibles:
                continue
            
            # Calcular pesos balanceando carga diaria y semanal
            pesos = []
            for m in elegibles:
                porcentaje = m.porcentaje_tareas_limpieza or 20
                
                # Factor de balance diario: penalizar si ya tiene muchos minutos hoy
                minutos_hoy = sum(s['duracion_minutos'] for s in schedule 
                                if s['member_id'] == m.id and s['fecha_programada'] == fecha)
                factor_balance_diario = max(0.3, 1 - minutos_hoy / 60)  # Reducir peso si ya tiene 1+ hora hoy
                
                # Factor de balance semanal: penalizar si ya tiene muchos minutos esta semana
                factor_balance_semanal = max(0.5, 1 - minutos_asignados[m.id] / (minutos_objetivo_semana * 1.5))
                
                # Peso final
                peso = porcentaje * factor_balance_diario * factor_balance_semanal
                
                # Para L-V, priorizar Marycel para tareas diarias
                if not es_fin_de_semana and m.rol_hogar == 'empleado_hogar' and tarea['frecuencia'] == 'diaria':
                    peso *= 1.3
                
                pesos.append(max(peso, 0.1))
            
            # Seleccionar miembro
            total_peso = sum(pesos)
            probabilidades = [p/total_peso for p in pesos]
            
            asignado = random.choices(elegibles, weights=probabilidades, k=1)[0]
            
            # Crear asignación
            schedule.append({
                'task_id': 0,  # Se asignará después de guardar en BD
                'task_nombre': tarea['nombre'],
                'member_id': asignado.id,
                'member_nombre': asignado.nombre,
                'fecha_programada': fecha,
                'semana_inicio': fecha_lunes,
                'area': tarea['area'],
                'duracion_minutos': tarea['duracion_minutos'],
                'completada': False
            })
            
            minutos_asignados[asignado.id] += tarea['duracion_minutos']
    
    return schedule

# API ENDPOINTS

@cleaning_bp.route('/tasks', methods=['GET'])
def get_tasks():
    """Obtener catálogo de tareas"""
    try:
        tasks = CleaningTask.query.filter_by(activa=True).all()
        return jsonify({
            'success': True,
            'data': [task.to_dict() for task in tasks]
        })
    except Exception as e:
        return jsonify({
            'success': False,
            'error': str(e)
        }), 500

@cleaning_bp.route('/tasks', methods=['POST'])
def create_task():
    """Crear nueva tarea"""
    try:
        data = request.get_json()
        
        task = CleaningTask(
            nombre=data['nombre'],
            nombre_alternativo=data.get('nombre_alternativo'),
            area=data['area'],
            icono=data.get('icono'),
            dificultad=data.get('dificultad', 'media'),
            edad_minima=data.get('edad_minima', 18),
            duracion_minutos=data.get('duracion_minutos', 15),
            frecuencia=data.get('frecuencia', 'semanal'),
            dias_especificos=json.dumps(data.get('dias_especificos', [])),
            requiere_equipamiento=data.get('requiere_equipamiento'),
            aplica_si=json.dumps(data.get('aplica_si', {})),
            multiplicar_por=data.get('multiplicar_por'),
            activa=data.get('activa', True)
        )
        
        db.session.add(task)
        db.session.commit()
        
        return jsonify({
            'success': True,
            'data': task.to_dict(),
            'message': 'Tarea creada exitosamente'
        })
    except Exception as e:
        db.session.rollback()
        return jsonify({
            'success': False,
            'error': str(e)
        }), 500

@cleaning_bp.route('/tasks/<int:task_id>', methods=['PUT'])
def update_task(task_id):
    """Actualizar tarea"""
    try:
        task = CleaningTask.query.get_or_404(task_id)
        data = request.get_json()
        
        for field in ['nombre', 'nombre_alternativo', 'area', 'icono', 'dificultad', 
                     'edad_minima', 'duracion_minutos', 'frecuencia', 
                     'requiere_equipamiento', 'multiplicar_por', 'activa']:
            if field in data:
                setattr(task, field, data[field])
        
        if 'dias_especificos' in data:
            task.dias_especificos = json.dumps(data['dias_especificos'])
        
        if 'aplica_si' in data:
            task.aplica_si = json.dumps(data['aplica_si'])
        
        db.session.commit()
        
        return jsonify({
            'success': True,
            'data': task.to_dict(),
            'message': 'Tarea actualizada exitosamente'
        })
    except Exception as e:
        db.session.rollback()
        return jsonify({
            'success': False,
            'error': str(e)
        }), 500

@cleaning_bp.route('/tasks/<int:task_id>', methods=['DELETE'])
def delete_task(task_id):
    """Eliminar tarea"""
    try:
        task = CleaningTask.query.get_or_404(task_id)
        db.session.delete(task)
        db.session.commit()
        
        return jsonify({
            'success': True,
            'message': 'Tarea eliminada exitosamente'
        })
    except Exception as e:
        db.session.rollback()
        return jsonify({
            'success': False,
            'error': str(e)
        }), 500

@cleaning_bp.route('/schedule', methods=['GET'])
def get_schedule():
    """Obtener plan semanal"""
    try:
        week_start = request.args.get('week_start')
        if week_start:
            fecha_lunes = datetime.strptime(week_start, '%Y-%m-%d').date()
        else:
            # Obtener lunes de la semana actual
            today = date.today()
            fecha_lunes = today - timedelta(days=today.weekday())
        
        schedule = CleaningSchedule.query.filter_by(semana_inicio=fecha_lunes).all()
        
        return jsonify({
            'success': True,
            'data': [item.to_dict() for item in schedule],
            'week_start': fecha_lunes.isoformat()
        })
    except Exception as e:
        return jsonify({
            'success': False,
            'error': str(e)
        }), 500

@cleaning_bp.route('/generate', methods=['POST'])
def generate_schedule():
    """Generar nuevo plan semanal"""
    try:
        data = request.get_json()
        week_start_str = data.get('week_start')
        regenerate = data.get('regenerate', False)
        
        if week_start_str:
            fecha_lunes = datetime.strptime(week_start_str, '%Y-%m-%d').date()
        else:
            today = date.today()
            fecha_lunes = today - timedelta(days=today.weekday())
        
        # Si regenerar, eliminar asignaciones existentes
        if regenerate:
            CleaningSchedule.query.filter_by(semana_inicio=fecha_lunes).delete()
        
        # Generar nuevo plan
        schedule_data = generar_semana(fecha_lunes)
        
        # Guardar en base de datos
        for item in schedule_data:
            schedule = CleaningSchedule(
                task_id=item['task_id'],
                task_nombre=item['task_nombre'],
                member_id=item['member_id'],
                member_nombre=item['member_nombre'],
                fecha_programada=item['fecha_programada'],
                semana_inicio=item['semana_inicio'],
                area=item['area'],
                duracion_minutos=item['duracion_minutos'],
                completada=item['completada']
            )
            db.session.add(schedule)
        
        db.session.commit()
        
        return jsonify({
            'success': True,
            'message': f'Plan semanal generado para {fecha_lunes}',
            'data': [item.to_dict() for item in CleaningSchedule.query.filter_by(semana_inicio=fecha_lunes).all()]
        })
    except Exception as e:
        db.session.rollback()
        return jsonify({
            'success': False,
            'error': str(e)
        }), 500

@cleaning_bp.route('/schedule/<int:schedule_id>/complete', methods=['PUT'])
def complete_task(schedule_id):
    """Marcar tarea como completada"""
    try:
        schedule = CleaningSchedule.query.get_or_404(schedule_id)
        data = request.get_json()
        
        schedule.completada = data.get('completed', True)
        if schedule.completada:
            schedule.completada_at = datetime.utcnow()
            schedule.completada_por = data.get('completed_by')
        
        db.session.commit()
        
        return jsonify({
            'success': True,
            'data': schedule.to_dict(),
            'message': 'Tarea marcada como completada'
        })
    except Exception as e:
        db.session.rollback()
        return jsonify({
            'success': False,
            'error': str(e)
        }), 500

@cleaning_bp.route('/schedule/<int:schedule_id>/reassign', methods=['PUT'])
def reassign_task(schedule_id):
    """Reasignar tarea a otro miembro"""
    try:
        schedule = CleaningSchedule.query.get_or_404(schedule_id)
        data = request.get_json()
        
        new_member_id = data.get('member_id')
        new_member = FamilyMember.query.get_or_404(new_member_id)
        
        schedule.member_id = new_member_id
        schedule.member_nombre = new_member.nombre
        
        db.session.commit()
        
        return jsonify({
            'success': True,
            'data': schedule.to_dict(),
            'message': 'Tarea reasignada exitosamente'
        })
    except Exception as e:
        db.session.rollback()
        return jsonify({
            'success': False,
            'error': str(e)
        }), 500

@cleaning_bp.route('/schedule/<int:schedule_id>', methods=['DELETE'])
def delete_schedule_item(schedule_id):
    """Eliminar asignación"""
    try:
        schedule = CleaningSchedule.query.get_or_404(schedule_id)
        db.session.delete(schedule)
        db.session.commit()
        
        return jsonify({
            'success': True,
            'message': 'Asignación eliminada exitosamente'
        })
    except Exception as e:
        db.session.rollback()
        return jsonify({
            'success': False,
            'error': str(e)
        }), 500

@cleaning_bp.route('/stats', methods=['GET'])
def get_stats():
    """Obtener estadísticas de limpieza"""
    try:
        period = request.args.get('period', 'week')
        
        if period == 'week':
            # Estadísticas semana actual
            today = date.today()
            fecha_lunes = today - timedelta(days=today.weekday())
            schedule = CleaningSchedule.query.filter_by(semana_inicio=fecha_lunes).all()
        elif period == 'month':
            # Estadísticas mes actual
            today = date.today()
            first_day = today.replace(day=1)
            schedule = CleaningSchedule.query.filter(
                CleaningSchedule.fecha_programada >= first_day,
                CleaningSchedule.fecha_programada <= today
            ).all()
        else:
            return jsonify({
                'success': False,
                'error': 'Período no válido'
            }), 400
        
        # Calcular estadísticas por miembro
        stats = {}
        for item in schedule:
            member_id = item.member_id
            if member_id not in stats:
                stats[member_id] = {
                    'member_id': member_id,
                    'member_nombre': item.member_nombre,
                    'total_tasks': 0,
                    'completed_tasks': 0,
                    'total_minutes': 0,
                    'areas': {}
                }
            
            stats[member_id]['total_tasks'] += 1
            stats[member_id]['total_minutes'] += item.duracion_minutos or 0
            
            if item.completada:
                stats[member_id]['completed_tasks'] += 1
            
            # Estadísticas por área
            area = item.area or 'general'
            if area not in stats[member_id]['areas']:
                stats[member_id]['areas'][area] = 0
            stats[member_id]['areas'][area] += 1
        
        # Calcular porcentajes
        for member_id in stats:
            if stats[member_id]['total_tasks'] > 0:
                stats[member_id]['completion_rate'] = (
                    stats[member_id]['completed_tasks'] / stats[member_id]['total_tasks'] * 100
                )
            else:
                stats[member_id]['completion_rate'] = 0
        
        return jsonify({
            'success': True,
            'data': list(stats.values()),
            'period': period
        })
    except Exception as e:
        return jsonify({
            'success': False,
            'error': str(e)
        }), 500

@cleaning_bp.route('/initialize', methods=['POST'])
def initialize_cleaning():
    """Inicializar catálogo de tareas base"""
    try:
        # Verificar si ya existen tareas
        existing_tasks = CleaningTask.query.count()
        if existing_tasks > 0:
            return jsonify({
                'success': False,
                'message': 'El catálogo de tareas ya está inicializado'
            })
        
        # Generar catálogo personalizado
        tareas = generar_catalogo_personalizado()
        
        # Guardar en base de datos
        for tarea in tareas:
            task = CleaningTask(
                nombre=tarea['nombre'],
                nombre_alternativo=tarea.get('nombre_alternativo'),
                area=tarea['area'],
                icono=tarea.get('icono'),
                dificultad=tarea.get('dificultad', 'media'),
                edad_minima=tarea.get('edad_minima', 18),
                duracion_minutos=tarea.get('duracion_minutos', 15),
                frecuencia=tarea.get('frecuencia', 'semanal'),
                dias_especificos=json.dumps(tarea.get('dias_especificos', [])),
                requiere_equipamiento=tarea.get('requiere_equipamiento'),
                aplica_si=json.dumps(tarea.get('aplica_si', {})),
                multiplicar_por=tarea.get('multiplicar_por'),
                activa=True
            )
            db.session.add(task)
        
        db.session.commit()
        
        return jsonify({
            'success': True,
            'message': f'Catálogo inicializado con {len(tareas)} tareas',
            'tasks_count': len(tareas)
        })
    except Exception as e:
        db.session.rollback()
        return jsonify({
            'success': False,
            'error': str(e)
        }), 500
