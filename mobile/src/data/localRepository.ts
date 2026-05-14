import { enqueueSync, getDatabase, newUuid } from "../database/db";

export type ClienteLocal = {
  uuid: string;
  nome: string;
  telefone?: string;
  placa_principal?: string;
  updated_at?: string;
};

export type ServicoLocal = {
  uuid: string;
  veiculo_uuid?: string;
  tipo_nome?: string;
  valor?: number;
  valor_adicional?: number;
  status?: string;
  observacoes?: string;
  etapa_atual?: string;
  entrada?: string;
  entrega_prevista?: string;
  updated_at?: string;
};

export type TipoServicoLocal = {
  uuid: string;
  nome: string;
  valor: number;
};

export type BuscaPlacaResultado = {
  veiculo_uuid: string;
  cliente_uuid?: string;
  placa: string;
  modelo?: string;
  cor?: string;
  status_atendimento?: string;
  atendimento_ativo?: number;
  cliente_nome?: string;
  cliente_telefone?: string;
};

export async function listarClientes() {
  const db = await getDatabase();
  return db.getAllAsync<ClienteLocal>(
    `
    SELECT uuid, nome, telefone, placa_principal, updated_at
    FROM clientes
    WHERE deleted_at IS NULL
    ORDER BY updated_at DESC, nome ASC
    LIMIT 100
    `
  );
}

export async function buscarPorPlaca(placa: string) {
  const termo = placa.trim().toUpperCase();
  if (!termo) {
    return [];
  }
  const db = await getDatabase();
  return db.getAllAsync<BuscaPlacaResultado>(
    `
    SELECT
      v.uuid AS veiculo_uuid,
      v.cliente_uuid,
      v.placa,
      v.modelo,
      v.cor,
      v.status_atendimento,
      v.atendimento_ativo,
      c.nome AS cliente_nome,
      c.telefone AS cliente_telefone
    FROM veiculos v
    LEFT JOIN clientes c ON c.uuid = v.cliente_uuid
    WHERE v.deleted_at IS NULL
      AND UPPER(v.placa) LIKE ?
    ORDER BY v.updated_at DESC, v.placa ASC
    LIMIT 20
    `,
    `%${termo}%`
  );
}

export async function listarTiposServico() {
  const db = await getDatabase();
  return db.getAllAsync<TipoServicoLocal>(
    `
    SELECT uuid, nome, valor
    FROM tipos_servico
    WHERE deleted_at IS NULL
    ORDER BY nome ASC
    `
  );
}

export async function salvarCliente(dados: { nome: string; telefone?: string; placa_principal?: string }) {
  return salvarClienteVeiculo({
    placa: dados.placa_principal || "",
    nome: dados.nome,
    telefone: dados.telefone,
    modelo: "",
    cor: ""
  });
}

export async function salvarClienteVeiculo(dados: {
  placa: string;
  nome?: string;
  telefone?: string;
  data_nascimento?: string;
  modelo?: string;
  cor?: string;
}) {
  const db = await getDatabase();
  const clienteUuid = newUuid();
  const veiculoUuid = newUuid();
  const placa = dados.placa.trim().toUpperCase();
  const clientePayload = {
    uuid: clienteUuid,
    nome: (dados.nome || "Cliente").trim() || "Cliente",
    telefone: (dados.telefone || "").trim(),
    placa_principal: placa,
    data_nascimento: (dados.data_nascimento || "").trim(),
    updated_at: new Date().toISOString()
  };
  await db.runAsync(
    `
    INSERT INTO clientes (uuid, nome, telefone, placa_principal, data_nascimento, updated_at)
    VALUES (?, ?, ?, ?, ?, ?)
    `,
    clientePayload.uuid,
    clientePayload.nome,
    clientePayload.telefone,
    clientePayload.placa_principal,
    clientePayload.data_nascimento,
    clientePayload.updated_at
  );
  const veiculoPayload = {
    uuid: veiculoUuid,
    cliente_uuid: clienteUuid,
    placa,
    modelo: (dados.modelo || "").trim(),
    cor: (dados.cor || "").trim(),
    status_atendimento: "SEM_ATENDIMENTO",
    atendimento_ativo: 0,
    updated_at: clientePayload.updated_at
  };
  await db.runAsync(
    `
    INSERT INTO veiculos (uuid, cliente_uuid, placa, modelo, cor, status_atendimento, atendimento_ativo, updated_at)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    `,
    veiculoPayload.uuid,
    veiculoPayload.cliente_uuid,
    veiculoPayload.placa,
    veiculoPayload.modelo,
    veiculoPayload.cor,
    veiculoPayload.status_atendimento,
    veiculoPayload.atendimento_ativo,
    veiculoPayload.updated_at
  );
  await enqueueSync("clientes", clienteUuid, "upsert", clientePayload);
  await enqueueSync("veiculos", veiculoUuid, "upsert", veiculoPayload);
  return { clienteUuid, veiculoUuid, placa };
}

