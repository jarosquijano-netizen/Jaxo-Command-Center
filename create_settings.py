import requests
import json

# Base URL
BASE_URL = "http://localhost:9000"

# Configuración inicial
settings = {
    "nombre_familia": "Familia de Joe",
    "ciudad": "Barcelona",
    "idioma": "es",
    "zona_horaria": "Europe/Madrid",
    "dias_menu": ["lunes", "martes", "miercoles", "jueves", "viernes", "sabado", "domingo"],
    "comidas_por_dia": ["desayuno", "comida", "merienda", "cena"],
    "presupuesto_semanal": 500,
    "supermercado_preferido": "Mercadona",
    "dias_limpieza_profunda": ["sabado"],
    "incluir_ninos_tareas": True,
    "edad_minima_tareas_simples": 4,
    "edad_minima_tareas_medias": 10
}

# Crear configuración
try:
    response = requests.put(f"{BASE_URL}/api/settings", json=settings)
    if response.status_code == 200:
        print("✅ Configuración creada exitosamente")
        print(json.dumps(response.json(), indent=2))
    else:
        print(f"❌ Error creando configuración: {response.text}")
except Exception as e:
    print(f"❌ Error de conexión: {e}")
