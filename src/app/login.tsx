
import { router } from "expo-router";
import {
    reload,
    signInWithEmailAndPassword,
    signOut,
} from "firebase/auth";
import { useState } from "react";

import {
    ActivityIndicator,
    Alert,
    Pressable,
    ScrollView,
    StyleSheet,
    Text,
    TextInput,
    View,
} from "react-native";

import { auth } from "../config/firebase";
import { criarPerfilSeNecessario } from "../services/userService";

export default function LoginScreen() {
    const [email, setEmail] = useState("");
    const [senha, setSenha] = useState("");
    const [mostrarSenha, setMostrarSenha] = useState(false);
    const [carregando, setCarregando] = useState(false);

    async function entrar() {
        if (!email.trim() || !senha) {
            Alert.alert(
                "Atenção",
                "Informe seu e-mail e sua senha."
            );
            return;
        }

        setCarregando(true);

        try {
            const credencial = await signInWithEmailAndPassword(
                auth,
                email.trim().toLowerCase(),
                senha
            );

            // Atualiza a situação da verificação do e-mail.
            await reload(credencial.user);

            if (!credencial.user.emailVerified) {
                await signOut(auth);

                Alert.alert(
                    "Verificação pendente",
                    "Confirme seu e-mail pelo link enviado antes de acessar o BioCatalog."
                );
                return;
            }

            // Salva o perfil no Firestore, caso ainda não exista.
            await criarPerfilSeNecessario(credencial.user);

            // O _layout.tsx reconhece a autenticação
            // e libera automaticamente a tela /inicio.
        } catch (erro: unknown) {
            const codigo = (erro as { code?: string }).code;

            let mensagem =
                "Não foi possível entrar. Confira seu e-mail e sua senha.";

            if (codigo === "auth/too-many-requests") {
                mensagem =
                    "Muitas tentativas de login. Aguarde um pouco.";
            } else if (codigo === "auth/network-request-failed") {
                mensagem =
                    "Falha de conexão. Verifique sua internet.";
            } else if (codigo === "permission-denied") {
                mensagem =
                    "Login realizado, mas não foi possível acessar seu perfil. Verifique as permissões do Firestore.";
            }

            Alert.alert("Erro ao entrar", mensagem);
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
            <Text style={styles.icone}>🌿</Text>

            <Text style={styles.titulo}>
                BioCatalog
            </Text>

            <Text style={styles.subtitulo}>
                Entre na sua conta e continue explorando
                a biodiversidade.
            </Text>

            {/* Campo de e-mail */}
            <Text style={styles.label}>E-mail</Text>

            <TextInput
                style={styles.input}
                placeholder="seuemail@exemplo.com"
                placeholderTextColor="#87958B"
                cursorColor="#276749"
                selectionColor="#276749"
                value={email}
                onChangeText={setEmail}
                keyboardType="email-address"
                autoCapitalize="none"
                autoCorrect={false}
                autoComplete="email"
                editable={!carregando}
            />

            // Campo de senha com botão de visualização
            <Text style={styles.label}>Senha</Text>

            <View style={styles.campoSenha}>
                <TextInput
                    style={styles.inputSenha}
                    placeholder="Digite sua senha"
                    placeholderTextColor="#87958B"
                    cursorColor="#276749"
                    selectionColor="#276749"
                    value={senha}
                    onChangeText={setSenha}
                    secureTextEntry={!mostrarSenha}
                    autoCapitalize="none"
                    autoCorrect={false}
                    autoComplete="current-password"
                    editable={!carregando}
                />

                <Pressable
                    style={styles.botaoOlho}
                    onPress={() => setMostrarSenha(!mostrarSenha)}
                    disabled={carregando}
                    accessibilityRole="button"
                    accessibilityLabel={
                        mostrarSenha ? "Ocultar senha" : "Mostrar senha"
                    }
                >
                    <Text style={styles.textoOlho}>
                        {mostrarSenha ? "🙈" : "👁️"}
                    </Text>
                </Pressable>
            </View>

            // Recuperação de senha
            <Pressable
                style={styles.areaEsqueciSenha}
                onPress={() => router.push("/recuperar-senha")}
                disabled={carregando}
                accessibilityRole="button"
            >
                <Text style={styles.esqueciSenha}>
                    Esqueci minha senha
                </Text>
            </Pressable>

            // Botão de login
            <Pressable
                style={[
                    styles.botao,
                    carregando && styles.botaoDesativado,
                ]}
                onPress={entrar}
                disabled={carregando}
                accessibilityRole="button"
            >
                {carregando ? (
                    <ActivityIndicator color="#FFFFFF" />
                ) : (
                    <Text style={styles.textoBotao}>
                        Entrar
                    </Text>
                )}
            </Pressable>

            // Link para cadastro
            <Pressable
                onPress={() => router.push("/cadastro")}
                disabled={carregando}
                accessibilityRole="button"
            >
                <Text style={styles.link}>
                    Ainda não tem uma conta? Cadastre-se
                </Text>
            </Pressable>

            // Voltar
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
        justifyContent: "center",
    },

    icone: {
        fontSize: 60,
        textAlign: "center",
        marginBottom: 12,
    },

    titulo: {
        fontSize: 34,
        fontWeight: "bold",
        color: "#276749",
        textAlign: "center",
    },

    subtitulo: {
        fontSize: 16,
        color: "#64746A",
        textAlign: "center",
        marginTop: 12,
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
        color: "#33443A",
        borderWidth: 1,
        borderColor: "#D5DFD5",
        borderRadius: 12,
        padding: 16,
        fontSize: 16,
        marginBottom: 22,
    },

    campoSenha: {
        backgroundColor: "#FFFFFF",
        borderWidth: 1,
        borderColor: "#D5DFD5",
        borderRadius: 12,
        flexDirection: "row",
        alignItems: "center",
        minHeight: 55,
        marginBottom: 6,
    },

    inputSenha: {
        flex: 1,
        minWidth: 0,
        color: "#33443A",
        fontSize: 16,
        paddingHorizontal: 16,
        paddingVertical: 16,
    },

    botaoOlho: {
        width: 52,
        minHeight: 52,
        alignItems: "center",
        justifyContent: "center",
    },

    textoOlho: {
        fontSize: 21,
        color: "#33443A",
    },

    areaEsqueciSenha: {
        alignSelf: "flex-end",
        paddingVertical: 10,
        marginBottom: 14,
    },

    esqueciSenha: {
        color: "#276749",
        fontSize: 14,
        fontWeight: "600",
    },

    botao: {
        backgroundColor: "#276749",
        borderRadius: 12,
        padding: 17,
        alignItems: "center",
        marginTop: 8,
    },

    botaoDesativado: {
        opacity: 0.6,
    },

    textoBotao: {
        color: "#FFFFFF",
        fontSize: 17,
        fontWeight: "bold",
    },

    link: {
        color: "#276749",
        textAlign: "center",
        fontWeight: "600",
        marginTop: 30,
        fontSize: 15,
    },

    voltar: {
        color: "#64746A",
        textAlign: "center",
        marginTop: 22,
        fontSize: 15,
    },
});
