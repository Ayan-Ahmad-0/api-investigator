# API Investigator Python SDK

Automated telemetry collection, exception tracking, and sanitized failure reproduction for FastAPI.

## Installation

```bash
pip install api-investigator
```

## Quick Start

```python
from fastapi import FastAPI
from api_investigator import Investigator

app = FastAPI()

investigator = Investigator(
    api_key="inv_ingest_...",
    environment="production",
    api_url="http://localhost:8000",
)

investigator.instrument(app)
```

## Features

- **Non-blocking asynchronous telemetry export:** Telemetry is buffered in a bounded in-memory queue and dispatched via a background worker thread.
- **Client-side sensitive data redaction:** Passwords, Authorization headers, Bearer tokens, cookies, and payment cards are automatically redacted before leaving your application.
- **Fail-safe execution:** Network timeouts or exporter issues will never interrupt user requests or crash your application.
