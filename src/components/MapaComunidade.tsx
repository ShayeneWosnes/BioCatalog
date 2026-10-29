
import { useMemo, useState } from "react";

import {
    ActivityIndicator,
    Pressable,
    ScrollView,
    StyleSheet,
    Text,
    TextInput,
    View,
} from "react-native";

import { WebView } from "react-native-webview";

import type {
    ObservacaoPublica,
} from "../services/communityService";

import {
    pesquisarLugares,
} from "../services/placeSearchService";

import type {
    LugarEncontrado,
} from "../services/placeSearchService";

// ==========================================
// PROPRIEDADES DO COMPONENTE
// ==========================================

interface Props {
    observacoes: ObservacaoPublica[];
    onSelecionar: (id: string) => void;
}

// ==========================================
// GERAR O HTML DO MAPA
// ==========================================

function gerarHTMLMapa(
    observacoes: ObservacaoPublica[],
    lugarSelecionado: LugarEncontrado | null
): string {
    const pontos = observacoes
        .filter(
            (item) => item.publicLocation !== null
        )
        .map((item) => ({
            id: item.id,

            latitude: item.publicLocation!.latitude,
            longitude: item.publicLocation!.longitude,

            categoria: item.category,

            titulo:
                item.scientificName ??
                (item.category === "fauna"
                    ? "Observação de fauna"
                    : "Observação de flora"),
        }));

    // Somente dados públicos são enviados
    // ao mapa. Nunca usamos exactLocation.

    const dadosSeguros = JSON.stringify({
        pontos,
        lugar: lugarSelecionado,
    })
        .replace(/</g, "\\u003c")
        .replace(/\u2028/g, "\\u2028")
        .replace(/\u2029/g, "\\u2029");

    return `
<!DOCTYPE html>
<html lang="pt-BR">
<head>
  <meta charset="UTF-8" />

  <meta
    name="viewport"
    content="width=device-width, initial-scale=1.0"
  />

  <link
    rel="stylesheet"
    href="https://unpkg.com/leaflet@1.9.4/dist/leaflet.css"
  />

  <style>
    html, body, #mapa {
      margin: 0;
      padding: 0;
      width: 100%;
      height: 100%;
    }

    body {
      background: #F5F8F4;
    }

    .leaflet-container {
      font-family: Arial, sans-serif;
    }

    .leaflet-popup-content {
      min-width: 170px;
      max-width: 230px;
    }

    .bio-button {
      display: block;
      width: 100%;
      margin-top: 7px;
      padding: 10px;

      border: 1px solid #C5DAC9;
      border-radius: 8px;

      background: #E7F1E9;
      color: #276749;

      font-size: 13px;
      text-align: left;
      overflow-wrap: anywhere;
    }

    .bio-pin {
      width: 32px;
      height: 32px;

      display: flex;
      align-items: center;
      justify-content: center;

      box-sizing: border-box;
      border-radius: 50%;
      border: 3px solid white;

      color: white;
      font-weight: bold;
      font-size: 13px;

      box-shadow: 0 1px 4px #5558;
    }

    .bio-pin-frame {
      border: none;
      background: transparent;
    }
  </style>
</head>

<body>
  <div id="mapa"></div>

  <script src="https://unpkg.com/leaflet@1.9.4/dist/leaflet.js"></script>

  <script>
    (function () {
      const dados = ${dadosSeguros};

      const pontos = dados.pontos;
      const lugar = dados.lugar;

      function enviar(tipo, id) {
        if (window.ReactNativeWebView) {
          window.ReactNativeWebView.postMessage(
            JSON.stringify({ tipo, id })
          );
        }
      }

      try {
        if (typeof L === "undefined") {
          enviar("erro", "Leaflet indisponível");
          return;
        }

        // ====================================
        // CRIAR O MAPA
        // ====================================

        const mapa = L.map("mapa", {
          zoomControl: true,
          scrollWheelZoom: false
        });

        L.tileLayer(
          "https://tile.openstreetmap.org/{z}/{x}/{y}.png",
          {
            maxZoom: 19,
            attribution:
              '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
          }
        ).addTo(mapa);

        // ====================================
        // AGRUPAR OBSERVAÇÕES PÚBLICAS
        // ====================================

        const grupos = new Map();

        pontos.forEach(function(ponto) {
          const chave =
            ponto.latitude + ":" +
            ponto.longitude;

          if (!grupos.has(chave)) {
            grupos.set(chave, []);
          }

          grupos.get(chave).push(ponto);
        });

        // ====================================
        // MARCADORES DAS OBSERVAÇÕES
        // ====================================

        grupos.forEach(function(grupo) {
          const primeiro = grupo[0];

          const possuiVarias =
            grupo.length > 1;

          const cor = possuiVarias
            ? "#3979B0"
            : primeiro.categoria === "fauna"
              ? "#C37B2C"
              : "#276749";

          const icone = L.divIcon({
            className: "bio-pin-frame",

            html:
              '<div class="bio-pin" style="background:' +
              cor +
              '">' +
              (possuiVarias
                ? String(grupo.length)
                : "") +
              '</div>',

            iconSize: [32, 32],
            iconAnchor: [16, 16]
          });

          const marcador = L.marker(
            [
              primeiro.latitude,
              primeiro.longitude
            ],
            { icon: icone }
          ).addTo(mapa);

          const conteudo =
            document.createElement("div");

          if (possuiVarias) {
            const titulo =
              document.createElement("strong");

            titulo.textContent =
              grupo.length +
              " descobertas nesta região";

            conteudo.appendChild(titulo);
          }

          grupo.forEach(function(item) {
            const botao =
              document.createElement("button");

            botao.type = "button";
            botao.className = "bio-button";

            botao.textContent =
              (item.categoria === "fauna"
                ? "🐝 "
                : "🌿 ") +
              item.titulo;

            botao.addEventListener(
              "click",
              function() {
                enviar("selecionar", item.id);
              }
            );

            conteudo.appendChild(botao);
          });

          marcador.bindPopup(conteudo);

          if (!possuiVarias) {
            marcador.on("click", function() {
              enviar("selecionar", primeiro.id);
            });
          }
        });

        // ====================================
        // POSICIONAR O MAPA NO LOCAL BUSCADO
        // ====================================

        if (lugar) {

          // Contorno roxo indica o lugar
          // pesquisado, não uma observação.

          const destaque = L.circleMarker(
            [lugar.latitude, lugar.longitude],
            {
              radius: 12,
              color: "#8055BA",
              weight: 4,
              fillColor: "#FFFFFF",
              fillOpacity: 0.5
            }
          ).addTo(mapa);

          const conteudoLugar =
            document.createElement("div");

          const tituloLugar =
            document.createElement("strong");

          tituloLugar.textContent =
            "📍 Local pesquisado";

          const nomeLugar =
            document.createElement("p");

          nomeLugar.textContent = lugar.nome;

          conteudoLugar.appendChild(
            tituloLugar
          );

          conteudoLugar.appendChild(
            nomeLugar
          );

          destaque.bindPopup(conteudoLugar);

          // Utilizar limites geográficos
          // retornados pelo Nominatim.

          if (
            lugar.limites &&
            lugar.limites.length === 4
          ) {
            const sul = lugar.limites[0];
            const norte = lugar.limites[1];
            const oeste = lugar.limites[2];
            const leste = lugar.limites[3];

            if (
              sul < norte &&
              oeste < leste
            ) {
              mapa.fitBounds(
                [
                  [sul, oeste],
                  [norte, leste]
                ],
                {
                  padding: [20, 20],
                  maxZoom: 15
                }
              );
            } else {
              mapa.setView(
                [lugar.latitude, lugar.longitude],
                13
              );
            }
          } else {
            const zoom =
              lugar.tipo === "cidade"
                ? 12
                : lugar.tipo === "regiao"
                  ? 11
                  : 15;

            mapa.setView(
              [lugar.latitude, lugar.longitude],
              zoom
            );
          }

        } else if (pontos.length > 0) {

          // Sem pesquisa: centralizar
          // automaticamente nas publicações.

          const coordenadas = pontos.map(
            function(ponto) {
              return [
                ponto.latitude,
                ponto.longitude
              ];
            }
          );

          const limites =
            L.latLngBounds(coordenadas);

          const mesmoPonto =
            limites.getNorthEast().equals(
              limites.getSouthWest()
            );

          if (mesmoPonto) {
            mapa.setView(
              limites.getCenter(),
              10
            );
          } else {
            mapa.fitBounds(limites, {
              padding: [30, 30],
              maxZoom: 11
            });
          }

        } else {
          mapa.setView([0, 0], 2);
        }

        setTimeout(function() {
          mapa.invalidateSize();
        }, 300);

        enviar("pronto", "");

      } catch (erro) {
        enviar(
          "erro",
          String(
            erro && erro.message
              ? erro.message
              : erro
          )
        );
      }
    })();
  </script>
</body>
</html>
`;
}

