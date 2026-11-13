
import {
    addDoc,
    collection,
    deleteDoc,
    doc,
    GeoPoint,
    getDoc,
    getDocs,
    query,
    serverTimestamp,
    Timestamp,
    updateDoc,
    where,
} from "firebase/firestore";

import { auth, db } from "../config/firebase";

import type {
    CategoriaObservacao,
    Observacao,
} from "../models/observation";

import type {
    ResultadoConsultaGBIF,
} from "./gbifService";

import type {
    CoordenadasObservacao,
} from "./locationService";

import {
    excluirFotoObservacao,
} from "./supabasePhotoService";

// ==========================================
// DADOS DO FORMULÁRIO
// ==========================================

export interface DadosNovaObservacao {
    category: CategoriaObservacao;
    notes: string;
    location: CoordenadasObservacao | null;
    gbifResult: ResultadoConsultaGBIF | null;
    observedAt?: Date;
}

// ==========================================
// CREATE — CRIAR OBSERVAÇÃO
// ==========================================

export async function criarObservacao(
    dados: DadosNovaObservacao
): Promise<string> {
    const usuario = auth.currentUser;

    if (!usuario || !usuario.emailVerified) {
        throw new Error(
            "Você precisa estar autenticado e com o e-mail verificado."
        );
    }

    await usuario.getIdToken(true);

    const descricao = dados.notes.trim();

    if (descricao.length > 500) {
        throw new Error(
            "A descrição deve ter no máximo 500 caracteres."
        );
    }

    const data = dados.observedAt ?? new Date();

    if (Number.isNaN(data.getTime())) {
        throw new Error(
            "A data da observação é inválida."
        );
    }

    let localizacao: GeoPoint | null = null;

    if (dados.location) {
        const { latitude, longitude } = dados.location;

        if (
            !Number.isFinite(latitude) ||
            !Number.isFinite(longitude) ||
            latitude < -90 ||
            latitude > 90 ||
            longitude < -180 ||
            longitude > 180
        ) {
            throw new Error(
                "As coordenadas da observação são inválidas."
            );
        }

        localizacao = new GeoPoint(
            latitude,
            longitude
        );
    }

    const resultado = dados.gbifResult;

    const taxon =
        resultado?.encontrado &&
            resultado.nomeCientifico
            ? {
                scientificName:
                    resultado.nomeCientifico,

                gbifUsageKey:
                    resultado.gbifUsageKey,

                gbifAcceptedUsageKey:
                    resultado.gbifAcceptedUsageKey,

                acceptedScientificName: null,

                taxonomicStatus:
                    resultado.statusTaxonomico,

                rank:
                    resultado.classificacao,

                source: "GBIF",

                checkedAt: serverTimestamp(),
            }
            : null;

    const observacao = {
        ownerId: usuario.uid,

        category: dados.category,

        notes: descricao,

        observedAt: Timestamp.fromDate(data),

        ...(localizacao
            ? { exactLocation: localizacao }
            : {}),

        identificationStatus: taxon
            ? "provisional"
            : "unidentified",

        taxon,

        visibility: "private",

        createdAt: serverTimestamp(),

        updatedAt: serverTimestamp(),
    };

    const referencia = await addDoc(
        collection(db, "observations"),
        observacao
    );

    return referencia.id;
}

// ==========================================
// READ — LISTAR MINHAS OBSERVAÇÕES
// ==========================================

export async function listarMinhasObservacoes(): Promise<
    Observacao[]
> {
    const usuario = auth.currentUser;

    if (!usuario || !usuario.emailVerified) {
        throw new Error(
            "Você precisa estar autenticado e com o e-mail verificado."
        );
    }

    await usuario.getIdToken(true);

    const consulta = query(
        collection(db, "observations"),
        where("ownerId", "==", usuario.uid)
    );

    const resultado = await getDocs(consulta);

    const observacoes: Observacao[] =
        resultado.docs.map((documento) => {
            const dados =
                documento.data() as Omit<Observacao, "id">;

            return {
                ...dados,
                id: documento.id,
            };
        });

    observacoes.sort((a, b) => {
        return (
            b.observedAt.toMillis() -
            a.observedAt.toMillis()
        );
    });

    return observacoes;
}

// ==========================================
// UPDATE — EDITAR DESCRIÇÃO
// ==========================================

