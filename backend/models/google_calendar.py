from extensions import db
from datetime import datetime


class GoogleEventMapping(db.Model):
    __tablename__ = 'google_event_mappings'

    id = db.Column(db.Integer, primary_key=True)
    source = db.Column(db.String(50), nullable=False)
    source_id = db.Column(db.Integer, nullable=False)
    calendar_id = db.Column(db.String(255), nullable=False)
    event_id = db.Column(db.String(255), nullable=False)
    updated_at = db.Column(db.DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

    __table_args__ = (
        db.UniqueConstraint('source', 'source_id', name='uq_google_event_mapping_source'),
    )

    def to_dict(self):
        return {
            'id': self.id,
            'source': self.source,
            'source_id': self.source_id,
            'calendar_id': self.calendar_id,
            'event_id': self.event_id,
            'updated_at': self.updated_at.isoformat() if self.updated_at else None,
        }
