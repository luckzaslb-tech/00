// Firebase Admin — usado só no servidor. Escritas do Admin ignoram as regras.
// Também valida o ID token do usuário logado e controla a quota de uso da IA.
import { getApps, initializeApp, cert } from "firebase-admin/app";
import { getFirestore, FieldValue } from "firebase-admin/firestore";
import { getAuth } from "firebase-admin/auth";

function ensureInit() {
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
}

function getAdminDb() { ensureInit(); return getFirestore(); }
function getAdminAuth() { ensureInit(); return getAuth(); }

// Verifica o "Authorization: Bearer <idToken>" → retorna o uid (ou lança).
async function uidDoToken(req) {
  const authz = req.headers.authorization || "";
  const token = authz.startsWith("Bearer ") ? authz.slice(7).trim() : "";
  if (!token) { const e = new Error("Não autenticado"); e.status = 401; throw e; }
  try {
    const decoded = await getAdminAuth().verifyIdToken(token);
    return decoded.uid;
  } catch { const e = new Error("Token inválido"); e.status = 401; throw e; }
}

// Limites mensais de uso da IA por plano (controle de custo).
const LIMITES = { foto: { free: 15, premium: 300 } };

// Mês atual no fuso do Brasil (o servidor roda em UTC): "YYYY-MM".
const mesBR = () => new Date().toLocaleDateString("en-CA", { timeZone: "America/Sao_Paulo" }).slice(0, 7);

// Confere a quota do usuário e incrementa o contador do mês. Retorna {ok,limite,plano,usado}.
async function consumirQuota(db, uid, tipo) {
  const limites = LIMITES[tipo] || { free: 0, premium: 0 };
  const perfil = await db.doc(`users/${uid}/perfil/dados`).get();
  const plano = perfil.data()?.plano === "premium" ? "premium" : "free";
  const limite = limites[plano];
  const mes = mesBR();
  const usoRef = db.doc(`users/${uid}/uso/${mes}`);
  const usado = (await usoRef.get()).data()?.[tipo] || 0;
  if (usado >= limite) return { ok: false, limite, plano, usado };
  await usoRef.set({ [tipo]: FieldValue.increment(1), atualizadoEm: new Date().toISOString() }, { merge: true });
  return { ok: true, limite, plano, usado: usado + 1 };
}

export { getAdminDb, getAdminAuth, uidDoToken, consumirQuota, LIMITES };
