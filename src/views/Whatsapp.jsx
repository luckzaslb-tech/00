import { useState, useEffect } from "react";
import { db } from "../firebase.js";
import { doc, setDoc } from "firebase/firestore";
import { today } from "../lib/utils.js";
import { G } from "../theme.jsx";
import { ICON, Ic } from "../components/ui.jsx";

// Número padrão do Twilio Sandbox (igual para todas as contas)
const SANDBOX_NUMBER = "+1 415 523 8886";

function gerarCodigo() {
  const chars = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
  return Array.from({ length: 6 }, () => chars[Math.floor(Math.random() * chars.length)]).join("");
}

// ─── WHATSAPP — vínculo do número ──────────────────────────────────────────────
function WhatsappView({ uid }) {
  const [codigo, setCodigo] = useState("");
  const [copiado, setCopiado] = useState(false);

  async function novoCodigo() {
    if (!uid) return;
    const c = gerarCodigo();
    try {
      await setDoc(doc(db, "whatsapp_codes", c), { uid, criadoEm: today() });
      setCodigo(c);
    } catch (e) { console.warn("whatsapp code:", e.message); }
  }
  useEffect(() => { novoCodigo(); }, [uid]);

  function copiar() {
    navigator.clipboard?.writeText(codigo);
    setCopiado(true);
    setTimeout(() => setCopiado(false), 1500);
  }

  const passos = [
    { t: "Salve o número do WhatsApp", d: <>Adicione <b>{SANDBOX_NUMBER}</b> aos seus contatos.</> },
    { t: "Entre no sandbox", d: <>Envie <b>join &lt;código-do-sandbox&gt;</b> para esse número (o código está no painel da Twilio).</> },
    { t: "Vincule sua conta", d: <>Envie o <b>código de 6 dígitos</b> abaixo para o mesmo número.</> },
    { t: "Pronto!", d: <>Mande seus gastos por <b>texto</b> ("gastei 45 no uber") ou a <b>foto</b> de um comprovante.</> },
  ];

  return (
    <div style={{ padding: "16px 14px 32px", display: "flex", flexDirection: "column", gap: 16 }}>
      <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
        <div style={{ width: 44, height: 44, borderRadius: 12, background: G.green + "22", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
          <Ic d={ICON.ai} size={22} color={G.green} />
        </div>
        <div>
          <div style={{ fontSize: 18, fontWeight: 700, color: G.text }}>Lançar pelo WhatsApp</div>
          <div style={{ fontSize: 12, color: G.muted }}>Registre gastos por texto ou foto, direto do zap.</div>
        </div>
      </div>

      {/* Código de vínculo */}
      <div style={{ background: G.card, border: `1px solid ${G.border}`, borderRadius: 16, padding: 18, textAlign: "center" }}>
        <div style={{ fontSize: 11, fontWeight: 700, letterSpacing: 1, textTransform: "uppercase", color: G.muted, marginBottom: 10 }}>Seu código de vínculo</div>
        <div className="num" style={{ fontSize: 34, fontWeight: 800, letterSpacing: 8, color: G.accent, background: G.accentL, borderRadius: 12, padding: "14px 0", marginBottom: 10 }}>
          {codigo || "······"}
        </div>
        <div style={{ display: "flex", gap: 8 }}>
          <button onClick={copiar} className="press" style={{ flex: 1, padding: "10px", borderRadius: 12, border: `1px solid ${G.border2}`, background: G.card2, color: G.text, fontSize: 13, fontWeight: 600, cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", gap: 6 }}>
            <Ic d={copiado ? ICON.check : ICON.card} size={14} color={copiado ? G.green : G.muted} /> {copiado ? "Copiado!" : "Copiar código"}
          </button>
          <button onClick={novoCodigo} className="press" aria-label="Gerar novo código" style={{ padding: "10px 14px", borderRadius: 12, border: `1px solid ${G.border2}`, background: G.card2, color: G.muted, cursor: "pointer", display: "flex", alignItems: "center" }}>
            <Ic d={ICON.repeat} size={15} color={G.muted} />
          </button>
        </div>
      </div>

      {/* Passo a passo */}
      <div style={{ background: G.card, border: `1px solid ${G.border}`, borderRadius: 16, padding: 16 }}>
        <div style={{ fontSize: 11, fontWeight: 700, letterSpacing: 1, textTransform: "uppercase", color: G.muted, marginBottom: 14 }}>Como conectar</div>
        {passos.map((p, i) => (
          <div key={i} style={{ display: "flex", gap: 12, marginBottom: i < passos.length - 1 ? 14 : 0 }}>
            <div style={{ width: 24, height: 24, borderRadius: "50%", background: G.accent, color: "#fff", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 12, fontWeight: 700, flexShrink: 0 }}>{i + 1}</div>
            <div style={{ flex: 1 }}>
              <div style={{ fontSize: 13, fontWeight: 600, color: G.text }}>{p.t}</div>
              <div style={{ fontSize: 12, color: G.muted, marginTop: 2, lineHeight: 1.5 }}>{p.d}</div>
            </div>
          </div>
        ))}
      </div>

      <div style={{ fontSize: 11, color: G.muted, textAlign: "center", lineHeight: 1.6 }}>
        Este é um recurso de teste (Twilio Sandbox). Áudio chega em breve.
      </div>
    </div>
  );
}

export { WhatsappView };
