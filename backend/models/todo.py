from extensions import db
from datetime import datetime


class Todo(db.Model):
    __tablename__ = 'todos'

    id = db.Column(db.Integer, primary_key=True)
    title = db.Column(db.String(300), nullable=False)
    category = db.Column(db.String(50), default='personal')
    priority = db.Column(db.String(20), default='media')
    due_date = db.Column(db.String(20))
    notes = db.Column(db.Text)
    completed = db.Column(db.Boolean, default=False)
    created_at = db.Column(db.DateTime, default=datetime.utcnow)

    def to_dict(self):
        return {
            'id': self.id,
            'title': self.title,
            'category': self.category,
            'priority': self.priority,
            'dueDate': self.due_date,
            'notes': self.notes,
            'completed': self.completed,
            'createdAt': self.created_at.isoformat() if self.created_at else None,
        }
