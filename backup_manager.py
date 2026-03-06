#!/usr/bin/env python3
"""
Sistema de Backup/Restore para Family Command Center
Permite crear snapshots del estado actual y restaurarlos
"""

import os
import shutil
import json
import sqlite3
from datetime import datetime
from pathlib import Path
import subprocess

class BackupManager:
    def __init__(self, project_root=None):
        self.project_root = Path(project_root) if project_root else Path(__file__).parent
        self.backup_dir = self.project_root / "backups"
        self.backup_dir.mkdir(exist_ok=True)
        
    def create_backup(self, description=""):
        """Crear un backup completo del proyecto"""
        timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
        backup_name = f"backup_{timestamp}"
        backup_path = self.backup_dir / backup_name
        backup_path.mkdir(exist_ok=True)
        
        print(f"🔄 Creando backup: {backup_name}")
        
        # 1. Backup base de datos
        db_path = self.project_root / "backend" / "family_command_center.db"
        if db_path.exists():
            shutil.copy2(db_path, backup_path / "family_command_center.db")
            print("✅ Base de datos respaldada")
        
        # 2. Backup configuración (.env)
        env_path = self.project_root / ".env"
        if env_path.exists():
            shutil.copy2(env_path, backup_path / ".env")
            print("✅ Configuración (.env) respaldada")
        
        # 3. Backup código fuente (solo archivos importantes)
        code_backup = backup_path / "code"
        code_backup.mkdir(exist_ok=True)
        
        # Directorios a respaldar
        dirs_to_backup = [
            "backend",
            "frontend",
            "docs"
        ]
        
        for dir_name in dirs_to_backup:
            src_dir = self.project_root / dir_name
            if src_dir.exists():
                dst_dir = code_backup / dir_name
                shutil.copytree(src_dir, dst_dir, ignore=shutil.ignore_patterns(
                    '__pycache__', '*.pyc', '.git', 'node_modules', '.DS_Store'
                ))
                print(f"✅ Código {dir_name} respaldado")
        
        # 4. Backup archivos raíz importantes
        root_files = [
            "README.md",
            "QUICK_START.md",
            "requirements.txt",
            "create_members.py",
            "create_settings.py"
        ]
        
        for file_name in root_files:
            src_file = self.project_root / file_name
            if src_file.exists():
                shutil.copy2(src_file, backup_path / file_name)
                print(f"✅ Archivo {file_name} respaldado")
        
        # 5. Crear metadata del backup
        metadata = {
            "timestamp": timestamp,
            "description": description,
            "created_at": datetime.now().isoformat(),
            "project_root": str(self.project_root),
            "files_backed_up": self._get_backup_files(backup_path),
            "database_exists": (self.project_root / "backend" / "family_command_center.db").exists(),
            "env_exists": (self.project_root / ".env").exists()
        }
        
        with open(backup_path / "metadata.json", 'w', encoding='utf-8') as f:
            json.dump(metadata, f, indent=2, ensure_ascii=False)
        
        print(f"🎉 Backup completado: {backup_path}")
        print(f"📝 Descripción: {description}")
        print(f"📊 Archivos respaldados: {len(metadata['files_backed_up'])}")
        
        return backup_path
    
    def restore_backup(self, backup_name):
        """Restaurar un backup específico"""
        backup_path = self.backup_dir / backup_name
        
        if not backup_path.exists():
            print(f"❌ Backup no encontrado: {backup_name}")
            return False
        
        print(f"🔄 Restaurando backup: {backup_name}")
        
        # Leer metadata
        metadata_file = backup_path / "metadata.json"
        if metadata_file.exists():
            with open(metadata_file, 'r', encoding='utf-8') as f:
                metadata = json.load(f)
            print(f"📅 Backup creado: {metadata['created_at']}")
            print(f"📝 Descripción: {metadata.get('description', 'Sin descripción')}")
        
        # Confirmar restauración
        response = input("⚠️  Esto sobrescribirá archivos actuales. ¿Continuar? (y/N): ")
        if response.lower() != 'y':
            print("❌ Restauración cancelada")
            return False
        
        try:
            # 1. Restaurar base de datos
            db_backup = backup_path / "family_command_center.db"
            if db_backup.exists():
                db_target = self.project_root / "backend" / "family_command_center.db"
                shutil.copy2(db_backup, db_target)
                print("✅ Base de datos restaurada")
            
            # 2. Restaurar configuración
            env_backup = backup_path / ".env"
            if env_backup.exists():
                env_target = self.project_root / ".env"
                shutil.copy2(env_backup, env_target)
                print("✅ Configuración (.env) restaurada")
            
            # 3. Restaurar código fuente
            code_backup = backup_path / "code"
            if code_backup.exists():
                # Eliminar directorios existentes
                for dir_name in ["backend", "frontend", "docs"]:
                    target_dir = self.project_root / dir_name
                    if target_dir.exists():
                        shutil.rmtree(target_dir)
                
                # Copiar directorios del backup
                for dir_name in ["backend", "frontend", "docs"]:
                    src_dir = code_backup / dir_name
                    if src_dir.exists():
                        dst_dir = self.project_root / dir_name
                        shutil.copytree(src_dir, dst_dir)
                        print(f"✅ Código {dir_name} restaurado")
            
            # 4. Restaurar archivos raíz
            for file_name in ["README.md", "QUICK_START.md", "requirements.txt", "create_members.py", "create_settings.py"]:
                src_file = backup_path / file_name
                if src_file.exists():
                    dst_file = self.project_root / file_name
                    shutil.copy2(src_file, dst_file)
                    print(f"✅ Archivo {file_name} restaurado")
            
            print(f"🎉 Backup restaurado exitosamente: {backup_name}")
            return True
            
        except Exception as e:
            print(f"❌ Error durante restauración: {e}")
            return False
    
    def list_backups(self):
        """Listar todos los backups disponibles"""
        if not self.backup_dir.exists():
            print("❌ Directorio de backups no encontrado")
            return []
        
        backups = []
        for backup_path in self.backup_dir.iterdir():
            if backup_path.is_dir():
                metadata_file = backup_path / "metadata.json"
                if metadata_file.exists():
                    try:
                        with open(metadata_file, 'r', encoding='utf-8') as f:
                            metadata = json.load(f)
                        backups.append({
                            'name': backup_path.name,
                            'timestamp': metadata.get('timestamp', ''),
                            'created_at': metadata.get('created_at', ''),
                            'description': metadata.get('description', ''),
                            'files_count': len(metadata.get('files_backed_up', []))
                        })
                    except:
                        continue
        
        # Ordenar por timestamp (más reciente primero)
        backups.sort(key=lambda x: x['timestamp'], reverse=True)
        
        return backups
    
    def delete_backup(self, backup_name):
        """Eliminar un backup específico"""
        backup_path = self.backup_dir / backup_name
        
        if not backup_path.exists():
            print(f"❌ Backup no encontrado: {backup_name}")
            return False
        
        try:
            shutil.rmtree(backup_path)
            print(f"✅ Backup eliminado: {backup_name}")
            return True
        except Exception as e:
            print(f"❌ Error eliminando backup: {e}")
            return False
    
    def _get_backup_files(self, backup_path):
        """Obtener lista de archivos en el backup"""
        files = []
        for root, dirs, filenames in os.walk(backup_path):
            for filename in filenames:
                if filename != 'metadata.json':
                    rel_path = os.path.relpath(os.path.join(root, filename), backup_path)
                    files.append(rel_path)
        return files
    
    def show_backup_info(self, backup_name):
        """Mostrar información detallada de un backup"""
        backup_path = self.backup_dir / backup_name
        metadata_file = backup_path / "metadata.json"
        
        if not metadata_file.exists():
            print(f"❌ Metadata no encontrada para: {backup_name}")
            return
        
        with open(metadata_file, 'r', encoding='utf-8') as f:
            metadata = json.load(f)
        
        print(f"\n📋 Información del Backup: {backup_name}")
        print("=" * 50)
        print(f"📅 Creado: {metadata['created_at']}")
        print(f"📝 Descripción: {metadata.get('description', 'Sin descripción')}")
        print(f"📊 Archivos: {len(metadata['files_backed_up'])}")
        print(f"💾 Base de datos: {'✅' if metadata['database_exists'] else '❌'}")
        print(f"⚙️  Configuración: {'✅' if metadata['env_exists'] else '❌'}")
        
        print(f"\n📁 Archivos incluidos:")
        for file_path in metadata['files_backed_up'][:10]:  # Mostrar primeros 10
            print(f"  - {file_path}")
        if len(metadata['files_backed_up']) > 10:
            print(f"  ... y {len(metadata['files_backed_up']) - 10} archivos más")

