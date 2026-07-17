# Imagen oficial de Playwright: trae Chromium + TODAS las dependencias de
# sistema ya instaladas y funcionando (evita el infierno de libs de nix/apt).
# La versión debe coincidir con playwright en requirements.txt (1.44.0).
FROM mcr.microsoft.com/playwright/python:v1.44.0-jammy

WORKDIR /app

# Dependencias Python
COPY requirements.txt ./
RUN pip install --no-cache-dir -r requirements.txt

# Código
COPY . ./

ENV PYTHONUNBUFFERED=1 \
    FLASK_ENV=production \
    FLASK_DEBUG=False

# Arranque sin shell y sin $PORT en la línea: gunicorn.conf.py lee PORT del
# entorno en Python. --chdir entra a backend (no usamos `cd`, que necesita shell).
CMD ["gunicorn", "--chdir", "backend", "-c", "backend/gunicorn.conf.py", "app:app"]
