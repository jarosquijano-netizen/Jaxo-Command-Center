#!/bin/bash
# Script de acceso rápido al sistema de backup/restore
# Family Command Center

echo ""
echo "=========================================="
echo "   🏠 Family Command Center - Backup System"
echo "=========================================="
echo ""

show_menu() {
    echo "1. 🔄 Crear Backup"
    echo "2. 📋 Listar Backups"
    echo "3. ℹ️  Ver Info Backup"
    echo "4. 🔄 Restaurar Backup"
    echo "5. 🗑️  Eliminar Backup"
    echo "6. 🚪 Salir"
    echo ""
}

while true; do
    show_menu
    read -p "Selecciona una opción (1-6): " option
    
    case $option in
        1)
            echo ""
            read -p "Descripción del backup (opcional): " desc
            if [ -z "$desc" ]; then
                python backup_manager.py create
            else
                python backup_manager.py create "$desc"
            fi
            echo ""
            ;;
        2)
            echo ""
            python backup_manager.py list
            echo ""
            ;;
        3)
            echo ""
            python backup_manager.py list
            echo ""
            read -p "Nombre del backup: " backup
            python backup_manager.py info "$backup"
            echo ""
            ;;
        4)
            echo ""
            python backup_manager.py list
            echo ""
            read -p "Nombre del backup a restaurar: " backup
            python backup_manager.py restore "$backup"
            echo ""
            ;;
        5)
            echo ""
            python backup_manager.py list
            echo ""
            read -p "Nombre del backup a eliminar: " backup
            python backup_manager.py delete "$backup"
            echo ""
            ;;
        6)
            echo "👋 Adiós!"
            exit 0
            ;;
        *)
            echo "❌ Opción inválida"
            echo ""
            ;;
    esac
done
