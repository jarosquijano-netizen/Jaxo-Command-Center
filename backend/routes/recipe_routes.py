"""
Rutas API para recetas guardadas (referencias de Pinterest, blogs, etc.).
Sirven como contexto para que la IA aprenda el estilo de comida de la familia.
"""

import json
import logging
from flask import Blueprint, request, jsonify
from extensions import db
from models.menu import SavedRecipe

logger = logging.getLogger(__name__)

recipe_bp = Blueprint("recipes", __name__)

_VALID_TIPOS = {"desayuno", "comida", "merienda", "cena", "postre", "snack", "cualquiera"}


@recipe_bp.route("", methods=["GET"])
@recipe_bp.route("/", methods=["GET"])
def list_recipes():
    """Lista todas las recetas (favoritas primero, luego más recientes)."""
    try:
        recipes = (
            SavedRecipe.query
            .order_by(SavedRecipe.es_favorita.desc(), SavedRecipe.created_at.desc())
            .all()
        )
        return jsonify({"success": True, "data": [r.to_dict() for r in recipes]})
    except Exception as e:
        logger.error(f"[recipes] list error: {e}")
        return jsonify({"success": False, "message": "Error obteniendo recetas"}), 500


@recipe_bp.route("", methods=["POST"])
@recipe_bp.route("/", methods=["POST"])
def create_recipe():
    """
    Crea una receta.
    Body: {"nombre": "...", "url_origen": "https://...", "tipo_comida": "cena",
           "descripcion": "notas opcionales", "apto_ninos": true, "dificultad": "Fácil",
           "es_favorita": false}
    """
    try:
        data = request.get_json() or {}
        nombre = str(data.get("nombre", "")).strip()
        if not nombre:
            return jsonify({"success": False, "message": "El nombre es obligatorio"}), 400
        if len(nombre) > 200:
            nombre = nombre[:200]

        tipo = str(data.get("tipo_comida", "cualquiera")).strip().lower()
        if tipo not in _VALID_TIPOS:
            tipo = "cualquiera"

        recipe = SavedRecipe(
            nombre=nombre,
            descripcion=str(data.get("descripcion", "")).strip()[:1000] or None,
            url_origen=str(data.get("url_origen", "")).strip()[:500] or None,
            imagen_url=str(data.get("imagen_url", "")).strip()[:500] or None,
            tipo_comida=tipo,
            dificultad=data.get("dificultad") if data.get("dificultad") in ("Fácil", "Media", "Difícil") else None,
            apto_ninos=bool(data.get("apto_ninos", True)),
            es_favorita=bool(data.get("es_favorita", False)),
        )
        db.session.add(recipe)
        db.session.commit()
        return jsonify({"success": True, "data": recipe.to_dict()}), 201
    except Exception as e:
        logger.error(f"[recipes] create error: {e}")
        db.session.rollback()
        return jsonify({"success": False, "message": "Error guardando receta"}), 500


@recipe_bp.route("/<int:recipe_id>", methods=["PUT"])
def update_recipe(recipe_id):
    """Actualiza una receta (editar campos o marcar favorita)."""
    try:
        recipe = SavedRecipe.query.get(recipe_id)
        if not recipe:
            return jsonify({"success": False, "message": "Receta no encontrada"}), 404
        data = request.get_json() or {}
        if "nombre" in data and str(data["nombre"]).strip():
            recipe.nombre = str(data["nombre"]).strip()[:200]
        if "descripcion" in data:
            recipe.descripcion = str(data["descripcion"]).strip()[:1000] or None
        if "url_origen" in data:
            recipe.url_origen = str(data["url_origen"]).strip()[:500] or None
        if "tipo_comida" in data:
            t = str(data["tipo_comida"]).strip().lower()
            recipe.tipo_comida = t if t in _VALID_TIPOS else recipe.tipo_comida
        if "apto_ninos" in data:
            recipe.apto_ninos = bool(data["apto_ninos"])
        if "es_favorita" in data:
            recipe.es_favorita = bool(data["es_favorita"])
        db.session.commit()
        return jsonify({"success": True, "data": recipe.to_dict()})
    except Exception as e:
        logger.error(f"[recipes] update error: {e}")
        db.session.rollback()
        return jsonify({"success": False, "message": "Error actualizando receta"}), 500


@recipe_bp.route("/<int:recipe_id>", methods=["DELETE"])
def delete_recipe(recipe_id):
    """Elimina una receta."""
    try:
        recipe = SavedRecipe.query.get(recipe_id)
        if not recipe:
            return jsonify({"success": False, "message": "Receta no encontrada"}), 404
        db.session.delete(recipe)
        db.session.commit()
        return jsonify({"success": True, "message": "Receta eliminada"})
    except Exception as e:
        logger.error(f"[recipes] delete error: {e}")
        db.session.rollback()
        return jsonify({"success": False, "message": "Error eliminando receta"}), 500
