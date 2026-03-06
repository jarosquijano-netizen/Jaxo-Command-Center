"""
Rutas API para gestión de menús
"""

from flask import Blueprint, request, jsonify
from datetime import datetime, date, timedelta
from services.menu_service import menu_service
import logging

logger = logging.getLogger(__name__)

menu_bp = Blueprint('menu', __name__)


@menu_bp.route('/weekly', methods=['GET'])
def get_weekly_menu():
    """
    Obtiene el menú de una semana específica
    Query params:
    - week_start: YYYY-MM-DD (opcional, por defecto semana actual)
    """
    try:
        week_start_str = request.args.get('week_start')
        week_start = None
        
        if week_start_str:
            try:
                week_start = datetime.strptime(week_start_str, '%Y-%m-%d').date()
            except ValueError:
                return jsonify({
                    'success': False,
                    'message': 'Formato de fecha inválido. Use YYYY-MM-DD'
                }), 400
        
        menu = menu_service.get_weekly_menu(week_start)
        
        if menu:
            return jsonify({
                'success': True,
                'data': menu
            })
        else:
            return jsonify({
                'success': False,
                'message': 'No hay menú para esta semana'
            }), 200
            
    except Exception as e:
        logger.error(f"Error en get_weekly_menu: {str(e)}")
        return jsonify({
            'success': False,
            'message': 'Error interno del servidor'
        }), 500


@menu_bp.route('/generate', methods=['POST'])
def generate_menu():
    """
    Genera un nuevo menú semanal
    Body:
    {
        "week_start": "2026-01-20",  // opcional, por defecto semana actual
        "regenerate": false,          // opcional, forzar regeneración
        "settings": {                 // opcional, configuración personalizada
            "dias_menu": ["lunes", ...],
            "comidas_por_dia": ["desayuno", ...],
            "presupuesto_semanal": 100,
            "supermercado_preferido": "Mercadona"
        }
    }
    """
    try:
        data = request.get_json() or {}
        logger.info(f"Datos recibidos en generate_menu: {data}")
        
        # Parsear fecha
        week_start_str = data.get('week_start')
        if week_start_str:
            try:
                week_start = datetime.strptime(week_start_str, '%Y-%m-%d').date()
            except ValueError:
                return jsonify({
                    'success': False,
                    'message': 'Formato de fecha inválido. Use YYYY-MM-DD'
                }), 400
        else:
            # Semana actual (lunes)
            today = date.today()
            days_since_monday = today.weekday()
            week_start = today - timedelta(days=days_since_monday)
        
        # Obtener configuración personalizada
        settings = data.get('settings', {})
        settings['regenerate'] = data.get('regenerate', False)
        
        # Generar menú
        result = menu_service.generate_weekly_menu(week_start, settings)
        
        if result['success']:
            return jsonify(result)
        else:
            message_lc = (result.get('message') or '').lower()
            status_code = 409 if 'ya existe' in message_lc else 400
            return jsonify(result), status_code
            
    except Exception as e:
        logger.error(f"Error en generate_menu: {str(e)}")
        return jsonify({
            'success': False,
            'message': 'Error interno del servidor'
        }), 500


@menu_bp.route('/current', methods=['GET'])
def get_current_menu():
    """Obtiene el menú de la semana actual"""
    try:
        menu = menu_service.get_weekly_menu()
        
        if menu:
            return jsonify({
                'success': True,
                'data': menu
            })
        else:
            return jsonify({
                'success': False,
                'message': 'No hay menú para la semana actual'
            }), 200
            
    except Exception as e:
        logger.error(f"Error en get_current_menu: {str(e)}")
        return jsonify({
            'success': False,
            'message': 'Error interno del servidor'
        }), 500


@menu_bp.route('/latest', methods=['GET'])
def get_latest_menu():
    """Obtiene el último menú generado"""
    try:
        menu = menu_service.get_latest_menu()
        
        if menu:
            return jsonify({
                'success': True,
                'data': menu
            })
        else:
            return jsonify({
                'success': False,
                'message': 'No hay menús generados'
            }), 404
            
    except Exception as e:
        logger.error(f"Error en get_latest_menu: {str(e)}")
        return jsonify({
            'success': False,
            'message': 'Error interno del servidor'
        }), 500


