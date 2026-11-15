
import { File, Paths } from "expo-file-system";

import {
    ImageManipulator,
    SaveFormat,
} from "expo-image-manipulator";

import { auth } from "../config/firebase";
import { supabase } from "../config/supabase";

import {
    obterUrlFotoPrivada,
} from "./supabasePhotoService";

import {
    validarPrivacidadeJPEG,
} from "./jpegPrivacyService";

// ==========================================
// CONFIGURAÇÕES
// ==========================================

const BUCKET_COMUNIDADE =
    "biocatalog-community-photos";

const LARGURA_MAXIMA = 1600;
const QUALIDADE_JPEG = 0.8;
const TAMANHO_MAXIMO = 10 * 1024 * 1024;

// ==========================================
// PREPARAR IMAGEM LOCAL
// ==========================================

export async function prepararFotoComunidade(
    imagemLocalUri: string
): Promise<string> {
    if (!imagemLocalUri.trim()) {
        throw new Error(
            "Nenhuma fotografia foi informada."
        );
    }

    const arquivoOriginal = new File(imagemLocalUri);

    if (
        !arquivoOriginal.exists ||
        arquivoOriginal.size === 0
    ) {
        throw new Error(
            "A fotografia original não foi encontrada."
        );
    }

    if (arquivoOriginal.size > TAMANHO_MAXIMO) {
        throw new Error(
            "A fotografia original ultrapassa 10 MB."
        );
    }

    // Cria uma nova imagem a partir da original.
    const contexto =
        ImageManipulator.manipulate(imagemLocalUri);

    contexto.resize({
        width: LARGURA_MAXIMA,
    });

    const imagemProcessada =
        await contexto.renderAsync();

    const resultado =
        await imagemProcessada.saveAsync({
            format: SaveFormat.JPEG,
            compress: QUALIDADE_JPEG,
        });

    const copiaPublica = new File(resultado.uri);

    if (
        !copiaPublica.exists ||
        copiaPublica.size === 0
    ) {
        throw new Error(
            "Não foi possível preparar a fotografia."
        );
    }

    if (copiaPublica.size > TAMANHO_MAXIMO) {
        throw new Error(
            "A fotografia preparada ultrapassa 10 MB."
        );
    }

    // Verifica os segmentos de metadados
    // potencialmente sensíveis na nova imagem.
    try {
        await validarPrivacidadeJPEG(resultado.uri);
    } catch (erro) {
        // Não conserva no cache a imagem rejeitada.
        if (copiaPublica.exists) {
            copiaPublica.delete();
        }

        throw erro;
    }

    return resultado.uri;
}

// ==========================================
// PREPARAR FOTO PRIVADA DO SUPABASE
// ==========================================

export async function prepararFotoPrivadaComunidade(
    caminhoPrivado: string
): Promise<string> {
    if (!caminhoPrivado.trim()) {
        throw new Error(
            "Esta observação não possui fotografia."
        );
    }

    // Esta função verifica a autenticação,
    // o e-mail e a propriedade do caminho privado.
    const urlTemporaria =
        await obterUrlFotoPrivada(caminhoPrivado);

    // Mantém a extensão original somente
    // durante o processamento local.
    const extensao = caminhoPrivado
        .split(".")
        .pop()
        ?.toLowerCase();

    if (
        extensao !== "jpg" &&
        extensao !== "jpeg" &&
        extensao !== "png" &&
        extensao !== "webp"
    ) {
        throw new Error(
            "Formato de fotografia não suportado."
        );
    }

    const nomeTemporario =
        `biocatalog-temp-${Date.now()}-` +
        `${Math.random().toString(36).slice(2)}.` +
        extensao;

    const destino = new File(
        Paths.cache,
        nomeTemporario
    );

    try {
        // Baixa uma cópia temporária do arquivo privado.
        const arquivoBaixado =
            await File.downloadFileAsync(
                urlTemporaria,
                destino
            );

        if (
            !arquivoBaixado.exists ||
            arquivoBaixado.size === 0
        ) {
            throw new Error(
                "Não foi possível baixar a fotografia."
            );
        }

        if (arquivoBaixado.size > TAMANHO_MAXIMO) {
            throw new Error(
                "A fotografia ultrapassa 10 MB."
            );
        }

        // Gera e valida uma nova versão JPEG.
        return await prepararFotoComunidade(
            arquivoBaixado.uri
        );
    } finally {
        // Remove a cópia temporária da imagem original.
        if (destino.exists) {
            destino.delete();
        }
    }
}

