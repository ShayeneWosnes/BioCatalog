import { getDownloadURL, getStorage, ref, uploadBytes, deleteObject } from "firebase/storage";
import { auth, app } from "../config/firebase";

// Armazena somente o caminho no Firestore: URLs de download com token
// não são uma garantia adequada de privacidade.
const storage = getStorage(app);
const MAX_BYTES = 10 * 1024 * 1024;

export async function enviarFotoPrivada(
  uriLocal: string,
  observacaoId: string
): Promise<string> {
  const usuario = auth.currentUser;
  if (!usuario || !usuario.emailVerified) {
    throw new Error("É necessário entrar com um e-mail verificado.");
  }
  if (!/^[A-Za-z0-9_-]+$/.test(observacaoId)) {
    throw new Error("Identificador da observação inválido.");
  }

  const resposta = await fetch(uriLocal);
  if (!resposta.ok) throw new Error("Não foi possível ler a fotografia.");
  const blob = await resposta.blob();
  if (!blob.size || blob.size > MAX_BYTES) {
    throw new Error("A fotografia deve ter até 10 MB.");
  }

  // Preferir formatos decodificados conhecidos; não aceitar SVG ou HTML.
  const tipo = blob.type.toLowerCase();
  const tiposAceitos = ["image/jpeg", "image/png", "image/webp"];
  if (!tiposAceitos.includes(tipo)) {
    throw new Error("Use uma fotografia JPG, PNG ou WebP.");
  }
  const extensao = tipo === "image/png" ? "png" :
    tipo === "image/webp" ? "webp" : "jpg";
  const caminho = `observationPhotos/private/${usuario.uid}/${observacaoId}/main.${extensao}`;
  await usuario.getIdToken(true);
  await uploadBytes(ref(storage, caminho), blob, { contentType: tipo });
  return caminho;
}

// Usar somente com documentos que pertençam ao usuário atual.
// As regras do Storage são a barreira de segurança no servidor.
export async function excluirFotoPrivada(caminho: string): Promise<void> {
  const usuario = auth.currentUser;
  if (!usuario || !usuario.emailVerified) {
    throw new Error("É necessário entrar com um e-mail verificado.");
  }
  const prefixo = `observationPhotos/private/${usuario.uid}/`;
  if (!caminho.startsWith(prefixo) || caminho.includes("..")) {
    throw new Error("Caminho da fotografia inválido.");
  }
  await usuario.getIdToken(true);
  await deleteObject(ref(storage, caminho));
}

// Para uso em telas autorizadas. Não persistir a URL obtida no Firestore.
export async function obterUrlTemporariaFotoPrivada(caminho: string): Promise<string> {
  const usuario = auth.currentUser;
  if (!usuario || !usuario.emailVerified) {
    throw new Error("É necessário entrar com um e-mail verificado.");
  }
  const prefixo = `observationPhotos/private/${usuario.uid}/`;
  if (!caminho.startsWith(prefixo)) {
    throw new Error("Caminho da fotografia inválido.");
  }
  // ATENÇÃO: getDownloadURL retorna URL com token reutilizável.
  // Não compartilhar com terceiros, publicar ou manter em logs.
  return await getDownloadURL(ref(storage, caminho));
}
