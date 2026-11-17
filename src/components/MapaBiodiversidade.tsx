
import { useRef, useState } from "react";

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


// REGIÃO INICIAL


const REGIAO_BRASIL: Region = {
  latitude: -14.235,
  longitude: -51.9253,
  latitudeDelta: 35,
  longitudeDelta: 35,
};


// COMPONENTE DO MAPA


export default function MapaBiodiversidade({
  observacoes,
}: MapaBiodiversidadeProps) {
  const mapaRef = useRef<MapView>(null);

  const [mapaPronto, setMapaPronto] =
    useState(false);


  // CENTRALIZAR NOS MARCADORES


  function visualizarTodos() {
    if (!mapaPronto || observacoes.length === 0) {
      return;
    }

    const coordenadas = observacoes.map(
      (observacao) => ({
        latitude: observacao.latitude,
        longitude: observacao.longitude,
      })
    );

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
          top: 50,
          right: 40,
          bottom: 50,
          left: 40,
        },
        animated: true,
      }
    );
  }


  // DETALHES DA DESCOBERTA


  function mostrarDetalhes(
    observacao: MarcadorBiodiversidade
  ) {
    const categoria =
      observacao.category === "fauna"
        ? " Fauna"
        : " Flora";

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

    const local =
      observacao.publicPlaceName
        ? `\nLocal: ${observacao.publicPlaceName}`
        : "";

    Alert.alert(
      " Descoberta da comunidade",
      `${categoria}\n\n` +
      `Nome científico: ${nome}\n\n` +
      `Descrição: ${descricao}\n\n` +
      `Localização: ${localizacao}${local}`,
      [{ text: "Fechar" }]
    );
  }


  // CONTADORES


  const quantidadeFauna = observacoes.filter(
    (item) => item.category === "fauna"
  ).length;

  const quantidadeFlora = observacoes.filter(
    (item) => item.category === "flora"
  ).length;


  // INTERFACE


  return (
    <View style={styles.container}>
      // RESUMO DAS DESCOBERTAS

      <View style={styles.resumo}>
        <View style={styles.resumoItem}>
          <Text style={styles.numero}>
            {observacoes.length}
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

      // MAPA

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
                  ? "🐝 Fauna"
                  : "🌿 Flora"
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
                mostrarDetalhes(observacao)
              }
            />
          ))}
        </MapView>

        {!mapaPronto && (
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
      </View>

      // CONTROLES

      <Pressable
        style={[
          styles.botaoPrincipal,
          (!mapaPronto ||
            observacoes.length === 0) &&
          styles.desativado,
        ]}
        onPress={visualizarTodos}
        disabled={
          !mapaPronto ||
          observacoes.length === 0
        }
      >
        <Text style={styles.textoPrincipal}>
          📍 Ver todos os marcadores
        </Text>
      </Pressable>

    // ESTADO VAZIO

      {observacoes.length === 0 && (
        <View style={styles.avisoVazio}>
          <Text style={styles.textoAuxiliar}>
            Nenhuma descoberta com localização
            pública corresponde aos filtros.
          </Text>
        </View>
      )}

      // PRIVACIDADE

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
