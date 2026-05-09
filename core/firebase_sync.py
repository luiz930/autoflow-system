from __future__ import annotations

import base64
import json
import os
import re
from datetime import UTC, date, datetime


FIREBASE_META_COLLECTION = "_sync_meta"
FIREBASE_SYNC_VERSION = 1

BLOB_COLUMNS_IGNORADAS = {
    "arquivo_blob",
    "foto_perfil_blob",
    "marca_logo_blob",
    "marca_favicon_blob",
}

CAMPOS_META_FIREBASE = {
    "_sql_id",
    "_sync_source",
    "_sync_version",
    "_synced_at",
}

IDENTIFICADOR_SQL_RE = re.compile(r"^[A-Za-z_][A-Za-z0-9_]*$")


def validar_identificador_sql(nome):
    if not IDENTIFICADOR_SQL_RE.match(str(nome or "")):
        raise ValueError(f"Identificador SQL invalido: {nome!r}")
    return str(nome)


def firebase_admin_disponivel():
    try:
        import firebase_admin  # noqa: F401
        from firebase_admin import firestore  # noqa: F401
        return True
    except Exception:
        return False


def carregar_firebase_credentials_info():
    texto_json = (
        os.environ.get("FIREBASE_SERVICE_ACCOUNT_JSON")
        or os.environ.get("GOOGLE_FIREBASE_SERVICE_ACCOUNT_JSON")
        or ""
    ).strip()
    if texto_json:
        return json.loads(texto_json)

    caminho = (
        os.environ.get("FIREBASE_SERVICE_ACCOUNT_FILE")
        or os.environ.get("GOOGLE_APPLICATION_CREDENTIALS")
        or ""
    ).strip()
    if caminho:
        with open(caminho, "r", encoding="utf-8") as arquivo:
            return json.load(arquivo)

    return None


def obter_firestore_client(project_id=None, database_id=None):
    try:
        import firebase_admin
        from firebase_admin import credentials, firestore
    except Exception as erro:
        raise RuntimeError(
            "firebase-admin nao esta instalado. Rode `pip install firebase-admin`."
        ) from erro

    app_name = "wagen-firestore-sync"
    try:
        firebase_app = firebase_admin.get_app(app_name)
    except ValueError:
        cred_info = carregar_firebase_credentials_info()
        if cred_info:
            cred = credentials.Certificate(cred_info)
        else:
            cred = credentials.ApplicationDefault()
        opcoes = {}
        project_id = project_id or os.environ.get("FIREBASE_PROJECT_ID")
        if project_id:
            opcoes["projectId"] = project_id
        firebase_app = firebase_admin.initialize_app(cred, opcoes, name=app_name)

    database_id = database_id or os.environ.get("FIRESTORE_DATABASE_ID") or None
    if database_id:
        return firestore.client(app=firebase_app, database_id=database_id)
    return firestore.client(app=firebase_app)


def agora_sync_iso():
    return datetime.now(UTC).replace(microsecond=0).isoformat().replace("+00:00", "Z")


def row_to_dict(row, cursor=None):
    if row is None:
        return {}
    if isinstance(row, dict):
        return dict(row)
    if hasattr(row, "keys"):
        return {key: row[key] for key in row.keys()}
    colunas = [item[0] for item in (getattr(cursor, "description", None) or [])]
    return dict(zip(colunas, row)) if colunas else {}


def valor_para_firestore(valor):
    if isinstance(valor, (str, int, float, bool)) or valor is None:
        return valor
    if isinstance(valor, (datetime, date)):
        return valor.isoformat()
    if isinstance(valor, bytes):
        return {
            "_type": "bytes_base64",
            "value": base64.b64encode(valor).decode("ascii"),
        }
    return str(valor)


def valor_para_sql(valor):
    if isinstance(valor, (str, int, float)) or valor is None:
        return valor
    if isinstance(valor, bool):
        return 1 if valor else 0
    if isinstance(valor, (datetime, date)):
        return valor.isoformat()
    if isinstance(valor, dict) and valor.get("_type") == "bytes_base64":
        try:
            return base64.b64decode(valor.get("value") or "")
        except Exception:
            return None
    return json.dumps(valor, ensure_ascii=False, default=str)


def preparar_documento_firestore(registro, tabela, synced_at=None):
    synced_at = synced_at or agora_sync_iso()
    documento = {}
    for chave, valor in (registro or {}).items():
        if chave in BLOB_COLUMNS_IGNORADAS:
            continue
        documento[chave] = valor_para_firestore(valor)
    documento["_sql_id"] = int(registro.get("id") or 0) if str(registro.get("id") or "").isdigit() else registro.get("id")
    documento["_sync_source"] = "site"
    documento["_sync_version"] = FIREBASE_SYNC_VERSION
    documento["_synced_at"] = synced_at
    documento["_collection"] = tabela
    return documento


def obter_colunas_tabela(cursor, tabela):
    tabela = validar_identificador_sql(tabela)
    cursor.execute(f"SELECT * FROM {tabela} WHERE 1=0")
    return [item[0] for item in (cursor.description or [])]


