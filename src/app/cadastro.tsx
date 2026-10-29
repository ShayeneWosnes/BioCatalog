
import { router } from "expo-router";
import { signOut } from "firebase/auth";
import { useState } from "react";
import {
    ActivityIndicator,
    Alert,
    Pressable,
    ScrollView,
    StyleSheet,
    Text,
    TextInput
} from "react-native";

import { auth } from "../config/firebase";
import { cadastrarUsuario } from "../services/authService";

export default function CadastroScreen() {
    const [nome, setNome] = useState("");
    const [email, setEmail] = useState("");
    const [senha, setSenha] = useState("");
    const [confirmarSenha, setConfirmarSenha] = useState("");
    const [carregando, setCarregando] = useState(false);

    async function cadastrar() {
        if (!nome.trim() || !email.trim() || !senha) {
            Alert.alert("Atenção", "Preencha todos os campos.");
            return;
        }

        if (senha.length < 6) {
            Alert.alert("Atenção", "A senha deve ter pelo menos 6 caracteres.");
            return;
        }

        if (senha !== confirmarSenha) {
            Alert.alert("Atenção", "As senhas não coincidem.");
            return;
        }

        setCarregando(true);

        try {
            await cadastrarUsuario(
                nome,
                email.trim().toLowerCase(),
                senha
            );

            // O Firebase autentica automaticamente após criar a conta.
            // Encerramos a sessão até a verificação do e-mail.
            await signOut(auth);

            Alert.alert(
                "Cadastro realizado!",
                "Enviamos um link de verificação para seu e-mail. Verifique sua conta antes de entrar.",
                [{ text: "OK", onPress: () => router.replace("/") }]
            );
        } catch (erro: unknown) {
            const codigo = (erro as { code?: string }).code;

            let mensagem = "Não foi possível concluir o cadastro.";

            if (codigo === "auth/email-already-in-use") {
                mensagem = "Este e-mail já está cadastrado.";
            } else if (codigo === "auth/invalid-email") {
                mensagem = "Informe um e-mail válido.";
            } else if (codigo === "auth/weak-password") {
                mensagem = "Escolha uma senha mais forte.";
            }

            Alert.alert("Atenção", mensagem);
        } finally {
            setCarregando(false);
        }
    }

    return (
        <ScrollView
            style={styles.container}
            contentContainerStyle={styles.conteudo}
            keyboardShouldPersistTaps="handled"
        >
            <Text style={styles.titulo}>BioCatalog</Text>
            <Text style={styles.subtitulo}>
                Crie sua conta e comece a explorar a biodiversidade.
            </Text>

            <Text style={styles.label}>Nome completo</Text>
            <TextInput
                style={styles.input}
                placeholder="Seu nome completo"
                value={nome}
                onChangeText={setNome}
                autoComplete="name"
            />

            <Text style={styles.label}>E-mail</Text>
            <TextInput
                style={styles.input}
                placeholder="seuemail@exemplo.com"
                value={email}
                onChangeText={setEmail}
                keyboardType="email-address"
                autoCapitalize="none"
                autoComplete="email"
            />

            <Text style={styles.label}>Senha</Text>
            <TextInput
                style={styles.input}
                placeholder="Mínimo de 6 caracteres"
                value={senha}
                onChangeText={setSenha}
                secureTextEntry
                autoComplete="new-password"
            />

            <Text style={styles.label}>Confirmar senha</Text>
            <TextInput
                style={styles.input}
                placeholder="Digite a senha novamente"
                value={confirmarSenha}
                onChangeText={setConfirmarSenha}
                secureTextEntry
                autoComplete="new-password"
            />

            <Pressable
                style={styles.botao}
                onPress={cadastrar}
                disabled={carregando}
            >
                {carregando ? (
                    <ActivityIndicator color="#fff" />
                ) : (
                    <Text style={styles.textoBotao}>
                        Criar minha conta
                    </Text>
                )}
            </Pressable>

            <Pressable onPress={() => router.back()}>
                <Text style={styles.voltar}>
                    Voltar
                </Text>
            </Pressable>
        </ScrollView>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: "#F5F8F4",
    },
    conteudo: {
        flexGrow: 1,
        padding: 24,
        paddingTop: 65,
    },
    titulo: {
        fontSize: 34,
        fontWeight: "bold",
        color: "#276749",
        textAlign: "center",
    },
    subtitulo: {
        fontSize: 15,
        color: "#64746A",
        textAlign: "center",
        marginTop: 10,
        marginBottom: 32,
    },
    label: {
        fontSize: 14,
        fontWeight: "600",
        color: "#33443A",
        marginBottom: 7,
    },
    input: {
        borderWidth: 1,
        borderColor: "#D5DFD5",
        backgroundColor: "#FFFFFF",
        borderRadius: 10,
        padding: 14,
        marginBottom: 18,
        fontSize: 15,
    },
    botao: {
        backgroundColor: "#276749",
        borderRadius: 12,
        padding: 16,
        alignItems: "center",
        marginTop: 12,
    },
    textoBotao: {
        color: "#FFFFFF",
        fontSize: 16,
        fontWeight: "bold",
    },
    voltar: {
        marginTop: 24,
        textAlign: "center",
        color: "#276749",
        fontWeight: "600",
    },
});
