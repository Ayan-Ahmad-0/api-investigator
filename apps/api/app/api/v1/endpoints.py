from typing import List
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from app.core.database import get_db
from app.api.deps import get_current_user, get_current_project_access
from app.models.project import Project
from app.models.endpoint import ApiEndpoint, Monitor, ApiCheck
from app.schemas.endpoint import (
    EndpointCreate,
    EndpointResponse,
    MonitorCreate,
    MonitorUpdate,
    MonitorResponse,
    ApiCheckResponse,
)
from app.services.monitoring_service import (
    create_endpoint,
    create_monitor,
    update_monitor,
    execute_monitor_check,
)

router = APIRouter(tags=["Endpoints & Monitors"])


@router.post("/projects/{project_id}/endpoints", response_model=EndpointResponse, status_code=status.HTTP_201_CREATED)
def register_endpoint(
    project_id: str,
    data: EndpointCreate,
    project: Project = Depends(get_current_project_access),
    db: Session = Depends(get_db),
):
    return create_endpoint(
        db,
        project_id=project_id,
        name=data.name,
        method=data.method,
        route_template=data.route_template,
        environment_id=data.environment_id,
    )


@router.get("/projects/{project_id}/endpoints", response_model=List[EndpointResponse])
def list_endpoints(
    project_id: str,
    project: Project = Depends(get_current_project_access),
    db: Session = Depends(get_db),
):
    endpoints = db.query(ApiEndpoint).filter(ApiEndpoint.project_id == project_id).all()
    results = []
    for ep in endpoints:
        resp = EndpointResponse.model_validate(ep)
        # Compute status from monitors if available
        monitors = db.query(Monitor).filter(Monitor.endpoint_id == ep.id).all()
        if monitors:
            latest_check = db.query(ApiCheck).filter(
                ApiCheck.monitor_id.in_([m.id for m in monitors])
            ).order_by(ApiCheck.checked_at.desc()).first()
            if latest_check:
                resp.status = latest_check.status
                resp.last_latency_ms = latest_check.duration_ms
        results.append(resp)
    return results


@router.get("/endpoints/{endpoint_id}", response_model=EndpointResponse)
def get_single_endpoint(
    endpoint_id: str,
    db: Session = Depends(get_db),
):
    ep = db.query(ApiEndpoint).filter(ApiEndpoint.id == endpoint_id).first()
    if not ep:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Endpoint not found")
    return ep


@router.delete("/endpoints/{endpoint_id}")
def delete_endpoint_route(
    endpoint_id: str,
    db: Session = Depends(get_db),
):
    ep = db.query(ApiEndpoint).filter(ApiEndpoint.id == endpoint_id).first()
    if not ep:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Endpoint not found")
    monitors = db.query(Monitor).filter(Monitor.endpoint_id == endpoint_id).all()
    for m in monitors:
        db.delete(m)
    db.delete(ep)
    db.commit()
    return {"message": "Endpoint deleted successfully"}


@router.post("/projects/{project_id}/monitors", response_model=MonitorResponse, status_code=status.HTTP_201_CREATED)
def register_monitor(
    project_id: str,
    data: MonitorCreate,
    project: Project = Depends(get_current_project_access),
    db: Session = Depends(get_db),
):
    try:
        monitor = create_monitor(
            db,
            project_id=project_id,
            name=data.name,
            url=data.url,
            method=data.method,
            interval_seconds=data.interval_seconds,
            timeout_ms=data.timeout_ms,
            expected_status_codes=data.expected_status_codes,
            expected_conditions=data.expected_conditions,
            endpoint_id=data.endpoint_id,
            enabled=data.enabled,
        )
        return monitor
    except ValueError as e:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=str(e))


@router.get("/projects/{project_id}/monitors", response_model=List[MonitorResponse])
def list_monitors(
    project_id: str,
    project: Project = Depends(get_current_project_access),
    db: Session = Depends(get_db),
):
    monitors = db.query(Monitor).filter(Monitor.project_id == project_id).all()
    res = []
    for m in monitors:
        r = MonitorResponse.model_validate(m)
        latest = db.query(ApiCheck).filter(ApiCheck.monitor_id == m.id).order_by(ApiCheck.checked_at.desc()).first()
        if latest:
            r.last_status = latest.status
            r.last_latency_ms = latest.duration_ms
            r.last_checked_at = latest.checked_at
        res.append(r)
    return res


@router.patch("/monitors/{monitor_id}", response_model=MonitorResponse)
def patch_monitor(
    monitor_id: str,
    data: MonitorUpdate,
    db: Session = Depends(get_db),
):
    try:
        updated = update_monitor(db, monitor_id, **data.model_dump(exclude_unset=True))
        if not updated:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Monitor not found")
        return updated
    except ValueError as e:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=str(e))


@router.delete("/monitors/{monitor_id}")
def delete_monitor(
    monitor_id: str,
    db: Session = Depends(get_db),
):
    m = db.query(Monitor).filter(Monitor.id == monitor_id).first()
    if not m:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Monitor not found")
    db.delete(m)
    db.commit()
    return {"message": "Monitor deleted successfully"}


@router.get("/monitors/{monitor_id}/checks", response_model=List[ApiCheckResponse])
def get_monitor_checks(
    monitor_id: str,
    limit: int = 50,
    db: Session = Depends(get_db),
):
    return db.query(ApiCheck).filter(ApiCheck.monitor_id == monitor_id).order_by(ApiCheck.checked_at.desc()).limit(limit).all()


@router.post("/monitors/{monitor_id}/trigger", response_model=ApiCheckResponse)
def trigger_monitor_check(
    monitor_id: str,
    db: Session = Depends(get_db),
):
    m = db.query(Monitor).filter(Monitor.id == monitor_id).first()
    if not m:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Monitor not found")
    check = execute_monitor_check(db, m)
    return check
