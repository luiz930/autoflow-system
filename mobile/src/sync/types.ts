export type SyncConfig = {
  endpointUrl: string;
  token?: string;
};

export type SyncResult = {
  sent: number;
  pulled: number;
  error?: string;
};

export type QueueRow = {
  id: number;
  entity: string;
  entity_uuid: string;
  action: string;
  payload_json: string;
};
