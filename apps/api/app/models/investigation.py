import uuid
from datetime import datetime, timezone
from sqlalchemy import Column, String, DateTime, ForeignKey, Integer, Text
from sqlalchemy.orm import relationship as orm_relationship
from app.core.database import Base


class Investigation(Base):
    __tablename__ = "investigations"

    id = Column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    incident_id = Column(String(36), ForeignKey("incidents.id", ondelete="CASCADE"), nullable=False, index=True)
    project_id = Column(String(36), ForeignKey("projects.id", ondelete="CASCADE"), nullable=False, index=True)
    status = Column(String(50), default="queued", nullable=False)  # queued, running, completed, failed, inconclusive
    provider = Column(String(50), default="rule-engine", nullable=False)
    model = Column(String(100), default="calibrated-analyzer", nullable=False)
    started_at = Column(DateTime, default=lambda: datetime.now(timezone.utc), nullable=False)
    completed_at = Column(DateTime, nullable=True)
    summary = Column(Text, nullable=True)
    report_json = Column(Text, nullable=True)  # Full JSON report conforming to section 11.5
    error_message = Column(Text, nullable=True)
    created_by = Column(String(255), nullable=True)
    created_at = Column(DateTime, default=lambda: datetime.now(timezone.utc), nullable=False)

    incident = orm_relationship("Incident", back_populates="investigations")
    hypotheses = orm_relationship("Hypothesis", back_populates="investigation", cascade="all, delete-orphan", order_by="Hypothesis.rank")
    evidence_items = orm_relationship("Evidence", back_populates="investigation", cascade="all, delete-orphan")


class Hypothesis(Base):
    __tablename__ = "hypotheses"

    id = Column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    investigation_id = Column(String(36), ForeignKey("investigations.id", ondelete="CASCADE"), nullable=False, index=True)
    title = Column(String(255), nullable=False)
    explanation = Column(Text, nullable=False)
    confidence = Column(String(20), default="medium", nullable=False)  # low, medium, high
    rank = Column(Integer, default=1, nullable=False)
    created_at = Column(DateTime, default=lambda: datetime.now(timezone.utc), nullable=False)

    investigation = orm_relationship("Investigation", back_populates="hypotheses")


class Evidence(Base):
    __tablename__ = "evidence"

    id = Column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    investigation_id = Column(String(36), ForeignKey("investigations.id", ondelete="CASCADE"), nullable=False, index=True)
    project_id = Column(String(36), ForeignKey("projects.id", ondelete="CASCADE"), nullable=False, index=True)
    evidence_type = Column(String(50), nullable=False)  # metric, check, log, trace, deployment, dependency
    source_record_id = Column(String(100), nullable=True)
    timestamp = Column(DateTime, nullable=True)
    summary = Column(Text, nullable=False)
    sanitized_excerpt = Column(Text, nullable=True)
    relationship = Column(String(20), default="neutral", nullable=False)  # supporting, contradicting, neutral
    metadata_json = Column(Text, nullable=True)

    investigation = orm_relationship("Investigation", back_populates="evidence_items")
