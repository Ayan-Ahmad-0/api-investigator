import time
import traceback
import uuid
from typing import Callable
from starlette.middleware.base import BaseHTTPMiddleware
from starlette.requests import Request
from starlette.responses import Response
from api_investigator.redaction import sanitize_headers


class InvestigatorMiddleware(BaseHTTPMiddleware):
    def __init__(self, app, investigator):
        super().__init__(app)
        self.investigator = investigator

    async def dispatch(self, request: Request, call_next: Callable) -> Response:
        start_time = time.perf_counter()
        request_id = request.headers.get("x-request-id") or str(uuid.uuid4())
        trace_id = request.headers.get("x-trace-id") or str(uuid.uuid4())

        # Determine route template
        route_template = request.url.path
        if "endpoint" in request.scope and hasattr(request.scope["endpoint"], "__name__"):
            # Check route in router
            for route in request.app.routes:
                match, _ = route.matches(request.scope)
                if match:
                    route_template = getattr(route, "path", request.url.path)
                    break

        sanitized_headers = sanitize_headers(dict(request.headers))

        try:
            response = await call_next(request)
            duration_ms = round((time.perf_counter() - start_time) * 1000.0, 2)

            # Record standard request event
            self.investigator.send_event({
                "event_type": "request",
                "http_method": request.method,
                "route_template": route_template,
                "status_code": response.status_code,
                "duration_ms": duration_ms,
                "request_id": request_id,
                "trace_id": trace_id,
                "request_headers": sanitized_headers,
            })
            return response

        except Exception as exc:
            duration_ms = round((time.perf_counter() - start_time) * 1000.0, 2)
            stack = traceback.format_exc()

            # Record error event
            self.investigator.send_event({
                "event_type": "error",
                "http_method": request.method,
                "route_template": route_template,
                "status_code": 500,
                "duration_ms": duration_ms,
                "exception_type": type(exc).__name__,
                "exception_message": str(exc),
                "stack_trace": stack,
                "request_id": request_id,
                "trace_id": trace_id,
                "request_headers": sanitized_headers,
            })
            raise exc
