import { useEffect, useState } from "react";

import { UserSession } from "../auth/authRepository";
import { DEFAULT_SERVER_URL, normalizeServerUrl } from "../config";
import { getSetting, setSetting } from "../database/db";
import { pendingSyncCount, runSync } from "../sync/syncService";
import { colors, spacing } from "../theme";
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

  async function refreshPending() {
    setPending(await pendingSyncCount());
  }

  useEffect(() => {
    refreshPending();
    getSetting("sync_endpoint_url").then((value) => setEndpointUrl(normalizeServerUrl(value || DEFAULT_SERVER_URL)));
    getSetting("sync_token").then(setSyncToken);
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
        key={`${activeScreen}-${syncMessage}-${pending}`}
        screen={activeScreen}
        onOpenCamera={setCameraTarget}
        onRefreshPending={handleLocalSaved}
        sync={{
          pending,
          message: syncMessage,
          endpointUrl: endpointUrl || DEFAULT_SERVER_URL,
          onSyncNow: syncNow
        }}
      />
    </AppShell>
  );
}
