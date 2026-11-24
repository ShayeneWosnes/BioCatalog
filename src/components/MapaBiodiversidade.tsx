
import { useEffect, useMemo, useRef, useState } from "react";

import {
  ActivityIndicator,
  Alert,
  Pressable,
  StyleSheet,
  Text,
  View,
} from "react-native";

import WebView, {
  type WebViewMessageEvent,
} from "react-native-webview";

// TIPOS DO COMPONENTE

export interface MarcadorBiodiversidade {
  id: string;
  category: "fauna" | "flora";
  latitude: number;
  longitude: number;
  scientificName: string | null;
  notes: string;
  locationMode?: string;
  publicPlaceName?: string | null;
}

interface MapaBiodiversidadeProps {
  observacoes: MarcadorBiodiversidade[];
}

// REGIÃO INICIAL DO MAPA

const REGIAO_BRASIL = {
  latitude: -14.235,
  longitude: -51.9253,
};

// COMPONENTE DO MAPA

export default function MapaBiodiversidade({
  observacoes,
}: MapaBiodiversidadeProps) {
  const mapaRef = useRef<WebView<{}>>(null);

  const [mapaPronto, setMapaPronto] = useState(false);
  const [erroMapa, setErroMapa] = useState(false);

  // CONSIDERAR APENAS COORDENADAS VÁLIDAS

  const marcadores = useMemo(
    () =>
      observacoes.filter(
        (item) =>
          Number.isFinite(item.latitude) &&
          Number.isFinite(item.longitude) &&
          Math.abs(item.latitude) <= 90 &&
          Math.abs(item.longitude) <= 180 &&
          item.locationMode !== "hidden"
      ),
    [observacoes]
  );

  // CONTADORES

  const quantidadeFauna = marcadores.filter(
    (item) => item.category === "fauna"
  ).length;

  const quantidadeFlora = marcadores.filter(
    (item) => item.category === "flora"
  ).length;

  // PREPARAR OS DADOS PÚBLICOS DO MAPA

  const dadosMapa = useMemo(
    () =>
      marcadores.map((item, indice) => ({
        indice,
        latitude: item.latitude,
        longitude: item.longitude,
        category: item.category,
        scientificName:
          item.scientificName ||
          "Espécie não identificada",
      })),
    [marcadores]
  );

  // GERAÇÃO DO HTML COM LEAFLET E OPENSTREETMAP

  const htmlMapa = useMemo(() => {
    const dados = JSON.stringify(dadosMapa).replace(
      /</g,
      "\\u003c"
    );

    return `
<!DOCTYPE html>
<html lang="pt-BR">
<head>
  <meta charset="UTF-8" />

  <meta
    name="viewport"
    content="width=device-width, initial-scale=1.0,
    maximum-scale=1.0, user-scalable=no"
  />

  <link
    rel="stylesheet"
    href="https://unpkg.com/leaflet@1.9.4/dist/leaflet.css"
  />

  <style>
    html, body {
      width: 100%;
      height: 100%;
      margin: 0;
      padding: 0;
      overflow: hidden;
      background: #e7f1e9;
    }

    #mapa {
      width: 100%;
      height: 100%;
    }

    .leaflet-container {
      background: #e7f1e9;
      font-family: Arial, sans-serif;
    }

    .leaflet-popup-content {
      font-size: 13px;
      line-height: 1.5;
    }
  </style>
</head>

<body>
  <div id="mapa"></div>

  <script src="https://unpkg.com/leaflet@1.9.4/dist/leaflet.js"></script>

  <script>
    (function () {
      const observacoes = ${dados};

      function comunicar(tipo, indice) {
        if (window.ReactNativeWebView) {
          window.ReactNativeWebView.postMessage(
            JSON.stringify({
              tipo: tipo,
              indice: indice
            })
          );
        }
      }

      try {
        if (!window.L) {
          comunicar("erro");
          return;
        }

        const mapa = L.map("mapa", {
          zoomControl: true
        }).setView(
          [
            ${REGIAO_BRASIL.latitude},
            ${REGIAO_BRASIL.longitude}
          ],
          4
        );

        L.tileLayer(
          "https://tile.openstreetmap.org/{z}/{x}/{y}.png",
          {
            attribution:
              '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors',
            maxZoom: 19
          }
        ).addTo(mapa);

        const grupo = L.featureGroup().addTo(mapa);

        observacoes.forEach(function (item) {
          const cor =
            item.category === "fauna"
              ? "#E8A33D"
              : "#276749";

          const marcador = L.circleMarker(
            [item.latitude, item.longitude],
            {
              radius: 9,
              color: "#ffffff",
              weight: 2,
              fillColor: cor,
              fillOpacity: 0.95
            }
          );

          const titulo = document.createElement("div");

          titulo.style.fontWeight = "bold";
          titulo.style.marginBottom = "5px";

          titulo.textContent =
            item.category === "fauna"
              ? "🐝 Fauna"
              : "🌿 Flora";

          const descricao = document.createElement("div");

          descricao.textContent = item.scientificName;

          const conteudo = document.createElement("div");

          conteudo.appendChild(titulo);
          conteudo.appendChild(descricao);

          marcador.bindPopup(conteudo);

          marcador.on("click", function () {
            comunicar("detalhes", item.indice);
          });

          marcador.addTo(grupo);
        });

        function ajustarMarcadores() {
          mapa.invalidateSize();

          if (observacoes.length === 1) {
            mapa.setView(
              [
                observacoes[0].latitude,
                observacoes[0].longitude
              ],
              12
            );
          } else if (observacoes.length > 1) {
            mapa.fitBounds(grupo.getBounds(), {
              padding: [35, 35],
              maxZoom: 13
            });
          }
        }

        window.visualizarTodos = ajustarMarcadores;

        setTimeout(ajustarMarcadores, 200);

        comunicar("pronto");

      } catch (erro) {
        comunicar("erro");
      }
    })();
  </script>
</body>
</html>
`;
  }, [dadosMapa]);

  // REINICIAR ESTADO QUANDO OS MARCADORES MUDAREM

  const chaveMapa = useMemo(
    () => JSON.stringify(dadosMapa),
    [dadosMapa]
  );

  useEffect(() => {
    setMapaPronto(false);
    setErroMapa(false);
  }, [chaveMapa]);

  // RECEBER MENSAGENS DA WEBVIEW

  function receberMensagem(evento: WebViewMessageEvent) {
    try {
      const mensagem = JSON.parse(
        evento.nativeEvent.data
      );

      if (mensagem.tipo === "pronto") {
        setMapaPronto(true);
        setErroMapa(false);
      }

      if (mensagem.tipo === "erro") {
        setMapaPronto(false);
        setErroMapa(true);
      }

      if (
        mensagem.tipo === "detalhes" &&
        Number.isInteger(mensagem.indice)
      ) {
        const observacao = marcadores[mensagem.indice];

        if (observacao) {
          mostrarDetalhes(observacao);
        }
      }
    } catch {
      console.warn("Mensagem inválida recebida do mapa.");
    }
  }

  // CENTRALIZAR NOS MARCADORES

  function visualizarTodos() {
    if (!mapaPronto || marcadores.length === 0) {
      return;
    }

    mapaRef.current?.injectJavaScript(`
      if (typeof window.visualizarTodos === "function") {
        window.visualizarTodos();
      }
      true;
    `);
  }

  // DETALHES DA DESCOBERTA

  function mostrarDetalhes(
    observacao: MarcadorBiodiversidade
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

    let localizacao = "Localização compartilhada";

    if (observacao.locationMode === "exact") {
      localizacao = "Localização exata autorizada";
    } else if (
      observacao.locationMode === "approximate"
    ) {
      localizacao = "Localização aproximada";
    } else if (
      observacao.locationMode === "place"
    ) {
      localizacao = "Local escolhido pelo autor";
    } else if (
      observacao.locationMode === "legacy"
    ) {
      localizacao = "Localização generalizada";
    }

    const local = observacao.publicPlaceName
      ? `\nLocal: ${observacao.publicPlaceName}`
      : "";

    Alert.alert(
      "Descoberta da comunidade",
      `${categoria}\n\n` +
      `Nome científico: ${nome}\n\n` +
      `Descrição: ${descricao}\n\n` +
      `Localização: ${localizacao}${local}`,
      [{ text: "Fechar" }]
    );
  }

  // INTERFACE

  return (
    <View style={styles.container}>
      {/* RESUMO DAS DESCOBERTAS */}

      <View style={styles.resumo}>
        <View style={styles.resumoItem}>
          <Text style={styles.numero}>
            {marcadores.length}
          </Text>

          <Text style={styles.rotulo}>
            Marcadores
          </Text>
        </View>

        <View style={styles.resumoItem}>
          <Text style={styles.numero}>
            {quantidadeFauna}
          </Text>

          <Text style={styles.rotulo}>
            🐝 Fauna
          </Text>
        </View>

        <View style={styles.resumoItem}>
          <Text style={styles.numero}>
            {quantidadeFlora}
          </Text>

          <Text style={styles.rotulo}>
            🌿 Flora
          </Text>
        </View>
      </View>

      {/* MAPA OPENSTREETMAP */}

      <View style={styles.areaMapa}>
        <WebView<{}>
          key={chaveMapa}
          ref={mapaRef}
          source={{
            html: htmlMapa,
            baseUrl: "https://localhost/",
          }}
          style={styles.mapa}
          originWhitelist={["*"]}
          javaScriptEnabled
          domStorageEnabled
          onMessage={receberMensagem}
          onError={() => {
            setMapaPronto(false);
            setErroMapa(true);
          }}
          scrollEnabled={false}
        />

        {!mapaPronto && !erroMapa && (
          <View style={styles.carregando}>
            <ActivityIndicator
              size="large"
              color="#276749"
            />

            <Text style={styles.textoAuxiliar}>
              Preparando mapa...
            </Text>
          </View>
        )}

        {erroMapa && (
          <View style={styles.carregando}>
            <Text style={styles.textoAuxiliar}>
              Não foi possível carregar o mapa.
              Verifique sua conexão com a internet.
            </Text>
          </View>
        )}
      </View>

      {/* CONTROLES */}

      <Pressable
        style={[
          styles.botaoPrincipal,
          (!mapaPronto ||
            marcadores.length === 0) &&
          styles.desativado,
        ]}
        onPress={visualizarTodos}
        disabled={
          !mapaPronto || marcadores.length === 0
        }
        accessibilityRole="button"
        accessibilityLabel="Ver todos os marcadores"
      >
        <Text style={styles.textoPrincipal}>
          📍 Ver todos os marcadores
        </Text>
      </Pressable>

      {/* ESTADO VAZIO */}

      {marcadores.length === 0 && (
        <View style={styles.avisoVazio}>
          <Text style={styles.textoAuxiliar}>
            Nenhuma descoberta com localização
            pública corresponde aos filtros.
          </Text>
        </View>
      )}

      {/* PRIVACIDADE */}

      <Text style={styles.avisoPrivacidade}>
        Somente localizações autorizadas
        pelos autores são exibidas no mapa.
        Fotografias privadas não são compartilhadas.
      </Text>
    </View>
  );
}

