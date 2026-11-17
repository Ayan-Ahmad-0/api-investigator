from typing import Optional
from fastapi import Depends, HTTPException, Header, status
from fastapi.security import OAuth2PasswordBearer
from sqlalchemy.orm import Session
from app.core.database import get_db
from app.core.security import decode_access_token
from app.models.user import User
from app.models.project import Project
from app.models.api_key import ApiKey
from app.services.auth_service import get_user_by_id
from app.services.org_project_service import verify_project_access
from app.services.api_key_service import authenticate_key

oauth2_scheme = OAuth2PasswordBearer(tokenUrl="/api/v1/auth/login", auto_error=False)


def get_current_user(
    token: Optional[str] = Depends(oauth2_scheme),
    db: Session = Depends(get_db),
) -> User:
    if not token:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Authentication credentials were not provided",
            headers={"WWW-Authenticate": "Bearer"},
        )
    payload = decode_access_token(token)
    if not payload or "sub" not in payload:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid or expired authentication token",
            headers={"WWW-Authenticate": "Bearer"},
        )
    user = get_user_by_id(db, payload["sub"])
    if not user:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="User not found",
            headers={"WWW-Authenticate": "Bearer"},
        )
    return user


def get_current_project_access(
    project_id: str,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
) -> Project:
    project = verify_project_access(db, project_id, current_user.id)
    if not project:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Project not found or you do not have permission to access it",
        )
    return project


def get_authenticated_ingestion_key(
    x_ingestion_key: Optional[str] = Header(None, alias="X-Ingestion-Key"),
    authorization: Optional[str] = Header(None),
    db: Session = Depends(get_db),
) -> ApiKey:
    raw_key = None
    if x_ingestion_key:
        raw_key = x_ingestion_key.strip()
    elif authorization and authorization.lower().startswith("bearer "):
        token_candidate = authorization[7:].strip()
        if token_candidate.startswith("inv_"):
            raw_key = token_candidate

    if not raw_key:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Missing required ingestion API key. Provide via 'X-Ingestion-Key' header or Bearer token.",
        )

    api_key = authenticate_key(db, raw_key)
    if not api_key:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid or revoked ingestion API key.",
        )
    return api_key
