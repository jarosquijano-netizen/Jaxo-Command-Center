"""
Rutas API para gestión de menús
"""

from flask import Blueprint, request, jsonify
from datetime import datetime, date, timedelta
from services.menu_service import menu_service
from extensions import limiter
import logging

logger = logging.getLogger(__name__)

menu_bp = Blueprint('menu', __name__)

# Valid field values for input validation
_VALID_DIAS    = {'lunes', 'martes', 'miercoles', 'jueves', 'viernes', 'sabado', 'domingo'}
_VALID_COMIDAS = {'desayuno', 'comida', 'merienda', 'cena'}
_VALID_TIPOS   = {'adultos', 'ninos'}


@menu_bp.route('/week/<string:week_start_str>', methods=['GET'])
def get_menu_by_week(week_start_str):
    """Obtiene el menú de una semana por fecha en la URL (YYYY-MM-DD)"""
    try:
        try:
            week_start = datetime.strptime(week_start_str, '%Y-%m-%d').date()
        except ValueError:
            return jsonify({
                'success': False,
                'message': 'Formato de fecha inválido. Use YYYY-MM-DD'
            }), 400

        menu = menu_service.get_weekly_menu(week_start)
        if menu:
            return jsonify({'success': True, 'data': menu})
        else:
            return jsonify({'success': False, 'message': 'No hay menú para esta semana'}), 200

    except Exception as e:
        logger.error(f"Error en get_menu_by_week: {str(e)}")
        return jsonify({'success': False, 'message': 'Error interno del servidor'}), 500


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
@(limiter.limit("6 per hour") if limiter else (lambda f: f))
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
            # Semana actual (lunes, hora España)
            from utils.dates import current_week_start
            week_start = current_week_start()
        
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
        logger.error(f"Error en generate_menu: {str(e)}", exc_info=True)
        # Surface the real error (e.g. modelo inválido, API key, rate limit)
        # para poder diagnosticar desde el frontend.
        return jsonify({
            'success': False,
            'message': f'Error generando menú: {str(e)[:300]}'
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
@(limiter.limit("10 per hour") if limiter else (lambda f: f))
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
        
        menu_id    = data.get('menu_id')
        dia        = data.get('dia')
        comida     = data.get('comida')
        tipo_menu  = data.get('tipo_menu')
        rating     = data.get('rating')
        comentario = data.get('comentario', '')
        rated_by   = data.get('rated_by')

        # Required fields
        if not all([menu_id, dia, comida, tipo_menu, rating is not None]):
            return jsonify({'success': False, 'message': 'Se requieren menu_id, dia, comida, tipo_menu y rating'}), 400

        # Type + range validation
        if not isinstance(menu_id, int) or menu_id < 1:
            return jsonify({'success': False, 'message': 'menu_id inválido'}), 400
        if dia not in _VALID_DIAS:
            return jsonify({'success': False, 'message': f'dia debe ser uno de: {", ".join(sorted(_VALID_DIAS))}'}), 400
        if comida not in _VALID_COMIDAS:
            return jsonify({'success': False, 'message': f'comida debe ser uno de: {", ".join(sorted(_VALID_COMIDAS))}'}), 400
        if tipo_menu not in _VALID_TIPOS:
            return jsonify({'success': False, 'message': 'tipo_menu debe ser "adultos" o "ninos"'}), 400
        if not isinstance(rating, int) or not (1 <= rating <= 5):
            return jsonify({'success': False, 'message': 'rating debe ser un entero entre 1 y 5'}), 400
        if comentario and len(str(comentario)) > 500:
            return jsonify({'success': False, 'message': 'comentario no puede superar 500 caracteres'}), 400
        
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


@menu_bp.route('/generate-day', methods=['POST'])
@(limiter.limit("10 per hour") if limiter else (lambda f: f))
def generate_day():
    """
    Genera el menú de un día específico con preferencias opcionales.
    Body:
    {
        "menu_id": 1,           // opcional — si existe, actualiza; si no, crea/actualiza el de la semana actual
        "dia": "lunes",
        "comidas": ["comida","cena"],  // opcional — si omitido, genera todo el día
        "tipo": "ambos",        // adultos | ninos | ambos
        "cocina": "mediterránea",     // opcional
        "tiempo_max": 30,            // opcional, minutos
        "dificultad": "fácil",       // opcional
        "notas": "sin gluten"        // opcional
    }
    """
    try:
        data = request.get_json()
        if not data:
            return jsonify({'success': False, 'message': 'Se requieren datos en el body'}), 400

        dia = data.get('dia')
        if not dia:
            return jsonify({'success': False, 'message': 'Se requiere el campo dia'}), 400

        dias_validos = ['lunes', 'martes', 'miercoles', 'jueves', 'viernes', 'sabado', 'domingo']
        if dia not in dias_validos:
            return jsonify({'success': False, 'message': f'Día inválido. Use: {", ".join(dias_validos)}'}), 400

        menu_id = data.get('menu_id')
        comidas = data.get('comidas')  # list or None
        tipo = data.get('tipo', 'ambos')
        preferences = {
            'cocina': data.get('cocina', ''),
            'tiempo_max': data.get('tiempo_max'),
            'dificultad': data.get('dificultad', ''),
            'notas': data.get('notas', ''),
            'fridge_items': data.get('fridge_items', []),
            'fridge_mode': data.get('fridge_mode', 'base'),
        }

        tipos_validos = ['adultos', 'ninos', 'ambos']
        if tipo not in tipos_validos:
            return jsonify({'success': False, 'message': f'Tipo inválido. Use: {", ".join(tipos_validos)}'}), 400

        result = menu_service.generate_day_menu(menu_id, dia, comidas, tipo, preferences)

        if result['success']:
            return jsonify(result)
        else:
            return jsonify(result), 400

    except Exception as e:
        logger.error(f"Error en generate_day: {str(e)}")
        return jsonify({'success': False, 'message': 'Error interno del servidor'}), 500


@menu_bp.route('/shopping-list', methods=['GET'])
def get_shopping_list_by_week():
    """
    Genera lista de compra desde menu_data JSON.
    Query params:
      week=current|next|both  (default: current)
      format=json|txt         (default: json)
    """
    from utils.dates import current_week_start as _current_monday, next_week_start as _next_monday

    week_param = request.args.get('week', 'current')
    fmt = request.args.get('format', 'json')

    weeks = []
    if week_param in ('current', 'both'):
        weeks.append(('current', _current_monday()))
    if week_param in ('next', 'both'):
        weeks.append(('next', _next_monday()))

    menus = {}
    for label, monday in weeks:
        m = menu_service.get_weekly_menu(monday)
        if m:
            menus[label] = m

    if not menus:
        return jsonify({'success': False, 'message': 'No hay menú para las semanas solicitadas'}), 200

    import json as _json

    # Read budget from settings
    try:
        from models.settings import Settings
        settings_obj = Settings.query.first()
        presupuesto = settings_obj.presupuesto_semanal if settings_obj else 0
    except Exception:
        presupuesto = 0

    # Try to use lista_compra from AI response (has prices)
    cat_order = ['Verduras & Frutas', 'Proteínas', 'Lácteos', 'Despensa', 'Otros']
    ordered = {}
    coste_estimado = None

    for menu_dict in menus.values():
        raw = menu_dict.get('menu_data') or {}
        if isinstance(raw, str):
            raw = _json.loads(raw)
        lc = raw.get('lista_compra') or {}
        if isinstance(lc, dict) and lc.get('items'):
            if 'coste_estimado_semana' in lc:
                coste_estimado = (coste_estimado or 0) + float(lc['coste_estimado_semana'])
            for item in lc['items']:
                if not isinstance(item, dict) or not item.get('nombre'):
                    continue
                cat = item.get('categoria', 'Otros')
                if cat not in cat_order:
                    cat = 'Otros'
                entry = {'nombre': item['nombre']}
                if 'precio_estimado' in item:
                    entry['precio'] = round(float(item['precio_estimado']), 2)
                # Deduplicate by name
                existing = ordered.get(cat, [])
                if not any(e.get('nombre', '').lower() == entry['nombre'].lower() for e in existing):
                    ordered.setdefault(cat, []).append(entry)

    if not ordered:
        # Fallback: extract ingredients from meal data (no prices)
        CATEGORIAS = {
            'Verduras & Frutas': ['calabacín','tomate','lechuga','espinaca','pimiento','cebolla','ajo',
                                   'zanahoria','brócoli','pepino','aguacate','limón','naranja','manzana',
                                   'plátano','fresa','uva','patata','boniato','champiñón','apio',
                                   'rúcula','albahaca','perejil','cilantro','jengibre','puerro','alcachofa'],
            'Proteínas':          ['pollo','pechuga','muslo','carne','ternera','cerdo','salmón','atún',
                                   'bacalao','merluza','gambas','langostino','huevo','huevos','tofu',
                                   'lenteja','garbanzo','alubia','judía','filete','bistec','sardina'],
            'Lácteos':            ['leche','queso','yogur','mantequilla','nata','mozzarella','feta',
                                   'parmesano','ricotta','crema','kéfir','requesón'],
            'Despensa':           ['pasta','arroz','aceite','harina','azúcar','sal','pimienta','especias',
                                   'vinagre','salsa','tomate frito','caldo','pan','galleta','avena',
                                   'almendra','nuez','semilla','lentejas','garbanzos','alubias','maíz'],
        }

        def _categorize(ingredient):
            low = ingredient.lower()
            for cat, keywords in CATEGORIAS.items():
                if any(k in low for k in keywords):
                    return cat
            return 'Otros'

        seen = {}
        for menu_dict in menus.values():
            raw = menu_dict.get('menu_data') or {}
            if isinstance(raw, str):
                raw = _json.loads(raw)
            for tipo in ('menu_adultos', 'menu_ninos'):
                for day_data in (raw.get(tipo) or {}).values():
                    if not isinstance(day_data, dict):
                        continue
                    for meal_data in day_data.values():
                        if not isinstance(meal_data, dict):
                            continue
                        for ing in meal_data.get('ingredientes') or []:
                            if ing and isinstance(ing, str):
                                key = ing.strip().lower()
                                if key not in seen:
                                    seen[key] = ing.strip()

        for key, ing in seen.items():
            cat = _categorize(ing)
            ordered.setdefault(cat, []).append({'nombre': ing})

    # Sort each category and enforce order
    ordered = {c: sorted(ordered[c], key=lambda x: x['nombre']) for c in cat_order if c in ordered}

    # Compute category subtotals
    subtotals = {}
    for cat, items in ordered.items():
        prices = [i['precio'] for i in items if 'precio' in i]
        if prices:
            subtotals[cat] = round(sum(prices), 2)

    # Build week label
    week_labels = []
    if 'current' in menus:
        mon = _current_monday()
        sun = mon + timedelta(days=6)
        week_labels.append(f"{mon.day}–{sun.day} {_mes(mon.month)}")
    if 'next' in menus:
        mon = _next_monday()
        sun = mon + timedelta(days=6)
        week_labels.append(f"{mon.day}–{sun.day} {_mes(mon.month)}")

    title = 'LISTA DE COMPRA COMBINADA' if week_param == 'both' else 'LISTA DE COMPRA'
    subtitle = ' + '.join(week_labels)

    result = {
        'success': True,
        'data': {
            'title': title,
            'subtitle': subtitle,
            'weeks_included': list(menus.keys()),
            'categories': ordered,
            'subtotals': subtotals,
            'coste_estimado': round(coste_estimado, 2) if coste_estimado else None,
            'presupuesto': presupuesto,
            'total_items': sum(len(v) for v in ordered.values()),
        }
    }

    if fmt == 'txt':
        lines = [title, f'Semana: {subtitle}', '─' * 40, '']
        for cat, items in ordered.items():
            sub = subtotals.get(cat)
            cat_header = f"{cat.upper()}"
            if sub:
                cat_header += f"  ({sub:.2f}€)"
            lines.append(cat_header)
            for item in items:
                precio_str = f"  {item['precio']:.2f}€" if 'precio' in item else ''
                lines.append(f'  □ {item["nombre"]}{precio_str}')
            lines.append('')
        lines.append('─' * 40)
        if coste_estimado:
            lines.append(f'COSTE ESTIMADO: {coste_estimado:.2f}€')
        if presupuesto:
            lines.append(f'PRESUPUESTO:    {presupuesto}€')
            if coste_estimado:
                diff = presupuesto - coste_estimado
                if diff >= 0:
                    lines.append(f'AHORRO:         {diff:.2f}€')
                else:
                    lines.append(f'EXCESO:         {abs(diff):.2f}€')
        lines.append('─' * 40)
        lines.append('Generado por JAXO Command Center')
        txt = '\n'.join(lines)
        from flask import Response
        return Response(txt, mimetype='text/plain',
                        headers={'Content-Disposition': f'attachment; filename="lista-compra.txt"'})

    return jsonify(result)


def _mes(n):
    return ['ene','feb','mar','abr','may','jun','jul','ago','sep','oct','nov','dic'][n-1]


_autogen_lock = __import__('threading').Lock()


def _run_autogen(force=False):
    """Ejecuta la auto-generación en background dentro del contexto de la app."""
    from app import app
    with app.app_context():
        with _autogen_lock:
            try:
                return menu_service.auto_generate_next_week_if_needed(force=force)
            except Exception as e:
                logger.error(f"[autogen] fallo: {e}")
                return {'generated': False, 'reason': str(e)}


@menu_bp.route('/auto-check', methods=['POST', 'GET'])
def auto_check_menu():
    """
    Red de seguridad: si es domingo y no hay menú para la próxima semana,
    lo genera automáticamente (en background). El frontend lo llama al cargar.
    Devuelve inmediatamente; la generación ocurre en un hilo aparte.
    """
    import threading
    force = request.args.get('force') == '1'
    t = threading.Thread(target=_run_autogen, kwargs={'force': force}, daemon=True)
    t.start()
    return jsonify({'success': True, 'message': 'Auto-check iniciado'})


@menu_bp.route('/next-week', methods=['GET'])
def get_next_week_menu():
    """Returns menu for next Monday's week, or 404 if not yet generated."""
    from utils.dates import next_week_start
    next_monday = next_week_start()
    menu = menu_service.get_weekly_menu(next_monday)
    if menu:
        return jsonify({'success': True, 'data': menu, 'week_start': next_monday.isoformat()})
    return jsonify({'success': False, 'message': 'No hay menú para la próxima semana',
                    'week_start': next_monday.isoformat()}), 200


@menu_bp.route('/tv-debug', methods=['GET'])
def tv_debug():
    """Diagnostic: shows what menu data available for TV display."""
    from utils.dates import today_key as _today_key
    today_key = _today_key()
    weekly = menu_service.get_weekly_menu()
    latest = menu_service.get_latest_menu()
    result = {
        'today_key': today_key,
        'weekly_menu_found': weekly is not None,
        'latest_menu_found': latest is not None,
    }
    if latest:
        md = latest.get('menu_data') or {}
        result['menu_data_top_keys'] = list(md.keys())
        adultos = md.get('menu_adultos', {})
        result['adultos_days'] = list(adultos.keys())
        result['adultos_today'] = adultos.get(today_key)
        ninos = md.get('menu_ninos', {})
        result['ninos_today'] = ninos.get(today_key)
    return jsonify(result)
