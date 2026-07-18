// Webhook do WhatsApp (Twilio Sandbox). Recebe mensagens, identifica o usuário
// pelo número, interpreta texto (parser reusado) ou foto (Claude vision) e grava
// o lançamento no Firestore via Admin. Responde com TwiML.
import crypto from "crypto";
import { getAdminDb } from "./_firebaseAdmin.js";
import { localAI } from "../src/lib/ai.js";
import { fmt } from "../src/lib/utils.js";

const phoneFrom = from => String(from || "").replace(/^whatsapp:/, "").trim();
// Data de hoje no fuso do Brasil (o servidor roda em UTC)
const dataHojeBR = () => new Date().toLocaleDateString("en-CA", { timeZone: "America/Sao_Paulo" }); // YYYY-MM-DD
const escapeXml = s => String(s).replace(/[<>&'"]/g, c => ({ "<": "&lt;", ">": "&gt;", "&": "&amp;", "'": "&apos;", '"': "&quot;" }[c]));
const twiml = msg => `<?xml version="1.0" encoding="UTF-8"?><Response><Message>${escapeXml(msg)}</Message></Response>`;

// Valida que a requisição veio mesmo da Twilio (assinatura X-Twilio-Signature).
// Pode ser desligada temporariamente com WHATSAPP_VALIDATE=off se a URL não bater.
function assinaturaOk(req, url) {
  const token = process.env.TWILIO_AUTH_TOKEN;
  if (!token || process.env.WHATSAPP_VALIDATE === "off") return true;
  const sig = req.headers["x-twilio-signature"];
  if (!sig) return false;
  const params = req.body || {};
  const data = url + Object.keys(params).sort().map(k => k + params[k]).join("");
  const expected = crypto.createHmac("sha1", token).update(Buffer.from(data, "utf-8")).digest("base64");
  try { return crypto.timingSafeEqual(Buffer.from(sig), Buffer.from(expected)); } catch { return false; }
}

async function baixarMidia(url, mime) {
  const auth = Buffer.from(`${process.env.TWILIO_ACCOUNT_SID}:${process.env.TWILIO_AUTH_TOKEN}`).toString("base64");
  const r = await fetch(url, { headers: { Authorization: `Basic ${auth}` } });
  const buf = Buffer.from(await r.arrayBuffer());
  return buf.toString("base64");
}

async function analisarFoto(base64, mime) {
  const r = await fetch("https://api.anthropic.com/v1/messages", {
    method: "POST",
    headers: { "content-type": "application/json", "x-api-key": process.env.ANTHROPIC_KEY, "anthropic-version": "2023-06-01" },
    body: JSON.stringify({
      model: "claude-haiku-4-5-20251001",
      max_tokens: 400,
      messages: [{ role: "user", content: [
        { type: "image", source: { type: "base64", media_type: mime, data: base64 } },
        { type: "text", text: `Você é um assistente financeiro. Analise esta imagem (comprovante, recibo, nota fiscal ou print de pagamento) e extraia as informações financeiras.
Responda SOMENTE em JSON com este formato exato (sem markdown, sem explicação):
{"desc":"descrição curta","valor":0.00,"tipo":"Despesa","cat":"Categoria","forma":"forma de pagamento"}
Categorias válidas: Alimentação, Transporte, Moradia, Saúde, Educação, Lazer, Vestuário, Assinaturas, Outros
Se for receita use tipo "Receita" e categorias: Salário, Freelance, Investimentos, Bônus, Outros
Se não conseguir identificar retorne: {"erro":"não identificado"}` }
      ] }]
    })
  });
  const d = await r.json();
  const txt = d.content?.[0]?.text || "{}";
  try { return JSON.parse(txt.replace(/```json|```/g, "").trim()); } catch { return { erro: "parse" }; }
}

export default async function handler(req, res) {
  if (req.method !== "POST") {
    // Diagnóstico temporário: /api/whatsapp?diag=1
    if (String(req.url || "").includes("diag=1")) {
      let adminOk = false, err = null;
      try { getAdminDb(); adminOk = true; } catch (e) { err = e.message; }
      return res.status(200).json({
        serviceAccountPresente: !!process.env.FIREBASE_SERVICE_ACCOUNT,
        formato: process.env.FIREBASE_SERVICE_ACCOUNT ? (process.env.FIREBASE_SERVICE_ACCOUNT.trim().startsWith("{") ? "json" : "base64") : null,
        validate: process.env.WHATSAPP_VALIDATE || null,
        adminOk, err
      });
    }
    return res.status(200).send("finance whatsapp webhook");
  }
  res.setHeader("Content-Type", "text/xml");

  const url = `https://${req.headers.host}${req.url}`;
  if (!assinaturaOk(req, url)) return res.status(403).send(twiml("Assinatura inválida."));

  const body = req.body || {};
  const phone = phoneFrom(body.From);
  const texto = String(body.Body || "").trim();
  const numMedia = parseInt(body.NumMedia || "0", 10);

  try {
    const db = getAdminDb();

    // 1. Identifica / vincula o número
    const linkRef = db.collection("whatsapp_links").doc(phone);
    const linkSnap = await linkRef.get();

    if (!linkSnap.exists) {
      const code = texto.toUpperCase();
      if (/^[A-Z0-9]{6}$/.test(code)) {
        const codeRef = db.collection("whatsapp_codes").doc(code);
        const codeSnap = await codeRef.get();
        if (codeSnap.exists) {
          await linkRef.set({ uid: codeSnap.data().uid, vinculadoEm: new Date().toISOString() });
          await codeRef.delete();
          return res.status(200).send(twiml("✅ WhatsApp vinculado! Agora é só me mandar seus gastos por texto ou a foto de um comprovante."));
        }
      }
      return res.status(200).send(twiml("Olá! Para conectar sua conta, abra o app em Mais › WhatsApp e me envie o código de 6 dígitos que aparece lá."));
    }

    const uid = linkSnap.data().uid;
    const col = db.collection("users").doc(uid).collection("lancamentos");
    const data = dataHojeBR();

    // 2. Foto de comprovante
    if (numMedia > 0 && /^image\//.test(body.MediaContentType0 || "")) {
      const b64 = await baixarMidia(body.MediaUrl0, body.MediaContentType0);
      const info = await analisarFoto(b64, body.MediaContentType0);
      if (info.erro || !info.valor) return res.status(200).send(twiml("Não consegui ler o valor no comprovante 😕. Tente uma foto mais nítida ou me diga por texto."));
      await col.add({ tipo: info.tipo || "Despesa", desc: info.desc || "Comprovante", cat: info.cat || "Outros", forma: info.forma || "Outros", valor: Number(info.valor), data, agendado: false, origem: "whatsapp" });
      return res.status(200).send(twiml(`✅ ${info.tipo || "Despesa"} de ${fmt(info.valor)} em ${info.cat || "Outros"} registrada (${info.desc || "comprovante"}).`));
    }

    // 3. Texto
    if (texto) {
      const r = localAI(texto, []);
      if (r.action === "lancamento") {
        await col.add({ tipo: r.tipo, desc: r.desc, cat: r.cat, forma: r.forma, valor: r.valor, data, agendado: false, origem: "whatsapp" });
        return res.status(200).send(twiml(`✅ ${r.tipo} de ${fmt(r.valor)} em ${r.cat} registrada.`));
      }
      if (r.action === "multiplos") {
        for (const it of r.itens) await col.add({ tipo: it.tipo, desc: it.desc, cat: it.cat, forma: it.forma, valor: it.valor, data, agendado: false, origem: "whatsapp" });
        const total = r.itens.reduce((s, i) => s + i.valor, 0);
        return res.status(200).send(twiml(`✅ ${r.itens.length} lançamentos registrados (total ${fmt(total)}).`));
      }
      return res.status(200).send(twiml('Não entendi 😅. Tente algo como "gastei 45 no uber" ou "recebi 3000 de salário". Você também pode mandar a foto de um comprovante.'));
    }

    return res.status(200).send(twiml("Me manda um gasto por texto (ex: gastei 30 no mercado) ou a foto de um comprovante que eu registro pra você."));
  } catch (e) {
    console.error("whatsapp handler:", e);
    return res.status(200).send(twiml("Ops, tive um erro ao registrar. Tente de novo em instantes."));
  }
}
