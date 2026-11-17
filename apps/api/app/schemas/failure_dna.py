from datetime import datetime
from typing import Optional, Dict, Any, List
from pydantic import BaseModel


class FailureDNAResponse(BaseModel):
    fingerprint: str
    normalized_features: Dict[str, Any]
    first_seen_at: datetime
    last_seen_at: datetime
    occurrence_count: int


class SimilarIncidentResponse(BaseModel):
    incident_id: str
    title: str
    severity: str
    status: str
    started_at: datetime
    resolved_at: Optional[datetime] = None
    similarity_score: float
    matching_signals: List[str]
    differences: List[str]
    previous_resolution: Optional[str] = None
