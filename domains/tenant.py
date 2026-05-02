from __future__ import annotations


DEFAULT_EMPRESA_ID = 1


def normalize_empresa_id(value, default=DEFAULT_EMPRESA_ID):
    try:
        empresa_id = int(value or default)
        return empresa_id if empresa_id > 0 else int(default)
    except Exception:
        return int(default)


def row_to_dict(row, columns=None):
    if not row:
        return {}
    if isinstance(row, dict):
        return dict(row)
    if hasattr(row, "keys"):
        return {key: row[key] for key in row.keys()}
    if columns:
        return dict(zip(columns, row))
    return {}


def rows_to_dicts(cursor, rows=None):
    rows = rows if rows is not None else cursor.fetchall()
    columns = [item[0] for item in (cursor.description or [])]
    return [row_to_dict(row, columns=columns) for row in rows]
