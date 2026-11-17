
import {
    collection,
    getDocs,
} from "firebase/firestore";

import type {
    GeoPoint,
    Timestamp,
} from "firebase/firestore";

import { auth, db } from "../config/firebase";

import type {
    CategoriaObservacao,
    StatusIdentificacao,
} from "../models/observation";


// TIPOS


export type TipoLocalizacaoPublica =
    | "exact"
    | "approximate"
    | "place"
    | "hidden"
    | "legacy";

export type TipoLocalPublico =
    | "cidade"
    | "regiao"
    | "local";


// OBSERVAÇÃO PÚBLICA


export interface ObservacaoPublica {
    id: string;
    ownerId: string;
    category: CategoriaObservacao;
    notes: string;
    observedAt: Timestamp;
    identificationStatus: StatusIdentificacao;
    scientificName: string | null;

    // Somente coordenadas autorizadas pelo autor.
    publicLocation: GeoPoint | null;
    locationMode: TipoLocalizacaoPublica;

    publicPlaceId: string | null;
    publicPlaceName: string | null;
    publicPlaceType: TipoLocalPublico | null;

    // Caminho no bucket público do Supabase.
    // Nunca recebe o caminho da foto privada.
    publicPhotoPath: string | null;

    publishedAt: Timestamp;
    updatedAt: Timestamp;
}


// LOCAL COM DESCOBERTAS


export interface LocalComDescobertas {
    id: string;
    nome: string;
    tipo: TipoLocalPublico;
    quantidade: number;
    quantidadeFauna: number;
    quantidadeFlora: number;
}

// AUTENTICAÇÃO


async function verificarUsuario(): Promise<void> {
    const usuario = auth.currentUser;

    if (!usuario || !usuario.emailVerified) {
        throw new Error(
            "Você precisa estar autenticado e com o e-mail verificado."
        );
    }

    await usuario.getIdToken(true);
}


// NORMALIZAR LOCALIZAÇÃO


function normalizarModoLocalizacao(
    valor: unknown
): TipoLocalizacaoPublica {
    if (
        valor === "exact" ||
        valor === "approximate" ||
        valor === "place" ||
        valor === "hidden"
    ) {
        return valor;
    }

    return "legacy";
}

function normalizarTipoLocal(
    valor: unknown
): TipoLocalPublico | null {
    if (
        valor === "cidade" ||
        valor === "regiao" ||
        valor === "local"
    ) {
        return valor;
    }

    return null;
}

// VALIDAR CAMINHO DA FOTOGRAFIA PÚBLICA


function normalizarFotoPublica(
    valor: unknown,
    ownerId: string,
    observacaoId: string
): string | null {
    if (typeof valor !== "string") {
        return null;
    }

    // Apenas a cópia expressamente destinada
    // à comunidade pode aparecer no catálogo.
    const caminhoEsperado =
        `public/${ownerId}/${observacaoId}.jpg`;

    return valor === caminhoEsperado
        ? valor
        : null;
}

// LISTAR OBSERVAÇÕES PÚBLICAS


export async function listarObservacoesPublicas():
    Promise<ObservacaoPublica[]> {
    await verificarUsuario();

    // Lemos somente publicObservations.
    // Nenhuma foto ou coordenada privada é buscada.
    const referencia = collection(
        db,
        "publicObservations"
    );

    const resultado = await getDocs(referencia);

    const observacoes: ObservacaoPublica[] =
        resultado.docs.map((documento) => {
            const dados = documento.data();

            const modo =
                normalizarModoLocalizacao(
                    dados.locationMode
                );

            const associadaALocal =
                modo === "place";

            const ownerId =
                typeof dados.ownerId === "string"
                    ? dados.ownerId
                    : "";

            return {
                id: documento.id,
                ownerId,
                category: dados.category,
                notes: dados.notes,
                observedAt: dados.observedAt,

                identificationStatus:
                    dados.identificationStatus,

                scientificName:
                    dados.scientificName ?? null,

                publicLocation:
                    dados.publicLocation ?? null,

                locationMode: modo,

                publicPlaceId:
                    associadaALocal &&
                        typeof dados.publicPlaceId === "string"
                        ? dados.publicPlaceId
                        : null,

                publicPlaceName:
                    associadaALocal &&
                        typeof dados.publicPlaceName === "string"
                        ? dados.publicPlaceName
                        : null,

                publicPlaceType:
                    associadaALocal
                        ? normalizarTipoLocal(
                            dados.publicPlaceType
                        )
                        : null,

                publicPhotoPath:
                    normalizarFotoPublica(
                        dados.publicPhotoPath,
                        ownerId,
                        documento.id
                    ),

                publishedAt: dados.publishedAt,
                updatedAt: dados.updatedAt,
            };
        });

    // Publicações mais recentes primeiro.
    observacoes.sort((a, b) => {
        return (
            b.publishedAt.toMillis() -
            a.publishedAt.toMillis()
        );
    });

    return observacoes;
}


// FILTRAR POR LOCAL


export function filtrarObservacoesPorLocal(
    observacoes: ObservacaoPublica[],
    localId: string,
    categoria: CategoriaObservacao | "todas" = "todas"
): ObservacaoPublica[] {
    const identificador = localId.trim();

    if (!identificador) {
        return [];
    }

    return observacoes.filter((observacao) => {
        const correspondeLocal =
            observacao.locationMode === "place" &&
            observacao.publicPlaceId === identificador;

        const correspondeCategoria =
            categoria === "todas" ||
            observacao.category === categoria;

        return correspondeLocal && correspondeCategoria;
    });
}


// AGRUPAR DESCOBERTAS POR LOCAL


export function listarLocaisComDescobertas(
    observacoes: ObservacaoPublica[]
): LocalComDescobertas[] {
    const locais = new Map<
        string,
        LocalComDescobertas
    >();

    observacoes.forEach((observacao) => {
        if (
            observacao.locationMode !== "place" ||
            !observacao.publicPlaceId ||
            !observacao.publicPlaceName ||
            !observacao.publicPlaceType
        ) {
            return;
        }

        const id = observacao.publicPlaceId;

        let local = locais.get(id);

        if (!local) {
            local = {
                id,
                nome: observacao.publicPlaceName,
                tipo: observacao.publicPlaceType,
                quantidade: 0,
                quantidadeFauna: 0,
                quantidadeFlora: 0,
            };

            locais.set(id, local);
        }

        local.quantidade += 1;

        if (observacao.category === "fauna") {
            local.quantidadeFauna += 1;
        } else if (observacao.category === "flora") {
            local.quantidadeFlora += 1;
        }
    });

    const resultado = Array.from(locais.values());

    resultado.sort((a, b) => {
        if (b.quantidade !== a.quantidade) {
            return b.quantidade - a.quantidade;
        }

        return a.nome.localeCompare(
            b.nome,
            "pt-BR"
        );
    });

    return resultado;
}


// CONTAR OBSERVAÇÕES DE UM LOCAL


export function contarObservacoesDoLocal(
    observacoes: ObservacaoPublica[],
    localId: string
) {
    const registros =
        filtrarObservacoesPorLocal(
            observacoes,
            localId
        );

    const fauna = registros.filter(
        (observacao) =>
            observacao.category === "fauna"
    ).length;

    const flora = registros.filter(
        (observacao) =>
            observacao.category === "flora"
    ).length;

    return {
        total: registros.length,
        fauna,
        flora,
    };
}
