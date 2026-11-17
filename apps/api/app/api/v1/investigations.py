from typing import List
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from app.core.database import get_db
from app.api.deps import get_current_user
from app.models.user import User
from app.models.investigation import Investigation
from app.models.incident import Incident
from app.schemas.investigation import InvestigationResponse
from app.services.investigation_service import run_investigation

router = APIRouter(tags=["AI Investigations"])


@router.post("/incidents/{incident_id}/investigations", response_model=InvestigationResponse, status_code=status.HTTP_201_CREATED)
def start_investigation(
    incident_id: str,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    incident = db.query(Incident).filter(Incident.id == incident_id).first()
    if not incident:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Incident not found")

    try:
        investigation = run_investigation(db, incident_id, created_by=current_user.email)
        return investigation
    except Exception as e:
        raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail=str(e))


@router.get("/incidents/{incident_id}/investigations", response_model=List[InvestigationResponse])
def get_incident_investigations(
    incident_id: str,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    return db.query(Investigation).filter(
        Investigation.incident_id == incident_id
    ).order_by(Investigation.started_at.desc()).all()


@router.get("/investigations/{investigation_id}", response_model=InvestigationResponse)
def get_investigation_by_id(
    investigation_id: str,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    inv = db.query(Investigation).filter(Investigation.id == investigation_id).first()
    if not inv:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Investigation not found")
    return inv


@router.post("/investigations/{investigation_id}/cancel", response_model=InvestigationResponse)
def cancel_investigation(
    investigation_id: str,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    inv = db.query(Investigation).filter(Investigation.id == investigation_id).first()
    if not inv:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Investigation not found")
    if inv.status in ("completed", "inconclusive", "failed"):
        return inv
    inv.status = "failed"
    inv.error_message = f"Cancelled by user {current_user.email}"
    db.commit()
    db.refresh(inv)
    return inv
