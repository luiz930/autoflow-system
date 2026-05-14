export type SyncConfig = {
  endpointUrl: string;
  token?: string;
};

export type SyncResult = {
  sent: number;
  pulled: number;
  error?: string;
};

export type MobileHudPayload = Record<string, unknown> & {
  andamento?: number;
  atrasados?: number;
  banco_online_mensagem?: string;
  banco_online_resumo?: string;
  clientes_mes?: number;
  entregas_hoje?: number;
  faturamento_mes?: number;
  servicos_ativos?: number;
  sync_bancos_mensagem?: string;
  sync_bancos_pendentes?: number;
  sync_bancos_resumo?: string;
  ticket?: number;
  total?: number;
  usuario_nome?: string;
  versao?: string;
};

export type MobileConfigResult = {
  version?: string;
  error?: string;
};

export type MobileHudResult = MobileConfigResult & {
  hud?: MobileHudPayload;
};

export type QueueRow = {
  id: number;
  entity: string;
  entity_uuid: string;
  action: string;
  payload_json: string;
};