// ==========================================
// COMPONENTE MAPA COM PESQUISA
// ==========================================

export default function MapaComunidade({
    observacoes,
    onSelecionar,
}: Props) {

    // ==========================================
    // ESTADOS DA PESQUISA
    // ==========================================

    const [pesquisa, setPesquisa] =
        useState("");

    const [resultados, setResultados] =
        useState<LugarEncontrado[]>([]);

    const [pesquisando, setPesquisando] =
        useState(false);

    const [erroBusca, setErroBusca] =
        useState<string | null>(null);

    const [lugarSelecionado, setLugarSelecionado] =
        useState<LugarEncontrado | null>(null);

    const [erroMapa, setErroMapa] =
        useState(false);

    // ==========================================
    // HTML DO MAPA
    // ==========================================

    const htmlMapa = useMemo(
        () =>
            gerarHTMLMapa(
                observacoes,
                lugarSelecionado
            ),
        [observacoes, lugarSelecionado]
    );

    // ==========================================
    // PESQUISAR LUGARES
    // ==========================================

    async function buscarLugares() {
        if (pesquisando) return;

        setPesquisando(true);
        setErroBusca(null);
        setResultados([]);

        try {
            const encontrados =
                await pesquisarLugares(pesquisa);

            setResultados(encontrados);

            if (encontrados.length === 0) {
                setErroBusca(
                    "Nenhum local encontrado. Tente informar a cidade e o estado."
                );
            }
        } catch (falha) {
            setErroBusca(
                falha instanceof Error
                    ? falha.message
                    : "Não foi possível pesquisar o local."
            );
        } finally {
            setPesquisando(false);
        }
    }

    // ==========================================
    // SELECIONAR LUGAR
    // ==========================================

    function selecionarLugar(
        lugar: LugarEncontrado
    ) {
        setLugarSelecionado(lugar);
        setPesquisa(lugar.nome);
        setResultados([]);
        setErroBusca(null);
        setErroMapa(false);
    }

    // ==========================================
    // VOLTAR PARA AS OBSERVAÇÕES
    // ==========================================

    function limparLugar() {
        setLugarSelecionado(null);
        setPesquisa("");
        setResultados([]);
        setErroBusca(null);
        setErroMapa(false);
    }

    // ==========================================
    // INTERFACE
    // ==========================================

    return (
        <View style={styles.container}>

            {/* PESQUISA GEOGRÁFICA */}

            <Text style={styles.tituloBusca}>
                📍 Pesquisar cidade ou local
            </Text>

            <Text style={styles.descricaoBusca}>
                Procure cidades, parques, reservas,
                instituições ou outros lugares.
            </Text>

            <View style={styles.linhaBusca}>
                <TextInput
                    style={styles.campoBusca}
                    placeholder="Ex.: Palmas, Paraná"
                    placeholderTextColor="#87958B"
                    value={pesquisa}
                    onChangeText={setPesquisa}
                    returnKeyType="search"
                    onSubmitEditing={() => {
                        void buscarLugares();
                    }}
                    maxLength={120}
                />

                <Pressable
                    style={[
                        styles.botaoBuscar,
                        pesquisando &&
                        styles.botaoDesativado,
                    ]}
                    onPress={() => {
                        void buscarLugares();
                    }}
                    disabled={pesquisando}
                >
                    {pesquisando ? (
                        <ActivityIndicator
                            size="small"
                            color="#FFFFFF"
                        />
                    ) : (
                        <Text style={styles.textoBuscar}>
                            Buscar
                        </Text>
                    )}
                </Pressable>
            </View>

            {/* ERRO OU AVISO DA BUSCA */}

            {erroBusca && (
                <Text style={styles.textoErroBusca}>
                    {erroBusca}
                </Text>
            )}

            {/* RESULTADOS DA BUSCA */}

            {resultados.length > 0 && (
                <ScrollView
                    style={styles.listaResultados}
                    nestedScrollEnabled={true}
                    keyboardShouldPersistTaps="handled"
                >
                    {resultados.map((lugar) => (
                        <Pressable
                            key={lugar.id}
                            style={styles.itemResultado}
                            onPress={() =>
                                selecionarLugar(lugar)
                            }
                        >
                            <Text style={styles.nomeResultado}>
                                {lugar.tipo === "cidade"
                                    ? "🏙️ "
                                    : lugar.tipo === "regiao"
                                        ? "🗺️ "
                                        : "📍 "}
                                {lugar.nome}
                            </Text>

                            <Text style={styles.enderecoResultado}>
                                {lugar.enderecoCompleto}
                            </Text>
                        </Pressable>
                    ))}
                </ScrollView>
            )}

            {/* LOCAL SELECIONADO */}

            {lugarSelecionado && (
                <View style={styles.localSelecionado}>
                    <View style={styles.localTexto}>
                        <Text style={styles.nomeLocalSelecionado}>
                            📍 {lugarSelecionado.nome}
                        </Text>

                        <Text style={styles.infoLocal}>
                            O mapa está posicionado neste local.
                        </Text>
                    </View>

                    <Pressable
                        onPress={limparLugar}
                        style={styles.botaoLimpar}
                    >
                        <Text style={styles.textoLimpar}>
                            Limpar
                        </Text>
                    </Pressable>
                </View>
            )}

            {/* MAPA INTERATIVO */}

            <View style={styles.areaMapa}>
                {erroMapa ? (
                    <View style={styles.mapaErro}>
                        <Text style={styles.textoMapaErro}>
                            Não foi possível carregar o mapa.
                            Verifique sua conexão com a internet.
                        </Text>
                    </View>
                ) : (
                    <WebView
                        key={
                            lugarSelecionado?.id ??
                            "mapa-observacoes"
                        }
                        style={styles.mapa}
                        originWhitelist={["*"]}
                        source={{ html: htmlMapa }}
                        javaScriptEnabled={true}
                        domStorageEnabled={true}
                        geolocationEnabled={false}
                        onError={() =>
                            setErroMapa(true)
                        }
                        onMessage={(evento) => {
                            try {
                                const mensagem: {
                                    tipo?: string;
                                    id?: string;
                                } = JSON.parse(
                                    evento.nativeEvent.data
                                );

                                if (mensagem.tipo === "erro") {
                                    setErroMapa(true);
                                }

                                if (
                                    mensagem.tipo === "selecionar" &&
                                    typeof mensagem.id === "string" &&
                                    observacoes.some(
                                        (item) =>
                                            item.id === mensagem.id
                                    )
                                ) {
                                    onSelecionar(mensagem.id);
                                }
                            } catch {
                                console.log(
                                    "Mensagem do mapa não reconhecida."
                                );
                            }
                        }}
                    />
                )}
            </View>

            {/* LEGENDA DO LOCAL */}

            {lugarSelecionado && (
                <Text style={styles.avisoLocal}>
                    🟣 O contorno roxo representa o local
                    pesquisado, não uma observação da
                    comunidade.
                </Text>
            )}

        </View>
    );
}

