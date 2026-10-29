
import { router } from "expo-router";
import {
  Pressable,
  StyleSheet,
  Text,
  View,
} from "react-native";

export default function HomeScreen() {
  return (
    <View style={styles.container}>
      <Text style={styles.icone}>🌿</Text>

      <Text style={styles.titulo}>
        BioCatalog
      </Text>

      <Text style={styles.subtitulo}>
        Descubra, registre e compartilhe
        a biodiversidade ao seu redor.
      </Text>

      {/* Botão para criar uma nova conta */}
      <Pressable
        style={styles.botao}
        onPress={() => router.push("/cadastro")}
      >
        <Text style={styles.textoBotao}>
          Criar minha conta
        </Text>
      </Pressable>

      {/* Botão para usuários já cadastrados */}
      <Pressable
        style={styles.botaoEntrar}
        onPress={() => router.push("/login")}
      >
        <Text style={styles.textoBotaoEntrar}>
          Já tenho uma conta
        </Text>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#F5F8F4",
    justifyContent: "center",
    alignItems: "center",
    padding: 24,
  },

  icone: {
    fontSize: 65,
    marginBottom: 15,
  },

  titulo: {
    fontSize: 36,
    fontWeight: "bold",
    color: "#276749",
  },

  subtitulo: {
    fontSize: 16,
    color: "#64746A",
    textAlign: "center",
    marginTop: 15,
    marginBottom: 40,
    lineHeight: 24,
  },

  // Botão de cadastro
  botao: {
    backgroundColor: "#276749",
    paddingVertical: 16,
    paddingHorizontal: 35,
    borderRadius: 12,
    width: "100%",
    alignItems: "center",
  },

  textoBotao: {
    color: "#FFFFFF",
    fontSize: 16,
    fontWeight: "bold",
  },

  // Botão de login
  botaoEntrar: {
    backgroundColor: "transparent",
    borderWidth: 2,
    borderColor: "#276749",
    paddingVertical: 16,
    paddingHorizontal: 35,
    borderRadius: 12,
    width: "100%",
    alignItems: "center",
    marginTop: 14,
  },

  textoBotaoEntrar: {
    color: "#276749",
    fontSize: 16,
    fontWeight: "bold",
  },
});
