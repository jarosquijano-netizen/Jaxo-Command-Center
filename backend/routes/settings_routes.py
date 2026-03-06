"""
Routes para el módulo Settings (configuración general)
"""

from flask import Blueprint, request, jsonify
from extensions import db
from models.settings import Settings
import json

settings_bp = Blueprint('settings', __name__)

# GET /api/settings
@settings_bp.route('/', methods=['GET'])
@settings_bp.route('', methods=['GET'])
def get_settings():
    """Obtener configuración general"""
    try:
        settings = Settings.query.first()
        if not settings:
            # Crear configuración por defecto
            settings = Settings()
            db.session.add(settings)
            db.session.commit()
        
        return jsonify({
            'success': True,
            'data': settings.to_dict(),
            'message': 'Configuración obtenida exitosamente'
        })
    except Exception as e:
        return jsonify({
            'success': False,
            'error': str(e),
            'message': 'Error al obtener configuración'
        }), 500

# PUT /api/settings
@settings_bp.route('/', methods=['PUT'])
@settings_bp.route('', methods=['PUT'])
def update_settings():
    """Actualizar configuración general"""
    try:
        settings = Settings.query.first()
        if not settings:
            settings = Settings()
            db.session.add(settings)
        
        data = request.get_json()
        
        # Actualizar campos
        if 'nombre_familia' in data:
            settings.nombre_familia = data['nombre_familia']
        if 'ciudad' in data:
            settings.ciudad = data['ciudad']
        if 'idioma' in data:
            settings.idioma = data['idioma']
        if 'zona_horaria' in data:
            settings.zona_horaria = data['zona_horaria']
        if 'dias_menu' in data:
            settings.dias_menu = json.dumps(data['dias_menu'])
        if 'comidas_por_dia' in data:
            settings.comidas_por_dia = json.dumps(data['comidas_por_dia'])
        if 'presupuesto_semanal' in data:
            settings.presupuesto_semanal = data['presupuesto_semanal']
        if 'supermercado_preferido' in data:
            settings.supermercado_preferido = data['supermercado_preferido']
        if 'dias_limpieza_profunda' in data:
            settings.dias_limpieza_profunda = json.dumps(data['dias_limpieza_profunda'])
        if 'incluir_ninos_tareas' in data:
            settings.incluir_ninos_tareas = data['incluir_ninos_tareas']
        if 'edad_minima_tareas_simples' in data:
            settings.edad_minima_tareas_simples = data['edad_minima_tareas_simples']
        if 'edad_minima_tareas_medias' in data:
            settings.edad_minima_tareas_medias = data['edad_minima_tareas_medias']
        if 'anthropic_api_key' in data:
            settings.anthropic_api_key = data['anthropic_api_key']
        if 'google_credentials' in data:
            settings.google_credentials = data['google_credentials']
        if 'house_config' in data:
            settings.house_config = json.dumps(data['house_config'])
        
        db.session.commit()
        
        return jsonify({
            'success': True,
            'data': settings.to_dict(),
            'message': 'Configuración actualizada exitosamente'
        })
    except Exception as e:
        db.session.rollback()
        return jsonify({
            'success': False,
            'error': str(e),
            'message': 'Error al actualizar configuración'
        }), 500
