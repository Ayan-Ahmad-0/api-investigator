import hashlib
import hmac
import secrets
from datetime import datetime, timedelta, timezone
from typing import Optional, Tuple
import bcrypt
import jwt
from app.core.config import settings

ALGORITHM = "HS256"


def hash_password(plain_password: str) -> str:
    pwd_bytes = plain_password.encode("utf-8")
    salt = bcrypt.gensalt()
    return bcrypt.hashpw(pwd_bytes, salt).decode("utf-8")


def verify_password(plain_password: str, hashed_password: str) -> bool:
    try:
        return bcrypt.checkpw(plain_password.encode("utf-8"), hashed_password.encode("utf-8"))
    except Exception:
        return False


def create_access_token(data: dict, expires_delta: Optional[timedelta] = None) -> str:
    to_encode = data.copy()
    if expires_delta:
        expire = datetime.now(timezone.utc) + expires_delta
    else:
        expire = datetime.now(timezone.utc) + timedelta(minutes=settings.ACCESS_TOKEN_EXPIRE_MINUTES)
    to_encode.update({"exp": expire})
    encoded_jwt = jwt.encode(to_encode, settings.APP_SECRET_KEY, algorithm=ALGORITHM)
    return encoded_jwt


def decode_access_token(token: str) -> Optional[dict]:
    try:
        payload = jwt.decode(token, settings.APP_SECRET_KEY, algorithms=[ALGORITHM])
        return payload
    except Exception:
        return None


def generate_api_key(key_type: str = "ingest") -> Tuple[str, str, str]:
    """
    Generates a secure API key.
    Returns:
        (full_key, key_prefix, hashed_secret)
    full_key is returned ONLY ONCE to the user.
    """
    prefix_id = secrets.token_hex(4)
    raw_secret = secrets.token_urlsafe(32)
    key_prefix = f"inv_{key_type}_{prefix_id}"
    full_key = f"{key_prefix}_{raw_secret}"
    hashed = hash_api_key_secret(full_key)
    return full_key, key_prefix, hashed


def hash_api_key_secret(full_key: str) -> str:
    return hmac.new(
        settings.INGESTION_KEY_HASH_SECRET.encode("utf-8"),
        full_key.encode("utf-8"),
        hashlib.sha256,
    ).hexdigest()


def verify_api_key(full_key: str, hashed_secret: str) -> bool:
    computed = hash_api_key_secret(full_key)
    return hmac.compare_digest(computed, hashed_secret)