@menu_bp.route('/regenerate-day', methods=['POST'])
def regenerate_day():
    """
    Regenera un día específico o comida específica
    Body:
    {
        "menu_id": 1,
        "dia": "lunes",
        "comida": "cena",      // opcional
        "tipo": "adultos"      // "adultos", "ninos", "ambos"
    }
    """
    try:
        data = request.get_json()
        
        if not data:
            return jsonify({
                'success': False,
                'message': 'Se requieren datos en el body'
            }), 400
        
        menu_id = data.get('menu_id')
        dia = data.get('dia')
        comida = data.get('comida')
        tipo = data.get('tipo', 'adultos')
        
        if not menu_id or not dia:
            return jsonify({
                'success': False,
                'message': 'Se requieren menu_id y dia'
            }), 400
        
        # Validar día
        dias_validos = ['lunes', 'martes', 'miercoles', 'jueves', 'viernes', 'sabado', 'domingo']
        if dia not in dias_validos:
            return jsonify({
                'success': False,
                'message': f'Día inválido. Use: {", ".join(dias_validos)}'
            }), 400
        
        # Validar comida si se especifica
        if comida:
            comidas_validas = ['desayuno', 'comida', 'merienda', 'cena']
            if comida not in comidas_validas:
                return jsonify({
                    'success': False,
                    'message': f'Comida inválida. Use: {", ".join(comidas_validas)}'
                }), 400
        
        # Validar tipo
        tipos_validos = ['adultos', 'ninos', 'ambos']
        if tipo not in tipos_validos:
            return jsonify({
                'success': False,
                'message': f'Tipo inválido. Use: {", ".join(tipos_validos)}'
            }), 400
        
        result = menu_service.regenerate_day_menu(menu_id, dia, comida, tipo)
        
        if result['success']:
            return jsonify(result)
        else:
            return jsonify(result), 400
            
    except Exception as e:
        logger.error(f"Error en regenerate_day: {str(e)}")
        return jsonify({
            'success': False,
            'message': 'Error interno del servidor'
        }), 500


@menu_bp.route('/rate', methods=['POST'])
def rate_menu():
    """
    Califica un item específico del menú
    Body:
    {
        "menu_id": 1,
        "dia": "lunes",
        "comida": "cena",
        "tipo_menu": "adultos",
        "rating": 4,
        "comentario": "Muy rico",
        "rated_by": 1  // opcional, ID del miembro
    }
    """
    try:
        data = request.get_json()
        
        if not data:
            return jsonify({
                'success': False,
                'message': 'Se requieren datos en el body'
            }), 400
        
        menu_id = data.get('menu_id')
        dia = data.get('dia')
        comida = data.get('comida')
        tipo_menu = data.get('tipo_menu')
        rating = data.get('rating')
        comentario = data.get('comentario')
        rated_by = data.get('rated_by')
        
        if not all([menu_id, dia, comida, tipo_menu, rating is not None]):
            return jsonify({
                'success': False,
                'message': 'Se requieren menu_id, dia, comida, tipo_menu y rating'
            }), 400
        
        result = menu_service.rate_menu_item(
            menu_id, dia, comida, tipo_menu, rating, comentario, rated_by
        )
        
        if result['success']:
            return jsonify(result)
        else:
            return jsonify(result), 400
            
    except Exception as e:
        logger.error(f"Error en rate_menu: {str(e)}")
        return jsonify({
            'success': False,
            'message': 'Error interno del servidor'
        }), 500


@menu_bp.route('/ratings/<int:menu_id>', methods=['GET'])
def get_menu_ratings(menu_id):
    """Obtiene todos los ratings de un menú"""
    try:
        ratings = menu_service.get_menu_ratings(menu_id)
        
        return jsonify({
            'success': True,
            'data': ratings
        })
        
    except Exception as e:
        logger.error(f"Error en get_menu_ratings: {str(e)}")
        return jsonify({
            'success': False,
            'message': 'Error interno del servidor'
        }), 500


