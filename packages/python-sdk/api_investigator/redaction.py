import re
from typing import Any, Dict, List, Union

SENSITIVE_KEYS = {
    "authorization",
    "cookie",
    "set-cookie",
    "token",
    "access_token",
    "refresh_token",
    "secret",
    "password",
    "passwd",
    "pwd",
    "private_key",
    "credit_card",
    "card_number",
    "cvv",
    "cvc",
    "ssn",
}

BEARER_PATTERN = re.compile(r"Bearer\s+[A-Za-z0-9\-._~+/]+=*", re.IGNORECASE)
CARD_PATTERN = re.compile(r"\b(?:\d[ -]*?){13,16}\b")


def sanitize_string(value: str) -> str:
    if not isinstance(value, str):
        return str(value)
    s = BEARER_PATTERN.sub("Bearer <REDACTED>", value)
    s = CARD_PATTERN.sub("<REDACTED_CARD>", s)
    return s


def sanitize_value(value: Any, max_depth: int = 5, depth: int = 0) -> Any:
    if depth > max_depth:
        return "<REDACTED_DEPTH>"

    if isinstance(value, dict):
        result = {}
        for k, v in value.items():
            key_str = str(k).lower().replace("-", "_")
            if any(s in key_str for s in SENSITIVE_KEYS):
                result[str(k)] = "<REDACTED>"
            else:
                result[str(k)] = sanitize_value(v, max_depth, depth + 1)
        return result

    if isinstance(value, list):
        return [sanitize_value(elem, max_depth, depth + 1) for elem in value]

    if isinstance(value, str):
        return sanitize_string(value)

    return value


def sanitize_headers(headers: Dict[str, str]) -> Dict[str, str]:
    sanitized: Dict[str, str] = {}
    for k, v in headers.items():
        key_lower = k.lower().replace("-", "_")
        if any(s in key_lower for s in SENSITIVE_KEYS):
            if str(v).strip().lower().startswith("bearer "):
                sanitized[k] = "Bearer <REDACTED>"
            else:
                sanitized[k] = "<REDACTED>"
        else:
            sanitized[k] = sanitize_string(str(v))
    return sanitized