def main():
    """Función principal para línea de comandos"""
    import sys
    
    if len(sys.argv) < 2:
        print("Uso:")
        print("  python backup_manager.py create [descripción]")
        print("  python backup_manager.py restore <nombre_backup>")
        print("  python backup_manager.py list")
        print("  python backup_manager.py delete <nombre_backup>")
        print("  python backup_manager.py info <nombre_backup>")
        return
    
    manager = BackupManager()
    command = sys.argv[1].lower()
    
    if command == "create":
        description = " ".join(sys.argv[2:]) if len(sys.argv) > 2 else "Backup automático"
        manager.create_backup(description)
    
    elif command == "restore":
        if len(sys.argv) < 3:
            print("❌ Especifica el nombre del backup a restaurar")
            return
        manager.restore_backup(sys.argv[2])
    
    elif command == "list":
        backups = manager.list_backups()
        if not backups:
            print("❌ No hay backups disponibles")
            return
        
        print(f"\n📋 Backups Disponibles ({len(backups)}):")
        print("=" * 80)
        for i, backup in enumerate(backups, 1):
            print(f"{i:2d}. {backup['name']}")
            print(f"     📅 {backup['created_at']}")
            print(f"     📝 {backup['description']}")
            print(f"     📊 {backup['files_count']} archivos")
            print()
    
    elif command == "delete":
        if len(sys.argv) < 3:
            print("❌ Especifica el nombre del backup a eliminar")
            return
        manager.delete_backup(sys.argv[2])
    
    elif command == "info":
        if len(sys.argv) < 3:
            print("❌ Especifica el nombre del backup")
            return
        manager.show_backup_info(sys.argv[2])
    
    else:
        print(f"❌ Comando desconocido: {command}")

if __name__ == "__main__":
    main()
