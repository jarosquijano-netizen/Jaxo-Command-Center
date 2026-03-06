"""
Test de módulos funcionales
"""

import sys
import os
sys.path.append(os.path.join(os.path.dirname(__file__), 'backend'))

from services.family_service import family_service
from services.menu_service import menu_service
from services.cleaning_service import cleaning_service

def test_family_module():
    """Probar módulo de familia"""
    print("👨‍👩‍👧‍👦 Probando módulo Family...")
    
    try:
        members = family_service.get_all_members()
        print(f"✅ Miembros cargados: {len(members)}")
        
        for member in members:
            print(f"  - {member['nombre']} ({member['tipo']})")
            
        return True
    except Exception as e:
        print(f"❌ Error en módulo family: {e}")
        return False

def test_menu_module():
    """Probar módulo de menú"""
    print("\n🍽️ Probando módulo Menu...")
    
    try:
        latest_menu = menu_service.get_latest_menu()
        if latest_menu:
            print(f"✅ Menú encontrado: semana {latest_menu.get('week_start', 'N/A')}")
        else:
            print("ℹ️  No hay menús guardados")
            
        return True
    except Exception as e:
        print(f"❌ Error en módulo menu: {e}")
        return False

def test_cleaning_module():
    """Probar módulo de limpieza"""
    print("\n🧹 Probando módulo Cleaning...")
    
    try:
        tasks = cleaning_service.get_all_tasks()
        schedule = cleaning_service.get_current_schedule()
        
        print(f"✅ Tareas de limpieza: {len(tasks)}")
        print(f"✅ Schedule actual: {len(schedule)} asignaciones")
        
        return True
    except Exception as e:
        print(f"❌ Error en módulo cleaning: {e}")
        return False

if __name__ == "__main__":
    print("🔍 QA DE MÓDULOS FUNCIONALES")
    print("=" * 40)
    
    results = []
    results.append(test_family_module())
    results.append(test_menu_module())
    results.append(test_cleaning_module())
    
    print(f"\n📊 Resultados: {sum(results)}/{len(results)} módulos funcionando")
