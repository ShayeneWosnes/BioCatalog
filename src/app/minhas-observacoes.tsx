
import { router, useFocusEffect } from "expo-router";
import { useCallback, useState } from "react";

import {
    ActivityIndicator,
    Alert,
    Modal,
    Pressable,
    ScrollView,
    StyleSheet,
    Text,
    TextInput,
    View,
} from "react-native";

import type { Observacao } from "../models/observation";

import {
    atualizarDescricaoObservacao,
    excluirObservacao,
    listarMinhasObservacoes,
} from "../services/observationService";

import {
    publicarObservacao,
    retirarPublicacao,
} from "../services/publicationService";

import type {
    ModoLocalizacaoPublica,
    OpcoesPublicacao,
} from "../services/publicationService";

import type { LugarEncontrado } from "../services/placeSearchService";
import { pesquisarLugares } from "../services/placeSearchService";

// ==========================================
// MODOS DE COMPARTILHAMENTO
// ==========================================

const OPCOES: {
    valor: ModoLocalizacaoPublica;
    titulo: string;
    descricao: string;
}[] = [
        {
            valor: "exact",
            titulo: "📍 Localização exata",
            descricao: "Publica o ponto capturado pelo GPS, que pode identificar sua casa.",
        },
        {
            valor: "approximate",
            titulo: "🌎 Localização aproximada",
            descricao: "Publica um ponto generalizado, que pode ficar longe do local real.",
        },
        {
            valor: "place",
            titulo: "🏙️ Cidade ou local escolhido",
            descricao: "Associa o registro a um lugar pesquisado, sem usar a posição do GPS.",
        },
        {
            valor: "hidden",
            titulo: "🔒 Não compartilhar localização",
            descricao: "A observação será pública, mas sem marcador geográfico.",
        },
    ];

// ==========================================
// TELA MINHAS OBSERVAÇÕES
// ==========================================

