import { MESES } from "./constants.js";

// ─── UTILS ────────────────────────────────────────────────────────────────────
const fmt    = v => "R$ "+Number(v).toLocaleString("pt-BR",{minimumFractionDigits:2,maximumFractionDigits:2});
const fmtK   = v => v>=10000?`R$${(v/1000).toFixed(0)}k`:v>=1000?`R$${(v/1000).toFixed(1).replace(".",",")}k`:`R$${Number(v).toLocaleString("pt-BR",{minimumFractionDigits:0,maximumFractionDigits:0})}`;
const getMes = d => d?d.slice(0,7):"";
const fmtD   = d => { try{const[y,m,dd]=d.split("-");return`${dd}/${m}/${y}`;}catch{return d;} };
// Data em hora LOCAL (toISOString é UTC e vira o dia mais cedo à noite no Brasil)
const toISO  = d => `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,"0")}-${String(d.getDate()).padStart(2,"0")}`;
const today  = () => toISO(new Date());
const round2 = v => Math.round((Number(v)||0)*100)/100;

// Garante que partes seja sempre um array (Firestore pode retornar como objeto)
const toPartes = p => Array.isArray(p)?p:Object.values(p||{});
const curMes = () => { const n=new Date();return`${n.getFullYear()}-${String(n.getMonth()+1).padStart(2,"0")}`; };
// Mês-calendário anterior a um "YYYY-MM"
const prevMes = ma => { const[y,m]=ma.split("-").map(Number);const d=new Date(y,m-2,1);return`${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,"0")}`; };
// Lançamentos pessoais: exclui os do modo casal (senão contam em dobro no saldo)
const soPessoais = lancs => lancs.filter(l=>l.escopo!=="casal");
// Só contabiliza lançamentos cuja data já chegou (ou é passada)
// Lançamento conta no saldo se: data já chegou E não está marcado como agendado futuro
const isRealizado = (d, agendado) => {
  if(agendado && d > today()) return false; // agendado ainda não chegou
  return true; // normal ou recorrente sempre conta (data já foi definida corretamente)
};
const mesLblFull = ma => { try{const[y,m]=ma.split("-");return`${MESES[+m-1]}/${y}`;}catch{return ma;} };
const mesLbl     = mesLblFull;
const pct = (v,t) => t>0?Math.min(100,(v/t)*100):0;
// Rótulo de dia no extrato: "Hoje" / "Ontem" / "12 jul"
const lblDia = data => {
  if(data===today())return "Hoje";
  const o=new Date();o.setDate(o.getDate()-1);
  if(data===toISO(o))return "Ontem";
  const[y,m,d]=data.split("-");
  return `${parseInt(d)} ${MESES[parseInt(m)-1].toLowerCase()}`;
};
export { fmt, fmtK, getMes, fmtD, toISO, today, round2, toPartes, curMes, prevMes, soPessoais, isRealizado, mesLblFull, mesLbl, pct, lblDia };
