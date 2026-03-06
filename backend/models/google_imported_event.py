from extensions import db
from datetime import datetime


class GoogleImportedEvent(db.Model):
    __tablename__ = 'google_imported_events'

    id = db.Column(db.Integer, primary_key=True)
    calendar_id = db.Column(db.String(255), nullable=False)
    event_id = db.Column(db.String(255), nullable=False)
    summary = db.Column(db.Text)
    description = db.Column(db.Text)
    start_datetime = db.Column(db.DateTime, nullable=False)
    end_datetime = db.Column(db.DateTime, nullable=False)
    all_day = db.Column(db.Boolean, default=False)
    location = db.Column(db.String(255))
    status = db.Column(db.String(50), default='confirmed')
    google_updated = db.Column(db.DateTime)
    imported_at = db.Column(db.DateTime, default=datetime.utcnow)
    updated_at = db.Column(db.DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

    __table_args__ = (
        db.UniqueConstraint('calendar_id', 'event_id', name='uq_google_imported_event'),
    )

    def to_dict(self):
        return {
            'id': self.id,
            'calendar_id': self.calendar_id,
            'event_id': self.event_id,
            'summary': self.summary,
            'description': self.description,
            'start_datetime': self.start_datetime.isoformat() if self.start_datetime else None,
            'end_datetime': self.end_datetime.isoformat() if self.end_datetime else None,
            'all_day': self.all_day,
            'location': self.location,
            'status': self.status,
            'google_updated': self.google_updated.isoformat() if self.google_updated else None,
            'imported_at': self.imported_at.isoformat() if self.imported_at else None,
            'updated_at': self.updated_at.isoformat() if self.updated_at else None,
        }
