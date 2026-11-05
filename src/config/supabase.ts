import "react-native-url-polyfill/auto";
import { createClient } from "@supabase/supabase-js";
import { auth } from "../config/firebase";

// Supabase é utilizado somente para Storage.
// A identidade dos usuários continua sendo gerenciada pelo Firebase Auth.
const url = process.env.EXPO_PUBLIC_SUPABASE_URL;
const key = process.env.EXPO_PUBLIC_SUPABASE_KEY;

if (!url || !key) {
  throw new Error(
    "Configure EXPO_PUBLIC_SUPABASE_URL e EXPO_PUBLIC_SUPABASE_KEY no .env.local."
  );
}

export const supabase = createClient(url, key, {
  accessToken: async () => {
    const user = auth.currentUser;
    if (!user || !user.emailVerified) return null;
    return await user.getIdToken();
  },
});
