
import "../global.css";

import { Stack } from "expo-router";
import { onAuthStateChanged, type User } from "firebase/auth";
import { useEffect, useState } from "react";

import {
  ActivityIndicator,
  StyleSheet,
  View,
} from "react-native";

import { auth } from "../config/firebase";

export default function RootLayout() {
  const [usuario, setUsuario] = useState<User | null>(null);
  const [carregando, setCarregando] = useState(true);

  // Acompanha o estado de autenticação no Firebase
  useEffect(() => {
    const cancelar = onAuthStateChanged(auth, (user) => {
      setUsuario(user);
      setCarregando(false);
    });

    return cancelar;
  }, []);

  // Aguarda a verificação da sessão
  if (carregando) {
    return (
      <View style={styles.carregamento}>
        <ActivityIndicator
          size="large"
          color="#276749"
        />
      </View>
    );
  }

  // Permite acesso interno somente para contas verificadas
  const contaAtiva =
    usuario !== null && usuario.emailVerified;

  return (
    <Stack screenOptions={{ headerShown: false }}>

      {/* TELAS PÚBLICAS */}
      <Stack.Protected guard={!contaAtiva}>
        <Stack.Screen name="index" />
        <Stack.Screen name="login" />
        <Stack.Screen name="cadastro" />
        <Stack.Screen name="recuperar-senha" />
      </Stack.Protected>

      {/* TELAS PROTEGIDAS */}
      <Stack.Protected guard={contaAtiva}>
        <Stack.Screen name="inicio" />
        <Stack.Screen name="nova-observacao" />
        <Stack.Screen name="minhas-observacoes" />
        <Stack.Screen name="explore" />
      </Stack.Protected>

    </Stack>
  );
}

const styles = StyleSheet.create({
  carregamento: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "#F5F8F4",
  },
});
