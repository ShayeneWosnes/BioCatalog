
import type {
    CategoriaObservacao,
} from "../models/observation";

// ==========================================
// TIPOS DE CORRESPONDÊNCIA DO GBIF
// ==========================================

export type TipoCorrespondenciaGBIF =
    | "EXACT"
    | "FUZZY"
    | "HIGHERRANK"
    | "AGGREGATE"
    | "NONE";

// ==========================================
// RESPOSTA DA API GBIF
// ==========================================

interface RespostaGBIF {
    usageKey?: number;
    acceptedUsageKey?: number;
    scientificName?: string;
    canonicalName?: string;
    rank?: string;
    status?: string;
    confidence?: number;
    matchType?: TipoCorrespondenciaGBIF;
    kingdom?: string;
}

// ==========================================
// RESULTADO UTILIZADO PELO BIOCATALOG
// ==========================================

export interface ResultadoConsultaGBIF {
    nomePesquisado: string;
    nomeCientifico: string | null;
    nomeCanonico: string | null;
    gbifUsageKey: number | null;
    gbifAcceptedUsageKey: number | null;
    classificacao: string | null;
    statusTaxonomico: string | null;
    confianca: number | null;
    tipoCorrespondencia: TipoCorrespondenciaGBIF;
    encontrado: boolean;
}

// ==========================================
// CONSULTAR NOME CIENTÍFICO
// ==========================================

export async function consultarNomeCientifico(
    nome: string,
    categoria: CategoriaObservacao
): Promise<ResultadoConsultaGBIF> {

    // Remove espaços desnecessários
    const nomeLimpo = nome
        .trim()
        .replace(/\s+/g, " ");

    if (nomeLimpo.length < 3) {
        throw new Error(
            "Informe um nome científico com pelo menos 3 caracteres."
        );
    }

    // Define o reino taxonômico da pesquisa
    const reino =
        categoria === "fauna"
            ? "Animalia"
            : "Plantae";

    // Monta o endereço da API
    const url =
        "https://api.gbif.org/v1/species/match" +
        `?name=${encodeURIComponent(nomeLimpo)}` +
        `&kingdom=${encodeURIComponent(reino)}`;

    let resposta: Response;

    // ==========================================
    // REALIZAR CONSULTA
    // ==========================================

    try {
        resposta = await fetch(url);
    } catch {
        throw new Error(
            "Não foi possível conectar ao GBIF. Verifique sua internet."
        );
    }

    if (!resposta.ok) {
        throw new Error(
            `O GBIF não respondeu corretamente (HTTP ${resposta.status}).`
        );
    }

    const dados: RespostaGBIF =
        await resposta.json();

    // ==========================================
    // ANALISAR CORRESPONDÊNCIA
    // ==========================================

    const tipoCorrespondencia =
        dados.matchType ?? "NONE";

    // Uma correspondência HIGHERRANK não
    // identifica necessariamente o nome buscado.
    const correspondenciaExata =
        tipoCorrespondencia === "EXACT";

    // Evita aceitar grupos muito abrangentes
    // como identificação de uma observação.
    const classificacoesMuitoAmplas = [
        "KINGDOM",
        "PHYLUM",
        "CLASS",
        "ORDER",
    ];

    const classificacao = dados.rank ?? null;

    const classificacaoAdequada =
        classificacao !== null &&
        !classificacoesMuitoAmplas.includes(
            classificacao.toUpperCase()
        );

    // Verifica se o reino retornado é compatível.
    // Algumas respostas podem não trazer esse campo.
    const reinoCompativel =
        !dados.kingdom ||
        dados.kingdom.toLowerCase() ===
        reino.toLowerCase();

    // É necessário existir um identificador válido.
    const possuiIdentificador =
        typeof dados.usageKey === "number" &&
        Number.isInteger(dados.usageKey) &&
        dados.usageKey > 0;

    const possuiNomeCientifico =
        typeof dados.scientificName === "string" &&
        dados.scientificName.trim().length > 0;

    // Somente aceita identificação taxonômica
    // suficientemente específica e exata.
    const encontrado =
        correspondenciaExata &&
        classificacaoAdequada &&
        reinoCompativel &&
        possuiIdentificador &&
        possuiNomeCientifico;

    // ==========================================
    // RETORNAR RESULTADO PARA O APLICATIVO
    // ==========================================

    return {
        nomePesquisado: nomeLimpo,

        nomeCientifico: encontrado
            ? dados.scientificName ?? null
            : null,

        nomeCanonico: encontrado
            ? dados.canonicalName ?? null
            : null,

        gbifUsageKey: encontrado
            ? dados.usageKey ?? null
            : null,

        gbifAcceptedUsageKey: encontrado
            ? dados.acceptedUsageKey ?? null
            : null,

        classificacao: encontrado
            ? classificacao
            : null,

        statusTaxonomico: encontrado
            ? dados.status ?? null
            : null,

        confianca:
            typeof dados.confidence === "number"
                ? dados.confidence
                : null,

        tipoCorrespondencia,
        encontrado,
    };
}
// Buscar sugestões de nomes científicos no GBIF
export async function buscarSugestoesGBIF(
    texto: string,
    categoria: CategoriaObservacao
) {
    const termo = texto.trim();

    if (termo.length < 3) return [];

    const reino = categoria === "fauna"
        ? "Animalia"
        : "Plantae";

    const url =
        "https://api.gbif.org/v1/species/suggest" +
        `?q=${encodeURIComponent(termo)}&rank=SPECIES&limit=40`;

    const resposta = await fetch(url);

    if (!resposta.ok) {
        throw new Error("Erro ao consultar o GBIF.");
    }

    const dados = await resposta.json();

    return dados.filter(
        (item: any) =>
            item.kingdom === reino &&
            item.canonicalName &&
            typeof item.key === "number"
    );
}