# 🏠 Family Command Center

Centro de comando familiar todo-en-uno para Barcelona.

## 🚀 Módulos

1. **👨‍👩‍👧‍👦 Family** - Perfiles familiares
2. **🍽️ Menu** - Planificación de menús con IA
3. **🛒 Shopping** - Lista de compras
4. **🧹 Cleaning** - Tareas de limpieza
5. **📅 Calendar** - Integración Google Calendar
6. **📝 Notes** - Integración Google Keep/Tasks
7. **📊 Dashboard** - Vista unificada
8. **📺 TV View** - Pantalla de cocina

## 🛠️ Stack Técnico

- **Backend**: Flask + SQLAlchemy + PostgreSQL
- **Frontend**: HTML + JavaScript vanilla + CSS
- **IA**: Claude (Anthropic)
- **Integraciones**: Google Calendar, Google Tasks

## � Despliegue en Producción (Railway)

### 1. **Preparar el Repositorio**
```bash
git add .
git commit -m "Ready for Railway deployment"
git push origin main
```

### 2. **Configurar Railway**
1. Conectar tu repositorio a Railway
2. Railway detectará automáticamente el proyecto Python
3. Configurar variables de entorno en Railway dashboard:
   - `ANTHROPIC_API_KEY`: sk-ant-api03-... (tu API key de Claude)
   - `GOOGLE_CLIENT_ID`: tu Google Client ID
   - `GOOGLE_CLIENT_SECRET`: tu Google Client Secret
   - `FLASK_ENV`: production
   - `FLASK_DEBUG`: False

### 3. **Base de Datos**
- Railway proporcionará automáticamente PostgreSQL
- La URL se configurará en `DATABASE_URL`
- Las tablas se crearán automáticamente en el primer deploy

### 4. **Dominio Personalizado (Opcional)**
```bash
# Configurar en Railway dashboard
# Actualizar CORS_ORIGINS con tu dominio
CORS_ORIGINS=https://your-domain.railway.app,https://your-domain.com
```

### 5. **Verificar Deploy**
```bash
# Health check
curl https://your-domain.railway.app/health

# Acceder a la aplicación
https://your-domain.railway.app
```

## � Requisitos

- Python 3.8+
- Node.js 16+ (opcional para desarrollo frontend)
- SQLite3 (incluido con Python)

## 🚀 Instalación Rápida

1. **Clonar el repositorio:**
   ```bash
   git clone <repository-url>
   cd family-command-center
   ```

2. **Crear entorno virtual:**
   ```bash
   python -m venv venv
   # Windows
   venv\Scripts\activate
   # Linux/Mac
   source venv/bin/activate
   ```

3. **Instalar dependencias:**
   ```bash
   pip install -r requirements.txt
   ```

4. **Configurar variables de entorno:**
   ```bash
   cp .env.example .env
   # Editar .env con tus API keys y configuración
   ```

5. **Inicializar base de datos:**
   ```bash
   python -c "from app import create_app, db; app = create_app(); app.app_context().push(); db.create_all()"
   ```

6. **Crear datos iniciales:**
   ```bash
   python create_members.py
   python create_settings.py
   ```

7. **Ejecutar aplicación:**
   ```bash
   # Backend (terminal 1)
   python app.py
   
   # Frontend (terminal 2)
   cd frontend
   python -m http.server 5501
   ```

8. **Acceder a la aplicación:**
   - Frontend: http://localhost:5501
   - Backend API: http://localhost:9000

## 🔑 API Keys Configuradas

### Anthropic Claude AI
- **API Key**: Configurar en variables de entorno de Railway
- **Uso**: Generación de menús, recomendaciones familiares, asistencia IA
- **Configurada en**: `.env` → `ANTHROPIC_API_KEY`

### Google Services (Opcional)
- **Client ID**: Por configurar
- **Client Secret**: Por configurar
- **Uso**: Sincronización con Google Calendar y Drive
- **Configurar en**: `.env` → `GOOGLE_CLIENT_ID`, `GOOGLE_CLIENT_SECRET`

## 💾 Sistema de Backup/Restore

### Crear Backups
```bash
# Crear backup con descripción
python backup_manager.py create "Descripción del backup"

# O usar la herramienta interactiva
# Windows
backup_tool.bat

# Linux/Mac
./backup_tool.sh
```

### Gestión de Backups
```bash
# Listar todos los backups
python backup_manager.py list

# Ver información de un backup
python backup_manager.py info backup_20260118_140909

# Restaurar un backup
python backup_manager.py restore backup_20260118_140909

# Eliminar un backup
python backup_manager.py delete backup_20260118_140909
```

### Qué se incluye en los backups:
- ✅ **Base de datos** SQLite completa
- ✅ **Configuración** (.env con API keys)
- ✅ **Código fuente** (backend, frontend, docs)
- ✅ **Archivos importantes** (README, scripts, etc.)
- ✅ **Metadata** con timestamp y descripción

### Backups Automáticos
- **Ubicación**: `/backups/`
- **Formato**: `backup_YYYYMMDD_HHMMSS`
- **Metadata**: JSON con información detallada
- **Restauración**: Sobrescribe archivos actuales

## 📝 Notas de Seguridad

- **⚠️ NUNCA** hacer commit de `.env` con API keys reales
- **🔒** Mantener las API keys en variables de entorno
- **👥** Solo compartir con equipo de desarrollo autorizado
- **🔄** Rotar las keys periódicamente
- **💾** Crear backups antes de cambios grandes

## 🗄️ Base de Datos

PostgreSQL requerido. Schema completo en `docs/database_schema.sql`

## 🔑 APIs Necesarias

1. **Anthropic Claude**
   - Crear cuenta: https://console.anthropic.com/
   - Obtener API key
   
2. **Google Calendar/Tasks**
   - Google Cloud Console: https://console.cloud.google.com/
   - Habilitar APIs
   - Descargar credentials.json

## 📚 Documentación

- [Plan Completo](docs/FAMILY_COMMAND_CENTER_PLAN.md)
- [Código Barcelona](docs/BARCELONA_SPECIFIC_CODE.md)
- [Roadmap](docs/IMPLEMENTATION_ROADMAP.md)
- [Windsurf Guide](docs/WINDSURF_INSTRUCTIONS.md)

## 🎯 Desarrollo con Windsurf

Ver `docs/WINDSURF_INSTRUCTIONS.md` para prompts detallados.

## 👨‍👩‍👧‍👦 Familia

- 3 adultos
- 2 niñas (4 y 12 años)
- Barcelona, España

---

**Creado con ❤️ para organizar la vida familiar**
