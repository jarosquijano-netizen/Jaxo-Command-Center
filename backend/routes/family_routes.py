"""
Routes para el módulo Family (gestión de perfiles familiares)
"""

from flask import Blueprint, request, jsonify
from extensions import db
from models.family import FamilyMember
import json

family_bp = Blueprint('family', __name__)

# GET /api/family/members
@family_bp.route('/members', methods=['GET'])
def get_members():
    """Obtener todos los miembros de la familia"""
    try:
        members = FamilyMember.query.filter_by(activo=True).all()
        return jsonify({
            'success': True,
            'data': [member.to_dict() for member in members],
            'message': f'Se encontraron {len(members)} miembros'
        })
    except Exception as e:
        return jsonify({
            'success': False,
            'error': str(e),
            'message': 'Error al obtener miembros'
        }), 500

# POST /api/family/members
@family_bp.route('/members', methods=['POST'])
def create_member():
    """Crear nuevo miembro familiar"""
    try:
        data = request.get_json()
        
        # Validaciones básicas
        required_fields = ['nombre', 'edad', 'tipo']
        for field in required_fields:
            if field not in data:
                return jsonify({
                    'success': False,
                    'error': f'Campo requerido: {field}'
                }), 400
        
        # Crear nuevo miembro
        member = FamilyMember(
            nombre=data['nombre'],
            edad=data['edad'],
            tipo=data['tipo'],
            rol_hogar=data.get('rol_hogar', 'familia'),
            avatar_color=data.get('avatar_color', '#4A90E2'),
            emoji=data.get('emoji', '👤'),
            
            # Tareas
            puede_cocinar=data.get('puede_cocinar', False),
            puede_limpiar=data.get('puede_limpiar', False),
            puede_compras=data.get('puede_compras', False),
            porcentaje_tareas_limpieza=data.get('porcentaje_tareas_limpieza', 0),
            porcentaje_tareas_cocina=data.get('porcentaje_tareas_cocina', 0),
            tareas_excluidas=json.dumps(data.get('tareas_excluidas', [])),
            disponibilidad_dias=json.dumps(data.get('disponibilidad_dias', [])),
            horario_disponible=data.get('horario_disponible', 'todo_el_dia'),
            
            # Adultos
            objetivo_alimentario=data.get('objetivo_alimentario'),
            estilo_alimentacion=data.get('estilo_alimentacion'),
            cocinas_favoritas=json.dumps(data.get('cocinas_favoritas', [])),
            nivel_picante=data.get('nivel_picante'),
            ingredientes_favoritos=json.dumps(data.get('ingredientes_favoritos', [])),
            ingredientes_no_gustan=json.dumps(data.get('ingredientes_no_gustan', [])),
            alergias=json.dumps(data.get('alergias', [])),
            intolerancias=json.dumps(data.get('intolerancias', [])),
            restricciones_religiosas=data.get('restricciones_religiosas'),
            preocupacion_principal=data.get('preocupacion_principal'),
            tiempo_max_cocinar=data.get('tiempo_max_cocinar'),
            nivel_cocina=data.get('nivel_cocina'),
            tipo_desayuno=data.get('tipo_desayuno'),
            le_gustan_snacks=data.get('le_gustan_snacks', True),
            plato_favorito=data.get('plato_favorito'),
            plato_menos_favorito=data.get('plato_menos_favorito'),
            comentarios=data.get('comentarios'),
            
            # Niños
            come_solo=data.get('come_solo'),
            nivel_exigencia=data.get('nivel_exigencia'),
            acepta_comida_nueva=data.get('acepta_comida_nueva'),
            verduras_aceptadas=json.dumps(data.get('verduras_aceptadas', [])),
            verduras_rechazadas=json.dumps(data.get('verduras_rechazadas', [])),
            texturas_no_gustan=json.dumps(data.get('texturas_no_gustan', [])),
            desayuno_preferido=data.get('desayuno_preferido'),
            snacks_favoritos=json.dumps(data.get('snacks_favoritos', [])),
            plato_nunca_comeria=data.get('plato_nunca_comeria'),
            comentarios_padres=data.get('comentarios_padres'),
            
            # Empleado hogar
            dias_trabajo=json.dumps(data.get('dias_trabajo', [])),
            horario_entrada=data.get('horario_entrada'),
            horario_salida=data.get('horario_salida'),
            horas_por_dia=data.get('horas_por_dia', 0.0),
            responsabilidades_principales=json.dumps(data.get('responsabilidades_principales', [])),
            notas_empleador=data.get('notas_empleador')
        )
        
        db.session.add(member)
        db.session.commit()
        
        return jsonify({
            'success': True,
            'data': member.to_dict(),
            'message': 'Miembro creado exitosamente'
        }), 201
        
    except Exception as e:
        db.session.rollback()
        return jsonify({
            'success': False,
            'error': str(e),
            'message': 'Error al crear miembro'
        }), 500

# PUT /api/family/members/<id>
@family_bp.route('/members/<int:member_id>', methods=['PUT'])
def update_member(member_id):
    """Actualizar miembro existente"""
    try:
        member = FamilyMember.query.get_or_404(member_id)
        data = request.get_json()
        
        # Actualizar campos
        if 'name' in data:
            member.name = data['name']
        if 'age' in data:
            member.age = data['age']
        if 'role' in data:
            member.role = data['role']
        if 'avatar_url' in data:
            member.avatar_url = data['avatar_url']
        if 'dietary_preferences' in data:
            member.dietary_preferences = json.dumps(data['dietary_preferences'])
        if 'allergies' in data:
            member.allergies = json.dumps(data['allergies'])
        if 'favorite_foods' in data:
            member.favorite_foods = json.dumps(data['favorite_foods'])
        if 'disliked_foods' in data:
            member.disliked_foods = json.dumps(data['disliked_foods'])
        if 'cleaning_capacity' in data:
            member.cleaning_capacity = data['cleaning_capacity']
        if 'work_schedule' in data:
            member.work_schedule = json.dumps(data['work_schedule'])
        if 'school_schedule' in data:
            member.school_schedule = json.dumps(data['school_schedule'])
        
        db.session.commit()
        
        return jsonify({
            'success': True,
            'data': member.to_dict(),
            'message': 'Miembro actualizado exitosamente'
        })
        
    except Exception as e:
        db.session.rollback()
        return jsonify({
            'success': False,
            'error': str(e),
            'message': 'Error al actualizar miembro'
        }), 500

# DELETE /api/family/members/<id>
@family_bp.route('/members/<int:member_id>', methods=['DELETE'])
def delete_member(member_id):
    """Eliminar miembro (soft delete)"""
    try:
        member = FamilyMember.query.get_or_404(member_id)
        member.activo = False
        db.session.commit()
        
        return jsonify({
            'success': True,
            'message': 'Miembro eliminado exitosamente'
        })
        
    except Exception as e:
        db.session.rollback()
        return jsonify({
            'success': False,
            'error': str(e),
            'message': 'Error al eliminar miembro'
        }), 500

# GET /api/family/members/<id>
@family_bp.route('/members/<int:member_id>', methods=['GET'])
def get_member(member_id):
    """Obtener detalles de un miembro"""
    try:
        member = FamilyMember.query.get_or_404(member_id)
        return jsonify({
            'success': True,
            'data': member.to_dict(),
            'message': 'Miembro encontrado'
        })
        
    except Exception as e:
        return jsonify({
            'success': False,
            'error': str(e),
            'message': 'Error al obtener miembro'
        }), 500
