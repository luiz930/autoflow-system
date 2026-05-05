from __future__ import annotations

from .tenant import normalize_empresa_id, row_to_dict, rows_to_dicts


def consultar_veiculo_por_placa(cursor, empresa_id, placa):
    empresa_id = normalize_empresa_id(empresa_id)
    cursor.execute(
        """
        SELECT id, cliente_id
        FROM veiculos
        WHERE empresa_id=? AND placa=?
        """,
        (empresa_id, str(placa or "").strip().upper()),
    )
    return row_to_dict(cursor.fetchone(), columns=[item[0] for item in cursor.description or []])


def consultar_servico_operacional(cursor, empresa_id, servico_id):
    empresa_id = normalize_empresa_id(empresa_id)
    cursor.execute(
        """
        SELECT
            servicos.*,
            tipos_servico.nome AS tipo_nome,
            veiculos.placa,
            veiculos.modelo,
            veiculos.cor,
            clientes.nome AS cliente_nome,
            clientes.telefone AS cliente_telefone
        FROM servicos
        LEFT JOIN tipos_servico ON servicos.tipo_id = tipos_servico.id
        LEFT JOIN veiculos
            ON servicos.veiculo_id = veiculos.id
           AND veiculos.empresa_id = ?
        LEFT JOIN clientes
            ON veiculos.cliente_id = clientes.id
           AND clientes.empresa_id = ?
        WHERE servicos.empresa_id = ?
          AND servicos.id = ?
        """,
        (empresa_id, empresa_id, empresa_id, int(servico_id)),
    )
    return row_to_dict(cursor.fetchone(), columns=[item[0] for item in cursor.description or []])


def consultar_servicos_em_andamento(cursor, empresa_id):
    empresa_id = normalize_empresa_id(empresa_id)
    cursor.execute(
        """
        SELECT
            servicos.*,
            tipos_servico.nome AS tipo_nome,
            veiculos.placa,
            veiculos.modelo,
            veiculos.cor,
            clientes.nome AS cliente_nome,
            clientes.telefone AS cliente_telefone
        FROM servicos
        LEFT JOIN tipos_servico ON servicos.tipo_id = tipos_servico.id
        LEFT JOIN veiculos
            ON servicos.veiculo_id = veiculos.id
           AND veiculos.empresa_id = ?
        LEFT JOIN clientes
            ON veiculos.cliente_id = clientes.id
           AND clientes.empresa_id = ?
        WHERE servicos.empresa_id = ?
          AND COALESCE(TRIM(UPPER(servicos.status)), '')='EM ANDAMENTO'
        ORDER BY servicos.id DESC
        """,
        (empresa_id, empresa_id, empresa_id),
    )
    return rows_to_dicts(cursor)


def consultar_servicos_em_andamento_voz(cursor, empresa_id):
    empresa_id = normalize_empresa_id(empresa_id)
    cursor.execute(
        """
        SELECT
            servicos.id,
            servicos.entrada,
            servicos.entrega_prevista,
            servicos.valor_adicional,
            tipos_servico.nome AS tipo_nome,
            veiculos.placa,
            veiculos.modelo,
            veiculos.cor,
            clientes.nome AS cliente_nome
        FROM servicos
        LEFT JOIN tipos_servico ON servicos.tipo_id = tipos_servico.id
        LEFT JOIN veiculos
            ON servicos.veiculo_id = veiculos.id
           AND veiculos.empresa_id = ?
        LEFT JOIN clientes
            ON veiculos.cliente_id = clientes.id
           AND clientes.empresa_id = ?
        WHERE servicos.empresa_id = ?
          AND COALESCE(TRIM(UPPER(servicos.status)), '')='EM ANDAMENTO'
        ORDER BY servicos.id DESC
        """,
        (empresa_id, empresa_id, empresa_id),
    )
    return rows_to_dicts(cursor)


