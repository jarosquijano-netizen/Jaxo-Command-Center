"""
Modelos de lista de compras
"""

from app import db

# TODO: Implementar modelos ShoppingCategory y ShoppingItem

class ShoppingCategory(db.Model):
    """Categorías de compras (Frutas, Lácteos, etc)"""
    __tablename__ = 'shopping_categories'
    pass  # TODO

class ShoppingItem(db.Model):
    """Items en la lista de compras"""
    __tablename__ = 'shopping_items'
    pass  # TODO
