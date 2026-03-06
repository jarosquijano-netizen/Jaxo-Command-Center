import requests
import json

# Base URL
BASE_URL = "http://localhost:9000"

# Miembros a crear
members = [
    {
        "nombre": "Joe",
        "edad": 35,
        "tipo": "adulto",
        "rol_hogar": "familia",
        "avatar_color": "#4A90E2",
        "emoji": "👨",
        "puede_cocinar": True,
        "puede_limpiar": True,
        "puede_compras": True,
        "porcentaje_tareas_limpieza": 15,
        "porcentaje_tareas_cocina": 10,
        "disponibilidad_dias": ["sabado", "domingo"],
        "objetivo_alimentario": "Mantener",
        "estilo_alimentacion": "Mediterranea",
        "cocinas_favoritas": ["italiana", "espanola"],
        "nivel_picante": "Medio",
        "ingredientes_favoritos": ["ajo", "pimiento"],
        "alergias": [],
        "intolerancias": [],
        "preocupacion_principal": "Ninguna",
        "tiempo_max_cocinar": 60,
        "nivel_cocina": "Medio",
        "tipo_desayuno": "Continental",
        "le_gustan_snacks": True,
        "plato_favorito": "Paella",
        "plato_menos_favorito": "Brocoli"
    },
    {
        "nombre": "Xilef",
        "edad": 33,
        "tipo": "adulto",
        "rol_hogar": "familia",
        "avatar_color": "#F5A623",
        "emoji": "👩",
        "puede_cocinar": True,
        "puede_limpiar": True,
        "puede_compras": True,
        "porcentaje_tareas_limpieza": 15,
        "porcentaje_tareas_cocina": 15,
        "disponibilidad_dias": ["sabado", "domingo"],
        "objetivo_alimentario": "Salud",
        "estilo_alimentacion": "Mediterranea",
        "cocinas_favoritas": ["asiatica", "vegetariana"],
        "nivel_picante": "Suave",
        "ingredientes_favoritos": ["jengibre", "cilantro"],
        "alergias": ["mariscos"],
        "intolerancias": ["lactosa"],
        "preocupacion_principal": "Salud",
        "tiempo_max_cocinar": 45,
        "nivel_cocina": "Avanzado",
        "tipo_desayuno": "Saludable",
        "le_gustan_snacks": False,
        "plato_favorito": "Sushi",
        "plato_menos_favorito": "Carne roja"
    },
    {
        "nombre": "Abril",
        "edad": 14,
        "tipo": "nino",
        "rol_hogar": "familia",
        "avatar_color": "#9B59B6",
        "emoji": "👧",
        "puede_cocinar": True,
        "puede_limpiar": True,
        "puede_compras": False,
        "porcentaje_tareas_limpieza": 15,
        "porcentaje_tareas_cocina": 10,
        "disponibilidad_dias": ["sabado", "domingo"],
        "come_solo": "Con ayuda",
        "nivel_exigencia": "Medio",
        "acepta_comida_nueva": "A veces",
        "verduras_aceptadas": ["zanahoria", "pepino"],
        "verduras_rechazadas": ["berenjena", "espinaca"],
        "texturas_no_gustan": ["blandas"],
        "alergias": [],
        "intolerancias": [],
        "desayuno_preferido": "Tostadas",
        "snacks_favoritos": ["fruta", "yogur"],
        "plato_nunca_comeria": "pescado crudo",
        "comentarios_padres": "Le gusta ayudar en cocina simple"
    },
    {
        "nombre": "Oliva",
        "edad": 4,
        "tipo": "nino",
        "rol_hogar": "familia",
        "avatar_color": "#F8E71C",
        "emoji": "👶",
        "puede_cocinar": False,
        "puede_limpiar": True,
        "puede_compras": False,
        "porcentaje_tareas_limpieza": 5,
        "porcentaje_tareas_cocina": 0,
        "disponibilidad_dias": ["sabado", "domingo"],
        "come_solo": "Necesita mucha ayuda",
        "nivel_exigencia": "Bajo",
        "acepta_comida_nueva": "No",
        "verduras_aceptadas": ["zanahoria"],
        "verduras_rechazadas": ["espinaca", "brocoli"],
        "texturas_no_gustan": ["fibrosas"],
        "alergias": [],
        "intolerancias": [],
        "desayuno_preferido": "Cereales",
        "snacks_favoritos": ["galletas", "fruta"],
        "plato_nunca_comeria": "verduras verdes",
        "comentarios_padres": "Solo puede guardar juguetes y poner mesa con supervision"
    },
    {
        "nombre": "Marycel",
        "edad": 45,
        "tipo": "adulto",
        "rol_hogar": "empleado_hogar",
        "avatar_color": "#7ED321",
        "emoji": "👩‍🍳",
        "puede_cocinar": True,
        "puede_limpiar": True,
        "puede_compras": True,
        "porcentaje_tareas_limpieza": 50,
        "porcentaje_tareas_cocina": 60,
        "disponibilidad_dias": ["lunes", "martes", "miercoles", "jueves", "viernes"],
        "dias_trabajo": ["lunes", "martes", "miercoles", "jueves", "viernes"],
        "horario_entrada": "18:00",
        "horario_salida": "21:00",
        "horas_por_dia": 3.0,
        "responsabilidades_principales": ["limpieza", "cocina", "preparar_cena"],
        "notas_empleador": "Empleado del hogar confiable y eficiente"
    }
]

# Crear miembros
for member in members:
    try:
        response = requests.post(f"{BASE_URL}/api/family/members", json=member)
        if response.status_code == 201:
            print(f"✅ Miembro '{member['nombre']}' creado exitosamente")
        else:
            print(f"❌ Error creando miembro '{member['nombre']}': {response.text}")
    except Exception as e:
        print(f"❌ Error de conexión: {e}")

print("\n🎉 Todos los miembros han sido creados!")
