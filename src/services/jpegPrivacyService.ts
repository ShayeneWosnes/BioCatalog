
import { File } from "expo-file-system";


// VERIFICAR PRIVACIDADE DO JPEG


export async function validarPrivacidadeJPEG(
    imagemUri: string
): Promise<void> {
    const arquivo = new File(imagemUri);

    if (!arquivo.exists || arquivo.size === 0) {
        throw new Error(
            "A fotografia preparada não foi encontrada."
        );
    }

    const bytes = await arquivo.bytes();

    // Verifica a assinatura JPEG: FF D8.
    if (
        bytes.length < 4 ||
        bytes[0] !== 0xff ||
        bytes[1] !== 0xd8
    ) {
        throw new Error(
            "O arquivo preparado não é um JPEG válido."
        );
    }

    let posicao = 2;
    let encontrouImagem = false;

    while (posicao < bytes.length) {
        if (bytes[posicao] !== 0xff) {
            throw new Error(
                "A estrutura do JPEG preparado é inválida."
            );
        }

        // Ignora bytes FF de preenchimento.
        while (
            posicao < bytes.length &&
            bytes[posicao] === 0xff
        ) {
            posicao++;
        }

        if (posicao >= bytes.length) {
            throw new Error(
                "A estrutura do JPEG está incompleta."
            );
        }

        const marcador = bytes[posicao++];

        // SOS: início dos dados comprimidos da imagem.
        if (marcador === 0xda) {
            encontrouImagem = true;
            break;
        }

        // EOI antes dos dados da imagem é inválido.
        if (marcador === 0xd9) {
            break;
        }

        // Marcadores sem campo de comprimento.
        if (
            marcador === 0x01 ||
            (marcador >= 0xd0 && marcador <= 0xd7)
        ) {
            continue;
        }

        if (posicao + 2 > bytes.length) {
            throw new Error(
                "O JPEG contém um segmento incompleto."
            );
        }

        const tamanho =
            (bytes[posicao] << 8) |
            bytes[posicao + 1];

        if (
            tamanho < 2 ||
            posicao + tamanho > bytes.length
        ) {
            throw new Error(
                "O JPEG contém um segmento inválido."
            );
        }

        // APP1: pode conter EXIF, GPS e XMP.
        // APP13: pode conter metadados IPTC.
        // COM: comentários potencialmente sensíveis.
        if (
            marcador === 0xe1 ||
            marcador === 0xed ||
            marcador === 0xfe
        ) {
            throw new Error(
                "A fotografia contém metadados que precisam ser removidos antes do compartilhamento."
            );
        }

        posicao += tamanho;
    }

    if (!encontrouImagem) {
        throw new Error(
            "Não foi possível confirmar a estrutura da fotografia JPEG."
        );
    }
}
