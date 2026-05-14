import { useEffect, useState } from "react";
import { Pressable, ScrollView, StyleSheet, Text, TextInput, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";

import { UserSession } from "../auth/authRepository";
import { DEFAULT_SERVER_URL, normalizeServerUrl } from "../config";
import { getSetting, setSetting } from "../database/db";
import { pendingSyncCount, runSync } from "../sync/syncService";
import { colors, spacing } from "../theme";
import { CameraScreen } from "./CameraScreen";

type Props = {
  session: UserSession;
  onLogout: () => void;
};

export function HomeScreen({ session, onLogout }: Props) {
  const [pending, setPending] = useState(0);
  const [syncMessage, setSyncMessage] = useState("Banco local ativo");
  const [cameraOpen, setCameraOpen] = useState(false);
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

  async function syncNow() {
    const normalizedUrl = normalizeServerUrl(endpointUrl);
    await setSetting("sync_endpoint_url", normalizedUrl);
    await setSetting("sync_token", syncToken.trim());
    const result = await runSync({ endpointUrl: normalizedUrl, token: syncToken.trim() });
    setSyncMessage(result.error || `Enviado: ${result.sent} | Recebido: ${result.pulled}`);
    await refreshPending();
  }

  if (cameraOpen) {
    return <CameraScreen session={session} onClose={() => setCameraOpen(false)} onSaved={refreshPending} />;
  }

  return (
    <ScrollView contentContainerStyle={styles.screen}>
      <View style={styles.header}>
        <View>
          <Text style={styles.kicker}>WAGEN ESTETICA</Text>
          <Text style={styles.title}>Operacao</Text>
          <Text style={styles.subtitle}>{session.nome} | {session.perfil}</Text>
        </View>
        <Pressable onPress={onLogout} style={styles.iconButton}>
          <Ionicons color={colors.text} name="log-out-outline" size={22} />
        </Pressable>
      </View>

      <View style={styles.statusBand}>
        <View style={styles.statusItem}>
          <Text style={styles.statusLabel}>Banco</Text>
          <Text style={styles.statusValue}>SQLite local</Text>
        </View>
        <View style={styles.statusItem}>
          <Text style={styles.statusLabel}>Pendencias</Text>
          <Text style={styles.statusValue}>{pending}</Text>
        </View>
      </View>

      <View style={styles.card}>
        <Text style={styles.cardTitle}>Atalhos</Text>
        <View style={styles.actionGrid}>
          <Pressable onPress={() => setCameraOpen(true)} style={styles.actionButton}>
            <Ionicons color="#111827" name="camera" size={22} />
            <Text style={styles.actionButtonText}>Camera</Text>
          </Pressable>
          <Pressable onPress={syncNow} style={styles.secondaryAction}>
            <Ionicons color={colors.text} name="sync" size={22} />
            <Text style={styles.secondaryActionText}>Sincronizar</Text>
          </Pressable>
        </View>
        <Text style={styles.muted}>{syncMessage}</Text>
      </View>

      <View style={styles.card}>
        <Text style={styles.cardTitle}>Servidor conectado</Text>
        <TextInput
          autoCapitalize="none"
          keyboardType="url"
          editable={false}
          placeholder={DEFAULT_SERVER_URL}
          placeholderTextColor={colors.muted}
          style={styles.input}
          value={endpointUrl}
        />
        <TextInput
          autoCapitalize="none"
          onChangeText={setSyncToken}
          placeholder="Token salvo pelo login online"
          placeholderTextColor={colors.muted}
          secureTextEntry
          editable={false}
          style={styles.input}
          value={syncToken}
        />
      </View>

      <View style={styles.card}>
        <Text style={styles.cardTitle}>Modo offline-first</Text>
        <Text style={styles.muted}>
          Tudo que for cadastrado no app fica salvo no banco local. Quando o servidor for configurado, a fila envia as alteracoes sem bloquear o uso.
        </Text>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  screen: {
    padding: spacing.lg,
    gap: spacing.lg,
    backgroundColor: colors.bg
  },
  header: {
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 22,
    padding: spacing.lg,
    backgroundColor: colors.surface,
    flexDirection: "row",
    justifyContent: "space-between",
    gap: spacing.md
  },
  kicker: {
    color: colors.primary,
    fontSize: 12,
    fontWeight: "800",
    letterSpacing: 1.7
  },
  title: {
    color: colors.text,
    fontSize: 34,
    fontWeight: "900"
  },
  subtitle: {
    color: colors.muted
  },
  iconButton: {
    width: 44,
    height: 44,
    borderRadius: 14,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1,
    borderColor: colors.border
  },
  statusBand: {
    flexDirection: "row",
    gap: spacing.md
  },
  statusItem: {
    flex: 1,
    borderRadius: 18,
    backgroundColor: colors.surfaceSoft,
    borderWidth: 1,
    borderColor: colors.border,
    padding: spacing.md
  },
  statusLabel: {
    color: colors.muted,
    marginBottom: 4
  },
  statusValue: {
    color: colors.text,
    fontSize: 20,
    fontWeight: "900"
  },
  card: {
    borderRadius: 22,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surface,
    padding: spacing.lg,
    gap: spacing.md
  },
  cardTitle: {
    color: colors.text,
    fontSize: 20,
    fontWeight: "900"
  },
  actionGrid: {
    flexDirection: "row",
    gap: spacing.md
  },
  actionButton: {
    flex: 1,
    minHeight: 54,
    borderRadius: 14,
    backgroundColor: colors.primary,
    alignItems: "center",
    justifyContent: "center",
    flexDirection: "row",
    gap: spacing.sm
  },
  actionButtonText: {
    color: "#111827",
    fontWeight: "900"
  },
  secondaryAction: {
    flex: 1,
    minHeight: 54,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: colors.border,
    alignItems: "center",
    justifyContent: "center",
    flexDirection: "row",
    gap: spacing.sm
  },
  secondaryActionText: {
    color: colors.text,
    fontWeight: "900"
  },
  muted: {
    color: colors.muted,
    lineHeight: 20
  },
  input: {
    minHeight: 50,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: "rgba(250, 204, 21, 0.18)",
    backgroundColor: colors.surfaceSoft,
    color: colors.text,
    paddingHorizontal: spacing.md
  }
});
