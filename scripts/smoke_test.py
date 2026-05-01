from __future__ import annotations

import os
import sys

import httpx


def build_minimal_pdf(text: str = "Resume Smoke Test") -> bytes:
    safe_text = (
        text.replace("\\", "\\\\")
        .replace("(", "\\(")
        .replace(")", "\\)")
    )
    stream = "\n".join(
        [
            "BT",
            "/F1 18 Tf",
            "72 720 Td",
            f"({safe_text}) Tj",
            "ET",
        ]
    ).encode("latin-1")

    objects = [
        b"<< /Type /Catalog /Pages 2 0 R >>",
        b"<< /Type /Pages /Kids [3 0 R] /Count 1 >>",
        b"<< /Type /Page /Parent 2 0 R /MediaBox [0 0 612 792] /Resources << /Font << /F1 5 0 R >> >> /Contents 4 0 R >>",
        b"<< /Length " + str(len(stream)).encode("ascii") + b" >>\nstream\n" + stream + b"\nendstream",
        b"<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>",
    ]

    header = b"%PDF-1.4\n%\xe2\xe3\xcf\xd3\n"
    parts: list[bytes] = [header]
    offsets = [0]

    for index, obj in enumerate(objects, start=1):
        offsets.append(sum(len(part) for part in parts))
        parts.append(f"{index} 0 obj\n".encode("ascii") + obj + b"\nendobj\n")

    xref_offset = sum(len(part) for part in parts)
    xref_lines = ["xref", "0 6", "0000000000 65535 f "]
    xref_lines.extend(f"{offset:010d} 00000 n " for offset in offsets[1:])
    trailer = "\n".join(
        [
            *xref_lines,
            "trailer",
            "<< /Size 6 /Root 1 0 R >>",
            "startxref",
            str(xref_offset),
            "%%EOF",
        ]
    ).encode("ascii")

    return b"".join(parts) + trailer + b"\n"


def print_result(label: str, passed: bool, details: str) -> None:
    prefix = "PASS" if passed else "FAIL"
    print(f"[{prefix}] {label}: {details}")


def print_warning(label: str, details: str) -> None:
    print(f"[WARN] {label}: {details}")


def require_env(name: str) -> str:
    value = (os.getenv(name) or "").strip()
    if not value:
        print_result("Environment", False, f"{name} is not set.")
        sys.exit(2)
    return value.rstrip("/")


def check_health(client: httpx.Client, base_url: str) -> bool:
    try:
        response = client.get(f"{base_url}/health")
    except httpx.HTTPError as exc:
        print_result("GET /health", False, f"request failed: {exc}")
        return False

    if response.status_code != 200:
        print_result("GET /health", False, f"expected 200, got {response.status_code}")
        return False

    try:
        payload = response.json()
    except ValueError as exc:
        print_result("GET /health", False, f"invalid JSON response: {exc}")
        return False

    if payload.get("status") != "ok":
        print_result("GET /health", False, f"expected status 'ok', got {payload.get('status')!r}")
        return False

    print_result("GET /health", True, "HTTP 200 and status == 'ok'")
    return True


def check_cors(client: httpx.Client, base_url: str, frontend_origin: str) -> bool:
    headers = {
        "Origin": frontend_origin,
        "Access-Control-Request-Method": "POST",
        "Access-Control-Request-Headers": "content-type",
    }

    try:
        response = client.options(f"{base_url}/api/cv/analyze", headers=headers)
    except httpx.HTTPError as exc:
        print_result("CORS preflight", False, f"request failed: {exc}")
        return False

    allow_origin = response.headers.get("access-control-allow-origin")
    if response.status_code != 200:
        print_result("CORS preflight", False, f"expected 200, got {response.status_code}")
        return False

    if allow_origin != frontend_origin:
        print_result(
            "CORS preflight",
            False,
            f"expected Access-Control-Allow-Origin={frontend_origin!r}, got {allow_origin!r}",
        )
        return False

    print_result("CORS preflight", True, f"Access-Control-Allow-Origin matches {frontend_origin}")
    return True


def check_analyze(client: httpx.Client, base_url: str) -> bool:
    pdf_bytes = build_minimal_pdf("Jane Doe Resume Smoke Test")
    files = {
        "pdf": ("smoke-test-resume.pdf", pdf_bytes, "application/pdf"),
    }
    data = {
        "job_description": "Senior Python backend role with FastAPI, APIs, and PostgreSQL experience.",
    }

    try:
        response = client.post(f"{base_url}/api/cv/analyze", files=files, data=data)
    except httpx.HTTPError as exc:
        print_result("POST /api/cv/analyze", False, f"request failed: {exc}")
        return False

    if response.status_code != 200:
        print_result("POST /api/cv/analyze", False, f"expected 200, got {response.status_code}")
        return False

    try:
        payload = response.json()
    except ValueError as exc:
        print_result("POST /api/cv/analyze", False, f"invalid JSON response: {exc}")
        return False

    required_keys = {"status", "resume_text_preview", "analysis"}
    missing_keys = sorted(required_keys.difference(payload))
    if missing_keys:
        print_result("POST /api/cv/analyze", False, f"missing keys: {', '.join(missing_keys)}")
        return False

    if payload.get("status") != "OK":
        print_result("POST /api/cv/analyze", False, f"expected status 'OK', got {payload.get('status')!r}")
        return False

    if not isinstance(payload.get("resume_text_preview"), str):
        print_result("POST /api/cv/analyze", False, "resume_text_preview is not a string")
        return False

    if payload.get("analysis") is None:
        print_warning(
            "POST /api/cv/analyze",
            "analysis is null. The endpoint is healthy, but AI may be unavailable or mock mode may be disabled.",
        )
        print_result("POST /api/cv/analyze", True, "HTTP 200 with valid response shape")
        return True

    print_result("POST /api/cv/analyze", True, "HTTP 200 with analysis payload")
    return True


def main() -> int:
    base_url = require_env("API_BASE_URL")
    frontend_origin = require_env("FRONTEND_ORIGIN")

    print(f"Smoke test target: {base_url}")
    print(f"Expected frontend origin: {frontend_origin}")

    with httpx.Client(timeout=30.0, follow_redirects=True) as client:
        checks = [
            check_health(client, base_url),
            check_cors(client, base_url, frontend_origin),
            check_analyze(client, base_url),
        ]

    if all(checks):
        print("\nSmoke test completed successfully.")
        return 0

    print("\nSmoke test failed.")
    return 1


if __name__ == "__main__":
    raise SystemExit(main())
