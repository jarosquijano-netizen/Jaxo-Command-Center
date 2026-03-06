"""
Servicio de IA para generación de menús usando Claude API
"""

import anthropic
import json
import logging
from typing import Dict, List, Optional
from config import Config

logger = logging.getLogger(__name__)


class AIService:
    """Servicio para interactuar con Claude API"""
    
    def __init__(self):
        """Inicializar el servicio de IA"""
        self.client = anthropic.Anthropic(api_key=Config.ANTHROPIC_API_KEY)
        self.model = "claude-sonnet-4-20250514"
    
    def generate_weekly_menu(self, family_members: List[Dict], settings: Dict, 
                             house_config: Dict, historical_ratings: Optional[List[Dict]] = None) -> Dict:
        """
        Genera un menú semanal completo usando Claude AI
        
        Args:
            family_members: Lista de miembros de la familia
            settings: Configuración del menú
            house_config: Configuración de la casa
            historical_ratings: Ratings históricos (opcional)
        
        Returns:
            Dict con el menú generado
        """
        try:
            prompt = self._build_menu_prompt(family_members, settings, house_config, historical_ratings)
            
            logger.info("Enviando prompt a Claude...")
            logger.info(f"Prompt length: {len(prompt)} caracteres")
            
            response = self.client.messages.create(
                model=self.model,
                max_tokens=6000,  # Aumentado para menú expandido
                temperature=0.7,
                messages=[
                    {
                        "role": "user", 
                        "content": prompt
                    }
                ]
            )
            
            content = response.content[0].text
            logger.info(f"Respuesta recibida de Claude (primeros 500 chars): {content[:500]}")
            
            menu_data = self._extract_json_from_response(content)
            
            if not menu_data:
                raise ValueError("No se pudo extraer JSON válido de la respuesta de Claude")
            
            self._validate_menu_structure(menu_data)
            
            logger.info(f"Menú generado exitosamente con claves: {list(menu_data.keys())}")
            return menu_data
            
        except Exception as e:
            logger.error(f"Error generando menú con Claude: {str(e)}")
            raise
    
    def regenerate_day_menu(self, menu_data: Dict, dia: str, comida: Optional[str] = None, 
                          tipo: str = "adultos", family_members: List[Dict] = None) -> Dict:
        """
        Regenera un día específico o una comida específica del menú
        
        Args:
            menu_data: Menú actual completo
            dia: Día a regenerar (lunes, martes, etc.)
            comida: Comida específica (desayuno, comida, merienda, cena) o None para todo el día
            tipo: Tipo de menú (adultos, ninos, ambos)
            family_members: Miembros de la familia para contexto
        
        Returns:
            Dict con el menú actualizado
        """
        try:
            prompt = self._build_regeneration_prompt(menu_data, dia, comida, tipo, family_members)
            
            response = self.client.messages.create(
                model=self.model,
                max_tokens=2000,
                temperature=0.7,
                messages=[
                    {
                        "role": "user", 
                        "content": prompt
                    }
                ]
            )
            
            content = response.content[0].text
            updated_data = self._extract_json_from_response(content)
            
            # Integrar los cambios en el menú existente
            return self._merge_menu_changes(menu_data, updated_data, dia, comida, tipo)
            
        except Exception as e:
            logger.error(f"Error regenerando menú del día {dia}: {str(e)}")
            raise
    
    def _build_menu_prompt(self, family_members: List[Dict], settings: Dict, 
                         house_config: Dict, historical_ratings: Optional[List[Dict]] = None) -> str:
        """
        Construye el prompt para Claude basado en los perfiles familiares y filtros
        """
        
        # Obtener filtros específicos
        dias_menu = settings.get('dias_menu', ['lunes','martes','miercoles','jueves','viernes','sabado','domingo'])
        comidas = settings.get('comidas_por_dia', ['cena'])  # Por defecto solo cena
        presupuesto = settings.get('presupuesto_semanal', 200)
        supermercado = settings.get('supermercado_preferido', 'Mercadona')
        preferencias_especiales = settings.get('preferencias_especiales', '')
        incluir_lista_compra = settings.get('incluir_lista_compra', True)
        considerar_calificaciones = settings.get('considerar_calificaciones_anteriores', False)
        
        # Separar adultos y niños
        adultos = [m for m in family_members if m['tipo'] == 'adulto']
        ninos = [m for m in family_members if m['tipo'] == 'nino']
        
        # Construir preferencias simplificadas
        preferencias_adultos = []
        for a in adultos:
            if a.get('rol_hogar') == 'familia':
                pref = f"- {a['nombre']} ({a['edad']} años): {a.get('estilo_alimentacion', 'Mediterráneo')}, Alergias: {', '.join(a.get('alergias', [])) or 'Ninguna'}"
                preferencias_adultos.append(pref)
        
        preferencias_ninos = []
        for n in ninos:
            pref = f"- {n['nombre']} ({n['edad']} años): {n.get('come_solo', 'Con ayuda')}, Alergias: {', '.join(n.get('alergias', [])) or 'Ninguna'}"
            preferencias_ninos.append(pref)
        
        # Ratings históricos
        ratings_context = ""
        if historical_ratings and considerar_calificaciones:
            ratings_list = []
            for r in historical_ratings[-5:]:
                rating_str = f"{r['rating']}/5 - {r.get('comentario', '')}"
                ratings_list.append(rating_str)
            ratings_context = f"\nRATINGS ANTERIORES: {ratings_list}\n"
        
        # Preferencias especiales (limpiar caracteres problemáticos)
        preferencias_usuario = ""
        if preferencias_especiales:
            # Limpiar caracteres que puedan causar problemas de encoding
            preferencias_limpias = preferencias_especiales.encode('ascii', 'ignore').decode('ascii')
            preferencias_usuario = f"\nPREFERENCIAS ESPECIALES: {preferencias_limpias}\n"
        
        prompt = f"""
Eres nutricionista experto. Genera menú para familia en Barcelona.

## FILTROS:
- Días: {', '.join(dias_menu)}
- Comidas: {', '.join(comidas)}  
- Presupuesto: {presupuesto}€
- Supermercado: {supermercado}
{preferencias_usuario}

## FAMILIA:
ADULTOS: {chr(10).join(preferencias_adultos) if preferencias_adultos else 'No adultos'}
NIÑOS: {chr(10).join(preferencias_ninos) if preferencias_ninos else 'No niños'}
{ratings_context}

## RESTRICCIONES (CRÍTICO - NUNCA INCLUIR):
{self._get_all_allergies(family_members)}

## INSTRUCCIONES:
1. SOLO generar comidas: {', '.join(comidas)}
2. SOLO para días: {', '.join(dias_menu)}
3. Dos menús: adultos y niños adaptados
4. Información nutricional completa
5. Responder SOLO con JSON

IMPORTANTE: Cada comida (desayuno, comida, merienda, cena) debe incluir SIEMPRE estos campos:
- plato, descripcion, tiempo_prep, calorias, dificultad
- ingredientes (array), preparacion (array)
- nutrientes (objeto con proteinas_g, carbohidratos_g, grasas_g, fibra_g)
- vitaminas_minerales (array), alergenos (array), cocinado_por

## FORMATO JSON:
{{
  "menu_adultos": {{
    "{dias_menu[0] if dias_menu else 'lunes'}": {{
      "{comidas[0] if comidas else 'cena'}": {{
        "plato": "Nombre del plato",
        "descripcion": "Descripción breve",
        "tiempo_prep": 30,
        "calorias": 350,
        "dificultad": "Media",
        "ingredientes": ["ingrediente 1", "ingrediente 2"],
        "preparacion": ["Paso 1", "Paso 2"],
        "nutrientes": {{"proteinas_g": 25, "carbohidratos_g": 30, "grasas_g": 15, "fibra_g": 5}},
        "vitaminas_minerales": ["Vitamina C", "Hierro"],
        "alergenos": [],
        "cocinado_por": "Familia"
      }}
    }}
    // Resto días con misma estructura
  }},
  
  "menu_ninos": {{
    "{dias_menu[0] if dias_menu else 'lunes'}": {{
      "{comidas[0] if comidas else 'cena'}": {{
        "plato": "Versión niños",
        "descripcion": "Descripción adaptada",
        "tiempo_prep": 25,
        "calorias": 200,
        "dificultad": "Fácil",
        "ingredientes": ["ingrediente 1", "ingrediente 2"],
        "preparacion": ["Paso 1", "Paso 2"],
        "nutrientes": {{"proteinas_g": 15, "carbohidratos_g": 20, "grasas_g": 8, "fibra_g": 3}},
        "vitaminas_minerales": ["Calcio", "Vitamina A"],
        "alergenos": [],
        "cocinado_por": "Familia"
      }}
    }}
    // Resto días con misma estructura
  }},
  
  "lista_compra": {{"categorias": "detalles"}},
  "consejos_semana": ["Consejo 1", "Consejo 2"],
  "consideraciones_aplicadas": [
    "Solo comidas: {', '.join(comidas)}",
    "Presupuesto: {presupuesto}€",
    "Días: {', '.join(dias_menu)}"
  ]
}}
"""
        
        return prompt
        """
        Construye el prompt para Claude basado en los perfiles familiares
        """
        
        # Separar adultos y niños
        adultos = [m for m in family_members if m['tipo'] == 'adulto']
        ninos = [m for m in family_members if m['tipo'] == 'nino']
        
        # Construir sección de preferencias para adultos
        preferencias_adultos = []
        for a in adultos:
            # Solo incluir familiares, no empleados del hogar
            if a.get('rol_hogar') == 'familia':
                pref = f"""
        - {a['nombre']} ({a['edad']} años):
          * Objetivo: {a.get('objetivo_alimentario', 'Salud general')}
          * Estilo: {a.get('estilo_alimentacion', 'Mediterráneo')}
          * Cocinas favoritas: {', '.join(a.get('cocinas_favoritas', ['Española', 'Mediterránea']))}
          * Nivel picante: {a.get('nivel_picante', 'Medio')}
          * Ingredientes favoritos: {', '.join(a.get('ingredientes_favoritos', []))}
          * No le gustan: {', '.join(a.get('ingredientes_no_gustan', []))}
          * ALERGIAS: {', '.join(a.get('alergias', [])) or 'Ninguna'}
          * Intolerancias: {', '.join(a.get('intolerancias', [])) or 'Ninguna'}
          * Restricciones: {a.get('restricciones_religiosas', 'Ninguna')}
          * Tiempo máx cocinar: {a.get('tiempo_max_cocinar', 60)} minutos
          * Nivel cocina: {a.get('nivel_cocina', 'Intermedio')}
        """
                preferencias_adultos.append(pref)
        
        # Construir sección de preferencias para niños
        preferencias_ninos = []
        for n in ninos:
            pref = f"""
        - {n['nombre']} ({n['edad']} años):
          * Come solo: {n.get('come_solo', 'Con ayuda')}
          * Nivel exigencia: {n.get('nivel_exigencia', 'Medio')}
          * Acepta comida nueva: {n.get('acepta_comida_nueva', 'A veces')}
          * Ingredientes favoritos: {', '.join(n.get('ingredientes_favoritos', []))}
          * RECHAZA: {', '.join(n.get('ingredientes_no_gustan', []))}
          * Texturas que no le gustan: {', '.join(n.get('texturas_no_gustan', []))}
          * ALERGIAS: {', '.join(n.get('alergias', [])) or 'Ninguna'}
          * Intolerancias: {', '.join(n.get('intolerancias', [])) or 'Ninguna'}
          * Verduras aceptadas: {', '.join(n.get('verduras_aceptadas', []))}
          * Verduras rechazadas: {', '.join(n.get('verduras_rechazadas', []))}
          * Plato favorito: {n.get('plato_favorito', 'No especificado')}
          * Nunca comería: {n.get('plato_nunca_comeria', 'Nada específico')}
        """
            
            # Adaptaciones especiales para Oliva (4 años)
            if n['edad'] <= 4:
                pref += f"""
          * ADAPTACIONES ESPECIALES (4 años):
            - Texturas: Suaves, sin trozos grandes
            - Tamaño: Cortar todo pequeño, sin huesos ni espinas
            - Porciones: 1/3 de adulto
            - Presentación: Formas divertidas, colores atractivos
            - Alternativa siempre: Plan B si rechaza el plato
            - Evitar: Comidas picantes, texturas complejas
            - Trucos: Esconder verduras, hacer caritas con la comida
        """
            
            preferencias_ninos.append(pref)
        
        # Configuración del menú
        dias_menu = settings.get('dias_menu', ['lunes','martes','miercoles','jueves','viernes','sabado','domingo'])
        comidas = settings.get('comidas_por_dia', ['desayuno','comida','merienda','cena'])
        presupuesto = settings.get('presupuesto_semanal', 100)
        supermercado = settings.get('supermercado_preferido', 'Mercadona')
        
        # Información de empleados del hogar
        empleados_info = ""
        empleados = [m for m in family_members if m.get('rol_hogar') == 'empleado_hogar']
        if empleados:
            for emp in empleados:
                empleados_info += f"""
- {emp['nombre']} (empleada hogar):
  * Días trabajo: {', '.join(emp.get('dias_trabajo', []))}
  * Horario: {emp.get('horario_entrada', '')} - {emp.get('horario_salida', '')}
  * Responsabilidades: {', '.join(emp.get('responsabilidades_principales', []))}
"""
        
        # Ratings históricos para contexto
        ratings_context = ""
        if historical_ratings:
            ratings_context = "\n## RATINGS ANTERIORES (PARA MEJORAR):\n"
            for rating in historical_ratings[-10:]:  # Últimos 10 ratings
                ratings_context += f"- {rating['dia']} {rating['comida']} ({rating['tipo_menu']}): {rating['rating']}/5 - {rating.get('comentario', '')}\n"
        
        prompt = f"""
Eres un nutricionista y chef experto en cocina mediterránea y española, especializado en planificación de menús familiares.

## CONTEXTO
Familia de {len(family_members)} personas viviendo en Barcelona, España. Necesito un menú semanal personalizado.

## MIEMBROS DE LA FAMILIA

### ADULTOS:
{chr(10).join(preferencias_adultos) if preferencias_adultos else 'No hay adultos familiares configurados'}

### NIÑOS:
{chr(10).join(preferencias_ninos) if preferencias_ninos else 'No hay niños configurados'}

### EMPLEADOS DEL HOGAR:
{empleados_info if empleados_info else 'No hay empleados del hogar configurados'}

## CONFIGURACIÓN
- Días a planificar: {', '.join(dias_menu)}
- Comidas por día: {', '.join(comidas)}
- Presupuesto semanal: {presupuesto}€
- Supermercado preferido: {supermercado}
- Ubicación: Barcelona, España

## HORARIOS COMIDAS (España):
- Desayuno: 7:00-9:00
- Comida (principal): 13:30-15:00
- Merienda: 17:00-18:00  
- Cena: 20:30-21:30

## LÓGICA DE QUIÉN COCINA:
- Desayunos: Familia prepara (simples, 5-10 min)
- Comidas: Familia prepara o batch cooking (simples a medias)
- Meriendas: Sin cocinar (fruta, bocadillo, yogur)
- CENAS L-V: Marycel prepara (18:00-21:00, pueden ser elaboradas)
- CENAS Fin de semana: Familia prepara (simples)

## CONSIDERACIONES ESPECIALES:
1. Los días que trabaja personal de hogar (L-V 18-21h), las cenas pueden ser más elaboradas
2. Fines de semana cocina la familia, platos más simples
3. Priorizar productos de temporada y mercado local de Barcelona
4. Incluir platos típicos catalanes/españoles
5. Para niños pequeños: porciones pequeñas, sin huesos, texturas suaves
6. Adolescentes pueden comer porciones de adulto

{ratings_context}

## INSTRUCCIONES:
1. Genera DOS menús: uno para ADULTOS y otro adaptado para NIÑOS
2. El menú de niños debe ser versión adaptada del de adultos cuando sea posible (mismos ingredientes, diferente preparación)
3. Incluye alternativas para platos que los niños podrían rechazar
4. Para niños pequeños: porciones pequeñas, sin huesos, texturas suaves, presentación atractiva
5. Genera lista de compra organizada por secciones del supermercado
6. Incluye estimación de precio por item
7. Añade consejos de preparación y batch cooking
8. Considera el presupuesto objetivo

## ALERGIAS E INTOLERANCIAS (CRÍTICO - NUNCA INCLUIR):
{self._get_all_allergies(family_members)}

## FORMATO DE RESPUESTA EXPANDIDO:

Responde SOLO con un JSON válido. Cada plato debe incluir:

{{
  "menu_adultos": {{
    "lunes": {{
      "desayuno": {{
        "plato": "Tostadas con tomate y aguacate",
        "descripcion": "Pan integral crujiente con tomate rallado y láminas de aguacate",
        "tiempo_prep": 10,
        "calorias": 320,
        "dificultad": "Fácil",
        "ingredientes": ["2 rebanadas pan integral", "1 tomate maduro", "1/2 aguacate", "1 cucharada aceite de oliva", "sal", "pimienta"],
        "preparacion": ["Tostar el pan", "Rallar tomate caliente", "Añadir láminas de aguacate", "Aliñar con aceite y sal"],
        "nutrientes": {{"proteinas_g": 8, "carbohidratos_g": 35, "grasas_g": 18, "fibra_g": 7, "azucar_g": 4, "sodio_mg": 320}},
        "vitaminas_minerales": ["Vitamina E", "Potasio", "Fibra", "Vitamina C"],
        "alergenos": [],
        "notas": "Usar tomates maduros. Aguacate en punto justo.",
        "cocinado_por": "Familia",
        "tipo_cocina": "Mediterránea"
      }},
      "comida": {{
        "primero": {{
          "plato": "Gazpacho andaluz",
          "descripcion": "Sopa fría de tomate con verduras frescas",
          "tiempo_prep": 15,
          "tiempo_total": 120,
          "calorias": 95,
          "dificultad": "Fácil",
          "ingredientes": ["1kg tomates", "1 pepino", "1 pimiento verde", "1/2 cebolla", "2 ajos", "50ml aceite oliva", "30ml vinagre Jerez", "sal"],
          "preparacion": ["Lavar y trocear verduras", "Batir todos los ingredientes", "Añadir aceite en hilo", "Refrigerar 2 horas"],
          "nutrientes": {{"proteinas_g": 2, "carbohidratos_g": 12, "grasas_g": 6, "fibra_g": 2, "azucar_g": 8, "sodio_mg": 180}},
          "vitaminas_minerales": ["Vitamina C", "Licopeno", "Vitamina A", "Potasio"],
          "alergenos": [],
          "notas": "Preparar día anterior para mejor sabor.",
          "cocinado_por": "Familia/Batch cooking",
          "tipo_cocina": "Andaluza"
        }},
        "segundo": {{
          "plato": "Pollo al ajillo con patatas",
          "descripcion": "Muslos de pollo dorados con ajo confitado y patatas al horno",
          "tiempo_prep": 15,
          "tiempo_total": 45,
          "calorias": 420,
          "dificultad": "Media",
          "ingredientes": ["4 muslos pollo", "1 cabeza ajo", "100ml aceite oliva", "1 hoja laurel", "600g patatas", "romero", "perejil", "sal", "pimienta"],
          "preparacion": ["Dorar pollo en sartén", "Añadir ajos y laurel", "Cocinar tapado 25 min", "Hornear patatas 30 min", "Servir juntos"],
          "nutrientes": {{"proteinas_g": 35, "carbohidratos_g": 28, "grasas_g": 22, "fibra_g": 3, "azucar_g": 2, "sodio_mg": 450}},
          "vitaminas_minerales": ["Vitamina B6", "Selenio", "Fósforo", "Potasio"],
          "alergenos": [],
          "notas": "El ajo confitado queda suave. Guardar aceite sobrante.",
          "cocinado_por": "Familia",
          "tipo_cocina": "Española tradicional"
        }},
        "postre": {{
          "plato": "Melocotón con almendras",
          "descripcion": "Fruta fresca con almendras laminadas tostadas",
          "tiempo_prep": 3,
          "calorias": 85,
          "dificultad": "Fácil",
          "ingredientes": ["2 melocotones maduros", "10g almendras laminadas", "1 cucharadita miel", "menta fresca"],
          "preparacion": ["Lavar melocotones", "Cortar en gajos", "Tostar almendras", "Servir con miel y menta"],
          "nutrientes": {{"proteinas_g": 2, "carbohidratos_g": 16, "grasas_g": 3, "fibra_g": 2, "azucar_g": 14, "sodio_mg": 5}},
          "vitaminas_minerales": ["Vitamina C", "Vitamina A", "Potasio", "Vitamina E"],
          "alergenos": ["Frutos secos"],
          "notas": "Elegir melocotones que cedan ligeramente.",
          "cocinado_por": "Sin cocinar",
          "tipo_cocina": "Mediterránea"
        }},
        "tiempo_total": 45,
        "cocinado_por": "Familia"
      }},
      "merienda": {{
        "plato": "Manzana con nueces y canela",
        "descripcion": "Manzana Royal con nueces pecan y canela",
        "tiempo_prep": 2,
        "calorias": 180,
        "dificultad": "Fácil",
        "ingredientes": ["1 manzana Royal", "20g nueces pecan", "1/4 cucharadita canela", "1 cucharadita miel"],
        "preparacion": ["Lavar manzana", "Cortar en láminas", "Tostar nueces", "Servir con canela y miel"],
        "nutrientes": {{"proteinas_g": 3, "carbohidratos_g": 22, "grasas_g": 10, "fibra_g": 4, "azucar_g": 16, "sodio_mg": 3}},
          "vitaminas_minerales": ["Omega-3", "Vitamina E", "Fibra", "Vitamina C"],
          "alergenos": ["Frutos secos"],
          "notas": "Nueces ricas en grasas saludables.",
          "cocinado_por": "Sin cocinar",
          "tipo_cocina": "Snack saludable"
      }},
      "cena": {{
        "plato": "Crema de calabacín con huevo poché",
        "descripcion": "Crema suave con huevo cremoso y jamón serrano",
        "tiempo_prep": 20,
        "tiempo_total": 40,
        "calorias": 290,
        "dificultad": "Media",
        "ingredientes": ["3 calabacines", "1 patata pequeña", "1 puerro", "750ml caldo verduras", "4 huevos", "50g jamón serrano", "aceite oliva", "sal", "pimienta", "nuez moscada"],
        "preparacion": ["Pochar puerro en aceite", "Añadir calabacín y patata", "Cocinar con caldo 20 min", "Triturar hasta cremoso", "Hacer huevos poché 3 min", "Servir con jamón"],
        "nutrientes": {{"proteinas_g": 15, "carbohidratos_g": 18, "grasas_g": 17, "fibra_g": 4, "azucar_g": 6, "sodio_mg": 680}},
          "vitaminas_minerales": ["Vitamina K", "Vitamina B12", "Hierro", "Potasio"],
          "alergenos": ["Huevo"],
          "notas": "Sin nata por intolerancia lactosa. Ideal batch cooking.",
          "cocinado_por": "Marycel",
          "tipo_cocina": "Española moderna"
        }}
    }}
    // martes a domingo con misma estructura completa...
  }},
  
  "menu_ninos": {{
    "lunes": {{
      "desayuno": {{
        "plato": "Tostadas divertidas con tomate",
        "descripcion": "Tostadas con forma de estrella y aceitunas sonrientes",
        "tiempo_prep": 5,
        "calorias": 180,
        "dificultad": "Fácil",
        "ingredientes": ["1 rebanada pan molde integral", "1/2 tomate", "1 cucharadita aceite oliva", "2 aceitunas negras", "orégano"],
        "preparacion": ["Cortar pan con forma estrella", "Tostar ligeramente", "Rallar tomate caliente", "Hacer carita con aceitunas", "Espolvorear orégano"],
        "nutrientes": {{"proteinas_g": 4, "carbohidratos_g": 22, "grasas_g": 8, "fibra_g": 2, "azucar_g": 2, "sodio_mg": 120}},
          "vitaminas_minerales": ["Vitamina C", "Hierro", "Fibra"],
          "alergenos": [],
          "notas": "Formas divertidas animan a comer. Porción adaptada 4 años.",
          "cocinado_por": "Familia",
          "tipo_cocina": "Infantil"
      }},
      "comida": {{
        "primero": {{
          "plato": "Macarrones con tomate y queso",
          "descripcion": "Pasta con salsa casera y queso derretido",
          "tiempo_prep": 20,
          "calorias": 280,
          "dificultad": "Fácil",
          "ingredientes": ["50g macarrones integrales", "100ml salsa tomate", "30g queso rallado", "1 cucharadita aceite", "albahaca"],
          "preparacion": ["Cocer macarrones", "Calentar salsa tomate", "Mezclar pasta con salsa", "Añadir queso derretido", "Decorar con albahaca"],
          "nutrientes": {{"proteinas_g": 12, "carbohidratos_g": 38, "grasas_g": 8, "fibra_g": 3, "azucar_g": 6, "sodio_mg": 180}},
          "vitaminas_minerales": ["Calcio", "Hierro", "Vitamina A", "Vitamina C"],
          "alergenos": ["Gluten", "Lácteos"],
          "notas": "Cortar pasta en trozos pequeños.",
          "cocinado_por": "Familia",
          "tipo_cocina": "Italiana adaptada"
        }},
        "segundo": {{
          "plato": "Nuggets de pollo caseros",
          "descripcion": "Pollo empanado al horno con forma divertida",
          "tiempo_prep": 25,
          "calorias": 220,
          "dificultad": "Media",
          "ingredientes": ["100g pechuga pollo", "30g pan rallado integral", "1 huevo batido", "1 cucharada harina", "aceite spray", "sal", "pimienta"],
          "preparacion": ["Cortar pollo en trozos pequeños", "Dar forma divertida", "Sazonar", "Pasar por harina-huevo-pan rallado", "Hornear 200°C 15-20 min"],
          "nutrientes": {{"proteinas_g": 18, "carbohidratos_g": 15, "grasas_g": 10, "fibra_g": 1, "azucar_g": 1, "sodio_mg": 250}},
          "vitaminas_minerales": ["Proteína", "Hierro", "Vitamina B6"],
          "alergenos": ["Huevo", "Gluten"],
          "notas": "Más saludables que comprados. Formas divertidas.",
          "cocinado_por": "Familia",
          "tipo_cocina": "Fast food saludable"
        }},
        "postre": {{
          "plato": "Flan de huevo casero",
          "descripcion": "Flan tradicional con caramelo",
          "tiempo_prep": 15,
          "tiempo_total": 45,
          "calorias": 150,
          "dificultad": "Media",
          "ingredientes": ["2 huevos", "250ml leche entera", "40g azúcar", "1 vaina vainilla", "50g azúcar caramelo", "agua"],
          "preparacion": ["Hacer caramelo", "Verter en moldes", "Calentar leche con vainilla", "Batir huevos con azúcar", "Añadir leche caliente", "Cocinar baño María 30 min", "Refrigerar 4 horas"],
          "nutrientes": {{"proteinas_g": 6, "carbohidratos_g": 20, "grasas_g": 5, "fibra_g": 0, "azucar_g": 18, "sodio_mg": 60}},
          "vitaminas_minerales": ["Calcio", "Vitamina D", "Vitamina B12"],
          "alergenos": ["Huevo", "Lácteos"],
          "notas": "Postre tradicional que les encantará.",
          "cocinado_por": "Familia",
          "tipo_cocina": "Española tradicional"
        }},
        "tiempo_total": 45,
        "cocinado_por": "Familia"
      }},
      "merienda": {{
        "plato": "Galletas con zumo de naranja",
        "descripcion": "Galletas integrales con zumo fresco",
        "tiempo_prep": 3,
        "calorias": 140,
        "dificultad": "Fácil",
        "ingredientes": ["3 galletas integrales", "150ml zumo naranja natural", "1 cucharadita miel"],
        "preparacion": ["Servir galletas en plato divertido", "Exprimir naranjas", "Añadir miel si es ácido", "Servir junto"],
        "nutrientes": {{"proteinas_g": 2, "carbohidratos_g": 18, "grasas_g": 6, "fibra_g": 1, "azucar_g": 12, "sodio_mg": 40}},
          "vitaminas_minerales": ["Vitamina C", "Fibra", "Hierro"],
          "alergenos": ["Gluten"],
          "notas": "Zumo natural mejor que envasados.",
          "cocinado_por": "Sin cocinar",
          "tipo_cocina": "Snack infantil"
      }},
      "cena": {{
        "plato": "Croquetas de jamón con forma",
        "descripcion": "Croquetas caseras con jamón serrano",
        "tiempo_prep": 15,
        "tiempo_total": 30,
        "calorias": 180,
        "dificultad": "Media",
        "ingredientes": ["50g jamón serrano", "30g harina", "250ml leche", "20g mantequilla", "1 huevo batido", "50g pan rallado", "aceite", "sal", "nuez moscada"],
        "preparacion": ["Hacer bechamel", "Añadir jamón y sazonar", "Enfriar 2 horas", "Formar croquetas con forma", "Pasar por huevo y pan rallado", "Freír hasta doradas"],
        "nutrientes": {{"proteinas_g": 8, "carbohidratos_g": 12, "grasas_g": 11, "fibra_g": 0, "azucar_g": 2, "sodio_mg": 320}},
          "vitaminas_minerales": ["Calcio", "Hierro", "Vitamina B"],
          "alergenos": ["Gluten", "Lácteos", "Huevo"],
          "notas": "Se pueden congelar crudas. Formas divertidas ayudan.",
          "cocinado_por": "Marycel",
          "tipo_cocina": "Española tradicional"
        }}
    }}
    // martes a domingo con misma estructura...
  }},
  
  "lista_compra": {{
    "frutas_verduras": [
      {{"item": "Tomates maduros", "cantidad": "1.5kg", "estimado_eur": 3.75}},
      {{"item": "Calabacines", "cantidad": "4 unidades", "estimado_eur": 2.40}},
      {{"item": "Pepino", "cantidad": "2 unidades", "estimado_eur": 1.20}},
      {{"item": "Pimiento verde", "cantidad": "2 unidades", "estimado_eur": 1.40}},
      {{"item": "Cebolla", "cantidad": "2 unidades grandes", "estimado_eur": 1.00}},
      {{"item": "Ajo", "cantidad": "2 cabezas", "estimado_eur": 1.50}},
      {{"item": "Puerro", "cantidad": "2 unidades grandes", "estimado_eur": 2.00}},
      {{"item": "Patatas", "cantidad": "1kg", "estimado_eur": 1.80}},
      {{"item": "Aguacates", "cantidad": "3 unidades", "estimado_eur": 4.50}},
      {{"item": "Melocotones", "cantidad": "6 unidades", "estimado_eur": 3.60}},
      {{"item": "Manzanas Royal", "cantidad": "6 unidades", "estimado_eur": 3.00}},
      {{"item": "Nueces pecan", "cantidad": "100g", "estimado_eur": 2.50}},
      {{"item": "Almendras laminadas", "cantidad": "50g", "estimado_eur": 1.20}},
      {{"item": "Naranjas", "cantidad": "1kg", "estimado_eur": 2.00}}
    ],
    "carnes_pescados": [
      {{"item": "Muslos de pollo", "cantidad": "1.2kg", "estimado_eur": 7.20}},
      {{"item": "Pechuga de pollo", "cantidad": "500g", "estimado_eur": 4.00}},
      {{"item": "Jamón serrano", "cantidad": "150g", "estimado_eur": 3.75}}
    ],
    "lacteos_huevos": [
      {{"item": "Huevos de corral", "cantidad": "2 docenas", "estimado_eur": 4.40}},
      {{"item": "Leche entera", "cantidad": "2 litros", "estimado_eur": 2.40}},
      {{"item": "Mantequilla sin sal", "cantidad": "250g", "estimado_eur": 2.20}},
      {{"item": "Queso rallado", "cantidad": "200g", "estimado_eur": 2.80}}
    ],
    "panaderia": [
      {{"item": "Pan integral", "cantidad": "2 barras", "estimado_eur": 3.00}},
      {{"item": "Pan de molde integral", "cantidad": "1 paquete", "estimado_eur": 1.80}},
      {{"item": "Galletas integrales", "cantidad": "1 paquete", "estimado_eur": 2.50}}
    ],
    "despensa": [
      {{"item": "Aceite de oliva virgen extra", "cantidad": "750ml", "estimado_eur": 6.75}},
      {{"item": "Vinagre de Jerez", "cantidad": "250ml", "estimado_eur": 1.50}},
      {{"item": "Macarrones integrales", "cantidad": "500g", "estimado_eur": 1.80}},
      {{"item": "Pan rallado integral", "cantidad": "200g", "estimado_eur": 1.20}},
      {{"item": "Harina de trigo", "cantidad": "500g", "estimado_eur": 0.80}},
      {{"item": "Sal marina", "cantidad": "1kg", "estimado_eur": 1.00}},
      {{"item": "Azúcar", "cantidad": "1kg", "estimado_eur": 1.20}},
      {{"item": "Miel", "cantidad": "250g", "estimado_eur": 3.50}},
      {{"item": "Especias variadas", "cantidad": "pack básico", "estimado_eur": 4.00}}
    ]
  }},
  
  "consejos_semana": [
    "Hacer batch cooking domingo: gazpacho para 3 días, crema para 2-3 cenas",
    "Croquetas se pueden congelar para cenas emergencia",
    "Niños pueden ayudar con tostadas divertidas y galletas",
    "Aceite de ajos sobrante perfecto para otras recetas"
  ],
  
  "consideraciones_aplicadas": [
    "Evitado lácteos por intolerancia Xilef en desayunos y cenas",
    "Incluidos platos españoles tradicionales",
    "Adaptadas porciones para niños (4 años) con presentaciones divertidas",
    "Considerado tiempo disponible Marycel L-V para cenas elaboradas",
    "Priorizados productos temporada Barcelona",
    "Balance nutricional adecuado adultos y niños separado"
  ]
}}

IMPORTANTE: Completa TODOS los días para AMBOS menús con información nutricional completa. Responde ÚNICAMENTE con el JSON.
        "preparacion": [
          "Tostar ligeramente el pan",
          "Untar tomate rallado",
          "Añadir un poco de aceite"
        ],
        "nutrientes": {{
          "proteinas_g": 4,
          "carbohidratos_g": 22,
          "grasas_g": 8,
          "fibra_g": 2
        }},
        "adaptacion_oliva_4": {{
          "cambios": "Sin corteza, pan muy tostado cortado en triángulos pequeños",
          "presentacion": "Formar carita feliz con el tomate",
          "porcion": "1/2 tostada",
          "textura": "Crujiente pero fácil de masticar"
        }},
        "adaptacion_abril_14": {{
          "cambios": "Puede comer versión adulto con aguacate",
          "porcion": "Completa"
        }},
        "alternativa_si_rechaza": "Cereales sin azúcar con bebida de avena",
        "truco_padres": "Dejar que Oliva unta ella misma el tomate"
      }},
      
      "comida": {{
        "plato": "Pollo con patatas (versión niños)",
        "descripcion": "Versión suave del pollo al ajillo",
        "tiempo_prep": 10,
        "calorias": 320,
        "ingredientes": [
          "Pechuga de pollo (del menú adultos)",
          "Patatas del horno",
          "Aceite de oliva",
          "Sal"
        ],
        "preparacion": [
          "Usar pechuga en lugar de muslo (sin huesos)",
          "Cocinar a la plancha sin ajo fuerte",
          "Cortar según edad del niño",
          "Servir con patatas del horno"
        ],
        "nutrientes": {{
          "proteinas_g": 26,
          "carbohidratos_g": 24,
          "grasas_g": 12,
          "fibra_g": 2
        }},
        "adaptacion_oliva_4": {{
          "cambios": "Pollo deshilachado o en dados MUY pequeños, patatas en puré",
          "presentacion": "Hacer forma de cara: puré de base, pollo como pelo, guisantes como ojos",
          "porcion": "1/3 de adulto (100g pollo, 80g patata)",
          "textura": "Todo muy tierno, sin trozos duros ni fibrosos"
        }},
        "adaptacion_abril_14": {{
          "cambios": "Puede comer versión adulto con ajo",
          "porcion": "Igual que adulto"
        }},
        "alternativa_si_rechaza": "Macarrones con tomate natural triturado",
        "truco_padres": "Esconder zanahoria rallada muy fina en el puré",
        "porque_esta_receta": "Pollo es proteína aceptada por ambas, fácil de adaptar texturas"
      }},
      
      "merienda": {{
        "plato": "Plátano con galletas María",
        "descripcion": "Merienda sencilla y energética",
        "calorias": 200,
        "ingredientes": ["1 plátano", "4 galletas María"],
        "nutrientes": {{
          "proteinas_g": 3,
          "carbohidratos_g": 40,
          "grasas_g": 4,
          "fibra_g": 2
        }},
        "adaptacion_oliva_4": {{
          "cambios": "Plátano cortado en rodajas",
          "presentacion": "Hacer trenecito con las rodajas y galletas como vagones"
        }},
        "alternativa_si_rechaza": "Yogur de soja con trocitos de fruta"
      }},
      
      "cena": {{
        "plato": "Crema de calabacín suave",
        "descripcion": "Misma crema de adultos, adaptada",
        "tiempo_prep": 5,
        "calorias": 140,
        "ingredientes": [
          "Crema de calabacín (de la preparada para adultos)",
          "Picatostes pequeños"
        ],
        "preparacion": [
          "Servir crema de la preparada para adultos",
          "Textura muy fina para Oliva",
          "Añadir picatostes para Abril"
        ],
        "nutrientes": {{
          "proteinas_g": 4,
          "carbohidratos_g": 16,
          "grasas_g": 6,
          "fibra_g": 3
        }},
        "adaptacion_oliva_4": {{
          "cambios": "Pasar por colador fino, sin picatostes (riesgo atragantamiento), sin huevo",
          "presentacion": "Servir en tazón con forma de animal, dibujar carita con aceite",
          "porcion": "1/2 tazón pequeño (150ml)",
          "textura": "Completamente lisa, sin ningún grumo"
        }},
        "adaptacion_abril_14": {{
          "cambios": "Puede añadir huevo poché si quiere, con picatostes",
          "porcion": "Igual que adulto"
        }},
        "alternativa_si_rechaza": "Tortilla francesa con jamón york (sin queso)",
        "truco_padres": "Llamarla 'sopa de Hulk' o 'sopa mágica verde'",
        "porque_esta_receta": "Aprovecha misma preparación adultos, verdura escondida, fácil de adaptar"
      }},
      
      "resumen_dia_ninos": {{
        "calorias_oliva_4": 620,
        "calorias_abril_14": 840,
        "proteinas_oliva_4": 28,
        "proteinas_abril_14": 42
      }}
    }}
    // martes a domingo con misma estructura...
  }},
  
  "lista_compra": {{
    "frutas_verduras": [
      {{"item": "Tomates maduros", "cantidad": "2 kg", "estimado_eur": 3.50, "uso": "Gazpacho, tostadas, salsas"}},
      {{"item": "Calabacines", "cantidad": "6 unidades", "estimado_eur": 2.40, "uso": "Cremas, salteados"}},
      {{"item": "Patatas", "cantidad": "2 kg", "estimado_eur": 2.00, "uso": "Guarniciones, purés"}}
    ],
    "carnes_pescados": [
      {{"item": "Muslos de pollo", "cantidad": "1 kg", "estimado_eur": 5.50, "uso": "Pollo al ajillo"}},
      {{"item": "Pechuga de pollo", "cantidad": "500g", "estimado_eur": 4.50, "uso": "Versión niños"}}
    ],
    "lacteos_huevos": [
      {{"item": "Huevos camperos", "cantidad": "12 unidades", "estimado_eur": 3.20, "uso": "Tortillas, poché"}},
      {{"item": "Bebida de avena", "cantidad": "2L", "estimado_eur": 2.80, "uso": "Alternativa leche (sin lactosa)"}}
    ],
    "panaderia": [
      {{"item": "Pan integral", "cantidad": "2 barras", "estimado_eur": 2.40, "uso": "Desayunos, tostadas"}}
    ],
    "despensa": [
      {{"item": "Aceite oliva virgen extra", "cantidad": "750ml", "estimado_eur": 6.00, "uso": "Cocinar, aliñar"}}
    ],
    "congelados": [],
    "total_estimado": 92.50
  }},
  
  "batch_cooking": {{
    "preparar_domingo": [
      {{
        "receta": "Gazpacho (cantidad doble)",
        "tiempo_min": 20,
        "rinde_para": "Comidas lunes, martes, miércoles",
        "conservacion": "Nevera en jarra de cristal, hasta 5 días"
      }},
      {{
        "receta": "Crema de calabacín (cantidad doble)",
        "tiempo_min": 30,
        "rinde_para": "Cenas lunes, miércoles",
        "conservacion": "Nevera 4 días o congelar en porciones"
      }},
      {{
        "receta": "Pollo cocido desmenuzado",
        "tiempo_min": 40,
        "rinde_para": "Comidas niños varios días",
        "conservacion": "Nevera 3 días en tupper hermético"
      }}
    ],
    "tiempo_total_domingo": 90,
    "ahorro_tiempo_semanal": "3-4 horas"
  }},
  
  "consejos_semana": [
    "Preparar gazpacho y crema de calabacín el domingo (batch cooking)",
    "Marycel puede dejar cenas preparadas que solo necesiten calentar",
    "Congelar porciones individuales de cremas para emergencias",
    "Para Oliva: siempre tener alternativa lista (huevos, pasta)",
    "Los viernes usar restos creativamente antes del fin de semana"
  ],
  
  "consideraciones_aplicadas": [
    "✅ Sin mariscos (alergia Xilef)",
    "✅ Sin lactosa (intolerancia Xilef) - bebida avena como alternativa",
    "✅ Ajo y pimiento incluidos (favoritos Joe)",
    "✅ Jengibre y cilantro en algunos platos (favoritos Xilef)",
    "✅ Sin berenjena ni espinaca (rechazadas por Abril)",
    "✅ Sin verduras verdes visibles para Oliva (escondidas en purés)",
    "✅ Texturas adaptadas para Oliva (4 años) - sin fibrosas",
    "✅ Abril come porciones adulto (14 años)",
    "✅ Cenas L-V elaboradas (Marycel 18-21h)",
    "✅ Fines de semana platos simples",
    "✅ Presupuesto 100€: conseguido 92.50€"
  ],
  
  "info_nutricional_semanal": {{
    "adultos": {{
      "calorias_promedio_dia": 1750,
      "proteinas_promedio_g": 75,
      "carbohidratos_promedio_g": 180,
      "grasas_promedio_g": 70,
      "fibra_promedio_g": 25,
      "balance": "Dieta mediterránea equilibrada"
    }},
    "ninos": {{
      "oliva_4_calorias_promedio": 950,
      "abril_14_calorias_promedio": 1600,
      "nota": "Ajustado por edad y necesidades"
    }}
  }}
}}

IMPORTANTE: 
- Responde SOLO con el JSON, sin texto antes ni después
- Asegúrate de que el JSON sea válido
- Incluye los 7 días completos (lunes a domingo)
- TODOS los campos son obligatorios para cada plato
- Cada plato de niños DEBE incluir adaptacion_oliva_4 y adaptacion_abril_14
"""
        return prompt
    
    def _build_regeneration_prompt(self, menu_data: Dict, dia: str, comida: Optional[str], 
                                 tipo: str, family_members: List[Dict]) -> str:
        """Construye prompt para regeneración específica"""
        
        context_info = f"Regenerar {dia}"
        if comida:
            context_info += f" - {comida}"
        if tipo != "ambos":
            context_info += f" - menú {tipo}"
        
        prompt = f"""
Necesito regenerar parte de un menú semanal existente.

## CONTEXTO ACTUAL:
{context_info}

## MENÚ COMPLETO ACTUAL:
{json.dumps(menu_data, ensure_ascii=False, indent=2)}

## FAMILIA:
{json.dumps(family_members, ensure_ascii=False, indent=2)}

## INSTRUCCIONES:
1. Regenera SOLAMENTE lo solicitado manteniendo coherencia con el resto del menú
2. Respeta las mismas preferencias, alergias y restricciones
3. Mantén el estilo y formato del menú existente
4. Si es solo una comida, asegúrate que combine bien con las otras comidas del día
5. Responde SOLO con el JSON actualizado de la sección modificada

## FORMATO DE RESPUESTA:
Si regeneras todo el día:
{{
  "menu_adultos": {{
    "{dia}": {{ ... }}
  }},
  "menu_ninos": {{
    "{dia}": {{ ... }}
  }}
}}

Si regeneras solo una comida:
{{
  "menu_adultos": {{
    "{dia}": {{
      "{comida}": {{ ... }}
    }}
  }},
  "menu_ninos": {{
    "{dia}": {{
      "{comida}": {{ ... }}
    }}
  }}
}}
"""
        return prompt
    
    def _get_all_allergies(self, family_members: List[Dict]) -> str:
        """Extrae todas las alergias e intolerancias de la familia"""
        all_allergies = set()
        all_intolerances = set()
        
        for member in family_members:
            all_allergies.update(member.get('alergias', []))
            all_intolerances.update(member.get('intolerancias', []))
        
        result = []
        if all_allergies:
            result.append(f"ALERGIAS: {', '.join(all_allergies)}")
        if all_intolerances:
            result.append(f"INTOLERANCIAS: {', '.join(all_intolerances)}")
        
        return ' | '.join(result) if result else 'Ninguna'
    
    def _extract_json_from_response(self, content: str) -> Optional[Dict]:
        """Extrae JSON válido de la respuesta de Claude"""
        try:
            logger.info(f"Contenido crudo de Claude (primeros 500 chars): {content[:500]}")
            
            # Buscar bloques de código JSON
            if '```json' in content:
                start = content.find('```json') + 7
                end = content.find('```', start)
                json_str = content[start:end].strip()
            elif '```' in content:
                start = content.find('```') + 3
                end = content.find('```', start)
                json_str = content[start:end].strip()
            else:
                # Si no hay bloques, intentar parsear todo el contenido
                json_str = content.strip()
            
            logger.info(f"JSON extraído (primeros 300 chars): {json_str[:300]}...")
            
            # Intentar parseo directo primero
            try:
                result = json.loads(json_str)
                logger.info(f"JSON parseado exitosamente (directo)")
                return result
            except json.JSONDecodeError as e:
                logger.error(f"Error en parseo JSON directo: {e}")
                logger.error(f"JSON que falló: {json_str}")
                
                # Si falla, aplicar limpieza y reconstrucción
                return self._basic_json_reconstruction(json_str)
            
        except Exception as e:
            logger.error(f"Error extrayendo JSON: {str(e)}")
            logger.error(f"Contenido completo: {content}")
            return None
    
    def _basic_json_reconstruction(self, json_str: str) -> Optional[Dict]:
        """Reconstrucción JSON básica de último recurso"""
        import re
        import json
        
        try:
            logger.info("Aplicando reconstrucción JSON básica...")
            
            # Estrategia mejorada: reconstruir preservando estructura anidada
            # Primero, intentar un parseo más permisivo
            try:
                # Reemplazar caracteres problemáticos pero mantener estructura
                cleaned = re.sub(r'[^\x20-\x7E\{\}\[\]"\'\:\,\.0-9\-\n\r\t]', '', json_str)
                # Corregir comas finales
                cleaned = re.sub(r',(\s*[}\]])', r'\1', cleaned)
                # Poner comillas a claves sin ellas
                cleaned = re.sub(r'(\w+):', r'"\1":', cleaned)
                
                result = json.loads(cleaned)
                logger.info("Parseo con limpieza básica funcionó")
                return result
            except:
                pass
            
            # Si falla, intentar reconstrucción manual más inteligente
            logger.info("Intentando reconstrucción manual...")
            
            # Estructura esperada para menús
            menu_structure = {
                "menu_adultos": {},
                "menu_ninos": {},
                "lista_compra": {},
                "consejos_semana": [],
                "consideraciones_aplicadas": []
            }
            
            # Extraer información usando regex
            # Buscar menú adultos
            adult_menu_match = re.search(r'"menu_adultos"\s*:\s*\{([^}]*)\}', json_str, re.DOTALL)
            if adult_menu_match:
                menu_structure["menu_adultos"] = self._parse_menu_section(adult_menu_match.group(1))
            
            # Buscar menú niños
            kids_menu_match = re.search(r'"menu_ninos"\s*:\s*\{([^}]*)\}', json_str, re.DOTALL)
            if kids_menu_match:
                menu_structure["menu_ninos"] = self._parse_menu_section(kids_menu_match.group(1))
            
            # Buscar lista de compra
            shopping_match = re.search(r'"lista_compra"\s*:\s*\{([^}]*)\}', json_str, re.DOTALL)
            if shopping_match:
                menu_structure["lista_compra"] = self._parse_shopping_list(shopping_match.group(1))
            
            # Buscar consejos
            consejos_match = re.search(r'"consejos_semana"\s*:\s*\[([^\]]*)\]', json_str, re.DOTALL)
            if consejos_match:
                menu_structure["consejos_semana"] = self._parse_string_array(consejos_match.group(1))
            
            logger.info(f"Menú reconstruido con claves: {list(menu_structure.keys())}")
            return menu_structure
            
        except Exception as e:
            logger.error(f"Error en reconstrucción básica: {e}")
            return None
    
    def _generate_sample_menu(self) -> Dict:
        """Genera un menú de ejemplo para adultos"""
        days = ['lunes', 'martes', 'miercoles', 'jueves', 'viernes', 'sabado', 'domingo']
        meals = ['desayuno', 'comida', 'merienda', 'cena']
        
        sample_adultos = {}
        
        for day in days:
            sample_adultos[day] = {
                'desayuno': {
                    'plato': f'Tostadas con tomate y aceite de oliva',
                    'descripcion': 'Pan tostado con tomate rallado y aceite virgen extra',
                    'tiempo_prep': 10
                },
                'comida': {
                    'primero': f'Ensalada mixta con atún',
                    'segundo': f'Pollo a la plancha con patatas',
                    'postre': f'Fruta de temporada',
                    'tiempo_prep': 25
                },
                'merienda': {
                    'plato': f'Yogur natural con miel',
                    'descripcion': 'Yogur griego con miel y nueces',
                    'tiempo_prep': 5
                },
                'cena': {
                    'plato': f'Sopa de verduras',
                    'descripcion': 'Sopa casera con verduras de temporada',
                    'tiempo_prep': 20
                }
            }
        
        return sample_adultos
    
    def _generate_sample_menu_kids(self) -> Dict:
        """Genera un menú de ejemplo para niños"""
        days = ['lunes', 'martes', 'miercoles', 'jueves', 'viernes', 'sabado', 'domingo']
        meals = ['desayuno', 'comida', 'merienda', 'cena']
        
        sample_ninos = {}
        
        for day in days:
            sample_ninos[day] = {
                'desayuno': {
                    'plato': f'Cereales con leche',
                    'descripcion': 'Cereales integrales con leche y plátano',
                    'tiempo_prep': 5
                },
                'comida': {
                    'primero': f'Macarrones con tomate',
                    'segundo': f'Nuggets de pollo con zanahorias',
                    'postre': f'Flan de huevo',
                    'tiempo_prep': 20
                },
                'merienda': {
                    'plato': f'Galletas y zumo',
                    'descripcion': 'Galletas integrales y zumo de naranja',
                    'tiempo_prep': 3
                },
                'cena': {
                    'plato': f'Croquetas de jamón',
                    'descripcion': 'Croquetas caseras con jamón serrano',
                    'tiempo_prep': 15
                }
            }
        
        return sample_ninos
    
    def _parse_menu_section(self, section_str: str) -> Dict:
        """Parsea una sección de menú (días y comidas)"""
        import re
        
        menu = {}
        days = ['lunes', 'martes', 'miercoles', 'jueves', 'viernes', 'sabado', 'domingo']
        
        for day in days:
            day_pattern = rf'"{day}"\s*:\s*\{{([^}}]*)\}}'
            day_match = re.search(day_pattern, section_str, re.DOTALL)
            if day_match:
                menu[day] = self._parse_day_meals(day_match.group(1))
        
        return menu
    
    def _parse_day_meals(self, day_str: str) -> Dict:
        """Parsea las comidas de un día"""
        import re
        
        meals = {}
        meal_types = ['desayuno', 'comida', 'merienda', 'cena']
        
        for meal in meal_types:
            meal_pattern = rf'"{meal}"\s*:\s*\{{([^}}]*)\}}'
            meal_match = re.search(meal_pattern, day_str, re.DOTALL)
            if meal_match:
                meals[meal] = self._parse_meal_details(meal_match.group(1))
        
        return meals
    
    def _parse_meal_details(self, meal_str: str) -> Dict:
        """Parsea detalles de una comida"""
        import re
        
        details = {}
        
        # Buscar plato
        plato_match = re.search(r'"plato"\s*:\s*"([^"]*)"', meal_str)
        if plato_match:
            details["plato"] = plato_match.group(1)
        
        # Buscar descripción
        desc_match = re.search(r'"descripcion"\s*:\s*"([^"]*)"', meal_str)
        if desc_match:
            details["descripcion"] = desc_match.group(1)
        
        # Buscar tiempo de preparación
        time_match = re.search(r'"tiempo_prep"\s*:\s*(\d+)', meal_str)
        if time_match:
            details["tiempo_prep"] = int(time_match.group(1))
        
        return details
    
    def _parse_shopping_list(self, shopping_str: str) -> Dict:
        """Parsea la lista de compra"""
        import re
        
        shopping = {}
        categories = ['frutas_verduras', 'carnes_pescados', 'lacteos_huevos', 'panaderia', 'despensa', 'congelados']
        
        for category in categories:
            cat_pattern = rf'"{category}"\s*:\s*\[([^\]]*)\]'
            cat_match = re.search(cat_pattern, shopping_str, re.DOTALL)
            if cat_match:
                shopping[category] = self._parse_item_array(cat_match.group(1))
        
        return shopping
    
    def _parse_string_array(self, array_str: str) -> list:
        """Parsea un array de strings"""
        import re
        items = re.findall(r'"([^"]*)"', array_str)
        return items
    
    def _parse_item_array(self, array_str: str) -> list:
        """Parsea un array de objetos de compra"""
        import re
        
        items = []
        # Buscar objetos entre llaves
        item_matches = re.findall(r'\{([^}]*)\}', array_str)
        for item_str in item_matches:
            item = {}
            name_match = re.search(r'"item"\s*:\s*"([^"]*)"', item_str)
            qty_match = re.search(r'"cantidad"\s*:\s*"([^"]*)"', item_str)
            price_match = re.search(r'"estimado_eur"\s*:\s*([\d.]+)', item_str)
            
            if name_match:
                item["item"] = name_match.group(1)
            if qty_match:
                item["cantidad"] = qty_match.group(1)
            if price_match:
                item["estimado_eur"] = float(price_match.group(1))
            
            if item:
                items.append(item)
        
        return items
    
    def _fix_json_strings(self, json_str: str) -> str:
        """Corrige comillas y caracteres problemáticos dentro de strings JSON"""
        import re
        
        # Enfoque más simple y robusto: no intentar corregir strings complejos
        # Solo eliminar caracteres problemáticos obvios
        
        # Eliminar caracteres de control invisibles
        json_str = re.sub(r'[\x00-\x08\x0B\x0C\x0E-\x1F\x7F]', '', json_str)
        
        # Reemplazar caracteres Unicode problemáticos con espacios
        json_str = re.sub(r'[^\x20-\x7E\{\}\[\]"\'\:\,\.0-9\-\n\r\t\sáéíóúñÁÉÍÓÚÑüÜ¿¡]', ' ', json_str)
        
        # Corregir problemas comunes de comillas múltiples
        json_str = re.sub(r'"{3,}', '"', json_str)  # Eliminar comillas triples
        json_str = re.sub(r'""\s*"', '"', json_str)  # Corregir comillas dobles
        
        return json_str
    
    def _fix_common_json_issues(self, json_str: str) -> str:
        """Corrige problemas comunes de formato JSON"""
        import re
        
        # Eliminar comas finales antes de cerrar llaves/corchetes
        json_str = re.sub(r',(\s*[}\]])', r'\1', json_str)
        
        # Asegurar que las claves estén entre comillas
        json_str = re.sub(r'(\w+):', r'"\1":', json_str)
        
        # Corregir comillas dobles en claves
        json_str = re.sub(r'""(\w+)""', r'"\1"', json_str)
        
        return json_str
    
    def _emergency_json_fix(self, json_str: str, original_error) -> Optional[str]:
        """Intento de corrección de emergencia para JSON malformado"""
        import re
        
        try:
            logger.info(f"Aplicando corrección de emergencia para: {str(original_error)}")
            
            # Estrategia 1: Eliminar todas las comillas internas y dejar solo las estructurales
            if 'Expecting' in str(original_error) and ('delimiter' in str(original_error) or 'string' in str(original_error)):
                # Reconstruir JSON de forma más segura
                lines = json_str.split('\n')
                fixed_lines = []
                in_string = False
                
                for line in lines:
                    line = line.strip()
                    if not line or line.startswith('//') or line.startswith('#'):
                        continue
                    
                    # Lógica simple para identificar claves vs valores
                    if ':' in line:
                        parts = line.split(':', 1)
                        if len(parts) == 2:
                            key = parts[0].strip()
                            value = parts[1].strip()
                            
                            # Limpiar clave
                            key = re.sub(r'[^a-zA-Z0-9_]', '', key)
                            key = f'"{key}"'
                            
                            # Limpiar valor
                            if value.startswith('{') or value.startswith('['):
                                # Es un objeto o array, mantener como está
                                pass
                            elif value.startswith('"'):
                                # Es un string, limpiar contenido
                                value_content = value[1:-1]
                                value_content = re.sub(r'[^a-zA-Z0-9\sáéíóúñÁÉÍÓÚÑüÜ¿¡\-\.,]', '', value_content)
                                value = f'"{value_content}"'
                            else:
                                # Es un número o booleano
                                value = re.sub(r'[^a-zA-Z0-9.\-]', '', value)
                            
                            line = f'{key}: {value}'
                    
                    fixed_lines.append(line)
                
                result = '\n'.join(fixed_lines)
                logger.info(f"JSON reconstruido: {result[:200]}...")
                return result
            
            # Estrategia 2: Eliminar caracteres problemáticos de forma agresiva
            json_str = re.sub(r'[^\x20-\x7E\{\}\[\]"\'\:\,\.0-9\-\n\r\t]', '', json_str)
            return json_str
            
        except Exception as e:
            logger.error(f"Error en corrección de emergencia: {e}")
            return None
    
    def _validate_menu_structure(self, menu_data: Dict) -> bool:
        """Valida que la estructura del menú sea correcta"""
        required_keys = ['menu_adultos', 'menu_ninos', 'lista_compra']
        
        for key in required_keys:
            if key not in menu_data:
                raise ValueError(f"Falta la clave requerida: {key}")
        
        # Validar días de la semana
        dias_semana = ['lunes', 'martes', 'miercoles', 'jueves', 'viernes', 'sabado', 'domingo']
        
        for menu_type in ['menu_adultos', 'menu_ninos']:
            menu = menu_data[menu_type]
            for dia in dias_semana:
                if dia in menu:
                    comidas_dia = menu[dia]
                    for comida in ['desayuno', 'comida', 'merienda', 'cena']:
                        if comida in comidas_dia and not isinstance(comidas_dia[comida], dict):
                            raise ValueError(f"Estructura inválida en {menu_type}.{dia}.{comida}")
        
        return True
    
    def _merge_menu_changes(self, original_menu: Dict, updated_data: Dict, 
                          dia: str, comida: Optional[str], tipo: str) -> Dict:
        """Integra los cambios regenerados en el menú original"""
        result = original_menu.copy()
        
        if tipo == "ambos":
            # Actualizar ambos menús
            for menu_type in ['menu_adultos', 'menu_ninos']:
                if menu_type in updated_data and dia in updated_data[menu_type]:
                    if comida:
                        # Actualizar solo una comida
                        result[menu_type][dia][comida] = updated_data[menu_type][dia][comida]
                    else:
                        # Actualizar todo el día
                        result[menu_type][dia] = updated_data[menu_type][dia]
        else:
            # Actualizar solo un tipo de menú
            menu_type = f"menu_{tipo}"
            if menu_type in updated_data and dia in updated_data[menu_type]:
                if comida:
                    result[menu_type][dia][comida] = updated_data[menu_type][dia][comida]
                else:
                    result[menu_type][dia] = updated_data[menu_type][dia]
        
        return result


# Instancia global del servicio
ai_service = AIService()
