
import {
    doc,
    GeoPoint,
    getDoc,
    serverTimestamp,
    writeBatch,
} from "firebase/firestore";

import { auth, db } from "../config/firebase";

import type {
    Observacao,
} from "../models/observation";

// ==========================================
// MODOS DE COMPARTILHAMENTO
// ==========================================

export type ModoLocalizacaoPublica =
    | "exact"
    | "approximate"
    | "place"
    | "hidden";

// ==========================================
// LOCAL ESCOLHIDO PELO USUÁRIO
// ==========================================

export interface LocalPublicoSelecionado {
    id: string;
    nome: string;
    latitude: number;
    longitude: number;
    tipo: "cidade" | "regiao" | "local";
}

// ==========================================
// OPÇÕES DE PUBLICAÇÃO
// ==========================================

// A localização exata exige confirmação
// explícita do usuário.
//
// A divulgação de um local escolhido também
// exige confirmação, pois pode revelar onde
// a descoberta foi realizada.

export type OpcoesPublicacao =
    | {
        modoLocalizacao: "exact";
        confirmouCompartilhamentoExato: true;
    }
    | {
        modoLocalizacao: "approximate";
    }
    | {
        modoLocalizacao: "place";
        local: LocalPublicoSelecionado;
        confirmouCompartilhamentoLocal: true;
    }
    | {
        modoLocalizacao: "hidden";
    };

// ==========================================
// BUSCAR OBSERVAÇÃO DO USUÁRIO
// ==========================================

async function buscarObservacaoPropria(
    observacaoId: string
): Promise<Observacao> {
    const usuario = auth.currentUser;

    if (!usuario || !usuario.emailVerified) {
        throw new Error(
            "Você precisa estar autenticado e com o e-mail verificado."
        );
    }

    if (!observacaoId.trim()) {
        throw new Error(
            "O identificador da observação é inválido."
        );
    }

    await usuario.getIdToken(true);

    const referencia = doc(
        db,
        "observations",
        observacaoId
    );

    const documento = await getDoc(referencia);

    if (!documento.exists()) {
        throw new Error(
            "A observação não foi encontrada."
        );
    }

    const observacao = {
        id: documento.id,
        ...documento.data(),
    } as Observacao;

    if (observacao.ownerId !== usuario.uid) {
        throw new Error(
            "Você não tem permissão para alterar esta observação."
        );
    }

    return observacao;
}

// ==========================================
// VALIDAR COORDENADAS
// ==========================================

function validarCoordenadas(
    latitude: number,
    longitude: number
): void {
    const latitudeValida =
        Number.isFinite(latitude) &&
        latitude >= -90 &&
        latitude <= 90;

    const longitudeValida =
        Number.isFinite(longitude) &&
        longitude >= -180 &&
        longitude <= 180;

    if (!latitudeValida || !longitudeValida) {
        throw new Error(
            "As coordenadas informadas são inválidas."
        );
    }
}

// ==========================================
// OBTER COORDENADAS PRIVADAS
// ==========================================

function obterLocalizacaoExata(
    observacao: Observacao
): GeoPoint {
    const localizacao = observacao.exactLocation;

    if (!localizacao) {
        throw new Error(
            "Esta observação não possui localização GPS. Capture a localização antes de escolher este modo."
        );
    }

    validarCoordenadas(
        localizacao.latitude,
        localizacao.longitude
    );

    return localizacao;
}

// ==========================================
// LOCALIZAÇÃO APROXIMADA ANTIGA
// ==========================================

// Mantida para preservar a compatibilidade
// com as regras atuais do Firestore.
//
// As publicações existentes continuam usando
// a generalização original até migrarmos
// para as novas regras.

function gerarLocalizacaoLegada(
    observacao: Observacao
): GeoPoint | null {
    const localizacao = observacao.exactLocation;

    if (!localizacao) {
        return null;
    }

    validarCoordenadas(
        localizacao.latitude,
        localizacao.longitude
    );

    const latitudeAproximada =
        Math.floor(localizacao.latitude * 10) / 10;

    const longitudeAproximada =
        Math.floor(localizacao.longitude * 10) / 10;

    return new GeoPoint(
        latitudeAproximada,
        longitudeAproximada
    );
}

// ==========================================
// NOVA LOCALIZAÇÃO APROXIMADA
// ==========================================

// Arredonda para uma grade de 0,1 grau,
// sem publicar a coordenada exata.
//
// Essa posição representa uma aproximação,
// não necessariamente o centro da cidade.
//
// Só será utilizada após a atualização
// das regras de segurança.

function gerarLocalizacaoAproximada(
    observacao: Observacao
): GeoPoint {
    const localizacao =
        obterLocalizacaoExata(observacao);

    const latitudeAproximada =
        Math.round(localizacao.latitude * 10) / 10;

    const longitudeAproximada =
        Math.round(localizacao.longitude * 10) / 10;

    return new GeoPoint(
        latitudeAproximada,
        longitudeAproximada
    );
}

// ==========================================
// GERAR LOCALIZAÇÃO PERSONALIZADA
// ==========================================

