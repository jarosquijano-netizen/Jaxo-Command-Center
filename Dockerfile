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

# 1 worker (el job store de Mercadona vive en memoria del proceso).
# Railway inyecta $PORT. railway.toml puede sobreescribir este comando.
CMD ["sh", "-c", "cd backend && gunicorn --bind 0.0.0.0:${PORT:-8080} --workers 1 --timeout 600 --worker-class gthread --threads 8 app:app"]
