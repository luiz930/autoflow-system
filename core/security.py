from __future__ import annotations

from datetime import timedelta
import secrets


SAFE_HTTP_METHODS = {"GET", "HEAD", "OPTIONS", "TRACE"}


def resolve_secret_key(env_value=None, fallback=None):
    texto = str(env_value or "").strip()
    if texto:
        return texto
    texto_fallback = str(fallback or "").strip()
    return texto_fallback or secrets.token_urlsafe(32)


def build_flask_security_config(secret_key, secure_cookie=False):
    return {
        "SECRET_KEY": resolve_secret_key(secret_key),
        "SESSION_PERMANENT": True,
        "SESSION_COOKIE_HTTPONLY": True,
        "SESSION_COOKIE_SAMESITE": "Lax",
        "SESSION_COOKIE_SECURE": bool(secure_cookie),
        "PERMANENT_SESSION_LIFETIME": timedelta(hours=12),
    }


def issue_csrf_token(session_obj):
    token = session_obj.get("_csrf_token")
    if not token:
        token = secrets.token_urlsafe(32)
        session_obj["_csrf_token"] = token
    return token


def extract_csrf_token(request_obj):
    return (
        request_obj.headers.get("X-CSRF-Token")
        or request_obj.form.get("_csrf_token")
        or request_obj.headers.get("X-XSRF-Token")
        or ""
    )


def validate_csrf_token(session_obj, token):
    expected = str(session_obj.get("_csrf_token") or "")
    provided = str(token or "")
    if not expected or not provided:
        return False
    return secrets.compare_digest(expected, provided)


def should_enforce_csrf(request_obj, enabled=False):
    if not enabled:
        return False
    return str(request_obj.method or "").upper() not in SAFE_HTTP_METHODS


def append_security_headers(response):
    response.headers.setdefault("X-Frame-Options", "SAMEORIGIN")
    response.headers.setdefault("X-Content-Type-Options", "nosniff")
    response.headers.setdefault("Referrer-Policy", "strict-origin-when-cross-origin")
    response.headers.setdefault("Cross-Origin-Opener-Policy", "same-origin-allow-popups")
    response.headers.setdefault("Permissions-Policy", "camera=(self), microphone=(self), geolocation=()")
    return response
