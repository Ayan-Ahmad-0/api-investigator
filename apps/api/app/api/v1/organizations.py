from typing import List
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from app.core.database import get_db
from app.api.deps import get_current_user
from app.models.user import User
from app.schemas.organization import OrganizationCreate, OrganizationResponse
from app.services.org_project_service import create_organization, list_user_organizations, verify_org_membership
from app.models.organization import Organization

router = APIRouter(prefix="/organizations", tags=["Organizations"])


@router.get("", response_model=List[OrganizationResponse])
def get_organizations(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    return list_user_organizations(db, current_user.id)


@router.post("", response_model=OrganizationResponse, status_code=status.HTTP_201_CREATED)
def create_new_organization(
    data: OrganizationCreate,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    org = create_organization(db, current_user, data.name, data.slug)
    return org


@router.get("/{org_id}", response_model=OrganizationResponse)
def get_organization_by_id(
    org_id: str,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    membership = verify_org_membership(db, org_id, current_user.id)
    if not membership:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Organization not found")
    org = db.query(Organization).filter(Organization.id == org_id).first()
    return org
