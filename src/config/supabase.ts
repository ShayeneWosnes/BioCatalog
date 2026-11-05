
import { createClient } from "@supabase/supabase-js";
import "react-native-url-polyfill/auto";
import { auth } from "./firebase";

// Configurações públicas do Supabase
const supabaseUrl =
    process.env.EXPO_PUBLIC_SUPABASE_URL;

const supabaseKey =
    process.env.EXPO_PUBLIC_SUPABASE_KEY;

if (!supabaseUrl || !supabaseKey) {
    throw new Error(
        "As configurações do Supabase não foram encontradas."
    );
}

// Inicializa o Supabase utilizando Firebase Authentication
export const supabase = createClient(
    supabaseUrl,
    supabaseKey,
    {
        accessToken: async () => {
            const usuario = auth.currentUser;

            if (!usuario || !usuario.emailVerified) {
                return null;
            }

            // Obtém o token atualizado do Firebase
            return await usuario.getIdToken();
        },
    }
);
