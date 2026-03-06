#!/bin/bash
# Script de inicio para producción

# Esperar a que la base de datos esté disponible
echo "🔄 Esperando base de datos..."
while ! python -c "from config import Config; import psycopg2; psycopg2.connect(Config.DATABASE_URL)" 2>/dev/null; do
    echo "⏳ Base de datos no disponible, esperando 5 segundos..."
    sleep 5
done

echo "✅ Base de datos conectada"

# Crear tablas si no existen
echo "🔄 Creando/Verificando tablas..."
python -c "from app import create_app; from extensions import db; app = create_app(); app.app_context().push(); db.create_all(); print('✅ Tablas verificadas')"

# Iniciar servidor
echo "🚀 Iniciando servidor Gunicorn..."
exec gunicorn --bind 0.0.0.0:$PORT --workers 4 --timeout 120 app:app
