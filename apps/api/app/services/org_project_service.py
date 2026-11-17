import re
from typing import List, Optional
from sqlalchemy.orm import Session
from app.models.organization import Organization, Membership
from app.models.project import Project, Environment
from app.models.user import User


def slugify(text: str) -> str:
    s = text.lower().strip()
    s = re.sub(r"[^\w\s-]", "", s)
    s = re.sub(r"[\s_-]+", "-", s)
    return s.strip("-")


def create_organization(db: Session, user: User, name: str, slug: Optional[str] = None) -> Organization:
    org_slug = slugify(slug if slug else name)
    # Check slug collision
    counter = 1
    base_slug = org_slug
    while db.query(Organization).filter(Organization.slug == org_slug).first():
        org_slug = f"{base_slug}-{counter}"
        counter += 1

    org = Organization(name=name, slug=org_slug)
    db.add(org)
    db.flush()

    membership = Membership(
        organization_id=org.id,
        user_id=user.id,
        role="owner",
    )
    db.add(membership)
    db.commit()
    db.refresh(org)
    return org


def list_user_organizations(db: Session, user_id: str) -> List[Organization]:
    memberships = db.query(Membership).filter(Membership.user_id == user_id).all()
    org_ids = [m.organization_id for m in memberships]
    if not org_ids:
        return []
    return db.query(Organization).filter(Organization.id.in_(org_ids)).all()


def verify_org_membership(db: Session, org_id: str, user_id: str) -> Optional[Membership]:
    return db.query(Membership).filter(
        Membership.organization_id == org_id,
        Membership.user_id == user_id,
    ).first()


def create_project(db: Session, org_id: str, name: str, slug: Optional[str] = None, description: Optional[str] = None) -> Project:
    proj_slug = slugify(slug if slug else name)
    counter = 1
    base_slug = proj_slug
    while db.query(Project).filter(Project.organization_id == org_id, Project.slug == proj_slug).first():
        proj_slug = f"{base_slug}-{counter}"
        counter += 1

    project = Project(
        organization_id=org_id,
        name=name,
        slug=proj_slug,
        description=description,
    )
    db.add(project)
    db.flush()

    # Create default environments
    for env_name in ["production", "staging"]:
        env = Environment(project_id=project.id, name=env_name)
        db.add(env)

    db.commit()
    db.refresh(project)
    return project


def list_org_projects(db: Session, org_id: str) -> List[Project]:
    return db.query(Project).filter(Project.organization_id == org_id).all()


def get_project(db: Session, project_id: str) -> Optional[Project]:
    return db.query(Project).filter(Project.id == project_id).first()


def verify_project_access(db: Session, project_id: str, user_id: str) -> Optional[Project]:
    project = get_project(db, project_id)
    if not project:
        return None
    membership = verify_org_membership(db, project.organization_id, user_id)
    if not membership:
        return None
    return project
