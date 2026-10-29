
import type {
    GeoPoint,
    Timestamp,
} from "firebase/firestore";

export type CategoriaObservacao =
    | "fauna"
    | "flora";

export type StatusIdentificacao =
    | "unidentified"
    | "provisional";

export type Visibilidade =
    | "private"
    | "public";

export interface TaxonGBIF {
    scientificName: string;
    gbifUsageKey: number | null;
    gbifAcceptedUsageKey: number | null;
    acceptedScientificName: string | null;
    taxonomicStatus: string | null;
    rank: string | null;
    source: "GBIF";
    checkedAt: Timestamp;
}

export interface Localidade {
    city?: string;
    state?: string;
    country?: string;
}

export interface Observacao {
    // Identificador do documento no Firestore
    id: string;

    // Usuário proprietário
    ownerId: string;

    // Informações da descoberta
    category: CategoriaObservacao;
    notes: string;
    observedAt: Timestamp;

    // Localização opcional
    exactLocation?: GeoPoint | null;
    locality?: Localidade | null;

    // Foto opcional enquanto o Storage
    // não estiver configurado
    privatePhotoPath?: string | null;

    // Identificação taxonômica
    identificationStatus: StatusIdentificacao;
    taxon: TaxonGBIF | null;

    // Privacidade
    visibility: Visibilidade;

    // Auditoria
    createdAt: Timestamp;
    updatedAt: Timestamp;
}
