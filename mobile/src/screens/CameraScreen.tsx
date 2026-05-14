import { CameraView, useCameraPermissions } from "expo-camera";
import * as FileSystem from "expo-file-system";
import { useRef, useState } from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";

import { UserSession } from "../auth/authRepository";
import { enqueueSync, newUuid } from "../database/db";
import { colors, spacing } from "../theme";

type Props = {
  session: UserSession;
  onClose: () => void;
  onSaved: () => void;
};

export function CameraScreen({ session, onClose, onSaved }: Props) {
  const cameraRef = useRef<CameraView | null>(null);
  const [permission, requestPermission] = useCameraPermissions();
  const [saving, setSaving] = useState(false);

  async function takePhoto() {
    if (!cameraRef.current || saving) {
      return;
    }

    setSaving(true);
    try {
      const photo = await cameraRef.current.takePictureAsync({ quality: 0.78 });
      if (!photo?.uri) {
        throw new Error("Nao foi possivel capturar a foto.");
      }
      const uuid = newUuid();
      const targetDir = `${FileSystem.documentDirectory}fotos/`;
      await FileSystem.makeDirectoryAsync(targetDir, { intermediates: true });
      const targetUri = `${targetDir}${uuid}.jpg`;
      await FileSystem.copyAsync({ from: photo.uri, to: targetUri });

      const payload = {
        uuid,
        uri_local: targetUri,
        tipo: "operacional",
        usuario: session.usuario,
        usuario_nome: session.nome,
        created_at: new Date().toISOString()
      };

      await enqueueSync("fotos", uuid, "upsert", payload);
      await onSaved();
      onClose();
    } finally {
      setSaving(false);
    }
  }

  if (!permission) {
    return <View style={styles.center} />;
  }

  if (!permission.granted) {
    return (
      <View style={styles.center}>
        <Text style={styles.title}>Camera bloqueada</Text>
        <Text style={styles.muted}>Autorize a camera para registrar fotos dos atendimentos.</Text>
        <Pressable onPress={requestPermission} style={styles.primaryButton}>
          <Text style={styles.primaryButtonText}>Autorizar camera</Text>
        </Pressable>
        <Pressable onPress={onClose} style={styles.secondaryButton}>
          <Text style={styles.secondaryButtonText}>Voltar</Text>
        </Pressable>
      </View>
    );
  }

  return (
    <View style={styles.root}>
      <CameraView ref={cameraRef} style={styles.camera} facing="back" />
      <View style={styles.toolbar}>
        <Pressable onPress={onClose} style={styles.iconButton}>
          <Ionicons color={colors.text} name="close" size={26} />
        </Pressable>
        <Pressable onPress={takePhoto} style={styles.captureButton}>
          <Ionicons color="#111827" name="camera" size={30} />
        </Pressable>
        <View style={styles.iconButtonPlaceholder} />
      </View>
      {saving ? <Text style={styles.saving}>Salvando no banco local...</Text> : null}
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: colors.bg
  },
  camera: {
    flex: 1
  },
  toolbar: {
    position: "absolute",
    left: spacing.lg,
    right: spacing.lg,
    bottom: spacing.xl,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between"
  },
  iconButton: {
    width: 52,
    height: 52,
    borderRadius: 18,
    backgroundColor: "rgba(17, 24, 39, 0.9)",
    alignItems: "center",
    justifyContent: "center"
  },
  iconButtonPlaceholder: {
    width: 52,
    height: 52
  },
  captureButton: {
    width: 74,
    height: 74,
    borderRadius: 37,
    backgroundColor: colors.primary,
    alignItems: "center",
    justifyContent: "center"
  },
  saving: {
    position: "absolute",
    left: spacing.lg,
    right: spacing.lg,
    bottom: 118,
    color: colors.text,
    textAlign: "center",
    backgroundColor: "rgba(17, 24, 39, 0.9)",
    padding: spacing.md,
    borderRadius: 14
  },
  center: {
    flex: 1,
    padding: spacing.lg,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: colors.bg,
    gap: spacing.md
  },
  title: {
    color: colors.text,
    fontSize: 26,
    fontWeight: "900"
  },
  muted: {
    color: colors.muted,
    textAlign: "center"
  },
  primaryButton: {
    minHeight: 50,
    borderRadius: 14,
    paddingHorizontal: spacing.lg,
    backgroundColor: colors.primary,
    alignItems: "center",
    justifyContent: "center"
  },
  primaryButtonText: {
    color: "#111827",
    fontWeight: "900"
  },
  secondaryButton: {
    minHeight: 50,
    borderRadius: 14,
    paddingHorizontal: spacing.lg,
    borderWidth: 1,
    borderColor: colors.border,
    alignItems: "center",
    justifyContent: "center"
  },
  secondaryButtonText: {
    color: colors.text,
    fontWeight: "900"
  }
});