// ==========================================
// ENVIAR FOTOGRAFIA PARA A COMUNIDADE
// ==========================================

export async function enviarFotoComunidade(
    observacaoId: string,
    caminhoPrivado: string,
    compartilhamentoAutorizado: boolean
): Promise<string> {
    const usuario = auth.currentUser;

    if (!usuario || !usuario.emailVerified) {
        throw new Error(
            "Você precisa estar autenticado e com o e-mail verificado."
        );
    }

    // Não permite compartilhar sem autorização.
    if (!compartilhamentoAutorizado) {
        throw new Error(
            "O compartilhamento da fotografia não foi autorizado."
        );
    }

    if (
        !observacaoId.trim() ||
        observacaoId.includes("/") ||
        observacaoId.includes("..")
    ) {
        throw new Error(
            "O identificador da observação é inválido."
        );
    }

    const prefixoPrivado =
        `private/${usuario.uid}/`;

    if (
        !caminhoPrivado.startsWith(prefixoPrivado) ||
        caminhoPrivado.includes("..")
    ) {
        throw new Error(
            "A fotografia não pertence ao usuário autenticado."
        );
    }

    // Atualiza o token de autenticação.
    await usuario.getIdToken(true);

    let caminhoTemporario: string | null = null;

    try {
        // ========================================
        // PREPARAR FOTOGRAFIA
        // ========================================

        caminhoTemporario =
            await prepararFotoPrivadaComunidade(
                caminhoPrivado
            );

        const arquivo = new File(caminhoTemporario);

        if (
            !arquivo.exists ||
            arquivo.size === 0 ||
            arquivo.size > TAMANHO_MAXIMO
        ) {
            throw new Error(
                "A fotografia preparada é inválida."
            );
        }

        // ========================================
        // VALIDAR PRIVACIDADE ANTES DO UPLOAD
        // ========================================

        // Segunda validação de segurança:
        // nenhuma imagem segue para o Supabase
        // antes desta verificação.
        await validarPrivacidadeJPEG(
            caminhoTemporario
        );

        // ========================================
        // LER CONTEÚDO DA FOTOGRAFIA
        // ========================================

        const conteudo = await arquivo.arrayBuffer();

        if (
            conteudo.byteLength === 0 ||
            conteudo.byteLength > TAMANHO_MAXIMO
        ) {
            throw new Error(
                "O conteúdo da fotografia é inválido."
            );
        }

        // ========================================
        // DEFINIR CAMINHO PÚBLICO
        // ========================================

        const caminhoPublico =
            `public/${usuario.uid}/${observacaoId}.jpg`;

        // ========================================
        // ENVIAR PARA O SUPABASE
        // ========================================

        const { error } = await supabase.storage
            .from(BUCKET_COMUNIDADE)
            .upload(caminhoPublico, conteudo, {
                contentType: "image/jpeg",
                upsert: false,
            });

        if (error) {
            throw new Error(
                "Não foi possível enviar a fotografia pública: " +
                error.message
            );
        }

        // Retorna somente o caminho do arquivo.
        return caminhoPublico;
    } finally {
        // ========================================
        // LIMPAR ARQUIVO TEMPORÁRIO
        // ========================================

        if (caminhoTemporario) {
            const temporario =
                new File(caminhoTemporario);

            if (temporario.exists) {
                temporario.delete();
            }
        }
    }
}
