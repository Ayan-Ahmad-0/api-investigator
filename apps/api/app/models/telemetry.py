import uuid
from datetime import datetime, timezone
from sqlalchemy import Column, String, DateTime, ForeignKey, Integer, Float, Text
from sqlalchemy.orm import relationship
from app.core.database import Base


class TelemetryEvent(Base):
    __tablename__ = "telemetry_events"

    id = Column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    project_id = Column(String(36), ForeignKey("projects.id", ondelete="CASCADE"), nullable=False, index=True)
    environment_id = Column(String(36), nullable=True, index=True)
    event_type = Column(String(50), default="request", nullable=False)  # request, error, dependency
    timestamp = Column(DateTime, default=lambda: datetime.now(timezone.utc), nullable=False, index=True)
    service_name = Column(String(100), default="api", nullable=False)
    service_version = Column(String(50), nullable=True)
    http_method = Column(String(10), nullable=False)
    route_template = Column(String(500), nullable=False, index=True)
    status_code = Column(Integer, nullable=False)
    duration_ms = Column(Float, default=0.0, nullable=False)
    exception_type = Column(String(255), nullable=True, index=True)
    sanitized_message = Column(Text, nullable=True)
    stack_trace = Column(Text, nullable=True)
    request_id = Column(String(100), nullable=True, index=True)
    trace_id = Column(String(100), nullable=True, index=True)
    span_id = Column(String(100), nullable=True)
    sanitized_attributes = Column(Text, nullable=True)  # JSON text
    fingerprint = Column(String(128), nullable=True, index=True)

    project = relationship("Project", back_populates="telemetry_events")
