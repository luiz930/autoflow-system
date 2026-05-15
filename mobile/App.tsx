import { StatusBar } from "expo-status-bar";
import * as SystemUI from "expo-system-ui";
import * as LocalAuthentication from "expo-local-authentication";
import { useEffect, useMemo, useState } from "react";
import { ActivityIndicator, Image, Pressable, SafeAreaView, StyleSheet, Text, View } from "react-native";

import { initDatabase } from "./src/database/db";
import { LoginScreen } from "./src/screens/LoginScreen";
import { HomeScreen } from "./src/screens/HomeScreen";
import { clearPersistedSession, getBiometricLockEnabled, getPersistedSession, UserSession } from "./src/auth/authRepository";
import { colors } from "./src/theme";

const wagenLogo = require("./src/assets/logo.png");

export default function App() {
  const [ready, setReady] = useState(false);
  const [session, setSession] = useState<UserSession | null>(null);
  const [locked, setLocked] = useState(false);
  const [unlockMessage, setUnlockMessage] = useState("");

  useEffect(() => {
    SystemUI.setBackgroundColorAsync(colors.bg).catch(() => undefined);
    initDatabase()
      .then(async () => {
        const persistedSession = await getPersistedSession();
        const biometricLock = persistedSession ? await getBiometricLockEnabled() : false;
        setSession(persistedSession);
        setLocked(biometricLock);
      })
      .finally(() => setReady(true));
  }, []);

  async function logout() {
    await clearPersistedSession();
    setLocked(false);
    setSession(null);
  }

  async function unlock() {
    setUnlockMessage("");
    try {
      const result = await LocalAuthentication.authenticateAsync({
        promptMessage: "Desbloquear Wagen",
        cancelLabel: "Sair",
        fallbackLabel: "Usar PIN"
      });
      if (result.success) {
        setLocked(false);
        return;
      }
      setUnlockMessage("Desbloqueio cancelado ou nao autorizado.");
    } catch {
      setUnlockMessage("Nao foi possivel abrir a biometria/PIN do aparelho.");
    }
  }

  const content = useMemo(() => {
    if (!ready) {
      return (
        <View style={styles.loading}>
          <Image accessibilityLabel="Wagen" resizeMode="contain" source={wagenLogo} style={styles.loadingLogo} />
          <Text style={styles.loadingTitle}>Wagen</Text>
          <Text style={styles.loadingSubtitle}>Preparando app</Text>
          <ActivityIndicator color={colors.primary} size="large" />
        </View>
      );
    }

    if (!session) {
      return <LoginScreen onLoggedIn={setSession} />;
    }

    if (locked) {
      return (
        <View style={styles.loading}>
          <Image accessibilityLabel="Wagen" resizeMode="contain" source={wagenLogo} style={styles.loadingLogo} />
          <Text style={styles.loadingTitle}>Wagen</Text>
          <Text style={styles.loadingSubtitle}>Acesso protegido</Text>
          <Pressable onPress={unlock} style={styles.unlockButton}>
            <Text style={styles.unlockButtonText}>Desbloquear com biometria/PIN</Text>
          </Pressable>
          <Pressable onPress={logout} style={styles.exitButton}>
            <Text style={styles.exitButtonText}>Sair</Text>
          </Pressable>
          {unlockMessage ? <Text style={styles.unlockMessage}>{unlockMessage}</Text> : null}
        </View>
      );
    }

    return <HomeScreen session={session} onLogout={logout} />;
  }, [ready, session, locked, unlockMessage]);

  return (
    <SafeAreaView style={styles.root}>
      <StatusBar backgroundColor={colors.bg} style="light" translucent={false} />
      {content}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: colors.bg
  },
  loading: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    gap: 12,
    backgroundColor: colors.bg
  },
  loadingLogo: {
    width: 142,
    height: 142,
    borderRadius: 26,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: "#000"
  },
  loadingTitle: {
    color: colors.text,
    fontSize: 28,
    fontWeight: "900"
  },
  loadingSubtitle: {
    color: colors.primary,
    fontSize: 12,
    fontWeight: "800",
    letterSpacing: 1.4,
    textTransform: "uppercase"
  },
  unlockButton: {
    minHeight: 50,
    borderRadius: 14,
    backgroundColor: colors.primary,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 18
  },
  unlockButtonText: {
    color: colors.primaryText,
    fontWeight: "900"
  },
  exitButton: {
    minHeight: 48,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: colors.border,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 18
  },
  exitButtonText: {
    color: colors.text,
    fontWeight: "900"
  },
  unlockMessage: {
    color: colors.muted,
    textAlign: "center"
  }
});