export default function MinhasObservacoesScreen() {
    // ==========================================
    // ESTADOS DA LISTAGEM
    // ==========================================

    const [observacoes, setObservacoes] =
        useState<Observacao[]>([]);

    const [carregando, setCarregando] =
        useState(true);

    const [erro, setErro] =
        useState<string | null>(null);

    const [atualizar, setAtualizar] =
        useState(0);

    // ==========================================
    // ESTADOS DE EDIÇÃO
    // ==========================================

    const [editandoId, setEditandoId] =
        useState<string | null>(null);

    const [descricaoEdicao, setDescricaoEdicao] =
        useState("");

    const [salvandoEdicao, setSalvandoEdicao] =
        useState(false);

    // ==========================================
    // ESTADOS DE EXCLUSÃO E PUBLICAÇÃO
    // ==========================================

    const [excluindoId, setExcluindoId] =
        useState<string | null>(null);

    const [publicandoId, setPublicandoId] =
        useState<string | null>(null);

    // ==========================================
    // ESTADOS DA PRIVACIDADE DA LOCALIZAÇÃO
    // ==========================================

    const [observacaoParaPublicar, setObservacaoParaPublicar] =
        useState<Observacao | null>(null);

    const [modo, setModo] =
        useState<ModoLocalizacaoPublica>("hidden");

    const [consentimentoExato, setConsentimentoExato] =
        useState(false);

    // ==========================================
    // ESTADOS DA BUSCA POR CIDADES E LOCAIS
    // ==========================================

    const [termoLocal, setTermoLocal] =
        useState("");

    const [resultadosLocais, setResultadosLocais] =
        useState<LugarEncontrado[]>([]);

    const [lugarEscolhido, setLugarEscolhido] =
        useState<LugarEncontrado | null>(null);

    const [pesquisandoLocal, setPesquisandoLocal] =
        useState(false);

    const [erroLocal, setErroLocal] =
        useState<string | null>(null);

    // ==========================================
    // CONTROLE DE OPERAÇÕES
    // ==========================================

    const operacaoEmAndamento =
        salvandoEdicao ||
        excluindoId !== null ||
        publicandoId !== null;

    // ==========================================
    // CARREGAR OBSERVAÇÕES
    // ==========================================

    useFocusEffect(
        useCallback(() => {
            let ativo = true;

            async function carregar() {
                setCarregando(true);
                setErro(null);

                try {
                    const dados =
                        await listarMinhasObservacoes();

                    if (ativo) {
                        setObservacoes(dados);
                    }
                } catch (falha) {
                    console.error(
                        "Erro ao carregar observações:",
                        falha
                    );

                    if (ativo) {
                        setErro(
                            "Não foi possível carregar suas observações."
                        );
                    }
                } finally {
                    if (ativo) {
                        setCarregando(false);
                    }
                }
            }

            void carregar();

            return () => {
                ativo = false;
            };
        }, [atualizar])
    );

    function atualizarLista() {
        setAtualizar((valor) => valor + 1);
    }

    // ==========================================
    // FORMATAR DATA
    // ==========================================

    function formatarData(
        observacao: Observacao
    ): string {
        return observacao.observedAt
            ?.toDate()
            .toLocaleDateString("pt-BR") ??
            "Data não informada";
    }

    // ==========================================
    // EDITAR DESCRIÇÃO
    // ==========================================

    function iniciarEdicao(
        observacao: Observacao
    ) {
        if (operacaoEmAndamento) return;

        if (observacao.visibility === "public") {
            Alert.alert(
                "Observação compartilhada",
                "Retire a publicação antes de editar."
            );
            return;
        }

        setEditandoId(observacao.id);
        setDescricaoEdicao(observacao.notes);
    }

    async function salvarEdicao() {
        if (!editandoId || operacaoEmAndamento) {
            return;
        }

        const observacao = observacoes.find(
            (item) => item.id === editandoId
        );

        if (
            !observacao ||
            observacao.visibility === "public"
        ) {
            return;
        }

        setSalvandoEdicao(true);

        try {
            await atualizarDescricaoObservacao(
                editandoId,
                descricaoEdicao
            );

            setEditandoId(null);
            setDescricaoEdicao("");

            atualizarLista();

            Alert.alert(
                "Alteração salva!",
                "A descrição foi atualizada."
            );
        } catch (falha) {
            Alert.alert(
                "Erro ao editar",
                falha instanceof Error
                    ? falha.message
                    : "Tente novamente."
            );
        } finally {
            setSalvandoEdicao(false);
        }
    }

    // ==========================================
    // EXCLUIR OBSERVAÇÃO
    // ==========================================

    async function executarExclusao(
        id: string
    ) {
        if (operacaoEmAndamento) return;

        setExcluindoId(id);

        try {
            await excluirObservacao(id);

            setObservacoes((anteriores) =>
                anteriores.filter(
                    (item) => item.id !== id
                )
            );

            Alert.alert(
                "Observação excluída!",
                "O registro foi removido."
            );
        } catch (falha) {
            Alert.alert(
                "Erro ao excluir",
                falha instanceof Error
                    ? falha.message
                    : "Tente novamente."
            );
        } finally {
            setExcluindoId(null);
        }
    }

    function confirmarExclusao(
        observacao: Observacao
    ) {
        if (operacaoEmAndamento) return;

        if (observacao.visibility === "public") {
            Alert.alert(
                "Observação compartilhada",
                "Retire a publicação antes de excluir."
            );
            return;
        }

        Alert.alert(
            "Excluir observação?",
            "Esta ação é permanente e não poderá ser desfeita.",
            [
                {
                    text: "Cancelar",
                    style: "cancel",
                },
                {
                    text: "Excluir",
                    style: "destructive",
                    onPress: () => {
                        void executarExclusao(observacao.id);
                    },
                },
            ]
        );
    }

    // ==========================================
    // ABRIR CONFIGURAÇÕES DE PUBLICAÇÃO
    // ==========================================

    function abrirPublicacao(
        observacao: Observacao
    ) {
        if (
            operacaoEmAndamento ||
            observacao.visibility === "public"
        ) {
            return;
        }

        // Começa sem compartilhar localização.
        // O usuário precisa escolher outro modo.

        setModo("hidden");
        setConsentimentoExato(false);

        setTermoLocal("");
        setResultadosLocais([]);
        setLugarEscolhido(null);
        setErroLocal(null);

        setObservacaoParaPublicar(observacao);
    }

    // ==========================================
    // FECHAR CONFIGURAÇÕES
    // ==========================================

    function fecharPublicacao() {
        if (
            operacaoEmAndamento ||
            pesquisandoLocal
        ) {
            return;
        }

        setObservacaoParaPublicar(null);
        setResultadosLocais([]);
        setLugarEscolhido(null);
        setErroLocal(null);
        setConsentimentoExato(false);
    }

    // ==========================================
    // ESCOLHER MODO DE LOCALIZAÇÃO
    // ==========================================

    function escolherModo(
        novoModo: ModoLocalizacaoPublica
    ) {
        setModo(novoModo);
        setConsentimentoExato(false);
        setErroLocal(null);
    }

    // ==========================================
    // BUSCAR CIDADES E LOCAIS
    // ==========================================

    async function buscarLocal() {
        if (pesquisandoLocal) return;

        setPesquisandoLocal(true);
        setErroLocal(null);
        setResultadosLocais([]);
        setLugarEscolhido(null);

        try {
            const encontrados =
                await pesquisarLugares(termoLocal);

            setResultadosLocais(encontrados);

            if (encontrados.length === 0) {
                setErroLocal(
                    "Nenhum lugar encontrado. Informe cidade e estado para refinar a pesquisa."
                );
            }
        } catch (falha) {
            setErroLocal(
                falha instanceof Error
                    ? falha.message
                    : "Falha ao pesquisar lugares."
            );
        } finally {
            setPesquisandoLocal(false);
        }
    }

    // ==========================================
    // CONFIRMAR DADOS ANTES DA PUBLICAÇÃO
    // ==========================================

    function solicitarConfirmacaoPublicacao() {
        const observacao =
            observacaoParaPublicar;

        if (
            !observacao ||
            operacaoEmAndamento ||
            pesquisandoLocal
        ) {
            return;
        }

        let opcoes: OpcoesPublicacao;
        let localizacaoResumo: string;

        // ----------------------------------------
        // LOCALIZAÇÃO EXATA
        // ----------------------------------------

        if (modo === "exact") {
            const gps = observacao.exactLocation;

            if (!gps) {
                Alert.alert(
                    "GPS indisponível",
                    "Esta observação não tem coordenadas GPS salvas."
                );
                return;
            }

            if (!consentimentoExato) {
                Alert.alert(
                    "Confirmação necessária",
                    "Marque a autorização para publicar as coordenadas exatas."
                );
                return;
            }

            opcoes = {
                modoLocalizacao: "exact",
                confirmouCompartilhamentoExato: true,
            };

            localizacaoResumo =
                `EXATA: ${gps.latitude.toFixed(6)}, ` +
                `${gps.longitude.toFixed(6)}.\n` +
                "Essa posição poderá identificar sua residência ou um ambiente sensível.";
        }

        // ----------------------------------------
        // LOCALIZAÇÃO APROXIMADA
        // ----------------------------------------

        else if (modo === "approximate") {
            if (!observacao.exactLocation) {
                Alert.alert(
                    "GPS indisponível",
                    "Esta observação não tem coordenadas GPS salvas."
                );
                return;
            }

            opcoes = {
                modoLocalizacao: "approximate",
            };

            localizacaoResumo =
                "Aproximada: o GPS será generalizado para uma grade de 0,1 grau.";
        }

        // ----------------------------------------
        // CIDADE OU LOCAL ESCOLHIDO
        // ----------------------------------------

        else if (modo === "place") {
            if (!lugarEscolhido) {
                Alert.alert(
                    "Selecione um local",
                    "Pesquise e selecione uma cidade ou um lugar antes de publicar."
                );
                return;
            }

            opcoes = {
                modoLocalizacao: "place",
                local: {
                    id: lugarEscolhido.id,
                    nome: lugarEscolhido.nome,
                    latitude: lugarEscolhido.latitude,
                    longitude: lugarEscolhido.longitude,
                    tipo: lugarEscolhido.tipo,
                },
                confirmouCompartilhamentoLocal: true,
            };

            localizacaoResumo =
                `Local escolhido: ` +
                `${lugarEscolhido.enderecoCompleto}.`;
        }

        // ----------------------------------------
        // NÃO COMPARTILHAR LOCALIZAÇÃO
        // ----------------------------------------

        else {
            opcoes = {
                modoLocalizacao: "hidden",
            };

            localizacaoResumo =
                "Sem localização pública.";
        }

        // ========================================
        // RESUMO DOS DADOS
        // ========================================

        const nome =
            observacao.taxon?.scientificName ??
            "Não informado";

        const categoria =
            observacao.category === "fauna"
                ? "Fauna"
                : "Flora";

        const mensagem =
            `Categoria: ${categoria}\n` +
            `Data: ${formatarData(observacao)}\n` +
            `Nome científico: ${nome}\n` +
            `Descrição: ${observacao.notes || "Sem descrição"}\n\n` +
            `Localização: ${localizacaoResumo}\n\n` +
            "A foto não será publicada nesta versão. " +
            "Outros usuários verificados poderão consultar os dados compartilhados. " +
            "Deseja publicar?";

        Alert.alert(
            "Confirmar publicação",
            mensagem,
            [
                {
                    text: "Cancelar",
                    style: "cancel",
                },
                {
                    text:
                        modo === "exact"
                            ? "Divulgar GPS e publicar"
                            : "Publicar",

                    onPress: () => {
                        void executarPublicacao(
                            observacao.id,
                            opcoes
                        );
                    },
                },
            ]
        );
    }

    // ==========================================
    // EXECUTAR PUBLICAÇÃO
    // ==========================================

    async function executarPublicacao(
        id: string,
        opcoes: OpcoesPublicacao
    ) {
        if (operacaoEmAndamento) return;

        setPublicandoId(id);

        try {
            // Envia explicitamente o modo escolhido.
            // Não utiliza a publicação legada.

            await publicarObservacao(
                id,
                opcoes
            );

            setObservacaoParaPublicar(null);
            setResultadosLocais([]);

            atualizarLista();

            Alert.alert(
                "Publicação realizada!",
                "Sua observação está disponível para usuários verificados."
            );
        } catch (falha) {
            Alert.alert(
                "Não foi possível publicar",
                falha instanceof Error
                    ? falha.message
                    : "Tente novamente."
            );
        } finally {
            setPublicandoId(null);
        }
    }

    // ==========================================
    // RETIRAR PUBLICAÇÃO
    // ==========================================

    async function executarRetirada(
        id: string
    ) {
        if (operacaoEmAndamento) return;

        setPublicandoId(id);

        try {
            await retirarPublicacao(id);

            atualizarLista();

            Alert.alert(
                "Publicação retirada!",
                "A observação voltou a ser privada."
            );
        } catch (falha) {
            Alert.alert(
                "Não foi possível retirar",
                falha instanceof Error
                    ? falha.message
                    : "Tente novamente."
            );
        } finally {
            setPublicandoId(null);
        }
    }

    function confirmarRetirada(
        observacao: Observacao
    ) {
        if (operacaoEmAndamento) return;

        Alert.alert(
            "Retirar da comunidade?",
            "A observação deixará de aparecer na comunidade, mas permanecerá no seu histórico.",
            [
                {
                    text: "Cancelar",
                    style: "cancel",
                },
                {
                    text: "Retirar publicação",
                    onPress: () => {
                        void executarRetirada(observacao.id);
                    },
                },
            ]
        );
    }

    // ==========================================
    // VERIFICAR SE O REGISTRO POSSUI GPS
    // ==========================================

    const possuiGPS =
        !!observacaoParaPublicar?.exactLocation;

    // ==========================================
    // INTERFACE
    // ==========================================

    return (
        <>
            <ScrollView
                style={styles.container}
                contentContainerStyle={styles.conteudo}
                keyboardShouldPersistTaps="handled"
            >
                {/* =====================================
            VOLTAR
            ===================================== */}

                <Pressable
                    style={styles.botaoVoltar}
                    onPress={() => router.back()}
                >
                    <Text style={styles.linkVerde}>
                        ← Voltar
                    </Text>
                </Pressable>

                {/* =====================================
            CABEÇALHO
            ===================================== */}

                <Text style={styles.titulo}>
                    Minhas Observações
                </Text>

                <Text style={styles.subtitulo}>
                    Acompanhe suas descobertas e escolha
                    quais deseja compartilhar com a comunidade.
                </Text>

                {/* =====================================
            AVISO DE PRIVACIDADE
            ===================================== */}

                <View style={styles.aviso}>
                    <Text style={styles.avisoTitulo}>
                        🔒 Você controla suas publicações
                    </Text>

                    <Text style={styles.avisoTexto}>
                        Todas as novas observações começam privadas.
                        Ao publicar, você escolhe quais informações
                        de localização deseja compartilhar.
                        As coordenadas exatas só serão divulgadas
                        se você autorizar expressamente.
                    </Text>
                </View>

                {/* =====================================
            ATUALIZAR
            ===================================== */}

                <Pressable
                    style={styles.botaoAtualizar}
                    onPress={atualizarLista}
                    disabled={
                        carregando ||
                        operacaoEmAndamento
                    }
                >
                    <Text style={styles.linkVerde}>
                        ↻ Atualizar observações
                    </Text>
                </Pressable>

                {/* =====================================
            CARREGANDO
            ===================================== */}

                {carregando && (
                    <View style={styles.estado}>
                        <ActivityIndicator
                            size="large"
                            color="#276749"
                        />

                        <Text style={styles.textoSecundario}>
                            Carregando suas observações...
                        </Text>
                    </View>
                )}

                {/* =====================================
            ERRO
            ===================================== */}

                {!carregando && erro && (
                    <View style={styles.estado}>
                        <Text style={styles.estadoTitulo}>
                            ⚠️ Não foi possível carregar
                        </Text>

                        <Text style={styles.textoSecundario}>
                            {erro}
                        </Text>

                        <Pressable
                            style={styles.botaoPrincipal}
                            onPress={atualizarLista}
                        >
                            <Text style={styles.textoPrincipal}>
                                Tentar novamente
                            </Text>
                        </Pressable>
                    </View>
                )}

                {/* =====================================
            SEM OBSERVAÇÕES
            ===================================== */}

                {!carregando &&
                    !erro &&
                    observacoes.length === 0 && (
                        <View style={styles.estado}>
                            <Text style={styles.estadoTitulo}>
                                🌿 Nenhuma observação ainda
                            </Text>

                            <Text style={styles.textoSecundario}>
                                Registre sua primeira descoberta
                                para começar seu catálogo.
                            </Text>

                            <Pressable
                                style={styles.botaoPrincipal}
                                onPress={() =>
                                    router.push("/nova-observacao")
                                }
                            >
                                <Text style={styles.textoPrincipal}>
                                    Registrar observação
                                </Text>
                            </Pressable>
                        </View>
                    )}

                {/* =====================================
            LISTAGEM
            ===================================== */}

                {!carregando &&
                    !erro &&
                    observacoes.length > 0 && (
                        <>
                            <Text style={styles.contador}>
                                {observacoes.length}{" "}
                                {observacoes.length === 1
                                    ? "observação encontrada"
                                    : "observações encontradas"}
                            </Text>

                            {observacoes.map((observacao) => {
                                const publica =
                                    observacao.visibility === "public";

                                const editando =
                                    editandoId === observacao.id;

                                const processando =
                                    publicandoId === observacao.id;

                                return (
                                    <View
                                        key={observacao.id}
                                        style={styles.card}
                                    >
                                        {/* CATEGORIA E DATA */}

                                        <View style={styles.cardCabecalho}>
                                            <Text style={styles.categoria}>
                                                {observacao.category === "fauna"
                                                    ? "🐝 Fauna"
                                                    : "🌿 Flora"}
                                            </Text>

                                            <Text style={styles.data}>
                                                {formatarData(observacao)}
                                            </Text>
                                        </View>

                                        {/* STATUS */}

                                        <View
                                            style={[
                                                styles.status,
                                                publica
                                                    ? styles.statusPublico
                                                    : styles.statusPrivado,
                                            ]}
                                        >
                                            <Text
                                                style={
                                                    publica
                                                        ? styles.textoStatusPublico
                                                        : styles.textoSecundario
                                                }
                                            >
                                                {publica
                                                    ? "🌎 Pública na comunidade"
                                                    : "🔒 Observação privada"}
                                            </Text>
                                        </View>

                                        {/* EDIÇÃO */}

                                        {editando ? (
                                            <View style={styles.areaEdicao}>
                                                <Text style={styles.label}>
                                                    Editar descrição
                                                </Text>

                                                <TextInput
                                                    style={[
                                                        styles.campo,
                                                        styles.campoMultilinha,
                                                    ]}
                                                    value={descricaoEdicao}
                                                    onChangeText={setDescricaoEdicao}
                                                    placeholder="Descreva sua descoberta..."
                                                    multiline
                                                    maxLength={500}
                                                    textAlignVertical="top"
                                                    editable={!operacaoEmAndamento}
                                                />

                                                <Text style={styles.contadorEdicao}>
                                                    {descricaoEdicao.length}/500
                                                </Text>

                                                <View style={styles.linhaBotoes}>
                                                    <Pressable
                                                        style={styles.botaoContorno}
                                                        onPress={() => {
                                                            if (!operacaoEmAndamento) {
                                                                setEditandoId(null);
                                                                setDescricaoEdicao("");
                                                            }
                                                        }}
                                                        disabled={operacaoEmAndamento}
                                                    >
                                                        <Text style={styles.linkVerde}>
                                                            Cancelar
                                                        </Text>
                                                    </Pressable>

                                                    <Pressable
                                                        style={styles.botaoPrincipalFlex}
                                                        onPress={() => {
                                                            void salvarEdicao();
                                                        }}
                                                        disabled={operacaoEmAndamento}
                                                    >
                                                        <Text style={styles.textoPrincipal}>
                                                            {salvandoEdicao
                                                                ? "Salvando..."
                                                                : "Salvar alteração"}
                                                        </Text>
                                                    </Pressable>
                                                </View>
                                            </View>
                                        ) : (
                                            <>
                                                <Text style={styles.descricao}>
                                                    {observacao.notes ||
                                                        "Sem descrição"}
                                                </Text>

                                                {!publica && (
                                                    <Pressable
                                                        style={styles.botaoEditar}
                                                        onPress={() =>
                                                            iniciarEdicao(observacao)
                                                        }
                                                        disabled={operacaoEmAndamento}
                                                    >
                                                        <Text style={styles.linkVerde}>
                                                            ✏️ Editar descrição
                                                        </Text>
                                                    </Pressable>
                                                )}
                                            </>
                                        )}

                                        {/* NOME CIENTÍFICO */}

                                        {observacao.taxon && (
                                            <Text style={styles.nomeCientifico}>
                                                {observacao.taxon.scientificName}
                                            </Text>
                                        )}

                                        {/* IDENTIFICAÇÃO */}

                                        <View style={styles.cardRodape}>
                                            <Text style={styles.textoSecundario}>
                                                {observacao.identificationStatus ===
                                                    "provisional"
                                                    ? "Identificação provisória"
                                                    : "Não identificada"}
                                            </Text>
                                        </View>

                                        {/* PUBLICAR OU RETIRAR */}

                                        {!editando && (
                                            <Pressable
                                                style={[
                                                    styles.botaoComunidade,
                                                    publica
                                                        ? styles.botaoRetirar
                                                        : styles.botaoPublicar,
                                                ]}
                                                onPress={() =>
                                                    publica
                                                        ? confirmarRetirada(observacao)
                                                        : abrirPublicacao(observacao)
                                                }
                                                disabled={operacaoEmAndamento}
                                            >
                                                {processando ? (
                                                    <ActivityIndicator
                                                        color={
                                                            publica
                                                                ? "#276749"
                                                                : "#FFFFFF"
                                                        }
                                                    />
                                                ) : (
                                                    <Text
                                                        style={
                                                            publica
                                                                ? styles.linkVerde
                                                                : styles.textoPrincipal
                                                        }
                                                    >
                                                        {publica
                                                            ? "🔒 Retirar da comunidade"
                                                            : "🌎 Publicar na comunidade"}
                                                    </Text>
                                                )}
                                            </Pressable>
                                        )}

                                        {/* AVISO DE REGISTRO PÚBLICO */}

                                        {publica && (
                                            <Text style={styles.avisoCard}>
                                                Retire a publicação antes de
                                                editar ou excluir este registro.
                                            </Text>
                                        )}

                                        {/* EXCLUIR */}

                                        {!publica && !editando && (
                                            <Pressable
                                                style={styles.botaoExcluir}
                                                onPress={() =>
                                                    confirmarExclusao(observacao)
                                                }
                                                disabled={operacaoEmAndamento}
                                            >
                                                <Text style={styles.textoExcluir}>
                                                    {excluindoId === observacao.id
                                                        ? "Excluindo..."
                                                        : "🗑️ Excluir observação"}
                                                </Text>
                                            </Pressable>
                                        )}
                                    </View>
                                );
                            })}
                        </>
                    )}
            </ScrollView>

            {/* =======================================
          MODAL DE CONFIGURAÇÃO DA PUBLICAÇÃO
          ======================================= */}

            <Modal
                visible={observacaoParaPublicar !== null}
                transparent
                animationType="slide"
                onRequestClose={fecharPublicacao}
            >
                <View style={styles.modalFundo}>
                    <View style={styles.modalCartao}>
                        <ScrollView
                            contentContainerStyle={styles.modalConteudo}
                            keyboardShouldPersistTaps="handled"
                        >
                            {/* CABEÇALHO */}

                            <Text style={styles.modalTitulo}>
                                🌎 Publicar observação
                            </Text>

                            <Text style={styles.modalSubtitulo}>
                                Confira os dados e escolha como
                                compartilhar a localização.
                            </Text>

                            {/* RESUMO DA OBSERVAÇÃO */}

                            {observacaoParaPublicar && (
                                <View style={styles.resumoObservacao}>
                                    <Text style={styles.resumoTitulo}>
                                        {observacaoParaPublicar.category ===
                                            "fauna"
                                            ? "🐝 Fauna"
                                            : "🌿 Flora"}
                                        {"  •  "}
                                        {formatarData(observacaoParaPublicar)}
                                    </Text>

                                    {observacaoParaPublicar.taxon && (
                                        <Text style={styles.nomeCientifico}>
                                            {
                                                observacaoParaPublicar.taxon
                                                    .scientificName
                                            }
                                        </Text>
                                    )}

                                    <Text style={styles.descricao}>
                                        {observacaoParaPublicar.notes ||
                                            "Sem descrição"}
                                    </Text>

                                    <Text style={styles.textoSecundario}>
                                        {possuiGPS
                                            ? "GPS registrado na observação privada"
                                            : "Esta observação não possui GPS salvo"}
                                    </Text>
                                </View>
                            )}

                            {/* ==================================
                  OPÇÕES DE LOCALIZAÇÃO
                  ================================== */}

                            <Text style={styles.label}>
                                Como compartilhar a localização?
                            </Text>

                            {OPCOES.map((opcao) => {
                                const indisponivel =
                                    (opcao.valor === "exact" ||
                                        opcao.valor === "approximate") &&
                                    !possuiGPS;

                                const selecionada =
                                    modo === opcao.valor;

                                return (
                                    <Pressable
                                        key={opcao.valor}
                                        style={[
                                            styles.opcaoLocalizacao,
                                            selecionada &&
                                            styles.opcaoSelecionada,
                                            indisponivel &&
                                            styles.opcaoIndisponivel,
                                        ]}
                                        onPress={() =>
                                            escolherModo(opcao.valor)
                                        }
                                        disabled={
                                            indisponivel ||
                                            operacaoEmAndamento
                                        }
                                        accessibilityRole="radio"
                                        accessibilityState={{
                                            checked: selecionada,
                                            disabled: indisponivel,
                                        }}
                                    >
                                        <Text style={styles.opcaoTitulo}>
                                            {selecionada ? "◉ " : "○ "}
                                            {opcao.titulo}
                                        </Text>

                                        <Text style={styles.opcaoDescricao}>
                                            {opcao.descricao}
                                        </Text>
                                    </Pressable>
                                );
                            })}

                            {/* ==================================
                  CONFIRMAÇÃO DA LOCALIZAÇÃO EXATA
                  ================================== */}

                            {modo === "exact" &&
                                observacaoParaPublicar?.exactLocation && (
                                    <View style={styles.alertaExato}>
                                        <Text style={styles.alertaTitulo}>
                                            ⚠️ Atenção à sua privacidade
                                        </Text>

                                        <Text style={styles.alertaTexto}>
                                            Estas coordenadas serão visíveis
                                            para outros usuários verificados:
                                            {"\n"}
                                            {
                                                observacaoParaPublicar
                                                    .exactLocation.latitude
                                                    .toFixed(6)
                                            }
                                            ,{" "}
                                            {
                                                observacaoParaPublicar
                                                    .exactLocation.longitude
                                                    .toFixed(6)
                                            }
                                            {"\n\n"}
                                            O GPS pode ter margem de erro.
                                            Se o registro foi feito em casa
                                            ou em área sensível, prefira
                                            outra modalidade. Mesmo retirando
                                            a publicação depois, alguém pode
                                            ter guardado essas informações.
                                        </Text>

                                        <Pressable
                                            style={styles.confirmacaoLinha}
                                            onPress={() =>
                                                setConsentimentoExato(
                                                    (anterior) => !anterior
                                                )
                                            }
                                            accessibilityRole="checkbox"
                                            accessibilityState={{
                                                checked: consentimentoExato,
                                            }}
                                        >
                                            <Text style={styles.marcacao}>
                                                {consentimentoExato
                                                    ? "☑"
                                                    : "☐"}
                                            </Text>

                                            <Text
                                                style={styles.textoConfirmacao}
                                            >
                                                Autorizo divulgar a coordenada
                                                exata desta observação.
                                            </Text>
                                        </Pressable>
                                    </View>
                                )}

                            {/* ==================================
                  PRÉVIA APROXIMADA
                  ================================== */}

                            {modo === "approximate" &&
                                observacaoParaPublicar?.exactLocation && (
                                    <View style={styles.aviso}>
                                        <Text style={styles.avisoTitulo}>
                                            🌎 Prévia aproximada
                                        </Text>

                                        <Text style={styles.avisoTexto}>
                                            {Math.round(
                                                observacaoParaPublicar
                                                    .exactLocation.latitude * 10
                                            ) / 10}
                                            ,{" "}
                                            {Math.round(
                                                observacaoParaPublicar
                                                    .exactLocation.longitude * 10
                                            ) / 10}
                                            {"\n"}
                                            É uma posição generalizada e pode
                                            aparecer fora da área urbana.
                                        </Text>
                                    </View>
                                )}

                            {/* ==================================
                  PESQUISAR CIDADE OU LOCAL
                  ================================== */}

                            {modo === "place" && (
                                <View style={styles.buscaLocal}>
                                    <Text style={styles.label}>
                                        Pesquisar cidade ou local
                                    </Text>

                                    <Text style={styles.textoSecundario}>
                                        Escolha um lugar que represente
                                        a descoberta. O nome será público.
                                    </Text>

                                    <TextInput
                                        style={styles.campo}
                                        value={termoLocal}
                                        onChangeText={(texto) => {
                                            setTermoLocal(texto);
                                            setLugarEscolhido(null);
                                            setResultadosLocais([]);
                                        }}
                                        placeholder="Ex.: Palmas, PR ou IFPR Palmas"
                                        maxLength={120}
                                        returnKeyType="search"
                                        onSubmitEditing={() => {
                                            void buscarLocal();
                                        }}
                                        editable={
                                            !pesquisandoLocal &&
                                            !operacaoEmAndamento
                                        }
                                    />

                                    <Pressable
                                        style={styles.botaoPrincipal}
                                        onPress={() => {
                                            void buscarLocal();
                                        }}
                                        disabled={
                                            pesquisandoLocal ||
                                            operacaoEmAndamento
                                        }
                                    >
                                        {pesquisandoLocal ? (
                                            <ActivityIndicator
                                                color="#FFFFFF"
                                            />
                                        ) : (
                                            <Text style={styles.textoPrincipal}>
                                                Buscar local
                                            </Text>
                                        )}
                                    </Pressable>

                                    {/* ERRO DA BUSCA */}

                                    {erroLocal && (
                                        <Text style={styles.erroLocal}>
                                            {erroLocal}
                                        </Text>
                                    )}

                                    {/* RESULTADOS */}

                                    {resultadosLocais.map((lugar) => (
                                        <Pressable
                                            key={lugar.id}
                                            style={styles.resultadoLocal}
                                            onPress={() => {
                                                setLugarEscolhido(lugar);
                                                setTermoLocal(lugar.nome);
                                                setResultadosLocais([]);
                                                setErroLocal(null);
                                            }}
                                        >
                                            <Text style={styles.linkVerde}>
                                                📍 {lugar.nome}
                                            </Text>

                                            <Text
                                                style={styles.textoSecundario}
                                            >
                                                {lugar.enderecoCompleto}
                                            </Text>
                                        </Pressable>
                                    ))}

                                    {/* LOCAL ESCOLHIDO */}

                                    {lugarEscolhido && (
                                        <View style={styles.localEscolhido}>
                                            <Text style={styles.avisoTitulo}>
                                                ✓ Local selecionado
                                            </Text>

                                            <Text style={styles.avisoTexto}>
                                                {lugarEscolhido.enderecoCompleto}
                                            </Text>

                                            <Text style={styles.avisoTexto}>
                                                O mapa usará o ponto de referência
                                                deste lugar, não o GPS original.
                                            </Text>
                                        </View>
                                    )}
                                </View>
                            )}

                            {/* ==================================
                  LOCALIZAÇÃO OCULTA
                  ================================== */}

                            {modo === "hidden" && (
                                <Text style={styles.ajudaOculta}>
                                    A comunidade poderá ler sua descoberta,
                                    mas não verá um marcador no mapa.
                                </Text>
                            )}

                            {/* FOTOGRAFIA */}

                            <Text style={styles.avisoFoto}>
                                📷 A fotografia não será publicada nesta
                                versão do BioCatalog.
                            </Text>

                            {/* ==================================
                  BOTÕES DO MODAL
                  ================================== */}

                            <View style={styles.linhaBotoes}>
                                <Pressable
                                    style={styles.botaoContorno}
                                    onPress={fecharPublicacao}
                                    disabled={
                                        operacaoEmAndamento ||
                                        pesquisandoLocal
                                    }
                                >
                                    <Text style={styles.linkVerde}>
                                        Cancelar
                                    </Text>
                                </Pressable>

                                <Pressable
                                    style={[
                                        styles.botaoPrincipalFlex,
                                        operacaoEmAndamento &&
                                        styles.opcaoIndisponivel,
                                    ]}
                                    onPress={
                                        solicitarConfirmacaoPublicacao
                                    }
                                    disabled={
                                        operacaoEmAndamento ||
                                        pesquisandoLocal
                                    }
                                >
                                    {publicandoId ? (
                                        <ActivityIndicator
                                            color="#FFFFFF"
                                        />
                                    ) : (
                                        <Text style={styles.textoPrincipal}>
                                            Continuar
                                        </Text>
                                    )}
                                </Pressable>
                            </View>
                        </ScrollView>
                    </View>
                </View>
            </Modal>
        </>
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
        paddingBottom: 50,
    },

    botaoVoltar: {
        alignSelf: "flex-start",
        paddingVertical: 10,
        marginBottom: 16,
    },

    linkVerde: {
        color: "#276749",
        fontSize: 14,
        fontWeight: "600",
    },

    titulo: {
        fontSize: 28,
        fontWeight: "bold",
        color: "#276749",
    },

    subtitulo: {
        color: "#64746A",
        fontSize: 15,
        lineHeight: 22,
        marginTop: 8,
        marginBottom: 20,
    },

    aviso: {
        backgroundColor: "#E7F1E9",
        borderRadius: 12,
        borderWidth: 1,
        borderColor: "#C5DAC9",
        padding: 16,
        marginBottom: 18,
    },

    avisoTitulo: {
        color: "#276749",
        fontSize: 14,
        fontWeight: "bold",
        marginBottom: 7,
    },

    avisoTexto: {
        color: "#465A4D",
        fontSize: 13,
        lineHeight: 20,
    },

    botaoAtualizar: {
        alignSelf: "flex-start",
        backgroundColor: "#FFFFFF",
        borderWidth: 1,
        borderColor: "#276749",
        borderRadius: 10,
        padding: 12,
        marginBottom: 22,
    },

    estado: {
        alignItems: "center",
        justifyContent: "center",
        paddingVertical: 45,
        gap: 15,
    },

    estadoTitulo: {
        color: "#276749",
        fontSize: 19,
        fontWeight: "bold",
        textAlign: "center",
    },

    textoSecundario: {
        color: "#64746A",
        fontSize: 12,
        lineHeight: 19,
    },

    botaoPrincipal: {
        backgroundColor: "#276749",
        borderRadius: 10,
        paddingVertical: 13,
        paddingHorizontal: 16,
        alignItems: "center",
        marginTop: 10,
    },

    botaoPrincipalFlex: {
        flex: 1,
        backgroundColor: "#276749",
        borderRadius: 10,
        paddingVertical: 13,
        paddingHorizontal: 12,
        justifyContent: "center",
        alignItems: "center",
    },

    textoPrincipal: {
        color: "#FFFFFF",
        fontSize: 14,
        fontWeight: "bold",
        textAlign: "center",
    },

    contador: {
        color: "#64746A",
        fontSize: 14,
        marginBottom: 14,
    },

    card: {
        backgroundColor: "#FFFFFF",
        borderRadius: 16,
        borderWidth: 1,
        borderColor: "#D5DFD5",
        padding: 18,
        marginBottom: 14,
    },

    cardCabecalho: {
        flexDirection: "row",
        justifyContent: "space-between",
        alignItems: "center",
        gap: 12,
        marginBottom: 12,
    },

    categoria: {
        color: "#276749",
        fontSize: 17,
        fontWeight: "bold",
    },

    data: {
        color: "#718078",
        fontSize: 13,
    },

    status: {
        alignSelf: "flex-start",
        borderRadius: 8,
        paddingVertical: 7,
        paddingHorizontal: 11,
        marginBottom: 14,
    },

    statusPublico: {
        backgroundColor: "#DDF2E3",
    },

    statusPrivado: {
        backgroundColor: "#EDF0ED",
    },

    textoStatusPublico: {
        color: "#276749",
        fontSize: 12,
        fontWeight: "bold",
    },

    descricao: {
        color: "#33443A",
        fontSize: 15,
        lineHeight: 23,
        marginBottom: 12,
    },

    botaoEditar: {
        alignSelf: "flex-start",
        padding: 10,
        borderRadius: 9,
        borderWidth: 1,
        borderColor: "#276749",
        backgroundColor: "#F5F8F4",
        marginBottom: 15,
    },

    areaEdicao: {
        marginBottom: 16,
    },

    label: {
        color: "#33443A",
        fontSize: 14,
        fontWeight: "bold",
        marginBottom: 8,
    },

    campo: {
        backgroundColor: "#FFFFFF",
        borderWidth: 1,
        borderColor: "#B5C8BA",
        borderRadius: 10,
        padding: 12,
        fontSize: 14,
        color: "#33443A",
        marginTop: 9,
    },

    campoMultilinha: {
        minHeight: 100,
    },

    contadorEdicao: {
        color: "#718078",
        textAlign: "right",
        fontSize: 12,
        marginTop: 6,
        marginBottom: 14,
    },

    linhaBotoes: {
        flexDirection: "row",
        gap: 10,
        marginTop: 14,
    },

    botaoContorno: {
        flex: 1,
        borderRadius: 10,
        borderWidth: 1,
        borderColor: "#B5C8BA",
        paddingVertical: 13,
        alignItems: "center",
        justifyContent: "center",
    },

    nomeCientifico: {
        color: "#276749",
        fontSize: 15,
        fontStyle: "italic",
        marginBottom: 12,
    },

    cardRodape: {
        borderTopWidth: 1,
        borderTopColor: "#E5EBE5",
        paddingTop: 12,
    },

    botaoComunidade: {
        borderRadius: 11,
        padding: 15,
        marginTop: 18,
        alignItems: "center",
        justifyContent: "center",
        minHeight: 50,
    },

    botaoPublicar: {
        backgroundColor: "#276749",
    },

    botaoRetirar: {
        backgroundColor: "#F2F8F3",
        borderWidth: 1,
        borderColor: "#276749",
    },

    avisoCard: {
        color: "#64746A",
        fontSize: 12,
        lineHeight: 19,
        marginTop: 12,
    },

    botaoExcluir: {
        alignSelf: "flex-start",
        borderWidth: 1,
        borderColor: "#D9A6A3",
        backgroundColor: "#FFF5F4",
        borderRadius: 9,
        padding: 10,
        marginTop: 14,
    },

    textoExcluir: {
        color: "#B42318",
        fontSize: 13,
        fontWeight: "600",
    },

    // ==========================================
    // MODAL DE PUBLICAÇÃO
    // ==========================================

    modalFundo: {
        flex: 1,
        backgroundColor: "#0008",
        justifyContent: "center",
        padding: 18,
    },

    modalCartao: {
        maxHeight: "92%",
        backgroundColor: "#FFFFFF",
        borderRadius: 18,
        overflow: "hidden",
    },

    modalConteudo: {
        padding: 20,
        paddingBottom: 26,
    },

    modalTitulo: {
        color: "#276749",
        fontSize: 22,
        fontWeight: "bold",
    },

    modalSubtitulo: {
        color: "#64746A",
        fontSize: 13,
        lineHeight: 20,
        marginTop: 7,
        marginBottom: 15,
    },

    resumoObservacao: {
        padding: 13,
        backgroundColor: "#F5F8F4",
        borderRadius: 10,
        marginBottom: 17,
    },

    resumoTitulo: {
        color: "#276749",
        fontWeight: "bold",
        fontSize: 14,
        marginBottom: 10,
    },

    opcaoLocalizacao: {
        borderColor: "#D5DFD5",
        borderWidth: 1,
        borderRadius: 11,
        padding: 13,
        marginBottom: 10,
    },

    opcaoSelecionada: {
        borderColor: "#276749",
        backgroundColor: "#E7F1E9",
    },

    opcaoIndisponivel: {
        opacity: 0.45,
    },

    opcaoTitulo: {
        color: "#276749",
        fontSize: 14,
        fontWeight: "bold",
        marginBottom: 5,
    },

    opcaoDescricao: {
        color: "#64746A",
        fontSize: 12,
        lineHeight: 18,
    },

    // ==========================================
    // CONFIRMAÇÃO DE GPS EXATO
    // ==========================================

    alertaExato: {
        backgroundColor: "#FFF5EA",
        borderRadius: 11,
        padding: 14,
        marginBottom: 14,
    },

    alertaTitulo: {
        color: "#9B4809",
        fontSize: 14,
        fontWeight: "bold",
        marginBottom: 8,
    },

    alertaTexto: {
        color: "#68442B",
        fontSize: 12,
        lineHeight: 19,
    },

    confirmacaoLinha: {
        flexDirection: "row",
        gap: 10,
        alignItems: "center",
        marginTop: 12,
    },

    marcacao: {
        color: "#276749",
        fontSize: 23,
    },

    textoConfirmacao: {
        flex: 1,
        color: "#33443A",
        fontSize: 13,
        fontWeight: "600",
        lineHeight: 19,
    },

    // ==========================================
    // BUSCA DE CIDADE OU LOCAL
    // ==========================================

    buscaLocal: {
        backgroundColor: "#F5F8F4",
        borderRadius: 11,
        padding: 13,
        marginBottom: 14,
    },

    resultadoLocal: {
        borderTopColor: "#D5DFD5",
        borderTopWidth: 1,
        paddingVertical: 11,
        gap: 3,
    },

    localEscolhido: {
        backgroundColor: "#E7F1E9",
        borderRadius: 10,
        padding: 12,
        marginTop: 12,
    },

    erroLocal: {
        color: "#A15D16",
        fontSize: 12,
        lineHeight: 19,
        marginTop: 9,
    },

    ajudaOculta: {
        color: "#64746A",
        fontSize: 12,
        lineHeight: 19,
        marginBottom: 15,
    },

    avisoFoto: {
        color: "#64746A",
        fontSize: 12,
        lineHeight: 18,
        marginTop: 5,
    },
});
