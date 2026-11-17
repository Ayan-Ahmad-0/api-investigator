from typing import List
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from app.core.database import get_db
from app.api.deps import get_current_user, get_current_project_access
from app.models.user import User
from app.models.project import Project, Environment
from app.schemas.project import ProjectCreate, ProjectUpdate, ProjectResponse, EnvironmentCreate, EnvironmentResponse
from app.services.org_project_service import (
    create_project,
    list_org_projects,
    verify_org_membership,
    list_user_organizations,
)

router = APIRouter(tags=["Projects"])


@router.get("/projects", response_model=List[ProjectResponse])
def get_user_projects(
    organization_id: str = None,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    if organization_id:
        membership = verify_org_membership(db, organization_id, current_user.id)
        if not membership:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Organization not found")
        return list_org_projects(db, organization_id)

    # Return all projects across user's organizations
    orgs = list_user_organizations(db, current_user.id)
    org_ids = [o.id for o in orgs]
    return db.query(Project).filter(Project.organization_id.in_(org_ids)).all()


@router.post("/organizations/{org_id}/projects", response_model=ProjectResponse, status_code=status.HTTP_201_CREATED)
def create_new_project(
    org_id: str,
    data: ProjectCreate,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    membership = verify_org_membership(db, org_id, current_user.id)
    if not membership:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Organization not found")
    return create_project(db, org_id, data.name, data.slug, data.description)


@router.get("/projects/{project_id}", response_model=ProjectResponse)
def get_single_project(
    project_id: str,
    project: Project = Depends(get_current_project_access),
):
    return project


@router.patch("/projects/{project_id}", response_model=ProjectResponse)
def update_project(
    project_id: str,
    data: ProjectUpdate,
    project: Project = Depends(get_current_project_access),
    db: Session = Depends(get_db),
):
    if data.name:
        project.name = data.name
    if data.description is not None:
        project.description = data.description
    db.commit()
    db.refresh(project)
    return project


@router.get("/projects/{project_id}/environments", response_model=List[EnvironmentResponse])
def get_environments(
    project_id: str,
    project: Project = Depends(get_current_project_access),
    db: Session = Depends(get_db),
):
    return db.query(Environment).filter(Environment.project_id == project_id).all()


@router.post("/projects/{project_id}/environments", response_model=EnvironmentResponse, status_code=status.HTTP_201_CREATED)
def create_environment(
    project_id: str,
    data: EnvironmentCreate,
    project: Project = Depends(get_current_project_access),
    db: Session = Depends(get_db),
):
    env = Environment(project_id=project_id, name=data.name.lower())
    db.add(env)
    db.commit()
    db.refresh(env)
    return env
