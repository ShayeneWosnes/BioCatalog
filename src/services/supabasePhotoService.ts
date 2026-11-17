
import { File } from "expo-file-system";

import { auth } from "../config/firebase";
import { supabase } from "../config/supabase";


// CONFIGURAÇÕES DO STORAGE


const BUCKET = "biocatalog-photos";
const TAMANHO_MAXIMO = 10 * 1024 * 1024;

type TipoImagem =
    | "image/jpeg"
    | "image/png"
    | "image/webp";


// IDENTIFICAR FORMATO DA FOTOGRAFIA


function identificarTipoImagem(uri: string): {
    contentType: TipoImagem;
    extensao: string;
} {
    const caminho = uri.split("?")[0].toLowerCase();

    if (caminho.endsWith(".png")) {
        return {
            contentType: "image/png",
            extensao: "png",
        };
    }

    if (caminho.endsWith(".webp")) {
        return {
            contentType: "image/webp",
            extensao: "webp",
        };
    }

    if (
        caminho.endsWith(".jpg") ||
        caminho.endsWith(".jpeg")
    ) {
        return {
            contentType: "image/jpeg",
            extensao: "jpg",
        };
    }

    throw new Error(
        "Formato da fotografia não reconhecido. " +
        "Selecione uma imagem JPG, PNG ou WebP."
    );
}


// ENVIAR FOTOGRAFIA AO SUPABASE


export async function enviarFotoObservacao(
    fotoUri: string,
    observacaoId: string
): Promise<string> {
    const usuario = auth.currentUser;

    if (!usuario || !usuario.emailVerified) {
        throw new Error(
            "Você precisa estar autenticado " +
            "e com o e-mail verificado."
        );
    }

    if (!observacaoId.trim()) {
        throw new Error(
            "ID da observação inválido."
        );
    }

    // Atualiza as permissões do Firebase.
    await usuario.getIdToken(true);

    // Identifica o formato da fotografia.
    const { contentType, extensao } =
        identificarTipoImagem(fotoUri);


    // LER ARQUIVO LOCAL COM EXPO FILESYSTEM


    const fotografia = new File(fotoUri);

    if (!fotografia.exists) {
        throw new Error(
            "A fotografia não foi encontrada no celular."
        );
    }

    if (fotografia.size === 0) {
        throw new Error(
            "A fotografia está vazia."
        );
    }

    if (fotografia.size > TAMANHO_MAXIMO) {
        throw new Error(
            "A fotografia ultrapassa o limite de 10 MB."
        );
    }

    let arquivo: ArrayBuffer;

    try {
        arquivo = await fotografia.arrayBuffer();
    } catch {
        throw new Error(
            "Não foi possível ler a fotografia selecionada."
        );
    }

    if (arquivo.byteLength === 0) {
        throw new Error(
            "A fotografia está vazia."
        );
    }

    if (arquivo.byteLength > TAMANHO_MAXIMO) {
        throw new Error(
            "A fotografia ultrapassa o limite de 10 MB."
        );
    }


    // CAMINHO PRIVADO DO USUÁRIO


    const caminho =
        `private/${usuario.uid}/${observacaoId}.${extensao}`;

    // UPLOAD SUPABASE STORAGE


    const { error } = await supabase.storage
        .from(BUCKET)
        .upload(caminho, arquivo, {
            contentType,
            upsert: false,
        });

    if (error) {
        throw new Error(
            "Não foi possível enviar a fotografia: " +
            error.message
        );
    }

    return caminho;
}

// EXCLUIR FOTOGRAFIA DO SUPABASE


export async function excluirFotoObservacao(
    caminhoFoto: string
): Promise<void> {
    const usuario = auth.currentUser;

    if (!usuario || !usuario.emailVerified) {
        throw new Error(
            "Você precisa estar autenticado e com o e-mail verificado."
        );
    }

    const prefixoPermitido = `private/${usuario.uid}/`;

    if (
        !caminhoFoto.startsWith(prefixoPermitido) ||
        caminhoFoto.includes("..")
    ) {
        throw new Error(
            "O caminho da fotografia é inválido."
        );
    }

    await usuario.getIdToken(true);

    const { error } = await supabase.storage
        .from(BUCKET)
        .remove([caminhoFoto]);

    if (error) {
        throw new Error(
            "Não foi possível excluir a fotografia: " +
            error.message
        );
    }
}

export async function obterUrlFotoPrivada(
    caminhoFoto: string
): Promise<string> {
    const usuario = auth.currentUser;

    if (!usuario || !usuario.emailVerified) {
        throw new Error(
            "Você precisa estar autenticado e com o e-mail verificado."
        );
    }

    const prefixoPermitido = `private/${usuario.uid}/`;

    if (
        !caminhoFoto.startsWith(prefixoPermitido) ||
        caminhoFoto.includes("..")
    ) {
        throw new Error(
            "Você não tem permissão para acessar esta fotografia."
        );
    }

    await usuario.getIdToken(true);

    const { data, error } = await supabase.storage
        .from(BUCKET)
        .createSignedUrl(caminhoFoto, 300);

    if (error || !data?.signedUrl) {
        throw new Error(
            "Não foi possível carregar a fotografia."
        );
    }

    return data.signedUrl;
}
