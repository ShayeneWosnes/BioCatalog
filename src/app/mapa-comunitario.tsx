
import { router, useFocusEffect } from "expo-router";
import { useCallback, useRef, useState } from "react";

import {
    ActivityIndicator,
    Alert,
    Pressable,
    StyleSheet,
    Text,
    View,
} from "react-native";

import MapView, {
    Marker,
    type Region,
} from "react-native-maps";

import {
    listarObservacoesMapa,
    type ObservacaoMapa,
} from "../services/communityMapService";


// REGIÃO INICIAL DO MAPA


const REGIAO_BRASIL: Region = {
    latitude: -14.235,
    longitude: -51.9253,
    latitudeDelta: 35,
    longitudeDelta: 35,
};


// TELA DO MAPA COMUNITÁRIO

export default function MapaComunitarioScreen() {
    const mapaRef = useRef<MapView>(null);

    const [observacoes, setObservacoes] =
        useState<ObservacaoMapa[]>([]);

    const [carregando, setCarregando] = useState(true);

    const [erro, setErro] =
        useState<string | null>(null);

    const [atualizar, setAtualizar] = useState(0);

    const [mapaPronto, setMapaPronto] =
        useState(false);


    // CARREGAR DADOS PÚBLICOS


    useFocusEffect(
        useCallback(() => {
            let ativo = true;

            async function carregarObservacoes() {
                setCarregando(true);
                setErro(null);

                try {
                    const dados =
                        await listarObservacoesMapa();

                    if (ativo) {
                        setObservacoes(dados);
                    }
                } catch (falha) {
                    console.error(
                        "Erro ao carregar mapa comunitário:",
                        falha
                    );

                    if (ativo) {
                        setErro(
                            falha instanceof Error
                                ? falha.message
                                : "Não foi possível carregar o mapa."
                        );
                    }
                } finally {
                    if (ativo) {
                        setCarregando(false);
                    }
                }
            }

            void carregarObservacoes();

            return () => {
                ativo = false;
            };
        }, [atualizar])
    );


    // CENTRALIZAR NOS MARCADORES


    function visualizarTodos() {
        if (!mapaPronto || observacoes.length === 0) {
            return;
        }

        const coordenadas = observacoes.map((item) => ({
            latitude: item.latitude,
            longitude: item.longitude,
        }));

        if (coordenadas.length === 1) {
            mapaRef.current?.animateToRegion(
                {
                    ...coordenadas[0],
                    latitudeDelta: 0.08,
                    longitudeDelta: 0.08,
                },
                500
            );

            return;
        }

        mapaRef.current?.fitToCoordinates(
            coordenadas,
            {
                edgePadding: {
                    top: 65,
                    right: 55,
                    bottom: 65,
                    left: 55,
                },
                animated: true,
            }
        );
    }


    // EXIBIR DETALHES DA OBSERVAÇÃO


    function abrirDetalhes(
        observacao: ObservacaoMapa
    ) {
        const categoria =
            observacao.category === "fauna"
                ? "Fauna"
                : "Flora";

        const nome =
            observacao.scientificName ||
            "Espécie não identificada";

        const descricao =
            observacao.notes ||
            "Sem descrição informada.";

        const tipoLocalizacao =
            observacao.locationMode === "exact"
                ? "Localização exata autorizada"
                : observacao.locationMode === "approximate"
                    ? "Localização aproximada"
                    : observacao.locationMode === "place"
                        ? "Local escolhido pelo usuário"
                        : "Localização generalizada de publicação antiga";

        const local =
            observacao.publicPlaceName
                ? `\nLocal: ${observacao.publicPlaceName}`
                : "";

        Alert.alert(
            "Descoberta da comunidade",
            `${categoria}\n\n` +
            `Nome científico: ${nome}\n\n` +
            `Descrição: ${descricao}\n\n` +
            `Localização: ${tipoLocalizacao}${local}`,
            [{ text: "Fechar" }]
        );
    }


    // CONTADORES


    const quantidadeFauna =
        observacoes.filter(
            (item) => item.category === "fauna"
        ).length;

    const quantidadeFlora =
        observacoes.filter(
            (item) => item.category === "flora"
        ).length;


    // INTERFACE


    return (
        <View style={styles.container}>
            // CABEÇALHO

            <View style={styles.cabecalho}>
                <Pressable
                    onPress={() => router.back()}
                    style={styles.botaoVoltar}
                >
                    <Text style={styles.textoVoltar}>
                        ← Voltar
                    </Text>
                </Pressable>

                <Text style={styles.titulo}>
                    Mapa Comunitário
                </Text>

                <Text style={styles.subtitulo}>
                    Explore descobertas de fauna e flora
                    compartilhadas pela comunidade.
                </Text>
            </View>

            // RESUMO

            <View style={styles.resumo}>
                <View style={styles.resumoItem}>
                    <Text style={styles.resumoNumero}>
                        {observacoes.length}
                    </Text>
                    <Text style={styles.resumoTexto}>
                        Marcadores
                    </Text>
                </View>

                <View style={styles.resumoItem}>
                    <Text style={styles.resumoNumero}>
                        {quantidadeFauna}
                    </Text>
                    <Text style={styles.resumoTexto}>
                        Fauna
                    </Text>
                </View>

                <View style={styles.resumoItem}>
                    <Text style={styles.resumoNumero}>
                        {quantidadeFlora}
                    </Text>
                    <Text style={styles.resumoTexto}>
                        Flora
                    </Text>
                </View>
            </View>

            // ÁREA DO MAPA

            <View style={styles.areaMapa}>
                <MapView
                    ref={mapaRef}
                    style={styles.mapa}
                    initialRegion={REGIAO_BRASIL}
                    onMapReady={() => setMapaPronto(true)}
                    showsCompass
                    showsScale
                    showsUserLocation={false}
                >
                    {observacoes.map((observacao) => (
                        <Marker
                            key={observacao.id}
                            coordinate={{
                                latitude: observacao.latitude,
                                longitude: observacao.longitude,
                            }}
                            title={
                                observacao.category === "fauna"
                                    ? " Fauna"
                                    : " Flora"
                            }
                            description={
                                observacao.scientificName ||
                                "Espécie não identificada"
                            }
                            pinColor={
                                observacao.category === "fauna"
                                    ? "#E8A33D"
                                    : "#276749"
                            }
                            onPress={() =>
                                abrirDetalhes(observacao)
                            }
                        />
                    ))}
                </MapView>

                // CARREGANDO

                {carregando && (
                    <View style={styles.sobreposicao}>
                        <ActivityIndicator
                            size="large"
                            color="#276749"
                        />
                        <Text style={styles.textoEstado}>
                            Carregando observações...
                        </Text>
                    </View>
                )}

                // ERRO

                {!carregando && erro && (
                    <View style={styles.sobreposicao}>
                        <Text style={styles.tituloEstado}>
                            ⚠️ Falha ao carregar
                        </Text>

                        <Text style={styles.textoEstado}>
                            {erro}
                        </Text>

                        <Pressable
                            style={styles.botaoPrincipal}
                            onPress={() =>
                                setAtualizar((valor) => valor + 1)
                            }
                        >
                            <Text style={styles.textoPrincipal}>
                                Tentar novamente
                            </Text>
                        </Pressable>
                    </View>
                )}

                // NENHUMA LOCALIZAÇÃO PÚBLICA

                {!carregando &&
                    !erro &&
                    observacoes.length === 0 && (
                        <View style={styles.avisoVazio}>
                            <Text style={styles.textoVazio}>
                                Ainda não há observações com
                                localização pública para exibir.
                            </Text>
                        </View>
                    )}
            </View>

            {/* CONTROLES */}

            <View style={styles.controles}>
                <Pressable
                    style={styles.botaoPrincipal}
                    onPress={visualizarTodos}
                    disabled={
                        carregando ||
                        !!erro ||
                        !mapaPronto ||
                        observacoes.length === 0
                    }
                >
                    <Text style={styles.textoPrincipal}>
                        Ver todos os marcadores
                    </Text>
                </Pressable>

                <Pressable
                    style={styles.botaoSecundario}
                    onPress={() =>
                        setAtualizar((valor) => valor + 1)
                    }
                    disabled={carregando}
                >
                    <Text style={styles.textoSecundario}>
                        Atualizar mapa
                    </Text>
                </Pressable>
            </View>

            <Text style={styles.rodape}>
                Somente localizações compartilhadas
                aparecem neste mapa. Fotografias
                privadas não são exibidas.
            </Text>
        </View>
    );
}


