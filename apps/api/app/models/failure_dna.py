import uuid
from datetime import datetime, timezone
from sqlalchemy import Column, String, DateTime, ForeignKey, Integer, Text
from app.core.database import Base


class FailureFingerprint(Base):
    __tablename__ = "failure_fingerprints"

    id = Column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    project_id = Column(String(36), ForeignKey("projects.id", ondelete="CASCADE"), nullable=False, index=True)
    fingerprint = Column(String(128), nullable=False, index=True)
    normalized_features = Column(Text, nullable=False)  # JSON formatted features
    first_seen_at = Column(DateTime, default=lambda: datetime.now(timezone.utc), nullable=False)
    last_seen_at = Column(DateTime, default=lambda: datetime.now(timezone.utc), nullable=False)
    occurrence_count = Column(Integer, default=1, nullable=False)
