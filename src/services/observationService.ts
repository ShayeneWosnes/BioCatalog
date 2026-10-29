

import {
    addDoc,
    collection,
    deleteDoc,
    doc,
    GeoPoint,
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
    // Identifica o usuário autenticado
    const usuario = auth.currentUser;

    if (!usuario || !usuario.emailVerified) {
        throw new Error(
            "Você precisa estar autenticado e com o e-mail verificado."
        );
    }

    // Atualiza o token para as regras do Firestore
    await usuario.getIdToken(true);

    // Consulta somente as observações do usuário
    const consulta = query(
        collection(db, "observations"),
        where("ownerId", "==", usuario.uid)
    );

    const resultado = await getDocs(consulta);

    // Converte os documentos para o modelo Observacao
    const observacoes: Observacao[] =
        resultado.docs.map((documento) => {
            const dados =
                documento.data() as Omit<Observacao, "id">;

            return {
                ...dados,
                id: documento.id,
            };
        });

    // Organiza as observações da mais recente
    // para a mais antiga
    observacoes.sort((a, b) => {
        return (
            b.observedAt.toMillis() -
            a.observedAt.toMillis()
        );
    });

    return observacoes;
}

// ==========================================
// UPDATE — EDITAR DESCRIÇÃO DA OBSERVAÇÃO
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
// DELETE — EXCLUIR OBSERVAÇÃO
// ==========================================

export async function excluirObservacao(
    observacaoId: string
): Promise<void> {
    const usuario = auth.currentUser;

    if (!usuario || !usuario.emailVerified) {
        throw new Error(
            "Você precisa estar autenticado e com o e-mail verificado."
        );
    }

    await usuario.getIdToken(true);

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

    await deleteDoc(referencia);
}
