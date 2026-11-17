import uuid
from datetime import datetime, timezone
from sqlalchemy import Column, String, DateTime, ForeignKey, Text
from sqlalchemy.orm import relationship
from app.core.database import Base


class Incident(Base):
    __tablename__ = "incidents"

    id = Column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    project_id = Column(String(36), ForeignKey("projects.id", ondelete="CASCADE"), nullable=False, index=True)
    environment_id = Column(String(36), nullable=True, index=True)
    endpoint_id = Column(String(36), ForeignKey("api_endpoints.id", ondelete="SET NULL"), nullable=True, index=True)
    title = Column(String(255), nullable=False)
    description = Column(Text, nullable=True)
    severity = Column(String(20), default="high", nullable=False)  # critical, high, medium, low
    status = Column(String(50), default="open", nullable=False)  # open, investigating, identified, monitoring, resolved, inconclusive
    started_at = Column(DateTime, default=lambda: datetime.now(timezone.utc), nullable=False, index=True)
    detected_at = Column(DateTime, default=lambda: datetime.now(timezone.utc), nullable=False)
    resolved_at = Column(DateTime, nullable=True)
    primary_fingerprint = Column(String(128), nullable=True, index=True)
    created_at = Column(DateTime, default=lambda: datetime.now(timezone.utc), nullable=False)
    updated_at = Column(DateTime, default=lambda: datetime.now(timezone.utc), onupdate=lambda: datetime.now(timezone.utc), nullable=False)

    project = relationship("Project", back_populates="incidents")
    endpoint = relationship("ApiEndpoint")
    events = relationship("IncidentEvent", back_populates="incident", cascade="all, delete-orphan", order_by="IncidentEvent.timestamp")
    resolution = relationship("IncidentResolution", back_populates="incident", uselist=False, cascade="all, delete-orphan")
    investigations = relationship("Investigation", back_populates="incident", cascade="all, delete-orphan")


class IncidentEvent(Base):
    __tablename__ = "incident_events"

    id = Column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    incident_id = Column(String(36), ForeignKey("incidents.id", ondelete="CASCADE"), nullable=False, index=True)
    project_id = Column(String(36), ForeignKey("projects.id", ondelete="CASCADE"), nullable=False, index=True)
    event_type = Column(String(50), nullable=False)  # check_failure, error_spike, deployment, investigation_started, investigation_completed, resolution, user_note
    source_record_id = Column(String(100), nullable=True)
    timestamp = Column(DateTime, default=lambda: datetime.now(timezone.utc), nullable=False, index=True)
    summary = Column(Text, nullable=False)
    metadata_json = Column(Text, nullable=True)

    incident = relationship("Incident", back_populates="events")


class IncidentResolution(Base):
    __tablename__ = "incident_resolutions"

    id = Column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    incident_id = Column(String(36), ForeignKey("incidents.id", ondelete="CASCADE"), unique=True, nullable=False)
    project_id = Column(String(36), ForeignKey("projects.id", ondelete="CASCADE"), nullable=False, index=True)
    resolution_summary = Column(Text, nullable=False)
    root_cause_confirmed = Column(Text, nullable=True)
    resolved_by = Column(String(255), nullable=True)
    created_at = Column(DateTime, default=lambda: datetime.now(timezone.utc), nullable=False)

    incident = relationship("Incident", back_populates="resolution")
