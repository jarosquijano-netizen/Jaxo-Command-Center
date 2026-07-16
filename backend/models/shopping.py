"""
Modelos de lista de compras
"""

from datetime import datetime
from extensions import db


class PurchaseHistory(db.Model):
    """
    Registro de artículos comprados via Mercadona sync.
    Permite a la IA saber qué hay en casa y evitar re-comprar no-perecederos.
    """
    __tablename__ = 'purchase_history'

    id           = db.Column(db.Integer, primary_key=True)
    item_name    = db.Column(db.String(200), nullable=False)
    quantity     = db.Column(db.String(100), nullable=True)
    category     = db.Column(db.String(100), nullable=True)
    purchased_at = db.Column(db.DateTime, default=datetime.utcnow, nullable=False)
    job_id       = db.Column(db.String(20), nullable=True)

    def to_dict(self):
        return {
            'id': self.id,
            'item_name': self.item_name,
            'quantity': self.quantity,
            'category': self.category,
            'purchased_at': self.purchased_at.isoformat(),
            'job_id': self.job_id,
        }
