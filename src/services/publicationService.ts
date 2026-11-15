
import {
    doc,
    GeoPoint,
    getDoc,
    serverTimestamp,
    writeBatch,
} from "firebase/firestore";

import { auth, db } from "../config/firebase";
import { supabase } from "../config/supabase";

import type {
    Observacao,
} from "../models/observation";

import {
    enviarFotoComunidade,
} from "./communityPhotoService";

// ==========================================
// CONFIGURAÇÕES
// ==========================================

const BUCKET_COMUNIDADE =
    "biocatalog-community-photos";

// Será ativado após validarmos a remoção de
// metadados e a exclusão real no Supabase.
const HABILITAR_FOTOS_PUBLICAS = true;

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
// BUSCAR OBSERVAÇÃO DO PROPRIETÁRIO
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
// OBTER LOCALIZAÇÃO EXATA
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
// LOCALIZAÇÃO LEGADA
// ==========================================

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
// LOCALIZAÇÃO APROXIMADA
// ==========================================

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
// PREPARAR LOCALIZAÇÃO PÚBLICA
// ==========================================

function prepararLocalizacaoPublica(
    observacao: Observacao,
    opcoes: OpcoesPublicacao
) {
    // LOCALIZAÇÃO EXATA

    if (opcoes.modoLocalizacao === "exact") {
        if (
            opcoes.confirmouCompartilhamentoExato !== true
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

    // LOCALIZAÇÃO APROXIMADA

    if (opcoes.modoLocalizacao === "approximate") {
        return {
            locationMode: "approximate",
            publicLocation:
                gerarLocalizacaoAproximada(observacao),
            publicPlaceId: null,
            publicPlaceName: null,
            publicPlaceType: null,
        };
    }

    // LOCAL ESCOLHIDO

    if (opcoes.modoLocalizacao === "place") {
        if (
            opcoes.confirmouCompartilhamentoLocal !== true
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

        if (!id || id.length > 150) {
            throw new Error(
                "O identificador do local é inválido."
            );
        }

        if (nome.length < 2 || nome.length > 120) {
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

    // LOCALIZAÇÃO OCULTA

    return {
        locationMode: "hidden",
        publicLocation: null,
        publicPlaceId: null,
        publicPlaceName: null,
        publicPlaceType: null,
    };
}

// ==========================================
// REMOVER CÓPIA PÚBLICA DO SUPABASE
// ==========================================

async function removerFotoPublica(
    caminhoPublico: string,
    observacaoId: string
): Promise<void> {
    const usuario = auth.currentUser;

    if (!usuario || !usuario.emailVerified) {
        throw new Error(
            "Usuário não autenticado."
        );
    }

    const caminhoEsperado =
        `public/${usuario.uid}/${observacaoId}.jpg`;

    if (caminhoPublico !== caminhoEsperado) {
        throw new Error(
            "O caminho da fotografia pública é inválido."
        );
    }

    await usuario.getIdToken(true);

    const { data, error } = await supabase.storage
        .from(BUCKET_COMUNIDADE)
        .remove([caminhoPublico]);

    if (error) {
        throw new Error(
            "Não foi possível remover a fotografia pública: " +
            error.message
        );
    }

    // Evita considerar uma remoção vazia como
    // uma exclusão confirmada.
    if (!data || data.length === 0) {
        throw new Error(
            "O Supabase não confirmou a remoção da fotografia pública."
        );
    }
}

// ==========================================
// PUBLICAR OBSERVAÇÃO
// ==========================================

export async function publicarObservacao(
    observacaoId: string,
    opcoes?: OpcoesPublicacao,
    compartilharFoto: boolean = false
): Promise<void> {
    const observacao =
        await buscarObservacaoPropria(observacaoId);

    if (observacao.visibility === "public") {
        throw new Error(
            "Esta observação já está publicada."
        );
    }

    // Validar fotografia antes de publicar.

    if (
        compartilharFoto &&
        !observacao.privatePhotoPath
    ) {
        throw new Error(
            "Esta observação não possui fotografia para compartilhar."
        );
    }

    if (
        compartilharFoto &&
        !HABILITAR_FOTOS_PUBLICAS
    ) {
        throw new Error(
            "O compartilhamento de fotografias está em preparação. Desmarque a opção de compartilhar a foto para publicar somente os dados da observação."
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

    // ========================================
    // DADOS QUE PODEM SER COMPARTILHADOS
    // ========================================

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

    let caminhoPublico: string | null = null;

    // ========================================
    // UPLOAD DA FOTOGRAFIA AUTORIZADA
    // ========================================

    if (
        compartilharFoto &&
        observacao.privatePhotoPath
    ) {
        caminhoPublico = await enviarFotoComunidade(
            observacaoId,
            observacao.privatePhotoPath,
            true
        );
    }

    // ========================================
    // GRAVAR PUBLICAÇÃO NO FIRESTORE
    // ========================================

    try {
        const lote = writeBatch(db);

        lote.update(referenciaPrivada, {
            visibility: "public",
            updatedAt: serverTimestamp(),
        });

        lote.set(referenciaPublica, {
            ...dadosPublicos,
            publicPhotoPath: caminhoPublico,
        });

        await lote.commit();
    } catch (erroPublicacao) {
        // O Firestore falhou depois do upload.
        // Tenta desfazer a cópia pública.

        if (caminhoPublico) {
            try {
                await removerFotoPublica(
                    caminhoPublico,
                    observacaoId
                );
            } catch (erroLimpeza) {
                console.error(
                    "Falha crítica na limpeza da fotografia:",
                    erroLimpeza
                );

                throw new Error(
                    "A publicação não foi concluída e não foi possível confirmar a exclusão da fotografia pública. Verifique o Supabase Storage antes de tentar novamente. Caminho: " +
                    caminhoPublico
                );
            }
        }

        throw erroPublicacao;
    }
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

    const documentoPublico =
        await getDoc(referenciaPublica);

    if (!documentoPublico.exists()) {
        throw new Error(
            "A publicação pública não foi encontrada."
        );
    }

    const caminhoPublico =
        documentoPublico.data().publicPhotoPath;

    // ========================================
    // REMOVER FOTOGRAFIA PÚBLICA PRIMEIRO
    // ========================================

    if (
        typeof caminhoPublico === "string" &&
        caminhoPublico.length > 0
    ) {
        await removerFotoPublica(
            caminhoPublico,
            observacaoId
        );
    }

    // ========================================
    // RETIRAR DOCUMENTO PÚBLICO
    // ========================================

    const lote = writeBatch(db);

    lote.update(referenciaPrivada, {
        visibility: "private",
        updatedAt: serverTimestamp(),
    });

    lote.delete(referenciaPublica);

    await lote.commit();
}
