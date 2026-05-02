from __future__ import annotations

import json


def serialize_payload(payload):
    if payload is None:
        return None
    try:
        return json.dumps(payload, ensure_ascii=False, default=str)
    except Exception:
        return json.dumps({"fallback": str(payload)}, ensure_ascii=False)


def registrar_evento_telemetria(conectar_func, *, empresa_id=1, usuario_id=None, usuario=None, categoria="sistema", evento="", severidade="info", payload=None, ip=None, user_agent=None):
    if not evento:
        return False

    conn = None
    try:
        conn = conectar_func()
        c = conn.cursor()
        c.execute(
            """
            INSERT INTO telemetria_eventos (
                empresa_id, usuario_id, usuario, categoria, evento,
                severidade, payload_json, ip, user_agent
            )
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
            """,
            (
                empresa_id or 1,
                usuario_id,
                usuario,
                categoria or "sistema",
                evento,
                severidade or "info",
                serialize_payload(payload),
                ip,
                user_agent,
            ),
        )
        conn.commit()
        return True
    except Exception:
        try:
            if conn:
                conn.rollback()
        except Exception:
            pass
        return False
    finally:
        try:
            if conn:
                conn.close()
        except Exception:
            pass
