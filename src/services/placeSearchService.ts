
// ==========================================
// BIOCATALOG
// SERVIÇO DE PESQUISA GEOGRÁFICA
// OPENSTREETMAP / NOMINATIM
// ==========================================

// ==========================================
// TIPOS DE LUGARES
// ==========================================

export type TipoLugar =
    | "cidade"
    | "regiao"
    | "local";

// ==========================================
// MODELO UTILIZADO PELO BIOCATALOG
// ==========================================

export interface LugarEncontrado {
    id: string;
    nome: string;
    enderecoCompleto: string;

    latitude: number;
    longitude: number;

    tipo: TipoLugar;
    categoriaOSM: string;

    // Limites geográficos retornados pelo OSM:
    // sul, norte, oeste, leste.
    limites: [number, number, number, number] | null;
}

// ==========================================
// RESPOSTA DO NOMINATIM
// ==========================================

interface RespostaNominatim {
    place_id: number;
    osm_type?: string;
    osm_id?: number;

    name?: string;
    display_name: string;

    lat: string;
    lon: string;

    category?: string;
    type?: string;
    addresstype?: string;

    boundingbox?: [
        string,
        string,
        string,
        string
    ];
}

// ==========================================
// CLASSIFICAR O TIPO DO LUGAR
// ==========================================

function classificarLugar(
    lugar: RespostaNominatim
): TipoLugar {
    const tipo = (
        lugar.addresstype ??
        lugar.type ??
        ""
    ).toLowerCase();

    const cidades = [
        "city",
        "town",
        "village",
        "municipality",
    ];

    const regioes = [
        "state",
        "county",
        "region",
        "suburb",
        "neighbourhood",
        "quarter",
        "district",
    ];

    if (cidades.includes(tipo)) {
        return "cidade";
    }

    if (regioes.includes(tipo)) {
        return "regiao";
    }

    return "local";
}

// ==========================================
// CONTROLE DE CONSULTAS
// ==========================================

// Evita repetir imediatamente pesquisas iguais.
const cache = new Map<string, LugarEncontrado[]>();

// Evita duas requisições simultâneas para o
// mesmo termo.
const pesquisasPendentes = new Map<
    string,
    Promise<LugarEncontrado[]>
>();

// Respeita um intervalo entre consultas ao
// serviço público do Nominatim.
let ultimaConsulta = 0;
let filaConsultas: Promise<void> = Promise.resolve();

function aguardarIntervalo(): Promise<void> {
    const tarefa = filaConsultas.then(async () => {
        const tempoDecorrido =
            Date.now() - ultimaConsulta;

        const espera = Math.max(
            0,
            1200 - tempoDecorrido
        );

        if (espera > 0) {
            await new Promise<void>((resolve) => {
                setTimeout(resolve, espera);
            });
        }

        ultimaConsulta = Date.now();
    });

    filaConsultas = tarefa.catch(() => { });

    return tarefa;
}

// ==========================================
// PESQUISAR CIDADE, REGIÃO OU LOCAL
// ==========================================

export async function pesquisarLugares(
    pesquisa: string
): Promise<LugarEncontrado[]> {
    const termo = pesquisa
        .trim()
        .replace(/\s+/g, " ");

    if (termo.length < 3) {
        throw new Error(
            "Digite pelo menos 3 caracteres para pesquisar."
        );
    }

    if (termo.length > 120) {
        throw new Error(
            "A pesquisa deve ter no máximo 120 caracteres."
        );
    }

    const chaveCache =
        termo.toLocaleLowerCase("pt-BR");

    // Retorna uma pesquisa já realizada.
    const resultadoCache = cache.get(chaveCache);

    if (resultadoCache) {
        return resultadoCache;
    }

    const pesquisaExistente =
        pesquisasPendentes.get(chaveCache);

    if (pesquisaExistente) {
        return pesquisaExistente;
    }

    const tarefa = (async (): Promise<
        LugarEncontrado[]
    > => {
        await aguardarIntervalo();

        // Consulta apenas quando o usuário
        // solicitar uma pesquisa.
        //
        // Sem autocomplete automático.

        const url =
            "https://nominatim.openstreetmap.org/search" +
            `?q=${encodeURIComponent(termo)}` +
            "&format=jsonv2" +
            "&addressdetails=1" +
            "&limit=8" +
            "&accept-language=pt-BR";

        let resposta: Response;

        try {
            resposta = await fetch(url, {
                method: "GET",
                headers: {
                    Accept: "application/json",
                    "Accept-Language": "pt-BR,pt;q=0.9",
                    "User-Agent":
                        "BioCatalog/1.0 (projeto educacional de biodiversidade)",
                },
            });
        } catch {
            throw new Error(
                "Não foi possível consultar os lugares. Verifique sua conexão."
            );
        }

        if (resposta.status === 429) {
            throw new Error(
                "O serviço de mapas está ocupado. Aguarde antes de pesquisar novamente."
            );
        }

        if (!resposta.ok) {
            throw new Error(
                `A pesquisa de lugares falhou (HTTP ${resposta.status}).`
            );
        }

        const dados: RespostaNominatim[] =
            await resposta.json();

        if (!Array.isArray(dados)) {
            throw new Error(
                "O serviço retornou uma resposta inválida."
            );
        }

        const resultados: LugarEncontrado[] = dados
            .map((lugar) => {
                const latitude = Number(lugar.lat);
                const longitude = Number(lugar.lon);

                if (
                    !Number.isFinite(latitude) ||
                    !Number.isFinite(longitude) ||
                    latitude < -90 ||
                    latitude > 90 ||
                    longitude < -180 ||
                    longitude > 180
                ) {
                    return null;
                }

                const nome =
                    lugar.name?.trim() ||
                    lugar.display_name.split(",")[0].trim();

                let limites:
                    | [number, number, number, number]
                    | null = null;

                if (lugar.boundingbox?.length === 4) {
                    const numeros = lugar.boundingbox.map(
                        (valor) => Number(valor)
                    );

                    if (numeros.every(Number.isFinite)) {
                        limites = [
                            numeros[0],
                            numeros[1],
                            numeros[2],
                            numeros[3],
                        ];
                    }
                }

                const identificador =
                    lugar.osm_type && lugar.osm_id
                        ? `${lugar.osm_type}:${lugar.osm_id}`
                        : String(lugar.place_id);

                return {
                    id: identificador,
                    nome,
                    enderecoCompleto: lugar.display_name,
                    latitude,
                    longitude,
                    tipo: classificarLugar(lugar),
                    categoriaOSM:
                        lugar.category ?? "desconhecida",
                    limites,
                };
            })
            .filter(
                (lugar): lugar is LugarEncontrado =>
                    lugar !== null
            );

        // Cache simples, limitado a 30 pesquisas.
        if (cache.size >= 30) {
            const primeiraChave =
                cache.keys().next().value;

            if (primeiraChave) {
                cache.delete(primeiraChave);
            }
        }

        cache.set(chaveCache, resultados);

        return resultados;
    })();

    pesquisasPendentes.set(chaveCache, tarefa);

    try {
        return await tarefa;
    } finally {
        pesquisasPendentes.delete(chaveCache);
    }
}
