from __future__ import annotations

from .tenant import rows_to_dicts


def consultar_checklist_por_servicos(cursor, ids_servicos):
    if not ids_servicos:
        return {}

    placeholders = ",".join(["?"] * len(ids_servicos))
    cursor.execute(
        f"""
        SELECT servico_id, item_id, item_nome, marcado
        FROM servico_checklist
        WHERE servico_id IN ({placeholders})
        ORDER BY id ASC
        """,
        ids_servicos,
    )

    agrupado = {}
    for row in rows_to_dicts(cursor):
        agrupado.setdefault(row["servico_id"], []).append(row)
    return agrupado


def listar_nomes_checklist_por_servicos(cursor, ids_servicos):
    agrupado = consultar_checklist_por_servicos(cursor, ids_servicos)
    return {
        servico_id: [item.get("item_nome") for item in itens if item.get("item_nome")]
        for servico_id, itens in agrupado.items()
    }


def substituir_checklist_servico(cursor, servico_id, itens):
    cursor.execute("DELETE FROM servico_checklist WHERE servico_id=?", (servico_id,))
    for item in itens:
        cursor.execute(
            """
            INSERT INTO servico_checklist (servico_id, item_id, item_nome, marcado)
            VALUES (?, ?, ?, 1)
            """,
            (servico_id, item["id"], item["nome"]),
        )


def carregar_recursos_edicao_historico(cursor):
    cursor.execute("SELECT id, nome, valor FROM tipos_servico ORDER BY nome")
    tipos_servico = rows_to_dicts(cursor)

    cursor.execute("SELECT nome FROM produtos_pneu ORDER BY nome")
    produtos_pneu = [row[0] for row in cursor.fetchall()]
    return tipos_servico, produtos_pneu


def excluir_dependencias_historico_servico(cursor, empresa_id, servico_id):
    cursor.execute(
        "DELETE FROM fotos WHERE empresa_id=? AND servico_id=?",
        (empresa_id, servico_id),
    )
    cursor.execute("DELETE FROM servico_checklist WHERE servico_id=?", (servico_id,))
    cursor.execute("DELETE FROM servico_cobrancas_extras WHERE servico_id=?", (servico_id,))
