from typing import List
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from app.core.database import get_db
from app.api.deps import get_authenticated_ingestion_key, get_current_project_access
from app.models.api_key import ApiKey
from app.models.project import Project
from app.models.telemetry import TelemetryEvent
from app.schemas.telemetry import (
    TelemetryIngestEvent,
    TelemetryBatchIngest,
    TelemetryResponse,
    TelemetryEventResponse,
)
from app.services.telemetry_service import ingest_single_event, ingest_batch_events

router = APIRouter(tags=["Telemetry Ingestion"])


@router.post("/ingest/events", response_model=TelemetryResponse, status_code=status.HTTP_202_ACCEPTED)
def ingest_event(
    event: TelemetryIngestEvent,
    api_key: ApiKey = Depends(get_authenticated_ingestion_key),
    db: Session = Depends(get_db),
):
    try:
        ingest_single_event(db, api_key.project_id, event)
        return {"accepted": 1, "rejected": 0, "message": "Telemetry event accepted and queued for processing"}
    except Exception as e:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=str(e))


@router.post("/ingest/batch", response_model=TelemetryResponse, status_code=status.HTTP_202_ACCEPTED)
def ingest_batch(
    payload: TelemetryBatchIngest,
    api_key: ApiKey = Depends(get_authenticated_ingestion_key),
    db: Session = Depends(get_db),
):
    accepted = ingest_batch_events(db, api_key.project_id, payload.events)
    rejected = len(payload.events) - accepted
    return {
        "accepted": accepted,
        "rejected": rejected,
        "message": f"Processed batch: {accepted} accepted, {rejected} rejected",
    }


@router.get("/projects/{project_id}/telemetry", response_model=List[TelemetryEventResponse])
def get_project_telemetry(
    project_id: str,
    limit: int = 50,
    project: Project = Depends(get_current_project_access),
    db: Session = Depends(get_db),
):
    return db.query(TelemetryEvent).filter(
        TelemetryEvent.project_id == project_id,
    ).order_by(TelemetryEvent.timestamp.desc()).limit(limit).all()
