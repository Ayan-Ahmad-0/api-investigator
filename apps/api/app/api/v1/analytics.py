from typing import List
from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session
from app.core.database import get_db
from app.api.deps import get_current_project_access
from app.models.project import Project
from app.schemas.analytics import (
    AnalyticsOverviewResponse,
    ErrorMetricsResponse,
    LatencyMetricsResponse,
    EndpointReliabilityItem,
)
from app.services.analytics_service import (
    get_analytics_overview,
    get_error_metrics,
    get_latency_metrics,
    get_endpoint_reliability,
)

router = APIRouter(prefix="/projects/{project_id}/analytics", tags=["Analytics"])


@router.get("/overview", response_model=AnalyticsOverviewResponse)
def analytics_overview(
    project_id: str,
    project: Project = Depends(get_current_project_access),
    db: Session = Depends(get_db),
):
    return get_analytics_overview(db, project_id)


@router.get("/errors", response_model=ErrorMetricsResponse)
def error_metrics(
    project_id: str,
    project: Project = Depends(get_current_project_access),
    db: Session = Depends(get_db),
):
    return get_error_metrics(db, project_id)


@router.get("/latency", response_model=LatencyMetricsResponse)
def latency_metrics(
    project_id: str,
    project: Project = Depends(get_current_project_access),
    db: Session = Depends(get_db),
):
    return get_latency_metrics(db, project_id)


@router.get("/endpoints", response_model=List[EndpointReliabilityItem])
def endpoint_reliability(
    project_id: str,
    project: Project = Depends(get_current_project_access),
    db: Session = Depends(get_db),
):
    return get_endpoint_reliability(db, project_id)
