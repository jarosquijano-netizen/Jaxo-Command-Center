# 🌊 Guía Windsurf - Family Command Center

Instrucciones completas para usar Windsurf AI para implementar el Family Command Center.

---

## 📋 Índice

1. [Setup Inicial en Windsurf](#setup-inicial)
2. [Prompt Maestro Inicial](#prompt-maestro-inicial)
3. [Prompts por Fase](#prompts-por-fase)
4. [Flujo de Trabajo Recomendado](#flujo-de-trabajo)
5. [Tips y Mejores Prácticas](#tips-y-mejores-prácticas)
6. [Comandos Útiles](#comandos-útiles)

---

## 🚀 Setup Inicial en Windsurf

### 1. Preparar el Proyecto

```bash
# 1. Abrir proyecto existente en Windsurf
cd /ruta/a/JAXOKITCHEN
windsurf .

# 2. Crear branch de desarrollo
git checkout -b feature/family-command-center

# 3. Crear carpetas para nueva funcionalidad
mkdir -p modules/cleaning
mkdir -p modules/calendar  
mkdir -p modules/tasks
mkdir -p static/js/widgets
mkdir -p templates/widgets
mkdir -p tests/integration
```

### 2. Configurar Contexto en Windsurf

**Archivos importantes a tener abiertos:**
- `FAMILY_COMMAND_CENTER_PLAN.md` (referencia principal)
- `BARCELONA_SPECIFIC_CODE.md` (código específico)
- `IMPLEMENTATION_ROADMAP.md` (guía de fases)
- `app.py` (tu servidor Flask actual)
- `database.py` (tu capa de datos actual)

### 3. Configurar .windsurfignore (si existe)

```
# .windsurfignore
venv/
__pycache__/
*.pyc
.env
*.db
node_modules/
.git/
```

---

## 🎯 Prompt Maestro Inicial

**Cómo usar:** Copiar este prompt completo en el chat de Windsurf al inicio del proyecto.

```
# CONTEXTO DEL PROYECTO

Soy el desarrollador de k[AI]tchen, una aplicación Flask existente para planificación de menús familiares con IA. Quiero expandirla a un Family Command Center completo.

## MI SITUACIÓN ACTUAL
- Proyecto: k[AI]tchen (Flask + PostgreSQL + Google AI Studio)
- Deployed en: Railway
- Stack: Python, Flask, SQLite/PostgreSQL, JavaScript vanilla
- Familia: 5 miembros (3 adultos, 2 niñas de 4 y 12 años)
- Ubicación: Barcelona, España

## OBJETIVO
Expandir k[AI]tchen añadiendo:
1. 🧹 Sistema de limpieza semanal con rotación automática
2. 📅 Integración con Google Calendar (múltiples calendarios)
3. ✅ Integración con Google Tasks
4. 📊 Dashboard unificado con vista TV

## LO QUE YA TENGO
- Sistema de menús con IA funcionando
- Base de datos con perfiles familiares
- Extractor de recetas
- Vista TV básica
- Deploy en Railway con PostgreSQL

## DOCUMENTACIÓN DISPONIBLE
Tengo 3 documentos completos con TODO el código y arquitectura:
- FAMILY_COMMAND_CENTER_PLAN.md (plan completo)
- BARCELONA_SPECIFIC_CODE.md (código específico)
- IMPLEMENTATION_ROADMAP.md (guía de implementación)

## PRIMERA FASE (PRIORIDAD)
Quiero empezar con el Sistema de Limpieza porque:
- No requiere APIs externas
- Más fácil de implementar
- Valor inmediato para la familia
- Baja complejidad

## TU ROL
Eres mi asistente de desarrollo experto en Flask, Python, y arquitectura de aplicaciones. 

Necesito que:
1. Revises mi código actual (app.py, database.py)
2. Me ayudes a implementar módulo por módulo
3. Sigas las mejores prácticas de Flask
4. Mantengas la arquitectura existente
5. Escribas código production-ready
6. Incluyas tests

## ESTILO DE CÓDIGO
- Python: PEP 8, type hints, docstrings
- JavaScript: ES6+, const/let, comentarios en español
- SQL: PostgreSQL compatible
- Nombres de variables en español para lógica de negocio

## PRIMERA TAREA
Ayúdame a implementar el módulo de limpieza (Fase 1) siguiendo el plan en FAMILY_COMMAND_CENTER_PLAN.md.

Empecemos por:
1. Crear las tablas de base de datos necesarias
2. Implementar cleaning_manager.py
3. Añadir endpoints a app.py

¿Listo para empezar?
```

---

## 📝 Prompts por Fase

### FASE 1: Cleaning Module

#### Prompt 1.1: Base de Datos

```
Necesito crear las tablas de base de datos para el módulo de limpieza.

CONTEXTO:
- Ya tengo una clase Database en database.py que soporta SQLite y PostgreSQL
- Método init_database() que crea tablas con CREATE TABLE IF NOT EXISTS

NECESITO:
Añadir estas 3 tablas al método init_database():
1. cleaning_tasks (plantillas de tareas)
2. cleaning_schedule (asignaciones semanales)
3. family_members (miembros de la familia)

ESQUEMA:
Usa el esquema definido en FAMILY_COMMAND_CENTER_PLAN.md - Fase 3

REQUISITOS:
- Compatible con SQLite Y PostgreSQL
- Foreign keys correctas
- Índices en columnas frecuentes (week_start_date, day_of_week)
- Defaults apropiados

Por favor:
1. Muéstrame el código SQL para las 3 tablas
2. Modifica database.py para añadir las tablas
3. Crea un método para poblar family_members con los 5 miembros de mi familia
```

#### Prompt 1.2: CleaningManager

```
Necesito implementar la clase CleaningManager que gestiona tareas de limpieza.

UBICACIÓN: modules/cleaning/cleaning_manager.py

FUNCIONALIDAD REQUERIDA:
1. Crear plantillas de tareas (create_task_template)
2. Generar horario semanal automático (generate_weekly_schedule)
3. Distribuir tareas entre miembros (distribute_tasks)
4. Marcar tareas completadas (mark_completed)
5. Obtener horario de la semana (get_week_schedule)

CONTEXTO:
- Familia de 5: 3 adultos + 2 niñas (4 y 12 años)
- Niña de 4 puede hacer tareas simples
- Niña de 12 puede hacer más tareas
- Adultos pueden hacer todas las tareas
- Rotación equitativa

REFERENCIA:
Usa el código en BARCELONA_SPECIFIC_CODE.md como base.

REQUISITOS:
- Type hints en todas las funciones
- Docstrings en español
- Manejo de errores
- Logging apropiado

Por favor implementa CleaningManager completo.
```

#### Prompt 1.3: Endpoints API

```
Necesito añadir endpoints API para el módulo de limpieza a app.py.

ENDPOINTS NECESARIOS:

GET /api/cleaning/tasks
- Obtener todas las plantillas de tareas

POST /api/cleaning/tasks
- Crear nueva plantilla de tarea

GET /api/cleaning/schedule/week?week_start=YYYY-MM-DD
- Obtener horario de una semana específica

POST /api/cleaning/schedule/generate
- Generar horario para la semana actual

POST /api/cleaning/task/<id>/complete
- Marcar tarea como completada

GET /api/cleaning/members
- Obtener miembros de la familia

FORMATO DE RESPUESTA:
{
  "success": true,
  "data": {...},
  "error": "mensaje si hay error"
}

REQUISITOS:
- Seguir patrón de endpoints existentes en app.py
- Manejo de errores con try/except
- Return JSON con códigos HTTP apropiados
- Validación de datos de entrada

Por favor añade estos endpoints a app.py.
```

#### Prompt 1.4: Frontend Widget

```
Necesito crear el widget de limpieza para el frontend.

UBICACIÓN: static/js/widgets/cleaning_widget.js

FUNCIONALIDAD:
- Cargar horario semanal
- Mostrar tareas agrupadas por día
- Permitir marcar tareas completadas
- Regenerar horario de la semana
- Mostrar progreso visual

DISEÑO:
- Usar CSS de barcelona_theme.css
- Checkbox para completar tareas
- Indicador visual de quién está asignado
- Tiempo estimado por tarea
- Colores por prioridad

INTEGRACIÓN:
- Debe integrarse en index.html como nueva pestaña
- Usar fetchAPI() existente para llamadas
- Patrón similar a menu_widget

REFERENCIA:
Ver código en FAMILY_COMMAND_CENTER_PLAN.md - Fase 3

Por favor implementa el widget completo.
```

#### Prompt 1.5: Cargar Datos Default

```
Necesito un script para cargar las tareas de limpieza por defecto.

ARCHIVO: scripts/load_barcelona_cleaning_defaults.py

TAREAS DEFAULT:
Usar las plantillas en BARCELONA_SPECIFIC_CODE.md que incluyen:
- Tareas diarias (cocina, fregar platos, ordenar, basura)
- Tareas semanales (baños, aspirar, sábanas, ventanas)
- Tareas mensuales (limpieza profunda)

MIEMBROS DE FAMILIA:
- 3 adultos (pueden todo)
- Niña 12 años (puede tareas medias)
- Niña 4 años (solo tareas simples)

FUNCIONALIDAD:
1. Crear 5 miembros de familia
2. Crear ~12 plantillas de tareas
3. Generar horario para semana actual

El script debe:
- Verificar si ya existen datos
- Ser idempotente (ejecutable múltiples veces)
- Imprimir progreso

Por favor crea el script completo.
```

---

### FASE 2: Dashboard Unificado

#### Prompt 2.1: Dashboard Backend

```
Necesito crear el endpoint del dashboard que agregue datos de todos los módulos.

ENDPOINT: GET /api/dashboard/data

DEBE RETORNAR:
{
  "success": true,
  "data": {
    "calendar": [...],      // Eventos de hoy (cuando tengamos Calendar)
    "menu": {...},          // Menú de hoy (ya existe)
    "tasks": [...],         // Tareas pendientes (cuando tengamos Tasks)
    "cleaning": [...],      // Tareas de limpieza de hoy
    "week_start": "2026-01-13",
    "last_updated": "2026-01-13T10:30:00"
  }
}

FUNCIONES HELPER:
- get_today_menu() - Del menú existente
- get_today_cleaning_tasks() - De CleaningManager
- get_today_events() - Placeholder para Calendar
- get_pending_tasks() - Placeholder para Tasks

REQUISITOS:
- Cache de 5 minutos opcional
- Manejo de errores si algún módulo falla
- No bloquear si un módulo no responde

Por favor implementa el endpoint con helpers.
```

#### Prompt 2.2: Dashboard Frontend

```
Necesito crear el dashboard frontend que muestre todos los módulos.

UBICACIÓN: static/js/dashboard.js

CLASE: Dashboard
MÉTODOS:
- init() - Inicializar
- loadData() - Cargar de API
- setupAutoRefresh() - Actualizar cada 5 min
- render() - Renderizar todo
- renderCalendarWidget() - Widget calendario
- renderMenuWidget() - Widget menú
- renderTasksWidget() - Widget tareas
- renderCleaningWidget() - Widget limpieza

CARACTERÍSTICAS:
- Auto-refresh cada 5 minutos
- Loading indicators
- Error handling
- Responsive design
- Click para ver detalle

DISEÑO:
- Grid de 3 columnas en desktop
- Stack en mobile
- Usar barcelona_theme.css

REFERENCIA:
Ver código completo en FAMILY_COMMAND_CENTER_PLAN.md - Fase 4

Por favor implementa la clase Dashboard completa.
```

#### Prompt 2.3: Template Dashboard

```
Necesito crear el template HTML para el dashboard.

UBICACIÓN: templates/dashboard.html

ESTRUCTURA:
- Header con título y fecha
- Grid de 3 widgets: Calendar, Menu, Tasks
- Widget full-width: Cleaning de hoy
- Footer con botón "Modo TV" y última actualización

WIDGETS:
Cada widget debe tener:
- Título con icono
- Contenido dinámico (cargado por JS)
- Link "Ver completo" al módulo específico
- Loading placeholder

RESPONSIVE:
- Desktop: 3 columnas
- Tablet: 2 columnas
- Mobile: 1 columna

ESTILO:
- Usar barcelona_theme.css
- Glassmorphism effects
- Sombras y bordes redondeados
- Colores inspirados en Barcelona

Por favor crea el template completo.
```

#### Prompt 2.4: Vista TV Mejorada

```
Necesito mejorar la vista TV existente para incluir todos los módulos.

ARCHIVO: templates/tv_dashboard.html

MEJORAS NECESARIAS:
1. Añadir widget de limpieza
2. Mejorar diseño visual
3. Optimizar para pantallas 55"+ 
4. Auto-refresh cada 5 minutos
5. Indicadores visuales claros

LAYOUT:
┌──────────────────────────────────────┐
│         Family Command Center        │
│         Fecha grande y clara         │
├──────────────────────────────────────┤
│  📅 Hoy  │  🍳 Menú  │  ✅ Tareas   │
│          │           │              │
├──────────────────────────────────────┤
│     🧹 Limpieza de Hoy (grande)     │
└──────────────────────────────────────┘

FUENTES:
- Mínimo 2rem para texto normal
- 4rem+ para títulos
- Peso bold para destacar

COLORES:
- Alto contraste
- Fondo degradado
- Widgets con glassmorphism

Por favor modifica tv_dashboard.html con estas mejoras.
```

---

### FASE 3: Google Calendar Integration

#### Prompt 3.1: Setup Google OAuth

```
Necesito configurar Google OAuth para Calendar API.

PASOS QUE YA HE HECHO:
1. Creado proyecto en Google Cloud Console
2. Habilitado Calendar API
3. Descargado credentials.json (está en la raíz)

NECESITO:
Implementar el flujo de autenticación OAuth 2.0.

ARCHIVOS A CREAR:
1. modules/calendar/calendar_sync.py
   - Clase CalendarSync
   - authenticate() method
   - get_auth_url() method
   - complete_auth(code) method

2. endpoints en app.py:
   - /api/google/auth/start
   - /api/google/auth/callback

FLUJO:
1. Usuario click "Conectar Google Calendar"
2. Redirect a Google OAuth
3. Google redirect a callback
4. Guardar token.pickle
5. Verificar autenticación

REQUISITOS:
- Token almacenado en ~/.kaitchen/tokens/
- Refresh automático de token expirado
- Scopes: calendar.readonly, tasks

REFERENCIA:
Código completo en FAMILY_COMMAND_CENTER_PLAN.md - Fase 1

Por favor implementa el sistema de autenticación.
```

#### Prompt 3.2: Calendar Sync

```
Ya tengo la autenticación OAuth funcionando.

Ahora necesito implementar la sincronización de calendarios.

CLASE: CalendarSync (en modules/calendar/calendar_sync.py)

MÉTODOS NECESARIOS:
1. get_family_calendars()
   - Listar todos los calendarios disponibles

2. get_week_events(calendar_ids, week_start)
   - Obtener eventos de múltiples calendarios
   - Para una semana específica

3. get_today_events(calendar_ids)
   - Solo eventos de hoy
   - Ordenados por hora

ENDPOINT: GET /api/calendar/week?calendar_ids=id1,id2&week_start=YYYY-MM-DD

CACHE:
- Cachear resultados 5 minutos
- Tabla: calendar_cache

REQUISITOS:
- Manejar múltiples calendarios
- Manejar eventos todo el día
- Timezone Barcelona (Europe/Madrid)
- Formatear fechas en español

Por favor implementa la sincronización.
```

---

## 🔄 Flujo de Trabajo Recomendado

### Método Iterativo

```
1. PROMPT ESPECÍFICO
   ↓
2. WINDSURF GENERA CÓDIGO
   ↓
3. REVISAR CÓDIGO
   ↓
4. PROBAR MANUALMENTE
   ↓
5. PEDIR AJUSTES SI NECESARIO
   ↓
6. COMMIT
   ↓
7. SIGUIENTE PROMPT
```

### Ejemplo de Conversación Completa

**Tú:**
```
Implementa el método generate_weekly_schedule() en CleaningManager
```

**Windsurf:**
```python
def generate_weekly_schedule(self, week_start: str):
    # código generado
```

**Tú:**
```
Bien, pero necesito que:
1. Las niñas solo reciban tareas apropiadas para su edad
2. La distribución sea más equitativa
3. Añadas logging para debug
```

**Windsurf:**
```python
# código mejorado con ajustes
```

**Tú:**
```
Perfecto. Ahora crea el test unitario para este método.
```

**Windsurf:**
```python
# test generado
```

**Tú:**
```
Excelente. Commit y siguiente paso.
```

---

## 💡 Tips y Mejores Prácticas

### 1. Sé Específico y Contextual

❌ **Mal:**
```
Crea el módulo de limpieza
```

✅ **Bien:**
```
Crea la clase CleaningManager en modules/cleaning/cleaning_manager.py.

Debe tener estos métodos:
- generate_weekly_schedule(week_start: str) -> List[Dict]
- distribute_tasks(tasks, members, week_start) -> List[Dict]

Usa la Database existente en self.db.
Referencia: BARCELONA_SPECIFIC_CODE.md líneas 50-150
```

### 2. Proporciona Contexto de Arquitectura

```
CONTEXTO DE MI PROYECTO:
- app.py: Servidor Flask principal
- database.py: Capa de datos con clase Database
- Patrón: Repository pattern
- Ya existen endpoints en /api/adults, /api/recipes, etc.
- Formato de respuesta JSON estándar: {success, data, error}

NUEVA FUNCIONALIDAD:
[Tu request aquí]
```

### 3. Referencia Documentación

```
Necesito implementar X.

Sigue la arquitectura descrita en FAMILY_COMMAND_CENTER_PLAN.md
Usa el código de ejemplo en BARCELONA_SPECIFIC_CODE.md
Mantén el estilo de mi app.py actual
```

### 4. Pide Tests Inmediatamente

```
Acabas de crear CleaningManager.

Ahora:
1. Crea tests/test_cleaning_manager.py
2. Tests para cada método público
3. Usa pytest
4. Mock la Database
```

### 5. Itera Rápidamente

```
# Primera versión
"Implementa X básico"

# Mejora
"Bien, ahora añade validación de datos"

# Refinamiento
"Añade logging y manejo de errores"

# Test
"Crea tests unitarios"

# Listo
"Commit con mensaje: 'feat: añadir módulo X'"
```

### 6. Usa Comandos de Windsurf

```
# Ver archivos modificados
/files

# Ver diffs
/diff app.py

# Ejecutar comando
/run python test_cleaning.py

# Ver estructura
/tree modules/

# Buscar en proyecto
/search "def generate_weekly"
```

---

## 🎯 Prompts de Debugging

### Cuando algo no funciona

```
PROBLEMA:
[Describe el error específico]

ERROR:
[Pega el traceback completo]

LO QUE INTENTÉ:
[Lo que ya probaste]

CONTEXTO:
- Usando Flask 3.0
- PostgreSQL en Railway
- Python 3.11

NECESITO:
Ayúdame a debuggear y resolver esto.
```

### Para Refactoring

```
CÓDIGO ACTUAL:
[Pega código que quieres mejorar]

PROBLEMAS:
- Muy largo (>100 líneas)
- Lógica duplicada
- Sin type hints

NECESITO:
Refactoriza esto siguiendo:
- Principio de responsabilidad única
- Type hints
- Docstrings
- Máximo 50 líneas por función
```

### Para Optimización

```
FUNCIÓN LENTA:
[Código]

PROFILING:
- Toma 5 segundos
- Ejecuta 1000+ queries

NECESITO:
Optimizar para:
- < 500ms
- Máximo 10 queries
- Usar cache si necesario
```

---

## 📋 Checklist de Cada Módulo

Usa este checklist después de implementar cada módulo:

```
## Módulo: [Nombre]

### Backend
- [ ] Clases/funciones implementadas
- [ ] Type hints en todas las funciones
- [ ] Docstrings completos
- [ ] Endpoints API creados
- [ ] Validación de datos
- [ ] Manejo de errores
- [ ] Logging apropiado

### Base de Datos
- [ ] Tablas creadas
- [ ] Índices añadidos
- [ ] Foreign keys correctas
- [ ] Migrations documentadas

### Frontend
- [ ] Widget implementado
- [ ] Integrado en UI principal
- [ ] Loading states
- [ ] Error handling
- [ ] Responsive design

### Tests
- [ ] Tests unitarios (>80% coverage)
- [ ] Tests de integración
- [ ] Tests manuales pasados

### Documentación
- [ ] README actualizado
- [ ] API documentada
- [ ] Comentarios en código complejo

### Deploy
- [ ] Probado en local
- [ ] Committed a git
- [ ] Deployed a staging
- [ ] Verificado en producción
```

---

## 🚀 Prompts de "Quick Wins"

### Prompt: Análisis Rápido

```
Analiza mi código actual (app.py, database.py) y dime:
1. Qué estructura sigue
2. Qué patrones usa
3. Qué best practices ya tiene
4. Qué puedo mejorar
5. Cómo integrar el nuevo módulo sin romper nada

Dame un resumen ejecutivo.
```

### Prompt: Generar Estructura

```
Genera toda la estructura de carpetas y archivos vacíos para el módulo de limpieza.

Incluye:
- modules/cleaning/__init__.py
- modules/cleaning/cleaning_manager.py
- modules/cleaning/barcelona_defaults.py
- static/js/widgets/cleaning_widget.js
- templates/widgets/cleaning.html
- tests/test_cleaning_manager.py
- tests/test_cleaning_api.py

Con comentarios TODO de qué va en cada archivo.
```

### Prompt: Migración de DB

```
Crea un script de migración (migrations/001_add_cleaning.sql) que:
1. Añada las 3 tablas nuevas
2. Sea compatible con SQLite Y PostgreSQL
3. Sea idempotente (ejecutable múltiples veces)
4. No borre datos existentes

Y un script Python (migrate.py) que lo ejecute.
```

### Prompt: Tests Automáticos

```
Crea un test suite completo para CleaningManager.

Tests necesarios:
- test_create_task_template
- test_generate_weekly_schedule
- test_distribute_tasks_equitably
- test_mark_completed
- test_handles_invalid_dates
- test_age_appropriate_tasks

Usa pytest fixtures para DB y datos de prueba.
```

---

## 🎨 Prompts de UI/UX

### Prompt: Componente Visual

```
Crea un componente visual para mostrar el progreso de limpieza de la semana.

DISEÑO:
- Barra de progreso por día
- Color verde si completado >80%
- Color amarillo si 50-80%
- Color rojo si <50%
- Tooltips con detalles al hover

TECNOLOGÍA:
- JavaScript vanilla
- CSS con variables CSS de barcelona_theme.css
- Animaciones suaves

INTEGRACIÓN:
- Debe insertarse en #cleaning-progress
- Actualizar cada vez que se marca tarea completada
```

### Prompt: Responsive Layout

```
Tengo este layout de dashboard que funciona en desktop.

[Pega código HTML/CSS]

Hazlo responsive para:
- Mobile (<768px): 1 columna
- Tablet (768-1024px): 2 columnas
- Desktop (>1024px): 3 columnas
- TV (>1920px): 3 columnas con fuentes más grandes

Usa CSS Grid y mantén barcelona_theme.css
```

---

## 🔧 Prompts de Configuración

### Prompt: Environment Setup

```
Necesito configurar las variables de entorno para producción.

ARCHIVO: .env.production

VARIABLES:
- ANTHROPIC_API_KEY (ya tengo)
- GOOGLE_CLIENT_ID (nuevo)
- GOOGLE_CLIENT_SECRET (nuevo)
- DATABASE_URL (Railway lo provee)
- SECRET_KEY (nuevo)

Genera:
1. .env.example con placeholders
2. Script que valide que todas las variables están
3. Documentación de cómo obtener cada una
```

### Prompt: Railway Config

```
Necesito configurar Railway para el nuevo módulo de Calendar.

NUEVO:
- Variables: GOOGLE_CLIENT_ID, GOOGLE_CLIENT_SECRET
- Archivo credentials.json no debe commitirse
- Token.pickle debe persistir entre deploys

Genera:
1. railway.toml actualizado
2. .gitignore actualizado
3. Instrucciones de qué configurar en Railway dashboard
```

---

## 📊 Prompts de Análisis

### Prompt: Análisis de Performance

```
Analiza el performance de mi endpoint /api/dashboard/data

CÓDIGO:
[Pega código]

PROBLEMAS:
- Toma 3 segundos
- Hace múltiples queries seriales

NECESITO:
1. Identificar bottlenecks
2. Sugerir optimizaciones
3. Implementar las top 3 mejoras
4. Target: <500ms
```

### Prompt: Code Review

```
Haz un code review de mi CleaningManager.

CÓDIGO:
[Pega código]

REVISA:
1. Legibilidad
2. Mantenibilidad
3. Performance
4. Seguridad
5. Best practices Python/Flask

Dame un informe con:
- Issues críticos
- Sugerencias de mejora
- Refactoring recomendado
```

---

## 🎓 Prompts de Aprendizaje

### Prompt: Explicación Técnica

```
Explícame cómo funciona Google OAuth 2.0 en mi contexto.

ESPECÍFICAMENTE:
- Flujo completo paso a paso
- Qué es credentials.json
- Qué es token.pickle
- Por qué necesito refresh tokens
- Cómo manejar expiración

Y luego ayúdame a implementarlo.
```

### Prompt: Mejores Prácticas

```
¿Cuáles son las mejores prácticas para integrar Google Calendar API en Flask?

Necesito saber:
1. Arquitectura recomendada
2. Caching strategy
3. Error handling
4. Rate limiting
5. Testing

Luego implementémoslas en mi proyecto.
```

---

## 🚨 Prompts de Emergencia

### Si algo se rompe

```
URGENTE: Mi app dejó de funcionar después de añadir X.

ERROR:
[Traceback completo]

ÚLTIMO CAMBIO:
[Qué añadiste/modificaste]

NECESITO:
1. Identificar qué se rompió
2. Rollback si necesario
3. Fix inmediato
4. Prevenir que pase de nuevo

Estado del servidor: [local/Railway]
```

### Si deployment falla

```
Mi deploy a Railway falló.

LOGS:
[Pega logs de Railway]

BUILD COMMAND: pip install -r requirements.txt && python init.py
START COMMAND: gunicorn app:app

NECESITO:
- Identificar por qué falló
- Fix para que el deploy funcione
- Verificación de que todo funciona post-deploy
```

---

## ✅ Checklist Final de Proyecto

Después de completar todas las fases:

```
Windsurf, por favor verifica que mi proyecto tiene:

## Código
- [ ] Módulos implementados y funcionando
- [ ] Tests con >80% coverage
- [ ] Type hints en todas las funciones
- [ ] Docstrings completos
- [ ] Manejo de errores robusto
- [ ] Logging apropiado

## Base de Datos
- [ ] Todas las tablas creadas
- [ ] Índices optimizados
- [ ] Migrations documentadas
- [ ] Seed data scripts

## API
- [ ] Todos los endpoints documentados
- [ ] Validación de datos
- [ ] Error responses consistentes
- [ ] Rate limiting (si necesario)

## Frontend
- [ ] Responsive design
- [ ] Loading states
- [ ] Error handling
- [ ] Auto-refresh configurado
- [ ] Vista TV optimizada

## Deployment
- [ ] Variables de entorno configuradas
- [ ] Railway deployment exitoso
- [ ] Health check funcionando
- [ ] HTTPS habilitado
- [ ] Backups configurados

## Documentación
- [ ] README actualizado
- [ ] API documentada
- [ ] Setup instructions claras
- [ ] Troubleshooting guide

Genera un reporte con checkmarks ✓ o ✗ para cada item.
```

---

## 🎉 Celebración

### Cuando completes cada fase

```
¡Completamos la Fase X!

Windsurf, por favor:
1. Resume lo que implementamos
2. Lista los archivos creados/modificados
3. Genera el commit message apropiado
4. Sugiere tag de git para la versión
5. ¿Qué sigue en la siguiente fase?

Y celebremos con un emoji apropiado 🎊
```

---

## 💾 Guardar para Futuro

### Prompt: Generar Documentación

```
Genera documentación completa de lo que acabamos de implementar.

FORMATO: Markdown

SECCIONES:
1. Qué implementamos
2. Cómo funciona
3. API endpoints
4. Cómo usar
5. Ejemplos de código
6. Troubleshooting común

AUDIENCIA: Yo mismo en 6 meses cuando lo olvide todo

Guárdalo en: docs/CLEANING_MODULE.md
```

---

## 🎯 Prompt Final Maestro

**Cuando estés listo para empezar TODO el proyecto:**

```
Hola Windsurf,

Vamos a implementar el Family Command Center completo para mi aplicación k[AI]tchen.

CONTEXTO COMPLETO:
- Proyecto Flask existente: k[AI]tchen
- Ubicación: Barcelona, España
- Familia: 5 personas (3 adultos, 2 niñas 4 y 12 años)
- Ya funciona: Menús con IA, recetas, vista TV
- Deploy: Railway con PostgreSQL

DOCUMENTACIÓN:
Tengo 3 docs completos con TODO el código:
1. FAMILY_COMMAND_CENTER_PLAN.md
2. BARCELONA_SPECIFIC_CODE.md
3. IMPLEMENTATION_ROADMAP.md

PLAN:
Vamos a implementar en 4 fases:
1. Cleaning Module (2 semanas)
2. Dashboard Unificado (2 semanas)
3. Google Calendar (2 semanas)
4. Google Tasks (1 semana)

MI COMPROMISO:
- Probaré todo lo que generes
- Haré commit cada milestone
- Daré feedback claro

TU COMPROMISO:
- Código production-ready
- Tests incluidos
- Documentación clara
- Seguir mis convenciones

EMPECEMOS:
Fase 1, Día 1: Crear tablas de base de datos para cleaning module.

¿Listo? Dame el SQL.
```

---

## 📚 Recursos Adicionales

### Comandos Git con Windsurf

```bash
# Windsurf puede ayudar con git
/git status
/git diff
/git commit -m "feat: add cleaning module"

# También puedes preguntar:
"¿Qué archivos he modificado?"
"Genera un buen commit message para mis cambios"
"¿Hay conflictos en mi branch?"
```

### Testing con Windsurf

```bash
# Windsurf puede ejecutar tests
/run pytest tests/test_cleaning.py -v

# Y luego:
"Los tests fallan. ¿Por qué?"
"Fix el test que falló"
"Añade más tests para cubrir edge cases"
```

---

## 🎁 Bonus: Prompts Creativos

### Gamificación

```
Añade gamificación al módulo de limpieza:
- Puntos por tareas completadas
- Racha de días consecutivos
- Tabla de líderes familiar
- Badges por achievements

Hazlo divertido para las niñas.
```

### Features Futuras

```
Brainstorm: ¿Qué otras features podríamos añadir al Family Command Center?

Considera:
- Nuestra vida en Barcelona
- Familia de 5
- Niñas de 4 y 12
- Ambos padres trabajan

Dame 10 ideas innovadoras y factibles.
```

---

## ✨ Resumen

**Para usar Windsurf efectivamente:**

1. **Empieza con el Prompt Maestro** ⬆️
2. **Sé específico** en cada request
3. **Proporciona contexto** siempre
4. **Itera rápidamente** - no busques perfección en primera versión
5. **Prueba inmediatamente** cada cosa que genere
6. **Pide tests** junto con código
7. **Documenta** según avanzas
8. **Commit frecuentemente** cada milestone pequeño

**Flujo ideal:**
```
Prompt específico → Código generado → Probar → Ajustar → Test → Commit → Siguiente
```

---

¡Éxito con tu Family Command Center! 🏠✨

Con Windsurf y estos prompts, deberías poder implementar todo en 6-9 semanas trabajando constante pero tranquilo.

**Next step:** Copia el "Prompt Maestro Inicial" en Windsurf y ¡comienza!