def consultar_historico_servicos(cursor, empresa_id, placa=None, busca="", limite=None):
    empresa_id = normalize_empresa_id(empresa_id)
    filtros = ["servicos.empresa_id=?"]
    params = [empresa_id, empresa_id, empresa_id]

    placa = str(placa or "").strip().upper()
    busca = str(busca or "").strip()

    if placa:
        filtros.append("UPPER(COALESCE(veiculos.placa, ''))=?")
        params.append(placa)

    if busca:
        termo = f"%{busca}%"
        filtros.append(
            """
            (
                veiculos.placa LIKE ?
                OR veiculos.modelo LIKE ?
                OR veiculos.cor LIKE ?
                OR clientes.nome LIKE ?
                OR tipos_servico.nome LIKE ?
            )
            """
        )
        params.extend([termo, termo, termo, termo, termo])

    where_sql = " AND ".join(filtros)
    limit_sql = ""
    if limite:
        limit_sql = " LIMIT ?"
        params.append(int(limite))

    cursor.execute(
        f"""
        SELECT
            servicos.id,
            servicos.veiculo_id,
            servicos.tipo_id,
            servicos.valor,
            servicos.valor_adicional,
            servicos.entrada,
            servicos.entrega_prevista,
            servicos.entrega,
            servicos.status,
            servicos.etapa_atual,
            servicos.etapa_atual_iniciada_em,
            servicos.lavagem_iniciada_em,
            servicos.finalizacao_iniciada_em,
            servicos.lavagem_segundos,
            servicos.finalizacao_segundos,
            servicos.observacoes,
            servicos.origem,
            servicos.guarita,
            servicos.pneu,
            servicos.cera,
            servicos.hidro_lataria,
            servicos.hidro_vidros,
            servicos.criado_por_usuario,
            servicos.criado_por_nome,
            servicos.operacional_por_usuario,
            servicos.operacional_por_nome,
            servicos.finalizado_por_usuario,
            servicos.finalizado_por_nome,
            tipos_servico.nome AS tipo_nome,
            veiculos.placa,
            veiculos.modelo,
            veiculos.cor,
            clientes.nome AS cliente_nome,
            clientes.telefone AS cliente_telefone
        FROM servicos
        LEFT JOIN tipos_servico ON servicos.tipo_id = tipos_servico.id
        LEFT JOIN veiculos
            ON servicos.veiculo_id = veiculos.id
           AND veiculos.empresa_id = ?
        LEFT JOIN clientes
            ON veiculos.cliente_id = clientes.id
           AND clientes.empresa_id = ?
        WHERE {where_sql}
        ORDER BY servicos.id DESC
        {limit_sql}
        """,
        tuple(params),
    )
    return rows_to_dicts(cursor)


def consultar_ultima_lavagem_local_por_placa(cursor, empresa_id, placa):
    empresa_id = normalize_empresa_id(empresa_id)
    cursor.execute(
        """
        SELECT
            servicos.entrega,
            tipos_servico.nome AS servico
        FROM servicos
        LEFT JOIN veiculos
            ON servicos.veiculo_id = veiculos.id
           AND veiculos.empresa_id = ?
        LEFT JOIN tipos_servico ON servicos.tipo_id = tipos_servico.id
        WHERE servicos.empresa_id = ?
          AND veiculos.placa = ?
          AND servicos.status='FINALIZADO'
          AND servicos.entrega IS NOT NULL
        ORDER BY servicos.entrega DESC, servicos.id DESC
        LIMIT 1
        """,
        (empresa_id, empresa_id, str(placa or "").strip().upper()),
    )
    return row_to_dict(cursor.fetchone(), columns=[item[0] for item in cursor.description or []])


