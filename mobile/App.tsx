import { StatusBar } from "expo-status-bar";
import * as SystemUI from "expo-system-ui";
import { useEffect, useMemo, useState } from "react";
import { ActivityIndicator, Image, SafeAreaView, StyleSheet, Text, View } from "react-native";

import { initDatabase } from "./src/database/db";
import { LoginScreen } from "./src/screens/LoginScreen";
import { HomeScreen } from "./src/screens/HomeScreen";
import { clearPersistedSession, getPersistedSession, UserSession } from "./src/auth/authRepository";
import { colors } from "./src/theme";

const wagenLogo = require("./src/assets/logo.png");

export default function App() {
  const [ready, setReady] = useState(false);
  const [session, setSession] = useState<UserSession | null>(null);

  useEffect(() => {
    SystemUI.setBackgroundColorAsync(colors.bg).catch(() => undefined);
    initDatabase()
      .then(async () => {
        setSession(await getPersistedSession());
      })
      .finally(() => setReady(true));
  }, []);

  async function logout() {
    await clearPersistedSession();
    setSession(null);
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

    return <HomeScreen session={session} onLogout={logout} />;
  }, [ready, session]);

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
  }
});
