from datetime import datetime, timezone
from typing import List, Optional
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from app.core.database import get_db
from app.api.deps import get_current_user, get_current_project_access
from app.models.user import User
from app.models.project import Project
from app.models.incident import Incident, IncidentEvent, IncidentResolution
from app.schemas.incident import (
    IncidentResponse,
    IncidentUpdate,
    IncidentResolveRequest,
    IncidentNoteRequest,
    IncidentEventResponse,
)
from app.schemas.reproduction import (
    ReproductionPackageResponse,
    CurlReproductionResponse,
    RequestDiffResponse,
)
from app.schemas.failure_dna import SimilarIncidentResponse
from app.services.reproduction_service import generate_reproduction_package, generate_request_diff
from app.services.failure_dna_service import find_similar_incidents

router = APIRouter(tags=["Incidents"])


@router.get("/projects/{project_id}/incidents", response_model=List[IncidentResponse])
def list_project_incidents(
    project_id: str,
    status_filter: Optional[str] = None,
    severity_filter: Optional[str] = None,
    project: Project = Depends(get_current_project_access),
    db: Session = Depends(get_db),
):
    query = db.query(Incident).filter(Incident.project_id == project_id)
    if status_filter:
        query = query.filter(Incident.status == status_filter)
    if severity_filter:
        query = query.filter(Incident.severity == severity_filter)
    return query.order_by(Incident.started_at.desc()).all()


@router.get("/incidents/{incident_id}", response_model=IncidentResponse)
def get_incident(
    incident_id: str,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    inc = db.query(Incident).filter(Incident.id == incident_id).first()
    if not inc:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Incident not found")
    return inc


@router.patch("/incidents/{incident_id}", response_model=IncidentResponse)
def patch_incident(
    incident_id: str,
    data: IncidentUpdate,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    inc = db.query(Incident).filter(Incident.id == incident_id).first()
    if not inc:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Incident not found")

    if data.title:
        inc.title = data.title
    if data.description is not None:
        inc.description = data.description
    if data.severity:
        inc.severity = data.severity
    if data.status:
        inc.status = data.status
        if data.status == "resolved" and not inc.resolved_at:
            inc.resolved_at = datetime.now(timezone.utc)

    inc.updated_at = datetime.now(timezone.utc)
    db.commit()
    db.refresh(inc)
    return inc


@router.post("/incidents/{incident_id}/resolve", response_model=IncidentResponse)
def resolve_incident(
    incident_id: str,
    data: IncidentResolveRequest,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    inc = db.query(Incident).filter(Incident.id == incident_id).first()
    if not inc:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Incident not found")

    now = datetime.now(timezone.utc)
    inc.status = "resolved"
    inc.resolved_at = now
    inc.updated_at = now

    resolution = db.query(IncidentResolution).filter(IncidentResolution.incident_id == incident_id).first()
    if not resolution:
        resolution = IncidentResolution(
            incident_id=incident_id,
            project_id=inc.project_id,
            resolution_summary=data.resolution_summary,
            root_cause_confirmed=data.root_cause_confirmed,
            resolved_by=current_user.email,
        )
        db.add(resolution)
    else:
        resolution.resolution_summary = data.resolution_summary
        resolution.root_cause_confirmed = data.root_cause_confirmed
        resolution.resolved_by = current_user.email

    event = IncidentEvent(
        incident_id=incident_id,
        project_id=inc.project_id,
        event_type="resolution",
        timestamp=now,
        summary=f"Incident resolved by {current_user.name}: {data.resolution_summary}",
    )
    db.add(event)
    db.commit()
    db.refresh(inc)
    return inc


@router.post("/incidents/{incident_id}/notes", response_model=IncidentEventResponse)
def add_incident_note(
    incident_id: str,
    data: IncidentNoteRequest,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    inc = db.query(Incident).filter(Incident.id == incident_id).first()
    if not inc:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Incident not found")

    now = datetime.now(timezone.utc)
    event = IncidentEvent(
        incident_id=incident_id,
        project_id=inc.project_id,
        event_type="user_note",
        timestamp=now,
        summary=f"Note from {current_user.name}: {data.note}",
    )
    db.add(event)
    inc.updated_at = now
    db.commit()
    db.refresh(event)
    return event


@router.get("/incidents/{incident_id}/reproduction", response_model=ReproductionPackageResponse)
def get_reproduction(
    incident_id: str,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    pkg = generate_reproduction_package(db, incident_id)
    if not pkg:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Reproduction package could not be generated")
    return pkg


@router.get("/incidents/{incident_id}/reproduction/curl", response_model=CurlReproductionResponse)
def get_reproduction_curl(
    incident_id: str,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    pkg = generate_reproduction_package(db, incident_id)
    if not pkg:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Reproduction package not found")
    return {
        "curl_command": pkg["curl_command"],
        "is_safe": True,
        "notice": "Credentials and sensitive headers have been masked with safe placeholders.",
    }


@router.get("/incidents/{incident_id}/reproduction/diff", response_model=RequestDiffResponse)
def get_reproduction_diff(
    incident_id: str,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    return generate_request_diff(db, incident_id)


@router.get("/incidents/{incident_id}/similar", response_model=List[SimilarIncidentResponse])
def get_similar_incidents(
    incident_id: str,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    inc = db.query(Incident).filter(Incident.id == incident_id).first()
    if not inc:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Incident not found")
    return find_similar_incidents(db, inc.project_id, incident_id)
