
import {
    createUserWithEmailAndPassword,
    sendEmailVerification,
    updateProfile,
} from "firebase/auth";

import { auth } from "../config/firebase";

export async function cadastrarUsuario(
    nome: string,
    email: string,
    senha: string
) {
    const credencial = await createUserWithEmailAndPassword(
        auth,
        email.trim(),
        senha
    );

    await updateProfile(credencial.user, {
        displayName: nome.trim(),
    });

    await sendEmailVerification(credencial.user);

    return credencial.user;
}
