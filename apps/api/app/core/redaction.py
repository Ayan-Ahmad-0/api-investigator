import re
from typing import Any, Dict, List, Set, Union

SENSITIVE_KEY_PATTERNS = {
    "authorization",
    "cookie",
    "set-cookie",
    "x-api-key",
    "api_key",
    "apikey",
    "token",
    "access_token",
    "refresh_token",
    "secret",
    "password",
    "passwd",
    "pwd",
    "private_key",
    "card_number",
    "credit_card",
    "cvv",
    "cvc",
    "ssn",
    "session",
    "jwt",
}

BEARER_REGEX = re.compile(r"Bearer\s+[A-Za-z0-9\-._~+/]+=*", re.IGNORECASE)
CREDIT_CARD_REGEX = re.compile(r"\b(?:\d[ -]*?){13,16}\b")
API_KEY_REGEX = re.compile(r"\binv_[a-zA-Z0-9_\-]{20,}\b")


def is_sensitive_key(key: str) -> bool:
    k = key.lower().replace("-", "_").replace(" ", "_")
    for pattern in SENSITIVE_KEY_PATTERNS:
        if pattern in k:
            return True
    return False


def sanitize_string(value: str) -> str:
    if not isinstance(value, str):
        return str(value)
    # Mask bearer tokens
    s = BEARER_REGEX.sub("Bearer <REDACTED>", value)
    # Mask API keys
    s = API_KEY_REGEX.sub("<REDACTED_KEY>", s)
    # Mask potential credit cards
    s = CREDIT_CARD_REGEX.sub("<REDACTED_CARD>", s)
    return s


def sanitize_value(value: Any, max_depth: int = 10, current_depth: int = 0) -> Any:
    if current_depth > max_depth:
        return "<REDACTED_MAX_DEPTH>"

    if isinstance(value, dict):
        sanitized = {}
        for k, v in value.items():
            str_k = str(k)
            if is_sensitive_key(str_k):
                sanitized[str_k] = "<REDACTED>"
            else:
                sanitized[str_k] = sanitize_value(v, max_depth, current_depth + 1)
        return sanitized

    if isinstance(value, list):
        return [sanitize_value(elem, max_depth, current_depth + 1) for elem in value]

    if isinstance(value, str):
        return sanitize_string(value)

    return value


def sanitize_headers(headers: Union[Dict[str, Any], List[List[str]]]) -> Dict[str, str]:
    sanitized: Dict[str, str] = {}
    if isinstance(headers, dict):
        for k, v in headers.items():
            if is_sensitive_key(str(k)):
                sanitized[str(k)] = "<REDACTED>"
            else:
                sanitized[str(k)] = sanitize_string(str(v))
    elif isinstance(headers, list):
        for item in headers:
            if len(item) == 2:
                k, v = item
                if is_sensitive_key(str(k)):
                    sanitized[str(k)] = "<REDACTED>"
                else:
                    sanitized[str(k)] = sanitize_string(str(v))
    return sanitized


def sanitize_body(body: Any, max_size_bytes: int = 1024 * 100) -> Any:
    sanitized = sanitize_value(body)
    # Size limiting
    if isinstance(sanitized, str) and len(sanitized) > max_size_bytes:
        return sanitized[:max_size_bytes] + "... <TRUNCATED>"
    return sanitized


def sanitize_stack_trace(stack_trace: str) -> str:
    if not stack_trace:
        return ""
    # Remove sensitive bearer tokens or keys if present in exception messages
    return sanitize_string(stack_trace)