export async function atualizarClienteVeiculo(dados: {
  veiculo_uuid: string;
  cliente_uuid?: string;
  placa: string;
  nome?: string;
  telefone?: string;
  modelo?: string;
  cor?: string;
}) {
  const db = await getDatabase();
  const updatedAt = new Date().toISOString();
  if (dados.cliente_uuid) {
    const clientePayload = {
      uuid: dados.cliente_uuid,
      nome: (dados.nome || "Cliente").trim() || "Cliente",
      telefone: (dados.telefone || "").trim(),
      placa_principal: dados.placa.trim().toUpperCase(),
      updated_at: updatedAt
    };
    await db.runAsync(
      `
      UPDATE clientes
      SET nome=?, telefone=?, placa_principal=?, updated_at=?, deleted_at=NULL
      WHERE uuid=?
      `,
      clientePayload.nome,
      clientePayload.telefone,
      clientePayload.placa_principal,
      clientePayload.updated_at,
      clientePayload.uuid
    );
    await enqueueSync("clientes", clientePayload.uuid, "upsert", clientePayload);
  }
  const veiculoPayload = {
    uuid: dados.veiculo_uuid,
    cliente_uuid: dados.cliente_uuid || "",
    placa: dados.placa.trim().toUpperCase(),
    modelo: (dados.modelo || "").trim(),
    cor: (dados.cor || "").trim(),
    updated_at: updatedAt
  };
  await db.runAsync(
    `
    UPDATE veiculos
    SET cliente_uuid=?, placa=?, modelo=?, cor=?, updated_at=?, deleted_at=NULL
    WHERE uuid=?
    `,
    veiculoPayload.cliente_uuid,
    veiculoPayload.placa,
    veiculoPayload.modelo,
    veiculoPayload.cor,
    veiculoPayload.updated_at,
    veiculoPayload.uuid
  );
  await enqueueSync("veiculos", veiculoPayload.uuid, "upsert", veiculoPayload);
}

export async function listarServicos() {
  const db = await getDatabase();
  return db.getAllAsync<ServicoLocal>(
    `
    SELECT uuid, veiculo_uuid, tipo_nome, valor, valor_adicional, status, observacoes, etapa_atual, entrada, entrega_prevista, updated_at
    FROM servicos
    WHERE deleted_at IS NULL
    ORDER BY updated_at DESC, entrada DESC
    LIMIT 100
    `
  );
}

export async function salvarServico(dados: {
  veiculo_uuid?: string;
  tipo_nome?: string;
  valor?: number;
  valor_adicional?: number;
  entrega_prevista?: string;
  observacoes?: string;
  status?: string;
  fotos_entrada?: number;
  fotos_detalhe?: number;
}) {
  const db = await getDatabase();
  const uuid = newUuid();
  const payload = {
    uuid,
    veiculo_uuid: dados.veiculo_uuid || "",
    tipo_nome: dados.tipo_nome || "Servico",
    valor: Number(dados.valor || 0) + Number(dados.valor_adicional || 0),
    valor_adicional: Number(dados.valor_adicional || 0),
    status: dados.status || "ABERTO",
    observacoes: (dados.observacoes || "").trim(),
    etapa_atual: "LAVAGEM",
    entrada: new Date().toISOString(),
    entrega_prevista: dados.entrega_prevista || "",
    fotos_entrada: Number(dados.fotos_entrada || 0),
    fotos_detalhe: Number(dados.fotos_detalhe || 0),
    updated_at: new Date().toISOString()
  };
  await db.runAsync(
    `
    INSERT INTO servicos (
      uuid, veiculo_uuid, tipo_nome, valor, valor_adicional, status,
      observacoes, etapa_atual, entrada, entrega_prevista,
      fotos_entrada, fotos_detalhe, updated_at
    )
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `,
    payload.uuid,
    payload.veiculo_uuid,
    payload.tipo_nome,
    payload.valor,
    payload.valor_adicional,
    payload.status,
    payload.observacoes,
    payload.etapa_atual,
    payload.entrada,
    payload.entrega_prevista,
    payload.fotos_entrada,
    payload.fotos_detalhe,
    payload.updated_at
  );
  if (payload.veiculo_uuid) {
    await db.runAsync(
      `
      UPDATE veiculos
      SET status_atendimento='EM ANDAMENTO',
          atendimento_ativo=1,
          ultima_entrada=?,
          updated_at=?
      WHERE uuid=?
      `,
      payload.entrada,
      payload.updated_at,
      payload.veiculo_uuid
    );
  }
  await enqueueSync("servicos", uuid, "upsert", payload);
}

export async function resumoLocal() {
  const db = await getDatabase();
  const clientes = await db.getFirstAsync<{ total: number }>("SELECT COUNT(*) as total FROM clientes WHERE deleted_at IS NULL");
  const servicos = await db.getFirstAsync<{ total: number }>("SELECT COUNT(*) as total FROM servicos WHERE deleted_at IS NULL");
  const fotos = await db.getFirstAsync<{ total: number }>("SELECT COUNT(*) as total FROM fotos WHERE deleted_at IS NULL");
  const pendencias = await db.getFirstAsync<{ total: number }>("SELECT COUNT(*) as total FROM sync_queue WHERE synced_at IS NULL");
  return {
    clientes: Number(clientes?.total || 0),
    servicos: Number(servicos?.total || 0),
    fotos: Number(fotos?.total || 0),
    pendencias: Number(pendencias?.total || 0)
  };
}
