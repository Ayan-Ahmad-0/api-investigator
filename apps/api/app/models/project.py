import uuid
from datetime import datetime, timezone
from sqlalchemy import Column, String, DateTime, ForeignKey, Text
from sqlalchemy.orm import relationship
from app.core.database import Base


class Project(Base):
    __tablename__ = "projects"

    id = Column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    organization_id = Column(String(36), ForeignKey("organizations.id", ondelete="CASCADE"), nullable=False, index=True)
    name = Column(String(255), nullable=False)
    slug = Column(String(255), nullable=False, index=True)
    description = Column(Text, nullable=True)
    created_at = Column(DateTime, default=lambda: datetime.now(timezone.utc), nullable=False)
    updated_at = Column(DateTime, default=lambda: datetime.now(timezone.utc), onupdate=lambda: datetime.now(timezone.utc), nullable=False)

    organization = relationship("Organization", back_populates="projects")
    environments = relationship("Environment", back_populates="project", cascade="all, delete-orphan")
    api_keys = relationship("ApiKey", back_populates="project", cascade="all, delete-orphan")
    endpoints = relationship("ApiEndpoint", back_populates="project", cascade="all, delete-orphan")
    monitors = relationship("Monitor", back_populates="project", cascade="all, delete-orphan")
    incidents = relationship("Incident", back_populates="project", cascade="all, delete-orphan")
    telemetry_events = relationship("TelemetryEvent", back_populates="project", cascade="all, delete-orphan")


class Environment(Base):
    __tablename__ = "environments"

    id = Column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    project_id = Column(String(36), ForeignKey("projects.id", ondelete="CASCADE"), nullable=False, index=True)
    name = Column(String(100), nullable=False)  # production, staging, development
    created_at = Column(DateTime, default=lambda: datetime.now(timezone.utc), nullable=False)

    project = relationship("Project", back_populates="environments")