// ==========================================
// ESTILOS
// ==========================================

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: "#FFFFFF",
    },

    tituloBusca: {
        fontSize: 15,
        fontWeight: "bold",
        color: "#276749",
        marginBottom: 8,
    },

    descricaoBusca: {
        fontSize: 12,
        lineHeight: 19,
        color: "#64746A",
        marginBottom: 12,
    },

    linhaBusca: {
        flexDirection: "row",
        gap: 8,
        marginBottom: 12,
    },

    campoBusca: {
        flex: 1,
        minWidth: 0,
        borderWidth: 1,
        borderColor: "#D5DFD5",
        borderRadius: 10,
        backgroundColor: "#FFFFFF",
        paddingHorizontal: 12,
        paddingVertical: 10,
        fontSize: 14,
        color: "#33443A",
    },

    botaoBuscar: {
        backgroundColor: "#276749",
        borderRadius: 10,
        paddingHorizontal: 15,
        alignItems: "center",
        justifyContent: "center",
    },

    textoBuscar: {
        fontSize: 13,
        fontWeight: "bold",
        color: "#FFFFFF",
    },

    botaoDesativado: {
        opacity: 0.6,
    },

    textoErroBusca: {
        color: "#A15D16",
        fontSize: 13,
        lineHeight: 19,
        marginBottom: 12,
    },

    listaResultados: {
        maxHeight: 160,
        marginBottom: 12,
        borderWidth: 1,
        borderColor: "#D5DFD5",
        borderRadius: 10,
    },

    itemResultado: {
        padding: 12,
        borderBottomWidth: 1,
        borderBottomColor: "#E5EBE5",
    },

    nomeResultado: {
        color: "#276749",
        fontSize: 14,
        fontWeight: "bold",
        marginBottom: 4,
    },

    enderecoResultado: {
        color: "#64746A",
        fontSize: 12,
        lineHeight: 18,
    },

    localSelecionado: {
        backgroundColor: "#E7F1E9",
        borderRadius: 10,
        padding: 12,
        marginBottom: 12,
        flexDirection: "row",
        alignItems: "center",
        gap: 8,
    },

    localTexto: {
        flex: 1,
    },

    nomeLocalSelecionado: {
        fontSize: 13,
        color: "#276749",
        fontWeight: "bold",
    },

    infoLocal: {
        color: "#64746A",
        fontSize: 11,
        marginTop: 4,
    },

    botaoLimpar: {
        padding: 8,
    },

    textoLimpar: {
        color: "#276749",
        fontSize: 12,
        fontWeight: "bold",
    },

    areaMapa: {
        flex: 1,
        minHeight: 180,
        borderRadius: 10,
        overflow: "hidden",
    },

    mapa: {
        flex: 1,
        backgroundColor: "#F5F8F4",
    },

    mapaErro: {
        flex: 1,
        backgroundColor: "#F2F7F2",
        alignItems: "center",
        justifyContent: "center",
        padding: 20,
    },

    textoMapaErro: {
        color: "#64746A",
        fontSize: 13,
        lineHeight: 20,
        textAlign: "center",
    },

    avisoLocal: {
        color: "#64746A",
        fontSize: 11,
        lineHeight: 18,
        marginTop: 10,
    },
});
