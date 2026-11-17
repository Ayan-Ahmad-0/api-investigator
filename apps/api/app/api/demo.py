import asyncio
import random
from typing import Optional
from fastapi import APIRouter, HTTPException, Query, Response

demo_router = APIRouter(tags=["Demo & Simulation"])


@demo_router.get("/health")
def demo_health():
    """Always returns 200 OK healthy status."""
    return {"status": "healthy", "service": "demo-simulator"}


@demo_router.get("/slow")
async def demo_slow(delay: float = Query(default=1.2, ge=0.0, le=10.0, description="Configurable delay in seconds")):
    """Simulates high latency endpoint with configurable delay."""
    await asyncio.sleep(delay)
    return {"status": "ok", "latency_simulated_seconds": delay}


@demo_router.get("/unstable")
def demo_unstable(
    failure_rate: float = Query(default=0.4, ge=0.0, le=1.0, description="Probability of failure (0.0 to 1.0)"),
    status_code: int = Query(default=503, description="Failure status code to return"),
):
    """Intermittently returns 503 or 200 OK based on configurable failure rate."""
    if random.random() < failure_rate:
        raise HTTPException(
            status_code=status_code,
            detail=f"Simulated intermittent upstream outage ({status_code})",
        )
    return {"status": "ok", "healthy": True}


@demo_router.get("/error")
def demo_error(
    status_code: int = Query(default=500, description="Controlled error status code to trigger"),
    message: str = Query(default="Simulated internal server error", description="Error detail"),
):
    """Returns a controlled HTTP error for testing detection and monitors."""
    raise HTTPException(status_code=status_code, detail=message)


@demo_router.api_route("/payments", methods=["GET", "POST"])
@demo_router.api_route("/payments/charge", methods=["GET", "POST"])
def demo_payments(
    simulate_failure: bool = Query(default=False, description="Whether to simulate downstream Stripe failure"),
):
    """Sample payments endpoint simulating downstream dependency failure (e.g. Stripe 429)."""
    if simulate_failure or random.random() < 0.3:
        return Response(
            content='{"error": {"type": "rate_limit_error", "message": "Rate limit exceeded (100 req/min)", "code": "rate_limit"}}',
            status_code=429,
            media_type="application/json",
            headers={"Retry-After": "4"},
        )
    return {
        "status": "succeeded",
        "charge_id": "ch_sim_3M4o928192",
        "amount": 4900,
        "currency": "usd",
        "livemode": False,
    }


@demo_router.api_route("/checkout/sessions", methods=["GET", "POST"])
def demo_checkout_sessions():
    """Sample checkout session endpoint."""
    return {
        "id": "cs_sim_99182371",
        "object": "checkout.session",
        "status": "complete",
        "customer": "cus_9941a8",
    }


@demo_router.get("/users/{user_id}/subscriptions")
def demo_subscriptions(user_id: str):
    """Sample user subscription endpoint."""
    return {
        "user_id": user_id,
        "subscriptions": [
            {
                "id": "sub_10293",
                "tier": "enterprise",
                "status": "active",
                "features": ["ai_investigations", "priority_support"],
            }
        ],
    }
