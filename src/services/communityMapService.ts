
import {
    collection,
    getDocs,
    query,
    type Timestamp
} from "firebase/firestore";

import { auth, db } from "../config/firebase";

// MODELO DA OBSERVAÇÃO PÚBLICA NO MAPA


export interface ObservacaoMapa {
    id: string;
    category: "fauna" | "flora";
    notes: string;
    scientificName: string | null;
    identificationStatus: string;
    locationMode:
    | "exact"
    | "approximate"
    | "place"
    | "hidden"
    | "legacy";
    latitude: number;
    longitude: number;
    publicPlaceName: string | null;
    observedAt: Timestamp | null;
}


// CONSULTAR OBSERVAÇÕES COM LOCALIZAÇÃO


export async function listarObservacoesMapa(): Promise<
    ObservacaoMapa[]
> {
    const usuario = auth.currentUser;

    if (!usuario || !usuario.emailVerified) {
        throw new Error(
            "Você precisa estar autenticado e com o e-mail verificado."
        );
    }

    await usuario.getIdToken(true);

    // Consulta apenas a coleção pública.
    const consulta = query(
        collection(db, "publicObservations")
    );

    const resultado = await getDocs(consulta);

    const observacoes: ObservacaoMapa[] = [];

    for (const documento of resultado.docs) {
        const dados = documento.data();

        const localizacao = dados.publicLocation;

        // Observações sem localização não entram no mapa.
        if (!localizacao) {
            continue;
        }

        const latitude = localizacao.latitude;
        const longitude = localizacao.longitude;

        // Valida os valores antes de gerar marcadores.
        if (
            typeof latitude !== "number" ||
            typeof longitude !== "number" ||
            !Number.isFinite(latitude) ||
            !Number.isFinite(longitude) ||
            latitude < -90 ||
            latitude > 90 ||
            longitude < -180 ||
            longitude > 180
        ) {
            continue;
        }

        const modoOriginal = dados.locationMode;

        const modo: ObservacaoMapa["locationMode"] =
            modoOriginal === "exact" ||
                modoOriginal === "approximate" ||
                modoOriginal === "place" ||
                modoOriginal === "hidden"
                ? modoOriginal
                : "legacy";

        // Nunca cria marcador para localização oculta.
        if (modo === "hidden") {
            continue;
        }

        // A versão legada usava localização generalizada.
        // Não presumimos que representa a localização exata.
        const categoria =
            dados.category === "fauna"
                ? "fauna"
                : dados.category === "flora"
                    ? "flora"
                    : null;

        if (!categoria) {
            continue;
        }

        observacoes.push({
            id: documento.id,
            category: categoria,
            notes:
                typeof dados.notes === "string"
                    ? dados.notes
                    : "",
            scientificName:
                typeof dados.scientificName === "string"
                    ? dados.scientificName
                    : null,
            identificationStatus:
                typeof dados.identificationStatus === "string"
                    ? dados.identificationStatus
                    : "unidentified",
            locationMode: modo,
            latitude,
            longitude,
            publicPlaceName:
                typeof dados.publicPlaceName === "string"
                    ? dados.publicPlaceName
                    : null,
            observedAt:
                dados.observedAt &&
                    typeof dados.observedAt.toDate === "function"
                    ? dados.observedAt
                    : null,
        });
    }

    return observacoes;
}
