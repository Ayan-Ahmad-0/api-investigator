"""
API Investigator - Deterministic Demo Data Seeder
Populates realistic demo fixtures for local development, UI demonstration,
and end-to-end testing according to specification sections 23, 24, and 25.
"""

import os
import sys
import uuid
import json
import random
from datetime import datetime, timedelta, timezone

# Ensure apps/api is in Python path for direct script execution
SCRIPT_DIR = os.path.dirname(os.path.abspath(__file__))
APP_DIR = os.path.abspath(os.path.join(SCRIPT_DIR, "..", ".."))
if APP_DIR not in sys.path:
    sys.path.insert(0, APP_DIR)

from app.core.database import SessionLocal, init_db, engine, Base
from app.core.security import hash_password, hash_api_key_secret
from app.models import (
    User,
    Organization,
    Membership,
    Project,
    Environment,
    ApiKey,
    ApiEndpoint,
    Monitor,
    ApiCheck,
    Incident,
    IncidentEvent,
    IncidentResolution,
    Investigation,
    Hypothesis,
    Evidence,
    TelemetryEvent,
    FailureFingerprint,
    Deployment,
)


def seed_database(reset: bool = False):
    """
    Seeds the database with comprehensive, realistic developer and SRE demo data.
    """
    print("=" * 70)
    print("API Investigator - Seeding Demo Database Fixtures")
    print("=" * 70)

    # Initialize schema
    init_db()
    db = SessionLocal()

    try:
        # Check if already seeded
        existing_org = db.query(Organization).filter(Organization.slug == "acme-payments").first()
        if existing_org:
            if reset:
                print("Reset requested. Dropping all existing data...")
                db.close()
                Base.metadata.drop_all(bind=engine)
                Base.metadata.create_all(bind=engine)
                db = SessionLocal()
            else:
                print("Database already contains demo data for organization 'acme-payments'.")
                print("Run with --reset to wipe and re-seed.")
                return

        now = datetime.now(timezone.utc)

        # ----------------------------------------------------------------------
        # 1. Users
        # ----------------------------------------------------------------------
        print("[1/10] Creating demo users...")
        user_alex = User(
            id=str(uuid.uuid4()),
            email="demo@api-investigator.dev",
            name="Alex Rivera",
            password_hash=hash_password("Password123!"),
            email_verified_at=now - timedelta(days=90),
            created_at=now - timedelta(days=90),
        )
        user_morgan = User(
            id=str(uuid.uuid4()),
            email="sre-lead@api-investigator.dev",
            name="Morgan Chen",
            password_hash=hash_password("Password123!"),
            email_verified_at=now - timedelta(days=60),
            created_at=now - timedelta(days=60),
        )
        db.add_all([user_alex, user_morgan])
        db.flush()

        # ----------------------------------------------------------------------
        # 2. Organization & Memberships
        # ----------------------------------------------------------------------
        print("[2/10] Creating organization & memberships...")
        org_acme = Organization(
            id=str(uuid.uuid4()),
            name="Acme Payments Platform",
            slug="acme-payments",
            created_at=now - timedelta(days=90),
        )
        db.add(org_acme)
        db.flush()

        membership_alex = Membership(
            id=str(uuid.uuid4()),
            organization_id=org_acme.id,
            user_id=user_alex.id,
            role="owner",
            created_at=now - timedelta(days=90),
        )
        membership_morgan = Membership(
            id=str(uuid.uuid4()),
            organization_id=org_acme.id,
            user_id=user_morgan.id,
            role="admin",
            created_at=now - timedelta(days=60),
        )
        db.add_all([membership_alex, membership_morgan])
        db.flush()

        # ----------------------------------------------------------------------
        # 3. Projects & Environments
        # ----------------------------------------------------------------------
        print("[3/10] Creating projects & environments...")
        proj_billing = Project(
            id=str(uuid.uuid4()),
            organization_id=org_acme.id,
            name="Core Billing & Checkout API",
            slug="billing-checkout-api",
            description="Mission-critical payment processing, recurring billing, and credit card tokenization service.",
            created_at=now - timedelta(days=90),
        )
        proj_portal = Project(
            id=str(uuid.uuid4()),
            organization_id=org_acme.id,
            name="Customer Portal & Onboarding API",
            slug="customer-portal-api",
            description="Customer profile settings, subscription dashboard, and authentication endpoints.",
            created_at=now - timedelta(days=45),
        )
        db.add_all([proj_billing, proj_portal])
        db.flush()

        env_billing_prod = Environment(
            id=str(uuid.uuid4()),
            project_id=proj_billing.id,
            name="production",
            created_at=now - timedelta(days=90),
        )
        env_billing_staging = Environment(
            id=str(uuid.uuid4()),
            project_id=proj_billing.id,
            name="staging",
            created_at=now - timedelta(days=90),
        )
        env_portal_prod = Environment(
            id=str(uuid.uuid4()),
            project_id=proj_portal.id,
            name="production",
            created_at=now - timedelta(days=45),
        )
        db.add_all([env_billing_prod, env_billing_staging, env_portal_prod])
        db.flush()

        # ----------------------------------------------------------------------
        # 4. Ingestion API Keys
        # ----------------------------------------------------------------------
        print("[4/10] Generating project ingestion keys...")
        # Full key shown once to user: inv_ingest_live_acme_demo_sec_9941a87b28f804e12e
        raw_key_billing = "inv_ingest_live_acme_demo_sec_9941a87b28f804e12e"
        key_billing = ApiKey(
            id=str(uuid.uuid4()),
            project_id=proj_billing.id,
            name="Production Billing Ingest Key",
            key_prefix="inv_ingest_live_acme",
            hashed_secret=hash_api_key_secret(raw_key_billing),
            key_type="ingest",
            last_used_at=now - timedelta(seconds=12),
            created_at=now - timedelta(days=90),
        )
        raw_key_portal = "inv_ingest_live_portal_demo_sec_51e9b27a13d091a7"
        key_portal = ApiKey(
            id=str(uuid.uuid4()),
            project_id=proj_portal.id,
            name="Portal Backend Ingest Key",
            key_prefix="inv_ingest_live_portal",
            hashed_secret=hash_api_key_secret(raw_key_portal),
            key_type="ingest",
            last_used_at=now - timedelta(minutes=4),
            created_at=now - timedelta(days=45),
        )
        db.add_all([key_billing, key_portal])
        db.flush()

        # ----------------------------------------------------------------------
        # 5. Endpoints & Monitors
        # ----------------------------------------------------------------------
        print("[5/10] Registering endpoints & active monitors...")
        endpoint_specs = [
            {
                "name": "Process Credit Card Charge",
                "method": "POST",
                "route": "/v1/payments/charge",
                "monitor_url": "http://localhost:8000/demo/payments/charge",
                "interval": 60,
                "timeout": 5000,
                "expected": "200,201",
            },
            {
                "name": "Create Checkout Session",
                "method": "POST",
                "route": "/v1/checkout/sessions",
                "monitor_url": "http://localhost:8000/demo/checkout/sessions",
                "interval": 60,
                "timeout": 3000,
                "expected": "200,201",
            },
            {
                "name": "User Profile & Subscriptions",
                "method": "GET",
                "route": "/v1/users/{id}/subscriptions",
                "monitor_url": "http://localhost:8000/demo/users/sub_10293/subscriptions",
                "interval": 120,
                "timeout": 2000,
                "expected": "200",
            },
            {
                "name": "Service Health & Liveness Probe",
                "method": "GET",
                "route": "/health",
                "monitor_url": "http://localhost:8000/health",
                "interval": 30,
                "timeout": 1000,
                "expected": "200",
            },
            {
                "name": "Simulated Latency Test Endpoint",
                "method": "GET",
                "route": "/demo/slow",
                "monitor_url": "http://localhost:8000/demo/slow",
                "interval": 60,
                "timeout": 4000,
                "expected": "200",
            },
            {
                "name": "Flaky External Dependency Endpoint",
                "method": "GET",
                "route": "/demo/unstable",
                "monitor_url": "http://localhost:8000/demo/unstable",
                "interval": 60,
                "timeout": 3000,
                "expected": "200",
            },
        ]

        created_endpoints = {}
        created_monitors = {}

        for spec in endpoint_specs:
            ep = ApiEndpoint(
                id=str(uuid.uuid4()),
                project_id=proj_billing.id,
                environment_id=env_billing_prod.id,
                name=spec["name"],
                method=spec["method"],
                route_template=spec["route"],
                created_at=now - timedelta(days=30),
            )
            db.add(ep)
            db.flush()
            created_endpoints[spec["route"]] = ep

            mon = Monitor(
                id=str(uuid.uuid4()),
                project_id=proj_billing.id,
                endpoint_id=ep.id,
                name=f"Monitor: {spec['name']}",
                url=spec["monitor_url"],
                method=spec["method"],
                interval_seconds=spec["interval"],
                timeout_ms=spec["timeout"],
                expected_status_codes=spec["expected"],
                expected_conditions=json.dumps({"max_latency_ms": spec["timeout"]}),
                enabled=True,
                created_at=now - timedelta(days=30),
            )
            db.add(mon)
            db.flush()
            created_monitors[spec["route"]] = mon

        # ----------------------------------------------------------------------
        # 6. Historical Check Logs (ApiCheck)
        # ----------------------------------------------------------------------
        print("[6/10] Synthesizing historical check logs across 24h timeline...")
        checks_to_insert = []
        random.seed(42)  # Deterministic seed

        # Generate hourly checks over past 24 hours
        for hours_ago in range(24, 0, -1):
            check_time = now - timedelta(hours=hours_ago, minutes=random.randint(0, 50))
            for route, mon in created_monitors.items():
                # Default baseline healthy check
                status = "healthy"
                http_status = 200
                duration_ms = round(random.uniform(42.0, 115.0), 2)
                dns_ms = round(random.uniform(4.0, 14.0), 2)
                connect_ms = round(random.uniform(8.0, 22.0), 2)
                tls_ms = round(random.uniform(12.0, 28.0), 2)
                ttfb_ms = round(duration_ms - (dns_ms + connect_ms + tls_ms), 2)
                error_cat = None
                resp_sample = None

                # Specific conditions for incidents
                # Incident 1 window: /v1/payments/charge over last 40 minutes (hours_ago == 1 or 0)
                if route == "/v1/payments/charge" and hours_ago <= 1:
                    status = "failing"
                    http_status = 429
                    duration_ms = round(random.uniform(280.0, 480.0), 2)
                    error_cat = "HTTP_429_TOO_MANY_REQUESTS"
                    resp_sample = json.dumps({
                        "error": {
                            "type": "rate_limit_error",
                            "message": "Rate limit exceeded: 100 requests per minute quota reached.",
                            "code": "rate_limit",
                            "retry_after": 4
                        }
                    })

                # Incident 2 window: /v1/users/{id}/subscriptions 18 to 17 hours ago
                elif route == "/v1/users/{id}/subscriptions" and (17 <= hours_ago <= 18):
                    status = "failing"
                    http_status = 500
                    duration_ms = round(random.uniform(4200.0, 5000.0), 2)
                    error_cat = "HTTP_500_INTERNAL_SERVER_ERROR"
                    resp_sample = json.dumps({
                        "error": "InternalServerError",
                        "message": "asyncpg.exceptions.TooManyConnectionsError: remaining connection slots are reserved"
                    })

                # Degraded slow endpoint
                elif route == "/demo/slow":
                    status = "degraded"
                    duration_ms = round(random.uniform(1400.0, 2400.0), 2)

                # Unstable endpoint (occasional 503)
                elif route == "/demo/unstable" and random.random() < 0.35:
                    status = "failing"
                    http_status = 503
                    duration_ms = round(random.uniform(900.0, 2100.0), 2)
                    error_cat = "HTTP_503_SERVICE_UNAVAILABLE"
                    resp_sample = json.dumps({"error": "Service Unavailable: downstream simulator reset"})

                check_obj = ApiCheck(
                    id=str(uuid.uuid4()),
                    project_id=proj_billing.id,
                    monitor_id=mon.id,
                    checked_at=check_time,
                    status=status,
                    http_status_code=http_status,
                    duration_ms=duration_ms,
                    dns_duration_ms=dns_ms,
                    connect_duration_ms=connect_ms,
                    tls_duration_ms=tls_ms,
                    ttfb_ms=max(1.0, ttfb_ms),
                    error_category=error_cat,
                    sanitized_response_sample=resp_sample,
                )
                checks_to_insert.append(check_obj)

        db.bulk_save_objects(checks_to_insert)
        db.flush()

        # ----------------------------------------------------------------------
        # 7. Telemetry Events (TelemetryEvent)
        # ----------------------------------------------------------------------
        print("[7/10] Ingesting realistic application-side telemetry events...")
        telemetry_events = []

        # Baseline successful events
        for i in range(25):
            t_time = now - timedelta(minutes=random.randint(5, 120))
            t_req = TelemetryEvent(
                id=str(uuid.uuid4()),
                project_id=proj_billing.id,
                environment_id=env_billing_prod.id,
                event_type="request",
                timestamp=t_time,
                service_name="billing-api",
                service_version="v2.4.2",
                http_method="POST",
                route_template="/v1/payments/charge",
                status_code=200,
                duration_ms=round(random.uniform(85.0, 160.0), 2),
                request_id=f"req_{secrets_token()}",
                trace_id=f"tr_{secrets_token()}",
                span_id=f"sp_{secrets_token()[:8]}",
                sanitized_attributes=json.dumps({
                    "http.status_code": 200,
                    "customer.tier": "enterprise",
                    "payment.currency": "USD",
                    "authorization": "Bearer [REDACTED]",
                }),
            )
            telemetry_events.append(t_req)

        # Incident 1 error telemetry: StripeRateLimitError (past 35 mins)
        fp_stripe = "fp_stripe_rate_limit_charge_429"
        for i in range(20):
            err_time = now - timedelta(minutes=random.randint(1, 35))
            err_event = TelemetryEvent(
                id=str(uuid.uuid4()),
                project_id=proj_billing.id,
                environment_id=env_billing_prod.id,
                event_type="error",
                timestamp=err_time,
                service_name="billing-api",
                service_version="v2.4.2",
                http_method="POST",
                route_template="/v1/payments/charge",
                status_code=429,
                duration_ms=round(random.uniform(250.0, 520.0), 2),
                exception_type="StripeRateLimitError",
                sanitized_message="Rate limit exceeded: 429 Too Many Requests from api.stripe.com/v1/charges",
                stack_trace=(
                    "Traceback (most recent call last):\n"
                    '  File "app/services/checkout.py", line 142, in process_payment\n'
                    "    charge = stripe_client.charges.create(\n"
                    '  File "app/core/stripe_client.py", line 88, in create\n'
                    '    raise StripeRateLimitError("Rate limit exceeded")\n'
                    "StripeRateLimitError: Rate limit exceeded"
                ),
                request_id=f"req_fail_{secrets_token()}",
                trace_id=f"tr_fail_{secrets_token()}",
                span_id=f"sp_{secrets_token()[:8]}",
                sanitized_attributes=json.dumps({
                    "downstream.service": "stripe",
                    "downstream.error_code": "rate_limit",
                    "retry_after_seconds": 4,
                    "authorization": "Bearer [REDACTED]",
                    "idempotency_key": "[REDACTED]",
                }),
                fingerprint=fp_stripe,
            )
            telemetry_events.append(err_event)

        # Incident 2 error telemetry: TooManyConnectionsError (18 hours ago)
        fp_pg = "fp_postgres_pool_exhaustion_500"
        for i in range(15):
            err_time = now - timedelta(hours=18, minutes=random.randint(2, 45))
            err_event = TelemetryEvent(
                id=str(uuid.uuid4()),
                project_id=proj_billing.id,
                environment_id=env_billing_prod.id,
                event_type="error",
                timestamp=err_time,
                service_name="billing-api",
                service_version="v2.4.1",
                http_method="GET",
                route_template="/v1/users/{id}/subscriptions",
                status_code=500,
                duration_ms=round(random.uniform(4500.0, 5000.0), 2),
                exception_type="asyncpg.exceptions.TooManyConnectionsError",
                sanitized_message="remaining connection slots are reserved for non-replication superuser connections",
                stack_trace=(
                    "Traceback (most recent call last):\n"
                    '  File "app/services/subscriptions.py", line 67, in get_active_subscription\n'
                    "    async with session_maker() as session:\n"
                    '  File "sqlalchemy/ext/asyncio/engine.py", line 890, in connect\n'
                    '    raise TooManyConnectionsError("connection pool exhausted")\n'
                    "asyncpg.exceptions.TooManyConnectionsError: remaining connection slots are reserved"
                ),
                request_id=f"req_pg_{secrets_token()}",
                trace_id=f"tr_pg_{secrets_token()}",
                sanitized_attributes=json.dumps({
                    "db.pool.max_size": 10,
                    "db.pool.checked_out": 10,
                    "db.statement": "SELECT * FROM subscriptions WHERE user_id = :val",
                }),
                fingerprint=fp_pg,
            )
            telemetry_events.append(err_event)

        db.bulk_save_objects(telemetry_events)
        db.flush()

        # ----------------------------------------------------------------------
        # 8. Deployments
        # ----------------------------------------------------------------------
        print("[8/10] Recording git deployment events...")
        deploy_fix = Deployment(
            id=str(uuid.uuid4()),
            project_id=proj_billing.id,
            environment_id=env_billing_prod.id,
            provider="github",
            repository="acme-payments/billing-api",
            commit_sha="d3e4f1b8a920394857c610293847561029384756",
            branch="main",
            deployment_reference="release-v2.4.2",
            deployed_at=now - timedelta(hours=17),
            metadata_json=json.dumps({
                "message": "hotfix: add idx_subscriptions_user_id and increase db pool max_overflow to 25",
                "author": "morgan@acme-payments.io",
            }),
        )
        deploy_bad = Deployment(
            id=str(uuid.uuid4()),
            project_id=proj_billing.id,
            environment_id=env_billing_prod.id,
            provider="github",
            repository="acme-payments/billing-api",
            commit_sha="d3e4f1a7920394857c6102938475610293847111",
            branch="main",
            deployment_reference="release-v2.4.1",
            deployed_at=now - timedelta(hours=18, minutes=15),
            metadata_json=json.dumps({
                "message": "feat: add customer subscription tier lookup query",
                "author": "alex@acme-payments.io",
            }),
        )
        deploy_recent = Deployment(
            id=str(uuid.uuid4()),
            project_id=proj_billing.id,
            environment_id=env_billing_prod.id,
            provider="github",
            repository="acme-payments/billing-api",
            commit_sha="9f8e7d6c5b4a3920192837465501928374650192",
            branch="main",
            deployment_reference="release-v2.4.2-patch1",
            deployed_at=now - timedelta(hours=4),
            metadata_json=json.dumps({
                "message": "perf: enable concurrency on checkout job worker pool",
                "author": "alex@acme-payments.io",
            }),
        )
        db.add_all([deploy_bad, deploy_fix, deploy_recent])
        db.flush()

        # ----------------------------------------------------------------------
        # 9. Incidents & Timeline Events
        # ----------------------------------------------------------------------
        print("[9/10] Creating active, resolved, and inconclusive incidents...")

        # INCIDENT 1: ACTIVE / CRITICAL (Stripe Rate Limit Spike)
        inc_active = Incident(
            id=str(uuid.uuid4()),
            project_id=proj_billing.id,
            environment_id=env_billing_prod.id,
            endpoint_id=created_endpoints["/v1/payments/charge"].id,
            title="Upstream Payment Processor 429 Rate Limit Spike on /v1/payments/charge",
            description=(
                "Sustained burst of HTTP 429 Too Many Requests observed on /v1/payments/charge "
                "following retry storm from checkout worker pool. Observed error rate peaked at 48.2%."
            ),
            severity="critical",
            status="active",
            started_at=now - timedelta(minutes=35),
            detected_at=now - timedelta(minutes=33),
            primary_fingerprint=fp_stripe,
            created_at=now - timedelta(minutes=33),
        )
        db.add(inc_active)
        db.flush()

        # Incident 1 Timeline Events
        inc1_events = [
            IncidentEvent(
                id=str(uuid.uuid4()),
                incident_id=inc_active.id,
                project_id=proj_billing.id,
                event_type="error_spike",
                timestamp=now - timedelta(minutes=35),
                summary="HTTP 429 error rate on /v1/payments/charge crossed 5.0% threshold (observed 48.2%)",
                metadata_json=json.dumps({"rate": 0.482, "threshold": 0.05}),
            ),
            IncidentEvent(
                id=str(uuid.uuid4()),
                incident_id=inc_active.id,
                project_id=proj_billing.id,
                event_type="check_failure",
                timestamp=now - timedelta(minutes=33),
                summary="Monitor 'Monitor: Process Credit Card Charge' failed: HTTP 429 Too Many Requests",
                metadata_json=json.dumps({"status_code": 429, "latency_ms": 380}),
            ),
            IncidentEvent(
                id=str(uuid.uuid4()),
                incident_id=inc_active.id,
                project_id=proj_billing.id,
                event_type="investigation_started",
                timestamp=now - timedelta(minutes=28),
                summary="AI Investigation initiated using calibrated model gemini-1.5-pro",
                metadata_json=json.dumps({"provider": "mock", "model": "gemini-1.5-pro"}),
            ),
            IncidentEvent(
                id=str(uuid.uuid4()),
                incident_id=inc_active.id,
                project_id=proj_billing.id,
                event_type="investigation_completed",
                timestamp=now - timedelta(minutes=26),
                summary="Investigation completed: High confidence hypothesis identified upstream retry storm",
                metadata_json=json.dumps({"hypotheses_count": 2, "highest_confidence": "high"}),
            ),
        ]
        db.add_all(inc1_events)
        db.flush()

        # INCIDENT 2: RESOLVED / MAJOR (Postgres Pool Exhaustion)
        inc_resolved = Incident(
            id=str(uuid.uuid4()),
            project_id=proj_billing.id,
            environment_id=env_billing_prod.id,
            endpoint_id=created_endpoints["/v1/users/{id}/subscriptions"].id,
            title="PostgreSQL Connection Pool Exhaustion on /v1/users/{id}/subscriptions",
            description=(
                "Database connection pool saturated following release-v2.4.1. Unindexed subscription "
                "queries triggered full table scans on 4.2M rows under peak load, exhausting pool slots."
            ),
            severity="major",
            status="resolved",
            started_at=now - timedelta(hours=18),
            detected_at=now - timedelta(hours=18),
            resolved_at=now - timedelta(hours=17),
            primary_fingerprint=fp_pg,
            created_at=now - timedelta(hours=18),
        )
        db.add(inc_resolved)
        db.flush()

        inc2_events = [
            IncidentEvent(
                id=str(uuid.uuid4()),
                incident_id=inc_resolved.id,
                project_id=proj_billing.id,
                event_type="deployment",
                timestamp=now - timedelta(hours=18, minutes=15),
                summary="Deployment release-v2.4.1 (commit d3e4f1a) deployed by alex@acme-payments.io",
                metadata_json=json.dumps({"commit": "d3e4f1a", "service": "billing-api"}),
            ),
            IncidentEvent(
                id=str(uuid.uuid4()),
                incident_id=inc_resolved.id,
                project_id=proj_billing.id,
                event_type="error_spike",
                timestamp=now - timedelta(hours=18),
                summary="500 Internal Server Error spike: 62.4% error rate on /v1/users/{id}/subscriptions",
                metadata_json=json.dumps({"rate": 0.624}),
            ),
            IncidentEvent(
                id=str(uuid.uuid4()),
                incident_id=inc_resolved.id,
                project_id=proj_billing.id,
                event_type="deployment",
                timestamp=now - timedelta(hours=17),
                summary="Hotfix deployment release-v2.4.2 (commit d3e4f1b) deployed by morgan@acme-payments.io",
                metadata_json=json.dumps({"commit": "d3e4f1b"}),
            ),
            IncidentEvent(
                id=str(uuid.uuid4()),
                incident_id=inc_resolved.id,
                project_id=proj_billing.id,
                event_type="resolution",
                timestamp=now - timedelta(hours=17),
                summary="Incident resolved after hotfix deployment restored healthy response latency",
                metadata_json=json.dumps({"resolved_by": "Morgan Chen"}),
            ),
        ]
        db.add_all(inc2_events)
        db.flush()

        inc2_resolution = IncidentResolution(
            id=str(uuid.uuid4()),
            incident_id=inc_resolved.id,
            project_id=proj_billing.id,
            resolution_summary=(
                "Added missing compound index `idx_subscriptions_user_id` on PostgreSQL `subscriptions` table "
                "and increased connection pool `max_overflow` from 5 to 25. Response latency dropped from 4800ms to 42ms."
            ),
            root_cause_confirmed=(
                "Unindexed subscription tier query in release-v2.4.1 triggered sequential table scans on 4.2M rows "
                "under concurrent load, holding connection pool slots open until exhaustion."
            ),
            resolved_by="Morgan Chen (SRE Lead)",
            created_at=now - timedelta(hours=17),
        )
        db.add(inc2_resolution)
        db.flush()

        # INCIDENT 3: INCONCLUSIVE / HIGH (Intermittent 502 Ingress Drops)
        inc_inconclusive = Incident(
            id=str(uuid.uuid4()),
            project_id=proj_billing.id,
            environment_id=env_billing_prod.id,
            endpoint_id=created_endpoints["/v1/checkout/sessions"].id,
            title="Intermittent 502 Bad Gateway on /v1/checkout/sessions",
            description=(
                "Intermittent 502 Bad Gateway errors observed from edge reverse proxy. Telemetry contains "
                "sparse trace headers without corresponding backend application exceptions."
            ),
            severity="high",
            status="inconclusive",
            started_at=now - timedelta(hours=2),
            detected_at=now - timedelta(hours=1, minutes=50),
            primary_fingerprint="fp_ingress_502_bad_gateway",
            created_at=now - timedelta(hours=1, minutes=50),
        )
        db.add(inc_inconclusive)
        db.flush()

        # ----------------------------------------------------------------------
        # 10. Investigations, Hypotheses, Evidence & Failure Reproduction
        # ----------------------------------------------------------------------
        print("[10/10] Attaching evidence-backed investigations and reproduction packages...")

        # INVESTIGATION 1: COMPLETED (Incident 1)
        # Structured report conforming to specification section 11.5
        inv1_report = {
            "incident_summary": (
                "The incident was triggered by a rapid burst of retried checkout transactions hitting "
                "the upstream Stripe API without exponential backoff or jitter, resulting in 429 Too Many Requests responses. "
                "The internal worker pool amplified the traffic by retrying immediately upon failure."
            ),
            "impact": {
                "affected_endpoints": ["/v1/payments/charge"],
                "observed_error_rate": 0.482,
                "latency_change": "+260ms",
                "time_window": {
                    "start": (now - timedelta(minutes=35)).isoformat(),
                    "end": now.isoformat(),
                },
            },
            "root_cause_hypotheses": [
                {
                    "title": "Upstream Stripe API rate limit exceeded due to immediate retry storm without exponential backoff",
                    "confidence": "high",
                    "explanation": (
                        "Telemetry indicates 429 Too Many Requests responses from api.stripe.com/v1/charges with 'retry-after' headers. "
                        "Correlated request logs show the checkout worker retried failed attempts 4 times within 180ms using identical idempotency keys."
                    ),
                    "supporting_evidence_ids": ["ev_1", "ev_2", "ev_3"],
                    "contradicting_evidence_ids": [],
                    "missing_evidence": ["Stripe dashboard merchant rate limit configuration"],
                    "verification_steps": [
                        "Verify checkout worker retry configuration has exponential backoff enabled with full jitter",
                        "Check current rate limit tier in Stripe Merchant Dashboard",
                    ],
                },
                {
                    "title": "Redis rate limiter token exhaustion",
                    "confidence": "low",
                    "explanation": "Internal rate limiter may have failed to replenish tokens due to Redis latency.",
                    "supporting_evidence_ids": [],
                    "contradicting_evidence_ids": ["ev_4"],
                    "missing_evidence": [],
                    "verification_steps": ["Inspect Redis latency metrics and command queue depth"],
                },
            ],
            "timeline_event_ids": [e.id for e in inc1_events],
            "similar_incident_ids": [],
            "recommended_next_steps": [
                "Deploy checkout worker update with exponential backoff (min: 500ms, max: 10s, jitter: full)",
                "Respect downstream 'Retry-After' header received in 429 responses",
                "Configure circuit breaker for Stripe API client to fail fast on sustained 429s",
            ],
            "limitations": [
                "Upstream Stripe merchant account tier quota is not directly accessible via internal telemetry"
            ],
            "status": "investigated",
            "failure_reproduction": {
                "method": "POST",
                "route": "/v1/payments/charge",
                "curl_template": (
                    "curl -X POST \"http://localhost:8000/v1/payments/charge\" \\\n"
                    "  -H \"Content-Type: application/json\" \\\n"
                    "  -H \"Authorization: Bearer <REDACTED>\" \\\n"
                    "  -H \"X-Idempotency-Key: <REDACTED>\" \\\n"
                    "  -d '{\"amount\": 4900, \"currency\": \"USD\", \"customer_id\": \"cus_9941a8\", \"source\": \"tok_visa\"}'"
                ),
                "safe_request_payload": {
                    "amount": 4900,
                    "currency": "USD",
                    "customer_id": "cus_9941a8",
                    "source": "tok_visa",
                },
                "safe_response_payload": {
                    "error": {
                        "type": "rate_limit_error",
                        "code": "rate_limit",
                        "message": "Rate limit exceeded (100 req/min)",
                    }
                },
                "comparison_vs_last_successful": {
                    "status_code": {"failed": 429, "successful": 200},
                    "duration_ms": {"failed": 380.0, "successful": 110.0},
                    "downstream_response": {
                        "failed": "rate_limit_error",
                        "successful": "ch_3M4o9281_charge_success",
                    },
                },
            },
        }

        inv_1 = Investigation(
            id=str(uuid.uuid4()),
            incident_id=inc_active.id,
            project_id=proj_billing.id,
            status="completed",
            provider="mock",
            model="gemini-1.5-pro",
            started_at=now - timedelta(minutes=28),
            completed_at=now - timedelta(minutes=26),
            summary=(
                "High confidence: Upstream Stripe rate limit exceeded due to checkout worker "
                "retry storm lacking exponential backoff. Sustained 429 errors observed on 48.2% of requests."
            ),
            report_json=json.dumps(inv1_report),
            created_by="system-automated-investigator",
            created_at=now - timedelta(minutes=28),
        )
        db.add(inv_1)
        db.flush()

        hyp_1 = Hypothesis(
            id=str(uuid.uuid4()),
            investigation_id=inv_1.id,
            title="Upstream Stripe API rate limit exceeded due to immediate retry storm without exponential backoff",
            explanation=(
                "Telemetry indicates 429 Too Many Requests responses from api.stripe.com/v1/charges with 'retry-after' headers. "
                "Correlated request logs show the checkout worker retried failed attempts 4 times within 180ms using identical idempotency keys."
            ),
            confidence="high",
            rank=1,
            created_at=now - timedelta(minutes=27),
        )
        hyp_2 = Hypothesis(
            id=str(uuid.uuid4()),
            investigation_id=inv_1.id,
            title="Redis rate limiter token exhaustion",
            explanation="Internal rate limiter may have failed to replenish tokens due to Redis latency.",
            confidence="low",
            rank=2,
            created_at=now - timedelta(minutes=27),
        )
        db.add_all([hyp_1, hyp_2])
        db.flush()

        ev_1 = Evidence(
            id=str(uuid.uuid4()),
            investigation_id=inv_1.id,
            project_id=proj_billing.id,
            evidence_type="metric",
            source_record_id="metric_spike_429",
            timestamp=now - timedelta(minutes=35),
            summary="HTTP 429 error rate spiked to 48.2% across 1,240 requests in 10-minute window",
            sanitized_excerpt='{"route": "/v1/payments/charge", "status_code": 429, "rate": 0.482}',
            relationship="supporting",
        )
        ev_2 = Evidence(
            id=str(uuid.uuid4()),
            investigation_id=inv_1.id,
            project_id=proj_billing.id,
            evidence_type="log",
            source_record_id="log_stripe_rate_limit",
            timestamp=now - timedelta(minutes=34),
            summary="Downstream Stripe API response contained HTTP 429 and Retry-After: 4 header",
            sanitized_excerpt='{"downstream": "api.stripe.com", "code": "rate_limit", "retry_after": 4}',
            relationship="supporting",
        )
        ev_3 = Evidence(
            id=str(uuid.uuid4()),
            investigation_id=inv_1.id,
            project_id=proj_billing.id,
            evidence_type="trace",
            source_record_id="trace_retry_burst",
            timestamp=now - timedelta(minutes=33),
            summary="Distributed trace shows 4 consecutive charge attempts with identical idempotency key within 180ms",
            sanitized_excerpt='{"attempts": 4, "elapsed_ms": 180, "backoff_ms": 0}',
            relationship="supporting",
        )
        ev_4 = Evidence(
            id=str(uuid.uuid4()),
            investigation_id=inv_1.id,
            project_id=proj_billing.id,
            evidence_type="metric",
            source_record_id="metric_redis_latency",
            timestamp=now - timedelta(minutes=30),
            summary="Redis ping latency remained under 0.8ms with zero dropped connections throughout the window",
            sanitized_excerpt='{"redis_avg_latency_ms": 0.78, "redis_healthy": true}',
            relationship="contradicting",
        )
        db.add_all([ev_1, ev_2, ev_3, ev_4])
        db.flush()

        # INVESTIGATION 2: INCONCLUSIVE (Incident 3)
        inv2_report = {
            "incident_summary": (
                "Insufficient evidence to verify root cause. Edge reverse proxy returned 502 Bad Gateway, "
                "but upstream application instances show normal CPU/memory and zero unhandled exceptions in the time window."
            ),
            "impact": {
                "affected_endpoints": ["/v1/checkout/sessions"],
                "observed_error_rate": 0.08,
                "latency_change": None,
                "time_window": {
                    "start": (now - timedelta(hours=2)).isoformat(),
                    "end": (now - timedelta(hours=1, minutes=40)).isoformat(),
                },
            },
            "root_cause_hypotheses": [
                {
                    "title": "Ingress reverse proxy prematurely terminating idle TCP connections",
                    "confidence": "low",
                    "explanation": "Reverse proxy keepalive timeout may be shorter than backend uvicorn keepalive timeout.",
                    "supporting_evidence_ids": ["ev_inc_1"],
                    "contradicting_evidence_ids": [],
                    "missing_evidence": [
                        "Edge reverse proxy access logs with upstream connect timing",
                        "TCP RST packet counters",
                    ],
                    "verification_steps": [
                        "Inspect ingress proxy keepalive timeout configuration vs uvicorn keepalive setting",
                        "Enable upstream connection debug logs on edge gateway",
                    ],
                }
            ],
            "timeline_event_ids": [],
            "similar_incident_ids": [],
            "recommended_next_steps": [
                "Enable access logging on edge reverse proxy with $upstream_response_time and $upstream_status",
                "Align ingress keepalive timeout (e.g. 65s) with backend server keepalive timeout (e.g. 60s)",
            ],
            "limitations": [
                "No reverse proxy access logs available in ingested telemetry",
                "No socket reset counters instrumented in application telemetry",
            ],
            "status": "inconclusive",
            "failure_reproduction": {
                "method": "POST",
                "route": "/v1/checkout/sessions",
                "curl_template": (
                    "curl -X POST \"http://localhost:8000/v1/checkout/sessions\" \\\n"
                    "  -H \"Content-Type: application/json\" \\\n"
                    "  -H \"Authorization: Bearer <REDACTED>\" \\\n"
                    "  -d '{\"items\": [{\"id\": \"sku_123\", \"quantity\": 1}]}'"
                ),
            },
        }

        inv_inconclusive = Investigation(
            id=str(uuid.uuid4()),
            incident_id=inc_inconclusive.id,
            project_id=proj_billing.id,
            status="inconclusive",
            provider="mock",
            model="gemini-1.5-pro",
            started_at=now - timedelta(hours=1, minutes=45),
            completed_at=now - timedelta(hours=1, minutes=42),
            summary=(
                "Inconclusive: Insufficient telemetry to identify root cause of 502 Bad Gateway. "
                "Missing edge reverse proxy access logs and network socket counters."
            ),
            report_json=json.dumps(inv2_report),
            created_by="system-automated-investigator",
            created_at=now - timedelta(hours=1, minutes=45),
        )
        db.add(inv_inconclusive)
        db.flush()

        # ----------------------------------------------------------------------
        # 11. Failure DNA Fingerprints (FailureFingerprint)
        # ----------------------------------------------------------------------
        fp_rec_stripe = FailureFingerprint(
            id=str(uuid.uuid4()),
            project_id=proj_billing.id,
            fingerprint=fp_stripe,
            normalized_features=json.dumps({
                "endpoint": "/v1/payments/charge",
                "method": "POST",
                "status_code": 429,
                "exception_class": "StripeRateLimitError",
                "dependency": "stripe",
                "pattern": "downstream_rate_limit_burst",
            }),
            first_seen_at=now - timedelta(days=14),
            last_seen_at=now - timedelta(minutes=2),
            occurrence_count=142,
        )
        fp_rec_pg = FailureFingerprint(
            id=str(uuid.uuid4()),
            project_id=proj_billing.id,
            fingerprint=fp_pg,
            normalized_features=json.dumps({
                "endpoint": "/v1/users/{id}/subscriptions",
                "method": "GET",
                "status_code": 500,
                "exception_class": "TooManyConnectionsError",
                "dependency": "postgresql",
                "pattern": "database_connection_pool_saturation",
            }),
            first_seen_at=now - timedelta(days=30),
            last_seen_at=now - timedelta(hours=17),
            occurrence_count=89,
        )
        db.add_all([fp_rec_stripe, fp_rec_pg])

        # Commit all changes
        db.commit()

        print("-" * 70)
        print("Demo data seeded successfully!")
        print("  Organization:      Acme Payments Platform (slug: acme-payments)")
        print("  Demo User:          demo@api-investigator.dev (pass: Password123!)")
        print("  SRE Lead User:      sre-lead@api-investigator.dev (pass: Password123!)")
        print("  Projects:           'Core Billing & Checkout API', 'Customer Portal API'")
        print(f"  Ingest Key:         {raw_key_billing}")
        print("  Active Incidents:   1 Critical (Stripe 429 Rate Limit Spike)")
        print("  Resolved Incidents: 1 Major (Postgres Pool Exhaustion - Verified Fix)")
        print("  Inconclusive:       1 High (Edge 502 Bad Gateway - Missing Telemetry)")
        print("  Monitored Endpoints: 6 endpoints with 24h check log history")
        print("=" * 70)

    except Exception as e:
        db.rollback()
        print(f"Error seeding database: {e}")
        import traceback
        traceback.print_exc()
        raise e
    finally:
        db.close()


def secrets_token():
    return uuid.uuid4().hex[:12]


if __name__ == "__main__":
    reset_flag = "--reset" in sys.argv
    seed_database(reset=reset_flag)
