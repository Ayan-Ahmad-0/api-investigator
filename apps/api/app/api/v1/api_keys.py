from typing import List
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from app.core.database import get_db
from app.api.deps import get_current_project_access
from app.models.project import Project
from app.schemas.api_key import ApiKeyCreate, ApiKeyCreatedResponse, ApiKeyResponse
from app.services.api_key_service import create_api_key, list_project_keys, revoke_api_key

router = APIRouter(prefix="/projects/{project_id}/keys", tags=["API Keys"])


@router.post("", response_model=ApiKeyCreatedResponse, status_code=status.HTTP_201_CREATED)
def generate_project_key(
    project_id: str,
    data: ApiKeyCreate,
    project: Project = Depends(get_current_project_access),
    db: Session = Depends(get_db),
):
    api_key, full_key = create_api_key(
        db,
        project_id=project_id,
        name=data.name,
        key_type=data.key_type,
        expires_in_days=data.expires_in_days,
    )
    return {
        "id": api_key.id,
        "project_id": api_key.project_id,
        "name": api_key.name,
        "key_prefix": api_key.key_prefix,
        "full_key": full_key,
        "key_type": api_key.key_type,
        "created_at": api_key.created_at,
    }


@router.get("", response_model=List[ApiKeyResponse])
def get_project_keys(
    project_id: str,
    project: Project = Depends(get_current_project_access),
    db: Session = Depends(get_db),
):
    return list_project_keys(db, project_id)


@router.delete("/{key_id}")
def revoke_key(
    project_id: str,
    key_id: str,
    project: Project = Depends(get_current_project_access),
    db: Session = Depends(get_db),
):
    success = revoke_api_key(db, project_id, key_id)
    if not success:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="API key not found")
    return {"message": "API key revoked successfully"}
