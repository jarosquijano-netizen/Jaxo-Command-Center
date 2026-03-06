#!/usr/bin/env python3
"""
Script para inicializar las tablas del módulo de limpieza
"""

from app import create_app, db
from models.cleaning import CleaningTask, CleaningSchedule

def init_cleaning_tables():
    """Inicializar tablas de limpieza si no existen"""
    app = create_app()
    
    with app.app_context():
        # Crear tablas
        db.create_all()
        print("✅ Tablas de limpieza creadas/verificadas")
        
        # Verificar si hay tareas en el catálogo
        task_count = CleaningTask.query.count()
        print(f"📊 Tareas en catálogo: {task_count}")
        
        if task_count == 0:
            print("🔄 El catálogo de tareas está vacío. Inicializa con POST /api/cleaning/initialize")
        else:
            print("✅ Catálogo de tareas ya existe")
        
        # Verificar asignaciones
        schedule_count = CleaningSchedule.query.count()
        print(f"📋 Asignaciones programadas: {schedule_count}")
        
        if schedule_count == 0:
            print("🔄 No hay asignaciones. Genera con POST /api/cleaning/generate")
        else:
            print("✅ Existen asignaciones programadas")

if __name__ == '__main__':
    init_cleaning_tables()
