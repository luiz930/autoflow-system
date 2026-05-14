import bcrypt from "bcryptjs";

import { normalizeServerUrl } from "../config";
import { getDatabase, getSetting, setSetting } from "../database/db";

export type UserSession = {
  id: number;
  usuario: string;
  nome: string;
  perfil: string;
  onlineToken?: string;
};

type UserRow = {
  id: number;
  usuario: string;
  senha: string;
  nome: string | null;
  perfil: string | null;
  ativo: number | null;
};

type MobileLoginResponse = {
  ok: boolean;
  token?: string;
  erro?: string;
  usuario?: {
    id: number;
    usuario: string;
    senha: string;
    nome: string;
    perfil: string;
    ativo: number;
    criado_em?: string;
    senha_alteracao_obrigatoria?: number;
    senha_atualizada_em?: string;
    foto_perfil?: string;
    hud_config_json?: string;
  };
};

async function saveRemoteUser(data: NonNullable<MobileLoginResponse["usuario"]>) {
  const db = await getDatabase();
  await db.runAsync(
    `
    INSERT INTO usuarios (
      id, usuario, senha, nome, perfil, ativo, criado_em,
      senha_alteracao_obrigatoria, senha_atualizada_em, foto_perfil,
      hud_config_json, updated_at
    )
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, CURRENT_TIMESTAMP)
    ON CONFLICT(usuario) DO UPDATE SET
      senha=excluded.senha,
      nome=excluded.nome,
      perfil=excluded.perfil,
      ativo=excluded.ativo,
      senha_alteracao_obrigatoria=excluded.senha_alteracao_obrigatoria,
      senha_atualizada_em=excluded.senha_atualizada_em,
      foto_perfil=excluded.foto_perfil,
      hud_config_json=excluded.hud_config_json,
      updated_at=CURRENT_TIMESTAMP,
      deleted_at=NULL
    `,
    data.id,
    data.usuario,
    data.senha,
    data.nome || data.usuario,
    data.perfil || "funcionario",
    Number(data.ativo ?? 1),
    data.criado_em || "",
    Number(data.senha_alteracao_obrigatoria || 0),
    data.senha_atualizada_em || "",
    data.foto_perfil || "",
    data.hud_config_json || ""
  );
}

export async function loginOnline(serverUrl: string, usuario: string, senha: string): Promise<UserSession> {
  const baseUrl = normalizeServerUrl(serverUrl);
  if (!baseUrl) {
    throw new Error("Informe a URL do site.");
  }

  const response = await fetch(`${baseUrl}/api/mobile/login`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ usuario: usuario.trim(), senha })
  });
  const data = (await response.json()) as MobileLoginResponse;

  if (response.status === 404) {
    throw new Error("O site ainda nao tem a API mobile publicada.");
  }

  if (!response.ok || !data.ok || !data.usuario || !data.token) {
    throw new Error(data.erro || `Servidor retornou HTTP ${response.status}`);
  }

  await saveRemoteUser(data.usuario);
  await setSetting("sync_endpoint_url", baseUrl);
  await setSetting("sync_token", data.token);

  return {
    id: data.usuario.id,
    usuario: data.usuario.usuario,
    nome: data.usuario.nome || data.usuario.usuario,
    perfil: data.usuario.perfil || "funcionario",
    onlineToken: data.token
  };
}

export async function loginOffline(usuario: string, senha: string): Promise<UserSession> {
  const db = await getDatabase();
  const user = await db.getFirstAsync<UserRow>(
    "SELECT * FROM usuarios WHERE usuario = ? AND deleted_at IS NULL LIMIT 1",
    usuario.trim()
  );

  if (!user || Number(user.ativo ?? 1) !== 1) {
    throw new Error("Usuario ou senha invalidos.");
  }

  const senhaSalva = String(user.senha || "");
  const senhaOk = senhaSalva.startsWith("$2")
    ? await bcrypt.compare(senha, senhaSalva)
    : senha === senhaSalva;

  if (!senhaOk) {
    throw new Error("Usuario ou senha invalidos.");
  }

  await db.runAsync(
    "UPDATE usuarios SET ultimo_login_em = CURRENT_TIMESTAMP, tentativas_login = 0 WHERE id = ?",
    user.id
  );

  return {
    id: user.id,
    usuario: user.usuario,
    nome: user.nome || user.usuario,
    perfil: user.perfil || "funcionario",
    onlineToken: await getSetting("sync_token")
  };
}
