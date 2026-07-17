"""
Config de gunicorn — lee el puerto desde la env var PORT en Python, para no
depender de que el shell sustituya $PORT en la línea de comando (Railway a veces
ejecuta el comando sin shell → '$PORT' llega literal y falla).
"""
import os

bind = f"0.0.0.0:{os.environ.get('PORT', '8080')}"
workers = 1                # 1 worker: el job store de Mercadona vive en memoria
worker_class = "gthread"
threads = 8
timeout = 600              # Playwright puede tardar (varios minutos)
graceful_timeout = 30
