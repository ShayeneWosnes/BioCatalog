
import { useEffect, useState } from "react";

import {
    ActivityIndicator,
    Image,
    StyleSheet,
    Text,
    View,
} from "react-native";

import {
    obterUrlFotoPrivada,
} from "../services/supabasePhotoService";

interface ObservacaoFotoProps {
    caminhoFoto: string;
}

export default function ObservacaoFoto({
    caminhoFoto,
}: ObservacaoFotoProps) {
    const [urlFoto, setUrlFoto] =
        useState<string | null>(null);

    const [carregando, setCarregando] =
        useState(true);

    const [erro, setErro] =
        useState(false);

    useEffect(() => {
        let ativo = true;

        async function carregarFoto() {
            setCarregando(true);
            setErro(false);
            setUrlFoto(null);

            try {
                const url =
                    await obterUrlFotoPrivada(caminhoFoto);

                if (ativo) {
                    setUrlFoto(url);
                }
            } catch (falha) {
                console.error(
                    "Erro ao carregar fotografia:",
                    falha instanceof Error
                        ? falha.message
                        : "Erro desconhecido"
                );

                if (ativo) {
                    setErro(true);
                }
            } finally {
                if (ativo) {
                    setCarregando(false);
                }
            }
        }

        void carregarFoto();

        return () => {
            ativo = false;
        };
    }, [caminhoFoto]);

    return (
        <View style={styles.container}>
            {carregando ? (
                <View style={styles.estado}>
                    <ActivityIndicator
                        size="small"
                        color="#276749"
                    />

                    <Text style={styles.texto}>
                        Carregando fotografia...
                    </Text>
                </View>
            ) : erro || !urlFoto ? (
                <View style={styles.estado}>
                    <Text style={styles.icone}>
                        📷
                    </Text>

                    <Text style={styles.texto}>
                        Fotografia indisponível
                    </Text>
                </View>
            ) : (
                <Image
                    source={{ uri: urlFoto }}
                    style={styles.imagem}
                    resizeMode="cover"
                    onError={() => setErro(true)}
                />
            )}
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        width: "100%",
        height: 220,
        borderRadius: 12,
        overflow: "hidden",
        backgroundColor: "#EDF3EE",
        marginBottom: 14,
    },

    imagem: {
        width: "100%",
        height: "100%",
    },

    estado: {
        flex: 1,
        justifyContent: "center",
        alignItems: "center",
        gap: 10,
    },

    icone: {
        fontSize: 30,
    },

    texto: {
        color: "#64746A",
        fontSize: 13,
        textAlign: "center",
    },
});
