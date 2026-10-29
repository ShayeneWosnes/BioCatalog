
import * as Location from "expo-location";

// Estrutura das coordenadas obtidas pelo GPS
export interface CoordenadasObservacao {
    latitude: number;
    longitude: number;
    precisao: number | null;
}

// Obtém a localização atual do dispositivo
export async function obterLocalizacaoAtual(): Promise<CoordenadasObservacao> {
    // Solicita acesso à localização somente durante o uso
    const permissao =
        await Location.requestForegroundPermissionsAsync();

    if (permissao.status !== "granted") {
        throw new Error(
            "Permissão de localização negada. Autorize o GPS nas configurações do dispositivo."
        );
    }

    // Verifica se o serviço de localização está ligado
    const gpsAtivado =
        await Location.hasServicesEnabledAsync();

    if (!gpsAtivado) {
        throw new Error(
            "O serviço de localização está desligado. Ative o GPS e tente novamente."
        );
    }

    // Captura as coordenadas atuais
    const localizacao =
        await Location.getCurrentPositionAsync({
            accuracy: Location.Accuracy.Balanced,
        });

    return {
        latitude: localizacao.coords.latitude,
        longitude: localizacao.coords.longitude,
        precisao: localizacao.coords.accuracy,
    };
}
