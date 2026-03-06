"""
Extensions Flask - Centralizadas para evitar imports circulares
"""

from flask_sqlalchemy import SQLAlchemy

# Inicializar extensiones
db = SQLAlchemy()
