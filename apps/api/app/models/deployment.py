import uuid
from datetime import datetime, timezone
from sqlalchemy import Column, String, DateTime, ForeignKey, Text
from app.core.database import Base


class Deployment(Base):
    __tablename__ = "deployments"

    id = Column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    project_id = Column(String(36), ForeignKey("projects.id", ondelete="CASCADE"), nullable=False, index=True)
    environment_id = Column(String(36), nullable=True)
    provider = Column(String(50), default="github", nullable=False)
    repository = Column(String(255), nullable=False)
    commit_sha = Column(String(64), nullable=False)
    branch = Column(String(100), default="main", nullable=False)
    deployment_reference = Column(String(255), nullable=True)
    deployed_at = Column(DateTime, default=lambda: datetime.now(timezone.utc), nullable=False, index=True)
    metadata_json = Column(Text, nullable=True)
