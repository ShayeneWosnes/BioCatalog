
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
    View,
} from "react-native";

import { auth } from "../config/firebase";

export default function InicioScreen() {
    const [saindo, setSaindo] = useState(false);

    const usuario = auth.currentUser;

    // ==========================================
    // LOGOUT
    // ==========================================

    async function sairDaConta() {
        if (saindo) return;

        setSaindo(true);

        try {
            await signOut(auth);

            // O _layout.tsx identifica o logout
            // e bloqueia as telas protegidas.
        } catch (erro) {
            console.error("Erro ao sair:", erro);

            Alert.alert(
                "Erro ao sair",
                "Não foi possível encerrar sua sessão."
            );
        } finally {
            setSaindo(false);
        }
    }

    // ==========================================
    // AGUARDAR USUÁRIO AUTENTICADO
    // ==========================================

    if (!usuario || !usuario.emailVerified) {
        return (
            <View style={styles.carregamento}>
                <ActivityIndicator
                    size="large"
                    color="#276749"
                />
            </View>
        );
    }

    // ==========================================
    // INTERFACE
    // ==========================================

    return (
        <ScrollView
            style={styles.container}
            contentContainerStyle={styles.conteudo}
        >
            {/* ÍCONE */}

            <Text style={styles.icone}>
                🌿
            </Text>

            {/* BOAS-VINDAS */}

            <Text style={styles.titulo}>
                Bem-vindo ao BioCatalog!
            </Text>

            <Text style={styles.subtitulo}>
                Olá, {usuario.displayName || "explorador"}!
            </Text>

            <Text style={styles.descricao}>
                Seu espaço para descobrir, registrar e
                compartilhar a biodiversidade.
            </Text>

            {/* CARD DE BOAS-VINDAS */}

            <View style={styles.card}>
                <Text style={styles.cardTitulo}>
                    🐝 Suas descobertas começam aqui!
                </Text>

                <Text style={styles.cardTexto}>
                    Registre animais e plantas, acompanhe
                    suas descobertas e explore a
                    biodiversidade ao seu redor.
                </Text>
            </View>

            {/* NOVA OBSERVAÇÃO */}

            <Pressable
                style={styles.botaoNova}
                onPress={() =>
                    router.push("/nova-observacao")
                }
            >
                <Text style={styles.textoBotaoNova}>
                    📷 Registrar nova observação
                </Text>
            </Pressable>

            {/* MINHAS OBSERVAÇÕES */}

            <Pressable
                style={styles.botaoMinhas}
                onPress={() =>
                    router.push("/minhas-observacoes")
                }
            >
                <Text style={styles.textoBotaoMinhas}>
                    🌿 Minhas observações
                </Text>
            </Pressable>

            {/* ======================================
          EXPLORAR COMUNIDADE — NOVO BOTÃO
          ====================================== */}

            <Pressable
                style={styles.botaoExplorar}
                onPress={() =>
                    router.push("/explore")
                }
            >
                <Text style={styles.textoBotaoExplorar}>
                    🌎 Explorar comunidade
                </Text>

                <Text style={styles.textoDescricaoExplorar}>
                    Descubra animais e plantas
                    registrados por outros usuários.
                </Text>
            </Pressable>

            {/* SAIR DA CONTA */}

            <Pressable
                style={[
                    styles.botaoSair,
                    saindo && styles.botaoDesativado,
                ]}
                onPress={sairDaConta}
                disabled={saindo}
            >
                {saindo ? (
                    <ActivityIndicator color="#276749" />
                ) : (
                    <Text style={styles.textoBotaoSair}>
                        Sair da minha conta
                    </Text>
                )}
            </Pressable>
        </ScrollView>
    );
}

// ==========================================
// ESTILOS
// ==========================================

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: "#F5F8F4",
    },

    conteudo: {
        flexGrow: 1,
        justifyContent: "center",
        alignItems: "center",
        padding: 24,
        paddingVertical: 40,
    },

    carregamento: {
        flex: 1,
        backgroundColor: "#F5F8F4",
        justifyContent: "center",
        alignItems: "center",
    },

    icone: {
        fontSize: 65,
        marginBottom: 18,
    },

    titulo: {
        fontSize: 28,
        fontWeight: "bold",
        color: "#276749",
        textAlign: "center",
    },

    subtitulo: {
        fontSize: 20,
        color: "#33443A",
        marginTop: 18,
        textAlign: "center",
    },

    descricao: {
        fontSize: 15,
        color: "#64746A",
        textAlign: "center",
        lineHeight: 24,
        marginTop: 12,
        marginBottom: 28,
    },

    // ==========================================
    // CARD DE BOAS-VINDAS
    // ==========================================

    card: {
        width: "100%",
        backgroundColor: "#FFFFFF",
        borderRadius: 16,
        borderWidth: 1,
        borderColor: "#D5DFD5",
        padding: 24,
        marginBottom: 24,
    },

    cardTitulo: {
        fontSize: 18,
        fontWeight: "bold",
        color: "#276749",
        marginBottom: 12,
    },

    cardTexto: {
        fontSize: 15,
        color: "#64746A",
        lineHeight: 23,
    },

    // ==========================================
    // BOTÃO NOVA OBSERVAÇÃO
    // ==========================================

    botaoNova: {
        backgroundColor: "#276749",
        paddingVertical: 17,
        paddingHorizontal: 16,
        borderRadius: 12,
        width: "100%",
        alignItems: "center",
        marginBottom: 16,
    },

    textoBotaoNova: {
        color: "#FFFFFF",
        fontSize: 16,
        fontWeight: "bold",
        textAlign: "center",
    },

    // ==========================================
    // BOTÃO MINHAS OBSERVAÇÕES
    // ==========================================

    botaoMinhas: {
        backgroundColor: "#E0F0E5",
        borderWidth: 1,
        borderColor: "#276749",
        borderRadius: 12,
        paddingVertical: 17,
        paddingHorizontal: 16,
        width: "100%",
        alignItems: "center",
        marginBottom: 16,
    },

    textoBotaoMinhas: {
        color: "#276749",
        fontSize: 16,
        fontWeight: "bold",
        textAlign: "center",
    },

    // ==========================================
    // BOTÃO EXPLORAR COMUNIDADE
    // ==========================================

    botaoExplorar: {
        backgroundColor: "#FFFFFF",
        borderWidth: 1,
        borderColor: "#276749",
        borderRadius: 12,
        paddingVertical: 17,
        paddingHorizontal: 16,
        width: "100%",
        alignItems: "center",
        marginBottom: 25,
    },

    textoBotaoExplorar: {
        color: "#276749",
        fontSize: 16,
        fontWeight: "bold",
        textAlign: "center",
    },

    textoDescricaoExplorar: {
        color: "#64746A",
        fontSize: 12,
        lineHeight: 19,
        textAlign: "center",
        marginTop: 8,
    },

    // ==========================================
    // BOTÃO LOGOUT
    // ==========================================

    botaoSair: {
        backgroundColor: "#FFFFFF",
        borderWidth: 1,
        borderColor: "#276749",
        borderRadius: 12,
        paddingVertical: 17,
        width: "100%",
        alignItems: "center",
    },

    textoBotaoSair: {
        color: "#276749",
        fontSize: 16,
        fontWeight: "bold",
    },

    botaoDesativado: {
        opacity: 0.6,
    },
});
