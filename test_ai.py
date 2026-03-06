"""
Test de integración con Claude AI
"""

import sys
import os
sys.path.append(os.path.join(os.path.dirname(__file__), 'backend'))

from services.ai_service import AIService
from services.family_service import family_service
from services.settings_service import settings_service

def test_ai_service():
    """Probar el servicio de IA"""
    print("🤖 Probando servicio de IA Claude...")
    
    try:
        # Inicializar servicio
        ai_service = AIService()
        print("✅ Servicio IA inicializado correctamente")
        
        # Obtener datos de prueba
        family_members = family_service.get_all_members()
        settings = settings_service.get_settings()
        
        print(f"👨‍👩‍👧‍👦 Miembros familiares: {len(family_members)}")
        print(f"⚙️  Configuración obtenida: {'✅' if settings else '❌'}")
        
        # Probar generación simple (sin llamar a la API)
        prompt = ai_service._build_menu_prompt(family_members, settings, {}, [])
        print(f"📝 Prompt generado: {len(prompt)} caracteres")
        
        # Verificar API key
        if ai_service.client.api_key:
            masked_key = ai_service.client.api_key[:10] + "..." + ai_service.client.api_key[-4:]
            print(f"🔑 API Key configurada: {masked_key}")
        else:
            print("❌ API Key no configurada")
            
        return True
        
    except Exception as e:
        print(f"❌ Error en servicio IA: {e}")
        return False

if __name__ == "__main__":
    test_ai_service()
