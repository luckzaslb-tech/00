// Firebase Admin — usado só no servidor (webhook do WhatsApp) para gravar no
// Firestore sem um usuário logado. As escritas do Admin ignoram as regras.
import { getApps, initializeApp, cert } from "firebase-admin/app";
import { getFirestore } from "firebase-admin/firestore";

function getAdminDb() {
  if (!getApps().length) {
    const raw = process.env.FIREBASE_SERVICE_ACCOUNT;
    if (!raw) throw new Error("FIREBASE_SERVICE_ACCOUNT não configurado");
    // Aceita o JSON direto OU em base64 (uma linha só — mais fácil de colar na Vercel)
    const json = raw.trim().startsWith("{") ? raw : Buffer.from(raw.trim(), "base64").toString("utf-8");
    const svc = JSON.parse(json);
    // A private_key vem com \n escapados quando colada em env var
    if (svc.private_key) svc.private_key = svc.private_key.replace(/\\n/g, "\n");
    initializeApp({ credential: cert(svc) });
  }
  return getFirestore();
}

export { getAdminDb };