function prepararLocalizacaoPublica(
    observacao: Observacao,
    opcoes: OpcoesPublicacao
) {
    // ----------------------------------------
    // LOCALIZAÇÃO EXATA
    // ----------------------------------------

    if (opcoes.modoLocalizacao === "exact") {
        if (
            opcoes.confirmouCompartilhamentoExato !==
            true
        ) {
            throw new Error(
                "Confirme que deseja divulgar a localização exata desta observação."
            );
        }

        const localizacao =
            obterLocalizacaoExata(observacao);

        return {
            locationMode: "exact",
            publicLocation: new GeoPoint(
                localizacao.latitude,
                localizacao.longitude
            ),
            publicPlaceId: null,
            publicPlaceName: null,
            publicPlaceType: null,
        };
    }

    // ----------------------------------------
    // LOCALIZAÇÃO APROXIMADA
    // ----------------------------------------

    if (
        opcoes.modoLocalizacao === "approximate"
    ) {
        return {
            locationMode: "approximate",
            publicLocation:
                gerarLocalizacaoAproximada(observacao),
            publicPlaceId: null,
            publicPlaceName: null,
            publicPlaceType: null,
        };
    }

    // ----------------------------------------
    // CIDADE OU LOCAL SELECIONADO
    // ----------------------------------------

    if (opcoes.modoLocalizacao === "place") {
        if (
            opcoes.confirmouCompartilhamentoLocal !==
            true
        ) {
            throw new Error(
                "Confirme que deseja compartilhar o local selecionado."
            );
        }

        const local = opcoes.local;

        if (!local) {
            throw new Error(
                "Selecione uma cidade ou um local válido."
            );
        }

        const id = local.id.trim();
        const nome = local.nome.trim();

        if (
            id.length === 0 ||
            id.length > 150
        ) {
            throw new Error(
                "O identificador do local é inválido."
            );
        }

        if (
            nome.length < 2 ||
            nome.length > 120
        ) {
            throw new Error(
                "O nome do local é inválido."
            );
        }

        if (
            local.tipo !== "cidade" &&
            local.tipo !== "regiao" &&
            local.tipo !== "local"
        ) {
            throw new Error(
                "O tipo do local selecionado é inválido."
            );
        }

        validarCoordenadas(
            local.latitude,
            local.longitude
        );

        // O ponto público é a referência
        // geográfica do local selecionado.
        //
        // NÃO usamos a coordenada privada
        // da observação neste modo.

        return {
            locationMode: "place",
            publicLocation: new GeoPoint(
                local.latitude,
                local.longitude
            ),
            publicPlaceId: id,
            publicPlaceName: nome,
            publicPlaceType: local.tipo,
        };
    }

    // ----------------------------------------
    // NÃO COMPARTILHAR LOCALIZAÇÃO
    // ----------------------------------------

    return {
        locationMode: "hidden",
        publicLocation: null,
        publicPlaceId: null,
        publicPlaceName: null,
        publicPlaceType: null,
    };
}

// ==========================================
// PUBLICAR OBSERVAÇÃO NA COMUNIDADE
// ==========================================

export async function publicarObservacao(
    observacaoId: string,
    opcoes?: OpcoesPublicacao
): Promise<void> {
    const observacao =
        await buscarObservacaoPropria(observacaoId);

    if (observacao.visibility === "public") {
        throw new Error(
            "Esta observação já está publicada."
        );
    }

    const nomeCientifico =
        observacao.taxon?.scientificName ?? null;

    if (
        nomeCientifico !== null &&
        nomeCientifico.length > 200
    ) {
        throw new Error(
            "O nome científico excede o limite permitido para publicação."
        );
    }

    const referenciaPrivada = doc(
        db,
        "observations",
        observacaoId
    );

    const referenciaPublica = doc(
        db,
        "publicObservations",
        observacaoId
    );

    // ----------------------------------------
    // INFORMAÇÕES COMPARTILHÁVEIS
    // ----------------------------------------

    const dadosBase = {
        ownerId: observacao.ownerId,
        category: observacao.category,
        notes: observacao.notes,
        observedAt: observacao.observedAt,
        identificationStatus:
            observacao.identificationStatus,
        scientificName: nomeCientifico,
        publishedAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
    };

    // ----------------------------------------
    // COMPATIBILIDADE COM VERSÃO ATUAL
    // ----------------------------------------

    // Quando o aplicativo chama:
    //
    // publicarObservacao(observacaoId)
    //
    // Mantemos exatamente o formato de
    // publicação usado anteriormente.
    //
    // Isso permite continuar usando a tela
    // atual enquanto preparamos o novo
    // formulário e as regras do Firestore.

    const dadosPublicos =
        opcoes === undefined
            ? {
                ...dadosBase,
                publicLocation:
                    gerarLocalizacaoLegada(observacao),
            }
            : {
                ...dadosBase,
                ...prepararLocalizacaoPublica(
                    observacao,
                    opcoes
                ),
            };

    // ----------------------------------------
    // GRAVAR DE FORMA ATÔMICA
    // ----------------------------------------

    const lote = writeBatch(db);

    lote.update(referenciaPrivada, {
        visibility: "public",
        updatedAt: serverTimestamp(),
    });

    lote.set(
        referenciaPublica,
        dadosPublicos
    );

    await lote.commit();
}

// ==========================================
// RETIRAR PUBLICAÇÃO DA COMUNIDADE
// ==========================================

export async function retirarPublicacao(
    observacaoId: string
): Promise<void> {
    const observacao =
        await buscarObservacaoPropria(observacaoId);

    if (observacao.visibility !== "public") {
        throw new Error(
            "Esta observação já está privada."
        );
    }

    const referenciaPrivada = doc(
        db,
        "observations",
        observacaoId
    );

    const referenciaPublica = doc(
        db,
        "publicObservations",
        observacaoId
    );

    const lote = writeBatch(db);

    // Mantém a observação no
    // histórico privado do usuário.

    lote.update(referenciaPrivada, {
        visibility: "private",
        updatedAt: serverTimestamp(),
    });

    // Remove sua versão pública,
    // incluindo a localização publicada.

    lote.delete(referenciaPublica);

    await lote.commit();
}
