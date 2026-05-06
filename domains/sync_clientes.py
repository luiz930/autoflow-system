from __future__ import annotations

from .tenant import normalize_empresa_id


def salvar_historico_lavagens_sync(cursor, sync_id, registros, agora_atual, empresa_id):
    empresa_id = normalize_empresa_id(empresa_id)
    cursor.execute(
        "DELETE FROM historico_lavagens_sync WHERE empresa_id=? AND sync_id=?",
        (empresa_id, sync_id),
    )

    for item in registros:
        cursor.execute(
            """
            INSERT INTO historico_lavagens_sync (
                sync_id, empresa_id, placa, cliente, carro, cor, servico,
                data_lavagem, data_original, criado_em, atualizado_em
            )
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
            """,
            (
                sync_id,
                empresa_id,
                item.get("placa"),
                item.get("cliente"),
                item.get("carro"),
                item.get("cor"),
                item.get("servico"),
                item.get("data_lavagem"),
                item.get("data_original"),
                agora_atual,
                agora_atual,
            ),
        )


def criar_sincronizacao_cliente(
    cursor,
    empresa_id,
    nome,
    url,
    intervalo_minutos,
    mapeamento,
    *,
    ativo=1,
    ultimo_sync_em=None,
    proximo_sync_em=None,
    ultimo_status="OK",
    ultima_mensagem=None,
    criado_em=None,
    atualizado_em=None,
    ultimo_hash=None,
    colunas_ultima_sync=None,
):
    empresa_id = normalize_empresa_id(empresa_id)
    cursor.execute(
        """
        INSERT INTO sincronizacoes_clientes (
            empresa_id, nome, url, intervalo_minutos,
            campo_placa, campo_nome, campo_telefone, campo_modelo, campo_cor, campo_servico, campo_data,
            ativo, ultimo_sync_em, proximo_sync_em, ultimo_status, ultima_mensagem,
            criado_em, atualizado_em, ultimo_hash, colunas_ultima_sync
        )
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        """,
        (
            empresa_id,
            nome,
            url,
            intervalo_minutos,
            mapeamento.get("placa"),
            mapeamento.get("nome"),
            mapeamento.get("telefone"),
            mapeamento.get("modelo"),
            mapeamento.get("cor"),
            mapeamento.get("servico"),
            mapeamento.get("data"),
            ativo,
            ultimo_sync_em,
            proximo_sync_em,
            ultimo_status,
            ultima_mensagem,
            criado_em,
            atualizado_em,
            ultimo_hash,
            colunas_ultima_sync,
        ),
    )
    return cursor.lastrowid


def atualizar_status_sincronizacao_cliente(
    cursor,
    sync_id,
    empresa_id,
    *,
    ultimo_sync_em=None,
    proximo_sync_em=None,
    ultimo_status=None,
    ultima_mensagem=None,
    ultimo_hash=None,
    atualizado_em=None,
    url=None,
):
    empresa_id = normalize_empresa_id(empresa_id)
    campos = []
    valores = []
    payload = {
        "url": url,
        "ultimo_sync_em": ultimo_sync_em,
        "proximo_sync_em": proximo_sync_em,
        "ultimo_status": ultimo_status,
        "ultima_mensagem": ultima_mensagem,
        "ultimo_hash": ultimo_hash,
        "atualizado_em": atualizado_em,
    }

    for campo, valor in payload.items():
        if valor is None:
            continue
        campos.append(f"{campo}=?")
        valores.append(valor)

    if not campos:
        return

    valores.extend([empresa_id, sync_id])
    cursor.execute(
        f"""
        UPDATE sincronizacoes_clientes
        SET {", ".join(campos)}
        WHERE empresa_id=? AND id=?
        """,
        tuple(valores),
    )


def alternar_sincronizacao_cliente(
    cursor,
    sync_id,
    empresa_id,
    ativo,
    ultimo_status,
    proximo_sync_em,
    atualizado_em,
):
    empresa_id = normalize_empresa_id(empresa_id)
    cursor.execute(
        """
        UPDATE sincronizacoes_clientes
        SET ativo=?, ultimo_status=?, proximo_sync_em=?, atualizado_em=?
        WHERE empresa_id=? AND id=?
        """,
        (ativo, ultimo_status, proximo_sync_em, atualizado_em, empresa_id, sync_id),
    )


def excluir_sincronizacao_cliente(cursor, sync_id, empresa_id, atualizado_em, usuario=""):
    empresa_id = normalize_empresa_id(empresa_id)
    cursor.execute(
        "DELETE FROM historico_lavagens_sync WHERE empresa_id=? AND sync_id=?",
        (empresa_id, sync_id),
    )
    cursor.execute(
        """
        UPDATE sincronizacoes_clientes
        SET ativo=0,
            proximo_sync_em=NULL,
            ultimo_status='EXCLUIDA',
            ultima_mensagem='Sincronizacao excluida pelo usuario.',
            atualizado_em=?,
            excluido_em=?,
            excluido_por=?
        WHERE empresa_id=? AND id=?
        """,
        (atualizado_em, atualizado_em, usuario, empresa_id, sync_id),
    )
    return cursor.rowcount
