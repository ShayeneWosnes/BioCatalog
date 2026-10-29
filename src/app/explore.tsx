
import { router, useFocusEffect } from "expo-router";
import { useCallback, useMemo, useState } from "react";

import {
  ActivityIndicator,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";

import MapaComunidade from "../components/MapaComunidade";

import {
  filtrarObservacoesPorLocal,
  listarLocaisComDescobertas,
  listarObservacoesPublicas,
} from "../services/communityService";

import type {
  ObservacaoPublica,
} from "../services/communityService";

// ==========================================
// TIPOS
// ==========================================

type FiltroCategoria = "todas" | "fauna" | "flora";

// ==========================================
// TELA EXPLORAR
// ==========================================

export default function ExplorarScreen() {
  // ==========================================
  // ESTADOS
  // ==========================================

  const [observacoes, setObservacoes] =
    useState<ObservacaoPublica[]>([]);

  const [carregando, setCarregando] = useState(true);
  const [erro, setErro] = useState<string | null>(null);
  const [atualizacao, setAtualizacao] = useState(0);

  const [filtro, setFiltro] =
    useState<FiltroCategoria>("todas");

  const [pesquisa, setPesquisa] = useState("");

  const [localSelecionadoId, setLocalSelecionadoId] =
    useState<string | null>(null);

  const [selecionadaId, setSelecionadaId] =
    useState<string | null>(null);

  // ==========================================
  // CARREGAR PUBLICAÇÕES
  // ==========================================

  useFocusEffect(
    useCallback(() => {
      let ativo = true;

      async function carregarPublicacoes() {
        setCarregando(true);
        setErro(null);

        try {
          const dados =
            await listarObservacoesPublicas();

          if (ativo) {
            setObservacoes(dados);
          }
        } catch (falha) {
          console.error(
            "Erro ao carregar comunidade:",
            falha
          );

          if (ativo) {
            setErro(
              "Não foi possível carregar as publicações da comunidade."
            );
          }
        } finally {
          if (ativo) {
            setCarregando(false);
          }
        }
      }

      void carregarPublicacoes();

      return () => {
        ativo = false;
      };
    }, [atualizacao])
  );

  function atualizarPublicacoes() {
    setAtualizacao((valor) => valor + 1);
  }

  // ==========================================
  // LOCAIS COM DESCOBERTAS
  // ==========================================

  const locaisComDescobertas = useMemo(() => {
    return listarLocaisComDescobertas(observacoes);
  }, [observacoes]);

  // ==========================================
  // LOCAL SELECIONADO
  // ==========================================

  const localSelecionado = useMemo(() => {
    if (!localSelecionadoId) {
      return null;
    }

    return (
      locaisComDescobertas.find(
        (local) => local.id === localSelecionadoId
      ) ?? null
    );
  }, [locaisComDescobertas, localSelecionadoId]);

  // ==========================================
  // FILTRAR POR LOCAL, CATEGORIA E TEXTO
  // ==========================================

  const observacoesFiltradas = useMemo(() => {
    const termo = pesquisa
      .trim()
      .toLocaleLowerCase("pt-BR");

    // Se um local estiver selecionado, mostrar
    // somente registros associados a ele.
    //
    // Não tentamos adivinhar a associação
    // usando as coordenadas do GPS.

    const base = localSelecionadoId
      ? filtrarObservacoesPorLocal(
        observacoes,
        localSelecionadoId
      )
      : observacoes;

    return base.filter((observacao) => {
      const correspondeCategoria =
        filtro === "todas" ||
        observacao.category === filtro;

      const nome = (
        observacao.scientificName ?? ""
      ).toLocaleLowerCase("pt-BR");

      const descricao = (
        observacao.notes ?? ""
      ).toLocaleLowerCase("pt-BR");

      const correspondePesquisa =
        termo.length === 0 ||
        nome.includes(termo) ||
        descricao.includes(termo);

      return (
        correspondeCategoria &&
        correspondePesquisa
      );
    });
  }, [
    observacoes,
    localSelecionadoId,
    filtro,
    pesquisa,
  ]);

  // ==========================================
  // OBSERVAÇÕES VISÍVEIS NO MAPA
  // ==========================================

  const observacoesNoMapa = useMemo(() => {
    return observacoesFiltradas.filter(
      (observacao) =>
        observacao.publicLocation !== null
    );
  }, [observacoesFiltradas]);

  // ==========================================
  // OBSERVAÇÃO SELECIONADA NO MAPA
  // ==========================================

  const observacaoSelecionada =
    observacoesNoMapa.find(
      (observacao) =>
        observacao.id === selecionadaId
    ) ?? null;

  // ==========================================
  // SELECIONAR UM LOCAL
  // ==========================================

  function selecionarLocal(id: string) {
    setLocalSelecionadoId((atual) =>
      atual === id ? null : id
    );

    // Limpa a pesquisa textual para mostrar
    // todas as descobertas do local.
    setPesquisa("");
    setSelecionadaId(null);
  }

  function limparLocal() {
    setLocalSelecionadoId(null);
    setSelecionadaId(null);
  }

  function limparFiltros() {
    setFiltro("todas");
    setPesquisa("");
    setLocalSelecionadoId(null);
    setSelecionadaId(null);
  }

  // ==========================================
  // FORMATADORES
  // ==========================================

  function formatarData(
    observacao: ObservacaoPublica
  ) {
    return observacao.observedAt
      ?.toDate()
      .toLocaleDateString("pt-BR") ??
      "Data não informada";
  }

  function formatarCategoria(
    observacao: ObservacaoPublica
  ) {
    return observacao.category === "fauna"
      ? "🐝 Fauna"
      : "🌿 Flora";
  }

  function formatarIdentificacao(
    observacao: ObservacaoPublica
  ) {
    return observacao.identificationStatus ===
      "provisional"
      ? "Identificação provisória"
      : "Não identificada";
  }

  function formatarTipoLocal(tipo: string) {
    if (tipo === "cidade") {
      return "🏙️ Cidade";
    }

    if (tipo === "regiao") {
      return "🗺️ Região";
    }

    return "📍 Local de interesse";
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
      {/* ======================================
          VOLTAR
          ====================================== */}

      <Pressable
        style={styles.botaoVoltar}
        onPress={() => router.back()}
      >
        <Text style={styles.textoVoltar}>
          ← Voltar
        </Text>
      </Pressable>

      {/* ======================================
          CABEÇALHO
          ====================================== */}

      <Text style={styles.titulo}>
        🌎 Explorar
      </Text>

      <Text style={styles.subtitulo}>
        Descubra animais e plantas registrados
        pela comunidade BioCatalog.
      </Text>

      {/* ======================================
          PRIVACIDADE
          ====================================== */}

      <View style={styles.aviso}>
        <Text style={styles.avisoTitulo}>
          🌿 Descobertas compartilhadas
        </Text>

        <Text style={styles.avisoTexto}>
          Aqui aparecem somente as observações
          que seus autores decidiram publicar.
          A localização exibida depende da
          opção de compartilhamento escolhida.
        </Text>
      </View>

      {/* ======================================
          ATUALIZAR
          ====================================== */}

      <Pressable
        style={styles.botaoAtualizar}
        onPress={atualizarPublicacoes}
        disabled={carregando}
      >
        <Text style={styles.textoAtualizar}>
          ↻ Atualizar publicações
        </Text>
      </Pressable>

      {/* ======================================
          CARREGAMENTO
          ====================================== */}

      {carregando && (
        <View style={styles.estado}>
          <ActivityIndicator
            size="large"
            color="#276749"
          />

          <Text style={styles.textoEstado}>
            Buscando descobertas da comunidade...
          </Text>
        </View>
      )}

      {/* ======================================
          ERRO
          ====================================== */}

      {!carregando && erro && (
        <View style={styles.estado}>
          <Text style={styles.iconeEstado}>
            ⚠️
          </Text>

          <Text style={styles.estadoTitulo}>
            Não foi possível carregar
          </Text>

          <Text style={styles.textoEstado}>
            {erro}
          </Text>

          <Pressable
            style={styles.botaoPrincipal}
            onPress={atualizarPublicacoes}
          >
            <Text style={styles.textoPrincipal}>
              Tentar novamente
            </Text>
          </Pressable>
        </View>
      )}

      {/* ======================================
          CONTEÚDO DA COMUNIDADE
          ====================================== */}

      {!carregando && !erro && (
        <>
          {/* ==================================
              LOCAIS COM DESCOBERTAS
              ================================== */}

          <View style={styles.secaoLocais}>
            <Text style={styles.secaoTitulo}>
              🌳 Locais com descobertas
            </Text>

            <Text style={styles.secaoSubtitulo}>
              Explore as observações que a
              comunidade associou a cidades,
              parques, instituições e outros lugares.
            </Text>

            {locaisComDescobertas.length === 0 ? (
              <View style={styles.locaisVazios}>
                <Text style={styles.locaisVaziosTitulo}>
                  Nenhum local associado ainda
                </Text>

                <Text style={styles.locaisVaziosTexto}>
                  Quando alguém publicar uma
                  observação escolhendo
                  "Cidade ou local", ela poderá
                  aparecer nesta seção.
                </Text>
              </View>
            ) : (
              <>
                <Text style={styles.contadorLocais}>
                  {locaisComDescobertas.length}{" "}
                  {locaisComDescobertas.length === 1
                    ? "local com descobertas"
                    : "locais com descobertas"}
                </Text>

                {locaisComDescobertas.map((local) => {
                  const selecionado =
                    localSelecionadoId === local.id;

                  return (
                    <Pressable
                      key={local.id}
                      style={[
                        styles.cardLocal,
                        selecionado &&
                        styles.cardLocalSelecionado,
                      ]}
                      onPress={() =>
                        selecionarLocal(local.id)
                      }
                      accessibilityRole="button"
                    >
                      <View style={styles.localCabecalho}>
                        <Text style={styles.localNome}>
                          {local.nome}
                        </Text>

                        <Text style={styles.localSeta}>
                          {selecionado ? "✓" : "›"}
                        </Text>
                      </View>

                      <Text style={styles.localTipo}>
                        {formatarTipoLocal(local.tipo)}
                      </Text>

                      <View style={styles.localEstatisticas}>
                        <Text style={styles.localTotal}>
                          {local.quantidade}{" "}
                          {local.quantidade === 1
                            ? "descoberta"
                            : "descobertas"}
                        </Text>

                        <Text style={styles.localContagem}>
                          🐝 {local.quantidadeFauna} fauna
                        </Text>

                        <Text style={styles.localContagem}>
                          🌿 {local.quantidadeFlora} flora
                        </Text>
                      </View>

                      <Text style={styles.localAcao}>
                        {selecionado
                          ? "Toque para remover o filtro"
                          : "Toque para explorar as descobertas"}
                      </Text>
                    </Pressable>
                  );
                })}
              </>
            )}
          </View>

          {/* ==================================
              FILTRO DE LOCAL SELECIONADO
              ================================== */}

          {localSelecionado && (
            <View style={styles.localAtivo}>
              <View style={styles.localAtivoConteudo}>
                <Text style={styles.localAtivoTitulo}>
                  📍 Explorando: {localSelecionado.nome}
                </Text>

                <Text style={styles.localAtivoDescricao}>
                  Exibindo somente descobertas
                  associadas a este local.
                </Text>
              </View>

              <Pressable
                style={styles.botaoLimparLocal}
                onPress={limparLocal}
              >
                <Text style={styles.textoLimparLocal}>
                  Limpar
                </Text>
              </Pressable>
            </View>
          )}

          {/* ==================================
              PESQUISA POR OBSERVAÇÃO
              ================================== */}

          <Text style={styles.label}>
            Pesquisar descobertas
          </Text>

          <TextInput
            style={styles.campoPesquisa}
            placeholder="Nome científico ou descrição..."
            placeholderTextColor="#87958B"
            value={pesquisa}
            onChangeText={setPesquisa}
            autoCapitalize="none"
            autoCorrect={false}
          />

          {/* ==================================
              FILTROS DE CATEGORIA
              ================================== */}

          <Text style={styles.label}>
            Categoria
          </Text>

          <View style={styles.linhaFiltros}>
            <Pressable
              style={[
                styles.filtro,
                filtro === "todas" &&
                styles.filtroAtivo,
              ]}
              onPress={() => setFiltro("todas")}
            >
              <Text
                style={[
                  styles.textoFiltro,
                  filtro === "todas" &&
                  styles.textoFiltroAtivo,
                ]}
              >
                Todas
              </Text>
            </Pressable>

            <Pressable
              style={[
                styles.filtro,
                filtro === "fauna" &&
                styles.filtroAtivo,
              ]}
              onPress={() => setFiltro("fauna")}
            >
              <Text
                style={[
                  styles.textoFiltro,
                  filtro === "fauna" &&
                  styles.textoFiltroAtivo,
                ]}
              >
                🐝 Fauna
              </Text>
            </Pressable>

            <Pressable
              style={[
                styles.filtro,
                filtro === "flora" &&
                styles.filtroAtivo,
              ]}
              onPress={() => setFiltro("flora")}
            >
              <Text
                style={[
                  styles.textoFiltro,
                  filtro === "flora" &&
                  styles.textoFiltroAtivo,
                ]}
              >
                🌿 Flora
              </Text>
            </Pressable>
          </View>

          {/* ==================================
              NENHUMA DESCOBERTA
              ================================== */}

          {observacoesFiltradas.length === 0 && (
            <View style={styles.estado}>
              <Text style={styles.iconeEstado}>
                🌱
              </Text>

              <Text style={styles.estadoTitulo}>
                Nenhuma descoberta encontrada
              </Text>

              <Text style={styles.textoEstado}>
                {observacoes.length === 0
                  ? "Ainda não existem publicações da comunidade."
                  : localSelecionado
                    ? "Não existem descobertas deste local que correspondam aos filtros."
                    : "Nenhuma observação corresponde aos filtros selecionados."}
              </Text>

              {(localSelecionadoId !== null ||
                filtro !== "todas" ||
                pesquisa.trim().length > 0) && (
                  <Pressable
                    style={styles.botaoPrincipal}
                    onPress={limparFiltros}
                  >
                    <Text style={styles.textoPrincipal}>
                      Limpar filtros
                    </Text>
                  </Pressable>
                )}
            </View>
          )}

          {/* ==================================
              LISTAGEM DAS DESCOBERTAS
              ================================== */}

          {observacoesFiltradas.length > 0 && (
            <>
              <Text style={styles.contador}>
                {observacoesFiltradas.length}{" "}
                {observacoesFiltradas.length === 1
                  ? "descoberta encontrada"
                  : "descobertas encontradas"}
              </Text>

              {observacoesFiltradas.map(
                (observacao) => (
                  <View
                    key={observacao.id}
                    style={styles.card}
                  >
                    <View style={styles.cardCabecalho}>
                      <Text style={styles.categoria}>
                        {formatarCategoria(observacao)}
                      </Text>

                      <Text style={styles.data}>
                        {formatarData(observacao)}
                      </Text>
                    </View>

                    {observacao.scientificName && (
                      <Text style={styles.nomeCientifico}>
                        {observacao.scientificName}
                      </Text>
                    )}

                    <Text style={styles.descricao}>
                      {observacao.notes ||
                        "Observação sem descrição."}
                    </Text>

                    <Text style={styles.identificacao}>
                      {formatarIdentificacao(observacao)}
                    </Text>

                    {/* LOCAL ASSOCIADO */}

                    {observacao.locationMode === "place" &&
                      observacao.publicPlaceName && (
                        <View style={styles.localizacao}>
                          <Text
                            style={styles.textoLocalizacao}
                          >
                            📍 {observacao.publicPlaceName}
                          </Text>

                          <Text style={styles.localizacaoDetalhe}>
                            Local associado pelo autor
                          </Text>
                        </View>
                      )}

                    {/* TIPO DE LOCALIZAÇÃO */}

                    {observacao.locationMode !== "place" && (
                      <View style={styles.localizacao}>
                        <Text
                          style={styles.textoLocalizacao}
                        >
                          {observacao.locationMode === "exact"
                            ? "📍 Localização GPS compartilhada"
                            : observacao.locationMode ===
                              "approximate"
                              ? "🌎 Localização aproximada"
                              : observacao.locationMode ===
                                "hidden"
                                ? "🔒 Localização não compartilhada"
                                : observacao.publicLocation
                                  ? "📍 Localização aproximada (registro antigo)"
                                  : "📍 Sem localização pública"}
                        </Text>
                      </View>
                    )}

                    <View style={styles.rodape}>
                      <Text style={styles.publicacao}>
                        🌎 Compartilhada com a comunidade
                      </Text>
                    </View>
                  </View>
                )
              )}
            </>
          )}

          {/* ==================================
              MAPA DA BIODIVERSIDADE
              ================================== */}

          <View style={styles.secaoMapa}>
            <Text style={styles.mapaTitulo}>
              🗺️ Mapa da biodiversidade
            </Text>

            <Text style={styles.mapaSubtitulo}>
              Pesquise cidades, parques, instituições
              e áreas naturais. Os marcadores mostram
              as descobertas correspondentes aos
              filtros selecionados.
            </Text>

            {/* MANTÉM O MAPA ATUAL */}

            <View style={styles.mapaContainer}>
              <MapaComunidade
                observacoes={observacoesNoMapa}
                onSelecionar={setSelecionadaId}
              />
            </View>

            {/* LEGENDA */}

            <View style={styles.legenda}>
              <Text style={styles.textoLegenda}>
                🟠 Fauna
              </Text>

              <Text style={styles.textoLegenda}>
                🟢 Flora
              </Text>

              <Text style={styles.textoLegenda}>
                🔵 Grupo
              </Text>

              <Text style={styles.textoLegenda}>
                🟣 Local pesquisado
              </Text>
            </View>

            <Text style={styles.avisoMapa}>
              A posição de cada descoberta depende
              da opção de localização autorizada
              pelo autor. Um local associado não
              representa necessariamente a coordenada
              exata da observação.
            </Text>

            {/* SEM MARCADORES */}

            {observacoesNoMapa.length === 0 && (
              <View style={styles.avisoSemMarcadores}>
                <Text style={styles.textoSemMarcadores}>
                  Nenhuma descoberta com localização
                  pública corresponde aos filtros.
                  Você ainda pode pesquisar cidades
                  e lugares no mapa.
                </Text>
              </View>
            )}

            {/* ==================================
                DETALHES DO MARCADOR
                ================================== */}

            {observacaoSelecionada && (
              <View style={styles.detalheMapa}>
                <Text style={styles.detalheTitulo}>
                  📍 Descoberta selecionada
                </Text>

                <Text style={styles.detalheCategoria}>
                  {formatarCategoria(
                    observacaoSelecionada
                  )}
                </Text>

                {observacaoSelecionada.scientificName && (
                  <Text
                    style={styles.detalheNomeCientifico}
                  >
                    {observacaoSelecionada.scientificName}
                  </Text>
                )}

                <Text style={styles.detalheDescricao}>
                  {observacaoSelecionada.notes ||
                    "Sem descrição"}
                </Text>

                <Text style={styles.detalheData}>
                  Observada em{" "}
                  {formatarData(
                    observacaoSelecionada
                  )}
                </Text>

                {observacaoSelecionada.publicPlaceName &&
                  observacaoSelecionada.locationMode ===
                  "place" && (
                    <Text style={styles.detalheAviso}>
                      Local associado:{" "}
                      {observacaoSelecionada.publicPlaceName}
                    </Text>
                  )}

                <Pressable
                  style={styles.botaoFecharDetalhe}
                  onPress={() =>
                    setSelecionadaId(null)
                  }
                >
                  <Text
                    style={styles.textoFecharDetalhe}
                  >
                    Fechar detalhes
                  </Text>
                </Pressable>
              </View>
            )}
          </View>
        </>
      )}
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
    paddingBottom: 55,
  },

  botaoVoltar: {
    alignSelf: "flex-start",
    paddingVertical: 10,
    marginBottom: 14,
  },

  textoVoltar: {
    color: "#276749",
    fontSize: 15,
    fontWeight: "600",
  },

  titulo: {
    fontSize: 29,
    fontWeight: "bold",
    color: "#276749",
  },

  subtitulo: {
    fontSize: 15,
    color: "#64746A",
    lineHeight: 23,
    marginTop: 9,
    marginBottom: 22,
  },

  aviso: {
    backgroundColor: "#E7F1E9",
    borderColor: "#C5DAC9",
    borderWidth: 1,
    borderRadius: 13,
    padding: 16,
    marginBottom: 20,
  },

  avisoTitulo: {
    color: "#276749",
    fontSize: 15,
    fontWeight: "bold",
    marginBottom: 8,
  },

  avisoTexto: {
    color: "#465A4D",
    fontSize: 13,
    lineHeight: 21,
  },

  botaoAtualizar: {
    alignSelf: "flex-start",
    backgroundColor: "#FFFFFF",
    borderWidth: 1,
    borderColor: "#276749",
    borderRadius: 10,
    paddingVertical: 12,
    paddingHorizontal: 16,
    marginBottom: 22,
  },

  textoAtualizar: {
    color: "#276749",
    fontSize: 14,
    fontWeight: "600",
  },

  estado: {
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 35,
    gap: 12,
  },

  iconeEstado: {
    fontSize: 46,
  },

  estadoTitulo: {
    fontSize: 18,
    color: "#276749",
    fontWeight: "bold",
    textAlign: "center",
  },

  textoEstado: {
    color: "#64746A",
    fontSize: 14,
    lineHeight: 22,
    textAlign: "center",
  },

  botaoPrincipal: {
    backgroundColor: "#276749",
    borderRadius: 11,
    paddingVertical: 14,
    paddingHorizontal: 20,
    marginTop: 8,
  },

  textoPrincipal: {
    color: "#FFFFFF",
    fontSize: 14,
    fontWeight: "bold",
    textAlign: "center",
  },

  // ==========================================
  // LOCAIS COM DESCOBERTAS
  // ==========================================

  secaoLocais: {
    marginBottom: 25,
  },

  secaoTitulo: {
    fontSize: 21,
    fontWeight: "bold",
    color: "#276749",
    marginBottom: 9,
  },

  secaoSubtitulo: {
    fontSize: 14,
    lineHeight: 22,
    color: "#64746A",
    marginBottom: 15,
  },

  contadorLocais: {
    fontSize: 13,
    color: "#64746A",
    marginBottom: 12,
  },

  cardLocal: {
    backgroundColor: "#FFFFFF",
    borderRadius: 14,
    borderWidth: 1,
    borderColor: "#D5DFD5",
    padding: 15,
    marginBottom: 11,
  },

  cardLocalSelecionado: {
    borderColor: "#276749",
    borderWidth: 2,
    backgroundColor: "#E7F1E9",
  },

  localCabecalho: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 10,
  },

  localNome: {
    flex: 1,
    color: "#276749",
    fontWeight: "bold",
    fontSize: 16,
  },

  localSeta: {
    color: "#276749",
    fontSize: 23,
    fontWeight: "bold",
  },

  localTipo: {
    color: "#64746A",
    fontSize: 12,
    marginTop: 5,
    marginBottom: 13,
  },

  localEstatisticas: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 12,
    alignItems: "center",
  },

  localTotal: {
    color: "#276749",
    fontSize: 13,
    fontWeight: "bold",
  },

  localContagem: {
    color: "#465A4D",
    fontSize: 12,
  },

  localAcao: {
    color: "#64746A",
    fontSize: 12,
    marginTop: 12,
  },

  locaisVazios: {
    borderRadius: 12,
    backgroundColor: "#FFFFFF",
    borderWidth: 1,
    borderColor: "#D5DFD5",
    padding: 17,
  },

  locaisVaziosTitulo: {
    color: "#276749",
    fontSize: 15,
    fontWeight: "bold",
    marginBottom: 8,
  },

  locaisVaziosTexto: {
    color: "#64746A",
    fontSize: 13,
    lineHeight: 20,
  },

  localAtivo: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    padding: 13,
    borderRadius: 11,
    borderWidth: 1,
    borderColor: "#C5DAC9",
    backgroundColor: "#E7F1E9",
    marginBottom: 22,
  },

  localAtivoConteudo: {
    flex: 1,
  },

  localAtivoTitulo: {
    color: "#276749",
    fontSize: 14,
    fontWeight: "bold",
  },

  localAtivoDescricao: {
    color: "#64746A",
    fontSize: 12,
    lineHeight: 18,
    marginTop: 4,
  },

  botaoLimparLocal: {
    padding: 8,
  },

  textoLimparLocal: {
    color: "#276749",
    fontSize: 13,
    fontWeight: "bold",
  },

  // ==========================================
  // PESQUISA E FILTROS
  // ==========================================

  label: {
    fontSize: 16,
    fontWeight: "bold",
    color: "#33443A",
    marginBottom: 12,
  },

  campoPesquisa: {
    backgroundColor: "#FFFFFF",
    borderColor: "#D5DFD5",
    borderWidth: 1,
    borderRadius: 12,
    paddingVertical: 14,
    paddingHorizontal: 16,
    fontSize: 15,
    color: "#33443A",
    marginBottom: 24,
  },

  linhaFiltros: {
    flexDirection: "row",
    gap: 9,
    marginBottom: 22,
  },

  filtro: {
    flex: 1,
    backgroundColor: "#FFFFFF",
    borderWidth: 1,
    borderColor: "#C5D4C9",
    borderRadius: 10,
    paddingVertical: 12,
    alignItems: "center",
  },

  filtroAtivo: {
    backgroundColor: "#276749",
    borderColor: "#276749",
  },

  textoFiltro: {
    fontSize: 13,
    fontWeight: "600",
    color: "#276749",
  },

  textoFiltroAtivo: {
    color: "#FFFFFF",
  },

  // ==========================================
  // CARDS DAS OBSERVAÇÕES
  // ==========================================

  contador: {
    color: "#64746A",
    fontSize: 14,
    marginBottom: 14,
  },

  card: {
    backgroundColor: "#FFFFFF",
    borderWidth: 1,
    borderColor: "#D5DFD5",
    borderRadius: 16,
    padding: 18,
    marginBottom: 15,
  },

  cardCabecalho: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 12,
    marginBottom: 14,
  },

  categoria: {
    fontSize: 16,
    fontWeight: "bold",
    color: "#276749",
  },

  data: {
    fontSize: 13,
    color: "#718078",
  },

  nomeCientifico: {
    fontSize: 17,
    fontStyle: "italic",
    fontWeight: "600",
    color: "#276749",
    marginBottom: 12,
  },

  descricao: {
    fontSize: 15,
    color: "#33443A",
    lineHeight: 23,
    marginBottom: 14,
  },

  identificacao: {
    fontSize: 12,
    color: "#718078",
    marginBottom: 14,
  },

  localizacao: {
    backgroundColor: "#F2F7F2",
    padding: 12,
    borderRadius: 9,
    marginBottom: 14,
  },

  textoLocalizacao: {
    fontSize: 13,
    fontWeight: "600",
    color: "#276749",
  },

  localizacaoDetalhe: {
    color: "#718078",
    fontSize: 12,
    marginTop: 5,
  },

  rodape: {
    borderTopWidth: 1,
    borderTopColor: "#E5EBE5",
    paddingTop: 12,
  },

  publicacao: {
    fontSize: 12,
    color: "#64746A",
  },

  // ==========================================
  // MAPA
  // ==========================================

  secaoMapa: {
    backgroundColor: "#FFFFFF",
    borderWidth: 1,
    borderColor: "#D5DFD5",
    borderRadius: 16,
    padding: 16,
    marginTop: 24,
  },

  mapaTitulo: {
    color: "#276749",
    fontSize: 20,
    fontWeight: "bold",
    marginBottom: 9,
  },

  mapaSubtitulo: {
    color: "#64746A",
    fontSize: 14,
    lineHeight: 22,
    marginBottom: 18,
  },

  mapaContainer: {
    width: "100%",
    height: 520,
    borderRadius: 12,
    overflow: "hidden",
    borderWidth: 1,
    borderColor: "#D5DFD5",
    padding: 10,
    backgroundColor: "#FFFFFF",
  },

  legenda: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 18,
    marginTop: 14,
    marginBottom: 10,
  },

  textoLegenda: {
    color: "#33443A",
    fontSize: 13,
    fontWeight: "600",
  },

  avisoMapa: {
    color: "#718078",
    fontSize: 12,
    lineHeight: 19,
  },

  avisoSemMarcadores: {
    backgroundColor: "#F2F7F2",
    borderRadius: 10,
    padding: 14,
    marginTop: 14,
  },

  textoSemMarcadores: {
    color: "#64746A",
    fontSize: 13,
    lineHeight: 20,
  },

  // ==========================================
  // DETALHES DO MARCADOR
  // ==========================================

  detalheMapa: {
    backgroundColor: "#F2F7F2",
    borderWidth: 1,
    borderColor: "#C5DAC9",
    borderRadius: 12,
    padding: 16,
    marginTop: 18,
  },

  detalheTitulo: {
    fontSize: 16,
    fontWeight: "bold",
    color: "#276749",
    marginBottom: 14,
  },

  detalheCategoria: {
    fontSize: 14,
    fontWeight: "bold",
    color: "#276749",
    marginBottom: 10,
  },

  detalheNomeCientifico: {
    fontSize: 16,
    fontStyle: "italic",
    color: "#276749",
    marginBottom: 10,
  },

  detalheDescricao: {
    fontSize: 14,
    color: "#33443A",
    lineHeight: 22,
    marginBottom: 10,
  },

  detalheData: {
    fontSize: 13,
    color: "#64746A",
    marginBottom: 8,
  },

  detalheAviso: {
    fontSize: 12,
    color: "#718078",
    lineHeight: 19,
    marginTop: 8,
  },

  botaoFecharDetalhe: {
    alignSelf: "flex-start",
    marginTop: 15,
    paddingVertical: 10,
    paddingHorizontal: 14,
    borderWidth: 1,
    borderColor: "#276749",
    borderRadius: 9,
  },

  textoFecharDetalhe: {
    fontSize: 13,
    fontWeight: "bold",
    color: "#276749",
  },
});
