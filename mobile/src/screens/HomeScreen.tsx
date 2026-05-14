import { useEffect, useState } from "react";

import { UserSession } from "../auth/authRepository";
import { DEFAULT_SERVER_URL, normalizeServerUrl } from "../config";
import { getSetting, setSetting } from "../database/db";
import { fetchMobileConfig, fetchMobileHud, pendingSyncCount, runSync, updateMobileVersion } from "../sync/syncService";
import { MobileHudPayload } from "../sync/types";
import { AppScreenKey, AppShell } from "./AppShell";
import { CameraScreen, CameraTarget } from "./CameraScreen";
import { NativeScreenContent, screenTitle } from "./NativeScreens";

type Props = {
  session: UserSession;
  onLogout: () => void;
};

export function HomeScreen({ session, onLogout }: Props) {
  const [pending, setPending] = useState(0);
  const [syncMessage, setSyncMessage] = useState("Banco local ativo");
  const [cameraTarget, setCameraTarget] = useState<CameraTarget | null>(null);
  const [activeScreen, setActiveScreen] = useState<AppScreenKey>("inicio");
  const [endpointUrl, setEndpointUrl] = useState("");
  const [syncToken, setSyncToken] = useState("");
  const [hud, setHud] = useState<MobileHudPayload | null>(null);
  const [appVersion, setAppVersion] = useState("");

  async function refreshPending() {
    setPending(await pendingSyncCount());
  }

  useEffect(() => {
    refreshPending();
    getSetting("sync_endpoint_url").then((value) => setEndpointUrl(normalizeServerUrl(value || DEFAULT_SERVER_URL)));
    getSetting("sync_token").then((value) => {
      setSyncToken(value);
      getSetting("site_version").then(setAppVersion);
    });
  }, []);

  useEffect(() => {
    if (endpointUrl) {
      syncNow();
    }
  }, [endpointUrl]);

  async function syncNow() {
    const normalizedUrl = normalizeServerUrl(endpointUrl);
    await setSetting("sync_endpoint_url", normalizedUrl);
    const savedToken = syncToken.trim() || await getSetting("sync_token");
    const result = await runSync({ endpointUrl: normalizedUrl, token: savedToken });
    setSyncMessage(result.error || `Enviado: ${result.sent} | Recebido: ${result.pulled}`);
    await refreshPending();
    await refreshHud(normalizedUrl, savedToken);
  }

  async function refreshHud(url = endpointUrl, token = syncToken) {
    const normalizedUrl = normalizeServerUrl(url || DEFAULT_SERVER_URL);
    const savedToken = token.trim() || await getSetting("sync_token");
    if (!savedToken) {
      return;
    }

    const [hudResult, configResult] = await Promise.all([
      fetchMobileHud({ endpointUrl: normalizedUrl, token: savedToken }),
      fetchMobileConfig({ endpointUrl: normalizedUrl, token: savedToken })
    ]);

    if (hudResult.hud) {
      setHud(hudResult.hud);
    }

    const version = configResult.version || hudResult.version;
    if (version) {
      setAppVersion(version);
      await setSetting("site_version", version);
    }

    if (hudResult.error || configResult.error) {
      setSyncMessage(hudResult.error || configResult.error || "Falha ao carregar dados do site.");
    }
  }

  async function saveVersionOnSite(version: string) {
    const normalizedUrl = normalizeServerUrl(endpointUrl || DEFAULT_SERVER_URL);
    const savedToken = syncToken.trim() || await getSetting("sync_token");
    const result = await updateMobileVersion({ endpointUrl: normalizedUrl, token: savedToken }, version);
    if (result.error) {
      setSyncMessage(result.error);
      return result.error;
    }
    const savedVersion = result.version || version;
    setAppVersion(savedVersion);
    await setSetting("site_version", savedVersion);
    setSyncMessage(`Versao ${savedVersion} salva no site`);
    await refreshHud(normalizedUrl, savedToken);
    return `Versao ${savedVersion} salva no site`;
  }

  async function handleLocalSaved() {
    await refreshPending();
    await syncNow();
  }

  if (cameraTarget) {
    return <CameraScreen session={session} target={cameraTarget} onClose={() => setCameraTarget(null)} onSaved={handleLocalSaved} />;
  }

  return (
    <AppShell
      active={activeScreen}
      title={screenTitle(activeScreen)}
      subtitle={`${session.nome} | ${session.perfil}`}
      onSelect={setActiveScreen}
      onLogout={onLogout}
    >
      <NativeScreenContent
        screen={activeScreen}
        onOpenCamera={setCameraTarget}
        onRefreshPending={handleLocalSaved}
        sync={{
          pending,
          message: syncMessage,
          endpointUrl: endpointUrl || DEFAULT_SERVER_URL,
          hud,
          version: appVersion,
          onRefreshHud: refreshHud,
          onSyncNow: syncNow,
          onUpdateVersion: saveVersionOnSite
        }}
      />
    </AppShell>
  );
}