@menu_bp.route('/ratings/history', methods=['GET'])
def get_ratings_history():
    """Obtiene historial de ratings para aprendizaje"""
    try:
        # Esta función podría implementarse para obtener todos los ratings
        # Por ahora devolvemos un placeholder
        return jsonify({
            'success': True,
            'message': 'Función no implementada aún',
            'data': []
        })
        
    except Exception as e:
        logger.error(f"Error en get_ratings_history: {str(e)}")
        return jsonify({
            'success': False,
            'message': 'Error interno del servidor'
        }), 500


@menu_bp.route('/<int:menu_id>/shopping-list', methods=['GET'])
def get_shopping_list(menu_id):
    """Obtiene la lista de compra de un menú"""
    try:
        shopping_list = menu_service.get_shopping_list(menu_id)
        
        if shopping_list:
            return jsonify({
                'success': True,
                'data': shopping_list
            })
        else:
            return jsonify({
                'success': False,
                'message': 'Lista de compra no encontrada'
            }), 404
            
    except Exception as e:
        logger.error(f"Error en get_shopping_list: {str(e)}")
        return jsonify({
            'success': False,
            'message': 'Error interno del servidor'
        }), 500


@menu_bp.route('/<int:menu_id>/shopping-list/pdf', methods=['GET'])
def get_shopping_list_pdf(menu_id):
    """Exporta la lista de compra a PDF (placeholder)"""
    try:
        # Esta función requeriría una librería como ReportLab
        return jsonify({
            'success': False,
            'message': 'Exportación PDF no implementada aún'
        }), 501
        
    except Exception as e:
        logger.error(f"Error en get_shopping_list_pdf: {str(e)}")
        return jsonify({
            'success': False,
            'message': 'Error interno del servidor'
        }), 500


@menu_bp.route('/<int:menu_id>/shopping-list/item', methods=['POST'])
def add_shopping_item(menu_id):
    """Añade un item manual a la lista de compra (placeholder)"""
    try:
        return jsonify({
            'success': False,
            'message': 'Función no implementada aún'
        }), 501
        
    except Exception as e:
        logger.error(f"Error en add_shopping_item: {str(e)}")
        return jsonify({
            'success': False,
            'message': 'Error interno del servidor'
        }), 500


@menu_bp.route('/<int:menu_id>/shopping-list/item/<int:item_id>', methods=['PUT'])
def update_shopping_item(menu_id, item_id):
    """Actualiza un item de la lista de compra (placeholder)"""
    try:
        return jsonify({
            'success': False,
            'message': 'Función no implementada aún'
        }), 501
        
    except Exception as e:
        logger.error(f"Error en update_shopping_item: {str(e)}")
        return jsonify({
            'success': False,
            'message': 'Error interno del servidor'
        }), 500


@menu_bp.route('/<int:menu_id>/statistics', methods=['GET'])
def get_menu_statistics(menu_id):
    """Obtiene estadísticas de un menú"""
    try:
        stats = menu_service.get_menu_statistics(menu_id)
        
        if stats:
            return jsonify({
                'success': True,
                'data': stats
            })
        else:
            return jsonify({
                'success': False,
                'message': 'Menú no encontrado'
            }), 404
            
    except Exception as e:
        logger.error(f"Error en get_menu_statistics: {str(e)}")
        return jsonify({
            'success': False,
            'message': 'Error interno del servidor'
        }), 500


@menu_bp.route('/<int:menu_id>', methods=['GET'])
def get_menu_by_id(menu_id):
    """Obtiene un menú específico por ID"""
    try:
        menu = menu_service.get_menu_by_id(menu_id)
        
        if menu:
            return jsonify({
                'success': True,
                'data': menu
            })
        else:
            return jsonify({
                'success': False,
                'message': 'Menú no encontrado'
            }), 404
            
    except Exception as e:
        logger.error(f"Error en get_menu_by_id: {str(e)}")
        return jsonify({
            'success': False,
            'message': 'Error interno del servidor'
        }), 500


@menu_bp.route('/<int:menu_id>', methods=['DELETE'])
def delete_menu(menu_id):
    """Elimina un menú semanal"""
    try:
        result = menu_service.delete_menu(menu_id)
        
        if result['success']:
            return jsonify(result)
        else:
            return jsonify(result), 400
            
    except Exception as e:
        logger.error(f"Error en delete_menu: {str(e)}")
        return jsonify({
            'success': False,
            'message': 'Error interno del servidor'
        }), 500
