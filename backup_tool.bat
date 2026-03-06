@echo off
REM Script de acceso rápido al sistema de backup/restore
REM Family Command Center

echo.
echo ==========================================
echo   🏠 Family Command Center - Backup System
echo ==========================================
echo.

:menu
echo 1. 🔄 Crear Backup
echo 2. 📋 Listar Backups
echo 3. ℹ️  Ver Info Backup
echo 4. 🔄 Restaurar Backup
echo 5. 🗑️  Eliminar Backup
echo 6. 🚪 Salir
echo.
set /p option="Selecciona una opción (1-6): "

if "%option%"=="1" goto create
if "%option%"=="2" goto list
if "%option%"=="3" goto info
if "%option%"=="4" goto restore
if "%option%"=="5" goto delete
if "%option%"=="6" goto exit
echo ❌ Opción inválida
goto menu

:create
echo.
set /p desc="Descripción del backup (opcional): "
if "%desc%"=="" (
    python backup_manager.py create
) else (
    python backup_manager.py create "%desc%"
)
echo.
pause
goto menu

:list
echo.
python backup_manager.py list
echo.
pause
goto menu

:info
echo.
python backup_manager.py list
echo.
set /p backup="Nombre del backup: "
python backup_manager.py info %backup%
echo.
pause
goto menu

:restore
echo.
python backup_manager.py list
echo.
set /p backup="Nombre del backup a restaurar: "
python backup_manager.py restore %backup%
echo.
pause
goto menu

:delete
echo.
python backup_manager.py list
echo.
set /p backup="Nombre del backup a eliminar: "
python backup_manager.py delete %backup%
echo.
pause
goto menu

:exit
echo 👋 Adiós!
exit /b 0
