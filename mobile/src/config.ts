export const DEFAULT_SERVER_URL = "https://wagenestetica.duckdns.org";

export function normalizeServerUrl(value?: string) {
  const raw = String(value || DEFAULT_SERVER_URL).trim();
  if (!raw) {
    return DEFAULT_SERVER_URL;
  }
  const withProtocol = /^https?:\/\//i.test(raw) ? raw : `https://${raw}`;
  return withProtocol.replace(/\/+$/, "");
}
