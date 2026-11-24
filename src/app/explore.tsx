
import { router, useFocusEffect } from "expo-router";
import { useCallback, useMemo, useState } from "react";

import {
  ActivityIndicator,
  Image,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";

import MapaBiodiversidade from "../components/MapaBiodiversidade";
import { supabase } from "../config/supabase";

import {
  filtrarObservacoesPorLocal,
  listarLocaisComDescobertas,
  listarObservacoesPublicas,
} from "../services/communityService";

import type {
  ObservacaoPublica,
} from "../services/communityService";

// CONFIGURAÇÕES

const BUCKET_COMUNIDADE = "biocatalog-community-photos";

type FiltroCategoria = "todas" | "fauna" | "flora";
type AbaExploracao = "catalogo" | "mapa";

// FOTO PÚBLICA

function FotoPublica({ caminho }: { caminho: string }) {
  const [falhaImagem, setFalhaImagem] = useState(false);

  const url = useMemo(() => {
    // O caminho já foi validado no serviço.
    // O bucket comunitário é público.
    const resultado = supabase.storage
      .from(BUCKET_COMUNIDADE)
      .getPublicUrl(caminho);

    return resultado.data.publicUrl;
  }, [caminho]);

  if (!url || falhaImagem) {
    return (
      <View style={styles.fotoIndisponivel}>
        <Text style={styles.fotoIndisponivelTexto}>
          Fotografia indisponível
        </Text>
      </View>
    );
  }

  return (
    <View style={styles.fotoContainer}>
      <Image
        source={{ uri: url }}
        style={styles.fotoPublica}
        resizeMode="cover"
        accessibilityLabel="Fotografia compartilhada pelo autor da observação"
        onError={() => setFalhaImagem(true)}
      />

      <View style={styles.fotoLegenda}>
        <Text style={styles.fotoLegendaTexto}>
          Fotografia compartilhada pelo autor
        </Text>
      </View>
    </View>
  );
}

// TELA EXPLORAR BIODIVERSIDADE

export default function ExplorarScreen() {
  const [abaAtiva, setAbaAtiva] =
    useState<AbaExploracao>("catalogo");

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

  // CARREGAR PUBLICAÇÕES

  useFocusEffect(
    useCallback(() => {
      let ativo = true;

      async function carregarPublicacoes() {
        setCarregando(true);
        setErro(null);

        try {
          const dados = await listarObservacoesPublicas();

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

  // LOCAIS COM DESCOBERTAS

  const locaisComDescobertas = useMemo(
    () => listarLocaisComDescobertas(observacoes),
    [observacoes]
  );

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

  // FILTROS COMPARTILHADOS

  const observacoesFiltradas = useMemo(() => {
    const termo = pesquisa
      .trim()
      .toLocaleLowerCase("pt-BR");

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
        !termo ||
        nome.includes(termo) ||
        descricao.includes(termo);

      return correspondeCategoria && correspondePesquisa;
    });
  }, [
    observacoes,
    localSelecionadoId,
    filtro,
    pesquisa,
  ]);

  // MARCADORES DO MAPA

  const marcadores = useMemo(() => {
    return observacoesFiltradas.flatMap((observacao) => {
      const local = observacao.publicLocation;

      if (
        !local ||
        observacao.locationMode === "hidden" ||
        !Number.isFinite(local.latitude) ||
        !Number.isFinite(local.longitude) ||
        Math.abs(local.latitude) > 90 ||
        Math.abs(local.longitude) > 180
      ) {
        return [];
      }

      return [
        {
          id: observacao.id,
          category: observacao.category,
          latitude: local.latitude,
          longitude: local.longitude,
          scientificName: observacao.scientificName,
          notes: observacao.notes ?? "",
          locationMode: observacao.locationMode,
          publicPlaceName: observacao.publicPlaceName,
        },
      ];
    });
  }, [observacoesFiltradas]);

  // AÇÕES DOS FILTROS

  function selecionarLocal(id: string) {
    setLocalSelecionadoId((atual) =>
      atual === id ? null : id
    );
    setPesquisa("");
  }

  function limparLocal() {
    setLocalSelecionadoId(null);
  }

  function limparFiltros() {
    setFiltro("todas");
    setPesquisa("");
    setLocalSelecionadoId(null);
  }

  const filtrosAtivos =
    filtro !== "todas" ||
    pesquisa.trim().length > 0 ||
    localSelecionadoId !== null;

  // FORMATADORES

  function formatarData(
    observacao: ObservacaoPublica
  ) {
    return (
      observacao.observedAt
        ?.toDate()
        .toLocaleDateString("pt-BR") ??
      "Data não informada"
    );
  }

  function formatarCategoria(
    observacao: ObservacaoPublica
  ) {
    return observacao.category === "fauna"
      ? "Fauna"
      : "Flora";
  }

  function formatarIdentificacao(
    observacao: ObservacaoPublica
  ) {
    return observacao.identificationStatus === "provisional"
      ? "Identificação provisória"
      : "Não identificada";
  }

  function formatarTipoLocal(tipo: string) {
    if (tipo === "cidade") {
      return "Cidade";
    }

    if (tipo === "regiao") {
      return "Região";
    }

    return "Local de interesse";
  }

  function formatarLocalizacao(
    observacao: ObservacaoPublica
  ) {
    if (observacao.locationMode === "exact") {
      return "Localização GPS compartilhada";
    }

    if (observacao.locationMode === "approximate") {
      return "Localização aproximada";
    }

    if (observacao.locationMode === "hidden") {
      return "Localização não compartilhada";
    }

    return observacao.publicLocation
      ? "Localização aproximada (registro antigo)"
      : "Sem localização pública";
  }

  // INTERFACE

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
        Explorar Biodiversidade
      </Text>

      <Text style={styles.subtitulo}>
        Descubra animais e plantas registrados
        pela comunidade BioCatalog.
      </Text>

      {/* AVISO DE PRIVACIDADE */}

      <View style={styles.aviso}>
        <Text style={styles.avisoTitulo}>
          🌿 Descobertas compartilhadas
        </Text>

        <Text style={styles.avisoTexto}>
          Aqui aparecem somente observações
          que seus autores decidiram publicar.
          A localização exibida depende da
          opção de compartilhamento escolhida.
          As fotografias só aparecem quando
          seu compartilhamento foi autorizado.
        </Text>
      </View>

      {/* ATUALIZAR */}

      <Pressable
        style={styles.botaoAtualizar}
        onPress={atualizarPublicacoes}
        disabled={carregando}
      >
        <Text style={styles.textoAtualizar}>
          ↻ Atualizar publicações
        </Text>
      </Pressable>

      {/* CARREGANDO */}

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

      {/* ERRO */}

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

      {/* CONTEÚDO DA COMUNIDADE */}

      {!carregando && !erro && (
        <>
          {/* ABAS */}

          <View style={styles.abasExploracao}>
            <Pressable
              style={[
                styles.abaExploracao,
                abaAtiva === "catalogo" &&
                styles.abaExploracaoAtiva,
              ]}
              onPress={() => setAbaAtiva("catalogo")}
              accessibilityRole="button"
            >
              <Text
                style={[
                  styles.textoAbaExploracao,
                  abaAtiva === "catalogo" &&
                  styles.textoAbaExploracaoAtiva,
                ]}
              >
                Catálogo
              </Text>
            </Pressable>

            <Pressable
              style={[
                styles.abaExploracao,
                abaAtiva === "mapa" &&
                styles.abaExploracaoAtiva,
              ]}
              onPress={() => setAbaAtiva("mapa")}
              accessibilityRole="button"
            >
              <Text
                style={[
                  styles.textoAbaExploracao,
                  abaAtiva === "mapa" &&
                  styles.textoAbaExploracaoAtiva,
                ]}
              >
                📍 Mapa
              </Text>
            </Pressable>
          </View>

          {/* PESQUISA COMPARTILHADA */}

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

          {/* FILTROS COMPARTILHADOS */}

          <Text style={styles.label}>
            Categoria
          </Text>

          <View style={styles.linhaFiltros}>
            {(
              [
                ["todas", "Todas"],
                ["fauna", "Fauna"],
                ["flora", "Flora"],
              ] as const
            ).map(([valor, titulo]) => (
              <Pressable
                key={valor}
                style={[
                  styles.filtro,
                  filtro === valor && styles.filtroAtivo,
                ]}
                onPress={() => setFiltro(valor)}
              >
                <Text
                  style={[
                    styles.textoFiltro,
                    filtro === valor &&
                    styles.textoFiltroAtivo,
                  ]}
                >
                  {titulo}
                </Text>
              </Pressable>
            ))}
          </View>

          {/* LOCAL SELECIONADO */}

          {localSelecionado && (
            <View style={styles.localAtivo}>
              <View style={styles.localAtivoConteudo}>
                <Text style={styles.localAtivoTitulo}>
                  📍 Explorando: {localSelecionado.nome}
                </Text>

                <Text style={styles.localAtivoDescricao}>
                  Somente descobertas associadas a este local.
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

          {/* LIMPAR FILTROS */}

          {filtrosAtivos && (
            <Pressable
              style={styles.botaoLimparFiltros}
              onPress={limparFiltros}
            >
              <Text style={styles.textoLimparFiltros}>
                ✕ Limpar todos os filtros
              </Text>
            </Pressable>
          )}

          {/* ABA CATÁLOGO */}

          {abaAtiva === "catalogo" && (
            <>
              {/* LOCAIS COM DESCOBERTAS */}

              <View style={styles.secaoLocais}>
                <Text style={styles.secaoTitulo}>
                  Locais com descobertas
                </Text>

                <Text style={styles.secaoSubtitulo}>
                  Explore registros associados a cidades,
                  parques, instituições e outros lugares.
                </Text>

                {locaisComDescobertas.length === 0 ? (
                  <View style={styles.locaisVazios}>
                    <Text style={styles.locaisVaziosTitulo}>
                      Nenhum local associado ainda
                    </Text>

                    <Text style={styles.locaisVaziosTexto}>
                      Quando alguém publicar uma observação
                      escolhendo "Cidade ou local", ela
                      poderá aparecer nesta seção.
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

              {/* CATÁLOGO */}

              <Text style={styles.secaoTitulo}>
                Catálogo da comunidade
              </Text>

              {observacoesFiltradas.length === 0 ? (
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
                      : "Nenhuma observação corresponde aos filtros selecionados."}
                  </Text>
                </View>
              ) : (
                <>
                  <Text style={styles.contador}>
                    {observacoesFiltradas.length}{" "}
                    {observacoesFiltradas.length === 1
                      ? "descoberta encontrada"
                      : "descobertas encontradas"}
                  </Text>

                  {/* CARDS DAS OBSERVAÇÕES */}

                  {observacoesFiltradas.map((observacao) => (
                    <View
                      key={observacao.id}
                      style={styles.card}
                    >
                      {/* FOTOGRAFIA PÚBLICA */}

                      {observacao.publicPhotoPath && (
                        <FotoPublica
                          key={observacao.publicPhotoPath}
                          caminho={observacao.publicPhotoPath}
                        />
                      )}

                      {/* CATEGORIA E DATA */}

                      <View style={styles.cardCabecalho}>
                        <Text style={styles.categoria}>
                          {formatarCategoria(observacao)}
                        </Text>

                        <Text style={styles.data}>
                          {formatarData(observacao)}
                        </Text>
                      </View>

                      {/* NOME CIENTÍFICO */}

                      {observacao.scientificName && (
                        <Text style={styles.nomeCientifico}>
                          {observacao.scientificName}
                        </Text>
                      )}

                      {/* DESCRIÇÃO */}

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
                            <Text style={styles.textoLocalizacao}>
                              📍 {observacao.publicPlaceName}
                            </Text>

                            <Text style={styles.localizacaoDetalhe}>
                              Local associado pelo autor
                            </Text>
                          </View>
                        )}

                      {/* OUTROS MODOS DE LOCALIZAÇÃO */}

                      {observacao.locationMode !== "place" && (
                        <View style={styles.localizacao}>
                          <Text style={styles.textoLocalizacao}>
                            {formatarLocalizacao(observacao)}
                          </Text>
                        </View>
                      )}

                      {/* RODAPÉ */}

                      <View style={styles.rodape}>
                        <Text style={styles.publicacao}>
                          Compartilhada com a comunidade
                        </Text>
                      </View>
                    </View>
                  ))}
                </>
              )}
            </>
          )}

          {/* ABA MAPA */}

          {abaAtiva === "mapa" && (
            <View style={styles.secaoMapa}>
              <Text style={styles.mapaTitulo}>
                🗺️ Mapa da Biodiversidade
              </Text>

              <Text style={styles.mapaSubtitulo}>
                Visualize as descobertas compartilhadas
                pela comunidade. Os marcadores respeitam
                os filtros de pesquisa e categoria.
              </Text>

              <MapaBiodiversidade
                observacoes={marcadores}
              />

              <Text style={styles.avisoMapa}>
                O mapa exibe apenas observações com
                coordenadas públicas. Registros sem
                localização compartilhada continuam
                disponíveis no Catálogo.
              </Text>
            </View>
          )}
        </>
      )}
    </ScrollView>
  );
}

// ESTILOS

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#F5F8F4",
  },

  conteudo: {
    padding: 20,
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
    fontSize: 28,
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

  // ABAS

  abasExploracao: {
    flexDirection: "row",
    backgroundColor: "#E7F1E9",
    borderRadius: 13,
    padding: 5,
    marginBottom: 24,
    gap: 5,
  },

  abaExploracao: {
    flex: 1,
    paddingVertical: 14,
    alignItems: "center",
    justifyContent: "center",
    borderRadius: 10,
  },

  abaExploracaoAtiva: {
    backgroundColor: "#276749",
  },

  textoAbaExploracao: {
    fontSize: 15,
    fontWeight: "600",
    color: "#276749",
  },

  textoAbaExploracaoAtiva: {
    color: "#FFFFFF",
  },

  // PESQUISA E FILTROS

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
    marginBottom: 18,
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

  botaoLimparFiltros: {
    alignSelf: "flex-start",
    paddingVertical: 10,
    marginBottom: 16,
  },

  textoLimparFiltros: {
    color: "#276749",
    fontSize: 13,
    fontWeight: "600",
  },

  // LOCAIS COM DESCOBERTAS

  secaoLocais: {
    marginBottom: 25,
  },

  secaoTitulo: {
    fontSize: 20,
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
    marginBottom: 12,
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

  // CARDS DAS OBSERVAÇÕES

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
    overflow: "hidden",
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

  // FOTOGRAFIA PÚBLICA

  fotoContainer: {
    overflow: "hidden",
    borderRadius: 12,
    backgroundColor: "#EDF3EE",
    marginBottom: 16,
  },

  fotoPublica: {
    width: "100%",
    height: 230,
  },

  fotoLegenda: {
    paddingVertical: 9,
    paddingHorizontal: 12,
    backgroundColor: "#EDF3EE",
  },

  fotoLegendaTexto: {
    fontSize: 12,
    color: "#465A4D",
  },

  fotoIndisponivel: {
    backgroundColor: "#F2F7F2",
    borderRadius: 10,
    padding: 18,
    marginBottom: 15,
    alignItems: "center",
  },

  fotoIndisponivelTexto: {
    fontSize: 13,
    color: "#718078",
  },

  // MAPA DA BIODIVERSIDADE

  secaoMapa: {
    backgroundColor: "#FFFFFF",
    borderWidth: 1,
    borderColor: "#D5DFD5",
    borderRadius: 16,
    padding: 12,
    marginTop: 8,
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

  avisoMapa: {
    color: "#718078",
    fontSize: 12,
    lineHeight: 19,
    marginTop: 14,
  },
});