def consultar_ultimas_lavagens_locais(cursor, empresa_id):
    empresa_id = normalize_empresa_id(empresa_id)
    cursor.execute(
        """
        SELECT
            veiculos.placa,
            clientes.nome AS cliente,
            veiculos.modelo AS carro,
            veiculos.cor AS cor,
            tipos_servico.nome AS servico,
            servicos.entrega,
            servicos.id
        FROM servicos
        LEFT JOIN veiculos
            ON servicos.veiculo_id = veiculos.id
           AND veiculos.empresa_id = ?
        LEFT JOIN clientes
            ON veiculos.cliente_id = clientes.id
           AND clientes.empresa_id = ?
        LEFT JOIN tipos_servico ON servicos.tipo_id = tipos_servico.id
        WHERE servicos.empresa_id = ?
          AND servicos.status = 'FINALIZADO'
          AND servicos.entrega IS NOT NULL
          AND veiculos.placa IS NOT NULL
          AND TRIM(veiculos.placa) <> ''
        ORDER BY
            UPPER(veiculos.placa) ASC,
            servicos.entrega DESC,
            servicos.id DESC
        """,
        (empresa_id, empresa_id, empresa_id),
    )
    return rows_to_dicts(cursor)


def consultar_resumo_hud(cursor, empresa_id, entrega_prefixo):
    empresa_id = normalize_empresa_id(empresa_id)

    cursor.execute(
        """
        SELECT
            COALESCE(SUM(valor), 0) AS total,
            COUNT(*) AS quantidade
        FROM servicos
        WHERE empresa_id=?
          AND status='FINALIZADO'
          AND entrega LIKE ?
        """,
        (empresa_id, entrega_prefixo),
    )
    resumo_financeiro = row_to_dict(cursor.fetchone(), columns=[item[0] for item in cursor.description or []]) or {"total": 0, "quantidade": 0}

    cursor.execute(
        """
        SELECT
            servicos.entrada,
            servicos.entrega_prevista,
            tipos_servico.nome AS tipo_nome,
            veiculos.placa,
            veiculos.modelo,
            clientes.nome AS cliente_nome
        FROM servicos
        LEFT JOIN tipos_servico ON servicos.tipo_id = tipos_servico.id
        LEFT JOIN veiculos
            ON servicos.veiculo_id = veiculos.id
           AND veiculos.empresa_id = ?
        LEFT JOIN clientes
            ON veiculos.cliente_id = clientes.id
           AND clientes.empresa_id = ?
        WHERE servicos.empresa_id = ?
          AND COALESCE(TRIM(UPPER(servicos.status)), '')='EM ANDAMENTO'
        """,
        (empresa_id, empresa_id, empresa_id),
    )
    servicos_andamento = rows_to_dicts(cursor)

    cursor.execute(
        """
        SELECT 'servicos' AS tabela, COALESCE(COUNT(*), 0) AS total, COALESCE(MAX(id), 0) AS ultimo_id
        FROM servicos WHERE empresa_id=?
        UNION ALL
        SELECT 'veiculos' AS tabela, COALESCE(COUNT(*), 0) AS total, COALESCE(MAX(id), 0) AS ultimo_id
        FROM veiculos WHERE empresa_id=?
        UNION ALL
        SELECT 'clientes' AS tabela, COALESCE(COUNT(*), 0) AS total, COALESCE(MAX(id), 0) AS ultimo_id
        FROM clientes WHERE empresa_id=?
        UNION ALL
        SELECT 'notificacoes' AS tabela, COALESCE(COUNT(*), 0) AS total, COALESCE(MAX(id), 0) AS ultimo_id
        FROM notificacoes WHERE empresa_id=?
        UNION ALL
        SELECT 'auditoria' AS tabela, COALESCE(COUNT(*), 0) AS total, COALESCE(MAX(id), 0) AS ultimo_id
        FROM auditoria
        UNION ALL
        SELECT 'usuarios' AS tabela, COALESCE(COUNT(*), 0) AS total, COALESCE(MAX(id), 0) AS ultimo_id
        FROM usuarios WHERE empresa_id=?
        """,
        (empresa_id, empresa_id, empresa_id, empresa_id, empresa_id),
    )
    totais = rows_to_dicts(cursor)

    return {
        "resumo_financeiro": resumo_financeiro,
        "servicos_andamento": servicos_andamento,
        "totais": totais,
    }