// ESTILOS


const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: "#F5F8F4",
    },

    cabecalho: {
        paddingHorizontal: 18,
        paddingTop: 20,
        paddingBottom: 12,
    },

    botaoVoltar: {
        alignSelf: "flex-start",
        paddingVertical: 8,
        marginBottom: 8,
    },

    textoVoltar: {
        color: "#276749",
        fontSize: 14,
        fontWeight: "600",
    },

    titulo: {
        color: "#276749",
        fontSize: 23,
        fontWeight: "bold",
    },

    subtitulo: {
        color: "#64746A",
        fontSize: 13,
        lineHeight: 19,
        marginTop: 7,
    },

    resumo: {
        flexDirection: "row",
        marginHorizontal: 18,
        marginBottom: 12,
        paddingVertical: 13,
        backgroundColor: "#FFFFFF",
        borderRadius: 14,
        borderWidth: 1,
        borderColor: "#D5DFD5",
    },

    resumoItem: {
        flex: 1,
        alignItems: "center",
        gap: 4,
    },

    resumoNumero: {
        color: "#276749",
        fontSize: 20,
        fontWeight: "bold",
    },

    resumoTexto: {
        color: "#64746A",
        fontSize: 12,
    },

    areaMapa: {
        flex: 1,
        marginHorizontal: 12,
        borderRadius: 14,
        overflow: "hidden",
        borderWidth: 1,
        borderColor: "#D5DFD5",
        backgroundColor: "#E7F1E9",
    },

    mapa: {
        width: "100%",
        height: "100%",
    },

    sobreposicao: {
        ...StyleSheet.absoluteFill,
        backgroundColor: "#F5F8F4",
        alignItems: "center",
        justifyContent: "center",
        padding: 22,
        gap: 14,
    },

    tituloEstado: {
        color: "#276749",
        fontSize: 18,
        fontWeight: "bold",
        textAlign: "center",
    },

    textoEstado: {
        color: "#64746A",
        fontSize: 14,
        lineHeight: 21,
        textAlign: "center",
    },

    avisoVazio: {
        position: "absolute",
        bottom: 12,
        left: 12,
        right: 12,
        padding: 15,
        borderRadius: 12,
        backgroundColor: "#FFFFFF",
    },

    textoVazio: {
        color: "#64746A",
        fontSize: 13,
        textAlign: "center",
        lineHeight: 20,
    },

    controles: {
        paddingHorizontal: 18,
        paddingTop: 12,
        gap: 8,
    },

    botaoPrincipal: {
        backgroundColor: "#276749",
        borderRadius: 11,
        padding: 13,
        alignItems: "center",
    },

    textoPrincipal: {
        color: "#FFFFFF",
        fontWeight: "bold",
        fontSize: 14,
    },

    botaoSecundario: {
        borderWidth: 1,
        borderColor: "#276749",
        borderRadius: 11,
        padding: 11,
        alignItems: "center",
    },

    textoSecundario: {
        color: "#276749",
        fontWeight: "600",
        fontSize: 14,
    },

    rodape: {
        paddingHorizontal: 20,
        paddingTop: 9,
        paddingBottom: 14,
        color: "#64746A",
        fontSize: 11,
        textAlign: "center",
        lineHeight: 17,
    },
});
