import * as ImagePicker from "expo-image-picker";
import { router } from "expo-router";
import { useEffect, useRef, useState } from "react";
import {
    ActivityIndicator,
    Alert,
    Image,
    Pressable,
    ScrollView,
    StyleSheet,
    Text,
    TextInput,
    View,
} from "react-native";
import type {
    CategoriaObservacao,
} from "../models/observation";
import {
    buscarSugestoesGBIF,
    consultarNomeCientifico,
    type ResultadoConsultaGBIF,
} from "../services/gbifService";
import {
    obterLocalizacaoAtual,
    type CoordenadasObservacao,
} from "../services/locationService";
import {
    criarObservacao,
} from "../services/observationService";
interface SugestaoGBIF {
    key: number;
    canonicalName: string;
    scientificName?: string;
    kingdom?: string;
}
export default function NovaObservacaoScreen() {
    // ==========================================
    // ESTADOS DO FORMULÁRIO
    // ==========================================
    const [categoria, setCategoria] =
        useState<CategoriaObservacao>("fauna");
    const [fotoUri, setFotoUri] =
        useState<string | null>(null);
    const [descricao, setDescricao] = useState("");
    const [carregandoFoto, setCarregandoFoto] =
        useState(false);
    const [localizacao, setLocalizacao] =
        useState<CoordenadasObservacao | null>(null);
    const [carregandoGPS, setCarregandoGPS] =
        useState(false);
    const [nomeCientifico, setNomeCientifico] =
        useState("");
    const [resultadoGBIF, setResultadoGBIF] =
        useState<ResultadoConsultaGBIF | null>(null);
    // Sugestões exibidas enquanto o usuário digita.
    const [sugestoesGBIF, setSugestoesGBIF] =
        useState<SugestaoGBIF[]>([]);
    const [buscandoSugestoes, setBuscandoSugestoes] =
        useState(false);
    const [mostrarSugestoes, setMostrarSugestoes] =
        useState(false);
    const [erroSugestoes, setErroSugestoes] =
        useState<string | null>(null);
    // Evita refazer a busca quando o usuário escolhe um nome.
    const ignorarProximaBusca = useRef(false);
    const [consultandoGBIF, setConsultandoGBIF] =
        useState(false);
    const [salvando, setSalvando] =
        useState(false);
    const dataObservacao =
        new Date().toLocaleDateString("pt-BR");
    // ==========================================
    // SUGESTÕES AUTOMÁTICAS DO GBIF
    // ==========================================
    useEffect(() => {
        // Ao selecionar uma sugestão, o campo é atualizado,
        // mas não precisamos pesquisar o mesmo nome novamente.
        if (ignorarProximaBusca.current) {
            ignorarProximaBusca.current = false;
            setBuscandoSugestoes(false);
            return;
        }
        const termo = nomeCientifico.trim();
        if (termo.length < 3) {
            setSugestoesGBIF([]);
            setBuscandoSugestoes(false);
            setErroSugestoes(null);
            return;
        }
        let ativo = true;
        setBuscandoSugestoes(true);
        setErroSugestoes(null);
        // Espera o usuário terminar de digitar antes da consulta.
        const temporizador = setTimeout(async () => {
            try {
                const resultado = await buscarSugestoesGBIF(
                    termo,
                    categoria
                );
                if (ativo) {
                    setSugestoesGBIF(resultado.slice(0, 8));
                }
            } catch (erro) {
                if (ativo) {
                    console.error("Erro nas sugestões GBIF:", erro);
                    setSugestoesGBIF([]);
                    setErroSugestoes("Não foi possível carregar sugestões.");
                }
            } finally {
                if (ativo) {
                    setBuscandoSugestoes(false);
                }
            }
        }, 550);
        // Evita exibir resultados antigos se o usuário
        // continuar digitando ou trocar a categoria.
        return () => {
            ativo = false;
            clearTimeout(temporizador);
        };
    }, [nomeCientifico, categoria]);
    function selecionarSugestao(sugestao: SugestaoGBIF) {
        if (consultandoGBIF) return;
        ignorarProximaBusca.current =
            sugestao.canonicalName !== nomeCientifico;
        setNomeCientifico(sugestao.canonicalName);
        setSugestoesGBIF([]);
        setMostrarSugestoes(false);
        setErroSugestoes(null);
        // Valida automaticamente o nome escolhido.
        void buscarNomeCientifico(sugestao.canonicalName);
    }
    // ==========================================
    // ALTERAR CATEGORIA
    // ==========================================
    function alterarCategoria(
        novaCategoria: CategoriaObservacao
    ) {
        if (consultandoGBIF) return;
        setCategoria(novaCategoria);
        setResultadoGBIF(null);
        setSugestoesGBIF([]);
        setErroSugestoes(null);
        setMostrarSugestoes(true);
    }
    // ==========================================
    // CÂMERA
    // ==========================================
    async function tirarFoto() {
        if (carregandoFoto) return;
        setCarregandoFoto(true);
        try {
            const permissao =
                await ImagePicker.requestCameraPermissionsAsync();
            if (!permissao.granted) {
                Alert.alert(
                    "Permissão necessária",
                    "Autorize o uso da câmera para fotografar sua descoberta."
                );
                return;
            }
            const resultado =
                await ImagePicker.launchCameraAsync({
                    mediaTypes: ["images"],
                    allowsEditing: false,
                    quality: 0.8,
                    exif: false,
                });
            if (
                !resultado.canceled &&
                resultado.assets.length > 0
            ) {
                setFotoUri(resultado.assets[0].uri);
            }
        } catch (erro) {
            console.error("Erro ao abrir câmera:", erro);
            Alert.alert(
                "Erro",
                "Não foi possível abrir a câmera."
            );
        } finally {
            setCarregandoFoto(false);
        }
    }
    // ==========================================
    // GALERIA
    // ==========================================
    async function selecionarGaleria() {
        if (carregandoFoto) return;
        setCarregandoFoto(true);
        try {
            const resultado =
                await ImagePicker.launchImageLibraryAsync({
                    mediaTypes: ["images"],
                    allowsEditing: false,
                    quality: 0.8,
                    exif: false,
                });
            if (
                !resultado.canceled &&
                resultado.assets.length > 0
            ) {
                setFotoUri(resultado.assets[0].uri);
            }
        } catch (erro) {
            console.error("Erro ao abrir galeria:", erro);
            Alert.alert(
                "Erro",
                "Não foi possível selecionar a imagem."
            );
        } finally {
            setCarregandoFoto(false);
        }
    }
    // ==========================================
    // LOCALIZAÇÃO GPS
    // ==========================================
    async function buscarLocalizacao() {
        if (carregandoGPS) return;
        setCarregandoGPS(true);
        try {
            const coordenadas =
                await obterLocalizacaoAtual();
            setLocalizacao(coordenadas);
        } catch (erro) {
            console.error(
                "Erro ao obter localização:",
                erro
            );
            const mensagem =
                erro instanceof Error
                    ? erro.message
                    : "Não foi possível obter a localização.";
            Alert.alert(
                "Localização indisponível",
                mensagem
            );
        } finally {
            setCarregandoGPS(false);
        }
    }
    // ==========================================
    // CONSULTA GBIF
    // ==========================================
    async function buscarNomeCientifico(nomeEscolhido?: string) {
        if (consultandoGBIF) return;
        const nomeDaConsulta = nomeEscolhido ?? nomeCientifico;
        if (nomeDaConsulta.trim().length < 3) {
            Alert.alert(
                "Nome científico",
                "Informe pelo menos 3 caracteres para pesquisar."
            );
            return;
        }
        setConsultandoGBIF(true);
        setMostrarSugestoes(false);
        setResultadoGBIF(null);
        try {
            const resultado =
                await consultarNomeCientifico(
                    nomeDaConsulta,
                    categoria
                );
            setResultadoGBIF(resultado);
        } catch (erro) {
            console.error(
                "Erro ao consultar GBIF:",
                erro
            );
            const mensagem =
                erro instanceof Error
                    ? erro.message
                    : "Não foi possível consultar o GBIF.";
            Alert.alert(
                "Erro na consulta",
                mensagem
            );
        } finally {
            setConsultandoGBIF(false);
        }
    }
    // ==========================================
    // SALVAR OBSERVAÇÃO NO FIRESTORE
    // ==========================================
    async function salvarDadosObservacao() {
        if (salvando) return;
        setSalvando(true);
        try {
            const idObservacao =
                await criarObservacao({
                    category: categoria,
                    notes: descricao,
                    location: localizacao,
                    gbifResult: resultadoGBIF,
                });
            Alert.alert(
                "Observação salva!",
                "Os dados da sua descoberta foram armazenados no Firestore.\n\n" +
                "A fotografia ainda não foi enviada.\n\n" +
                `ID: ${idObservacao}`,
                [
                    {
                        text: "Continuar",
                        onPress: () =>
                            router.replace("/inicio"),
                    },
                ]
            );
        } catch (erro) {
            console.error(
                "Erro ao salvar observação:",
                erro
            );
            const mensagem =
                erro instanceof Error
                    ? erro.message
                    : "Não foi possível salvar a observação.";
            Alert.alert(
                "Erro ao salvar",
                mensagem
            );
        } finally {
            setSalvando(false);
        }
    }
    // ==========================================
    // CONFIRMAR SALVAMENTO
    // ==========================================
    function confirmarSalvamento() {
        if (salvando) return;
        Alert.alert(
            "Salvar observação?",
            "Os dados serão salvos no Firestore, mas a fotografia selecionada não será armazenada nesta etapa.\n\nDeseja continuar?",
            [
                {
                    text: "Cancelar",
                    style: "cancel",
                },
                {
                    text: "Salvar dados",
                    onPress: () => {
                        void salvarDadosObservacao();
                    },
                },
            ]
        );
    }
    // ==========================================
    // INTERFACE
    // ==========================================
    return (
        <ScrollView
            style={styles.container}
            contentContainerStyle={styles.conteudo}
            keyboardShouldPersistTaps="handled"
        >
            {/* VOLTAR */}
            <Pressable
                style={styles.botaoVoltar}
                onPress={() => router.back()}
            >
                <Text style={styles.textoVoltar}>
                    ← Voltar
                </Text>
            </Pressable>
            {/* CABEÇALHO */}
            <Text style={styles.titulo}>
                Nova observação
            </Text>
            <Text style={styles.subtitulo}>
                Registre uma descoberta da biodiversidade.
            </Text>
            {/* CATEGORIA */}
            <Text style={styles.label}>
                O que você encontrou?
            </Text>
            <View style={styles.linha}>
                <Pressable
                    style={[
                        styles.categoria,
                        categoria === "fauna" &&
                        styles.categoriaAtiva,
                        consultandoGBIF &&
                        styles.botaoDesativado,
                    ]}
                    onPress={() =>
                        alterarCategoria("fauna")
                    }
                    disabled={consultandoGBIF}
                >
                    <Text
                        style={[
                            styles.textoCategoria,
                            categoria === "fauna" &&
                            styles.textoAtivo,
                        ]}
                    >
                        🐝 Fauna
                    </Text>
                </Pressable>
                <Pressable
                    style={[
                        styles.categoria,
                        categoria === "flora" &&
                        styles.categoriaAtiva,
                        consultandoGBIF &&
                        styles.botaoDesativado,
                    ]}
                    onPress={() =>
                        alterarCategoria("flora")
                    }
                    disabled={consultandoGBIF}
                >
                    <Text
                        style={[
                            styles.textoCategoria,
                            categoria === "flora" &&
                            styles.textoAtivo,
                        ]}
                    >
                        🌿 Flora
                    </Text>
                </Pressable>
            </View>
            {/* FOTOGRAFIA */}
            <Text style={styles.label}>
                Fotografia
            </Text>
            {fotoUri ? (
                <View style={styles.areaFoto}>
                    <Image
                        source={{ uri: fotoUri }}
                        style={styles.imagem}
                        resizeMode="cover"
                    />
                    <Pressable
                        style={styles.removerFoto}
                        onPress={() => setFotoUri(null)}
                    >
                        <Text style={styles.textoRemover}>
                            Remover fotografia
                        </Text>
                    </Pressable>
                </View>
            ) : (
                <View style={styles.fotoVazia}>
                    <Text style={styles.iconeFoto}>
                        📷
                    </Text>
                    <Text style={styles.textoAuxiliar}>
                        Nenhuma fotografia selecionada
                    </Text>
                </View>
            )}
            <View style={styles.linha}>
                <Pressable
                    style={[
                        styles.botaoSecundario,
                        carregandoFoto &&
                        styles.botaoDesativado,
                    ]}
                    onPress={tirarFoto}
                    disabled={carregandoFoto}
                >
                    <Text style={styles.textoSecundario}>
                        Tirar foto
                    </Text>
                </Pressable>
                <Pressable
                    style={[
                        styles.botaoSecundario,
                        carregandoFoto &&
                        styles.botaoDesativado,
                    ]}
                    onPress={selecionarGaleria}
                    disabled={carregandoFoto}
                >
                    <Text style={styles.textoSecundario}>
                        Galeria
                    </Text>
                </Pressable>
            </View>
            {carregandoFoto && (
                <ActivityIndicator
                    size="small"
                    color="#276749"
                    style={styles.indicador}
                />
            )}
            {/* DATA */}
            <Text style={styles.label}>
                Data da observação
            </Text>
            <View style={styles.campoInformativo}>
                <Text style={styles.textoCampo}>
                    {dataObservacao}
                </Text>
            </View>
            {/* NOME CIENTÍFICO */}
            <Text style={styles.label}>
                Nome científico (opcional)
            </Text>
            <TextInput
                style={styles.campoNome}
                placeholder="Ex.: Apis mellifera"
                placeholderTextColor="#87958B"
                value={nomeCientifico}
                onChangeText={(texto) => {
                    setNomeCientifico(texto);
                    setResultadoGBIF(null);
                    setSugestoesGBIF([]);
                    setErroSugestoes(null);
                    setMostrarSugestoes(true);
                }}
                editable={!consultandoGBIF}
                autoCapitalize="none"
                autoCorrect={false}
                maxLength={150}
            />
            {/* SUGESTÕES DO GBIF */}
            {mostrarSugestoes && nomeCientifico.trim().length >= 3 && (
                <View style={styles.caixaSugestoes}>
                    {buscandoSugestoes ? (
                        <View style={styles.linhaCarregamento}>
                            <ActivityIndicator size="small" color="#276749" />
                            <Text style={styles.textoSugestoes}>
                                Buscando espécies no GBIF...
                            </Text>
                        </View>
                    ) : erroSugestoes ? (
                        <Text style={styles.textoSugestoes}>
                            {erroSugestoes} Você ainda pode consultar manualmente.
                        </Text>
                    ) : sugestoesGBIF.length > 0 ? (
                        <>
                            <Text style={styles.tituloSugestoes}>
                                Selecione uma espécie sugerida:
                            </Text>
                            {sugestoesGBIF.map((sugestao) => (
                                <Pressable
                                    key={sugestao.key}
                                    style={styles.itemSugestao}
                                    onPress={() => selecionarSugestao(sugestao)}
                                    disabled={consultandoGBIF}
                                    accessibilityRole="button"
                                >
                                    <Text style={styles.nomeSugestao}>
                                        {sugestao.canonicalName}
                                    </Text>
                                    <Text style={styles.textoSelecionar}>
                                        Selecionar ›
                                    </Text>
                                </Pressable>
                            ))}
                        </>
                    ) : (
                        <Text style={styles.textoSugestoes}>
                            Nenhuma espécie sugerida. Confira a grafia ou tente
                            escrever mais letras.
                        </Text>
                    )}
                </View>
            )}
            {/* BOTÃO GBIF */}
            <Pressable
                style={[
                    styles.botaoConsulta,
                    consultandoGBIF &&
                    styles.botaoDesativado,
                ]}
                onPress={() => void buscarNomeCientifico()}
                disabled={consultandoGBIF}
            >
                {consultandoGBIF ? (
                    <View style={styles.linhaCarregamento}>
                        <ActivityIndicator
                            size="small"
                            color="#276749"
                        />
                        <Text style={styles.textoConsulta}>
                            Consultando GBIF...
                        </Text>
                    </View>
                ) : (
                    <Text style={styles.textoConsulta}>
                        🔎 Consultar no GBIF
                    </Text>
                )}
            </Pressable>
            {/* RESULTADO GBIF */}
            {resultadoGBIF && (
                <View style={styles.resultadoGBIF}>
                    {resultadoGBIF.encontrado ? (
                        <>
                            <Text style={styles.resultadoTitulo}>
                                🌿 Correspondência encontrada
                            </Text>
                            <Text style={styles.textoCampo}>
                                Nome científico:{" "}
                                {resultadoGBIF.nomeCientifico}
                            </Text>
                            {resultadoGBIF.nomeCanonico && (
                                <Text style={styles.textoCampo}>
                                    Nome canônico:{" "}
                                    {resultadoGBIF.nomeCanonico}
                                </Text>
                            )}
                            <Text style={styles.textoCampo}>
                                Classificação:{" "}
                                {resultadoGBIF.classificacao ||
                                    "Não informada"}
                            </Text>
                            <Text style={styles.textoCampo}>
                                Situação taxonômica:{" "}
                                {resultadoGBIF.statusTaxonomico ||
                                    "Não informada"}
                            </Text>
                            <Text style={styles.textoCampo}>
                                Tipo de correspondência:{" "}
                                {resultadoGBIF.tipoCorrespondencia}
                            </Text>
                            {resultadoGBIF.confianca !== null && (
                                <Text style={styles.textoCampo}>
                                    Confiança da correspondência:{" "}
                                    {resultadoGBIF.confianca}
                                </Text>
                            )}
                            {resultadoGBIF.gbifUsageKey !== null && (
                                <Text style={styles.textoAuxiliar}>
                                    Código GBIF:{" "}
                                    {resultadoGBIF.gbifUsageKey}
                                </Text>
                            )}
                            <Text style={styles.avisoGBIF}>
                                O GBIF encontrou uma correspondência
                                taxonômica para o nome informado.
                                Isso não significa que o organismo
                                fotografado foi identificado
                                automaticamente.
                            </Text>
                            {resultadoGBIF.tipoCorrespondencia !==
                                "EXACT" && (
                                    <Text style={styles.avisoRevisao}>
                                        ⚠️ A correspondência não é exata.
                                        Confira o nome e a classificação
                                        antes de utilizar essas informações.
                                    </Text>
                                )}
                        </>
                    ) : (
                        <>
                            <Text style={styles.resultadoTitulo}>
                                Nenhuma correspondência encontrada
                            </Text>
                            <Text style={styles.textoAuxiliar}>
                                Verifique a grafia do nome científico
                                ou tente realizar outra pesquisa.
                            </Text>
                        </>
                    )}
                </View>
            )}
            <Text style={styles.ajudaGBIF}>
                Não sabe o nome científico? Sem problema.
                Você poderá registrar sua observação sem
                identificar a espécie.
            </Text>
            {/* LOCALIZAÇÃO GPS */}
            <Text style={styles.label}>
                Localização
            </Text>
            <View style={styles.campoInformativo}>
                {localizacao ? (
                    <View style={styles.dadosLocalizacao}>
                        <Text style={styles.localizacaoTitulo}>
                            📍 Localização obtida
                        </Text>
                        <Text style={styles.textoCampo}>
                            Latitude:{" "}
                            {localizacao.latitude.toFixed(6)}
                        </Text>
                        <Text style={styles.textoCampo}>
                            Longitude:{" "}
                            {localizacao.longitude.toFixed(6)}
                        </Text>
                        {localizacao.precisao !== null && (
                            <Text style={styles.textoAuxiliar}>
                                Precisão estimada: aproximadamente{" "}
                                {Math.round(localizacao.precisao)} metros
                            </Text>
                        )}
                    </View>
                ) : (
                    <Text style={styles.textoAuxiliar}>
                        Nenhuma localização selecionada.
                    </Text>
                )}
            </View>
            {/* BOTÃO GPS */}
            <Pressable
                style={[
                    styles.botaoGPS,
                    carregandoGPS &&
                    styles.botaoDesativado,
                ]}
                onPress={buscarLocalizacao}
                disabled={carregandoGPS}
            >
                {carregandoGPS ? (
                    <View style={styles.linhaCarregamento}>
                        <ActivityIndicator
                            size="small"
                            color="#276749"
                        />
                        <Text style={styles.textoGPS}>
                            Obtendo localização...
                        </Text>
                    </View>
                ) : (
                    <Text style={styles.textoGPS}>
                        📍{" "}
                        {localizacao
                            ? "Atualizar minha localização"
                            : "Usar minha localização"}
                    </Text>
                )}
            </Pressable>
            <Text style={styles.avisoLocalizacao}>
                A localização obtida corresponde à posição
                atual do celular. Futuramente você poderá
                ajustar o local da descoberta no mapa.
                As coordenadas exatas serão privadas por padrão.
            </Text>
            {/* DESCRIÇÃO */}
            <Text style={styles.label}>
                Descrição da observação
            </Text>
            <TextInput
                style={styles.campoDescricao}
                placeholder="Ex.: Encontrei esta abelha visitando uma flor..."
                placeholderTextColor="#87958B"
                value={descricao}
                onChangeText={setDescricao}
                multiline
                numberOfLines={4}
                textAlignVertical="top"
                maxLength={500}
            />
            <Text style={styles.contador}>
                {descricao.length}/500
            </Text>
            {/* PRIVACIDADE */}
            <View style={styles.aviso}>
                <Text style={styles.textoAviso}>
                    🔒 Sua observação será privada por padrão.
                    Você poderá escolher compartilhá-la depois.
                </Text>
            </View>
            {/* SALVAR OBSERVAÇÃO */}
            <Pressable
                style={[
                    styles.botaoPrincipal,
                    salvando && styles.botaoDesativado,
                ]}
                onPress={confirmarSalvamento}
                disabled={salvando}
            >
                {salvando ? (
                    <ActivityIndicator color="#FFFFFF" />
                ) : (
                    <Text style={styles.textoPrincipal}>
                        Salvar dados da observação
                    </Text>
                )}
            </Pressable>
            <Text style={styles.rodape}>
                Os dados da observação serão armazenados
                no Firestore. A fotografia ainda não será
                enviada para a nuvem.
            </Text>
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
        padding: 24,
        paddingBottom: 48,
    },
    botaoVoltar: {
        alignSelf: "flex-start",
        paddingVertical: 10,
        marginBottom: 15,
    },
    textoVoltar: {
        color: "#276749",
        fontSize: 15,
        fontWeight: "600",
    },
    titulo: {
        fontSize: 28,
        fontWeight: "bold",
        color: "#276749",
    },
    subtitulo: {
        fontSize: 15,
        color: "#64746A",
        marginTop: 8,
        marginBottom: 28,
    },
    label: {
        fontSize: 15,
        fontWeight: "600",
        color: "#33443A",
        marginBottom: 10,
        marginTop: 12,
    },
    linha: {
        flexDirection: "row",
        gap: 12,
        marginBottom: 20,
    },
    categoria: {
        flex: 1,
        padding: 16,
        borderRadius: 12,
        backgroundColor: "#FFFFFF",
        borderWidth: 1,
        borderColor: "#D5DFD5",
        alignItems: "center",
    },
    categoriaAtiva: {
        backgroundColor: "#E0F0E5",
        borderColor: "#276749",
        borderWidth: 2,
    },
    textoCategoria: {
        color: "#64746A",
        fontWeight: "600",
    },
    textoAtivo: {
        color: "#276749",
    },
    fotoVazia: {
        height: 170,
        borderWidth: 1,
        borderStyle: "dashed",
        borderColor: "#B5C8BA",
        borderRadius: 12,
        alignItems: "center",
        justifyContent: "center",
        backgroundColor: "#FFFFFF",
        marginBottom: 16,
    },
    iconeFoto: {
        fontSize: 40,
        marginBottom: 8,
    },
    textoAuxiliar: {
        color: "#718078",
        fontSize: 14,
        lineHeight: 21,
    },
    areaFoto: {
        marginBottom: 16,
    },
    imagem: {
        width: "100%",
        height: 220,
        borderRadius: 12,
    },
    removerFoto: {
        alignSelf: "center",
        padding: 12,
    },
    textoRemover: {
        color: "#B42318",
        fontWeight: "600",
    },
    botaoSecundario: {
        flex: 1,
        borderWidth: 1,
        borderColor: "#276749",
        borderRadius: 12,
        paddingVertical: 14,
        alignItems: "center",
        backgroundColor: "#FFFFFF",
    },
    textoSecundario: {
        color: "#276749",
        fontWeight: "600",
    },
    botaoDesativado: {
        opacity: 0.6,
    },
    indicador: {
        marginBottom: 12,
    },
    campoInformativo: {
        backgroundColor: "#FFFFFF",
        borderWidth: 1,
        borderColor: "#D5DFD5",
        borderRadius: 12,
        padding: 16,
        marginBottom: 14,
    },
    textoCampo: {
        color: "#33443A",
        fontSize: 15,
        lineHeight: 24,
    },
    campoNome: {
        backgroundColor: "#FFFFFF",
        borderWidth: 1,
        borderColor: "#D5DFD5",
        borderRadius: 12,
        padding: 16,
        fontSize: 15,
        color: "#33443A",
        marginBottom: 12,
    },
    caixaSugestoes: {
        backgroundColor: "#FFFFFF",
        borderWidth: 1,
        borderColor: "#C5DAC9",
        borderRadius: 12,
        padding: 12,
        marginBottom: 14,
    },
    tituloSugestoes: {
        color: "#276749",
        fontSize: 13,
        fontWeight: "bold",
        marginBottom: 8,
    },
    itemSugestao: {
        paddingVertical: 12,
        paddingHorizontal: 6,
        borderTopWidth: 1,
        borderTopColor: "#E5EBE5",
        flexDirection: "row",
        alignItems: "center",
        justifyContent: "space-between",
        gap: 8,
    },
    nomeSugestao: {
        color: "#33443A",
        fontSize: 14,
        fontStyle: "italic",
        flex: 1,
    },
    textoSelecionar: {
        color: "#276749",
        fontSize: 12,
        fontWeight: "600",
    },
    textoSugestoes: {
        color: "#64746A",
        fontSize: 13,
        lineHeight: 20,
    },
    botaoConsulta: {
        backgroundColor: "#FFFFFF",
        borderWidth: 1,
        borderColor: "#276749",
        borderRadius: 12,
        paddingVertical: 15,
        paddingHorizontal: 12,
        alignItems: "center",
        marginBottom: 12,
    },
    textoConsulta: {
        color: "#276749",
        fontSize: 15,
        fontWeight: "600",
    },
    linhaCarregamento: {
        flexDirection: "row",
        gap: 10,
        alignItems: "center",
        justifyContent: "center",
    },
    resultadoGBIF: {
        backgroundColor: "#E0F0E5",
        borderWidth: 1,
        borderColor: "#B5C8BA",
        borderRadius: 12,
        padding: 16,
        marginBottom: 12,
        gap: 8,
    },
    resultadoTitulo: {
        color: "#276749",
        fontSize: 16,
        fontWeight: "bold",
        marginBottom: 4,
    },
    avisoGBIF: {
        color: "#64746A",
        fontSize: 12,
        lineHeight: 19,
        marginTop: 8,
    },
    avisoRevisao: {
        color: "#8A5700",
        fontSize: 12,
        lineHeight: 19,
        marginTop: 4,
    },
    ajudaGBIF: {
        color: "#718078",
        fontSize: 12,
        lineHeight: 19,
        marginBottom: 20,
    },
    dadosLocalizacao: {
        gap: 5,
    },
    localizacaoTitulo: {
        fontSize: 15,
        fontWeight: "bold",
        color: "#276749",
        marginBottom: 6,
    },
    botaoGPS: {
        backgroundColor: "#FFFFFF",
        borderWidth: 1,
        borderColor: "#276749",
        borderRadius: 12,
        paddingVertical: 15,
        paddingHorizontal: 12,
        alignItems: "center",
        marginBottom: 10,
    },
    textoGPS: {
        color: "#276749",
        fontSize: 15,
        fontWeight: "600",
    },
    avisoLocalizacao: {
        color: "#718078",
        fontSize: 12,
        lineHeight: 18,
        marginBottom: 20,
    },
    campoDescricao: {
        backgroundColor: "#FFFFFF",
        borderWidth: 1,
        borderColor: "#D5DFD5",
        borderRadius: 12,
        padding: 16,
        minHeight: 110,
        fontSize: 15,
        color: "#33443A",
    },
    contador: {
        color: "#718078",
        textAlign: "right",
        marginTop: 6,
        marginBottom: 18,
    },
    aviso: {
        backgroundColor: "#E0F0E5",
        borderRadius: 12,
        padding: 14,
        marginBottom: 24,
    },
    textoAviso: {
        color: "#276749",
        fontSize: 13,
        lineHeight: 20,
    },
    botaoPrincipal: {
        backgroundColor: "#276749",
        padding: 17,
        borderRadius: 12,
        alignItems: "center",
    },
    textoPrincipal: {
        color: "#FFFFFF",
        fontWeight: "bold",
        fontSize: 16,
    },
    rodape: {
        color: "#718078",
        fontSize: 12,
        textAlign: "center",
        marginTop: 14,
    },
});
