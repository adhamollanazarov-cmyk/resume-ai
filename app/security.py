from collections import defaultdict, deque
from dataclasses import dataclass
from threading import Lock
from time import monotonic
import re

from fastapi import HTTPException, Request, status


_RATE_LIMIT_PATTERN = re.compile(r"^\s*(\d+)\s*/\s*(second|minute|hour)s?\s*$", re.IGNORECASE)


def get_client_ip(request: Request) -> str:
    forwarded_for = request.headers.get("x-forwarded-for", "")
    if forwarded_for:
        first_hop = forwarded_for.split(",")[0].strip()
        if first_hop:
            return first_hop

    real_ip = request.headers.get("x-real-ip", "").strip()
    if real_ip:
        return real_ip

    if request.client and request.client.host:
        return request.client.host

    return "unknown"


def is_valid_pdf_header(file_header: bytes) -> bool:
    return file_header.startswith(b"%PDF")


@dataclass(frozen=True)
class ParsedRateLimit:
    max_requests: int
    window_seconds: int


def parse_rate_limit(value: str) -> ParsedRateLimit:
    match = _RATE_LIMIT_PATTERN.match(value)
    if match is None:
        raise ValueError(f"Unsupported rate limit format: {value!r}")

    max_requests = int(match.group(1))
    unit = match.group(2).lower()
    seconds_by_unit = {
        "second": 1,
        "minute": 60,
        "hour": 3600,
    }
    return ParsedRateLimit(max_requests=max_requests, window_seconds=seconds_by_unit[unit])


class InMemoryRateLimiter:
    def __init__(self, rate_limit: str) -> None:
        parsed_limit = parse_rate_limit(rate_limit)
        self.max_requests = parsed_limit.max_requests
        self.window_seconds = parsed_limit.window_seconds
        self._requests: dict[str, deque[float]] = defaultdict(deque)
        self._lock = Lock()

    def clear(self) -> None:
        with self._lock:
            self._requests.clear()

    def check(self, client_key: str) -> None:
        now = monotonic()
        window_start = now - self.window_seconds

        with self._lock:
            request_times = self._requests[client_key]

            while request_times and request_times[0] <= window_start:
                request_times.popleft()

            if len(request_times) >= self.max_requests:
                raise HTTPException(
                    status_code=status.HTTP_429_TOO_MANY_REQUESTS,
                    detail="Rate limit exceeded. Please try again in a minute.",
                    headers={"Retry-After": str(self.window_seconds)},
                )

            request_times.append(now)