// ESTILOS

const styles = StyleSheet.create({
  container: {
    width: "100%",
    gap: 14,
  },

  resumo: {
    flexDirection: "row",
    backgroundColor: "#FFFFFF",
    borderWidth: 1,
    borderColor: "#D5DFD5",
    borderRadius: 14,
    paddingVertical: 15,
  },

  resumoItem: {
    flex: 1,
    alignItems: "center",
    gap: 5,
  },

  numero: {
    fontSize: 21,
    fontWeight: "bold",
    color: "#276749",
  },

  rotulo: {
    fontSize: 12,
    color: "#64746A",
  },

  areaMapa: {
    width: "100%",
    height: 430,
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

  carregando: {
    ...StyleSheet.absoluteFill,
    backgroundColor: "#F5F8F4",
    alignItems: "center",
    justifyContent: "center",
    gap: 10,
    padding: 20,
  },

  textoAuxiliar: {
    fontSize: 13,
    lineHeight: 20,
    color: "#64746A",
    textAlign: "center",
  },

  botaoPrincipal: {
    backgroundColor: "#276749",
    paddingVertical: 15,
    paddingHorizontal: 16,
    borderRadius: 12,
    alignItems: "center",
  },

  textoPrincipal: {
    color: "#FFFFFF",
    fontWeight: "bold",
    fontSize: 14,
  },

  desativado: {
    opacity: 0.5,
  },

  avisoVazio: {
    padding: 15,
    backgroundColor: "#F2F7F2",
    borderRadius: 12,
  },

  avisoPrivacidade: {
    color: "#718078",
    fontSize: 12,
    lineHeight: 19,
    textAlign: "center",
  },
});