export async function atualizarDescricaoObservacao(
    observacaoId: string,
    novaDescricao: string
): Promise<void> {
    const usuario = auth.currentUser;

    if (!usuario || !usuario.emailVerified) {
        throw new Error(
            "Você precisa estar autenticado e com o e-mail verificado."
        );
    }

    await usuario.getIdToken(true);

    const descricao = novaDescricao.trim();

    if (descricao.length > 500) {
        throw new Error(
            "A descrição deve ter no máximo 500 caracteres."
        );
    }

    if (!observacaoId.trim()) {
        throw new Error(
            "O identificador da observação é inválido."
        );
    }

    const referencia = doc(
        db,
        "observations",
        observacaoId
    );

    await updateDoc(referencia, {
        notes: descricao,
        updatedAt: serverTimestamp(),
    });
}

// ==========================================
// DELETE — EXCLUIR OBSERVAÇÃO E FOTOGRAFIA
// ==========================================

export async function excluirObservacao(
    observacaoId: string
): Promise<void> {
    // ------------------------------------------
    // 1. VERIFICAR AUTENTICAÇÃO
    // ------------------------------------------

    const usuario = auth.currentUser;

    if (!usuario || !usuario.emailVerified) {
        throw new Error(
            "Você precisa estar autenticado e com o e-mail verificado."
        );
    }

    await usuario.getIdToken(true);

    const id = observacaoId.trim();

    if (!id) {
        throw new Error(
            "O identificador da observação é inválido."
        );
    }

    // ------------------------------------------
    // 2. LOCALIZAR OBSERVAÇÃO NO FIRESTORE
    // ------------------------------------------

    const referencia = doc(
        db,
        "observations",
        id
    );

    const documento = await getDoc(referencia);

    if (!documento.exists()) {
        throw new Error(
            "Esta observação não foi encontrada."
        );
    }

    const dados = documento.data();

    // ------------------------------------------
    // 3. VALIDAR PROPRIETÁRIO
    // ------------------------------------------

    if (dados.ownerId !== usuario.uid) {
        throw new Error(
            "Você não tem permissão para excluir esta observação."
        );
    }

    // ------------------------------------------
    // 4. VALIDAR STATUS DE PUBLICAÇÃO
    // ------------------------------------------

    if (dados.visibility === "public") {
        throw new Error(
            "Retire a observação da comunidade antes de excluí-la."
        );
    }

    // ------------------------------------------
    // 5. IDENTIFICAR FOTOGRAFIA
    // ------------------------------------------

    const caminhoFoto =
        typeof dados.privatePhotoPath === "string"
            ? dados.privatePhotoPath
            : null;

    // ------------------------------------------
    // 6. EXCLUIR FOTOGRAFIA DO SUPABASE
    // ------------------------------------------

    if (caminhoFoto) {
        try {
            await excluirFotoObservacao(
                caminhoFoto
            );

            console.log(
                "Fotografia removida do Supabase:",
                caminhoFoto
            );
        } catch (erro) {
            console.error(
                "Erro ao excluir fotografia do Supabase:",
                erro
            );

            throw new Error(
                "Não foi possível remover a fotografia do Supabase. " +
                "A observação foi preservada. " +
                "Verifique sua conexão e tente novamente."
            );
        }
    }

    // ------------------------------------------
    // 7. EXCLUIR DOCUMENTO DO FIRESTORE
    // ------------------------------------------

    try {
        await deleteDoc(referencia);

        console.log(
            "Observação removida do Firestore:",
            id
        );
    } catch (erro) {
        console.error(
            "Erro ao excluir documento do Firestore:",
            erro
        );

        if (caminhoFoto) {
            throw new Error(
                "A fotografia foi removida do Supabase, " +
                "mas não foi possível excluir o registro do Firestore. " +
                "A observação ainda pode aparecer na lista sem imagem. " +
                "Tente excluir novamente. " +
                "Se o problema continuar, anote o ID: " +
                id
            );
        }

        throw new Error(
            "Não foi possível excluir a observação do Firestore. " +
            "Tente novamente."
        );
    }
}

// ==========================================
// VINCULAR FOTOGRAFIA À OBSERVAÇÃO
// ==========================================

export async function vincularFotoObservacao(
    observacaoId: string,
    caminhoFoto: string
): Promise<void> {
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

    const prefixoPermitido =
        `private/${usuario.uid}/`;

    if (
        !caminhoFoto.startsWith(prefixoPermitido) ||
        caminhoFoto.includes("..")
    ) {
        throw new Error(
            "O caminho da fotografia não é válido para este usuário."
        );
    }

    await usuario.getIdToken(true);

    const referencia = doc(
        db,
        "observations",
        observacaoId
    );

    await updateDoc(referencia, {
        privatePhotoPath: caminhoFoto,
        updatedAt: serverTimestamp(),
    });
}
