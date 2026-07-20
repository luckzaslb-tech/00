// Proxy da IA de foto/comprovante. Protegido: exige usuário logado (Firebase ID
// token), só aceita imagem (não é um "Claude grátis" aberto) e aplica quota mensal.
import { getAdminDb, uidDoToken, consumirQuota } from "./_firebaseAdmin.js";

const PROMPT = `Você é um assistente financeiro. Analise esta imagem (comprovante, recibo, nota fiscal ou print de pagamento) e extraia as informações financeiras.
Responda SOMENTE em JSON com este formato exato (sem markdown, sem explicação):
{"desc":"descrição curta","valor":0.00,"tipo":"Despesa","cat":"Categoria","forma":"forma de pagamento"}
Categorias válidas: Alimentação, Transporte, Moradia, Saúde, Educação, Lazer, Vestuário, Assinaturas, Outros
Se for receita use tipo "Receita" e categorias: Salário, Freelance, Investimentos, Bônus, Outros
Se não conseguir identificar retorne: {"erro":"não identificado"}`;

export default async function handler(req, res) {
  if (req.method !== "POST") return res.status(405).json({ error: "Method not allowed" });

  const key = process.env.ANTHROPIC_KEY;
  if (!key) return res.status(500).json({ error: "ANTHROPIC_KEY not configured" });

  // 1. Autenticação — só usuário logado do app
  let uid;
  try { uid = await uidDoToken(req); }
  catch (e) { return res.status(e.status || 401).json({ error: e.message }); }

  // 2. Entrada travada — só imagem (impede uso como proxy genérico de IA)
  const { image, mimeType } = req.body || {};
  if (!image || typeof image !== "string") return res.status(400).json({ error: "Imagem ausente" });
  const mt = /^image\/(jpeg|png|webp|gif)$/.test(mimeType || "") ? mimeType : "image/jpeg";

  // 3. Quota mensal por plano (controle de custo)
  const db = getAdminDb();
  let q;
  try { q = await consumirQuota(db, uid, "foto"); }
  catch (e) { console.error("quota:", e); return res.status(500).json({ error: "Erro ao validar uso" }); }
  if (!q.ok) return res.status(429).json({ error: `Você atingiu o limite de ${q.limite} análises de foto neste mês.`, limite: q.limite, plano: q.plano });

  // 4. Chamada à Anthropic com prompt e modelo fixos no servidor
  try {
    const response = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: { "Content-Type": "application/json", "x-api-key": key, "anthropic-version": "2023-06-01" },
      body: JSON.stringify({
        model: "claude-haiku-4-5-20251001",
        max_tokens: 400,
        messages: [{ role: "user", content: [
          { type: "image", source: { type: "base64", media_type: mt, data: image } },
          { type: "text", text: PROMPT },
        ] }],
      }),
    });
    const text = await response.text();
    if (!response.ok) {
      console.error("Anthropic error:", response.status, text.slice(0, 300));
      return res.status(502).json({ error: "Falha ao analisar a imagem" });
    }
    return res.status(200).json(JSON.parse(text));
  } catch (err) {
    console.error("Chat handler error:", err);
    return res.status(500).json({ error: "Erro interno" });
  }
}
