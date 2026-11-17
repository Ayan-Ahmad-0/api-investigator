from datetime import datetime, timedelta, timezone
from typing import List, Optional, Tuple
from sqlalchemy.orm import Session
from app.core.security import generate_api_key, hash_api_key_secret, verify_api_key
from app.models.api_key import ApiKey


def create_api_key(
    db: Session,
    project_id: str,
    name: str = "Default Ingest Key",
    key_type: str = "ingest",
    expires_in_days: Optional[int] = None,
) -> Tuple[ApiKey, str]:
    full_key, key_prefix, hashed_secret = generate_api_key(key_type=key_type)
    expires_at = None
    if expires_in_days:
        expires_at = datetime.now(timezone.utc) + timedelta(days=expires_in_days)

    api_key = ApiKey(
        project_id=project_id,
        name=name,
        key_prefix=key_prefix,
        hashed_secret=hashed_secret,
        key_type=key_type,
        expires_at=expires_at,
    )
    db.add(api_key)
    db.commit()
    db.refresh(api_key)
    return api_key, full_key


def list_project_keys(db: Session, project_id: str) -> List[ApiKey]:
    return db.query(ApiKey).filter(
        ApiKey.project_id == project_id,
        ApiKey.revoked_at.is_(None),
    ).all()


def revoke_api_key(db: Session, project_id: str, key_id: str) -> bool:
    key = db.query(ApiKey).filter(
        ApiKey.id == key_id,
        ApiKey.project_id == project_id,
    ).first()
    if not key:
        return False
    key.revoked_at = datetime.now(timezone.utc)
    db.commit()
    return True


def authenticate_key(db: Session, raw_key: str) -> Optional[ApiKey]:
    if not raw_key or not raw_key.startswith("inv_"):
        return None

    # Derive prefix: e.g. inv_ingest_a1b2c3d4_... -> prefix is first 3 parts
    parts = raw_key.split("_")
    if len(parts) < 4:
        return None
    key_prefix = f"{parts[0]}_{parts[1]}_{parts[2]}"

    candidates = db.query(ApiKey).filter(
        ApiKey.key_prefix == key_prefix,
        ApiKey.revoked_at.is_(None),
    ).all()

    now = datetime.now(timezone.utc)
    for candidate in candidates:
        if candidate.expires_at and candidate.expires_at < now:
            continue
        if verify_api_key(raw_key, candidate.hashed_secret):
            candidate.last_used_at = now
            db.commit()
            return candidate

    return None
