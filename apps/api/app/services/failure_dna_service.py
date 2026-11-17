import hashlib
import json
import re
from datetime import datetime, timezone
from typing import Dict, Any, List, Optional, Tuple
from sqlalchemy.orm import Session
from app.models.failure_dna import FailureFingerprint
from app.models.incident import Incident, IncidentResolution


def normalize_error_message(message: Optional[str]) -> str:
    if not message:
        return ""
    # Strip UUIDs, numbers, hex addresses, quotes
    msg = re.sub(r"[0-9a-fA-F-]{36}", "<UUID>", message)
    msg = re.sub(r"0x[0-9a-fA-F]+", "<ADDR>", msg)
    msg = re.sub(r"\d+", "<N>", msg)
    msg = re.sub(r"['\"][^'\"]*['\"]", "<STR>", msg)
    return msg.strip()


def generate_failure_fingerprint(
    http_method: str,
    route_template: str,
    status_code: int,
    exception_type: Optional[str] = None,
    sanitized_message: Optional[str] = None,
) -> Tuple[str, Dict[str, Any]]:
    norm_msg = normalize_error_message(sanitized_message)
    features = {
        "method": http_method.upper(),
        "route_template": route_template.strip(),
        "status_code": status_code,
        "exception_type": exception_type or "None",
        "normalized_message": norm_msg[:200],
    }

    # Deterministic SHA-256 fingerprint string
    canonical_repr = f"{features['method']}|{features['route_template']}|{features['status_code']}|{features['exception_type']}|{features['normalized_message']}"
    fp_hash = hashlib.sha256(canonical_repr.encode("utf-8")).hexdigest()[:32]
    return f"dna_{fp_hash}", features


def record_failure_fingerprint(
    db: Session,
    project_id: str,
    fingerprint: str,
    features: Dict[str, Any],
) -> FailureFingerprint:
    now = datetime.now(timezone.utc)
    existing = db.query(FailureFingerprint).filter(
        FailureFingerprint.project_id == project_id,
        FailureFingerprint.fingerprint == fingerprint,
    ).first()

    if existing:
        existing.occurrence_count += 1
        existing.last_seen_at = now
        db.commit()
        db.refresh(existing)
        return existing
    else:
        new_fp = FailureFingerprint(
            project_id=project_id,
            fingerprint=fingerprint,
            normalized_features=json.dumps(features),
            first_seen_at=now,
            last_seen_at=now,
            occurrence_count=1,
        )
        db.add(new_fp)
        db.commit()
        db.refresh(new_fp)
        return new_fp


def find_similar_incidents(
    db: Session,
    project_id: str,
    current_incident_id: str,
    limit: int = 5,
) -> List[Dict[str, Any]]:
    current = db.query(Incident).filter(
        Incident.id == current_incident_id,
        Incident.project_id == project_id,
    ).first()

    if not current:
        return []

    # Query other incidents in same project
    past_incidents = db.query(Incident).filter(
        Incident.project_id == project_id,
        Incident.id != current_incident_id,
    ).order_by(Incident.started_at.desc()).limit(50).all()

    matches = []
    for past in past_incidents:
        matching_signals = []
        differences = []
        score = 0.0

        if current.primary_fingerprint and past.primary_fingerprint:
            if current.primary_fingerprint == past.primary_fingerprint:
                score += 0.6
                matching_signals.append("Identical Failure DNA fingerprint")
            else:
                differences.append("Different failure fingerprint")

        if current.endpoint_id and past.endpoint_id:
            if current.endpoint_id == past.endpoint_id:
                score += 0.25
                matching_signals.append("Affects the same API endpoint")
            else:
                differences.append("Affects different endpoints")

        if current.severity == past.severity:
            score += 0.1
            matching_signals.append(f"Same severity level ({current.severity})")
        else:
            differences.append(f"Severity difference ({current.severity} vs {past.severity})")

        # Check resolution
        resolution_text = None
        if past.resolution:
            resolution_text = past.resolution.resolution_summary

        if score >= 0.25:
            matches.append({
                "incident_id": past.id,
                "title": past.title,
                "severity": past.severity,
                "status": past.status,
                "started_at": past.started_at,
                "resolved_at": past.resolved_at,
                "similarity_score": round(min(score, 1.0), 2),
                "matching_signals": matching_signals,
                "differences": differences,
                "previous_resolution": resolution_text,
            })

    # Sort by similarity score desc
    matches.sort(key=lambda x: x["similarity_score"], reverse=True)
    return matches[:limit]
