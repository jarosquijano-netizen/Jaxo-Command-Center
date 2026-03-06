# 🚀 Quick Start - Family Command Center

## 📋 Pasos para Empezar

### 1. Abrir en Windsurf

```bash
# Abrir carpeta en Windsurf
cd /ruta/a/family-command-center
windsurf .
```

### 2. Configurar Python

```bash
# Crear entorno virtual
python -m venv venv

# Activar entorno virtual
# Windows:
venv\Scripts\activate
# Linux/Mac:
source venv/bin/activate

# Instalar dependencias
pip install -r backend/requirements.txt
```

### 3. Configurar Base de Datos

```bash
# Instalar PostgreSQL
# Windows: Descargar de https://www.postgresql.org/download/
# Mac: brew install postgresql
# Linux: sudo apt install postgresql

# Crear base de datos
psql -U postgres
CREATE DATABASE family_command_center;
\q
```

### 4. Configurar Variables de Entorno

```bash
# Copiar archivo de ejemplo
cp .env.example .env

# Editar .env con tus credenciales
# - DATABASE_URL
# - ANTHROPIC_API_KEY
# - SECRET_KEY (generar con: python -c "import secrets; print(secrets.token_hex(32))")
```

### 5. Ejecutar Backend

```bash
cd backend
python app.py
```

Deberías ver:
```
╔════════════════════════════════════════════╗
║   🏠 Family Command Center                ║
║   Servidor corriendo en:                  ║
║   http://localhost:9000                   ║
╚════════════════════════════════════════════╝
```

### 6. Abrir Frontend

Opción 1: Abrir directamente
```bash
# Abrir frontend/index.html en navegador
open frontend/index.html  # Mac
start frontend/index.html  # Windows
```

Opción 2: Con Live Server (recomendado)
- Instalar extensión "Live Server" en Windsurf/VS Code
- Click derecho en `frontend/index.html` → "Open with Live Server"

---

## 🎯 Empezar Desarrollo con Windsurf

### PROMPT INICIAL

Copia este prompt en Windsurf:

```
Hola, voy a construir el Family Command Center desde cero.

Tengo la estructura base del proyecto creada con:
- Backend: Flask con carpetas models/, routes/, services/
- Frontend: HTML/CSS/JS vanilla
- Docs: Toda la documentación en docs/

PRIMERA TAREA:
Implementa el modelo FamilyMember en backend/models/family.py

Usa el schema SQL de docs/database_schema.sql como referencia.

Requisitos:
- SQLAlchemy model
- Todas las columnas del schema
- Type hints
- Método to_dict()
- Docstrings en español

¿Listo para empezar?
```

### ORDEN DE DESARROLLO RECOMENDADO

1. **Día 1**: Modelos + Base de Datos
   - Implementar todos los models
   - Crear schema en PostgreSQL
   - Probar conexiones

2. **Día 2-3**: Módulo Family
   - Routes de Family
   - Frontend de Family
   - CRUD completo

3. **Día 4-5**: Servicio AI + Settings
   - ai_service.py con Claude
   - Settings routes + frontend
   - Probar generación de menú

4. **Día 6-8**: Módulo Menu
   - Menu routes
   - Menu frontend
  ## 🔑 Configuración de API Keys

1. **Anthropic Claude** (para generación de menús):
   ```bash
   # Configurar tu API key en .env
   ANTHROPIC_API_KEY=tu-api-key-aqui
   ```

2. **Google Services** (opcional, para Calendar/Drive):
   ```bash
   # Obtener de Google Cloud Console
   GOOGLE_CLIENT_ID=your-client-id.apps.googleusercontent.com
   GOOGLE_CLIENT_SECRET=your-client-secret
   ```
   - Integración con IA

5. **Día 8-9**: Shopping List
   - Shopping routes + frontend
   - Auto-generación desde menú

6. **Día 9-11**: Módulo Cleaning
   - Cleaning routes + frontend
   - Distribución inteligente

7. **Día 11-13**: Integraciones Google
   - Google Calendar
   - Google Tasks
   - OAuth flow

8. **Día 13-15**: Dashboard y TV View
   - Dashboard unificado
   - Vista TV optimizada
   - Polish final

## 💾 Sistema de Backup/Restore

### Uso Rápido
```bash
# Crear backup antes de cambios importantes
python backup_manager.py create "Antes de implementar módulo Menu"

# Listar backups disponibles
python backup_manager.py list

# Restaurar si algo sale mal
python backup_manager.py restore backup_20260118_140909

# Herramienta interactiva (recomendado)
backup_tool.bat  # Windows
./backup_tool.sh # Linux/Mac
```

### Buenas Prácticas
- ✅ **Crear backup** antes de cambios grandes
- ✅ **Describir claramente** cada backup
- ✅ **Restaurar** solo si es necesario
- ✅ **Eliminar** backups antiguos periódicamente

---

## 📚 Documentación Disponible

- `docs/FAMILY_COMMAND_CENTER_PLAN.md` - Plan técnico completo
- `docs/BARCELONA_SPECIFIC_CODE.md` - Código específico Barcelona
- `docs/IMPLEMENTATION_ROADMAP.md` - Roadmap detallado
- `docs/WINDSURF_INSTRUCTIONS.md` - **Prompts listos para Windsurf**

---

## 🆘 Problemas Comunes

### "ModuleNotFoundError: No module named 'flask'"
```bash
# Verifica que el venv está activado
# Reinstala dependencias
pip install -r backend/requirements.txt
```

### "FATAL: database does not exist"
```bash
# Crear base de datos
psql -U postgres -c "CREATE DATABASE family_command_center;"
```

### Backend no arranca
```bash
# Verificar .env
cat .env
# Debe tener DATABASE_URL correcto
```

---

## ✅ Checklist Pre-Desarrollo

- [ ] Python 3.9+ instalado
- [ ] PostgreSQL instalado y corriendo
- [ ] Entorno virtual creado
- [ ] Dependencias instaladas
- [ ] .env configurado
- [ ] Backend arranca sin errores
- [ ] Frontend se abre en navegador
- [ ] Windsurf abierto en la carpeta del proyecto

---

**¡Listo para empezar! 🚀**

Abre Windsurf, carga el prompt inicial y comienza a construir.
