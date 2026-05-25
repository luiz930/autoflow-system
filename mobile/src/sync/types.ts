export type SyncConfig = {
  endpointUrl: string;
  token?: string;
};

export type SyncResult = {
  sent: number;
  pulled: number;
  photosUploaded?: number;
  durationMs?: number;
  serverCursor?: string;
  nextRetrySeconds?: number;
  error?: string;
};

export type SyncDiagnostics = {
  pending: number;
  pendingPhotos: number;
  lastSuccessAt: string;
  lastErrorAt: string;
  lastError: string;
  lastDurationMs: number;
  lastSent: number;
  lastPulled: number;
  lastPhotosUploaded: number;
  lastPullAt: string;
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

export type MobileWeatherPayload = {
  clima?: string;
  temp?: string | number;
  icone?: string;
  sugestao?: string;
};

export type MobileModuleCounter = {
  label: string;
  value: string | number;
  icon?: string;
};

export type MobileModuleRow = {
  title?: string;
  detail?: string;
  badge?: string;
  tabela?: string;
  chave?: string;
  acao?: string;
  direcao?: string;
  criado_em?: string;
};

export type MobileModulePayload = {
  counters?: MobileModuleCounter[];
  rows?: MobileModuleRow[];
};

export type MobileSiteState = {
  contexto_negocio?: Record<string, string>;
  clima?: MobileWeatherPayload;
  hud?: MobileHudPayload;
  modulos?: Record<string, MobileModulePayload>;
  refresh_interval_seconds?: number;
  server_time?: string;
  versao_sistema?: string;
};

export type MobileConfigResult = {
  version?: string;
  error?: string;
};

export type AppUpdateInfo = {
  ok?: boolean;
  app_name?: string;
  package?: string;
  installed_version?: string;
  latest_version?: string;
  version_name?: string;
  version_code?: number;
  update_available?: boolean;
  download_url?: string;
  page_url?: string;
  file_name?: string;
  file_size?: number;
  file_size_mb?: number;
  sha256?: string;
  published_at?: string;
  available?: boolean;
  message?: string;
  preserves_session?: boolean;
  error?: string;
};

export type MobileHudResult = MobileConfigResult & {
  clima?: MobileWeatherPayload;
  hud?: MobileHudPayload;
  site?: MobileSiteState;
};

export type QueueRow = {
  id: number;
  entity: string;
  entity_uuid: string;
  action: string;
  payload_json: string;
};

export type QueuePreviewRow = {
  id: number;
  entity: string;
  entity_uuid: string;
  action: string;
  created_at?: string;
  attempts?: number;
  last_error?: string;
};

export type PendingPhotoPreviewRow = {
  uuid: string;
  servico_uuid?: string;
  tipo?: string;
  uri_local?: string;
  created_at?: string;
  upload_attempts?: number;
  upload_last_error?: string;
  tamanho_bytes?: number;
};
