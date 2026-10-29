
import AsyncStorage from "@react-native-async-storage/async-storage";
import { getApp, getApps, initializeApp } from "firebase/app";
import { getAuth, initializeAuth } from "firebase/auth";

// O Firebase possui uma exportação específica para React Native.
// @ts-expect-error: tipagem React Native não reconhecida nesta versão
import { getReactNativePersistence } from "firebase/auth";

import { getFirestore } from "firebase/firestore";

// Configurações do projeto BioCatalog
const firebaseConfig = {
    apiKey: process.env.EXPO_PUBLIC_FIREBASE_API_KEY,
    authDomain: process.env.EXPO_PUBLIC_FIREBASE_AUTH_DOMAIN,
    projectId: process.env.EXPO_PUBLIC_FIREBASE_PROJECT_ID,
    storageBucket: process.env.EXPO_PUBLIC_FIREBASE_STORAGE_BUCKET,
    messagingSenderId:
        process.env.EXPO_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
    appId: process.env.EXPO_PUBLIC_FIREBASE_APP_ID,
};

// Inicializar ou recuperar aplicativo Firebase
const app = getApps().length
    ? getApp()
    : initializeApp(firebaseConfig);

// Autenticação com persistência no celular
const auth = (() => {
    try {
        return initializeAuth(app, {
            persistence: getReactNativePersistence(AsyncStorage),
        });
    } catch (error) {
        if (
            (error as { code?: string }).code ===
            "auth/already-initialized"
        ) {
            return getAuth(app);
        }
        throw error;
    }
})();

// Banco de dados Firestore
const db = getFirestore(app);

export { app, auth, db };

