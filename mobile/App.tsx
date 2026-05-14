import { StatusBar } from "expo-status-bar";
import { useEffect, useMemo, useState } from "react";
import { ActivityIndicator, SafeAreaView, StyleSheet, View } from "react-native";

import { initDatabase } from "./src/database/db";
import { LoginScreen } from "./src/screens/LoginScreen";
import { HomeScreen } from "./src/screens/HomeScreen";
import { UserSession } from "./src/auth/authRepository";
import { colors } from "./src/theme";

export default function App() {
  const [ready, setReady] = useState(false);
  const [session, setSession] = useState<UserSession | null>(null);

  useEffect(() => {
    initDatabase().finally(() => setReady(true));
  }, []);

  const content = useMemo(() => {
    if (!ready) {
      return (
        <View style={styles.loading}>
          <ActivityIndicator color={colors.primary} size="large" />
        </View>
      );
    }

    if (!session) {
      return <LoginScreen onLoggedIn={setSession} />;
    }

    return <HomeScreen session={session} onLogout={() => setSession(null)} />;
  }, [ready, session]);

  return (
    <SafeAreaView style={styles.root}>
      <StatusBar style="light" />
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
    justifyContent: "center"
  }
});
