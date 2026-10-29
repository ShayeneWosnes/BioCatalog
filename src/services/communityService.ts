
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

// ==========================================
// TIPOS DE LOCALIZAÇÃO PÚBLICA
// ==========================================

// "legacy" identifica publicações antigas,
// criadas antes das quatro opções de
// compartilhamento de localização.

export type TipoLocalizacaoPublica =
    | "exact"
    | "approximate"
    | "place"
    | "hidden"
    | "legacy";

// ==========================================
// TIPOS DE LOCAIS
// ==========================================

export type TipoLocalPublico =
    | "cidade"
    | "regiao"
    | "local";

// ==========================================
// MODELO DE OBSERVAÇÃO PÚBLICA
// ==========================================

export interface ObservacaoPublica {
    id: string;

    ownerId: string;

    category: CategoriaObservacao;

    notes: string;

    observedAt: Timestamp;

    identificationStatus: StatusIdentificacao;

    scientificName: string | null;

    // Coordenada que o autor autorizou
    // compartilhar.
    //
    // Pode ser exata, aproximada, de um
    // lugar escolhido ou null.
    publicLocation: GeoPoint | null;

    // Modo de compartilhamento.
    locationMode: TipoLocalizacaoPublica;

    // Identificador do local no OpenStreetMap.
    // Exemplo: way:123456
    //
    // Preenchido somente quando o autor
    // escolheu "Cidade ou local".
    publicPlaceId: string | null;

    // Nome público do local.
    publicPlaceName: string | null;

    // Tipo de local escolhido.
    publicPlaceType: TipoLocalPublico | null;

    publishedAt: Timestamp;

    updatedAt: Timestamp;
}

// ==========================================
// MODELO DE LOCAL COM DESCOBERTAS
// ==========================================

export interface LocalComDescobertas {
    id: string;

    nome: string;

    tipo: TipoLocalPublico;

    quantidade: number;

    quantidadeFauna: number;

    quantidadeFlora: number;
}

// ==========================================
// VALIDAR AUTENTICAÇÃO
// ==========================================

async function verificarUsuario(): Promise<void> {
    const usuario = auth.currentUser;

    if (!usuario || !usuario.emailVerified) {
        throw new Error(
            "Você precisa estar autenticado e com o e-mail verificado."
        );
    }

    // Atualiza o token utilizado pelas
    // regras de segurança do Firestore.
    await usuario.getIdToken(true);
}

// ==========================================
// NORMALIZAR MODO DE LOCALIZAÇÃO
// ==========================================

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

    // Documentos anteriores não possuem
    // o campo locationMode.
    //
    // Não alteramos a localização deles.
    return "legacy";
}

// ==========================================
// NORMALIZAR TIPO DO LOCAL
// ==========================================

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

// ==========================================
// LISTAR OBSERVAÇÕES DA COMUNIDADE
// ==========================================

export async function listarObservacoesPublicas():
    Promise<ObservacaoPublica[]> {

    await verificarUsuario();

    // Consulta exclusivamente os documentos
    // da coleção pública.
    //
    // Não consulta as coordenadas privadas
    // de outros usuários.

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

            // Campos associados a lugares só
            // são considerados quando a publicação
            // utiliza o modo "place".

            const associadaALocal =
                modo === "place";

            return {
                id: documento.id,

                ownerId: dados.ownerId,

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

                publishedAt: dados.publishedAt,

                updatedAt: dados.updatedAt,
            };
        });

    // ========================================
    // PUBLICAÇÕES MAIS RECENTES PRIMEIRO
    // ========================================

    observacoes.sort((a, b) => {
        return (
            b.publishedAt.toMillis() -
            a.publishedAt.toMillis()
        );
    });

    return observacoes;
}

// ==========================================
// FILTRAR OBSERVAÇÕES POR LOCAL
// ==========================================

// Retorna somente observações que o autor
// associou explicitamente ao local.
//
// Não associa automaticamente registros
// com GPS exato ou aproximado a parques,
// pois isso poderia gerar classificações
// incorretas.

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

        return (
            correspondeLocal &&
            correspondeCategoria
        );
    });
}

// ==========================================
// AGRUPAR DESCOBERTAS POR LOCAL
// ==========================================

// Exemplo:
//
// IFPR - Campus Palmas
// 5 descobertas
// 3 fauna
// 2 flora
//
// Somente locais com observações realmente
// associadas aparecem neste agrupamento.

export function listarLocaisComDescobertas(
    observacoes: ObservacaoPublica[]
): LocalComDescobertas[] {

    const locais = new Map<
        string,
        LocalComDescobertas
    >();

    observacoes.forEach((observacao) => {
        // A associação só existe quando
        // o autor escolheu um local.

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

        // Contagem total.
        local.quantidade += 1;

        // Contagem por categoria.
        if (observacao.category === "fauna") {
            local.quantidadeFauna += 1;
        } else if (observacao.category === "flora") {
            local.quantidadeFlora += 1;
        }
    });

    // ========================================
    // ORDENAR POR QUANTIDADE DE DESCOBERTAS
    // ========================================

    const resultado = Array.from(
        locais.values()
    );

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

// ==========================================
// CONTAR OBSERVAÇÕES DE UM LOCAL
// ==========================================

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