def buscar_registros_sql(cursor, tabela, empresa_id=None, limit=None):
    tabela = validar_identificador_sql(tabela)
    filtros = []
    parametros = []
    if empresa_id is not None and "empresa_id" in obter_colunas_tabela(cursor, tabela):
        filtros.append("empresa_id=?")
        parametros.append(int(empresa_id))

    sql = f"SELECT * FROM {tabela}"
    if filtros:
        sql += " WHERE " + " AND ".join(filtros)
    sql += " ORDER BY id"
    if limit:
        sql += " LIMIT ?"
        parametros.append(int(limit))

    cursor.execute(sql, tuple(parametros))
    return [row_to_dict(row, cursor) for row in cursor.fetchall()]


def push_sql_to_firestore(conn, firestore_client, tabelas, empresa_id=None, limit=None, dry_run=False):
    cursor = conn.cursor()
    resultado = {
        "direction": "push",
        "dry_run": bool(dry_run),
        "tables": {},
        "total": 0,
        "synced_at": agora_sync_iso(),
    }
    for tabela in tabelas:
        try:
            tabela = validar_identificador_sql(tabela)
            registros = buscar_registros_sql(cursor, tabela, empresa_id=empresa_id, limit=limit)
        except Exception as erro:
            resultado["tables"][tabela] = {"ok": False, "total": 0, "erro": str(erro)}
            continue

        total = 0
        batch = firestore_client.batch() if not dry_run else None
        operacoes_batch = 0
        for registro in registros:
            doc_id = str(registro.get("id") or "")
            if not doc_id:
                continue
            documento = preparar_documento_firestore(registro, tabela, resultado["synced_at"])
            total += 1
            if dry_run:
                continue
            ref = firestore_client.collection(tabela).document(doc_id)
            batch.set(ref, documento, merge=True)
            operacoes_batch += 1
            if operacoes_batch >= 400:
                batch.commit()
                batch = firestore_client.batch()
                operacoes_batch = 0
        if batch is not None and operacoes_batch:
            batch.commit()

        resultado["tables"][tabela] = {"ok": True, "total": total, "erro": ""}
        resultado["total"] += total
    return resultado


def documento_firestore_para_registro(snapshot):
    dados = dict(snapshot.to_dict() or {})
    for campo in list(CAMPOS_META_FIREBASE):
        dados.pop(campo, None)
    dados.pop("_collection", None)
    if "id" not in dados:
        try:
            dados["id"] = int(snapshot.id)
        except Exception:
            dados["id"] = snapshot.id
    return dados


def upsert_registro_sql(cursor, tabela, registro, dry_run=False):
    tabela = validar_identificador_sql(tabela)
    colunas_tabela = set(obter_colunas_tabela(cursor, tabela))
    dados = {
        chave: valor_para_sql(valor)
        for chave, valor in (registro or {}).items()
        if chave in colunas_tabela and chave not in BLOB_COLUMNS_IGNORADAS
    }
    if "id" not in dados or not dados.get("id"):
        return False

    cursor.execute(f"SELECT id FROM {tabela} WHERE id=?", (dados["id"],))
    existe = cursor.fetchone() is not None
    if dry_run:
        return True

    if existe:
        colunas_update = [col for col in dados if col != "id"]
        if not colunas_update:
            return True
        set_sql = ", ".join(f"{col}=?" for col in colunas_update)
        valores = [dados[col] for col in colunas_update] + [dados["id"]]
        cursor.execute(f"UPDATE {tabela} SET {set_sql} WHERE id=?", tuple(valores))
        return True

    colunas_insert = list(dados.keys())
    placeholders = ", ".join("?" for _ in colunas_insert)
    cursor.execute(
        f"INSERT INTO {tabela} ({', '.join(colunas_insert)}) VALUES ({placeholders})",
        tuple(dados[col] for col in colunas_insert),
    )
    return True


def pull_firestore_to_sql(conn, firestore_client, tabelas, empresa_id=None, limit=None, dry_run=False):
    cursor = conn.cursor()
    resultado = {
        "direction": "pull",
        "dry_run": bool(dry_run),
        "tables": {},
        "total": 0,
        "synced_at": agora_sync_iso(),
    }
    for tabela in tabelas:
        total = 0
        try:
            tabela = validar_identificador_sql(tabela)
            query = firestore_client.collection(tabela)
            if empresa_id is not None:
                query = query.where("empresa_id", "==", int(empresa_id))
            if limit:
                query = query.limit(int(limit))
            for snapshot in query.stream():
                registro = documento_firestore_para_registro(snapshot)
                if upsert_registro_sql(cursor, tabela, registro, dry_run=dry_run):
                    total += 1
        except Exception as erro:
            resultado["tables"][tabela] = {"ok": False, "total": total, "erro": str(erro)}
            continue

        resultado["tables"][tabela] = {"ok": True, "total": total, "erro": ""}
        resultado["total"] += total

    if not dry_run:
        conn.commit()
    return resultado


def sync_bidirectional(conn, firestore_client, tabelas, empresa_id=None, limit=None, dry_run=False):
    push_result = push_sql_to_firestore(
        conn,
        firestore_client,
        tabelas,
        empresa_id=empresa_id,
        limit=limit,
        dry_run=dry_run,
    )
    pull_result = pull_firestore_to_sql(
        conn,
        firestore_client,
        tabelas,
        empresa_id=empresa_id,
        limit=limit,
        dry_run=dry_run,
    )
    return {
        "direction": "bidirectional",
        "dry_run": bool(dry_run),
        "push": push_result,
        "pull": pull_result,
        "total": int(push_result.get("total") or 0) + int(pull_result.get("total") or 0),
        "synced_at": agora_sync_iso(),
    }
