from datetime import datetime
from typing import Optional, List, Dict, Any
from pydantic import BaseModel, Field


class InvestigationCreate(BaseModel):
    provider: Optional[str] = "mock"
    model: Optional[str] = "gemini-1.5-pro"


class HypothesisSchema(BaseModel):
    title: str
    confidence: str = Field(pattern="^(low|medium|high)$")
    explanation: str
    supporting_evidence_ids: List[str] = []
    contradicting_evidence_ids: List[str] = []
    missing_evidence: List[str] = []
    verification_steps: List[str] = []


class InvestigationImpactSchema(BaseModel):
    affected_endpoints: List[str] = []
    observed_error_rate: Optional[float] = None
    latency_change: Optional[str] = None
    time_window: Dict[str, str] = {}


class InvestigationReportSchema(BaseModel):
    incident_summary: str
    impact: InvestigationImpactSchema
    root_cause_hypotheses: List[HypothesisSchema]
    timeline_event_ids: List[str] = []
    similar_incident_ids: List[str] = []
    recommended_next_steps: List[str] = []
    limitations: List[str] = []
    status: str = Field(pattern="^(investigated|inconclusive)$")


class EvidenceSchema(BaseModel):
    id: str
    evidence_type: str
    source_record_id: Optional[str] = None
    timestamp: Optional[datetime] = None
    summary: str
    sanitized_excerpt: Optional[str] = None
    relationship: str

    class Config:
        from_attributes = True


class InvestigationResponse(BaseModel):
    id: str
    incident_id: str
    project_id: str
    status: str  # queued, running, completed, failed, inconclusive
    provider: str
    model: str
    started_at: datetime
    completed_at: Optional[datetime] = None
    summary: Optional[str] = None
    report_json: Optional[str] = None
    error_message: Optional[str] = None
    created_by: Optional[str] = None
    created_at: datetime
    hypotheses: Optional[List[HypothesisSchema]] = None
    evidence_items: Optional[List[EvidenceSchema]] = None

    class Config:
        from_attributes = True
