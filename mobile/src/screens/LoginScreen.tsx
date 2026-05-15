import { useEffect, useState } from "react";
import {
  KeyboardAvoidingView,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View
} from "react-native";

import {
  getLoginPreferences,
  loginOffline,
  loginOnline,
  saveLoginPreferences,
  savePersistedSession,
  UserSession
} from "../auth/authRepository";
import { APP_MOBILE_VERSION, DEFAULT_SERVER_URL } from "../config";
import { runSync } from "../sync/syncService";
import { colors, spacing } from "../theme";

type Props = {
  onLoggedIn: (session: UserSession) => void;
};

export function LoginScreen({ onLoggedIn }: Props) {
  const [usuario, setUsuario] = useState("");
  const [senha, setSenha] = useState("");
  const [mostrarSenha, setMostrarSenha] = useState(false);
  const [lembrarDados, setLembrarDados] = useState(false);
  const [manterConectado, setManterConectado] = useState(false);
  const [protegerComBiometria, setProtegerComBiometria] = useState(false);
  const [erro, setErro] = useState("");
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    getLoginPreferences().then((preferences) => {
      setLembrarDados(preferences.lembrarDados);
      setManterConectado(preferences.manterConectado);
      setProtegerComBiometria(preferences.protegerComBiometria);
      if (preferences.lembrarDados) {
        setUsuario(preferences.usuario);
      }
    });
  }, []);

  async function concluirLogin(session: UserSession) {
    await saveLoginPreferences({
      lembrarDados,
      manterConectado,
      protegerComBiometria,
      usuario
    });
    await savePersistedSession(manterConectado ? session : null);
    onLoggedIn(session);
  }

  async function submit() {
    setErro("");
    setLoading(true);
    try {
      const session = await loginOnline(DEFAULT_SERVER_URL, usuario, senha);
      await runSync({ endpointUrl: DEFAULT_SERVER_URL, token: session.onlineToken || "" });
      await concluirLogin(session);
    } catch (error) {
      try {
        await concluirLogin(await loginOffline(usuario, senha));
      } catch {
        setErro(error instanceof Error ? error.message : "Nao foi possivel entrar.");
      }
    } finally {
      setLoading(false);
    }
  }

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === "ios" ? "padding" : undefined}
      style={styles.screen}
    >
      <View style={styles.header}>
        <View style={styles.logo}>
          <Text style={styles.logoText}>S</Text>
        </View>
        <View>
          <Text style={styles.kicker}>SISTEMA</Text>
          <Text style={styles.title}>Login</Text>
          <Text style={styles.subtitle}>Acesso offline com sincronizacao posterior</Text>
        </View>
      </View>

      <View style={styles.card}>
        <TextInput
          autoCapitalize="none"
          autoComplete="username"
          onChangeText={setUsuario}
          placeholder="Usuario"
          placeholderTextColor={colors.muted}
          style={styles.input}
          value={usuario}
        />
        <View style={styles.passwordRow}>
          <TextInput
            autoCapitalize="none"
            autoComplete="password"
            onChangeText={setSenha}
            placeholder="Senha"
            placeholderTextColor={colors.muted}
            secureTextEntry={!mostrarSenha}
            style={[styles.input, styles.passwordInput]}
            value={senha}
          />
          <Pressable onPress={() => setMostrarSenha((value) => !value)} style={styles.secondaryButton}>
            <Text style={styles.secondaryButtonText}>{mostrarSenha ? "Ocultar" : "Mostrar"}</Text>
          </Pressable>
        </View>

        <Pressable onPress={() => setLembrarDados((value) => !value)} style={styles.optionRow}>
          <View style={[styles.checkbox, lembrarDados && styles.checkboxChecked]}>
            {lembrarDados ? <Text style={styles.checkboxMark}>X</Text> : null}
          </View>
          <Text style={styles.optionText}>Lembrar meus dados de login</Text>
        </Pressable>

        <Pressable
          onPress={() => {
            setManterConectado((value) => {
              if (value) {
                setProtegerComBiometria(false);
              }
              return !value;
            });
          }}
          style={styles.optionRow}
        >
          <View style={[styles.checkbox, manterConectado && styles.checkboxChecked]}>
            {manterConectado ? <Text style={styles.checkboxMark}>X</Text> : null}
          </View>
          <Text style={styles.optionText}>Manter-me conectado</Text>
        </Pressable>

        <Pressable
          onPress={() => {
            setProtegerComBiometria((value) => !value);
            setManterConectado(true);
          }}
          style={styles.optionRow}
        >
          <View style={[styles.checkbox, protegerComBiometria && styles.checkboxChecked]}>
            {protegerComBiometria ? <Text style={styles.checkboxMark}>X</Text> : null}
          </View>
          <Text style={styles.optionText}>Proteger abertura com biometria ou PIN</Text>
        </Pressable>

        <Pressable disabled={loading} onPress={submit} style={styles.primaryButton}>
          <Text style={styles.primaryButtonText}>{loading ? "Entrando..." : "Entrar"}</Text>
        </Pressable>

        {erro ? <Text style={styles.error}>{erro}</Text> : null}
        <Text style={styles.version}>Conectado ao site</Text>
        <Text style={styles.version}>App {APP_MOBILE_VERSION} offline-first</Text>
      </View>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    justifyContent: "center",
    padding: spacing.lg,
    backgroundColor: colors.bg
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.md,
    marginBottom: spacing.lg
  },
  logo: {
    width: 92,
    height: 92,
    borderRadius: 18,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.panel,
    alignItems: "center",
    justifyContent: "center"
  },
  logoText: {
    color: colors.primary,
    fontSize: 38,
    fontWeight: "900"
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
    color: colors.muted,
    marginTop: 4
  },
  card: {
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 22,
    backgroundColor: colors.panel,
    padding: spacing.lg,
    gap: spacing.md
  },
  input: {
    minHeight: 50,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: colors.borderInput,
    backgroundColor: colors.surfaceSoft,
    color: colors.text,
    paddingHorizontal: spacing.md
  },
  passwordRow: {
    flexDirection: "row",
    gap: spacing.sm
  },
  passwordInput: {
    flex: 1
  },
  primaryButton: {
    minHeight: 50,
    borderRadius: 14,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: colors.primary
  },
  primaryButtonText: {
    color: colors.primaryText,
    fontWeight: "900"
  },
  secondaryButton: {
    minWidth: 88,
    borderRadius: 14,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1,
    borderColor: colors.border
  },
  secondaryButtonText: {
    color: colors.text,
    fontWeight: "800"
  },
  optionRow: {
    minHeight: 36,
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.sm
  },
  checkbox: {
    width: 22,
    height: 22,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: colors.borderInput,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: colors.surfaceSoft
  },
  checkboxChecked: {
    borderColor: colors.primary,
    backgroundColor: colors.primary
  },
  checkboxMark: {
    color: colors.primaryText,
    fontSize: 16,
    fontWeight: "900"
  },
  optionText: {
    flex: 1,
    color: colors.text,
    fontWeight: "700"
  },
  error: {
    color: colors.danger,
    textAlign: "center"
  },
  version: {
    color: colors.muted,
    textAlign: "center"
  }
});
