import uuid
from datetime import datetime, timezone
from sqlalchemy import Column, String, DateTime, ForeignKey, Integer, Float, Boolean, Text
from sqlalchemy.orm import relationship
from app.core.database import Base


class ApiEndpoint(Base):
    __tablename__ = "api_endpoints"

    id = Column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    project_id = Column(String(36), ForeignKey("projects.id", ondelete="CASCADE"), nullable=False, index=True)
    environment_id = Column(String(36), ForeignKey("environments.id", ondelete="SET NULL"), nullable=True, index=True)
    name = Column(String(255), nullable=False)
    method = Column(String(10), default="GET", nullable=False)
    route_template = Column(String(500), nullable=False, index=True)
    created_at = Column(DateTime, default=lambda: datetime.now(timezone.utc), nullable=False)

    project = relationship("Project", back_populates="endpoints")
    monitors = relationship("Monitor", back_populates="endpoint", cascade="all, delete-orphan")


class Monitor(Base):
    __tablename__ = "monitors"

    id = Column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    project_id = Column(String(36), ForeignKey("projects.id", ondelete="CASCADE"), nullable=False, index=True)
    endpoint_id = Column(String(36), ForeignKey("api_endpoints.id", ondelete="SET NULL"), nullable=True, index=True)
    name = Column(String(255), nullable=False)
    url = Column(String(1000), nullable=False)
    method = Column(String(10), default="GET", nullable=False)
    interval_seconds = Column(Integer, default=60, nullable=False)
    timeout_ms = Column(Integer, default=5000, nullable=False)
    expected_status_codes = Column(String(100), default="200,201,204", nullable=False)
    expected_conditions = Column(Text, nullable=True)  # JSON formatted assertions
    secret_configuration = Column(Text, nullable=True)  # Encrypted/masked headers or auth
    enabled = Column(Boolean, default=True, nullable=False)
    created_at = Column(DateTime, default=lambda: datetime.now(timezone.utc), nullable=False)
    updated_at = Column(DateTime, default=lambda: datetime.now(timezone.utc), onupdate=lambda: datetime.now(timezone.utc), nullable=False)

    project = relationship("Project", back_populates="monitors")
    endpoint = relationship("ApiEndpoint", back_populates="monitors")
    checks = relationship("ApiCheck", back_populates="monitor", cascade="all, delete-orphan")


class ApiCheck(Base):
    __tablename__ = "api_checks"

    id = Column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    project_id = Column(String(36), ForeignKey("projects.id", ondelete="CASCADE"), nullable=False, index=True)
    monitor_id = Column(String(36), ForeignKey("monitors.id", ondelete="CASCADE"), nullable=False, index=True)
    checked_at = Column(DateTime, default=lambda: datetime.now(timezone.utc), nullable=False, index=True)
    status = Column(String(50), nullable=False)  # healthy, degraded, failing, timeout
    http_status_code = Column(Integer, nullable=True)
    duration_ms = Column(Float, nullable=True)
    dns_duration_ms = Column(Float, nullable=True)
    connect_duration_ms = Column(Float, nullable=True)
    tls_duration_ms = Column(Float, nullable=True)
    ttfb_ms = Column(Float, nullable=True)
    error_category = Column(String(100), nullable=True)
    sanitized_response_sample = Column(Text, nullable=True)

    monitor = relationship("Monitor", back_populates="checks")
