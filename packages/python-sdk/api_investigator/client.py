import atexit
import json
import logging
import queue
import random
import threading
import time
from typing import Any, Dict, List, Optional
import httpx

logger = logging.getLogger("api_investigator")


class Investigator:
    def __init__(
        self,
        api_key: str,
        api_url: str = "http://localhost:8000",
        environment: str = "production",
        service_name: str = "api",
        service_version: Optional[str] = None,
        max_queue_size: int = 1000,
        batch_size: int = 50,
        flush_interval_seconds: float = 2.0,
        sampling_rate: float = 1.0,
    ):
        self.api_key = api_key
        self.api_url = api_url.rstrip("/")
        self.environment = environment
        self.service_name = service_name
        self.service_version = service_version
        self.sampling_rate = sampling_rate
        self.batch_size = batch_size
        self.flush_interval = flush_interval_seconds

        self._queue: queue.Queue = queue.Queue(maxsize=max_queue_size)
        self._shutdown_event = threading.Event()
        self._worker_thread = threading.Thread(target=self._worker_loop, daemon=True)
        self._worker_thread.start()

        atexit.register(self.shutdown)

    def send_event(self, event_data: Dict[str, Any]):
        """Queue event for non-blocking asynchronous transmission."""
        if self.sampling_rate < 1.0 and random.random() > self.sampling_rate:
            return

        # Set defaults
        event_data.setdefault("service_name", self.service_name)
        event_data.setdefault("service_version", self.service_version)

        try:
            self._queue.put_nowait(event_data)
        except queue.Full:
            # Drop telemetry rather than blocking customer application
            pass

    def _worker_loop(self):
        while not self._shutdown_event.is_set():
            batch = []
            start_wait = time.time()

            while len(batch) < self.batch_size:
                try:
                    item = self._queue.get(timeout=0.2)
                    batch.append(item)
                    self._queue.task_done()
                except queue.Empty:
                    if time.time() - start_wait >= self.flush_interval and batch:
                        break
                    if self._shutdown_event.is_set():
                        break

            if batch:
                self._dispatch_batch(batch)

    def _dispatch_batch(self, batch: List[Dict[str, Any]]):
        url = f"{self.api_url}/api/v1/ingest/batch"
        headers = {
            "Content-Type": "application/json",
            "X-Ingestion-Key": self.api_key,
        }
        payload = {"events": batch}

        # Attempt export with retries and exponential backoff
        max_retries = 3
        backoff = 0.5
        for attempt in range(max_retries):
            try:
                with httpx.Client(timeout=3.0) as client:
                    resp = client.post(url, json=payload, headers=headers)
                    if resp.status_code in (200, 201, 202):
                        return
            except Exception as e:
                time.sleep(backoff + random.uniform(0.0, 0.2))
                backoff *= 2

    def flush(self):
        """Flush all pending events in the queue."""
        batch = []
        while not self._queue.empty():
            try:
                batch.append(self._queue.get_nowait())
                self._queue.task_done()
            except queue.Empty:
                break
        if batch:
            self._dispatch_batch(batch)

    def shutdown(self):
        """Gracefully flush and terminate worker thread."""
        self._shutdown_event.set()
        self.flush()

    def instrument(self, app):
        """Instrument a FastAPI or Starlette application with automated telemetry."""
        from api_investigator.middleware import InvestigatorMiddleware
        app.add_middleware(InvestigatorMiddleware, investigator=self)
