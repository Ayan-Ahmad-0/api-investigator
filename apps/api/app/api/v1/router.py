from fastapi import APIRouter
from app.api.v1.auth import router as auth_router
from app.api.v1.organizations import router as orgs_router
from app.api.v1.projects import router as projects_router
from app.api.v1.api_keys import router as api_keys_router
from app.api.v1.endpoints import router as endpoints_router
from app.api.v1.telemetry import router as telemetry_router
from app.api.v1.incidents import router as incidents_router
from app.api.v1.investigations import router as investigations_router
from app.api.v1.analytics import router as analytics_router
from app.api.v1.health import router as health_router

api_v1_router = APIRouter(prefix="/api/v1")

api_v1_router.include_router(health_router)
api_v1_router.include_router(auth_router)
api_v1_router.include_router(orgs_router)
api_v1_router.include_router(projects_router)
api_v1_router.include_router(api_keys_router)
api_v1_router.include_router(endpoints_router)
api_v1_router.include_router(telemetry_router)
api_v1_router.include_router(incidents_router)
api_v1_router.include_router(investigations_router)
api_v1_router.include_router(analytics_router)
