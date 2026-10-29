
import { router } from "expo-router";
import { sendPasswordResetEmail } from "firebase/auth";
import { useState } from "react";
import {
    ActivityIndicator,
    Alert,
    KeyboardAvoidingView,
    Platform,
    Pressable,
    StyleSheet,
    Text,
    TextInput,
    View,
} from "react-native";

import { auth } from "../config/firebase";

export default function RecuperarSenhaScreen() {
    const [email, setEmail] = useState("");
    const [carregando, setCarregando] = useState(false);

    async function recuperarSenha() {
        const emailFormatado = email.trim().toLowerCase();

        if (!emailFormatado) {
            Alert.alert("Atenção", "Informe seu e-mail.");
            return;
        }

        if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(emailFormatado)) {
            Alert.alert("Atenção", "Informe um e-mail válido.");
            return;
        }

        setCarregando(true);

        try {
            await sendPasswordResetEmail(auth, emailFormatado);

            Alert.alert(
                "Solicitação recebida",
                "Se existir uma conta com esse e-mail, você receberá um link para redefinir sua senha. Verifique também a caixa de spam.",
                [
                    {
                        text: "Entendi",
                        onPress: () => router.back(),
                    },
                ]
            );
        } catch (erro: unknown) {
            const codigo = (erro as { code?: string }).code;

            if (codigo === "auth/network-request-failed") {
                Alert.alert(
                    "Erro de conexão",
                    "Verifique sua internet e tente novamente."
                );
            } else if (codigo === "auth/too-many-requests") {
                Alert.alert(
                    "Aguarde",
                    "Muitas solicitações. Tente novamente mais tarde."
                );
            } else {
                Alert.alert(
                    "Não foi possível enviar",
                    "Tente novamente em alguns instantes."
                );
            }
        } finally {
            setCarregando(false);
        }
    }

    return (
        <KeyboardAvoidingView
            style={styles.container}
            behavior={Platform.OS === "ios" ? "padding" : undefined}
        >
            <View style={styles.conteudo}>
                <Text style={styles.icone}>🔐</Text>

                <Text style={styles.titulo}>
                    Recuperar senha
                </Text>

                <Text style={styles.subtitulo}>
                    Informe o e-mail cadastrado no BioCatalog.
                    Enviaremos um link para você criar uma nova senha.
                </Text>

                <Text style={styles.label}>E-mail</Text>

                <TextInput
                    style={styles.input}
                    placeholder="seuemail@exemplo.com"
                    value={email}
                    onChangeText={setEmail}
                    keyboardType="email-address"
                    autoCapitalize="none"
                    autoComplete="email"
                    editable={!carregando}
                />

                <Pressable
                    style={styles.botao}
                    onPress={recuperarSenha}
                    disabled={carregando}
                >
                    {carregando ? (
                        <ActivityIndicator color="#FFFFFF" />
                    ) : (
                        <Text style={styles.textoBotao}>
                            Enviar link de recuperação
                        </Text>
                    )}
                </Pressable>

                <Pressable onPress={() => router.back()}>
                    <Text style={styles.voltar}>
                        Voltar para o login
                    </Text>
                </Pressable>
            </View>
        </KeyboardAvoidingView>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: "#F5F8F4",
    },
    conteudo: {
        flex: 1,
        justifyContent: "center",
        padding: 24,
    },
    icone: {
        fontSize: 60,
        textAlign: "center",
        marginBottom: 20,
    },
    titulo: {
        fontSize: 32,
        fontWeight: "bold",
        color: "#276749",
        textAlign: "center",
    },
    subtitulo: {
        fontSize: 16,
        color: "#64746A",
        textAlign: "center",
        marginTop: 15,
        marginBottom: 40,
        lineHeight: 24,
    },
    label: {
        fontSize: 15,
        fontWeight: "600",
        color: "#33443A",
        marginBottom: 8,
    },
    input: {
        backgroundColor: "#FFFFFF",
        borderWidth: 1,
        borderColor: "#D5DFD5",
        borderRadius: 12,
        padding: 16,
        fontSize: 16,
        marginBottom: 24,
    },
    botao: {
        backgroundColor: "#276749",
        borderRadius: 12,
        padding: 17,
        alignItems: "center",
    },
    textoBotao: {
        color: "#FFFFFF",
        fontSize: 16,
        fontWeight: "bold",
    },
    voltar: {
        color: "#276749",
        textAlign: "center",
        marginTop: 25,
        fontSize: 15,
        fontWeight: "600",
    },
});
