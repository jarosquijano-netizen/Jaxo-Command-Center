"""
Servicio de gestión de menús
"""

import json
import logging
from datetime import datetime, date, timedelta
from typing import Dict, List, Optional, Tuple
from extensions import db
from models.menu import WeeklyMenu, MenuRating, SavedRecipe
from models.family import FamilyMember
from services.ai_service import ai_service

logger = logging.getLogger(__name__)


class MenuService:
    """Servicio para gestionar menús semanales"""
    
    def __init__(self):
        self.ai_service = ai_service
    
    def generate_weekly_menu(self, week_start: date, family_settings: Dict = None) -> Dict:
        """
        Genera un nuevo menú semanal usando IA
        
        Args:
            week_start: Fecha de inicio de la semana
            family_settings: Configuración personalizada para esta generación
        
        Returns:
            Dict con el menú generado y metadatos
        """
        try:
            # Verificar si ya existe menú para esta semana
            existing_menu = WeeklyMenu.query.filter_by(semana_inicio=week_start).first()
            if existing_menu and not family_settings.get('regenerate', False):
                return {
                    'success': False,
                    'message': 'Ya existe un menú para esta semana',
                    'menu': existing_menu.to_dict()
                }
            
            # Obtener miembros de la familia
            family_members = self._get_family_members()
            if not family_members:
                return {
                    'success': False,
                    'message': 'No hay miembros de la familia configurados'
                }
            
            # Obtener configuración
            settings = self._get_menu_settings(family_settings)
            house_config = self._get_house_config(family_members)
            
            # Obtener ratings históricos para aprendizaje
            historical_ratings = self._get_historical_ratings()
            
            # Generar menú con IA
            logger.info(f"Generando menú para la semana {week_start}")
            menu_data = self.ai_service.generate_weekly_menu(
                family_members, settings, house_config, historical_ratings
            )
            
            # Guardar en base de datos
            if existing_menu:
                # Actualizar menú existente
                existing_menu.menu_data = json.dumps(menu_data, ensure_ascii=False)
                existing_menu.lista_compra = json.dumps(menu_data.get('lista_compra', {}), ensure_ascii=False)
                existing_menu.generado_con = 'claude'
                existing_menu.prompt_usado = self.ai_service._build_menu_prompt(
                    family_members, settings, house_config, historical_ratings
                )
                existing_menu.menu_metadata = json.dumps({
                    'family_members_count': len(family_members),
                    'settings': settings,
                    'generation_time': datetime.utcnow().isoformat()
                }, ensure_ascii=False)
                existing_menu.updated_at = datetime.utcnow()
                
                db.session.commit()
                menu = existing_menu
            else:
                # Crear nuevo menú
                menu = WeeklyMenu(
                    semana_inicio=week_start,
                    menu_data=json.dumps(menu_data, ensure_ascii=False),
                    lista_compra=json.dumps(menu_data.get('lista_compra', {}), ensure_ascii=False),
                    generado_con='claude',
                    prompt_usado=self.ai_service._build_menu_prompt(
                        family_members, settings, house_config, historical_ratings
                    ),
                    menu_metadata=json.dumps({
                        'family_members_count': len(family_members),
                        'settings': settings,
                        'generation_time': datetime.utcnow().isoformat()
                    }, ensure_ascii=False)
                )
                
                db.session.add(menu)
                db.session.commit()
            
            logger.info(f"Menú generado exitosamente para la semana {week_start}")
            
            return {
                'success': True,
                'message': 'Menú generado exitosamente',
                'menu': menu.to_dict()
            }
            
        except Exception as e:
            logger.error(f"Error generando menú semanal: {str(e)}")
            db.session.rollback()
            return {
                'success': False,
                'message': f'Error generando menú: {str(e)}'
            }
    
    def get_weekly_menu(self, week_start: date = None) -> Optional[Dict]:
        """
        Obtiene el menú de una semana específica
        
        Args:
            week_start: Fecha de inicio de la semana (None = semana actual)
        
        Returns:
            Dict con el menú o None si no existe
        """
        try:
            if week_start is None:
                week_start = self._get_current_week_start()
            
            menu = WeeklyMenu.query.filter_by(semana_inicio=week_start).first()
            return menu.to_dict() if menu else None
            
        except Exception as e:
            logger.error(f"Error obteniendo menú semanal: {str(e)}")
            return None
    
    def get_menu_by_id(self, menu_id: int) -> Optional[Dict]:
        """
        Obtiene un menú específico por ID
        
        Args:
            menu_id: ID del menú
        
        Returns:
            Dict con el menú o None si no existe
        """
        try:
            menu = WeeklyMenu.query.get(menu_id)
            if menu:
                return menu.to_dict()
            return None
        except Exception as e:
            logger.error(f"Error obteniendo menú por ID: {str(e)}")
            return None

    def get_latest_menu(self) -> Optional[Dict]:
        """Obtiene el último menú generado"""
        try:
            menu = WeeklyMenu.query.order_by(WeeklyMenu.created_at.desc()).first()
            return menu.to_dict() if menu else None
            
        except Exception as e:
            logger.error(f"Error obteniendo último menú: {str(e)}")
            return None
    
    def regenerate_day_menu(self, menu_id: int, dia: str, comida: str = None, 
                          tipo: str = "adultos") -> Dict:
        """
        Regenera un día específico o comida específica
        
        Args:
            menu_id: ID del menú a modificar
            dia: Día a regenerar
            comida: Comida específica (opcional)
            tipo: Tipo de menú (adultos, ninos, ambos)
        
        Returns:
            Dict con el resultado
        """
        try:
            # Obtener menú existente
            menu = WeeklyMenu.query.get(menu_id)
            if not menu:
                return {
                    'success': False,
                    'message': 'Menú no encontrado'
                }
            
            # Parsear menú actual
            menu_data = json.loads(menu.menu_data)
            
            # Obtener miembros de la familia
            family_members = self._get_family_members()
            
            # Regenerar con IA
            updated_menu_data = self.ai_service.regenerate_day_menu(
                menu_data, dia, comida, tipo, family_members
            )
            
            # Actualizar menú en base de datos
            menu.menu_data = json.dumps(updated_menu_data, ensure_ascii=False)
            menu.updated_at = datetime.utcnow()
            
            db.session.commit()
            
            return {
                'success': True,
                'message': f'{dia.capitalize()} regenerado exitosamente',
                'menu': menu.to_dict()
            }
            
        except Exception as e:
            logger.error(f"Error regenerando día del menú: {str(e)}")
            db.session.rollback()
            return {
                'success': False,
                'message': f'Error regenerando menú: {str(e)}'
            }
    
    def rate_menu_item(self, menu_id: int, dia: str, comida: str, tipo_menu: str,
                       rating: int, comentario: str = None, rated_by: int = None) -> Dict:
        """
        Califica un item específico del menú
        
        Args:
            menu_id: ID del menú
            dia: Día de la semana
            comida: Tipo de comida
            tipo_menu: adultos/ninos
            rating: Calificación 1-5
            comentario: Comentario opcional
            rated_by: ID del miembro que califica
        
        Returns:
            Dict con el resultado
        """
        try:
            # Validar rating
            if not 1 <= rating <= 5:
                return {
                    'success': False,
                    'message': 'El rating debe estar entre 1 y 5'
                }
            
            # Verificar que el menú existe
            menu = WeeklyMenu.query.get(menu_id)
            if not menu:
                return {
                    'success': False,
                    'message': 'Menú no encontrado'
                }
            
            # Crear o actualizar rating
            existing_rating = MenuRating.query.filter_by(
                menu_id=menu_id, dia=dia, comida=comida, tipo_menu=tipo_menu, rated_by=rated_by
            ).first()
            
            if existing_rating:
                existing_rating.rating = rating
                existing_rating.comentario = comentario
                existing_rating.created_at = datetime.utcnow()
            else:
                new_rating = MenuRating(
                    menu_id=menu_id,
                    dia=dia,
                    comida=comida,
                    tipo_menu=tipo_menu,
                    rating=rating,
                    comentario=comentario,
                    rated_by=rated_by
                )
                db.session.add(new_rating)
            
            db.session.commit()
            
            return {
                'success': True,
                'message': 'Rating guardado exitosamente'
            }
            
        except Exception as e:
            logger.error(f"Error guardando rating: {str(e)}")
            db.session.rollback()
            return {
                'success': False,
                'message': f'Error guardando rating: {str(e)}'
            }
    
    def get_menu_ratings(self, menu_id: int) -> List[Dict]:
        """Obtiene todos los ratings de un menú"""
        try:
            ratings = MenuRating.query.filter_by(menu_id=menu_id).all()
            return [rating.to_dict() for rating in ratings]
            
        except Exception as e:
            logger.error(f"Error obteniendo ratings: {str(e)}")
            return []
    
    def get_shopping_list(self, menu_id: int) -> Optional[Dict]:
        """Obtiene la lista de compra de un menú"""
        try:
            menu = WeeklyMenu.query.get(menu_id)
            if not menu:
                return None
            
            return json.loads(menu.lista_compra) if menu.lista_compra else None
            
        except Exception as e:
            logger.error(f"Error obteniendo lista de compra: {str(e)}")
            return None
    
    def delete_menu(self, menu_id: int) -> Dict:
        """Elimina un menú semanal"""
        try:
            menu = WeeklyMenu.query.get(menu_id)
            if not menu:
                return {
                    'success': False,
                    'message': 'Menú no encontrado'
                }
            
            db.session.delete(menu)
            db.session.commit()
            
            return {
                'success': True,
                'message': 'Menú eliminado exitosamente'
            }
            
        except Exception as e:
            logger.error(f"Error eliminando menú: {str(e)}")
            db.session.rollback()
            return {
                'success': False,
                'message': f'Error eliminando menú: {str(e)}'
            }
    
    def _get_family_members(self) -> List[Dict]:
        """Obtiene todos los miembros activos de la familia"""
        try:
            members = FamilyMember.query.filter_by(activo=True).all()
            return [member.to_dict() for member in members]
            
        except Exception as e:
            logger.error(f"Error obteniendo miembros de la familia: {str(e)}")
            return []
    
    def _get_menu_settings(self, custom_settings: Dict = None) -> Dict:
        """Obtiene la configuración del menú"""
        default_settings = {
            'dias_menu': ['lunes', 'martes', 'miercoles', 'jueves', 'viernes', 'sabado', 'domingo'],
            'comidas_por_dia': ['desayuno', 'comida', 'merienda', 'cena'],
            'presupuesto_semanal': 100,
            'supermercado_preferido': 'Mercadona'
        }
        
        if custom_settings:
            default_settings.update(custom_settings)
        
        return default_settings
    
    def _get_house_config(self, family_members: List[Dict]) -> Dict:
        """Obtiene configuración de la casa basada en miembros"""
        empleados = [m for m in family_members if m.get('rol_hogar') == 'empleado_hogar']
        
        return {
            'tiene_empleado_hogar': len(empleados) > 0,
            'empleados': empleados,
            'total_adultos': len([m for m in family_members if m['tipo'] == 'adulto']),
            'total_ninos': len([m for m in family_members if m['tipo'] == 'niño'])
        }
    
    def _get_historical_ratings(self, limit: int = 20) -> List[Dict]:
        """Obtiene ratings históricos para aprendizaje"""
        try:
            ratings = MenuRating.query.order_by(MenuRating.created_at.desc()).limit(limit).all()
            return [rating.to_dict() for rating in ratings]
            
        except Exception as e:
            logger.error(f"Error obteniendo ratings históricos: {str(e)}")
            return []
    
    def _get_current_week_start(self) -> date:
        """Obtiene la fecha de inicio de la semana actual (lunes)"""
        today = date.today()
        days_since_monday = today.weekday()
        return today - timedelta(days=days_since_monday)
    
    def get_menu_statistics(self, menu_id: int) -> Dict:
        """Obtiene estadísticas de un menú"""
        try:
            menu = WeeklyMenu.query.get(menu_id)
            if not menu:
                return {}
            
            menu_data = json.loads(menu.menu_data)
            ratings = self.get_menu_ratings(menu_id)
            
            # Calcular tiempo total de preparación
            total_time = 0
            meal_count = 0
            
            for menu_type in ['menu_adultos', 'menu_ninos']:
                if menu_type in menu_data:
                    for dia, comidas in menu_data[menu_type].items():
                        for comida, details in comidas.items():
                            if isinstance(details, dict) and 'tiempo_prep' in details:
                                total_time += details['tiempo_prep']
                                meal_count += 1
            
            # Calcular rating promedio
            avg_rating = 0
            if ratings:
                avg_rating = sum(r['rating'] for r in ratings) / len(ratings)
            
            # Obtener lista de compra total
            shopping_list = json.loads(menu.lista_compra) if menu.lista_compra else {}
            total_estimated = shopping_list.get('total_estimado', 0)
            
            return {
                'total_prep_time': total_time,
                'meal_count': meal_count,
                'avg_prep_time': total_time / meal_count if meal_count > 0 else 0,
                'avg_rating': round(avg_rating, 1),
                'ratings_count': len(ratings),
                'total_estimated_cost': total_estimated,
                'generated_with': menu.generado_con,
                'created_at': menu.created_at.isoformat() if menu.created_at else None
            }
            
        except Exception as e:
            logger.error(f"Error calculando estadísticas: {str(e)}")
            return {}


# Instancia global del servicio
menu_service = MenuService()
