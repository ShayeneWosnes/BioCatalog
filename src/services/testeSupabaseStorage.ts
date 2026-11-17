
import { auth } from "../config/firebase";
import { supabase } from "../config/supabase";

export async function testarSupabaseStorage() {
    const usuario = auth.currentUser;

    if (!usuario || !usuario.emailVerified) {
        console.log("TESTE SUPABASE: usuário não autenticado.");
        return;
    }

    try {
        // Atualiza o token, incluindo as permissões do Firebase.
        await usuario.getIdToken(true);

        // Lista apenas a pasta do usuário autenticado.
        // Não envia, altera ou exclui fotografias.
        const caminho = `private/${usuario.uid}`;

        const { data, error } = await supabase.storage
            .from("biocatalog-photos")
            .list(caminho, { limit: 1 });

        if (error) {
            console.log("TESTE SUPABASE: erro:", error.message);
            return;
        }

        console.log("TESTE SUPABASE: acesso autorizado!");
        console.log(
            "Itens encontrados:",
            data?.length ?? 0
        );
    } catch (erro) {
        console.error(
            "TESTE SUPABASE: falha na conexão:",
            erro instanceof Error
                ? erro.message
                : "Erro desconhecido"
        );
    }
}
