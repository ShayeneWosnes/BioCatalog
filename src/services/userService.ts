
import { reload, User } from "firebase/auth";
import {
    doc,
    getDoc,
    serverTimestamp,
    setDoc,
} from "firebase/firestore";

import { db } from "../config/firebase";

// Cria o perfil no Firestore somente se ainda não existir.
export async function criarPerfilSeNecessario(user: User) {
    // Atualiza os dados de autenticação.
    await reload(user);

    // Somente contas com e-mail verificado podem
    // criar um perfil, conforme RN02.
    if (!user.emailVerified) {
        throw new Error("E-mail ainda não verificado.");
    }

    // Atualiza o token para refletir a verificação do e-mail.
    await user.getIdToken(true);

    // Referência: users/{uid}
    const perfilRef = doc(db, "users", user.uid);

    // Verifica se o perfil já foi cadastrado.
    const perfilExistente = await getDoc(perfilRef);

    if (perfilExistente.exists()) {
        return;
    }

    const nome = user.displayName?.trim();
    const email = user.email?.trim();

    if (!nome || !email) {
        throw new Error(
            "Nome ou e-mail não encontrado no cadastro."
        );
    }

    // Cria o perfil usando o UID do Firebase Authentication.
    await setDoc(perfilRef, {
        uid: user.uid,
        displayName: nome,
        email: email,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
    });
}
