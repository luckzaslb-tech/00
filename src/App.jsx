import React, { useState, useEffect, useCallback, useRef } from "react";
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, LineChart, Line } from "recharts";
import { auth, db, googleProvider, appleProvider } from "./firebase.js";
import {
  signInWithPopup, signOut, onAuthStateChanged,
  createUserWithEmailAndPassword, signInWithEmailAndPassword, updateProfile
} from "firebase/auth";
import { collection, doc, addDoc, deleteDoc, updateDoc, getDocs, onSnapshot, setDoc, getDoc } from "firebase/firestore";

// ─── CONSTANTS ────────────────────────────────────────────────────────────────
const CATS_REC = ["Salário","Freelance","Investimentos","Aluguel Recebido","Bônus","Reembolso","Pensão Recebida","Venda de Produtos","Comissão","Renda Extra","Dividendos","Aposentadoria","Outros"];
const CATS_DEP = ["Cartão de Crédito","Moradia","Alimentação","Transporte","Saúde","Educação","Lazer","Vestuário","Assinaturas","Pets","Beleza e Cuidados","Eletrônicos","Presentes","Impostos","Dívidas","Seguros","Academia","Farmácia","Outros"];
const FORMAS_REC = ["PIX","Transferência","Depósito","TED","Dinheiro","Automático"];
const FORMAS_DEP = ["Cartão Crédito","Cartão Débito","PIX","Dinheiro","Débito Auto","Boleto","App"];
const MESES = ["Jan","Fev","Mar","Abr","Mai","Jun","Jul","Ago","Set","Out","Nov","Dez"];
const FREQ_OPTS = [{id:"mensal",label:"Todo mês",icon:"↻"},{id:"quinzenal",label:"Quinzenal",icon:"↻"},{id:"semanal",label:"Toda semana",icon:"↻"},{id:"anual",label:"Todo ano",icon:"↻"}];
const AREAS = ["Tecnologia","Saúde","Educação","Finanças","Direito","Marketing","Engenharia","Administração","Comércio","Indústria","Construção","Logística","Arte e Design","Comunicação","RH","Consultoria","Outro"];
const NIVEIS = [
  "Estagiário","Aprendiz","Trainee","Auxiliar","Assistente",
  "Operador","Técnico","Analista Júnior","Analista Pleno","Analista Sênior",
  "Especialista","Consultor","Líder Técnico",
  "Coordenador","Supervisor","Gerente","Gerente Sênior","Gerente Regional",
  "Diretor","VP / Vice-Presidente","C-Level (CEO, CFO, COO...)",
  "Autônomo / Freelancer","MEI / Microempreendedor","Sócio / Proprietário",
  "Funcionário Público","Servidor Público","Militar","Professor","Pesquisador"
];
const CATS_CARREIRA = ["Curso / Certificação","Livro / Material","Ferramenta / Software","Equipamento","Uniforme / Vestuário","Evento / Congresso","Transporte Trabalho","Outros"];

const CAT_EMOJI={"Alimentação":"🍔","Transporte":"🚗","Moradia":"🏠","Saúde":"❤️","Academia":"💪","Educação":"📚","Lazer":"🎮","Assinaturas":"📱","Vestuário":"👕","Pets":"🐾","Eletrônicos":"💻","Presentes":"🎁","Impostos":"📄","Dívidas":"💳","Farmácia":"💊","Outros":"💰","Salário":"💰","Freelance":"🖥","Investimentos":"📈","Bônus":"🏆","Reembolso":"↩","Renda Extra":"⭐","Aluguel Recebido":"🏘","Dividendos":"📊"};
const CAT_COLORS = {
  "Moradia":"#60A5FA","Alimentação":"#FB923C","Transporte":"#A78BFA","Saúde":"#34D399","Educação":"#FBBF24",
  "Lazer":"#F472B6","Vestuário":"#2DD4BF","Assinaturas":"#818CF8","Outros":"#94A3B8","Pets":"#F97316",
  "Beleza e Cuidados":"#E879F9","Eletrônicos":"#38BDF8","Presentes":"#FB7185","Impostos":"#FCD34D",
  "Dívidas":"#F87171","Seguros":"#6EE7B7","Academia":"#67E8F9","Farmácia":"#86EFAC","Salário":"#34D399",
  "Freelance":"#60A5FA","Investimentos":"#FBBF24","Aluguel Recebido":"#A78BFA","Bônus":"#F472B6",
  "Reembolso":"#2DD4BF","Pensão Recebida":"#FCA5A5","Venda de Produtos":"#FDE68A","Comissão":"#6EE7B7",
  "Renda Extra":"#93C5FD","Dividendos":"#C4B5FD","Aposentadoria":"#A7F3D0",
};

// ─── UTILS ────────────────────────────────────────────────────────────────────
const fmt    = v => "R$ "+Number(v).toLocaleString("pt-BR",{minimumFractionDigits:2,maximumFractionDigits:2});
const fmtK   = v => v>=10000?`R$${(v/1000).toFixed(0)}k`:v>=1000?`R$${(v/1000).toFixed(1).replace(".",",")}k`:`R$${Number(v).toLocaleString("pt-BR",{minimumFractionDigits:0,maximumFractionDigits:0})}`;
const getMes = d => d?d.slice(0,7):"";
const fmtD   = d => { try{const[y,m,dd]=d.split("-");return`${dd}/${m}/${y}`;}catch{return d;} };
const today  = () => new Date().toISOString().slice(0,10);

// Garante que partes seja sempre um array (Firestore pode retornar como objeto)
const toPartes = p => Array.isArray(p)?p:Object.values(p||{});
const curMes = () => { const n=new Date();return`${n.getFullYear()}-${String(n.getMonth()+1).padStart(2,"0")}`; };
// Só contabiliza lançamentos cuja data já chegou (ou é passada)
// Lançamento conta no saldo se: data já chegou E não está marcado como agendado futuro
const isRealizado = (d, agendado) => {
  if(agendado && d > today()) return false; // agendado ainda não chegou
  return true; // normal ou recorrente sempre conta (data já foi definida corretamente)
};
const mesLblFull = ma => { try{const[y,m]=ma.split("-");return`${MESES[+m-1]}/${y}`;}catch{return ma;} };
const mesLbl     = mesLblFull;
const pct = (v,t) => t>0?Math.min(100,(v/t)*100):0;

function gerarRecorrentesDoMes(recorrentes, lancs) {
  const hoje=new Date(),mes=curMes(),novos=[];
  const diaHoje=hoje.getDate();
  for (const rec of recorrentes) {
    if (!rec.ativo) continue;
    const dim=new Date(hoje.getFullYear(),hoje.getMonth()+1,0).getDate();
    if (rec.freq==="mensal"||rec.freq==="quinzenal") {
      const dia=Math.min(rec.dia||1,dim);
      // Só lança se hoje já chegou na data definida
      if (diaHoje>=dia) {
        const dt=`${mes}-${String(dia).padStart(2,"0")}`;
        if (!lancs.some(l=>l.recId===rec.id&&l.data===dt))
          novos.push({recId:rec.id,tipo:rec.tipo,desc:rec.desc,cat:rec.cat,forma:rec.forma,valor:rec.valor,data:dt,auto:true});
      }
      if (rec.freq==="quinzenal") {
        const dia2=Math.min((rec.dia||1)+15,dim);
        if (diaHoje>=dia2) {
          const dt2=`${mes}-${String(dia2).padStart(2,"0")}`;
          if (!lancs.some(l=>l.recId===rec.id&&l.data===dt2))
            novos.push({recId:rec.id,tipo:rec.tipo,desc:rec.desc,cat:rec.cat,forma:rec.forma,valor:rec.valor,data:dt2,auto:true});
        }
      }
    }
    // Semanal: só lança se o dia da semana bate com hoje
    if (rec.freq==="semanal") {
      // dia = dia da semana (0=dom..6=sab) ou dia do mês — usar dia da semana
      const dow=hoje.getDay();
      const recDow=(rec.dia||1)%7;
      if (dow===recDow) {
        const dt=`${mes}-${String(diaHoje).padStart(2,"0")}`;
        if (!lancs.some(l=>l.recId===rec.id&&l.data===dt))
          novos.push({recId:rec.id,tipo:rec.tipo,desc:rec.desc,cat:rec.cat,forma:rec.forma,valor:rec.valor,data:dt,auto:true});
      }
    }
    // Anual: só lança no mês/dia correto
    if (rec.freq==="anual") {
      const mesAnual=rec.mesAnual||String(hoje.getMonth()+1).padStart(2,"0");
      const diaAnual=Math.min(rec.dia||1,dim);
      const anoAtual=hoje.getFullYear();
      if (mes===`${anoAtual}-${mesAnual}` && diaHoje>=diaAnual) {
        const dt=`${mes}-${String(diaAnual).padStart(2,"0")}`;
        if (!lancs.some(l=>l.recId===rec.id&&l.data===dt))
          novos.push({recId:rec.id,tipo:rec.tipo,desc:rec.desc,cat:rec.cat,forma:rec.forma,valor:rec.valor,data:dt,auto:true});
      }
    }
  }
  return novos;
}

// ─── LOCAL AI — categorização por regras, zero API ───────────────────────────
function localAI(msg,lancs){
  const norm=s=>s.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g,"");
  const t=norm(msg);

  // ── helpers ────────────────────────────────────────
  const recW=["recebi","salario","freelance","pagaram","renda","entrada","deposito","reembolso","dividendo","bonus","lucro","ganhei","caiu na conta","transferencia recebida"];
  const rules=[
    ["Salário",      ["salario","holerite","clr"]],
    ["Freelance",    ["freelance","freela","bico","trampo extra"]],
    ["Investimentos",["investimento","rendimento","cdb","fii","acoes","dividendo","tesouro"]],
    ["Bônus",        ["bonus","gratificacao","13 salario","premio"]],
    ["Reembolso",    ["reembolso","ressarcimento","devolucao","estorno"]],
    ["Renda Extra",  ["renda extra","extra","vendi","venda"]],
    ["Alimentação",  ["mercado","supermercado","ifood","restaurante","lanche","pizza","hamburguer","sushi","acai","padaria","cafe","comida","almoco","jantar","refri","refrigerante","frango","carne","feira","hortifruti","acougue","mercearia","loja","atacadao","assai","carrefour","extra","pao"]],
    ["Transporte",   ["uber","99","taxi","onibus","metro","gasolina","combustivel","estacionamento","pedagio","posto","passagem","bilhete","brt","trem","carro","moto","gasolina","revisao","mecanico","oficina","pneu","bateria carro"]],
    ["Moradia",      ["aluguel","condominio","iptu","agua ","luz ","energia","internet","gas ","reforma","manutencao","faxina","limpeza"]],
    ["Saúde",        ["medico","consulta","plano de saude","plano saude","exame","hospital","dentista","ortopedista","psicologo","terapia","clinica"]],
    ["Farmácia",     ["farmacia","remedio","drogaria","drogasil","ultrafarma","medicamento","vitamina"]],
    ["Academia",     ["academia","gym","musculacao","crossfit","natacao","pilates","yoga","personal"]],
    ["Educação",     ["curso","faculdade","escola","livro","udemy","alura","coursera","mensalidade escola","material escolar","idioma","ingles"]],
    ["Lazer",        ["netflix","cinema","show","teatro","viagem","hotel","bar","balada","jogo","game","steam","ingresso","passeio","praia","parque","drink","cerveja","chopp","boteco"]],
    ["Assinaturas",  ["spotify","amazon prime","apple","youtube premium","deezer","hbo","disney","globoplay","assinatura","prime video"]],
    ["Vestuário",    ["roupa","calcado","tenis ","camisa","calca","vestido","sapato","shein","zara","renner","hm ","c&a","americanas"]],
    ["Pets",         ["pet","veterinario","racao","banho pet","dog","gato","cachorro"]],
    ["Eletrônicos",  ["celular","notebook","computador","tablet","fone","headphone","carregador","smartwatch"]],
    ["Presentes",    ["presente","gift","aniversario","natal","casamento"]],
    ["Impostos",     ["imposto","taxa ","multa","ipva","irpf","darf"]],
    ["Dívidas",      ["parcela","prestacao","emprestimo","fatura","divida","financiamento"]],
  ];
  const recCats=["Salário","Freelance","Investimentos","Bônus","Reembolso","Renda Extra","Aluguel Recebido","Dividendos"];
  const formas=[["Cartão Crédito",["credito","cartao cred","no credito"]],["Cartão Débito",["debito","cartao deb","no debito"]],["PIX",["pix"]],["Dinheiro",["dinheiro","especie","fisico"]]];
  const icons={"Alimentação":"🍔","Transporte":"🚗","Moradia":"🏠","Saúde":"❤️","Academia":"💪","Educação":"📚","Lazer":"🎮","Assinaturas":"📱","Vestuário":"👕","Pets":"🐾","Eletrônicos":"💻","Presentes":"🎁","Impostos":"📄","Dívidas":"💳","Farmácia":"💊","Outros":"💰","Salário":"💰","Freelance":"🖥","Investimentos":"📈","Bônus":"🏆","Reembolso":"↩","Renda Extra":"⭐"};

  function detectCat(fragment,isRec){
    let cat=isRec?"Renda Extra":"Outros";
    const fn=norm(fragment);
    for(const [c,words] of rules){
      if(words.some(w=>fn.includes(norm(w)))){
        if(recCats.includes(c)===isRec){cat=c;break;}
      }
    }
    return cat;
  }
  function detectForma(fragment){
    const fn=norm(fragment);
    for(const [f,words] of formas){if(words.some(w=>fn.includes(norm(w))))return f;}
    return "PIX";
  }
  function parseValor(str){
    const valorStr=str.replace(/\./g,"").replace(",",".");
    return parseFloat(valorStr)||0;
  }
  function limpDesc(fragment,cat){
    let d=fragment
      .replace(/r?\$\s*\d+(?:[.,]\d{1,2})?/gi,"")
      .replace(/\b(gastei|paguei|comprei|recebi|ganhei|transferi|debitou|caiu|saiu|com|de|no|na|nos|nas|um|uma|o|a)\b/gi," ")
      .replace(/\s+/g," ").trim();
    if(d.length<2)d=cat;
    return d.charAt(0).toUpperCase()+d.slice(1);
  }

  // ── data ───────────────────────────────────────────
  let data=today();
  if(t.includes("ontem")){const d=new Date();d.setDate(d.getDate()-1);data=d.toISOString().slice(0,10);}
  const dm=t.match(/dia\s+(\d{1,2})/);
  if(dm){const m=curMes();data=`${m}-${String(dm[1]).padStart(2,"0")}`;}

  // ── sem valor = conversa ───────────────────────────
  const pergW=["quanto","gastei","recebi","resumo","relatorio","saldo","como estou","quanto tenho","me mostra","total","mes","esse mes"];
  const hasAnyNumber=/\d/.test(t);
  if(!hasAnyNumber){
    if(pergW.some(w=>t.includes(norm(w))))return{action:"conversa",isSummary:true};
    if(t.length<3)return{action:"conversa",resposta:'Oi! Me conte um gasto ou receita 😊'};
    return{action:"conversa",resposta:'Não entendi 😕\n\nTente:\n• "Gastei 50 no mercado"\n• "Recebi 3000 de salário"\n• "Quanto gastei esse mês?"'};
  }

  // ── detectar múltiplos lançamentos ────────────────
  // Divide por separadores comuns: "gastei X com A gastei Y com B" / "e " / ", " / vírgula
  // Regex: captura cada bloco "verbo + valor + descrição"
  const segPattern=/(?:gastei|paguei|comprei|recebi|ganhei)\s+r?\$?\s*[\d.,]+[^,;]*?(?=(?:gastei|paguei|comprei|recebi|ganhei)\s+r?\$?\s*[\d.,]|$)/gi;
  const segments=[];
  let match;
  while((match=segPattern.exec(msg))!==null){
    segments.push(match[0].trim());
  }

  // fallback: tenta extrair todos os pares "R$X com/no/na Y" mesmo sem verbo
  // só roda se segPattern não achou NADA (evita duplicar quando há 1 verbo + 1 valor)
  if(segments.length===0){
    const pairPat=/r?\$?\s*(\d{1,3}(?:[.]\d{3})*(?:[,]\d{1,2})?|\d+(?:[,]\d{1,2})?)\s+(?:com|no|na|nos|nas|de|em|p\/|para|num|numa)?\s*([^,;0-9]+?)(?=r?\$?\s*\d|,|;|$)/gi;
    let pm;
    while((pm=pairPat.exec(msg))!==null){
      segments.push(pm[0].trim());
    }
  }

  // ── single lançamento ─────────────────────────────
  function parseSingle(fragment){
    const nt=norm(fragment);
    const vm=nt.match(/r?\$?\s*(\d{1,3}(?:[.]\d{3})*(?:[,]\d{1,2})?|\d+(?:[,]\d{1,2})?)/);
    if(!vm)return null;
    const valor=parseValor(vm[1]);
    if(!valor)return null;
    const isRec=recW.some(w=>nt.includes(norm(w)));
    const cat=detectCat(fragment,isRec);
    const forma=detectForma(fragment);
    const desc=limpDesc(fragment,cat);
    const tipo=isRec?"Receita":"Despesa";
    const emoji=icons[cat]||"💰";
    return{action:"lancamento",tipo,desc,cat,forma,valor,data,confirmacao:`${emoji} ${tipo} de R$${valor.toFixed(2)} em ${cat}. Confirma?`};
  }

  if(segments.length>=2){
    const itens=segments.map(s=>parseSingle(s)).filter(Boolean);
    if(itens.length>=2){
      const total=itens.reduce((s,i)=>s+i.valor,0);
      const resumo=itens.map(i=>`${icons[i.cat]||"💰"} ${i.desc} — R$${i.valor.toFixed(2)}`).join("\n");
      return{
        action:"multiplos",
        itens,
        confirmacao:`Encontrei ${itens.length} lançamentos (total R$${total.toFixed(2)}):\n\n${resumo}\n\nConfirmo todos?`,
      };
    }
  }

  // ── single fallback ───────────────────────────────
  const single=parseSingle(msg);
  if(single)return single;

  if(pergW.some(w=>t.includes(norm(w))))return{action:"conversa",isSummary:true};
  return{action:"conversa",resposta:'Não entendi 😕\n\nTente:\n• "Gastei 50 no mercado"\n• "Recebi 3000 de salário"'};
}

async function callAI(msg,lancs){
  const r=localAI(msg,lancs);
  if(r.isSummary){
    const mes=curMes(),dm=lancs.filter(l=>l.data?.startsWith(mes)&&isRealizado(l.data,l.agendado));
    const tR=dm.filter(l=>l.tipo==="Receita").reduce((s,l)=>s+l.valor,0);
    const tD=dm.filter(l=>l.tipo==="Despesa").reduce((s,l)=>s+l.valor,0);
    const sal=tR-tD;
    const mn=MESES[new Date().getMonth()];
    return{action:"conversa",resposta:`📊 ${mn}/${new Date().getFullYear()}\n\n💚 Receitas: ${fmt(tR)}\n🔴 Despesas: ${fmt(tD)}\n${sal>=0?"💰":"😬"} Saldo: ${fmt(sal)}`};
  }
  return r;
}

// ─── TRANSCRIÇÃO DE ÁUDIO ─────────────────────────────────────────────────────
// Usa Web Speech API nativa (sem custo, funciona no Chrome/Safari mobile)
function createSpeechRecognizer(onResult, onError){
  const SR=window.SpeechRecognition||window.webkitSpeechRecognition;
  if(!SR)return null;
  const sr=new SR();
  sr.lang="pt-BR";sr.continuous=false;sr.interimResults=false;
  sr.onresult=e=>onResult(e.results[0][0].transcript);
  sr.onerror=e=>onError(e.error);
  return sr;
}

// ─── ANÁLISE DE FOTO/COMPROVANTE ──────────────────────────────────────────────
async function analyzePhoto(base64,mimeType="image/jpeg"){
  const r=await fetch("https://api.anthropic.com/v1/messages",{
    method:"POST",
    headers:{"Content-Type":"application/json"},
    body:JSON.stringify({
      model:"claude-sonnet-4-20250514",
      max_tokens:400,
      messages:[{role:"user",content:[
        {type:"image",source:{type:"base64",media_type:mimeType,data:base64}},
        {type:"text",text:`Você é um assistente financeiro. Analise esta imagem (comprovante, recibo, nota fiscal ou print de pagamento) e extraia as informações financeiras.
Responda SOMENTE em JSON com este formato exato (sem markdown, sem explicação):
{"desc":"descrição curta","valor":0.00,"tipo":"Despesa","cat":"Categoria","forma":"forma de pagamento"}
Categorias válidas: Alimentação, Transporte, Moradia, Saúde, Educação, Lazer, Vestuário, Assinaturas, Outros
Se for receita use tipo "Receita" e categorias: Salário, Freelance, Investimentos, Bônus, Outros
Se não conseguir identificar retorne: {"erro":"não identificado"}`}
      ]}]
    })
  });
  const d=await r.json();
  const txt=d.content?.[0]?.text||"{}";
  try{
    const clean=txt.replace(/```json|```/g,"").trim();
    return JSON.parse(clean);
  }catch{return{erro:"parse error"};}
}

// ─── HOOK DE PLANO ────────────────────────────────────────────────────────────
function usePlano(uid){
  const [plano,setPlano]=useState("free");
  const [loadingPlano,setLoadingPlano]=useState(true);
  const [planoOverride,setPlanoOverride]=useState(null);
  useEffect(()=>{
    if(!uid){setLoadingPlano(false);return;}
    const ref=doc(db,"users",uid,"perfil","dados");
    const unsub=onSnapshot(ref,
      snap=>{
        const p=snap.data()?.plano||"free";
        console.log("[usePlano] plano lido:",p,"data:",snap.data());
        setPlano(p);
        setPlanoOverride(null); // clear override, use real value
        setLoadingPlano(false);
      },
      err=>{
        console.error("[usePlano] erro onSnapshot:",err);
        getDoc(ref).then(snap=>{
          const p=snap.data()?.plano||"free";
          setPlano(p);
        }).catch(e=>console.error("[usePlano] fallback falhou:",e))
        .finally(()=>setLoadingPlano(false));
      }
    );
    return()=>unsub();
  },[uid]);
  const effectivePlano=planoOverride||plano;
  return{plano:effectivePlano,loadingPlano,isPremium:effectivePlano==="premium",forceSetPlano:setPlanoOverride};
}


// ─── LIMITES FREE ─────────────────────────────────────────────────────────────
const FREE_LIMITS = {
  cartoes: 1,       // máx 1 cartão
  meses_historico: 3, // últimos 3 meses
};

// ─── PREMIUM GATE COMPONENT ───────────────────────────────────────────────────
function PremiumGate({isPremium,onUpgrade,children,label="Este recurso é Premium",sublabel=""}){
  if(isPremium)return children;
  return(
    <div style={{position:"relative",borderRadius:18,overflow:"hidden"}}>
      <div style={{filter:"blur(3px)",pointerEvents:"none",userSelect:"none",opacity:.5}}>
        {children}
      </div>
      <div style={{position:"absolute",inset:0,display:"flex",flexDirection:"column",alignItems:"center",justifyContent:"center",
        background:"rgba(10,10,15,.75)",backdropFilter:"blur(2px)",borderRadius:18,padding:24,textAlign:"center"}}>
        <div style={{fontSize:32,marginBottom:8}}>✨</div>
        <div style={{fontFamily:"'Fraunces',serif",fontSize:17,fontWeight:700,color:"#fff",marginBottom:4}}>{label}</div>
        {sublabel&&<div style={{fontSize:12,color:"rgba(255,255,255,.5)",marginBottom:14}}>{sublabel}</div>}
        <button onClick={onUpgrade} className="press"
          style={{padding:"10px 24px",borderRadius:20,border:"none",background:"#7C6AF7",
            color:"#fff",fontSize:13,fontWeight:700,cursor:"pointer",
            boxShadow:"0 4px 16px rgba(124,106,247,.5)"}}>
          Ver planos
        </button>
      </div>
    </div>
  );
}

// ─── DESIGN ────────────────────────────────────────────────────────────────────
// ─── THEME ────────────────────────────────────────────────────────────────────
const DARK ={bg:"#0A0A0F",card:"#111118",card2:"#16161F",border:"#1E1E2A",border2:"#2A2A3A",text:"#F0EEF8",muted:"#6B6880",accent:"#7C6AF7",accentL:"#7C6AF720",green:"#2ECC8E",greenL:"#2ECC8E18",red:"#FF5C6A",redL:"#FF5C6A18",yellow:"#F5C842",blue:"#4A9EFF",orange:"#FB923C"};
const LIGHT={bg:"#F5F5FA",card:"#FFFFFF",card2:"#F0EFF8",border:"#E2E0EF",border2:"#CCC9E0",text:"#1A1830",muted:"#8A87A0",accent:"#7C6AF7",accentL:"#7C6AF715",green:"#1CA870",greenL:"#1CA87015",red:"#E5334A",redL:"#E5334A15",yellow:"#D4920A",blue:"#2B7FE0",orange:"#E07020"};
let _theme="dark";
const G=new Proxy({},{get:(_,k)=>(_theme==="light"?LIGHT:DARK)[k]});

// ─── ERROR BOUNDARY ───────────────────────────────────────────────────────────
class ErrorBoundary extends React.Component {
  constructor(p){super(p);this.state={err:null};}
  static getDerivedStateFromError(e){return{err:e};}
  componentDidCatch(e,i){console.error("View error:",e,i);}
  render(){
    if(this.state.err)return(
      <div style={{padding:32,textAlign:"center",color:G.muted}}>
        <div style={{fontSize:36,marginBottom:12}}>⚠️</div>
        <div style={{fontFamily:"'Fraunces',serif",fontSize:18,fontWeight:700,color:G.text,marginBottom:8}}>Algo deu errado</div>
        <div style={{fontSize:13,marginBottom:20,lineHeight:1.6}}>{this.state.err.message}</div>
        <button onClick={()=>this.setState({err:null})} style={{padding:"10px 24px",borderRadius:12,border:"none",background:G.accent,color:"#fff",fontWeight:700,cursor:"pointer",fontFamily:"inherit"}}>Tentar novamente</button>
      </div>
    );
    return this.props.children;
  }
}
const NH=62,HH=52;

const getCSS=(theme)=>`
  @import url('https://fonts.googleapis.com/css2?family=Fraunces:wght@700&family=Figtree:wght@400;500;600&display=swap');
  *,*::before,*::after{box-sizing:border-box;margin:0;padding:0}
  html{height:100%;overflow:hidden;width:100%;max-width:100vw;padding-top:env(safe-area-inset-top,0px)}
  body{background:${theme==="light"?LIGHT.bg:DARK.bg};color:${theme==="light"?LIGHT.text:DARK.text};font-family:'Figtree',sans-serif;-webkit-tap-highlight-color:transparent;-webkit-font-smoothing:antialiased;height:100%;overflow:hidden;width:100%;max-width:100vw;overscroll-behavior:none;transition:background .2s,color .2s;margin:0;padding:0}
  #root{height:100%;height:100dvh;overflow:hidden;width:100%;max-width:100vw;display:flex;flex-direction:column}
  input,select,button,textarea{font-family:inherit;-webkit-appearance:none;appearance:none}
  input[type=date]::-webkit-calendar-picker-indicator{filter:${theme==="light"?"invert(.3)":"invert(.55)"}}
  input[type=number]::-webkit-inner-spin-button{-webkit-appearance:none}
  *{scrollbar-width:none}*::-webkit-scrollbar{display:none}
  @keyframes fadeUp{from{opacity:0;transform:translateY(10px)}to{opacity:1;transform:none}}
  @keyframes slideUp{from{transform:translateY(100%)}to{transform:translateY(0)}}
  @keyframes popIn{from{opacity:0;transform:scale(.93)}to{opacity:1;transform:scale(1)}}
  @keyframes bounce{0%,80%,100%{transform:scale(0)}40%{transform:scale(1)}}
  @keyframes spin{to{transform:rotate(360deg)}}
  @keyframes pulse{0%,100%{opacity:1}50%{opacity:.3}}
  @keyframes shimmer{0%{background-position:-200% 0}100%{background-position:200% 0}}
  @keyframes slideInLeft{from{transform:translateX(-100%)}to{transform:translateX(0)}}
  .press:active{opacity:.7;transform:scale(.97)}
  @supports(padding:max(0px)){
    .safe-bottom{padding-bottom:max(8px,env(safe-area-inset-bottom))}
  .nav-bar{position:fixed;bottom:0;left:0;right:0;z-index:200;background:${theme==="light"?LIGHT.card:DARK.card};border-top:1px solid ${theme==="light"?LIGHT.border:DARK.border};display:flex;min-height:${NH}px;padding-bottom:max(8px,env(safe-area-inset-bottom));box-sizing:border-box}
  .safe-top{padding-top:max(0px,env(safe-area-inset-top))}
  :root{--sat:env(safe-area-inset-top,0px);--sab:env(safe-area-inset-bottom,0px);--hh:calc(${HH}px + var(--sat));--nh:calc(${NH}px + var(--sab))}
  }
  .inp{width:100%;padding:12px 14px;background:${theme==="light"?LIGHT.card2:DARK.card2};border:1px solid ${theme==="light"?LIGHT.border2:DARK.border2};border-radius:12px;color:${theme==="light"?LIGHT.text:DARK.text};font-size:15px;outline:none;transition:background .2s,border .2s,color .2s}
  .inp:focus{border-color:#7C6AF7}
`;
const CSS=getCSS("dark");

// ─── ICONS ────────────────────────────────────────────────────────────────────
const Ic=({d,size=16,stroke=1.5,color="currentColor",fill="none"})=>(
  <svg width={size} height={size} viewBox="0 0 24 24" fill={fill} stroke={color} strokeWidth={stroke} strokeLinecap="round" strokeLinejoin="round">
    {Array.isArray(d)?d.map((p,i)=><path key={i} d={p}/>):<path d={d}/>}
  </svg>
);
const ICON={
  menu:"M3 12h18M3 6h18M3 18h18",
  home:"M3 9l9-7 9 7v11a2 2 0 01-2 2H5a2 2 0 01-2-2z",
  card:"M1 4h22v16H1zM1 9h22",
  wallet:"M3 6h18a2 2 0 012 2v8a2 2 0 01-2 2H3a2 2 0 01-2-2V8a2 2 0 012-2zM16 12h.01",
  chart:"M3 3v18h18M7 16l4-4 4 4 4-8",
  bell:"M18 8A6 6 0 006 8c0 7-3 9-3 9h18s-3-2-3-9M13.73 21a2 2 0 01-3.46 0",
  user:"M20 21v-2a4 4 0 00-4-4H8a4 4 0 00-4 4v2M12 11a4 4 0 100-8 4 4 0 000 8z",
  users:"M17 21v-2a4 4 0 00-4-4H5a4 4 0 00-4 4v2M23 21v-2a4 4 0 00-3-3.87M16 3.13a4 4 0 010 7.75",
  link:"M10 13a5 5 0 007.54.54l3-3a5 5 0 00-7.07-7.07l-1.72 1.71M14 11a5 5 0 00-7.54-.54l-3 3a5 5 0 007.07 7.07l1.71-1.71",
  plus:"M12 5v14M5 12h14",
  minus:"M5 12h14",
  check:"M20 6L9 17l-5-5",
  x:"M18 6L6 18M6 6l12 12",
  edit:"M11 4H4a2 2 0 00-2 2v14a2 2 0 002 2h14a2 2 0 002-2v-7M18.5 2.5a2.121 2.121 0 013 3L12 15l-4 1 1-4 9.5-9.5z",
  trash:"M3 6h18M8 6V4h8v2M19 6l-1 14H6L5 6",
  import:"M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4M7 10l5 5 5-5M12 15V3",
  star:"M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z",
  camera:"M23 19a2 2 0 01-2 2H3a2 2 0 01-2-2V8a2 2 0 012-2h4l2-3h6l2 3h4a2 2 0 012 2zM12 17a4 4 0 100-8 4 4 0 000 8z",
  share:"M4 12v8a2 2 0 002 2h12a2 2 0 002-2v-8M16 6l-4-4-4 4M12 2v13",
  calendar:"M3 4h18v18H3zM16 2v4M8 2v4M3 10h18",
  clock:"M12 22a10 10 0 100-20 10 10 0 000 20zM12 6v6l4 2",
  arrow_up:"M12 19V5M5 12l7-7 7 7",
  arrow_down:"M12 5v14M19 12l-7 7-7-7",
  repeat:"M17 1l4 4-4 4M3 11V9a4 4 0 014-4h14M7 23l-4-4 4-4M21 13v2a4 4 0 01-4 4H3",
  warning:"M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0zM12 9v4M12 17h.01",
  divide:"M8 6h8M12 3v18M8 18h8",
  handshake:"M20.42 4.58a5.4 5.4 0 00-7.65 0l-.77.78-.77-.78a5.4 5.4 0 00-7.65 7.65l.77.77L12 21.23l7.65-7.65.77-.77a5.4 5.4 0 000-7.23z",
  logout:"M9 21H5a2 2 0 01-2-2V5a2 2 0 012-2h4M16 17l5-5-5-5M21 12H9",
  sun:"M12 1v2M12 21v2M4.22 4.22l1.42 1.42M18.36 18.36l1.42 1.42M1 12h2M21 12h2M4.22 19.78l1.42-1.42M18.36 5.64l1.42-1.42M12 5a7 7 0 100 14A7 7 0 0012 5z",
  moon:"M21 12.79A9 9 0 1111.21 3 7 7 0 0021 12.79z",
  eye:"M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8zM12 9a3 3 0 100 6 3 3 0 000-6z",
  target:"M12 22a10 10 0 100-20 10 10 0 000 20zM12 18a6 6 0 100-12 6 6 0 000 12zM12 14a2 2 0 100-4 2 2 0 000 4z",
  briefcase:"M20 7H4a2 2 0 00-2 2v10a2 2 0 002 2h16a2 2 0 002-2V9a2 2 0 00-2-2zM16 7V5a2 2 0 00-2-2h-4a2 2 0 00-2 2v2",
  ai:"M12 2a2 2 0 012 2c0 .74-.4 1.39-1 1.73V7h1a7 7 0 017 7h1a1 1 0 010 2h-1v1a2 2 0 01-2 2H5a2 2 0 01-2-2v-1H2a1 1 0 010-2h1a7 7 0 017-7h1V5.73A2 2 0 0110 4a2 2 0 012-2zM9 11a1 1 0 000 2 1 1 0 000-2zm6 0a1 1 0 000 2 1 1 0 000-2z",
  search:"M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z",
  help:"M12 22C6.477 22 2 17.523 2 12S6.477 2 12 2s10 4.477 10 10-4.477 10-10 10zm-1-7v2h2v-2h-2zm2-1.645V13h-2v-1.5a1 1 0 011-1 1.5 1.5 0 10-1.471-1.794l-1.962-.393A3.5 3.5 0 1113 13.355z"
};

const Tag=({children,color=G.muted})=>(
  <span style={{display:"inline-flex",alignItems:"center",padding:"1px 8px",borderRadius:20,fontSize:10,fontWeight:600,whiteSpace:"nowrap",background:color+"22",color,border:`1px solid ${color}33`}}>{children}</span>
);
const Spinner=({size=20,color=G.accent})=>(
  <div style={{width:size,height:size,border:`2px solid ${color}33`,borderTop:`2px solid ${color}`,borderRadius:"50%",animation:"spin .7s linear infinite",flexShrink:0}}/>
);
const Lbl=({children,opt})=>(
  <div style={{fontSize:11,fontWeight:600,letterSpacing:.8,textTransform:"uppercase",color:G.muted,marginBottom:6,display:"flex",alignItems:"center",gap:6}}>
    {children}{opt&&<span style={{fontWeight:400,textTransform:"none",letterSpacing:0,fontSize:11,color:G.muted}}>(opcional)</span>}
  </div>
);

function Sheet({open,onClose,title,children}){
  if(!open)return null;
  return(
    <div onClick={e=>e.target===e.currentTarget&&onClose()} style={{position:"fixed",inset:0,zIndex:9500,background:"rgba(0,0,0,.78)",backdropFilter:"blur(6px)",display:"flex",alignItems:"flex-end"}}>
      <div style={{width:"100%",maxHeight:"94vh",background:G.card,borderRadius:"22px 22px 0 0",border:`1px solid ${G.border2}`,display:"flex",flexDirection:"column",animation:"slideUp .28s cubic-bezier(.32,.72,0,1)"}}>
        <div style={{display:"flex",justifyContent:"center",paddingTop:10,paddingBottom:2}}><div style={{width:36,height:4,borderRadius:2,background:G.border2}}/></div>
        <div style={{display:"flex",alignItems:"center",justifyContent:"space-between",padding:"8px 20px 14px"}}>
          <div style={{fontFamily:"'Fraunces',serif",fontSize:20,fontWeight:700}}>{title}</div>
          <button onClick={onClose} style={{width:30,height:30,borderRadius:8,border:"none",background:G.card2,color:G.muted,fontSize:18,cursor:"pointer",display:"flex",alignItems:"center",justifyContent:"center"}}>×</button>
        </div>
        <div style={{overflowY:"auto",padding:"0 20px 32px",flex:1}}>{children}</div>
      </div>
    </div>
  );
}

function Nav({view,setView}){
  const items=[
    {id:"dashboard",icon:<Ic d={ICON.home} size={20}/>,l:"Início"},
    {id:"receitas",icon:<Ic d={ICON.arrow_up} size={20}/>,l:"Receitas"},
    {id:"despesas",icon:<Ic d={ICON.arrow_down} size={20}/>,l:"Despesas"},
    {id:"chat",icon:<Ic d={ICON.ai} size={20}/>,l:"IA"},
  ];
  return(
    <div className="nav-bar">
      {items.map(it=>(
        <button key={it.id} onClick={()=>setView(it.id)} className="press" style={{flex:1,padding:"8px 0",background:"none",border:"none",cursor:"pointer",display:"flex",flexDirection:"column",alignItems:"center",gap:2,color:view===it.id?G.accent:G.muted,position:"relative"}}>
          {view===it.id&&<div style={{position:"absolute",top:0,left:"50%",transform:"translateX(-50%)",width:24,height:2,borderRadius:"0 0 2px 2px",background:G.accent}}/>}
          <span style={{display:"flex",alignItems:"center",justifyContent:"center",height:20}}>{it.icon}</span>
          <span style={{fontSize:9,fontWeight:600}}>{it.l}</span>
        </button>
      ))}
    </div>
  );
}

// ─── DRAWER ───────────────────────────────────────────────────────────────────
function Drawer({open,onClose,view,setView,user,profilePhoto="",divPendCount=0,onLogout,theme,onToggleTheme}){
  const [finOpen,setFinOpen]=useState(true);
  const [compOpen,setCompOpen]=useState(false);
  const [showDuvidas,setShowDuvidas]=useState(false);
  const G2=G;
  const navTo=(v)=>{setView(v);onClose();};
  const finActive=["financas-visao","financas-orcamentos","financas-relatorio","financas-alertas"].includes(view);
  const compActive=["compartilhados-casal","compartilhados-divisoes"].includes(view);

  const items=[
    {id:"carreira",icon:<Ic d={ICON.user} size={18}/>,l:"Perfil"},
    {id:"dashboard",icon:<Ic d={ICON.home} size={18}/>,l:"Dashboard"},
    {id:"busca",icon:<Ic d={ICON.search||"M21 21l-4.35-4.35M17 11A6 6 0 115 11a6 6 0 0112 0z"} size={18}/>,l:"Buscar Lançamentos"},
    {id:"cartoes",icon:<Ic d={ICON.card} size={18}/>,l:"Cartões de Crédito"},
    {id:"contatos",icon:<Ic d={ICON.users} size={18}/>,l:"Contatos"},
    {id:"importar",icon:<Ic d={ICON.import} size={18}/>,l:"Importar Extrato"},
  ];
  const finSubs=[
    {id:"financas-visao",icon:<Ic d={ICON.eye} size={15}/>,l:"Visão Geral"},
    {id:"financas-orcamentos",icon:<Ic d={ICON.target} size={15}/>,l:"Orçamentos"},
    {id:"financas-relatorio",icon:<Ic d={ICON.chart} size={15}/>,l:"Relatório"},
    {id:"financas-alertas",icon:<Ic d={ICON.bell} size={15}/>,l:"Alertas"},
  ];
  const compSubs=[
    {id:"compartilhados-casal",icon:<Ic d={ICON.handshake} size={15}/>,l:"Casal"},
    {id:"compartilhados-divisoes",icon:<Ic d={ICON.divide} size={15}/>,l:"Divisões",badge:divPendCount},
  ];

  if(!open)return null;
  const btnStyle=(active)=>({width:"100%",display:"flex",alignItems:"center",gap:12,padding:"11px 12px",borderRadius:12,border:"none",cursor:"pointer",fontFamily:"inherit",fontSize:14,fontWeight:active?700:500,background:active?G2.accentL:"transparent",color:active?G2.accent:G2.text,textAlign:"left",transition:"background .15s"});
  const subStyle=(active)=>({width:"100%",display:"flex",alignItems:"center",gap:10,padding:"9px 12px",borderRadius:10,border:"none",cursor:"pointer",fontFamily:"inherit",fontSize:13,fontWeight:active?600:400,background:active?G2.accentL:"transparent",color:active?G2.accent:G2.muted,textAlign:"left"});

  return(
    <>
      <div onClick={onClose} style={{position:"fixed",inset:0,zIndex:9000,background:"rgba(0,0,0,.6)",backdropFilter:"blur(4px)"}}/>
      <div style={{position:"fixed",top:0,left:0,bottom:0,zIndex:9001,width:"80%",maxWidth:300,background:G2.card,borderRight:`1px solid ${G2.border2}`,display:"flex",flexDirection:"column",animation:"slideInLeft .25s cubic-bezier(.32,.72,0,1)"}}>
        {/* Header */}
        <div style={{padding:"20px 20px 16px",borderBottom:`1px solid ${G2.border}`}}>
          <div style={{display:"flex",alignItems:"center",justifyContent:"space-between",marginBottom:14}}>
            <div style={{fontFamily:"'Fraunces',serif",fontSize:22,fontWeight:700}}>fin<span style={{color:G2.accent}}>ance</span></div>
            <button onClick={onClose} style={{width:30,height:30,borderRadius:8,border:"none",background:G2.card2,color:G2.muted,cursor:"pointer",fontSize:18,display:"flex",alignItems:"center",justifyContent:"center"}}>×</button>
          </div>
          {user&&<div style={{display:"flex",alignItems:"center",gap:10}}>
            <div style={{width:38,height:38,borderRadius:"50%",overflow:"hidden",flexShrink:0,border:`2px solid ${G2.border2}`}}>
              {(profilePhoto||user.photoURL)?<img src={profilePhoto||user.photoURL} style={{width:"100%",height:"100%",objectFit:"cover"}} referrerPolicy="no-referrer"/>
                :<div style={{width:"100%",height:"100%",display:"flex",alignItems:"center",justifyContent:"center",fontSize:13,fontWeight:700,color:G2.accent,background:G2.accentL}}>{(user.displayName||user.email||"U")[0].toUpperCase()}</div>}
            </div>
            <div>
              <div style={{fontSize:13,fontWeight:600,color:G2.text}}>{user.displayName||"Usuário"}</div>
              <div style={{fontSize:11,color:G2.muted}}>{user.email}</div>
            </div>
          </div>}
        </div>

        {/* Nav items */}
        <div style={{flex:1,overflowY:"auto",padding:"10px 10px"}}>
          {items.map(it=>(
            <button key={it.id} onClick={()=>navTo(it.id)} className="press" style={btnStyle(view===it.id)}>
              <span style={{width:24,display:"flex",justifyContent:"center",alignItems:"center"}}>{it.icon}</span>{it.l}
            </button>
          ))}

          {/* Compartilhados expandível */}
          <button onClick={()=>setCompOpen(v=>!v)} className="press" style={btnStyle(compActive)}>
            <span style={{width:24,display:"flex",justifyContent:"center"}}><Ic d={ICON.handshake} size={18}/></span>
            <span style={{flex:1}}>Compartilhados</span>
            <span style={{fontSize:12,color:G2.muted,transform:compOpen?"rotate(180deg)":"none",transition:"transform .2s"}}>▾</span>
          </button>
          {compOpen&&<div style={{paddingLeft:16,marginBottom:4}}>
            {compSubs.map(s=>(
              <button key={s.id} onClick={()=>navTo(s.id)} className="press" style={{...subStyle(view===s.id),justifyContent:"space-between"}}>
                <span style={{display:"flex",alignItems:"center",gap:8}}><span style={{display:"flex",alignItems:"center"}}>{s.icon}</span>{s.l}</span>
                {s.badge>0&&<span style={{background:G2.red,color:"#fff",borderRadius:10,fontSize:10,fontWeight:700,padding:"1px 7px",minWidth:16,textAlign:"center"}}>{s.badge}</span>}
              </button>
            ))}
          </div>}

          {/* Finanças expandível */}
          <button onClick={()=>setFinOpen(v=>!v)} className="press" style={btnStyle(finActive)}>
            <span style={{width:24,display:"flex",justifyContent:"center"}}><Ic d={ICON.wallet} size={18}/></span>
            <span style={{flex:1}}>Finanças</span>
            <span style={{fontSize:12,color:G2.muted,transform:finOpen?"rotate(180deg)":"none",transition:"transform .2s"}}>▾</span>
          </button>
          {finOpen&&<div style={{paddingLeft:16,marginBottom:4}}>
            {finSubs.map(s=>(
              <button key={s.id} onClick={()=>navTo(s.id)} className="press" style={subStyle(view===s.id)}>
                <span style={{display:"flex",alignItems:"center"}}>{s.icon}</span>{s.l}
              </button>
            ))}
          </div>}
        </div>

        {/* Footer */}
        <div style={{padding:"10px 10px 24px",borderTop:`1px solid ${G2.border}`}}>
          <button onClick={()=>{setView("planos");onClose();}} className="press" style={btnStyle(view==="planos")}>
            <span style={{width:24,display:"flex",justifyContent:"center"}}>✨</span>Planos & Premium
          </button>
          <button onClick={()=>setShowDuvidas(true)} className="press" style={btnStyle(false)}>
            <span style={{width:24,display:"flex",justifyContent:"center"}}><Ic d={ICON.help||"M12 22C6.477 22 2 17.523 2 12S6.477 2 12 2s10 4.477 10 10-4.477 10-10 10zm-1-7v2h2v-2h-2zm2-1.645A3.502 3.502 0 0012 8.5a3.501 3.501 0 00-3.433 2.813l1.963.382A1.5 1.5 0 1113.5 13H12v1.355z"} size={18}/></span>Dúvidas
          </button>
          <button onClick={()=>{onToggleTheme();}} className="press" style={btnStyle(false)}>
            <span style={{width:24,display:"flex",justifyContent:"center"}}><Ic d={theme==="dark"?ICON.sun:ICON.moon} size={18}/></span>{theme==="dark"?"Modo Claro":"Modo Escuro"}
          </button>
          <button onClick={()=>{onLogout();onClose();}} className="press" style={btnStyle(false)}>
            <span style={{width:24,display:"flex",justifyContent:"center"}}><Ic d={ICON.logout} size={18}/></span>Sair da conta
          </button>
        </div>
      </div>

      {/* ── MODAL DÚVIDAS ─────────────────────────────── */}
      {showDuvidas&&<div style={{position:"fixed",inset:0,zIndex:9100,display:"flex",flexDirection:"column",justifyContent:"flex-end"}}>
        <div onClick={()=>setShowDuvidas(false)} style={{position:"absolute",inset:0,background:"rgba(0,0,0,.7)",backdropFilter:"blur(4px)"}}/>
        <div style={{position:"relative",background:G2.card,borderRadius:"24px 24px 0 0",maxHeight:"90vh",display:"flex",flexDirection:"column",paddingBottom:"env(safe-area-inset-bottom,16px)"}}>
          {/* handle */}
          <div style={{display:"flex",justifyContent:"center",padding:"10px 0 4px"}}><div style={{width:36,height:4,borderRadius:2,background:G2.border}}/></div>
          {/* header */}
          <div style={{display:"flex",alignItems:"center",justifyContent:"space-between",padding:"8px 20px 14px",borderBottom:`1px solid ${G2.border}`}}>
            <div style={{fontFamily:"'Fraunces',serif",fontSize:20,fontWeight:700,color:G2.text}}>❓ Dúvidas</div>
            <button onClick={()=>setShowDuvidas(false)} style={{width:30,height:30,borderRadius:8,border:"none",background:G2.card2,color:G2.muted,cursor:"pointer",fontSize:16}}>✕</button>
          </div>
          {/* content */}
          <div style={{overflowY:"auto",padding:"16px 20px 24px",display:"flex",flexDirection:"column",gap:16}}>

            {[
              {
                emoji:"🏠", titulo:"Dashboard",
                itens:[
                  "O Dashboard mostra seu saldo do mês atual com comparação ao mês anterior.",
                  "Use as pills de mês no topo para navegar entre meses passados.",
                  "Os mini-cards mostram: maior categoria de gastos, total de lançamentos, média diária e variação vs mês anterior.",
                  "O gráfico de barras mostra seus gastos por semana do mês.",
                  "O donut interativo mostra seus gastos por categoria — toque em uma fatia para ver o valor.",
                  "Abaixo aparecem lançamentos agendados futuros e os últimos registros.",
                ]
              },
              {
                emoji:"🤖", titulo:"IA — Como usar",
                itens:[
                  'Fale naturalmente: "Gastei 50 no mercado", "Paguei 120 de aluguel".',
                  'Para receitas: "Recebi 3000 de salário", "Ganhei 800 de freela".',
                  'Registre vários gastos de uma vez: "30 lanche, 20 uber, 15 farmácia".',
                  'Use "ontem" para registrar no dia anterior: "Paguei 90 de academia ontem".',
                  'Informe o dia: "Gastei 40 no mercado no dia 5".',
                  "Antes de confirmar, você pode editar o valor e trocar a categoria.",
                  'Para ver um resumo do mês, pergunte: "Quanto gastei esse mês?" ou "Qual meu saldo?".',
                ]
              },
              {
                emoji:"💸", titulo:"Receitas & Despesas",
                itens:[
                  "Use as abas Receitas e Despesas na barra inferior para ver seus lançamentos.",
                  "Filtre por mês usando as pills coloridas.",
                  "Filtre por categoria tocando nos emojis de categorias.",
                  "O breakdown de categorias mostra barras de progresso com o percentual de cada gasto.",
                  "Lançamentos recorrentes aparecem no topo — ative ou desative com o toggle.",
                  "Toque e segure (ou deslize) um lançamento para excluir.",
                ]
              },
              {
                emoji:"🔄", titulo:"Lançamentos Recorrentes",
                itens:[
                  "Recorrentes são cobranças fixas mensais (assinaturas, aluguel, etc.).",
                  "Adicione pelo botão + na aba de Receitas ou Despesas.",
                  "Ao ativar o toggle de um recorrente, ele é adicionado automaticamente ao mês.",
                  "Recorrentes desativados não entram no cálculo do saldo.",
                ]
              },
              {
                emoji:"💳", titulo:"Cartões de Crédito",
                itens:[
                  "Cadastre seus cartões com limite e dia de vencimento da fatura.",
                  "Os gastos no cartão aparecem agrupados por cartão.",
                  "Acompanhe o total gasto e o limite restante de cada cartão.",
                ]
              },
              {
                emoji:"👥", titulo:"Contatos & Divisões",
                itens:[
                  "Cadastre contatos para dividir despesas com amigos.",
                  "Na aba Compartilhados > Divisões, crie divisões de conta entre contatos.",
                  "O badge vermelho no menu mostra divisões pendentes de pagamento.",
                  "Marque uma divisão como paga para quitar a pendência.",
                ]
              },
              {
                emoji:"👤", titulo:"Perfil",
                itens:[
                  "Adicione foto, nome, cidade, frase pessoal e links (Instagram, site).",
                  "Acompanhe seu resumo financeiro do ano: receitas, despesas e taxa de poupança.",
                  "Registre seu humor e nível de energia diários — veja o histórico em barras.",
                  "Crie rotinas do dia com checklist e acompanhe sua sequência (streak) de dias.",
                  "Defina metas pessoais com emoji, progresso e prazo.",
                ]
              },
              {
                emoji:"📥", titulo:"Importar Extrato",
                itens:[
                  "Importe extratos bancários em formato CSV ou OFX.",
                  "O app detecta automaticamente receitas e despesas do arquivo.",
                  "Revise os lançamentos antes de confirmar a importação.",
                ]
              },
              {
                emoji:"🌙", titulo:"Modo Claro / Escuro",
                itens:[
                  "Alterne entre modo claro e escuro pelo menu lateral (abaixo de Dúvidas).",
                  "A preferência é salva automaticamente para a próxima vez.",
                ]
              },
            ].map((sec,si)=>(
              <div key={si} style={{background:G2.card2,borderRadius:16,padding:"14px 16px",border:`1px solid ${G2.border}`}}>
                <div style={{display:"flex",alignItems:"center",gap:8,marginBottom:10}}>
                  <span style={{fontSize:20}}>{sec.emoji}</span>
                  <span style={{fontFamily:"'Fraunces',serif",fontSize:15,fontWeight:700,color:G2.text}}>{sec.titulo}</span>
                </div>
                <div style={{display:"flex",flexDirection:"column",gap:6}}>
                  {sec.itens.map((item,ii)=>(
                    <div key={ii} style={{display:"flex",gap:8,alignItems:"flex-start"}}>
                      <div style={{width:5,height:5,borderRadius:"50%",background:G2.accent,flexShrink:0,marginTop:6}}/>
                      <span style={{fontSize:13,color:G2.muted,lineHeight:1.5}}>{item}</span>
                    </div>
                  ))}
                </div>
              </div>
            ))}

          </div>
        </div>
      </div>}
    </>
  );
}


function Head({view,onRec,onDep,user,profilePhoto="",onDrawer,divPendCount=0,onSearch}){
  const TITLES={dashboard:"Início",receitas:"Receitas",despesas:"Despesas",carreira:"Meu Perfil",chat:"IA",
    cartoes:"Cartões",familia:"Família / Casal",divisao:"Divisão de Contas",importar:"Importar Extrato",
    "financas-visao":"Visão Geral","financas-orcamentos":"Orçamentos","financas-relatorio":"Relatório","financas-alertas":"Alertas"};
  const showAdd=["dashboard","receitas","despesas"].includes(view);
  return(
    <div style={{position:"fixed",top:0,left:0,right:0,zIndex:300,background:G.card,borderBottom:`1px solid ${G.border}`,display:"flex",alignItems:"center",justifyContent:"space-between",height:HH,paddingLeft:16,paddingRight:16,paddingTop:"env(safe-area-inset-top,0px)",boxSizing:"content-box"}}>
      <div style={{display:"flex",alignItems:"center",gap:10}}>
        <div style={{position:"relative",flexShrink:0}}>
        <button onClick={onDrawer} className="press" style={{width:34,height:34,borderRadius:10,border:"none",background:G.card2,cursor:"pointer",display:"flex",flexDirection:"column",alignItems:"center",justifyContent:"center",gap:4,padding:0,flexShrink:0}}>
          {[0,1,2].map(i=><div key={i} style={{width:16,height:2,borderRadius:1,background:G.text}}/>)}
        </button>
        {divPendCount>0&&<span style={{position:"absolute",top:-3,right:-3,width:8,height:8,borderRadius:"50%",background:G.red,border:"2px solid "+G.card}}/>}
        </div>
        <div style={{fontFamily:"'Fraunces',serif",fontSize:18,fontWeight:700,letterSpacing:-.5}}>fin<span style={{color:G.accent}}>ance</span>
          <span style={{fontFamily:"'Figtree',sans-serif",fontSize:12,fontWeight:400,color:G.muted,marginLeft:8}}>{TITLES[view]||""}</span>
        </div>
      </div>
      {showAdd&&<div style={{display:"flex",gap:8}}>
        <button onClick={onRec} className="press" style={{padding:"6px 13px",borderRadius:20,border:`1px solid ${G.green}55`,background:G.greenL,color:G.green,fontSize:12,fontWeight:700,cursor:"pointer"}}>+ Rec</button>
        <button onClick={onDep} className="press" style={{padding:"6px 13px",borderRadius:20,border:`1px solid ${G.red}55`,background:G.redL,color:G.red,fontSize:12,fontWeight:700,cursor:"pointer"}}>+ Dep</button>
      </div>}
      {user&&onSearch&&<button onClick={onSearch} className="press" style={{width:34,height:34,borderRadius:10,border:"none",background:"transparent",cursor:"pointer",display:"flex",alignItems:"center",justifyContent:"center"}}><Ic d={ICON.search} size={18} color={G.muted}/></button>}
      {!showAdd&&user&&<button onClick={onDrawer} className="press"
        style={{width:32,height:32,borderRadius:"50%",border:`1px solid ${G.border2}`,background:"none",cursor:"pointer",overflow:"hidden",padding:0}}>
        {user.photoURL?<img src={user.photoURL} style={{width:"100%",height:"100%",objectFit:"cover"}} referrerPolicy="no-referrer"/>
          :<div style={{width:"100%",height:"100%",display:"flex",alignItems:"center",justifyContent:"center",fontSize:13,fontWeight:700,color:G.accent,background:G.accentL}}>{(user.displayName||user.email||"U")[0].toUpperCase()}</div>}
      </button>}
    </div>
  );
}

// ─── TX ROW ───────────────────────────────────────────────────────────────────
function TxRow({l,onDelete,full}){
  const isR=l.tipo==="Receita",c=isR?G.green:G.red;
  const isPendente=l.agendado&&l.data>today();
  return(
    <div style={{display:"flex",alignItems:"center",gap:12,padding:"12px 0",borderBottom:`1px solid ${G.border}`,opacity:isPendente?.55:1}}>
      <div style={{width:38,height:38,borderRadius:11,flexShrink:0,background:isPendente?G.card2:isR?G.greenL:G.redL,display:"flex",alignItems:"center",justifyContent:"center",fontSize:15,color:isPendente?G.muted:c,position:"relative",border:isPendente?`1.5px dashed ${G.border2}`:"none"}}>
        {isPendente?"":isR?"↑":"↓"}
        {l.auto&&<div style={{position:"absolute",bottom:-2,right:-2,width:13,height:13,borderRadius:"50%",background:G.accent,display:"flex",alignItems:"center",justifyContent:"center",fontSize:8,color:"#fff"}}>↻</div>}
      </div>
      <div style={{flex:1,minWidth:0}}>
        <div style={{fontSize:14,fontWeight:500,overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap",color:isPendente?G.muted:G.text}}>{l.desc||l.cat}</div>
        <div style={{display:"flex",alignItems:"center",gap:6,marginTop:3,flexWrap:"wrap"}}>
          <span style={{fontSize:11,color:G.muted}}>{fmtD(l.data)}</span>
          <Tag color={CAT_COLORS[l.cat]||G.muted}>{l.cat}</Tag>
          {full&&<span style={{fontSize:11,color:G.muted}}>{l.forma}</span>}
          {l.auto&&<Tag color={G.accent}>↻ auto</Tag>}
          {isPendente&&<Tag color={G.yellow}> agendado</Tag>}
        </div>
      </div>
      <div style={{fontFamily:"'Fraunces',serif",fontSize:15,fontWeight:700,color:isPendente?G.muted:c,flexShrink:0,textDecoration:isPendente?"line-through":"none"}}>{isR?"+":"-"}{fmt(l.valor)}</div>
      <button onClick={()=>onDelete(l.id)} style={{background:"none",border:"none",color:G.border2,cursor:"pointer",fontSize:20,padding:"2px 4px",lineHeight:1}}
        onMouseEnter={e=>e.currentTarget.style.color=G.red} onMouseLeave={e=>e.currentTarget.style.color=G.border2}>×</button>
    </div>
  );
}

// ─── LANC FORM ────────────────────────────────────────────────────────────────
function LancForm({tipo,setTipo,form,setForm,onSave,cartoes=[]}){
  const sw=t=>{setTipo(t);setForm(f=>({...f,cat:t==="Receita"?CATS_REC[0]:CATS_DEP[0],forma:t==="Receita"?FORMAS_REC[0]:FORMAS_DEP[0]}));};
  const ac=tipo==="Receita"?G.green:G.red;
  const isRec=form.recorrente;
  return(
    <div>
      <div style={{display:"flex",gap:8,marginBottom:20}}>
        {["Receita","Despesa"].map(t=><button key={t} onClick={()=>sw(t)} className="press" style={{flex:1,padding:"12px",borderRadius:12,cursor:"pointer",fontWeight:700,fontSize:14,fontFamily:"inherit",background:tipo===t?(t==="Receita"?G.greenL:G.redL):G.card2,color:tipo===t?(t==="Receita"?G.green:G.red):G.muted,border:`1px solid ${tipo===t?(t==="Receita"?G.green+"66":G.red+"66"):G.border}`}}>{t==="Receita"?"↑ Receita":"↓ Despesa"}</button>)}
      </div>
      <div style={{textAlign:"center",marginBottom:20}}>
        <Lbl>Valor (R$)</Lbl>
        <input type="number" inputMode="decimal" placeholder="0,00" min="0" step="0.01" value={form.valor} onChange={e=>setForm(f=>({...f,valor:e.target.value}))} style={{width:"100%",textAlign:"center",fontFamily:"'Fraunces',serif",fontSize:36,fontWeight:700,color:ac,background:"transparent",border:"none",borderBottom:`2px solid ${ac}`,borderRadius:0,padding:"4px 0 10px",outline:"none",color:ac}}/>
      </div>
      <div style={{marginBottom:14}}><Lbl opt>Descrição</Lbl><input type="text" placeholder="Ex: Salário, Mercado, Uber..." value={form.desc} onChange={e=>setForm(f=>({...f,desc:e.target.value}))} className="inp"/></div>
      <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:12,marginBottom:14}}>
        <div><Lbl>Data</Lbl><input type="date" value={form.data} onChange={e=>setForm(f=>({...f,data:e.target.value}))} className="inp"/></div>
        <div><Lbl>Categoria</Lbl>{tipo==="Despesa"&&form.forma==="Cartão Crédito"?(<div className="inp" style={{color:G.muted,fontSize:14}}>💳 Cartão de Crédito</div>):(<select value={form.cat} onChange={e=>setForm(f=>({...f,cat:e.target.value}))} className="inp">{(tipo==="Receita"?CATS_REC:CATS_DEP).map(c=><option key={c}>{c}</option>)}</select>)}</div>
      </div>
      <div style={{marginBottom:16}}><Lbl>Forma de Pagamento</Lbl>
        <div style={{display:"flex",gap:8,overflowX:"auto",paddingBottom:4}}>
          {(tipo==="Receita"?FORMAS_REC:FORMAS_DEP).map(f=><div key={f} onClick={()=>setForm(fm=>({...fm,forma:f}))} className="press" style={{padding:"8px 14px",borderRadius:20,cursor:"pointer",flexShrink:0,fontSize:12,fontWeight:600,background:form.forma===f?ac+"22":G.card2,border:`1px solid ${form.forma===f?ac+"88":G.border}`,color:form.forma===f?ac:G.muted}}>{f}</div>)}
        </div>
      </div>
      {tipo==="Despesa"&&form.forma==="Cartão Crédito"&&cartoes.length>0&&<div style={{marginBottom:16}}>
        <Lbl>Qual cartão?</Lbl>
        <div style={{display:"flex",gap:8,overflowX:"auto",paddingBottom:4}}>
          <div onClick={()=>setForm(f=>({...f,cartaoId:""}))} className="press"
            style={{padding:"8px 14px",borderRadius:20,cursor:"pointer",flexShrink:0,fontSize:12,fontWeight:600,
              background:!form.cartaoId?G.accent+"22":G.card2,border:"1px solid "+(!form.cartaoId?G.accent+"88":G.border),color:!form.cartaoId?G.accent:G.muted}}>
            Sem vínculo
          </div>
          {cartoes.map(c=>(
            <div key={c.id} onClick={()=>setForm(f=>({...f,cartaoId:c.id}))} className="press"
              style={{padding:"8px 14px",borderRadius:20,cursor:"pointer",flexShrink:0,fontSize:12,fontWeight:600,display:"flex",alignItems:"center",gap:6,
                background:form.cartaoId===c.id?c.cor+"33":G.card2,border:"1px solid "+(form.cartaoId===c.id?c.cor:G.border),color:form.cartaoId===c.id?c.cor:G.muted}}>
              <div style={{width:8,height:8,borderRadius:"50%",background:c.cor,flexShrink:0}}/>
              {c.nome}
            </div>
          ))}
        </div>
      </div>}
      {/* ── Modo: Normal / Recorrente / Agendado ── */}
      <div style={{marginBottom:16}}>
        <div style={{display:"flex",gap:8,marginBottom:form.modo&&form.modo!=="normal"?10:0}}>
          {[{id:"normal",icon:"✓",l:"Normal"},{id:"recorrente",icon:"↻",l:"Recorrente"},{id:"agendado",icon:"",l:"Agendado"}].map(opt=>{
            const sel=(form.modo||"normal")===opt.id;
            return(<button key={opt.id} onClick={()=>setForm(f=>({...f,modo:opt.id}))} className="press"
              style={{flex:1,padding:"10px 6px",borderRadius:12,border:`1px solid ${sel?ac+"88":G.border}`,background:sel?ac+"18":G.card2,color:sel?ac:G.muted,fontSize:12,fontWeight:sel?700:500,cursor:"pointer",fontFamily:"inherit",display:"flex",flexDirection:"column",alignItems:"center",gap:3}}>
              <span style={{fontSize:16}}>{opt.icon}</span><span>{opt.l}</span>
            </button>);
          })}
        </div>
        {(form.modo||"normal")==="recorrente"&&<div style={{background:G.card2,borderRadius:12,padding:12,animation:"fadeUp .15s ease"}}>
          <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:10,marginBottom:8}}>
            <div><Lbl>Frequência</Lbl><select value={form.freq||"mensal"} onChange={e=>setForm(f=>({...f,freq:e.target.value}))} className="inp">{FREQ_OPTS.map(f=><option key={f.id} value={f.id}>{f.icon} {f.label}</option>)}</select></div>
            <div><Lbl>Dia do mês</Lbl><input type="text" inputMode="numeric" pattern="[0-9]*" placeholder="1–31" value={form.dia===0||form.dia===undefined?"":form.dia} onChange={e=>{const v=e.target.value.replace(/\D/g,"");setForm(f=>({...f,dia:v===""?0:Math.min(31,Math.max(1,parseInt(v)||1))}));}} onBlur={()=>{if(!form.dia||form.dia<1)setForm(f=>({...f,dia:1}));}} className="inp"/></div>
          </div>
          <div style={{fontSize:11,color:G.muted,textAlign:"center"}}>↻ Entra automaticamente todo mês na data definida</div>
        </div>}
        {(form.modo||"normal")==="agendado"&&<div style={{background:G.yellow+"12",border:`1px solid ${G.yellow}44`,borderRadius:12,padding:12,animation:"fadeUp .15s ease"}}>
          <div style={{fontSize:12,color:G.yellow,fontWeight:600,marginBottom:4}}> Agendado</div>
          <div style={{fontSize:12,color:G.muted,lineHeight:1.5}}>Vai entrar no saldo só na data escolhida acima. Aparece na lista com visual diferente até lá.</div>
        </div>}
      </div>
      <button onClick={onSave} className="press" style={{width:"100%",padding:"16px",borderRadius:14,border:"none",cursor:"pointer",fontWeight:700,fontSize:16,fontFamily:"inherit",background:ac,color:"#fff"}}>Salvar {tipo}</button>
    </div>
  );
}

// ─── DASHBOARD ────────────────────────────────────────────────────────────────
function Dashboard({lancs,onDelete,user}){
  const [mes,setMes]=useState(curMes());
  const [hide,setHide]=useState(false);
  const [selCat,setSelCat]=useState(null);

  const md=[...new Set(lancs.map(l=>getMes(l.data)))].sort().reverse().slice(0,6);
  if(!md.includes(curMes()))md.unshift(curMes());
  const dm=lancs.filter(l=>getMes(l.data)===mes&&isRealizado(l.data,l.agendado));
  const tR=dm.filter(l=>l.tipo==="Receita").reduce((s,l)=>s+l.valor,0);
  const tD=dm.filter(l=>l.tipo==="Despesa").reduce((s,l)=>s+l.valor,0);
  const sal=tR-tD, pct=tR>0?Math.round(sal/tR*100):0;

  // últimos 6 meses para sparkline
  const spark=md.slice().reverse().map(m=>{
    const d=lancs.filter(l=>getMes(l.data)===m&&isRealizado(l.data,l.agendado));
    const r=d.filter(l=>l.tipo==="Receita").reduce((s,l)=>s+l.valor,0);
    const dep=d.filter(l=>l.tipo==="Despesa").reduce((s,l)=>s+l.valor,0);
    return{m,sal:r-dep,dep,rec:r};
  });

  const cats=CATS_DEP
    .map(c=>({name:c,v:dm.filter(l=>l.tipo==="Despesa"&&l.cat===c).reduce((s,l)=>s+l.valor,0),color:CAT_COLORS[c]||"#94A3B8"}))
    .filter(c=>c.v>0).sort((a,b)=>b.v-a.v);

  const agendados=lancs.filter(l=>l.agendado&&l.data>today()).sort((a,b)=>a.data.localeCompare(b.data)).slice(0,3);

  // donut arc helper
  function arc(pct,r=38){
    const circ=2*Math.PI*r;
    return{dasharray:`${circ*pct} ${circ*(1-pct)}`,dashoffset:circ*0.25};
  }

  const top3=cats.slice(0,3);
  const outV=cats.slice(3).reduce((s,c)=>s+c.v,0);
  const donut=[...top3,...(outV>0?[{name:"Outros",v:outV,color:"#475569"}]:[])];
  const total_donut=donut.reduce((s,d)=>s+d.v,0);

  // semanais
  const [y,mN]=mes.split("-").map(Number);
  const dim=new Date(y,mN,0).getDate();
  const weeks=Array.from({length:5},(_,i)=>{
    const s=i*7+1,e=Math.min((i+1)*7,dim);
    if(s>dim)return null;
    const v=dm.filter(l=>l.tipo==="Despesa"&&l.data).filter(l=>{const d=parseInt(l.data.slice(8,10));return d>=s&&d<=e;}).reduce((a,l)=>a+l.valor,0);
    return{name:`S${i+1}`,v,s,e};
  }).filter(Boolean);
  const maxW=Math.max(...weeks.map(w=>w.v),1);

  const [hovWeek,setHovWeek]=useState(null);
  const hv=v=>hide?"•••":v;

  // compare prev month
  const prevM=md[1];
  const prevSal=prevM?(()=>{const d=lancs.filter(l=>getMes(l.data)===prevM&&isRealizado(l.data,l.agendado));return d.filter(l=>l.tipo==="Receita").reduce((s,l)=>s+l.valor,0)-d.filter(l=>l.tipo==="Despesa").reduce((s,l)=>s+l.valor,0);})():null;
  const diff=prevSal!==null?sal-prevSal:null;

  return(
  <div style={{paddingBottom:32}}>

    {/* ════ HERO CARD ════════════════════════════════ */}
    <div style={{
      margin:"0 0 20px",
      borderRadius:28,
      padding:"26px 22px 22px",
      position:"relative",
      overflow:"hidden",
      background:"linear-gradient(145deg,#0e0c1e 0%,#160f30 45%,#0a1628 100%)",
      boxShadow:"0 24px 48px rgba(0,0,0,.45)",
    }}>
      {/* mesh blobs */}
      <div style={{position:"absolute",top:-60,left:-40,width:220,height:220,borderRadius:"50%",background:"radial-gradient(circle,rgba(124,106,247,.22),transparent 65%)",pointerEvents:"none"}}/>
      <div style={{position:"absolute",bottom:-50,right:-30,width:180,height:180,borderRadius:"50%",background:"radial-gradient(circle,rgba(46,204,142,.14),transparent 65%)",pointerEvents:"none"}}/>
      <div style={{position:"absolute",top:"30%",right:"20%",width:80,height:80,borderRadius:"50%",background:"radial-gradient(circle,rgba(251,191,36,.1),transparent 65%)",pointerEvents:"none"}}/>

      {/* top row: greeting + hide */}
      <div style={{display:"flex",alignItems:"center",justifyContent:"space-between",marginBottom:18}}>
        <div>
          <div style={{fontSize:11,fontWeight:600,letterSpacing:1.5,textTransform:"uppercase",color:"rgba(255,255,255,.35)",marginBottom:2}}>Olá,</div>
          <div style={{fontFamily:"'Fraunces',serif",fontSize:20,fontWeight:700,color:"#fff",lineHeight:1}}>
            {(user?.displayName||user?.email||"").split(" ")[0]||"bem-vindo"} 👋
          </div>
        </div>
        <button onClick={()=>setHide(h=>!h)} style={{background:"rgba(255,255,255,.07)",border:"1px solid rgba(255,255,255,.1)",borderRadius:20,padding:"4px 12px",cursor:"pointer",fontSize:11,color:"rgba(255,255,255,.4)",flexShrink:0,marginLeft:8}}>
          {hide?"👁 Ver":"👁 Ocultar"}
        </button>
      </div>

      {/* saldo grande */}
      <div style={{marginBottom:4}}>
        <div style={{fontSize:10,fontWeight:600,letterSpacing:2,textTransform:"uppercase",color:"rgba(255,255,255,.3)",marginBottom:6}}>Saldo do mês</div>
        <div style={{fontFamily:"'Fraunces',serif",fontSize:46,fontWeight:700,letterSpacing:-2,lineHeight:1,
          color:hide?"transparent":sal>=0?"#2ECC8E":"#F87171",
          textShadow:hide?"none":sal>=0?"0 0 40px rgba(46,204,142,.3)":"0 0 40px rgba(248,113,113,.3)",
          filter:hide?"blur(12px)":"none",transition:"filter .3s,color .3s",userSelect:hide?"none":"auto"}}>
          {fmt(sal)}
        </div>
        {diff!==null&&!hide&&<div style={{fontSize:12,color:diff>=0?"rgba(46,204,142,.7)":"rgba(248,113,113,.7)",marginTop:6,display:"flex",alignItems:"center",gap:4}}>
          <Ic d={diff>=0?ICON.arrow_up:ICON.arrow_down} size={11} color={diff>=0?"rgba(46,204,142,.7)":"rgba(248,113,113,.7)"}/>
          {diff>=0?"+":""}{fmt(diff)} vs mês anterior
        </div>}
      </div>

      {/* sparkline SVG — últimos meses */}
      {spark.length>1&&<div style={{height:52,margin:"16px 0 14px",position:"relative"}}>
        {(()=>{
          const vals=spark.map(s=>s.sal);
          const min=Math.min(...vals),max=Math.max(...vals);
          const range=max-min||1;
          const W=320,H=48;
          const pts=vals.map((v,i)=>`${(i/(vals.length-1))*W},${H-((v-min)/range)*H*0.85-4}`).join(" ");
          const fillPts=`0,${H} ${pts} ${W},${H}`;
          const lineColor=sal>=0?"rgba(46,204,142,.6)":"rgba(248,113,113,.6)";
          return(
            <svg viewBox={`0 0 ${W} ${H}`} preserveAspectRatio="none" style={{width:"100%",height:"100%"}}>
              <defs>
                <linearGradient id="sg" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor={sal>=0?"rgba(46,204,142,.25)":"rgba(248,113,113,.25)"}/>
                  <stop offset="100%" stopColor="transparent"/>
                </linearGradient>
              </defs>
              <polygon points={fillPts} fill="url(#sg)"/>
              <polyline points={pts} fill="none" stroke={lineColor} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
              {vals.map((v,i)=>{
                const cx=(i/(vals.length-1))*W,cy=H-((v-min)/range)*H*0.85-4;
                return i===vals.length-1?<circle key={i} cx={cx} cy={cy} r={4} fill={lineColor} opacity={.9}/>:null;
              })}
            </svg>
          );
        })()}
        <div style={{position:"absolute",bottom:-2,left:0,right:0,display:"flex",justifyContent:"space-between"}}>
          {spark.map((s,i)=><span key={i} style={{fontSize:9,color:"rgba(255,255,255,.25)"}}>{MESES[parseInt(s.m.split("-")[1])-1]}</span>)}
        </div>
      </div>}

      {/* 3 chips */}
      <div style={{display:"grid",gridTemplateColumns:"1fr 1fr 1fr",gap:8,marginTop:4}}>
        {[
          {l:"Receitas",v:"+"+fmt(tR),c:"rgba(46,204,142,1)",bg:"rgba(46,204,142,.1)",b:"rgba(46,204,142,.2)"},
          {l:"Despesas",v:"-"+fmt(tD),c:"rgba(248,113,113,1)",bg:"rgba(248,113,113,.1)",b:"rgba(248,113,113,.2)"},
          {l:"Poupança",v:pct+"%",c:"rgba(251,191,36,1)",bg:"rgba(251,191,36,.1)",b:"rgba(251,191,36,.2)"},
        ].map((k,i)=>(
          <div key={i} style={{background:k.bg,border:`1px solid ${k.b}`,borderRadius:16,padding:"10px 10px 8px"}}>
            <div style={{fontSize:9,color:"rgba(255,255,255,.35)",marginBottom:4,fontWeight:600,letterSpacing:.8,textTransform:"uppercase"}}>{k.l}</div>
            <div style={{fontFamily:"'Fraunces',serif",fontSize:12,fontWeight:700,color:hide?"rgba(255,255,255,.15)":k.c,filter:hide?"blur(5px)":"none",transition:"filter .3s",lineHeight:1.2}}>{hide?"•••":k.v}</div>
          </div>
        ))}
      </div>
    </div>

    {/* mes pills */}
    <div style={{display:"flex",gap:6,overflowX:"auto",scrollbarWidth:"none",padding:"4px 0 8px"}}>
      {md.map(m=>{
        const [my,mm]=m.split("-");
        const lbl=MESES[parseInt(mm)-1]+" '"+my.slice(2);
        const on=m===mes;
        return(<button key={m} onClick={()=>setMes(m)} className="press"
          style={{padding:"5px 14px",borderRadius:20,
            border:`1px solid ${on?G.accent:G.border}`,
            background:on?G.accentL:"transparent",
            color:on?G.accent:G.muted,
            fontSize:12,fontWeight:on?700:400,cursor:"pointer",flexShrink:0,whiteSpace:"nowrap",transition:"all .2s"}}>
          {lbl}
        </button>);
      })}
    </div>


    {/* ════ GRÁFICO SEMANAL ══════════════════════════ */}
    <div style={{background:G.card,border:`1px solid ${G.border}`,borderRadius:24,padding:"18px 16px",marginBottom:16}}>
      <div style={{display:"flex",alignItems:"flex-start",justifyContent:"space-between",marginBottom:20}}>
        <div>
          <div style={{fontSize:11,fontWeight:700,letterSpacing:1.2,textTransform:"uppercase",color:G.muted}}>Gastos por semana</div>
          {hovWeek
            ?<div style={{marginTop:4}}><span style={{fontFamily:"'Fraunces',serif",fontSize:18,fontWeight:700,color:G.red}}>{fmt(hovWeek.v)}</span><span style={{fontSize:11,color:G.muted,marginLeft:6}}>{hovWeek.name} · dia {hovWeek.s}–{hovWeek.e}</span></div>
            :<div style={{fontFamily:"'Fraunces',serif",fontSize:18,fontWeight:700,color:G.text,marginTop:4}}>{hv(fmt(weeks.reduce((s,w)=>s+w.v,0)))}</div>
          }
        </div>
        <div style={{fontSize:11,color:G.muted,marginTop:2}}>{mesLblFull(mes)}</div>
      </div>

      {/* barras customizadas */}
      {weeks.length>0&&weeks.some(w=>w.v>0)
        ?<div style={{display:"flex",alignItems:"flex-end",gap:8,height:96,padding:"0 4px"}}>
          {weeks.map((w,i)=>{
            const h=Math.max((w.v/maxW)*80,w.v>0?6:0);
            const hov=hovWeek?.name===w.name;
            return(
              <div key={i} style={{flex:1,display:"flex",flexDirection:"column",alignItems:"center",cursor:"pointer",gap:4}}
                onMouseEnter={()=>setHovWeek(w)} onMouseLeave={()=>setHovWeek(null)}
                onClick={()=>setHovWeek(v=>v?.name===w.name?null:w)}>
                <div style={{fontSize:9,color:hov?G.red:"transparent",fontWeight:700,transition:"color .15s",textAlign:"center"}}>{fmt(w.v).replace("R$ ","")}</div>
                <div style={{width:"100%",display:"flex",flexDirection:"column",justifyContent:"flex-end",flex:1,position:"relative"}}>
                  <div style={{
                    width:"100%",height:Math.max(h,2),borderRadius:"8px 8px 4px 4px",
                    background:hov
                      ?`linear-gradient(180deg,${G.red},${G.red}88)`
                      :w.v>0?`linear-gradient(180deg,${G.red}99,${G.red}44)`:`${G.border}`,
                    transition:"all .2s",
                    boxShadow:hov?`0 0 16px ${G.red}55`:"none",
                  }}/>
                </div>
                <div style={{fontSize:10,color:hov?G.text:G.muted,fontWeight:hov?700:400,transition:"color .15s"}}>{w.name}</div>
              </div>
            );
          })}
        </div>
        :<div style={{textAlign:"center",color:G.muted,fontSize:13,padding:"28px 0"}}>Sem despesas este mês</div>
      }
    </div>

    {/* ════ DONUT + TOP CATS ═════════════════════════ */}
    {cats.length>0&&<div style={{background:G.card,border:`1px solid ${G.border}`,borderRadius:24,padding:"18px 16px",marginBottom:16}}>
      <div style={{fontSize:11,fontWeight:700,letterSpacing:1.2,textTransform:"uppercase",color:G.muted,marginBottom:16}}>Onde foi o dinheiro</div>
      <div style={{display:"flex",alignItems:"center",gap:20}}>

        {/* SVG Donut */}
        <div style={{position:"relative",flexShrink:0,width:100,height:100}}>
          <svg viewBox="0 0 96 96" style={{width:100,height:100,transform:"rotate(-90deg)"}}>
            {(()=>{
              let offset=0;
              const r=36,circ=2*Math.PI*r;
              return donut.map((d,i)=>{
                const p=total_donut>0?d.v/total_donut:0;
                const dash=circ*p;
                const el=<circle key={i} cx="48" cy="48" r={r}
                  fill="none" stroke={d.color} strokeWidth={selCat&&selCat!==d.name?8:10}
                  strokeDasharray={`${dash} ${circ-dash}`}
                  strokeDashoffset={-circ*offset}
                  opacity={selCat&&selCat!==d.name?.4:1}
                  style={{cursor:"pointer",transition:"all .25s"}}
                  onClick={()=>setSelCat(s=>s===d.name?null:d.name)}/>;
                offset+=p;
                return el;
              });
            })()}
            <circle cx="48" cy="48" r="26" fill={G.card}/>
          </svg>
          {/* centro */}
          <div style={{position:"absolute",inset:0,display:"flex",flexDirection:"column",alignItems:"center",justifyContent:"center",pointerEvents:"none"}}>
            {selCat
              ?<><div style={{fontSize:9,color:G.muted,textAlign:"center",lineHeight:1.2,maxWidth:48}}>{selCat}</div>
                <div style={{fontFamily:"'Fraunces',serif",fontSize:12,fontWeight:700,color:cats.find(c=>c.name===selCat)?.color||G.accent}}>
                  {hide?"•":fmt(cats.find(c=>c.name===selCat)?.v||0).replace("R$ ","R$")}
                </div></>
              :<><div style={{fontSize:9,color:G.muted}}>Total</div>
                <div style={{fontFamily:"'Fraunces',serif",fontSize:11,fontWeight:700,color:G.text}}>{hide?"•••":fmt(tD).replace("R$ ","R$")}</div></>
            }
          </div>
        </div>

        {/* lista cats */}
        <div style={{flex:1,display:"flex",flexDirection:"column",gap:6}}>
          {cats.slice(0,5).map(cat=>{
            const p=tD>0?cat.v/tD*100:0;
            const sel=selCat===cat.name;
            return(
              <div key={cat.name} onClick={()=>setSelCat(s=>s===cat.name?null:cat.name)}
                style={{cursor:"pointer",opacity:selCat&&!sel?.4:1,transition:"opacity .2s"}}>
                <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:3}}>
                  <div style={{display:"flex",alignItems:"center",gap:6}}>
                    <div style={{width:6,height:6,borderRadius:"50%",background:cat.color,flexShrink:0}}/>
                    <span style={{fontSize:12,color:G.text,fontWeight:sel?700:400}}>{cat.name}</span>
                  </div>
                  <span style={{fontFamily:"'Fraunces',serif",fontSize:11,fontWeight:700,color:sel?cat.color:G.muted}}>{hide?"•••":fmt(cat.v)}</span>
                </div>
                <div style={{height:3,background:G.border,borderRadius:3,overflow:"hidden"}}>
                  <div style={{height:"100%",width:`${p}%`,background:cat.color,borderRadius:3,opacity:sel?1:.6,transition:"width .35s ease"}}/>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>}

    {/* ════ AGENDADOS ════════════════════════════════ */}
    {agendados.length>0&&<div style={{background:G.yellow+"12",border:`1px solid ${G.yellow}33`,borderRadius:24,padding:"16px",marginBottom:16}}>
      <div style={{display:"flex",alignItems:"center",gap:6,marginBottom:12}}>
        <Ic d={ICON.clock} size={12} color={G.yellow}/>
        <span style={{fontSize:11,fontWeight:700,letterSpacing:1.2,textTransform:"uppercase",color:G.yellow}}>Próximos</span>
      </div>
      {agendados.map(l=>{const isR=l.tipo==="Receita";return(
        <div key={l.id} style={{display:"flex",alignItems:"center",gap:12,padding:"8px 0",borderBottom:`1px solid ${G.yellow}18`}}>
          <div style={{width:30,height:30,borderRadius:10,background:(isR?G.green:G.red)+"22",display:"flex",alignItems:"center",justifyContent:"center",flexShrink:0}}>
            <Ic d={isR?ICON.arrow_up:ICON.arrow_down} size={14} color={isR?G.green:G.red}/>
          </div>
          <div style={{flex:1}}>
            <div style={{fontSize:13,fontWeight:500,color:G.text}}>{l.desc||l.cat}</div>
            <div style={{fontSize:10,color:G.muted}}>{fmtD(l.data)}</div>
          </div>
          <div style={{fontFamily:"'Fraunces',serif",fontSize:13,fontWeight:700,color:isR?G.green:G.red}}>{hv((isR?"+":"-")+fmt(l.valor))}</div>
        </div>
      );})}
    </div>}

    {/* ════ ÚLTIMOS LANÇAMENTOS ══════════════════════ */}
    <div style={{background:G.card,border:`1px solid ${G.border}`,borderRadius:24,padding:"18px 16px"}}>
      <div style={{fontSize:11,fontWeight:700,letterSpacing:1.2,textTransform:"uppercase",color:G.muted,marginBottom:14}}>Últimos lançamentos</div>
      {dm.length===0
        ?<div style={{textAlign:"center",color:G.muted,padding:"24px 0",fontSize:13}}>Nenhum lançamento neste mês</div>
        :[...dm].sort((a,b)=>b.data.localeCompare(a.data)).slice(0,8).map(l=><TxRow key={l.id} l={l} onDelete={onDelete}/>)
      }
    </div>

  </div>);
}
// ─── LANCS VIEW ───────────────────────────────────────────────────────────────
function LancsView({tipo,lancs,recorrentes,onDelete,onToggleRec,onDeleteRec,isPremium=false,onUpgrade}){
  const [mf,setMf]=useState(curMes());
  const [cf,setCf]=useState("");
  const [showCats,setShowCats]=useState(false);
  const isR=tipo==="Receita", ac=isR?G.green:G.red;
  const cats=isR?CATS_REC:CATS_DEP;

  const todos=lancs.filter(l=>l.tipo===tipo);
  const allMeses=[...new Set(todos.map(l=>getMes(l.data)))].sort().reverse();
  if(!allMeses.includes(curMes()))allMeses.unshift(curMes());
  const meses=isPremium?allMeses:allMeses.slice(0,3);

  let data=todos;
  if(mf) data=data.filter(l=>getMes(l.data)===mf);
  if(cf) data=data.filter(l=>l.cat===cf);
  data=[...data].sort((a,b)=>b.data.localeCompare(a.data));

  const mt=todos.filter(l=>getMes(l.data)===curMes()&&isRealizado(l.data,l.agendado)).reduce((s,l)=>s+l.valor,0);
  const at=todos.filter(l=>l.data.startsWith(new Date().getFullYear())).reduce((s,l)=>s+l.valor,0);
  const listaRec=recorrentes.filter(r=>r.tipo===tipo);
  const totalRec=listaRec.filter(r=>r.ativo).reduce((s,r)=>s+r.valor,0);
  const totalFiltro=data.reduce((s,l)=>s+l.valor,0);

  // cat breakdown for filtered month
  const catBreak=cats.map(cat=>({
    name:cat,
    v:data.filter(l=>l.cat===cat).reduce((s,l)=>s+l.valor,0),
    color:CAT_COLORS[cat]||G.muted,
  })).filter(c=>c.v>0).sort((a,b)=>b.v-a.v);

  return(<div style={{paddingBottom:24}}>

    {/* ── HERO BANNER ─────────────────────────────── */}
    <div style={{
      borderRadius:24,padding:"22px 20px 20px",marginBottom:16,
      position:"relative",overflow:"hidden",
      background:G.card2,
      border:`1px solid ${ac}33`,
      boxShadow:`0 8px 32px ${ac}15`,
    }}>
      <div style={{position:"absolute",top:-40,right:-40,width:180,height:180,borderRadius:"50%",background:`radial-gradient(circle,${ac}15,transparent 65%)`,pointerEvents:"none"}}/>
      <div style={{position:"absolute",bottom:-30,left:-20,width:130,height:130,borderRadius:"50%",background:`radial-gradient(circle,${ac}08,transparent 65%)`,pointerEvents:"none"}}/>

      <div style={{fontSize:10,fontWeight:700,letterSpacing:2,textTransform:"uppercase",color:G.muted,marginBottom:8}}>
        {isR?"Total de Receitas":"Total de Despesas"} · {mf?mesLblFull(mf):"Todos os meses"}
      </div>
      <div style={{fontFamily:"'Fraunces',serif",fontSize:38,fontWeight:700,letterSpacing:-1.5,lineHeight:1,color:ac,
        textShadow:`0 0 32px ${ac}33`,marginBottom:16}}>
        {(isR?"+":"-")}{fmt(totalFiltro)}
      </div>

      {/* 3 stats */}
      <div style={{display:"grid",gridTemplateColumns:"1fr 1fr 1fr",gap:8}}>
        {[
          {l:"Este mês",v:fmt(mt),c:ac,bg:`${ac}12`,b:`${ac}25`},
          {l:`Ano ${new Date().getFullYear()}`,v:fmt(at),c:G.blue,bg:`${G.blue}12`,b:`${G.blue}25`},
          {l:"Registros",v:String(todos.length),c:G.muted,bg:G.card,b:G.border},
        ].map((k,i)=>(
          <div key={i} style={{background:k.bg,border:`1px solid ${k.b}`,borderRadius:14,padding:"10px 10px 8px"}}>
            <div style={{fontSize:9,color:G.muted,marginBottom:3,fontWeight:600,letterSpacing:.8,textTransform:"uppercase"}}>{k.l}</div>
            <div style={{fontFamily:"'Fraunces',serif",fontSize:13,fontWeight:700,color:k.c,lineHeight:1.2}}>{k.v}</div>
          </div>
        ))}
      </div>
    </div>

    {/* ── RECORRENTES ─────────────────────────────── */}
    {listaRec.length>0&&<div style={{background:G.card,border:`1px solid ${G.border}`,borderRadius:20,marginBottom:16,overflow:"hidden"}}>
      <div style={{padding:"13px 16px",borderBottom:`1px solid ${G.border}`,display:"flex",alignItems:"center",gap:8}}>
        <div style={{width:6,height:6,borderRadius:"50%",background:G.accent}}/>
        <span style={{fontSize:11,fontWeight:700,letterSpacing:1,textTransform:"uppercase",color:G.accent}}>
          {isR?"Ganhos":"Custos"} recorrentes
        </span>
        <span style={{fontSize:12,fontFamily:"'Fraunces',serif",fontWeight:700,color:ac,marginLeft:"auto"}}>{fmt(totalRec)}<span style={{fontSize:10,color:G.muted,fontWeight:400}}>/mês</span></span>
      </div>
      <div style={{padding:"0 16px"}}>
        {listaRec.map(r=>(
          <div key={r.id} style={{display:"flex",alignItems:"center",gap:12,padding:"12px 0",borderBottom:`1px solid ${G.border}`}}>
            <div style={{width:36,height:36,borderRadius:11,flexShrink:0,
              background:r.ativo?(isR?G.greenL:G.redL):G.border,
              display:"flex",alignItems:"center",justifyContent:"center",fontSize:16}}>
              {CAT_EMOJI[r.cat]||"🔁"}
            </div>
            <div style={{flex:1,minWidth:0}}>
              <div style={{fontSize:13,fontWeight:600,color:r.ativo?G.text:G.muted,overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap"}}>{r.desc||r.cat}</div>
              <div style={{display:"flex",gap:6,marginTop:3,alignItems:"center"}}>
                <Tag color={CAT_COLORS[r.cat]||G.muted}>{r.cat}</Tag>
                <span style={{fontSize:10,color:G.muted}}>{r.dia?`dia ${r.dia}`:""}</span>
              </div>
            </div>
            <div style={{fontFamily:"'Fraunces',serif",fontSize:14,fontWeight:700,color:r.ativo?ac:G.muted,flexShrink:0}}>{fmt(r.valor)}</div>
            <button onClick={()=>onToggleRec(r.id)} className="press"
              style={{width:38,height:22,borderRadius:11,border:"none",cursor:"pointer",transition:"background .2s",flexShrink:0,
                background:r.ativo?ac:G.border,position:"relative"}}>
              <div style={{position:"absolute",top:3,width:16,height:16,borderRadius:"50%",background:"#fff",transition:"left .2s",
                left:r.ativo?19:3,boxShadow:"0 1px 3px rgba(0,0,0,.3)"}}/>
            </button>
            <button onClick={()=>onDeleteRec(r.id)} style={{background:"none",border:"none",color:G.muted,cursor:"pointer",fontSize:16,padding:4,opacity:.5}}>×</button>
          </div>
        ))}
      </div>
    </div>}

    {/* ── FILTROS ─────────────────────────────────── */}
    <div style={{marginBottom:12}}>
      {/* meses */}
      <div style={{display:"flex",gap:6,overflowX:"auto",scrollbarWidth:"none",paddingBottom:2,marginBottom:8}}>
        {["",  ...meses].map((m,i)=>{
          const lbl=m?(()=>{const [y,mm]=m.split("-");return MESES[parseInt(mm)-1]+" '"+y.slice(2);})():"Todos";
          const on=(mf===m)||(m===""&&mf==="");
          return(<button key={i} onClick={()=>setMf(m)} className="press"
            style={{padding:"6px 14px",borderRadius:20,border:`1px solid ${on?ac:G.border}`,
              background:on?ac+"18":"transparent",
              color:on?ac:G.muted,fontSize:12,fontWeight:on?700:400,cursor:"pointer",flexShrink:0,whiteSpace:"nowrap",transition:"all .2s"}}>
            {lbl}
          </button>);
        })}
      </div>
      {/* banner histórico limitado */}
      {/* banner histórico limitado */}
      {!isPremium&&<button onClick={()=>onUpgrade&&onUpgrade()} className="press"
        style={{display:"flex",alignItems:"center",gap:10,padding:"9px 14px",borderRadius:12,
          background:G.accent+"15",border:`1px solid ${G.accent}33`,marginBottom:8,cursor:"pointer",width:"100%",textAlign:"left"}}>
        <span style={{fontSize:16}}>✨</span>
        <div style={{flex:1}}>
          <span style={{fontSize:12,color:G.accent,fontWeight:600}}>Histórico limitado a 3 meses </span>
          <span style={{fontSize:11,color:G.muted}}>— Toque para ver planos</span>
        </div>
      </button>}
      {/* categoria */}
      <button onClick={()=>setShowCats(v=>!v)} className="press"
        style={{display:"inline-flex",alignItems:"center",gap:6,padding:"6px 14px",borderRadius:20,
          border:`1px solid ${cf?ac:G.border}`,background:cf?ac+"18":"transparent",
          color:cf?ac:G.muted,fontSize:12,cursor:"pointer",fontWeight:cf?700:400,transition:"all .2s"}}>
        {cf||"Categoria"} <span style={{fontSize:10}}>{showCats?"▲":"▼"}</span>
      </button>
      {showCats&&<div style={{display:"flex",gap:6,overflowX:"auto",scrollbarWidth:"none",paddingBottom:4,marginTop:6}}>
        <button onClick={()=>{setCf("");setShowCats(false);}} className="press"
          style={{padding:"6px 14px",borderRadius:20,border:`1px solid ${G.border}`,background:"transparent",color:G.muted,fontSize:12,cursor:"pointer",flexShrink:0}}>
          Todas
        </button>
        {cats.map(cat=>(
          <button key={cat} onClick={()=>{setCf(cf===cat?"":cat);setShowCats(false);}} className="press"
            style={{padding:"6px 14px",borderRadius:20,border:`1px solid ${cf===cat?ac:G.border}`,
              background:cf===cat?ac+"18":"transparent",
              color:cf===cat?ac:G.muted,fontSize:12,cursor:"pointer",flexShrink:0,whiteSpace:"nowrap",transition:"all .2s"}}>
            {CAT_EMOJI[cat]||""} {cat}
          </button>
        ))}
      </div>}
    </div>

    {/* ── BREAKDOWN CATEGORIAS (quando tem dados) ── */}
    {catBreak.length>1&&!cf&&<div style={{background:G.card,border:`1px solid ${G.border}`,borderRadius:20,padding:"14px 16px",marginBottom:16}}>
      <div style={{fontSize:10,fontWeight:700,letterSpacing:1.2,textTransform:"uppercase",color:G.muted,marginBottom:10}}>Por categoria</div>
      <div style={{display:"flex",flexDirection:"column",gap:7}}>
        {catBreak.slice(0,4).map(cat=>{
          const p=totalFiltro>0?cat.v/totalFiltro*100:0;
          return(<div key={cat.name}>
            <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:4}}>
              <div style={{display:"flex",alignItems:"center",gap:7}}>
                <span style={{fontSize:14}}>{CAT_EMOJI[cat.name]||"•"}</span>
                <span style={{fontSize:12,color:G.text}}>{cat.name}</span>
              </div>
              <div style={{display:"flex",alignItems:"center",gap:8}}>
                <span style={{fontSize:10,color:G.muted}}>{p.toFixed(0)}%</span>
                <span style={{fontFamily:"'Fraunces',serif",fontSize:12,fontWeight:700,color:cat.color}}>{fmt(cat.v)}</span>
              </div>
            </div>
            <div style={{height:4,background:G.border,borderRadius:4,overflow:"hidden"}}>
              <div style={{height:"100%",width:`${p}%`,background:cat.color,borderRadius:4,transition:"width .4s ease"}}/>
            </div>
          </div>);
        })}
      </div>
    </div>}

    {/* ── LISTA LANÇAMENTOS ────────────────────────── */}
    <div style={{background:G.card,border:`1px solid ${G.border}`,borderRadius:20,overflow:"hidden"}}>
      <div style={{display:"flex",alignItems:"center",justifyContent:"space-between",padding:"13px 16px",borderBottom:`1px solid ${G.border}`}}>
        <span style={{fontSize:11,fontWeight:700,letterSpacing:1,textTransform:"uppercase",color:G.muted}}>
          {data.length} registro{data.length!==1?"s":""}
        </span>
        <span style={{fontFamily:"'Fraunces',serif",fontSize:15,fontWeight:700,color:ac}}>
          {isR?"+":"-"}{fmt(totalFiltro)}
        </span>
      </div>
      {data.length===0
        ?<div style={{textAlign:"center",padding:"48px 20px",color:G.muted}}>
          <div style={{fontSize:40,marginBottom:10}}>{isR?"💸":"🎉"}</div>
          <div style={{fontSize:14}}>{isR?"Nenhuma receita aqui":"Nenhuma despesa no período"}</div>
        </div>
        :<div style={{padding:"0 16px"}}>{data.map(l=><TxRow key={l.id} l={l} onDelete={onDelete} full/>)}</div>
      }
    </div>

  </div>);
}
// ─── PERFIL VIEW ─────────────────────────────────────────────────────────────
function CarreiraView({uid,user,onPhotoSave,lancs=[],isPremium=false,onUpgrade}){
  const [secao,setSecao]=useState(null); // which card is expanded
  const [saving,setSaving]=useState(false);

  // ── perfil ──────────────────────────────────────────
  const [perfil,setPerfil]=useState(null);

  const [fp,setFp]=useState({
    nome:"",bio:"",frase:"",fotoUrl:"",humor:"",
    instagram:"",site:"",cidade:"",aniversario:"",
  });

  // ── humor histórico ──────────────────────────────────
  const [humores,setHumores]=useState([]); // {data,humor,energia,nota}
  const [addingHumor,setAddingHumor]=useState(false);
  const [novoHumor,setNovoHumor]=useState({humor:"😊",energia:3,nota:""});

  // ── rotinas + streaks ────────────────────────────────
  const [rotinas,setRotinas]=useState([]);
  const [novaRotina,setNovaRotina]=useState("");
  const [addingRotina,setAddingRotina]=useState(false);
  const [roRenaming,setRoRenaming]=useState(null);
  const [roRenameVal,setRoRenameVal]=useState("");

  // ── metas pessoais ───────────────────────────────────
  const [metas,setMetas]=useState([]);
  const [addingMeta,setAddingMeta]=useState(false);
  const [novaMeta,setNovaMeta]=useState({titulo:"",emoji:"🎯",prazo:"",progresso:0,total:100});

  // ── load ─────────────────────────────────────────────
  useEffect(()=>{
    if(!uid)return;
    getDoc(doc(db,"users",uid,"carreira","perfil")).then(s=>{
      if(s.exists()){const d=s.data();setPerfil(d);setFp(f=>({...f,...d}));}
    }).catch(()=>{});
    getDocs(collection(db,"users",uid,"rotinas")).then(s=>{
      setRotinas(s.docs.map(d=>({id:d.id,...d.data()})).sort((a,b)=>(a.ordem||0)-(b.ordem||0)));
    }).catch(()=>{});
    getDocs(collection(db,"users",uid,"metas_pessoais")).then(s=>{
      setMetas(s.docs.map(d=>({id:d.id,...d.data()})));
    }).catch(()=>{});
    getDocs(collection(db,"users",uid,"humores")).then(s=>{
      setHumores(s.docs.map(d=>({id:d.id,...d.data()})).sort((a,b)=>b.data.localeCompare(a.data)));
    }).catch(()=>{});
  },[uid]);

  // ── save perfil ──────────────────────────────────────
  async function salvarPerfil(){
    setSaving(true);
    let fotoFinal=fp.fotoUrl||"";
    if(fotoFinal.startsWith("data:image")&&fotoFinal.length>200000){
      try{
        fotoFinal=await new Promise((res,rej)=>{
          const img=new Image();
          img.onload=()=>{
            const canvas=document.createElement("canvas");
            const MAX=400;let w=img.width,h=img.height;
            if(w>h){if(w>MAX){h=Math.round(h*MAX/w);w=MAX;}}
            else{if(h>MAX){w=Math.round(w*MAX/h);h=MAX;}}
            canvas.width=w;canvas.height=h;
            canvas.getContext("2d").drawImage(img,0,0,w,h);
            res(canvas.toDataURL("image/jpeg",0.7));
          };
          img.onerror=rej;img.src=fotoFinal;
        });
      }catch(_){fotoFinal="";}
    }
    const v={...fp,fotoUrl:fotoFinal,updatedAt:today()};
    try{
      await setDoc(doc(db,"users",uid,"carreira","perfil"),v);
      setPerfil(v);setEditando(false);
      if(v.fotoUrl&&onPhotoSave)onPhotoSave(v.fotoUrl);
    }catch(e){alert("Erro: "+e.message);}
    setSaving(false);
  }

  // ── humor CRUD ───────────────────────────────────────
  async function salvarHumor(){
    const v={...novoHumor,data:today(),hora:new Date().toLocaleTimeString("pt-BR",{hour:"2-digit",minute:"2-digit"})};
    try{
      const ref=await addDoc(collection(db,"users",uid,"humores"),v);
      setHumores(p=>[{id:ref.id,...v},...p]);
      setNovoHumor({humor:"😊",energia:3,nota:""});setAddingHumor(false);
    }catch(e){console.error(e);}
  }
  async function deleteHumor(id){
    setHumores(p=>p.filter(x=>x.id!==id));
    try{await deleteDoc(doc(db,"users",uid,"humores",id));}catch(e){}
  }

  // ── rotinas CRUD ─────────────────────────────────────
  async function addRotina(){
    if(!novaRotina.trim())return;
    const r={texto:novaRotina.trim(),feita:false,ordem:rotinas.length,streak:0,ultimaFeita:"",criadoEm:today()};
    try{
      const ref=await addDoc(collection(db,"users",uid,"rotinas"),r);
      setRotinas(p=>[...p,{id:ref.id,...r}]);
      setNovaRotina("");setAddingRotina(false);
    }catch(e){console.error(e);}
  }
  async function toggleRotina(id){
    const r=rotinas.find(r=>r.id===id);if(!r)return;
    const nova=!r.feita;
    // streak logic
    const ultimaFeita=r.ultimaFeita||"";
    const yesterday=new Date(Date.now()-86400000).toISOString().slice(0,10);
    let streak=r.streak||0;
    if(nova){
      if(ultimaFeita===yesterday||ultimaFeita===today()) streak=streak+(ultimaFeita===today()?0:1);
      else streak=1;
    }
    const up={feita:nova,ultimaFeita:nova?today():ultimaFeita,streak};
    setRotinas(p=>p.map(x=>x.id===id?{...x,...up}:x));
    try{await updateDoc(doc(db,"users",uid,"rotinas",id),up);}catch(e){}
  }
  async function deleteRotina(id){
    setRotinas(p=>p.filter(x=>x.id!==id));
    try{await deleteDoc(doc(db,"users",uid,"rotinas",id));}catch(e){}
  }
  async function renameRotina(id){
    if(!roRenameVal.trim())return;
    setRotinas(p=>p.map(x=>x.id===id?{...x,texto:roRenameVal.trim()}:x));
    setRoRenaming(null);
    try{await updateDoc(doc(db,"users",uid,"rotinas",id),{texto:roRenameVal.trim()});}catch(e){}
  }
  async function resetRotinas(){
    const updated=rotinas.map(r=>({...r,feita:false}));
    setRotinas(updated);
    try{await Promise.all(updated.map(r=>updateDoc(doc(db,"users",uid,"rotinas",r.id),{feita:false})));}catch(e){}
  }

  // ── metas CRUD ───────────────────────────────────────
  async function addMeta(){
    if(!novaMeta.titulo.trim())return;
    const v={...novaMeta,progresso:0,criadoEm:today()};
    try{
      const ref=await addDoc(collection(db,"users",uid,"metas_pessoais"),v);
      setMetas(p=>[...p,{id:ref.id,...v}]);
      setNovaMeta({titulo:"",emoji:"🎯",prazo:"",progresso:0,total:100});setAddingMeta(false);
    }catch(e){console.error(e);}
  }
  async function updateMetaProgress(id,delta){
    const m=metas.find(x=>x.id===id);if(!m)return;
    const np=Math.max(0,Math.min(m.total||100,(m.progresso||0)+delta));
    setMetas(p=>p.map(x=>x.id===id?{...x,progresso:np}:x));
    try{await updateDoc(doc(db,"users",uid,"metas_pessoais",id),{progresso:np});}catch(e){}
  }
  async function deleteMeta(id){
    setMetas(p=>p.filter(x=>x.id!==id));
    try{await deleteDoc(doc(db,"users",uid,"metas_pessoais",id));}catch(e){}
  }

  // ── stats financeiros ────────────────────────────────
  const anoAtual=new Date().getFullYear();
  const lancsAno=lancs.filter(l=>l.data.startsWith(anoAtual)&&isRealizado(l.data,l.agendado));
  const recAno=lancsAno.filter(l=>l.tipo==="Receita").reduce((s,l)=>s+l.valor,0);
  const depAno=lancsAno.filter(l=>l.tipo==="Despesa").reduce((s,l)=>s+l.valor,0);
  const saldoAno=recAno-depAno;
  const mesMaisGasto=(()=>{
    const por={};
    lancsAno.filter(l=>l.tipo==="Despesa").forEach(l=>{const m=getMes(l.data);por[m]=(por[m]||0)+l.valor;});
    const sorted=Object.entries(por).sort((a,b)=>b[1]-a[1]);
    if(!sorted.length)return null;
    const [m,v]=sorted[0];
    const [,mm]=m.split("-");
    return{mes:MESES[parseInt(mm)-1],v};
  })();
  const catMaisGasta=(()=>{
    const por={};
    lancsAno.filter(l=>l.tipo==="Despesa").forEach(l=>{por[l.cat]=(por[l.cat]||0)+l.valor;});
    const sorted=Object.entries(por).sort((a,b)=>b[1]-a[1]);
    return sorted[0]?{cat:sorted[0][0],v:sorted[0][1]}:null;
  })();
  const taxaPoupanca=recAno>0?Math.round(saldoAno/recAno*100):0;

  // ── helpers ──────────────────────────────────────────
  const HUMORES_LIST=["😄","😊","😐","😔","😤","😴","🤩","😰","🥰","😎"];
  const ENERGIA_LABELS=["","Baixa","Razoável","Boa","Alta","Máxima"];
  const feitas=rotinas.filter(r=>r.feita).length;
  const totalRot=rotinas.length;
  const progRot=totalRot>0?feitas/totalRot:0;
  const melhorStreak=rotinas.length>0?Math.max(...rotinas.map(r=>r.streak||0)):0;
  const ultimoHumor=humores[0];

  // ── expandable card helper ───────────────────────────
  function Card({id,icon,title,badge,children,headerExtra}){
    const open=secao===id;
    return(
      <div style={{background:G.card,border:`1px solid ${open?G.accent:G.border}`,borderRadius:20,overflow:"hidden",transition:"border-color .2s",marginBottom:12}}>
        <div onClick={()=>setSecao(open?null:id)} style={{display:"flex",alignItems:"center",gap:12,padding:"16px",cursor:"pointer"}}>
          <div style={{width:36,height:36,borderRadius:12,background:G.accentL,display:"flex",alignItems:"center",justifyContent:"center",fontSize:18,flexShrink:0}}>{icon}</div>
          <div style={{flex:1,minWidth:0}}>
            <div style={{fontSize:14,fontWeight:700,color:G.text}}>{title}</div>
            {badge&&<div style={{fontSize:11,color:G.muted,marginTop:1}}>{badge}</div>}
          </div>
          {headerExtra&&<div onClick={e=>e.stopPropagation()}>{headerExtra}</div>}
          <div style={{fontSize:12,color:G.muted,transform:open?"rotate(180deg)":"none",transition:"transform .2s",flexShrink:0}}>▼</div>
        </div>
        {open&&<div style={{borderTop:`1px solid ${G.border}`,padding:"16px"}}>{children}</div>}
      </div>
    );
  }

  return(<div style={{paddingBottom:32}}>

    {/* ══ HERO IDENTIDADE ══════════════════════════════ */}
    <div style={{
      borderRadius:24,padding:"24px 20px",marginBottom:16,
      background:"linear-gradient(145deg,#0e0c1e 0%,#160f30 45%,#0a1628 100%)",
      position:"relative",overflow:"hidden",
      boxShadow:"0 20px 48px rgba(0,0,0,.4)",
    }}>
      <div style={{position:"absolute",top:-50,right:-40,width:200,height:200,borderRadius:"50%",background:"radial-gradient(circle,rgba(124,106,247,.2),transparent 65%)",pointerEvents:"none"}}/>
      <div style={{position:"absolute",bottom:-40,left:-20,width:150,height:150,borderRadius:"50%",background:"radial-gradient(circle,rgba(46,204,142,.12),transparent 65%)",pointerEvents:"none"}}/>

      {!editando?(
        <div>
          <div style={{display:"flex",alignItems:"flex-start",gap:14,marginBottom:14}}>
            {/* avatar */}
            <div style={{width:76,height:76,borderRadius:"50%",flexShrink:0,border:"2px solid rgba(124,106,247,.5)",overflow:"hidden",background:"rgba(255,255,255,.08)",display:"flex",alignItems:"center",justifyContent:"center",position:"relative"}}>
              {perfil?.fotoUrl
                ?<img src={perfil.fotoUrl} style={{width:"100%",height:"100%",objectFit:"cover"}} alt=""/>
                :<Ic d={ICON.user} size={30} color="rgba(255,255,255,.4)"/>
              }
              {ultimoHumor&&<div style={{position:"absolute",bottom:-2,right:-2,fontSize:18,lineHeight:1}}>{ultimoHumor.humor}</div>}
            </div>
            <div style={{flex:1,minWidth:0,paddingTop:4}}>
              <div style={{fontFamily:"'Fraunces',serif",fontSize:24,fontWeight:700,color:"#fff",lineHeight:1.1,marginBottom:4}}>
                {perfil?.nome||user?.displayName||"Seu nome"}
              </div>
              {perfil?.cidade&&<div style={{fontSize:12,color:"rgba(255,255,255,.45)",marginBottom:4}}>📍 {perfil.cidade}</div>}
              {perfil?.frase&&<div style={{fontSize:12,color:"rgba(255,255,255,.55)",fontStyle:"italic",lineHeight:1.5}}>"{perfil.frase}"</div>}
            </div>
            <button onClick={()=>setEditando(true)} style={{width:34,height:34,borderRadius:10,border:"1px solid rgba(255,255,255,.15)",background:"rgba(255,255,255,.08)",cursor:"pointer",display:"flex",alignItems:"center",justifyContent:"center",flexShrink:0}}>
              <Ic d={ICON.edit} size={15} color="rgba(255,255,255,.6)"/>
            </button>
          </div>

          {/* bio */}
          {perfil?.bio&&<p style={{fontSize:13,color:"rgba(255,255,255,.55)",lineHeight:1.6,margin:"0 0 14px",borderLeft:"2px solid rgba(124,106,247,.5)",paddingLeft:10}}>{perfil.bio}</p>}

          {/* links + aniversário */}
          <div style={{display:"flex",gap:8,flexWrap:"wrap"}}>
            {perfil?.aniversario&&<div style={{display:"flex",alignItems:"center",gap:5,padding:"5px 10px",borderRadius:20,background:"rgba(255,255,255,.07)",border:"1px solid rgba(255,255,255,.1)",fontSize:11,color:"rgba(255,255,255,.55)"}}>
              🎂 {perfil.aniversario}
            </div>}
            {perfil?.instagram&&<a href={`https://instagram.com/${perfil.instagram.replace("@","")}`} target="_blank" rel="noreferrer"
              style={{display:"flex",alignItems:"center",gap:5,padding:"5px 10px",borderRadius:20,background:"rgba(255,255,255,.07)",border:"1px solid rgba(255,255,255,.1)",textDecoration:"none",fontSize:11,color:"rgba(255,255,255,.55)"}}>
              📸 @{perfil.instagram.replace("@","")}
            </a>}
            {perfil?.site&&<a href={perfil.site} target="_blank" rel="noreferrer"
              style={{display:"flex",alignItems:"center",gap:5,padding:"5px 10px",borderRadius:20,background:"rgba(255,255,255,.07)",border:"1px solid rgba(255,255,255,.1)",textDecoration:"none",fontSize:11,color:"rgba(255,255,255,.55)"}}>
              🌐 Site
            </a>}
          </div>
        </div>
      ):(
        /* ── FORM EDITAR ─────────────────────────────── */
        <div style={{display:"flex",flexDirection:"column",gap:12}}>
          <div style={{fontFamily:"'Fraunces',serif",fontSize:16,fontWeight:700,color:"#fff",marginBottom:4}}>Editar perfil</div>

          {/* foto */}
          <div style={{display:"flex",alignItems:"center",gap:12}}>
            <div style={{width:60,height:60,borderRadius:"50%",overflow:"hidden",background:"rgba(255,255,255,.08)",flexShrink:0,border:"2px solid rgba(124,106,247,.4)",display:"flex",alignItems:"center",justifyContent:"center"}}>
              {fp.fotoUrl?<img src={fp.fotoUrl} style={{width:"100%",height:"100%",objectFit:"cover"}} alt=""/>:<Ic d={ICON.user} size={22} color="rgba(255,255,255,.4)"/>}
            </div>
            <div style={{flex:1}}>
              <label style={{display:"flex",alignItems:"center",gap:6,cursor:"pointer",fontSize:12,color:"rgba(124,106,247,.9)",fontWeight:600}}>
                <Ic d={ICON.camera} size={13} color="rgba(124,106,247,.9)"/> Câmera / Galeria
                <input type="file" accept="image/*" style={{display:"none"}}
                  onChange={e=>{const f=e.target.files?.[0];if(!f)return;const r=new FileReader();r.onload=x=>setFp(p=>({...p,fotoUrl:x.target.result}));r.readAsDataURL(f);}}/>
              </label>
              <input value={fp.fotoUrl||""} onChange={e=>setFp(f=>({...f,fotoUrl:e.target.value}))}
                placeholder="ou cole uma URL..." className="inp" style={{width:"100%",fontSize:12,marginTop:6}}/>
            </div>
          </div>

          {/* campos */}
          {[
            {l:"Nome",k:"nome",ph:"Seu nome completo"},
            {l:"Cidade",k:"cidade",ph:"São Paulo, SP"},
            {l:"Aniversário",k:"aniversario",ph:"DD/MM"},
            {l:"Instagram",k:"instagram",ph:"@usuario"},
            {l:"Site",k:"site",ph:"https://..."},
            {l:"Frase pessoal",k:"frase",ph:"Uma frase que te define..."},
          ].map(({l,k,ph})=>(
            <div key={k}>
              <div style={{fontSize:11,color:"rgba(255,255,255,.4)",marginBottom:4}}>{l}</div>
              <input value={fp[k]||""} onChange={e=>setFp(f=>({...f,[k]:e.target.value}))} placeholder={ph} className="inp" style={{width:"100%"}}/>
            </div>
          ))}

          {/* bio */}
          <div>
            <div style={{fontSize:11,color:"rgba(255,255,255,.4)",marginBottom:4}}>Bio</div>
            <textarea value={fp.bio||""} onChange={e=>setFp(f=>({...f,bio:e.target.value}))} placeholder="Conte um pouco sobre você..." rows={3}
              className="inp" style={{width:"100%",resize:"vertical",lineHeight:1.5}}/>
          </div>

          <div style={{display:"flex",gap:8,marginTop:4}}>
            <button onClick={salvarPerfil} disabled={saving} className="press"
              style={{flex:1,padding:"12px",borderRadius:12,border:"none",background:G.accent,color:"#fff",fontSize:14,fontWeight:700,cursor:"pointer"}}>
              {saving?"Salvando...":"Salvar"}
            </button>
            <button onClick={()=>setEditando(false)} className="press"
              style={{padding:"12px 16px",borderRadius:12,border:"1px solid rgba(255,255,255,.15)",background:"rgba(255,255,255,.06)",color:"rgba(255,255,255,.5)",cursor:"pointer"}}>
              Cancelar
            </button>
          </div>
        </div>
      )}
    </div>

    {/* ══ STATS FINANCEIROS ════════════════════════════ */}
    <Card id="stats" icon="📊" title="Resumo financeiro" badge={`${anoAtual} · ${fmt(saldoAno)} economizados`}>
      <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:10,marginBottom:14}}>
        {[
          {l:"Receitas no ano",v:fmt(recAno),c:G.green,e:"💰"},
          {l:"Despesas no ano",v:fmt(depAno),c:G.red,e:"💸"},
          {l:"Taxa de poupança",v:taxaPoupanca+"%",c:taxaPoupanca>=20?G.green:taxaPoupanca>=10?G.yellow:G.red,e:"🏦"},
          {l:"Lançamentos",v:String(lancsAno.length),c:G.accent,e:"📋"},
        ].map((s,i)=>(
          <div key={i} style={{background:G.card2,borderRadius:14,padding:"12px 14px",border:`1px solid ${G.border}`}}>
            <div style={{fontSize:16,marginBottom:4}}>{s.e}</div>
            <div style={{fontFamily:"'Fraunces',serif",fontSize:16,fontWeight:700,color:s.c,lineHeight:1}}>{s.v}</div>
            <div style={{fontSize:10,color:G.muted,marginTop:3}}>{s.l}</div>
          </div>
        ))}
      </div>
      {/* barra poupança */}
      <div style={{marginBottom:12}}>
        <div style={{display:"flex",justifyContent:"space-between",marginBottom:5}}>
          <span style={{fontSize:11,color:G.muted}}>Meta de poupança (20%)</span>
          <span style={{fontSize:11,fontWeight:700,color:taxaPoupanca>=20?G.green:G.yellow}}>{taxaPoupanca}%</span>
        </div>
        <div style={{height:6,background:G.border,borderRadius:6,overflow:"hidden"}}>
          <div style={{height:"100%",width:`${Math.min(taxaPoupanca/20*100,100)}%`,background:taxaPoupanca>=20?G.green:G.yellow,borderRadius:6,transition:"width .4s"}}/>
        </div>
      </div>
      <div style={{display:"flex",gap:8}}>
        {mesMaisGasto&&<div style={{flex:1,background:G.card2,borderRadius:12,padding:"10px 12px",border:`1px solid ${G.border}`}}>
          <div style={{fontSize:9,color:G.muted,fontWeight:700,letterSpacing:1,textTransform:"uppercase",marginBottom:4}}>Mês com mais gastos</div>
          <div style={{fontSize:13,fontWeight:700,color:G.red}}>{mesMaisGasto.mes}</div>
          <div style={{fontSize:11,color:G.muted}}>{fmt(mesMaisGasto.v)}</div>
        </div>}
        {catMaisGasta&&<div style={{flex:1,background:G.card2,borderRadius:12,padding:"10px 12px",border:`1px solid ${G.border}`}}>
          <div style={{fontSize:9,color:G.muted,fontWeight:700,letterSpacing:1,textTransform:"uppercase",marginBottom:4}}>Categoria top</div>
          <div style={{fontSize:13,fontWeight:700,color:CAT_COLORS[catMaisGasta.cat]||G.accent}}>{catMaisGasta.cat}</div>
          <div style={{fontSize:11,color:G.muted}}>{fmt(catMaisGasta.v)}</div>
        </div>}
      </div>
    </Card>

    {/* ══ HUMOR & ENERGIA ══════════════════════════════ */}
    <Card id="humor" icon="🧠" title="Humor & energia"
      badge={ultimoHumor?`Último registro: ${ultimoHumor.humor} · ${ultimoHumor.data}`:"Nenhum registro ainda"}
      headerExtra={
        <button onClick={()=>setAddingHumor(true)} className="press"
          style={{width:30,height:30,borderRadius:9,border:"none",background:G.accent,color:"#fff",cursor:"pointer",display:"flex",alignItems:"center",justifyContent:"center"}}>
          <Ic d={ICON.plus} size={14}/>
        </button>
      }>

      {/* add humor */}
      {addingHumor&&<div style={{background:G.card2,borderRadius:14,padding:"14px",marginBottom:14,border:`1px solid ${G.border}`}}>
        <div style={{fontSize:12,fontWeight:700,color:G.text,marginBottom:10}}>Como você está agora?</div>
        <div style={{display:"flex",gap:8,flexWrap:"wrap",marginBottom:12}}>
          {HUMORES_LIST.map(h=>(
            <button key={h} onClick={()=>setNovoHumor(m=>({...m,humor:h}))}
              style={{fontSize:22,padding:"6px 8px",borderRadius:10,border:`2px solid ${novoHumor.humor===h?G.accent:"transparent"}`,background:novoHumor.humor===h?G.accentL:"transparent",cursor:"pointer",transition:"all .15s"}}>
              {h}
            </button>
          ))}
        </div>
        <div style={{marginBottom:10}}>
          <div style={{fontSize:11,color:G.muted,marginBottom:6}}>Energia: <span style={{fontWeight:700,color:G.accent}}>{ENERGIA_LABELS[novoHumor.energia]}</span></div>
          <input type="range" min={1} max={5} value={novoHumor.energia} onChange={e=>setNovoHumor(m=>({...m,energia:parseInt(e.target.value)}))}
            style={{width:"100%",accentColor:G.accent}}/>
          <div style={{display:"flex",justifyContent:"space-between",fontSize:9,color:G.muted,marginTop:2}}>
            <span>Baixa</span><span>Máxima</span>
          </div>
        </div>
        <input value={novoHumor.nota} onChange={e=>setNovoHumor(m=>({...m,nota:e.target.value}))}
          placeholder="Nota rápida (opcional)..." className="inp" style={{width:"100%",marginBottom:10,fontSize:13}}/>
        <div style={{display:"flex",gap:8}}>
          <button onClick={salvarHumor} className="press" style={{flex:1,padding:"10px",borderRadius:10,border:"none",background:G.accent,color:"#fff",fontSize:13,fontWeight:700,cursor:"pointer"}}>Registrar</button>
          <button onClick={()=>setAddingHumor(false)} className="press" style={{padding:"10px 14px",borderRadius:10,border:`1px solid ${G.border}`,background:"none",color:G.muted,cursor:"pointer"}}>✕</button>
        </div>
      </div>}

      {/* histórico */}
      {humores.length===0&&!addingHumor&&<div style={{textAlign:"center",padding:"20px 0",color:G.muted,fontSize:13}}>
        <div style={{fontSize:28,marginBottom:6}}>🧠</div>Nenhum registro ainda
      </div>}

      {/* últimos 7 dias como barra visual */}
      {humores.length>0&&(()=>{
        const dias=Array.from({length:7},(_,i)=>{
          const d=new Date(Date.now()-i*86400000).toISOString().slice(0,10);
          const h=humores.find(x=>x.data===d);
          return{d,h};
        }).reverse();
        return(
          <div style={{marginBottom:14}}>
            <div style={{fontSize:11,fontWeight:700,color:G.muted,letterSpacing:1,textTransform:"uppercase",marginBottom:8}}>Últimos 7 dias</div>
            <div style={{display:"flex",gap:4,alignItems:"flex-end",height:56}}>
              {dias.map(({d,h},i)=>{
                const energia=h?h.energia:0;
                const barH=energia?(energia/5)*44:4;
                const isToday=d===today();
                return(
                  <div key={i} style={{flex:1,display:"flex",flexDirection:"column",alignItems:"center",gap:3}}>
                    <div style={{fontSize:11,lineHeight:1}}>{h?h.humor:"·"}</div>
                    <div style={{width:"100%",height:barH,borderRadius:"4px 4px 0 0",
                      background:energia?`linear-gradient(180deg,${G.accent},${G.accent}66)`:G.border,
                      border:isToday?`1px solid ${G.accent}`:"none",transition:"height .3s"}}/>
                    <div style={{fontSize:8,color:isToday?G.accent:G.muted,fontWeight:isToday?700:400}}>
                      {new Date(d+"T12:00:00").toLocaleDateString("pt-BR",{weekday:"narrow"})}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        );
      })()}

      {/* lista registros */}
      <div style={{display:"flex",flexDirection:"column",gap:6,maxHeight:220,overflowY:"auto"}}>
        {humores.slice(0,10).map(h=>(
          <div key={h.id} style={{display:"flex",alignItems:"center",gap:10,padding:"10px 12px",background:G.card2,borderRadius:12,border:`1px solid ${G.border}`}}>
            <div style={{fontSize:22,flexShrink:0}}>{h.humor}</div>
            <div style={{flex:1,minWidth:0}}>
              <div style={{display:"flex",alignItems:"center",gap:6}}>
                <span style={{fontSize:12,fontWeight:600,color:G.text}}>Energia {ENERGIA_LABELS[h.energia]}</span>
                <div style={{display:"flex",gap:2}}>
                  {Array.from({length:5},(_,i)=><div key={i} style={{width:6,height:6,borderRadius:"50%",background:i<h.energia?G.accent:G.border}}/>)}
                </div>
              </div>
              {h.nota&&<div style={{fontSize:11,color:G.muted,marginTop:2,overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap"}}>{h.nota}</div>}
              <div style={{fontSize:10,color:G.muted,marginTop:2}}>{fmtD(h.data)} {h.hora&&`· ${h.hora}`}</div>
            </div>
            <button onClick={()=>deleteHumor(h.id)} style={{background:"none",border:"none",color:G.muted,cursor:"pointer",opacity:.5,fontSize:16}}>×</button>
          </div>
        ))}
      </div>
    </Card>

    {/* ══ ROTINAS + STREAKS ════════════════════════════ */}
    <Card id="rotinas" icon="✅" title="Rotinas do dia"
      badge={totalRot>0?`${feitas}/${totalRot} feitas · 🔥 maior streak: ${melhorStreak} dias`:"Nenhuma rotina ainda"}
      headerExtra={
        <button onClick={()=>setAddingRotina(true)} className="press"
          style={{width:30,height:30,borderRadius:9,border:"none",background:G.accent,color:"#fff",cursor:"pointer",display:"flex",alignItems:"center",justifyContent:"center"}}>
          <Ic d={ICON.plus} size={14}/>
        </button>
      }>

      {/* barra progresso */}
      {totalRot>0&&<div style={{marginBottom:14}}>
        <div style={{height:6,background:G.border,borderRadius:6,overflow:"hidden"}}>
          <div style={{height:"100%",width:`${progRot*100}%`,background:`linear-gradient(90deg,${G.accent},${G.green})`,borderRadius:6,transition:"width .4s"}}/>
        </div>
        {progRot===1&&<div style={{fontSize:12,color:G.green,marginTop:6,textAlign:"center",fontWeight:700}}>🎉 Todas concluídas hoje!</div>}
      </div>}

      {rotinas.length===0&&!addingRotina&&<div style={{textAlign:"center",padding:"20px 0",color:G.muted,fontSize:13}}>
        <div style={{fontSize:28,marginBottom:6}}>✅</div>Nenhuma rotina ainda
      </div>}

      <div style={{display:"flex",flexDirection:"column",gap:6,marginBottom:addingRotina?12:0}}>
        {rotinas.map(r=>(
          <div key={r.id} style={{display:"flex",alignItems:"center",gap:10,padding:"10px 12px",borderRadius:12,
            background:r.feita?G.green+"0a":"transparent",
            border:`1px solid ${r.feita?G.green+"33":G.border}`,transition:"all .2s"}}>
            <button onClick={()=>toggleRotina(r.id)} className="press"
              style={{width:22,height:22,borderRadius:6,border:`2px solid ${r.feita?G.green:G.border}`,
                background:r.feita?G.green:"transparent",cursor:"pointer",display:"flex",alignItems:"center",justifyContent:"center",flexShrink:0,transition:"all .2s"}}>
              {r.feita&&<Ic d={ICON.check} size={12} color="#fff"/>}
            </button>
            {roRenaming===r.id
              ?<input autoFocus value={roRenameVal} onChange={e=>setRoRenameVal(e.target.value)}
                  onKeyDown={e=>{if(e.key==="Enter")renameRotina(r.id);if(e.key==="Escape")setRoRenaming(null);}}
                  onBlur={()=>renameRotina(r.id)} className="inp" style={{flex:1,fontSize:13,padding:"2px 8px"}}/>
              :<span onClick={()=>{setRoRenaming(r.id);setRoRenameVal(r.texto);}}
                  style={{flex:1,fontSize:13,color:r.feita?G.muted:G.text,textDecoration:r.feita?"line-through":"none",cursor:"text",transition:"all .2s"}}>
                {r.texto}
              </span>
            }
            {/* streak badge */}
            {(r.streak||0)>0&&<div style={{display:"flex",alignItems:"center",gap:3,padding:"2px 8px",borderRadius:20,
              background:r.streak>=7?G.yellow+"20":G.accent+"15",border:`1px solid ${r.streak>=7?G.yellow:G.accent}33`,flexShrink:0}}>
              <span style={{fontSize:10}}>🔥</span>
              <span style={{fontSize:10,fontWeight:700,color:r.streak>=7?G.yellow:G.accent}}>{r.streak}d</span>
            </div>}
            <button onClick={()=>deleteRotina(r.id)} className="press"
              style={{width:22,height:22,borderRadius:6,border:"none",background:"none",color:G.muted,cursor:"pointer",display:"flex",alignItems:"center",justifyContent:"center",flexShrink:0,opacity:.5}}>
              <Ic d={ICON.x} size={11}/>
            </button>
          </div>
        ))}
      </div>

      {addingRotina&&<div style={{display:"flex",gap:8,marginBottom:8}}>
        <input autoFocus value={novaRotina} onChange={e=>setNovaRotina(e.target.value)}
          onKeyDown={e=>{if(e.key==="Enter")addRotina();if(e.key==="Escape"){setAddingRotina(false);setNovaRotina("");}}}
          placeholder="Ex: Meditar 10min, Beber água..." className="inp" style={{flex:1,fontSize:13}}/>
        <button onClick={addRotina} className="press" style={{padding:"8px 14px",borderRadius:10,border:"none",background:G.accent,color:"#fff",fontSize:13,cursor:"pointer",fontWeight:700}}>+</button>
        <button onClick={()=>{setAddingRotina(false);setNovaRotina("");}} className="press" style={{padding:"8px",borderRadius:10,border:`1px solid ${G.border}`,background:"none",color:G.muted,cursor:"pointer"}}>✕</button>
      </div>}

      {totalRot>0&&feitas>0&&<button onClick={resetRotinas} className="press"
        style={{width:"100%",padding:"8px",borderRadius:10,border:`1px solid ${G.border}`,background:"none",fontSize:12,color:G.muted,cursor:"pointer",marginTop:4}}>
        Resetar dia
      </button>}
    </Card>

    {/* ══ METAS PESSOAIS ═══════════════════════════════ */}
    <Card id="metas" icon="🎯" title="Metas pessoais"
      badge={metas.length>0?`${metas.filter(m=>(m.progresso||0)>=(m.total||100)).length}/${metas.length} concluídas`:"Nenhuma meta ainda"}
      headerExtra={
        <button onClick={()=>setAddingMeta(true)} className="press"
          style={{width:30,height:30,borderRadius:9,border:"none",background:G.accent,color:"#fff",cursor:"pointer",display:"flex",alignItems:"center",justifyContent:"center"}}>
          <Ic d={ICON.plus} size={14}/>
        </button>
      }>

      {metas.length===0&&!addingMeta&&<div style={{textAlign:"center",padding:"20px 0",color:G.muted,fontSize:13}}>
        <div style={{fontSize:28,marginBottom:6}}>🎯</div>Nenhuma meta ainda
      </div>}

      <div style={{display:"flex",flexDirection:"column",gap:10,marginBottom:addingMeta?12:0}}>
        {metas.map(m=>{
          const p=Math.min((m.progresso||0)/(m.total||100),1);
          const done=p>=1;
          return(<div key={m.id} style={{background:G.card2,borderRadius:14,padding:"12px 14px",border:`1px solid ${done?G.green+"44":G.border}`}}>
            <div style={{display:"flex",alignItems:"center",justifyContent:"space-between",marginBottom:8}}>
              <div style={{display:"flex",alignItems:"center",gap:8}}>
                <span style={{fontSize:20}}>{m.emoji||"🎯"}</span>
                <div>
                  <div style={{fontSize:13,fontWeight:600,color:done?G.green:G.text}}>{m.titulo}</div>
                  {m.prazo&&<div style={{fontSize:10,color:G.muted}}>até {fmtD(m.prazo)}</div>}
                </div>
              </div>
              <div style={{display:"flex",alignItems:"center",gap:6}}>
                <span style={{fontSize:12,fontFamily:"'Fraunces',serif",fontWeight:700,color:done?G.green:G.accent}}>{Math.round(p*100)}%</span>
                <button onClick={()=>deleteMeta(m.id)} style={{background:"none",border:"none",cursor:"pointer",color:G.muted,opacity:.5}}>×</button>
              </div>
            </div>
            <div style={{height:6,background:G.border,borderRadius:6,overflow:"hidden",marginBottom:8}}>
              <div style={{height:"100%",width:`${p*100}%`,background:done?G.green:`linear-gradient(90deg,${G.accent},${G.accent}99)`,borderRadius:6,transition:"width .4s"}}/>
            </div>
            <div style={{display:"flex",alignItems:"center",gap:6}}>
              <span style={{fontSize:11,color:G.muted,flex:1}}>{m.progresso||0} / {m.total||100}</span>
              {!done&&<>
                <button onClick={()=>updateMetaProgress(m.id,-10)} className="press"
                  style={{width:28,height:28,borderRadius:8,border:`1px solid ${G.border}`,background:"none",color:G.muted,cursor:"pointer",display:"flex",alignItems:"center",justifyContent:"center"}}>
                  <Ic d={ICON.minus} size={12}/>
                </button>
                <button onClick={()=>updateMetaProgress(m.id,10)} className="press"
                  style={{width:28,height:28,borderRadius:8,border:"none",background:G.accent,color:"#fff",cursor:"pointer",display:"flex",alignItems:"center",justifyContent:"center"}}>
                  <Ic d={ICON.plus} size={12}/>
                </button>
              </>}
              {done&&<span style={{fontSize:11,color:G.green,fontWeight:700}}>🎉 Concluída!</span>}
            </div>
          </div>);
        })}
      </div>

      {addingMeta&&<div style={{background:G.card2,borderRadius:14,padding:"14px",border:`1px solid ${G.border}`}}>
        <div style={{fontSize:12,fontWeight:700,color:G.text,marginBottom:10}}>Nova meta</div>
        <div style={{display:"flex",gap:6,flexWrap:"wrap",marginBottom:10}}>
          {["🎯","💪","📚","✈️","🏃","🎸","💰","🧘","🏋️","🌱","❤️","⭐","🎓","🏠","🎨"].map(e=>(
            <button key={e} onClick={()=>setNovaMeta(m=>({...m,emoji:e}))}
              style={{fontSize:18,padding:"4px 6px",borderRadius:8,border:`1px solid ${novaMeta.emoji===e?G.accent:"transparent"}`,background:novaMeta.emoji===e?G.accentL:"transparent",cursor:"pointer"}}>
              {e}
            </button>
          ))}
        </div>
        <input value={novaMeta.titulo} onChange={e=>setNovaMeta(m=>({...m,titulo:e.target.value}))}
          placeholder="Título da meta" className="inp" style={{fontSize:13,width:"100%",marginBottom:8}}/>
        <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:8,marginBottom:10}}>
          <div>
            <div style={{fontSize:10,color:G.muted,marginBottom:4}}>Meta total</div>
            <input type="number" value={novaMeta.total} onChange={e=>setNovaMeta(m=>({...m,total:parseInt(e.target.value)||100}))}
              className="inp" style={{fontSize:13,width:"100%"}}/>
          </div>
          <div>
            <div style={{fontSize:10,color:G.muted,marginBottom:4}}>Prazo</div>
            <input type="date" value={novaMeta.prazo} onChange={e=>setNovaMeta(m=>({...m,prazo:e.target.value}))}
              className="inp" style={{fontSize:13,width:"100%"}}/>
          </div>
        </div>
        <div style={{display:"flex",gap:8}}>
          <button onClick={addMeta} className="press" style={{flex:1,padding:"10px",borderRadius:10,border:"none",background:G.accent,color:"#fff",fontSize:13,fontWeight:700,cursor:"pointer"}}>Criar</button>
          <button onClick={()=>setAddingMeta(false)} className="press" style={{padding:"10px 14px",borderRadius:10,border:`1px solid ${G.border}`,background:"none",color:G.muted,cursor:"pointer"}}>Cancelar</button>
        </div>
      </div>}
    </Card>

  </div>);
}
// ─── FINANÇAS VIEW ────────────────────────────────────────────────────────────
const CAT_ICONS={"Moradia":"🏠","Alimentação":"🍔","Transporte":"🚗","Saúde":"❤️","Educação":"📚","Lazer":"🎮","Vestuário":"👕","Assinaturas":"📱","Pets":"🐾","Beleza e Cuidados":"💅","Eletrônicos":"💻","Presentes":"🎁","Impostos":"🧾","Dívidas":"💳","Seguros":"🛡️","Academia":"💪","Farmácia":"💊","Outros":"","Salário":"","Freelance":"🖥️","Investimentos":<Ic d={ICON.chart} size={15}/>,"Aluguel Recebido":"🏡","Bônus":"⭐","Reembolso":"↩️","Renda Extra":"💡","Dividendos":"💰"};
const ORC_CORES=["#FB923C","#A78BFA","#F472B6","#34D399","#FBBF24","#60A5FA","#818CF8","#2DD4BF","#F97316","#E879F9"];

function FinancasView({uid,lancs,secao}){
  // secao comes from drawer nav
  const [mes,setMes]=useState(curMes());
  const [orcamentos,setOrcamentos]=useState([]);
  const [alertas,setAlertas]=useState([]);
  const [sheet,setSheet]=useState(null);
  const [fo,setFo]=useState({cat:CATS_DEP[0],limite:"",cor:ORC_CORES[0]});
  const [fa,setFa]=useState({msg:"",tipo:"lembrete"});
  const [exportMenu,setExportMenu]=useState(false);
  const exportRef=useRef();

  useEffect(()=>{
    if(!uid)return;
    async function load(){
      try{const s=await getDocs(collection(db,"users",uid,"orcamentos"));setOrcamentos(s.docs.map(d=>({id:d.id,...d.data()})));}catch(e){console.warn(e);}
      try{const s=await getDocs(collection(db,"users",uid,"alertas"));setAlertas(s.docs.map(d=>({id:d.id,...d.data()})).sort((a,b)=>(b.data||'').localeCompare(a.data||'')));}catch(e){console.warn(e);}
    }
    load();
  },[uid]);

  const dm=lancs.filter(l=>getMes(l.data)===mes&&isRealizado(l.data,l.agendado));
  const tR=dm.filter(l=>l.tipo==="Receita").reduce((s,l)=>s+l.valor,0);
  const tD=dm.filter(l=>l.tipo==="Despesa").reduce((s,l)=>s+l.valor,0);
  const sal=tR-tD;
  const tx=tR>0?sal/tR*100:0;
  const nlidos=alertas.filter(a=>!a.lido).length;

  function gastosCat(cat){return dm.filter(l=>l.tipo==="Despesa"&&l.cat===cat).reduce((s,l)=>s+l.valor,0);}

  const now=new Date();
  const trend=Array.from({length:6},(_,i)=>{
    const d=new Date(now.getFullYear(),now.getMonth()-5+i,1);
    const ma=`${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,"0")}`;
    const isCur=ma===curMes();
    const r=lancs.filter(l=>l.tipo==="Receita"&&getMes(l.data)===ma&&isRealizado(l.data,l.agendado)).reduce((s,l)=>s+l.valor,0);
    const dd=lancs.filter(l=>l.tipo==="Despesa"&&getMes(l.data)===ma&&isRealizado(l.data,l.agendado)).reduce((s,l)=>s+l.valor,0);
    return{name:MESES[d.getMonth()],poupanca:Math.max(0,r-dd),gasto:dd,rec:r};
  });

  const mesesDisp=[...new Set([curMes(),...lancs.map(l=>getMes(l.data))])].filter(Boolean).sort().reverse().slice(0,6);
  const totalLimite=orcamentos.reduce((s,o)=>s+o.limite,0);
  const totalGasto=orcamentos.reduce((s,o)=>s+gastosCat(o.cat),0);
  const pTotal=totalLimite>0?Math.min(100,totalGasto/totalLimite*100):0;
  const barTotal=pTotal<70?G.green:pTotal<90?G.yellow:G.red;

  const hoje=new Date();
  const diasNoMes=new Date(hoje.getFullYear(),hoje.getMonth()+1,0).getDate();
  const frac=hoje.getDate()/diasNoMes;
  const projDep=frac>0?tD/frac:0;
  const projSaldo=tR-projDep;

  async function salvarOrc(){
    const v={...fo,limite:parseFloat(fo.limite)||0};
    if(!v.limite){return;}
    if(orcamentos.find(o=>o.cat===v.cat)){alert("Categoria já tem orçamento.");return;}
    try{const ref=await addDoc(collection(db,"users",uid,"orcamentos"),v);setOrcamentos(p=>[...p,{id:ref.id,...v}]);setSheet(null);}catch(e){console.error(e);}
  }
  async function delOrc(id){
    try{await deleteDoc(doc(db,"users",uid,"orcamentos",id));setOrcamentos(p=>p.filter(x=>x.id!==id));}catch(e){console.error(e);}
  }
  async function salvarAlerta(){
    if(!fa.msg.trim())return;
    const v={...fa,lido:false,data:today()};
    try{const ref=await addDoc(collection(db,"users",uid,"alertas"),v);setAlertas(p=>[{id:ref.id,...v},...p]);setSheet(null);}catch(e){console.error(e);}
  }
  async function marcarLido(id){
    try{await updateDoc(doc(db,"users",uid,"alertas",id),{lido:true});setAlertas(p=>p.map(a=>a.id===id?{...a,lido:true}:a));}catch(e){console.error(e);}
  }
  async function marcarTodosLidos(){
    try{await Promise.all(alertas.filter(a=>!a.lido).map(a=>updateDoc(doc(db,"users",uid,"alertas",a.id),{lido:true})));setAlertas(p=>p.map(a=>({...a,lido:true})));}catch(e){console.error(e);}
  }
  async function delAlerta(id){
    try{await deleteDoc(doc(db,"users",uid,"alertas",id));setAlertas(p=>p.filter(x=>x.id!==id));}catch(e){console.error(e);}
  }

  // Auto alertas
  const autoAlertas=orcamentos.map(o=>{
    const g=gastosCat(o.cat);
    const p=o.limite>0?g/o.limite*100:0;
    if(p>=100)return{cor:G.red,msg:`⚠ ${o.cat} estourou! Gasto: ${fmt(g)} / Limite: ${fmt(o.limite)}`};
    if(p>=80)return{cor:G.yellow,msg:`⚠️ ${o.cat} atingiu ${p.toFixed(0)}% do limite (${fmt(g)} de ${fmt(o.limite)})`};
    return null;
  }).filter(Boolean);



  // ── EXPORT ──────────────────────────────────────────────────────────────────
  function exportXLSX(){
    const rows=[["Data","Tipo","Descrição","Categoria","Forma","Valor (R$)"]];
    dm.sort((a,b)=>a.data?.localeCompare(b.data||"")).forEach(l=>{
      rows.push([fmtD(l.data),l.tipo,l.desc||"",l.cat||"",l.forma||"",Number(l.valor).toFixed(2)]);
    });
    rows.push([]);
    rows.push(["","","","","Total Receitas",tR.toFixed(2)]);
    rows.push(["","","","","Total Despesas",tD.toFixed(2)]);
    rows.push(["","","","","Saldo",sal.toFixed(2)]);

    const ws=rows.map(r=>r.join("\t")).join("\n");
    const blob=new Blob(["﻿"+ws],{type:"text/tab-separated-values;charset=utf-8"});
    const a=document.createElement("a");
    a.href=URL.createObjectURL(blob);
    a.download=`finance_${mes}.xls`;
    a.click();
    setExportMenu(false);
  }

  function exportPDF(){
    const w=window.open("","_blank");
    const rec=dm.filter(l=>l.tipo==="Receita");
    const dep=dm.filter(l=>l.tipo==="Despesa");
    const catRows=CATS_DEP.map(c=>{const v=gastosCat(c);return v>0?`<tr><td>${c}</td><td style="text-align:right;color:#E5334A">R$ ${v.toFixed(2)}</td></tr>`:""}).join("");
    w.document.write(`<!DOCTYPE html><html><head><meta charset="UTF-8">
    <style>*{box-sizing:border-box;margin:0;padding:0}body{font-family:'Segoe UI',sans-serif;background:#fff;color:#111;padding:32px;max-width:700px;margin:0 auto}
    h1{font-size:28px;font-weight:700;margin-bottom:4px}h2{font-size:16px;font-weight:700;margin:24px 0 10px;color:#444}
    .sub{color:#888;font-size:13px;margin-bottom:28px}.hero{display:flex;gap:20px;margin-bottom:24px}
    .kpi{flex:1;padding:16px;border-radius:12px;text-align:center}.kpi-label{font-size:11px;font-weight:600;color:#888;text-transform:uppercase;letter-spacing:.8px;margin-bottom:6px}
    .kpi-val{font-size:22px;font-weight:700}.green{background:#f0fdf7;color:#1CA870}.red{background:#fff1f2;color:#E5334A}.blue{background:#f5f3ff;color:#7C6AF7}
    table{width:100%;border-collapse:collapse;font-size:13px}th{text-align:left;padding:8px 10px;background:#f8f8f8;font-weight:600;color:#555;border-bottom:2px solid #eee}
    td{padding:8px 10px;border-bottom:1px solid #f0f0f0}tr:last-child td{border:none}
    .badge{display:inline-block;padding:2px 8px;border-radius:20px;font-size:11px;font-weight:700}
    .badge-r{background:#f0fdf7;color:#1CA870}.badge-d{background:#fff1f2;color:#E5334A}
    @media print{body{padding:16px}}</style></head><body>
    <h1>finance</h1><div class="sub">Relatório · ${mesLbl(mes)} · Gerado em ${fmtD(today())}</div>
    <div class="hero">
      <div class="kpi green"><div class="kpi-label">Receitas</div><div class="kpi-val">R$ ${tR.toFixed(2)}</div></div>
      <div class="kpi red"><div class="kpi-label">Despesas</div><div class="kpi-val">R$ ${tD.toFixed(2)}</div></div>
      <div class="kpi blue"><div class="kpi-label">Saldo</div><div class="kpi-val">${sal>=0?"+":""}R$ ${Math.abs(sal).toFixed(2)}</div></div>
    </div>
    ${catRows?`<h2>Gastos por Categoria</h2><table><tr><th>Categoria</th><th style="text-align:right">Valor</th></tr>${catRows}</table>`:""}
    <h2>Lançamentos (${dm.length})</h2>
    <table><tr><th>Data</th><th>Tipo</th><th>Descrição</th><th>Categoria</th><th style="text-align:right">Valor</th></tr>
    ${dm.sort((a,b)=>a.data?.localeCompare(b.data||"")).map(l=>`<tr>
      <td>${fmtD(l.data)}</td>
      <td><span class="badge ${l.tipo==="Receita"?"badge-r":"badge-d"}">${l.tipo}</span></td>
      <td>${l.desc||"-"}</td><td>${l.cat||"-"}</td>
      <td style="text-align:right;font-weight:600;color:${l.tipo==="Receita"?"#1CA870":"#E5334A"}">${l.tipo==="Receita"?"+":"-"}R$ ${Number(l.valor).toFixed(2)}</td>
    </tr>`).join("")}
    </table></body></html>`);
    w.document.close();
    setTimeout(()=>{w.print();},400);
    setExportMenu(false);
  }

  function exportPNG(){
    const canvas=document.createElement("canvas");
    const dpr=2;
    canvas.width=480*dpr; canvas.height=(120+dm.length*44+160)*dpr;
    const ctx=canvas.getContext("2d");
    ctx.scale(dpr,dpr);
    const W=480,isDark=_theme==="dark";
    const bg=isDark?"#0A0A0F":"#F5F5FA",cardBg=isDark?"#111118":"#ffffff",textC=isDark?"#F0EEF8":"#1A1830",mutedC=isDark?"#6B6880":"#8A87A0";
    const greenC="#2ECC8E",redC="#E5334A",accentC="#7C6AF7";
    ctx.fillStyle=bg; ctx.fillRect(0,0,W,canvas.height/dpr);
    // Header
    ctx.fillStyle=accentC; ctx.font="bold 22px serif"; ctx.fillText("finance",20,42);
    ctx.fillStyle=mutedC; ctx.font="13px sans-serif"; ctx.fillText(`Relatório · ${mesLbl(mes)}`,20,62);
    // KPIs
    [[`+R$ ${tR.toFixed(2)}`,greenC,"Receitas",20],[`-R$ ${tD.toFixed(2)}`,redC,"Despesas",175],[(sal>=0?"+":"")+`R$ ${Math.abs(sal).toFixed(2)}`,sal>=0?greenC:redC,"Saldo",330]].forEach(([v,c,l,x])=>{
      ctx.fillStyle=c+"22"; roundRect(ctx,x,78,130,50,10); ctx.fill();
      ctx.fillStyle=c; ctx.font="bold 14px serif"; ctx.fillText(v,x+8,100);
      ctx.fillStyle=mutedC; ctx.font="10px sans-serif"; ctx.fillText(l,x+8,120);
    });
    // Rows
    let y=148;
    ctx.fillStyle=mutedC; ctx.font="bold 10px sans-serif"; ctx.fillText("DATA",20,y); ctx.fillText("DESCRIÇÃO",80,y); ctx.fillText("CATEGORIA",240,y); ctx.fillText("VALOR",390,y);
    y+=16; ctx.fillStyle=mutedC; ctx.fillRect(20,y,440,1); y+=12;
    dm.sort((a,b)=>a.data?.localeCompare(b.data||"")).forEach(l=>{
      const isR=l.tipo==="Receita",c=isR?greenC:redC;
      ctx.fillStyle=cardBg+"cc"; roundRect(ctx,16,y-2,448,36,8); ctx.fill();
      ctx.fillStyle=mutedC; ctx.font="11px sans-serif"; ctx.fillText(fmtD(l.data),20,y+20);
      ctx.fillStyle=textC; ctx.font="12px sans-serif";
      const desc=(l.desc||l.cat||"").slice(0,22);
      ctx.fillText(desc,80,y+20);
      ctx.fillStyle=mutedC; ctx.font="11px sans-serif";
      ctx.fillText((l.cat||"").slice(0,18),240,y+20);
      ctx.fillStyle=c; ctx.font="bold 12px sans-serif";
      ctx.fillText((isR?"+":"-")+"R$"+Number(l.valor).toFixed(2),390,y+20);
      y+=44;
    });
    // Footer
    y+=10; ctx.fillStyle=mutedC; ctx.fillRect(20,y,440,1); y+=14;
    ctx.fillStyle=mutedC; ctx.font="11px sans-serif";
    ctx.fillText(`Gerado em ${fmtD(today())} · finance app`,20,y+10);

    const a=document.createElement("a");
    a.href=canvas.toDataURL("image/png");
    a.download=`finance_${mes}.png`;
    a.click();
    setExportMenu(false);
  }
  function roundRect(ctx,x,y,w,h,r){ctx.beginPath();ctx.moveTo(x+r,y);ctx.lineTo(x+w-r,y);ctx.quadraticCurveTo(x+w,y,x+w,y+r);ctx.lineTo(x+w,y+h-r);ctx.quadraticCurveTo(x+w,y+h,x+w-r,y+h);ctx.lineTo(x+r,y+h);ctx.quadraticCurveTo(x,y+h,x,y+h-r);ctx.lineTo(x,y+r);ctx.quadraticCurveTo(x,y,x+r,y);ctx.closePath();}

  return(<div style={{paddingBottom:8}}>
    {/* Hero */}
    <div style={{background:"linear-gradient(145deg,#0d1a14,#0a0f1a)",border:`1px solid ${G.border}`,borderRadius:20,padding:"20px",marginBottom:16,position:"relative",overflow:"hidden"}}>
      <div style={{position:"absolute",top:-40,right:-40,width:160,height:160,borderRadius:"50%",background:`radial-gradient(circle,${G.green}18,transparent 70%)`,pointerEvents:"none"}}/>
      <div style={{display:"flex",alignItems:"center",justifyContent:"space-between",marginBottom:4}}>
        <div style={{fontSize:11,fontWeight:700,letterSpacing:1.2,textTransform:"uppercase",color:G.muted}}>Planejamento · {mesLbl(mes)}</div>
        {nlidos>0&&<div onClick={()=>void 0} style={{padding:"3px 10px",borderRadius:20,background:G.redL,border:`1px solid ${G.red}44`,color:G.red,fontSize:11,fontWeight:700,cursor:"pointer"}}>🔔 {nlidos} alerta{nlidos>1?"s":""}</div>}
      </div>
      <div style={{marginBottom:18}}>
        <div style={{fontFamily:"'Fraunces',serif",fontSize:36,fontWeight:700,letterSpacing:-2,color:sal>=0?G.green:G.red,lineHeight:1}}>{sal>=0?"+":""}{fmt(sal)}</div>
        <div style={{fontSize:12,color:G.muted,marginTop:4}}>Saldo livre · {tx>=0?tx.toFixed(0):0}% da renda poupado</div>
      </div>
      <div style={{display:"flex"}}>
        {[{l:"Receitas",v:fmt(tR),c:G.green},{l:"Despesas",v:fmt(tD),c:G.red},{l:"Orçamentos",v:`${orcamentos.length} ativos`,c:G.accent}].map((k,i)=>(
          <div key={i} style={{flex:1,borderRight:i<2?`1px solid ${G.border}`:"none",paddingRight:i<2?14:0,paddingLeft:i>0?14:0}}>
            <div style={{fontSize:10,color:G.muted,marginBottom:3}}>{k.l}</div>
            <div style={{fontFamily:"'Fraunces',serif",fontSize:14,fontWeight:700,color:k.c}}>{k.v}</div>
          </div>
        ))}
      </div>
    </div>

    {/* Exportar + Mes pills */}
    <div style={{display:"flex",alignItems:"center",justifyContent:"space-between",marginBottom:10}}>
      <div style={{fontSize:11,fontWeight:700,letterSpacing:.8,textTransform:"uppercase",color:G.muted}}>Período</div>
      <div style={{position:"relative"}} ref={exportRef}>
        <button onClick={()=>setExportMenu(v=>!v)} className="press"
          style={{display:"flex",alignItems:"center",gap:6,padding:"6px 12px",borderRadius:20,border:`1px solid ${G.border2}`,background:G.card2,color:G.muted,fontSize:12,fontWeight:600,cursor:"pointer",fontFamily:"inherit"}}>
          <span style={{fontSize:14}}>↗</span> Exportar
        </button>
        {exportMenu&&<>
          <div onClick={()=>setExportMenu(false)} style={{position:"fixed",inset:0,zIndex:299}}/>
          <div style={{position:"absolute",top:36,right:0,zIndex:300,background:G.card,border:`1px solid ${G.border2}`,borderRadius:14,padding:6,minWidth:170,boxShadow:"0 8px 32px rgba(0,0,0,.4)",animation:"popIn .15s ease"}}>
            {[
              {icon:"XLS",label:"Planilha (.xls)",fn:exportXLSX},
              {icon:"PDF",label:"PDF / Imprimir",fn:exportPDF},
              {icon:"PNG",label:"Imagem (.png)",fn:exportPNG},
            ].map(o=>(
              <div key={o.label} onClick={o.fn} className="press"
                style={{display:"flex",alignItems:"center",gap:10,padding:"10px 14px",borderRadius:10,cursor:"pointer",fontSize:13,fontWeight:500}}>
                <span style={{fontSize:18}}>{o.icon}</span><span>{o.label}</span>
              </div>
            ))}
          </div>
        </>}
      </div>
    </div>
    <div style={{display:"flex",gap:8,overflowX:"auto",marginBottom:14,paddingBottom:2}}>
      {mesesDisp.map(m=><div key={m} onClick={()=>setMes(m)} className="press" style={{padding:"7px 14px",borderRadius:20,cursor:"pointer",flexShrink:0,fontSize:12,fontWeight:600,background:m===mes?G.accentL:G.card2,border:`1px solid ${m===mes?G.accent:G.border}`,color:m===mes?G.accent:G.muted}}>{mesLbl(m)}</div>)}
    </div>



    {/* ── VISÃO ── */}
    {secao==="visao"&&<div style={{display:"flex",flexDirection:"column",gap:14}}>
      <div style={{background:G.card,border:`1px solid ${G.border}`,borderRadius:16,padding:"16px 8px 8px"}}>
        <div style={{fontSize:10,fontWeight:700,letterSpacing:1.2,textTransform:"uppercase",color:G.muted,marginBottom:12,paddingLeft:10}}>Poupança vs Gastos</div>
        <ResponsiveContainer width="100%" height={140}>
          <BarChart data={trend} barGap={3} barCategoryGap="28%" margin={{left:-18,right:8}}>
            <XAxis dataKey="name" tick={{fill:G.muted,fontSize:10}} axisLine={false} tickLine={false}/>
            <YAxis tick={{fill:G.muted,fontSize:10}} axisLine={false} tickLine={false} tickFormatter={v=>v>=1000?`${(v/1000).toFixed(0)}k`:v}/>
            <Tooltip contentStyle={{background:G.card2,border:`1px solid ${G.border2}`,borderRadius:10,fontSize:11}} cursor={{fill:"#ffffff06"}}/>
            <Bar dataKey="poupanca" name="Poupança" fill={G.green} radius={[4,4,0,0]} fillOpacity={.85}/>
            <Bar dataKey="gasto" name="Gastos" fill={G.red} radius={[4,4,0,0]} fillOpacity={.7}/>
          </BarChart>
        </ResponsiveContainer>
      </div>
      <div style={{background:G.card,border:`1px solid ${G.border}`,borderRadius:16,padding:16}}>
        <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:12}}>
          <div style={{fontSize:10,fontWeight:700,letterSpacing:1.2,textTransform:"uppercase",color:G.muted}}>Orçamentos do Mês</div>
          <button onClick={()=>void 0} style={{fontSize:12,color:G.accent,background:"none",border:"none",cursor:"pointer"}}>ver todos →</button>
        </div>
        {orcamentos.length===0?<div style={{fontSize:13,color:G.muted}}>Nenhum orçamento cadastrado</div>
          :orcamentos.slice(0,4).map(o=>{const g=gastosCat(o.cat);const p=o.limite>0?Math.min(100,g/o.limite*100):0;const bar=p<70?G.green:p<90?G.yellow:G.red;return(
          <div key={o.id} style={{marginBottom:13}}>
            <div style={{display:"flex",justifyContent:"space-between",marginBottom:5}}>
              <div style={{display:"flex",alignItems:"center",gap:7}}><div style={{width:8,height:8,borderRadius:"50%",background:o.cor}}/><span style={{fontSize:13,fontWeight:500}}>{o.cat}</span>{g>o.limite&&<span style={{fontSize:10,fontWeight:700,padding:"1px 7px",borderRadius:20,background:G.redL,color:G.red,border:`1px solid ${G.red}44`}}>Estourou</span>}</div>
              <span style={{fontSize:12,color:G.muted}}><span style={{fontFamily:"'Fraunces',serif",fontWeight:700,color:g>o.limite?G.red:G.text}}>{fmt(g)}</span> / {fmt(o.limite)}</span>
            </div>
            <div style={{height:4,background:G.border,borderRadius:4,overflow:"hidden"}}><div style={{height:"100%",width:`${p}%`,background:bar,borderRadius:4}}/></div>
          </div>);})}
      </div>
      <div style={{background:G.card,border:`1px solid ${G.border}`,borderRadius:16,padding:16}}>
        <div style={{fontSize:10,fontWeight:700,letterSpacing:1.2,textTransform:"uppercase",color:G.muted,marginBottom:12}}>Onde o dinheiro foi</div>
        {CATS_DEP.map(c=>({name:c,v:gastosCat(c),color:CAT_COLORS[c]||"#94A3B8"})).filter(c=>c.v>0).sort((a,b)=>b.v-a.v).slice(0,6).map(c=>{const p=tD>0?c.v/tD*100:0;return(
          <div key={c.name} style={{marginBottom:10}}>
            <div style={{display:"flex",justifyContent:"space-between",marginBottom:4}}>
              <div style={{display:"flex",alignItems:"center",gap:8}}><div style={{width:7,height:7,borderRadius:"50%",background:c.color}}/><span style={{fontSize:13}}>{c.name}</span></div>
              <div style={{display:"flex",alignItems:"center",gap:8}}><span style={{fontSize:11,color:G.muted}}>{p.toFixed(0)}%</span><span style={{fontFamily:"'Fraunces',serif",fontSize:13,fontWeight:700,color:c.color}}>{ fmt(c.v)}</span></div>
            </div>
            <div style={{height:3,background:G.border,borderRadius:3,overflow:"hidden"}}><div style={{height:"100%",width:`${p}%`,background:c.color,borderRadius:3}}/></div>
          </div>);})}
        {tD===0&&<div style={{fontSize:13,color:G.muted}}>Sem despesas neste mês</div>}
      </div>
      <div style={{background:"linear-gradient(145deg,#111128,#0d0d1a)",border:`1px solid ${G.border}`,borderRadius:16,padding:16}}>
        <div style={{fontSize:10,fontWeight:700,letterSpacing:1.2,textTransform:"uppercase",color:G.muted,marginBottom:12}}>Projeção fim do mês</div>
        <div style={{display:"flex"}}>
          {[{l:"Gastos projetados",v:fmt(projDep),c:G.red},{l:"Saldo projetado",v:fmt(Math.abs(projSaldo)),c:projSaldo>=0?G.green:G.red}].map((k,i)=>(
            <div key={i} style={{flex:1,borderRight:i===0?`1px solid ${G.border}`:"none",paddingRight:i===0?14:0,paddingLeft:i>0?14:0}}>
              <div style={{fontSize:10,color:G.muted,marginBottom:3}}>{k.l}</div>
              <div style={{fontFamily:"'Fraunces',serif",fontSize:16,fontWeight:700,color:k.c}}>{k.v}</div>
            </div>))}
        </div>
        <div style={{marginTop:12,paddingTop:12,borderTop:`1px solid ${G.border}`,fontSize:12,color:G.muted}}>
          Baseado em {hoje.getDate()} dias de {diasNoMes} · {(frac*100).toFixed(0)}% do mês transcorrido
        </div>
      </div>
    </div>}

    {/* ── ORÇAMENTOS ── */}
    {secao==="orcamentos"&&<div>
      <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:14}}>
        <div><div style={{fontSize:15,fontWeight:700}}>{orcamentos.length} orçamentos</div><div style={{fontSize:12,color:G.muted,marginTop:2}}>Limite mensal por categoria</div></div>
        <button onClick={()=>{setFo({cat:CATS_DEP[0],limite:"",cor:ORC_CORES[0]});setSheet("orc");}} className="press" style={{padding:"9px 18px",borderRadius:20,border:`1px solid ${G.accent}55`,background:G.accentL,color:G.accent,fontSize:12,fontWeight:700,cursor:"pointer",fontFamily:"inherit"}}>+ Novo</button>
      </div>
      <div style={{background:G.card,border:`1px solid ${G.border}`,borderRadius:16,padding:16,marginBottom:14}}>
        <div style={{display:"flex",justifyContent:"space-between",marginBottom:10}}>
          <div><div style={{fontSize:11,color:G.muted,marginBottom:2}}>Total gasto</div><div style={{fontFamily:"'Fraunces',serif",fontSize:20,fontWeight:700,color:G.red}}>{fmt(totalGasto)}</div></div>
          <div style={{textAlign:"right"}}><div style={{fontSize:11,color:G.muted,marginBottom:2}}>Total limite</div><div style={{fontFamily:"'Fraunces',serif",fontSize:20,fontWeight:700,color:G.accent}}>{fmt(totalLimite)}</div></div>
        </div>
        <div style={{height:8,background:G.border,borderRadius:8,overflow:"hidden"}}><div style={{height:"100%",width:`${pTotal}%`,background:barTotal,borderRadius:8}}/></div>
        <div style={{fontSize:11,color:G.muted,marginTop:6}}>{pTotal.toFixed(0)}% do orçamento total utilizado</div>
      </div>
      {orcamentos.length===0?<div style={{background:G.card,border:`1px solid ${G.border}`,borderRadius:16,textAlign:"center",padding:"40px 20px",color:G.muted}}><div style={{fontSize:36,marginBottom:8}}></div><div>Nenhum orçamento. Crie um!</div></div>
        :<div style={{display:"flex",flexDirection:"column",gap:10}}>
        {orcamentos.map(o=>{const g=gastosCat(o.cat);const p=o.limite>0?Math.min(100,g/o.limite*100):0;const over=g>o.limite;const bar=p<70?G.green:p<90?G.yellow:G.red;return(
          <div key={o.id} style={{background:G.card,border:`1px solid ${G.border}`,borderRadius:16,padding:16}}>
            <div style={{display:"flex",alignItems:"center",gap:12,marginBottom:12}}>
              <div style={{width:42,height:42,borderRadius:12,flexShrink:0,background:o.cor+"22",display:"flex",alignItems:"center",justifyContent:"center"}}>{CAT_ICONS[o.cat]||"💰"}</div>
              <div style={{flex:1}}><div style={{fontSize:15,fontWeight:700}}>{o.cat}</div><div style={{fontSize:11,color:G.muted}}>Limite: {fmt(o.limite)}/mês</div></div>
              {over&&<span style={{fontSize:11,fontWeight:700,padding:"3px 10px",borderRadius:20,background:G.redL,color:G.red,border:`1px solid ${G.red}44`,flexShrink:0}}>+{fmt(g-o.limite)}</span>}
              <button onClick={()=>delOrc(o.id)} style={{background:"none",border:"none",color:G.border2,cursor:"pointer",fontSize:18,padding:2}} onMouseEnter={e=>e.currentTarget.style.color=G.red} onMouseLeave={e=>e.currentTarget.style.color=G.border2}>×</button>
            </div>
            <div style={{display:"flex",justifyContent:"space-between",marginBottom:6}}>
              <span style={{fontSize:12,color:G.muted}}>Gasto: <span style={{fontFamily:"'Fraunces',serif",fontWeight:700,color:over?G.red:G.text}}>{fmt(g)}</span></span>
              <span style={{fontSize:12,color:G.muted}}>{over?<span style={{color:G.red}}>Estourou {fmt(g-o.limite)}</span>:<span>Faltam <span style={{fontFamily:"'Fraunces',serif",fontWeight:700,color:G.green}}>{fmt(Math.max(0,o.limite-g))}</span></span>}</span>
            </div>
            <div style={{height:6,background:G.border,borderRadius:6,overflow:"hidden"}}><div style={{height:"100%",width:`${p}%`,background:bar,borderRadius:6}}/></div>
            <div style={{fontSize:11,color:G.muted,marginTop:5}}>{p.toFixed(0)}% utilizado</div>
          </div>);})}
      </div>}
    </div>}

    {/* ── RELATÓRIO ── */}
    {secao==="relatorio"&&<div style={{display:"flex",flexDirection:"column",gap:14}}>

      {/* ── Evolução 6 meses ── */}
      <div style={{background:G.card,border:`1px solid ${G.border}`,borderRadius:16,padding:"16px 8px 8px"}}>
        <div style={{fontSize:10,fontWeight:700,letterSpacing:1.2,textTransform:"uppercase",color:G.muted,marginBottom:4,paddingLeft:12}}>Evolução 6 meses</div>
        <div style={{display:"flex",gap:12,paddingLeft:12,marginBottom:10}}>
          <span style={{display:"flex",alignItems:"center",gap:4,fontSize:11,color:G.green}}><div style={{width:8,height:8,borderRadius:"50%",background:G.green}}/>Receitas</span>
          <span style={{display:"flex",alignItems:"center",gap:4,fontSize:11,color:G.red}}><div style={{width:8,height:8,borderRadius:"50%",background:G.red}}/>Despesas</span>
          <span style={{display:"flex",alignItems:"center",gap:4,fontSize:11,color:G.accent}}><div style={{width:8,height:8,borderRadius:"50%",background:G.accent}}/>Saldo</span>
        </div>
        <ResponsiveContainer width="100%" height={160}>
          <LineChart data={trend} margin={{left:-18,right:8}}>
            <XAxis dataKey="name" tick={{fill:G.muted,fontSize:10}} axisLine={false} tickLine={false}/>
            <YAxis tick={{fill:G.muted,fontSize:10}} axisLine={false} tickLine={false} tickFormatter={v=>v>=1000?`${(v/1000).toFixed(0)}k`:`${v}`}/>
            <Tooltip contentStyle={{background:G.card2,border:`1px solid ${G.border2}`,borderRadius:10,fontSize:11}} cursor={{stroke:G.border2}} formatter={(v,n)=>[fmt(v),n]}/>
            <Line type="monotone" dataKey="rec" name="Receitas" stroke={G.green} strokeWidth={2} dot={{fill:G.green,r:3}} activeDot={{r:5}}/>
            <Line type="monotone" dataKey="gasto" name="Gastos" stroke={G.red} strokeWidth={2} dot={{fill:G.red,r:3}} activeDot={{r:5}}/>
            <Line type="monotone" dataKey="poupanca" name="Saldo" stroke={G.accent} strokeWidth={2} strokeDasharray="4 2" dot={false}/>
          </LineChart>
        </ResponsiveContainer>
      </div>

      {/* ── Top categorias ── */}
      <div style={{background:G.card,border:`1px solid ${G.border}`,borderRadius:16,padding:16}}>
        <div style={{fontSize:10,fontWeight:700,letterSpacing:1.2,textTransform:"uppercase",color:G.muted,marginBottom:12}}>Top categorias — mês atual</div>
        {(()=>{
          const catData=CATS_DEP.map(cat=>({cat,v:gastosCat(cat)})).filter(x=>x.v>0).sort((a,b)=>b.v-a.v).slice(0,6);
          const maxV=catData[0]?.v||1;
          return catData.length===0?<div style={{color:G.muted,fontSize:13,textAlign:"center",padding:"12px 0"}}>Nenhum gasto este mês</div>:catData.map(({cat,v})=>{
            const cor=CAT_COLORS[cat]||G.muted;
            const pct=tD>0?Math.round(v/tD*100):0;
            return(
              <div key={cat} style={{marginBottom:10}}>
                <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:4}}>
                  <div style={{display:"flex",alignItems:"center",gap:6}}>
                    <span style={{fontSize:14}}>{CAT_EMOJI[cat]||"💰"}</span>
                    <span style={{fontSize:12,fontWeight:600,color:G.text}}>{cat}</span>
                  </div>
                  <div style={{textAlign:"right"}}>
                    <span style={{fontFamily:"'Fraunces',serif",fontSize:13,fontWeight:700,color:cor}}>{fmt(v)}</span>
                    <span style={{fontSize:10,color:G.muted,marginLeft:4}}>{pct}%</span>
                  </div>
                </div>
                <div style={{height:5,background:G.border,borderRadius:4,overflow:"hidden"}}>
                  <div style={{height:"100%",width:`${(v/maxV)*100}%`,background:cor,borderRadius:4,transition:"width .5s"}}/>
                </div>
              </div>
            );
          });
        })()}
      </div>

      {/* ── Mês atual vs anterior ── */}
      <div style={{background:G.card,border:`1px solid ${G.border}`,borderRadius:16,padding:16}}>
        <div style={{fontSize:10,fontWeight:700,letterSpacing:1.2,textTransform:"uppercase",color:G.muted,marginBottom:12}}>Mês atual vs anterior</div>
        {(()=>{
          const cur=trend[trend.length-1]||{rec:0,gasto:0};
          const prev=trend[trend.length-2]||{rec:0,gasto:0};
          return[
            {l:"Receitas",cur:cur.rec,prev:prev.rec,c:G.green,inverted:false},
            {l:"Despesas",cur:cur.gasto,prev:prev.gasto,c:G.red,inverted:true},
            {l:"Saldo",cur:cur.rec-cur.gasto,prev:prev.rec-prev.gasto,c:G.accent,inverted:false},
          ].map(r=>{
            const diff=r.cur-r.prev;
            const pct=r.prev>0?Math.abs(Math.round(diff/r.prev*100)):null;
            const up=diff>=0;
            const good=r.inverted?!up:up;
            return(
              <div key={r.l} style={{display:"flex",alignItems:"center",gap:10,padding:"10px 0",borderBottom:`1px solid ${G.border}`}}>
                <div style={{width:3,height:36,borderRadius:2,background:r.c,flexShrink:0}}/>
                <div style={{flex:1}}>
                  <div style={{fontSize:11,color:G.muted}}>{r.l}</div>
                  <div style={{fontFamily:"'Fraunces',serif",fontSize:15,fontWeight:700,color:r.c}}>{fmt(r.cur)}</div>
                </div>
                <div style={{textAlign:"right"}}>
                  {pct!==null&&<div style={{fontSize:11,fontWeight:700,color:good?G.green:G.red}}>{up?"↑":"↓"} {pct}%</div>}
                  <div style={{fontSize:10,color:G.muted}}>{fmt(r.prev)} ant.</div>
                </div>
              </div>
            );
          });
        })()}
      </div>

      {/* ── Métricas ── */}
      <div style={{background:G.card,border:`1px solid ${G.border}`,borderRadius:16,padding:16}}>
        <div style={{fontSize:10,fontWeight:700,letterSpacing:1.2,textTransform:"uppercase",color:G.muted,marginBottom:12}}>Métricas do mês</div>
        {(()=>{
          const taxa=tR>0?((tR-tD)/tR*100):0;
          const media=tD>0?tD/hoje.getDate():0;
          const catTop=CATS_DEP.map(c=>({c,v:gastosCat(c)})).sort((a,b)=>b.v-a.v)[0];
          const mC=trend.filter(t=>t.rec>0);
          const mediaPoup=mC.length>0?mC.reduce((s,t)=>s+t.poupanca,0)/mC.length:0;
          return[
            {l:"Taxa de poupança",v:taxa.toFixed(1)+"%",sub:"da renda",c:taxa>=20?G.green:taxa>=10?G.yellow:G.red},
            {l:"Gasto médio/dia",v:fmt(media),sub:`${hoje.getDate()} dias`,c:G.text},
            {l:"Categoria top",v:catTop?.c||"—",sub:catTop?fmt(catTop.v):"",c:CAT_COLORS[catTop?.c]||G.muted},
            {l:"Média poupança/mês",v:fmt(mediaPoup),sub:"últimos 6 meses",c:mediaPoup>0?G.green:G.muted},
          ].map(m=>(
            <div key={m.l} style={{display:"flex",alignItems:"center",gap:12,padding:"10px 0",borderBottom:`1px solid ${G.border}`}}>
              <div style={{width:3,height:36,borderRadius:2,background:m.c,flexShrink:0}}/>
              <div style={{flex:1}}><div style={{fontSize:12,color:G.muted}}>{m.l}</div><div style={{fontFamily:"'Fraunces',serif",fontSize:16,fontWeight:700,color:m.c}}>{m.v}</div></div>
              <div style={{fontSize:11,color:G.muted,textAlign:"right"}}>{m.sub}</div>
            </div>
          ));
        })()}
      </div>

      {/* ── Histórico ── */}
      <div style={{background:G.card,border:`1px solid ${G.border}`,borderRadius:16,padding:16}}>
        <div style={{fontSize:10,fontWeight:700,letterSpacing:1.2,textTransform:"uppercase",color:G.muted,marginBottom:12}}>Histórico mensal</div>
        {trend.map(t=>{const s=t.rec-t.gasto;return(
          <div key={t.name} style={{display:"flex",alignItems:"center",gap:10,padding:"9px 0",borderBottom:`1px solid ${G.border}`}}>
            <div style={{fontSize:12,fontWeight:600,color:G.muted,width:30,flexShrink:0}}>{t.name}</div>
            <div style={{flex:1}}>
              <div style={{height:4,borderRadius:2,background:G.green,width:`${t.rec>0?Math.min(100,t.rec/8000*100):0}%`,marginBottom:3}}/>
              <div style={{height:4,borderRadius:2,background:G.red,width:`${t.gasto>0?Math.min(100,t.gasto/8000*100):0}%`}}/>
            </div>
            <div style={{textAlign:"right",flexShrink:0}}>
              <div style={{fontFamily:"'Fraunces',serif",fontSize:13,fontWeight:700,color:s>=0?G.green:G.red}}>{s>=0?"+":""}{fmt(s)}</div>
              <div style={{fontSize:10,color:G.muted}}>{fmt(t.gasto)} gastos</div>
            </div>
          </div>);})}
      </div>

      {/* ── Projeção fim do mês ── */}
      <div style={{background:G.card,border:`1px solid ${G.border}`,borderRadius:16,padding:16}}>
        <div style={{fontSize:10,fontWeight:700,letterSpacing:1.2,textTransform:"uppercase",color:G.muted,marginBottom:12}}>📈 Projeção fim do mês</div>
        {(()=>{
          const diasRestantes=diasNoMes-hoje.getDate();
          const taxaGastoDiaria=frac>0?tD/frac:0;
          const taxaRecDiaria=frac>0?tR/frac:0;
          const projRecFim=tR+(taxaRecDiaria*diasRestantes);
          const projSaldoFim=projRecFim-projDep;
          return(
            <div>
              <div style={{marginBottom:14}}>
                <div style={{display:"flex",justifyContent:"space-between",marginBottom:5}}>
                  <span style={{fontSize:11,color:G.muted}}>Progresso do mês</span>
                  <span style={{fontSize:11,fontWeight:700,color:G.accent}}>{Math.round(frac*100)}% concluído</span>
                </div>
                <div style={{height:6,background:G.border,borderRadius:6,overflow:"hidden"}}>
                  <div style={{height:"100%",width:`${frac*100}%`,background:`linear-gradient(90deg,${G.accent},${G.green})`,borderRadius:6}}/>
                </div>
                <div style={{display:"flex",justifyContent:"space-between",fontSize:9,color:G.muted,marginTop:3}}>
                  <span>Dia 1</span><span>Hoje (dia {hoje.getDate()})</span><span>Dia {diasNoMes}</span>
                </div>
              </div>
              {[
                {l:"Gasto projetado",v:fmt(projDep),sub:`${fmt(tD)} até hoje`,c:G.red},
                {l:"Receita projetada",v:fmt(projRecFim),sub:`${fmt(tR)} até hoje`,c:G.green},
                {l:"Saldo projetado",v:fmt(projSaldoFim),sub:projSaldoFim>=0?"Positivo ✓":"Déficit ⚠️",c:projSaldoFim>=0?G.green:G.red},
                {l:"Dias restantes",v:String(diasRestantes),sub:`de ${diasNoMes} dias`,c:G.accent},
              ].map(r=>(
                <div key={r.l} style={{display:"flex",alignItems:"center",gap:12,padding:"9px 0",borderBottom:`1px solid ${G.border}`}}>
                  <div style={{width:3,height:32,borderRadius:2,background:r.c,flexShrink:0}}/>
                  <div style={{flex:1}}><div style={{fontSize:11,color:G.muted}}>{r.l}</div><div style={{fontFamily:"'Fraunces',serif",fontSize:15,fontWeight:700,color:r.c}}>{r.v}</div></div>
                  <div style={{fontSize:10,color:G.muted,textAlign:"right",maxWidth:90}}>{r.sub}</div>
                </div>
              ))}
              <div style={{marginTop:12,padding:"10px 12px",borderRadius:12,
                background:projSaldoFim>=0?G.green+"10":G.red+"10",
                border:`1px solid ${projSaldoFim>=0?G.green:G.red}33`}}>
                <div style={{fontSize:12,lineHeight:1.5,color:projSaldoFim>=0?G.green:G.red}}>
                  {projSaldoFim>=0
                    ?`✅ No ritmo atual você deve terminar o mês com ${fmt(projSaldoFim)} de saldo positivo.`
                    :`⚠️ No ritmo atual você pode terminar o mês com ${fmt(Math.abs(projSaldoFim))} de déficit. Considere reduzir gastos.`
                  }
                </div>
              </div>
            </div>
          );
        })()}
      </div>

    </div>}
    {secao==="alertas"&&<div>
      <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:14}}>
        <div><div style={{fontSize:15,fontWeight:700}}>Alertas & Notificações</div><div style={{fontSize:12,color:G.muted,marginTop:2}}>{nlidos} não lido{nlidos!==1?"s":""}</div></div>
        {alertas.some(a=>!a.lido)&&<button onClick={marcarTodosLidos} style={{fontSize:12,color:G.muted,background:"none",border:"none",cursor:"pointer"}}>Marcar todos lidos</button>}
      </div>
      {autoAlertas.length>0&&<div style={{marginBottom:14}}>
        <div style={{fontSize:10,fontWeight:700,letterSpacing:1,textTransform:"uppercase",color:G.muted,marginBottom:8}}>Automáticos</div>
        {autoAlertas.map((a,i)=><div key={i} style={{display:"flex",alignItems:"flex-start",gap:10,padding:"12px 14px",borderRadius:12,background:a.cor+"12",border:`1px solid ${a.cor}44`,marginBottom:8}}><div style={{fontSize:13,lineHeight:1.5,flex:1}}>{a.msg}</div></div>)}
      </div>}
      <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:8}}>
        <div style={{fontSize:10,fontWeight:700,letterSpacing:1,textTransform:"uppercase",color:G.muted}}>Notificações</div>
        <button onClick={()=>{setFa({msg:"",tipo:"lembrete"});setSheet("alerta");}} style={{fontSize:12,color:G.accent,background:"none",border:"none",cursor:"pointer"}}>+ Nova</button>
      </div>
      {alertas.length===0?<div style={{background:G.card,border:`1px solid ${G.border}`,borderRadius:16,textAlign:"center",padding:"40px 20px",color:G.muted}}><div style={{fontSize:36,marginBottom:8}}><Ic d={ICON.bell} size={16}/></div><div>Nenhum alerta configurado</div></div>
        :alertas.map(a=>(
        <div key={a.id} style={{display:"flex",alignItems:"flex-start",gap:12,padding:14,borderRadius:14,background:a.lido?G.card2:G.card,border:`1px solid ${a.lido?G.border:G.border2}`,marginBottom:8,opacity:a.lido?.6:1}}>
          <div style={{fontSize:20,flexShrink:0}}>{a.tipo==="meta"?"✓":a.tipo==="limite"?"⚠️":"!"}</div>
          <div style={{flex:1}}><div style={{fontSize:13,fontWeight:a.lido?400:600,lineHeight:1.4}}>{a.msg}</div><div style={{fontSize:11,color:G.muted,marginTop:4}}>{fmtD(a.data)}</div></div>
          {!a.lido&&<button onClick={()=>marcarLido(a.id)} style={{background:"none",border:"none",color:G.accent,cursor:"pointer",fontSize:11,fontWeight:600,flexShrink:0,whiteSpace:"nowrap"}}>✓ Lido</button>}
          <button onClick={()=>delAlerta(a.id)} style={{background:"none",border:"none",color:G.border2,cursor:"pointer",fontSize:18,padding:0}} onMouseEnter={e=>e.currentTarget.style.color=G.red} onMouseLeave={e=>e.currentTarget.style.color=G.border2}>×</button>
        </div>))}
    </div>}

    {/* ── SHEETS ── */}
    <Sheet open={sheet==="orc"} onClose={()=>setSheet(null)} title="Novo Orçamento">
      <div style={{display:"flex",flexDirection:"column",gap:14}}>
        <div><Lbl>Categoria</Lbl><select value={fo.cat} onChange={e=>setFo(f=>({...f,cat:e.target.value}))} className="inp">{CATS_DEP.map(c=><option key={c}>{c}</option>)}</select></div>
        <div><Lbl>Limite Mensal (R$)</Lbl><input type="number" value={fo.limite} onChange={e=>setFo(f=>({...f,limite:e.target.value}))} placeholder="Ex: 500" className="inp"/></div>
        <div><Lbl>Cor</Lbl><div style={{display:"flex",gap:8,flexWrap:"wrap"}}>{ORC_CORES.map(c=><div key={c} onClick={()=>setFo(f=>({...f,cor:c}))} style={{width:30,height:30,borderRadius:"50%",background:c,cursor:"pointer",border:`3px solid ${fo.cor===c?"#fff":"transparent"}`,transition:"border .15s"}}/> )}</div></div>
        <button onClick={salvarOrc} className="press" style={{padding:"15px",borderRadius:14,border:"none",background:G.accent,color:"#fff",fontWeight:700,fontSize:15,cursor:"pointer",fontFamily:"inherit"}}>Criar Orçamento</button>
      </div>
    </Sheet>

    <Sheet open={sheet==="alerta"} onClose={()=>setSheet(null)} title="Novo Alerta">
      <div style={{display:"flex",flexDirection:"column",gap:14}}>
        <div><Lbl>Mensagem</Lbl><textarea value={fa.msg} onChange={e=>setFa(f=>({...f,msg:e.target.value}))} placeholder="Ex: Pagar fatura do cartão..." rows={3} className="inp" style={{resize:"none",lineHeight:1.5}}/></div>
        <div><Lbl>Tipo</Lbl><div style={{display:"flex",gap:8}}>
          {[{id:"lembrete",l:"Lembrete"},{id:"meta",l:"🎯 Meta"},{id:"limite",l:"⚠️ Limite"}].map(t=><div key={t.id} onClick={()=>setFa(f=>({...f,tipo:t.id}))} className="press" style={{flex:1,padding:"10px 6px",borderRadius:12,cursor:"pointer",fontSize:12,fontWeight:600,textAlign:"center",background:fa.tipo===t.id?G.accentL:G.card2,border:`1px solid ${fa.tipo===t.id?G.accent:G.border}`,color:fa.tipo===t.id?G.accent:G.muted}}>{t.l}</div>)}
        </div></div>
        <button onClick={salvarAlerta} className="press" style={{padding:"15px",borderRadius:14,border:"none",background:G.accent,color:"#fff",fontWeight:700,fontSize:15,cursor:"pointer",fontFamily:"inherit"}}>Criar Alerta</button>
      </div>
    </Sheet>
  </div>);
}

// ─── CHAT VIEW ────────────────────────────────────────────────────────────────
function ChatView({lancs,onAddLanc,isPremium=false,onUpgrade}){
  const SUGS=["Gastei 45 no Uber","Paguei 380 no mercado","Recebi salário de 5000","Quanto gastei esse mês?"];
  const [msgs,setMsgs]=useState([]);
  const [input,setInput]=useState("");
  const [busy,setBusy]=useState(false);
  const [pending,setPending]=useState(null);
  const [editVal,setEditVal]=useState("");
  const [showCatPicker,setShowCatPicker]=useState(false);
  const [catPickerIdx,setCatPickerIdx]=useState(null); // null = single, number = multiplos index
  const [recSt,setRecSt]=useState("idle");
  const [recSec,setRecSec]=useState(0);
  const [recErr,setRecErr]=useState("");
  const botRef=useRef(),inpRef=useRef(),mrRef=useRef(null),chkRef=useRef([]),tmrRef=useRef(null),srRef=useRef(null),photoRef=useRef(null);
  useEffect(()=>{botRef.current?.scrollIntoView({behavior:"smooth"});},[msgs]);
  const push=(from,text,ex={})=>setMsgs(p=>[...p,{id:Date.now()+Math.random(),from,text,ts:new Date(),...ex}]);
  const [photoLoading,setPhotoLoading]=useState(false);

  async function startRec(){
    setRecErr("");
    // Tenta Web Speech API primeiro (nativa, sem custo)
    const sr=createSpeechRecognizer(
      txt=>{
        if(txt.trim()){
          setInput(txt.trim());
          push("ai",`🎤 Transcrevi: *"${txt.trim()}"*\nRevise e toque enviar! ✉️`);
        } else push("ai","🎤 Não entendi. Fale mais alto e tente de novo 😊");
        setRecSt("idle");setRecSec(0);clearInterval(tmrRef.current);
      },
      err=>{
        setRecSt("idle");setRecSec(0);clearInterval(tmrRef.current);
        if(err==="not-allowed")setRecErr("Microfone bloqueado — libere nas configurações.");
        else push("ai","🎤 Erro na transcrição. Pode digitar? 😊");
      }
    );
    if(sr){
      try{
        setRecSt("rec");setRecSec(0);
        tmrRef.current=setInterval(()=>setRecSec(s=>s+1),1000);
        srRef.current=sr;
        sr.start();
        return;
      }catch(e){/* fallback para MediaRecorder */}
    }
    // Fallback: MediaRecorder (envia blob para Anthropic vision como áudio)
    try{
      const stream=await navigator.mediaDevices.getUserMedia({audio:true});
      chkRef.current=[];
      const mime=["audio/webm;codecs=opus","audio/webm","audio/ogg","audio/mp4"].find(m=>MediaRecorder.isTypeSupported(m));
      const mr=new MediaRecorder(stream,mime?{mimeType:mime}:{});
      mr.ondataavailable=e=>{if(e.data?.size>0)chkRef.current.push(e.data);};
      mr.onstop=async()=>{
        stream.getTracks().forEach(t=>t.stop());
        if(!chkRef.current.length){setRecSt("idle");return;}
        setRecSt("proc");
        try{
          push("ai","🎤 Áudio recebido! Infelizmente a transcrição automática requer conexão com API externa. Digite o que falou? 😊");
        }catch{push("ai","🎤 Erro na transcrição. Pode digitar? 😊");}
        setRecSt("idle");setRecSec(0);
      };
      mr.start(200);mrRef.current=mr;setRecSt("rec");setRecSec(0);
      tmrRef.current=setInterval(()=>setRecSec(s=>s+1),1000);
    }catch(e){setRecSt("idle");setRecErr(e.name==="NotAllowedError"?"Microfone bloqueado — libere nas configurações.":"Erro ao gravar.");}
  }
  function stopRec(){
    clearInterval(tmrRef.current);
    if(srRef.current){try{srRef.current.stop();}catch{}srRef.current=null;return;}
    if(mrRef.current?.state==="recording")mrRef.current.stop();
  }
  function cancelRec(){clearInterval(tmrRef.current);if(mrRef.current?.state==="recording"){mrRef.current.onstop=null;mrRef.current.stop();}setRecSt("idle");setRecSec(0);}

  async function send(txt){
    const msg=(txt||input).trim();if(!msg||busy)return;
    setInput("");if(inpRef.current)inpRef.current.style.height="auto";
    push("user",msg);setBusy(true);setPending(null);setEditVal("");setShowCatPicker(false);
    try{
      const r=await callAI(msg,lancs);
      if(r.action==="lancamento"){
        push("ai",r.confirmacao||"Entendido!",{lanc:r});
        setPending(r);
        setEditVal(r.valor.toFixed(2));
      }
      else if(r.action==="multiplos"){push("ai",`${r.confirmacao}\n\n${r.itens.map(i=>`• ${i.tipo==="Receita"?"↑":"↓"} ${i.desc} — R$${i.valor.toFixed(2)}`).join("\n")}`,{multi:r.itens});setPending(r);}
      else push("ai",r.resposta||"Não entendi 😊");
    }catch(e){console.error('Chat error:',e);push("ai","❌ Erro: "+(e?.message||"Tente novamente"));}
    setBusy(false);
  }

  function confirmar(){
    if(!pending)return;
    const valorFinal=parseFloat((editVal||"0").replace(",","."))||pending.valor;
    if(pending.action==="multiplos"){pending.itens.forEach(i=>onAddLanc({tipo:i.tipo,desc:i.desc,cat:i.cat,forma:i.forma||"PIX",valor:i.valor,data:i.data||today()}));}
    else{onAddLanc({tipo:pending.tipo,desc:pending.desc,cat:pending.cat,forma:pending.forma||"PIX",valor:valorFinal,data:pending.data||today()});}
    push("ai","✅ Lançamento salvo!");
    setPending(null);setEditVal("");setShowCatPicker(false);
  }

  function cancelar(){
    push("ai","Cancelei! 😊");
    setPending(null);setEditVal("");setShowCatPicker(false);
  }

  async function sendPhoto(file){
    if(!file)return;
    setPhotoLoading(true);
    push("user","📷 Enviando comprovante...");
    try{
      const base64=await new Promise((res,rej)=>{
        const r=new FileReader();
        r.onload=x=>res(x.target.result.split(",")[1]);
        r.onerror=rej;
        r.readAsDataURL(file);
      });
      const mime=file.type||"image/jpeg";
      push("ai","🔍 Analisando comprovante...");
      const result=await analyzePhoto(base64,mime);
      if(result.erro){
        push("ai","😕 Não consegui identificar os dados. Pode digitar o valor e descrição?");
      } else {
        const r={
          action:"lancamento",
          tipo:result.tipo||"Despesa",
          desc:result.desc||"Comprovante",
          cat:result.cat||"Outros",
          forma:result.forma||"PIX",
          valor:parseFloat(result.valor)||0,
          data:today(),
        };
        r.confirmacao=`📄 Identifiquei:\n*${r.desc}* — ${fmt(r.valor)}\nCategoria: ${r.cat} · ${r.forma}\n\nConfirma?`;
        push("ai",r.confirmacao,{lanc:r});
        setPending(r);
        setEditVal(r.valor.toFixed(2));
      }
    }catch(e){push("ai","❌ Erro ao analisar foto. Tente novamente ou digite manualmente.");}
    setPhotoLoading(false);
  }

  function escolherCat(cat){
    if(!pending)return;
    if(catPickerIdx!==null){
      // multiplos: update specific item
      setPending(p=>({...p,itens:p.itens.map((it,i)=>i===catPickerIdx?{...it,cat}:it)}));
    } else {
      setPending(p=>({...p,cat}));
    }
    setShowCatPicker(false);
    setCatPickerIdx(null);
  }

  const fmtS=s=>`${String(Math.floor(s/60)).padStart(2,"0")}:${String(s%60).padStart(2,"0")}`;
  const isRec=recSt==="rec",isProc=recSt==="proc";

  // Card de confirmação do lançamento
  function LancCard({lanc}){
    const isLast=msgs[msgs.length-1]?.lanc===lanc;
    const isPend=isLast&&!!pending;
    const cor=lanc.tipo==="Receita"?G.green:G.red;
    const cat=isPend?pending.cat:lanc.cat;
    const catCor=CAT_COLORS[cat]||G.muted;
    return(
      <div style={{marginTop:6,maxWidth:"88%",background:G.card,border:`1px solid ${cor}33`,borderRadius:16,padding:"14px 14px 12px"}}>
        <span style={{fontSize:10,fontWeight:700,padding:"2px 8px",borderRadius:20,background:cor+"22",color:cor,letterSpacing:.5,textTransform:"uppercase"}}>{lanc.tipo==="Receita"?"↑ Receita":"↓ Despesa"}</span>
        <div style={{fontSize:14,fontWeight:600,marginTop:8,marginBottom:10,color:G.text}}>{lanc.desc||lanc.cat}</div>
        <div style={{display:"flex",alignItems:"center",gap:8,marginBottom:8}}>
          <span style={{fontSize:11,color:G.muted,width:36}}>Valor</span>
          {isPend
            ?<div style={{display:"flex",alignItems:"center",flex:1,background:G.card2,border:`1px solid ${G.border}`,borderRadius:10,padding:"4px 10px"}}>
                <span style={{color:cor,fontWeight:700,marginRight:4,fontSize:13}}>R$</span>
                <input value={editVal} onChange={e=>setEditVal(e.target.value.replace(/[^0-9,.]/g,""))}
                  style={{background:"none",border:"none",outline:"none",fontFamily:"'Fraunces',serif",fontSize:17,fontWeight:700,color:cor,width:"100%",minWidth:0}}
                  inputMode="decimal"/>
              </div>
            :<span style={{fontFamily:"'Fraunces',serif",fontSize:17,fontWeight:700,color:cor}}>R${Number(lanc.valor).toFixed(2).replace(".",",")}</span>
          }
        </div>
        <div style={{display:"flex",alignItems:"center",gap:8,marginBottom:isPend?12:0}}>
          <span style={{fontSize:11,color:G.muted,width:36}}>Cat.</span>
          {isPend
            ?<button onClick={()=>setShowCatPicker(true)} className="press"
                style={{display:"flex",alignItems:"center",gap:6,padding:"5px 12px",borderRadius:20,border:`1px solid ${catCor}55`,background:catCor+"18",cursor:"pointer"}}>
                <span style={{fontSize:12,fontWeight:600,color:catCor}}>{cat}</span>
                <Ic d={ICON.repeat} size={11} color={catCor}/>
              </button>
            :<span style={{fontSize:12,padding:"3px 10px",borderRadius:20,background:catCor+"22",color:catCor,fontWeight:600}}>{cat}</span>
          }
          {!isPend&&<span style={{fontSize:11,color:G.muted}}>{lanc.forma} · {fmtD(lanc.data||today())}</span>}
        </div>
        {isPend&&<div style={{display:"flex",gap:8}}>
          <button onClick={confirmar} className="press" style={{flex:1,padding:"10px",borderRadius:10,border:"none",cursor:"pointer",background:G.accent,color:"#fff",fontSize:13,fontWeight:700}}>✓ Confirmar</button>
          <button onClick={cancelar} className="press" style={{padding:"10px 14px",borderRadius:10,border:`1px solid ${G.border}`,background:"none",color:G.muted,fontSize:13,cursor:"pointer"}}>✕</button>
        </div>}
      </div>
    );
  }

  return(<div style={{display:"flex",flexDirection:"column",height:"100%"}}>
    <div style={{flex:1,overflowY:"auto",padding:"12px 14px",display:"flex",flexDirection:"column",gap:10}}>
      {msgs.map(m=>(<div key={m.id} style={{display:"flex",flexDirection:"column",alignItems:m.from==="user"?"flex-end":"flex-start"}}>
        <div style={{maxWidth:"84%",padding:"10px 14px",borderRadius:m.from==="user"?"18px 18px 4px 18px":"18px 18px 18px 4px",background:m.from==="user"?G.accent:G.card2,color:m.from==="user"?"#fff":G.text,fontSize:14,lineHeight:1.5,whiteSpace:"pre-wrap"}}>
          {m.text}
        </div>
        {m.lanc&&<LancCard lanc={m.lanc}/>}
        {m.multi&&<div style={{marginTop:6,maxWidth:"84%",display:"flex",flexDirection:"column",gap:6}}>
          {m.multi.map((item,idx)=>{
            const liveItem=pending?.action==="multiplos"&&pending.itens?.[idx]?pending.itens[idx]:item;
            const cor=liveItem.tipo==="Receita"?G.green:G.red;
            const catCor=CAT_COLORS[liveItem.cat]||G.muted;
            const isPend=pending?.action==="multiplos";
            return(
              <div key={idx} style={{background:G.card,border:`1px solid ${cor}44`,borderRadius:12,padding:"10px 12px",display:"flex",alignItems:"center",gap:10}}>
                <span style={{fontSize:18,color:cor}}>{liveItem.tipo==="Receita"?"↑":"↓"}</span>
                <div style={{flex:1,minWidth:0}}>
                  <div style={{fontSize:13,fontWeight:500,color:G.text}}>{liveItem.desc||liveItem.cat}</div>
                  {isPend
                    ?<button onClick={()=>{setCatPickerIdx(idx);setShowCatPicker(true);}} className="press"
                        style={{display:"inline-flex",alignItems:"center",gap:4,marginTop:3,padding:"2px 8px",borderRadius:10,
                          border:`1px solid ${catCor}55`,background:catCor+"18",cursor:"pointer"}}>
                        <span style={{fontSize:11,fontWeight:600,color:catCor}}>{liveItem.cat}</span>
                        <Ic d={ICON.repeat} size={10} color={catCor}/>
                      </button>
                    :<div style={{fontSize:11,color:G.muted,marginTop:2}}>{liveItem.cat}</div>
                  }
                </div>
                <div style={{fontFamily:"'Fraunces',serif",fontSize:14,fontWeight:700,color:cor}}>R${liveItem.valor.toFixed(2)}</div>
              </div>
            );
          })}
          {pending?.action==="multiplos"&&<div style={{display:"flex",gap:8,marginTop:4}}>
            <button onClick={confirmar} className="press" style={{flex:1,padding:"10px",borderRadius:10,border:"none",cursor:"pointer",background:G.accent,color:"#fff",fontSize:13,fontWeight:700}}>✓ Confirmar tudo</button>
            <button onClick={cancelar} className="press" style={{padding:"10px 14px",borderRadius:10,border:`1px solid ${G.border}`,background:"none",color:G.muted,fontSize:13,cursor:"pointer"}}>✕</button>
          </div>}
        </div>}
        <div style={{fontSize:10,color:G.muted,marginTop:3}}>{m.ts.toLocaleTimeString("pt-BR",{hour:"2-digit",minute:"2-digit"})}</div>
      </div>))}
      {(busy||isProc)&&<div style={{display:"flex",alignItems:"center",gap:10}}>
        <div style={{padding:"12px 16px",borderRadius:"18px 18px 18px 4px",background:G.card2,border:`1px solid ${G.border}`}}>
          <div style={{display:"flex",gap:4}}>{[0,1,2].map(i=><div key={i} style={{width:6,height:6,borderRadius:"50%",background:G.muted,animation:`bounce .9s ${i*0.15}s infinite`}}/>)}</div>
        </div>
        {isProc&&<span style={{fontSize:12,color:G.muted}}>transcrevendo...</span>}
      </div>}
      <div ref={botRef}/>
    </div>

    {/* Cat picker modal — fora do scroll div, sem depender de pending */}
    {showCatPicker&&<div style={{position:"fixed",inset:0,zIndex:500,display:"flex",flexDirection:"column",justifyContent:"flex-end"}}>
      <div style={{position:"absolute",inset:0,background:"rgba(0,0,0,.6)",backdropFilter:"blur(4px)"}} onClick={()=>setShowCatPicker(false)}/>
      <div style={{position:"relative",background:G.card,borderRadius:"22px 22px 0 0",maxHeight:"72vh",display:"flex",flexDirection:"column",paddingBottom:"env(safe-area-inset-bottom,0px)"}}>
        <div style={{display:"flex",justifyContent:"center",padding:"10px 0 4px"}}><div style={{width:36,height:4,borderRadius:2,background:G.border}}/></div>
        <div style={{display:"flex",alignItems:"center",justifyContent:"space-between",padding:"8px 20px 14px"}}>
          <div style={{fontFamily:"'Fraunces',serif",fontSize:18,fontWeight:700}}>Mudar categoria</div>
          <button onClick={()=>setShowCatPicker(false)} style={{width:30,height:30,borderRadius:8,border:"none",background:G.card2,color:G.muted,cursor:"pointer",display:"flex",alignItems:"center",justifyContent:"center"}}>
            <Ic d={ICON.x} size={14}/>
          </button>
        </div>
        <div style={{overflowY:"auto",padding:"0 16px 16px"}}>
          {((()=>{
            if(catPickerIdx!==null&&pending?.itens) return pending.itens[catPickerIdx]?.tipo==="Receita"?CATS_REC:CATS_DEP;
            return pending?.tipo==="Receita"?CATS_REC:CATS_DEP;
          })()).map(cat=>{
            const cor=CAT_COLORS[cat]||G.muted;
            const curCat=catPickerIdx!==null?pending?.itens?.[catPickerIdx]?.cat:pending?.cat;
            const sel=curCat===cat;
            return(
              <div key={cat} onClick={()=>escolherCat(cat)} className="press"
                style={{display:"flex",alignItems:"center",gap:14,padding:"12px 14px",borderRadius:14,marginBottom:6,cursor:"pointer",
                  background:sel?cor+"22":"transparent",border:`1px solid ${sel?cor+"66":"transparent"}`}}>
                <div style={{width:36,height:36,borderRadius:10,background:cor+"22",display:"flex",alignItems:"center",justifyContent:"center",fontSize:18}}>{CAT_EMOJI[cat]||"💰"}</div>
                <span style={{fontSize:15,fontWeight:600,color:sel?cor:G.text}}>{cat}</span>
                {sel&&<Ic d={ICON.check} size={16} color={cor} style={{marginLeft:"auto"}}/>}
                {!sel&&<div style={{marginLeft:"auto",width:8,height:8,borderRadius:"50%",background:cor}}/>}
              </div>
            );
          })}
        </div>
      </div>
    </div>}

    {recErr&&<div style={{margin:"0 14px 8px",padding:"10px 14px",borderRadius:12,background:G.redL,border:`1px solid ${G.red}44`,fontSize:12,color:G.red}}>{recErr}</div>}
    {msgs.length<=2&&!isRec&&<div style={{display:"flex",gap:8,overflowX:"auto",padding:"4px 14px 8px",flexShrink:0}}>{SUGS.map(s=><div key={s} onClick={()=>send(s)} className="press" style={{padding:"8px 14px",borderRadius:20,background:G.card2,border:`1px solid ${G.border}`,fontSize:12,color:G.muted,cursor:"pointer",whiteSpace:"nowrap",flexShrink:0}}>{s}</div>)}</div>}
    <div style={{padding:"10px 12px",background:G.card,borderTop:`1px solid ${G.border}`,flexShrink:0}}>
      {isRec?(<div style={{display:"flex",alignItems:"center",gap:12}}>
        <div style={{width:44,height:44,borderRadius:"50%",flexShrink:0,background:G.redL,border:`2px solid ${G.red}`,display:"flex",alignItems:"center",justifyContent:"center",fontSize:20}}>🎙</div>
        <div style={{flex:1}}><div style={{fontSize:13,fontWeight:700,color:G.red}}>Gravando...</div><div style={{fontSize:12,color:G.muted}}>{fmtS(recSec)}</div></div>
        <button onClick={stopRec} className="press" style={{padding:"10px 16px",borderRadius:22,border:"none",cursor:"pointer",background:G.accent,color:"#fff",fontSize:13,fontWeight:700}}>Enviar</button>
        <button onClick={cancelRec} className="press" style={{width:36,height:36,borderRadius:"50%",border:`1px solid ${G.border}`,background:"none",color:G.muted,cursor:"pointer",display:"flex",alignItems:"center",justifyContent:"center"}}>
          <Ic d={ICON.x} size={16}/>
        </button>
      </div>):(<div style={{display:"flex",gap:8,alignItems:"flex-end"}}>
        <button onClick={()=>{if(!isPremium&&onUpgrade){onUpgrade();return;}startRec();}} disabled={busy||isProc||photoLoading} className="press"
          style={{width:44,height:44,borderRadius:"50%",border:`1px solid ${isPremium?G.border:G.accent+"44"}`,background:isPremium?"none":G.accent+"11",cursor:"pointer",display:"flex",alignItems:"center",justifyContent:"center",flexShrink:0,color:isPremium?G.muted:G.accent,position:"relative"}}>
          <Ic d="M12 1a3 3 0 00-3 3v8a3 3 0 006 0V4a3 3 0 00-3-3zM19 10v2a7 7 0 01-14 0v-2M12 19v4M8 23h8" size={20}/>
          {!isPremium&&<span style={{position:"absolute",top:-4,right:-4,fontSize:9,background:G.accent,color:"#fff",borderRadius:8,padding:"1px 4px",fontWeight:700}}>PRO</span>}
        </button>
        <button onClick={()=>{if(!isPremium&&onUpgrade){onUpgrade();return;}photoRef.current?.click();}} disabled={busy||isProc||photoLoading} className="press"
          style={{width:44,height:44,borderRadius:"50%",border:`1px solid ${isPremium?G.border:G.accent+"44"}`,background:isPremium?"none":G.accent+"11",cursor:"pointer",display:"flex",alignItems:"center",justifyContent:"center",flexShrink:0,color:isPremium?G.muted:G.accent,position:"relative"}}>
          <Ic d={ICON.camera} size={20}/>
          {!isPremium&&<span style={{position:"absolute",top:-4,right:-4,fontSize:9,background:G.accent,color:"#fff",borderRadius:8,padding:"1px 4px",fontWeight:700}}>PRO</span>}
        </button>
        <input ref={photoRef} type="file" accept="image/*" capture="environment" style={{display:"none"}}
          onChange={e=>{const f=e.target.files?.[0];if(f)sendPhoto(f);e.target.value="";}}/>
        <textarea ref={inpRef} value={input} onChange={e=>{setInput(e.target.value);e.target.style.height="auto";e.target.style.height=Math.min(e.target.scrollHeight,120)+"px";}}
          onKeyDown={e=>{if(e.key==="Enter"&&!e.shiftKey){e.preventDefault();send();}}}
          placeholder="Ex: Gastei 50 no mercado..." rows={1}
          style={{flex:1,resize:"none",padding:"12px 14px",borderRadius:22,border:`1px solid ${G.border}`,background:G.card2,color:G.text,fontSize:14,outline:"none",lineHeight:1.4,fontFamily:"'Figtree',sans-serif",overflowY:"hidden"}}/>
        <button onClick={()=>send()} disabled={!input.trim()||busy||photoLoading} className="press" style={{width:44,height:44,borderRadius:"50%",border:"none",cursor:"pointer",background:G.accent,color:"#fff",display:"flex",alignItems:"center",justifyContent:"center",flexShrink:0}}>
          <Ic d={ICON.arrow_up} size={20}/>
        </button>
      </div>)}
    </div>
  </div>);
}


// ─── BUSCA VIEW ──────────────────────────────────────────────────────────────
function BuscaView({lancs,onDelete,isPremium=false,onUpgrade}){
  const [q,setQ]=useState("");
  const [filtTipo,setFiltTipo]=useState("Todos");
  const [filtCat,setFiltCat]=useState("Todas");
  const [filtMes,setFiltMes]=useState("Todos");
  const [sortBy,setSortBy]=useState("data"); // data | valor

  const lancsVisiveis=isPremium?lancs:(()=>{
    const limite=new Date();limite.setMonth(limite.getMonth()-3);
    return lancs.filter(l=>new Date(l.data)>=limite);
  })();
  const meses=[...new Set(lancsVisiveis.map(l=>getMes(l.data)))].filter(Boolean).sort().reverse();
  const cats=[...new Set(lancsVisiveis.map(l=>l.cat))].filter(Boolean).sort();

  const resultado=lancsVisiveis.filter(l=>{
    const nq=q.trim().toLowerCase();
    if(nq&&!`${l.desc||""} ${l.cat||""} ${l.forma||""} ${l.valor}`.toLowerCase().includes(nq))return false;
    if(filtTipo!=="Todos"&&l.tipo!==filtTipo)return false;
    if(filtCat!=="Todas"&&l.cat!==filtCat)return false;
    if(filtMes!=="Todos"&&getMes(l.data)!==filtMes)return false;
    return true;
  }).sort((a,b)=>{
    if(sortBy==="valor")return b.valor-a.valor;
    return b.data.localeCompare(a.data);
  });

  const totalR=resultado.filter(l=>l.tipo==="Receita").reduce((s,l)=>s+l.valor,0);
  const totalD=resultado.filter(l=>l.tipo==="Despesa").reduce((s,l)=>s+l.valor,0);

  return(<div style={{padding:"16px 14px 32px",display:"flex",flexDirection:"column",gap:12}}>

    {/* search input */}
    <div style={{position:"relative"}}>
      <div style={{position:"absolute",left:12,top:"50%",transform:"translateY(-50%)",pointerEvents:"none"}}>
        <Ic d={ICON.search||"M21 21l-4.35-4.35M17 11A6 6 0 115 11a6 6 0 0112 0z"} size={16} color={G.muted}/>
      </div>
      <input value={q} onChange={e=>setQ(e.target.value)} placeholder="Buscar por descrição, categoria, valor..."
        className="inp" style={{width:"100%",paddingLeft:36,fontSize:14}}/>
      {q&&<button onClick={()=>setQ("")} style={{position:"absolute",right:10,top:"50%",transform:"translateY(-50%)",background:"none",border:"none",color:G.muted,cursor:"pointer",fontSize:18}}>×</button>}
    </div>

    {/* filtros */}
    <div style={{display:"flex",gap:6,overflowX:"auto",scrollbarWidth:"none",paddingBottom:2}}>
      {["Todos","Receita","Despesa"].map(t=>(
        <button key={t} onClick={()=>setFiltTipo(t)} className="press"
          style={{padding:"5px 12px",borderRadius:20,border:`1px solid ${filtTipo===t?G.accent:G.border}`,
            background:filtTipo===t?G.accentL:"transparent",
            color:filtTipo===t?G.accent:G.muted,fontSize:12,cursor:"pointer",flexShrink:0,fontWeight:filtTipo===t?700:400}}>
          {t}
        </button>
      ))}
      <div style={{width:1,background:G.border,flexShrink:0,margin:"0 2px"}}/>
      <select value={filtCat} onChange={e=>setFiltCat(e.target.value)}
        style={{padding:"5px 10px",borderRadius:20,border:`1px solid ${filtCat!=="Todas"?G.accent:G.border}`,
          background:filtCat!=="Todas"?G.accentL:G.card2,color:filtCat!=="Todas"?G.accent:G.muted,
          fontSize:12,cursor:"pointer",flexShrink:0,outline:"none"}}>
        <option value="Todas">Categoria</option>
        {cats.map(c=><option key={c} value={c}>{c}</option>)}
      </select>
      <select value={filtMes} onChange={e=>setFiltMes(e.target.value)}
        style={{padding:"5px 10px",borderRadius:20,border:`1px solid ${filtMes!=="Todos"?G.accent:G.border}`,
          background:filtMes!=="Todos"?G.accentL:G.card2,color:filtMes!=="Todos"?G.accent:G.muted,
          fontSize:12,cursor:"pointer",flexShrink:0,outline:"none"}}>
        <option value="Todos">Mês</option>
        {meses.map(m=>{const[y,mm]=m.split("-");return<option key={m} value={m}>{MESES[parseInt(mm)-1]} {y}</option>;})}
      </select>
    </div>

    {/* sort + summary */}
    <div style={{display:"flex",alignItems:"center",justifyContent:"space-between"}}>
      <div style={{fontSize:12,color:G.muted}}>{resultado.length} resultado{resultado.length!==1?"s":""}</div>
      <div style={{display:"flex",gap:6}}>
        {[["data","📅 Data"],["valor","💰 Valor"]].map(([k,l])=>(
          <button key={k} onClick={()=>setSortBy(k)} className="press"
            style={{padding:"4px 10px",borderRadius:12,border:`1px solid ${sortBy===k?G.accent:G.border}`,
              background:sortBy===k?G.accentL:"transparent",color:sortBy===k?G.accent:G.muted,
              fontSize:11,cursor:"pointer",fontWeight:sortBy===k?700:400}}>
            {l}
          </button>
        ))}
      </div>
    </div>

    {/* totais */}
    {resultado.length>0&&<div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:8}}>
      {totalR>0&&<div style={{background:G.green+"12",border:`1px solid ${G.green}33`,borderRadius:12,padding:"10px 12px"}}>
        <div style={{fontSize:10,color:G.muted,fontWeight:700,textTransform:"uppercase",letterSpacing:.8}}>Receitas</div>
        <div style={{fontFamily:"'Fraunces',serif",fontSize:16,fontWeight:700,color:G.green,marginTop:2}}>{fmt(totalR)}</div>
      </div>}
      {totalD>0&&<div style={{background:G.red+"12",border:`1px solid ${G.red}33`,borderRadius:12,padding:"10px 12px"}}>
        <div style={{fontSize:10,color:G.muted,fontWeight:700,textTransform:"uppercase",letterSpacing:.8}}>Despesas</div>
        <div style={{fontFamily:"'Fraunces',serif",fontSize:16,fontWeight:700,color:G.red,marginTop:2}}>{fmt(totalD)}</div>
      </div>}
    </div>}

    {/* lista */}
    {resultado.length===0?(
      <div style={{textAlign:"center",padding:"40px 0",color:G.muted}}>
        <div style={{fontSize:36,marginBottom:8}}>🔍</div>
        <div style={{fontSize:14}}>{q||filtTipo!=="Todos"||filtCat!=="Todas"||filtMes!=="Todos"?"Nenhum resultado encontrado":"Nenhum lançamento ainda"}</div>
        {(q||filtTipo!=="Todos"||filtCat!=="Todas"||filtMes!=="Todos")&&<button onClick={()=>{setQ("");setFiltTipo("Todos");setFiltCat("Todas");setFiltMes("Todos");}}
          style={{marginTop:12,padding:"8px 16px",borderRadius:12,border:`1px solid ${G.border}`,background:"none",color:G.accent,cursor:"pointer",fontSize:13}}>
          Limpar filtros
        </button>}
      </div>
    ):(
      <div style={{display:"flex",flexDirection:"column",gap:8}}>
        {resultado.map(l=>{
          const cor=l.tipo==="Receita"?G.green:G.red;
          const catCor=CAT_COLORS[l.cat]||G.muted;
          const hl=q.trim().toLowerCase();
          function highlight(text){
            if(!hl||!text)return text;
            const idx=text.toLowerCase().indexOf(hl);
            if(idx<0)return text;
            return<>{text.slice(0,idx)}<mark style={{background:G.accent+"44",color:G.accent,borderRadius:3,padding:"0 2px"}}>{text.slice(idx,idx+hl.length)}</mark>{text.slice(idx+hl.length)}</>;
          }
          return(
            <div key={l.id} style={{background:G.card,border:`1px solid ${G.border}`,borderRadius:14,padding:"12px 14px",display:"flex",alignItems:"center",gap:12}}>
              <div style={{width:38,height:38,borderRadius:12,background:catCor+"20",display:"flex",alignItems:"center",justifyContent:"center",fontSize:18,flexShrink:0}}>
                {CAT_EMOJI[l.cat]||"💰"}
              </div>
              <div style={{flex:1,minWidth:0}}>
                <div style={{fontSize:13,fontWeight:600,color:G.text,overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap"}}>{highlight(l.desc||l.cat)}</div>
                <div style={{display:"flex",gap:6,alignItems:"center",marginTop:3,flexWrap:"wrap"}}>
                  <span style={{fontSize:10,padding:"1px 6px",borderRadius:8,background:catCor+"20",color:catCor,fontWeight:600}}>{highlight(l.cat)}</span>
                  <span style={{fontSize:10,color:G.muted}}>{fmtD(l.data)}</span>
                  {l.forma&&<span style={{fontSize:10,color:G.muted}}>· {l.forma}</span>}
                </div>
              </div>
              <div style={{textAlign:"right",flexShrink:0}}>
                <div style={{fontFamily:"'Fraunces',serif",fontSize:15,fontWeight:700,color:cor}}>{l.tipo==="Receita"?"+":"-"}{fmt(l.valor)}</div>
              </div>
            </div>
          );
        })}
      </div>
    )}
  </div>);
}

// ─── IMPORTAR VIEW ────────────────────────────────────────────────────────────
function ImportarView({uid,lancs,showT}){
  const [csv,setCsv]=useState("");
  const [preview,setPreview]=useState([]);
  const [importing,setImporting]=useState(false);

  function parseCsv(text){
    const lines=text.trim().split("\n").filter(l=>l.trim());
    if(lines.length<2)return[];
    const header=lines[0].split(",").map(h=>h.trim().toLowerCase().replace(/["\']/g,""));
    return lines.slice(1).map(line=>{
      const cols=line.split(",").map(c=>c.trim().replace(/["\']/g,""));
      const obj={};
      header.forEach((h,i)=>obj[h]=cols[i]||"");
      return{
        data:obj.data||obj.date||today(),
        desc:obj.desc||obj.descricao||obj.description||obj.memo||"Importado",
        valor:parseFloat((obj.valor||obj.value||obj.amount||"0").replace(",","."))||0,
        tipo:(obj.tipo||obj.type||"").toLowerCase().includes("rec")?"Receita":"Despesa",
        cat:obj.cat||obj.categoria||obj.category||"Outros",
        forma:obj.forma||obj.method||"Transferência",
      };
    }).filter(r=>r.valor>0);
  }

  async function importar(){
    if(!preview.length)return;
    setImporting(true);
    try{
      for(const l of preview){
        await addDoc(collection(db,"users",uid,"lancamentos"),l);
      }
      showT(`${preview.length} lançamentos importados!`);
      setCsv("");setPreview([]);
    }catch(e){alert("Erro ao importar: "+e.message);}
    setImporting(false);
  }

  return(<div style={{padding:"16px 14px 32px",display:"flex",flexDirection:"column",gap:16}}>
    <div style={{background:G.card,border:`1px solid ${G.border}`,borderRadius:16,padding:20}}>
      <div style={{fontSize:13,fontWeight:700,marginBottom:12}}>Importar CSV</div>
      <div style={{fontSize:12,color:G.muted,marginBottom:12,lineHeight:1.6}}>
        Cole o conteúdo do seu CSV abaixo. O arquivo deve ter colunas: <b>data, desc, valor, tipo</b>
      </div>
      <textarea value={csv} onChange={e=>{setCsv(e.target.value);setPreview(parseCsv(e.target.value));}}
        placeholder="data,desc,valor,tipo\n2024-01-15,Mercado,150.00,Despesa"
        className="inp" style={{width:"100%",minHeight:120,resize:"vertical",fontSize:12}}/>
      {preview.length>0&&<>
        <div style={{fontSize:12,color:G.green,marginTop:8,marginBottom:8}}>
          ✓ {preview.length} lançamentos encontrados
        </div>
        <div style={{maxHeight:200,overflowY:"auto",display:"flex",flexDirection:"column",gap:6}}>
          {preview.slice(0,10).map((l,i)=>(
            <div key={i} style={{display:"flex",justifyContent:"space-between",fontSize:12,
              padding:"6px 10px",background:G.card2,borderRadius:8}}>
              <span>{l.desc}</span>
              <span style={{color:l.tipo==="Receita"?G.green:G.red,fontWeight:600}}>
                {l.tipo==="Receita"?"+":"-"}{fmt(l.valor)}
              </span>
            </div>
          ))}
          {preview.length>10&&<div style={{fontSize:11,color:G.muted,textAlign:"center"}}>
            +{preview.length-10} mais...
          </div>}
        </div>
        <button onClick={importar} disabled={importing} className="press"
          style={{width:"100%",marginTop:12,padding:14,borderRadius:14,border:"none",
            background:G.accent,color:"#fff",fontSize:14,fontWeight:700,cursor:"pointer"}}>
          {importing?"Importando...":"Importar "+preview.length+" lançamentos"}
        </button>
      </>}
    </div>
    <div style={{background:G.card,border:`1px solid ${G.border}`,borderRadius:16,padding:20}}>
      <div style={{fontSize:13,fontWeight:700,marginBottom:8}}>Lançamentos recentes</div>
      {lancs.slice(0,10).map(l=>(
        <div key={l.id} style={{display:"flex",justifyContent:"space-between",
          padding:"8px 0",borderBottom:`1px solid ${G.border}`}}>
          <div>
            <div style={{fontSize:13}}>{l.desc}</div>
            <div style={{fontSize:11,color:G.muted}}>{fmtD(l.data)}</div>
          </div>
          <div style={{color:l.tipo==="Receita"?G.green:G.red,fontWeight:700,fontSize:13}}>
            {l.tipo==="Receita"?"+":"-"}{fmt(l.valor)}
          </div>
        </div>
      ))}
    </div>
  </div>);
}

// ─── FAMÍLIA / CASAL VIEW ──────────────────────────────────────────────────────
// ─── CARTÕES VIEW ────────────────────────────────────────────────────────────
function CartoesView({uid,lancs,isPremium=false,onUpgrade}){
  const [cartoes,setCartoes]=useState([]);
  const [adding,setAdding]=useState(false);
  const [form,setForm]=useState({nome:"",limite:"",vencimento:"",cor:"#7C6AF7"});
  const [saving,setSaving]=useState(false);
  const [confirmDel,setConfirmDel]=useState(null); // id do cartão a deletar

  useEffect(()=>{
    if(!uid)return;
    const unsub=onSnapshot(collection(db,"users",uid,"cartoes"),snap=>{
      setCartoes(snap.docs.map(d=>({id:d.id,...d.data()})));
    });
    return()=>unsub();
  },[uid]);

  async function salvarCartao(){
    if(!form.nome.trim())return;
    if(!isPremium&&cartoes.length>=1){onUpgrade&&onUpgrade();return;}
    setSaving(true);
    try{
      await addDoc(collection(db,"users",uid,"cartoes"),{
        nome:form.nome.trim(),
        limite:parseFloat(form.limite)||0,
        vencimento:parseInt(form.vencimento)||10,
        cor:form.cor,
        criadoEm:today(),
      });
      setForm({nome:"",limite:"",vencimento:"",cor:"#7C6AF7"});
      setAdding(false);
    }catch(e){alert("Erro: "+e.message);}
    setSaving(false);
  }

  async function deletarCartao(id){
    try{await deleteDoc(doc(db,"users",uid,"cartoes",id));setConfirmDel(null);}catch(e){setConfirmDel(null);}
  }

  const CORES=["#7C6AF7","#2ECC8E","#FF5C6A","#4A9EFF","#F5C842","#FF8C42","#E040FB","#00BCD4"];

  return(<div style={{padding:"16px 14px 32px",display:"flex",flexDirection:"column",gap:14}}>

    {/* Header */}
    <div style={{display:"flex",alignItems:"center",justifyContent:"space-between"}}>
      <div style={{fontFamily:"'Fraunces',serif",fontSize:20,fontWeight:700,color:G.text}}>Cartões de Crédito</div>
      <button onClick={()=>{if(!isPremium&&cartoes.length>=1){onUpgrade&&onUpgrade();return;}setAdding(v=>!v);}} className="press"
        style={{width:36,height:36,borderRadius:10,border:"none",background:G.accent,color:"#fff",cursor:"pointer",display:"flex",alignItems:"center",justifyContent:"center",position:"relative"}}>
        <Ic d={adding?ICON.x:ICON.plus} size={18}/>
      </button>
    </div>

    {/* Add form */}
    {adding&&<div style={{background:G.card,border:`1px solid ${G.border}`,borderRadius:18,padding:16,display:"flex",flexDirection:"column",gap:12}}>
      <div style={{fontSize:13,fontWeight:700,color:G.text}}>Novo cartão</div>
      {[
        {l:"Nome do cartão",k:"nome",ph:"Ex: Nubank, Itaú..."},
        {l:"Limite (R$)",k:"limite",ph:"5000",type:"number"},
        {l:"Dia do vencimento",k:"vencimento",ph:"10",type:"number"},
      ].map(({l,k,ph,type})=>(
        <div key={k}>
          <div style={{fontSize:11,color:G.muted,marginBottom:4}}>{l}</div>
          <input value={form[k]} onChange={e=>setForm(f=>({...f,[k]:e.target.value}))}
            placeholder={ph} type={type||"text"} className="inp" style={{width:"100%"}}/>
        </div>
      ))}
      <div>
        <div style={{fontSize:11,color:G.muted,marginBottom:6}}>Cor</div>
        <div style={{display:"flex",gap:8,flexWrap:"wrap"}}>
          {CORES.map(cor=>(
            <button key={cor} onClick={()=>setForm(f=>({...f,cor}))}
              style={{width:28,height:28,borderRadius:"50%",background:cor,border:`3px solid ${form.cor===cor?"#fff":"transparent"}`,cursor:"pointer",outline:form.cor===cor?`2px solid ${cor}`:"none"}}/>
          ))}
        </div>
      </div>
      <div style={{display:"flex",gap:8}}>
        <button onClick={salvarCartao} disabled={saving} className="press"
          style={{flex:1,padding:"11px",borderRadius:12,border:"none",background:G.accent,color:"#fff",fontSize:13,fontWeight:700,cursor:"pointer"}}>
          {saving?"Salvando...":"Adicionar"}
        </button>
        <button onClick={()=>setAdding(false)} className="press"
          style={{padding:"11px 14px",borderRadius:12,border:`1px solid ${G.border}`,background:"none",color:G.muted,cursor:"pointer"}}>Cancelar</button>
      </div>
    </div>}

    {/* Cards list */}
    {cartoes.length===0&&!adding&&<div style={{textAlign:"center",padding:"48px 0",color:G.muted}}>
      <div style={{fontSize:40,marginBottom:8}}>💳</div>
      <div style={{fontSize:14}}>Nenhum cartão cadastrado</div>
      <div style={{fontSize:12,marginTop:4}}>Toque em + para adicionar</div>
    </div>}

    {cartoes.map(k=>{
      const gastos=lancs.filter(l=>l.cartao===k.id||l.cartao===k.nome).reduce((s,l)=>s+l.valor,0);
      const pct=k.limite>0?Math.min(gastos/k.limite,1):0;
      const restante=(k.limite||0)-gastos;
      const corBarra=pct>.85?G.red:pct>.6?G.yellow:G.green;
      return(
        <div key={k.id} style={{background:G.card,border:`1px solid ${G.border}`,borderRadius:20,overflow:"hidden"}}>
          {/* card visual */}
          <div style={{background:`linear-gradient(135deg,${k.cor}dd,${k.cor}88)`,padding:"20px 18px 16px",position:"relative"}}>
            <div style={{position:"absolute",top:-20,right:-20,width:100,height:100,borderRadius:"50%",background:"rgba(255,255,255,.08)"}}/>
            <div style={{position:"absolute",bottom:-30,right:20,width:80,height:80,borderRadius:"50%",background:"rgba(255,255,255,.06)"}}/>
            <div style={{fontFamily:"'Fraunces',serif",fontSize:17,fontWeight:700,color:"#fff",marginBottom:12}}>{k.nome}</div>
            <div style={{display:"flex",justifyContent:"space-between",alignItems:"flex-end"}}>
              <div>
                <div style={{fontSize:10,color:"rgba(255,255,255,.6)",fontWeight:600,textTransform:"uppercase",letterSpacing:.8}}>Gasto</div>
                <div style={{fontFamily:"'Fraunces',serif",fontSize:20,fontWeight:700,color:"#fff"}}>{fmt(gastos)}</div>
              </div>
              {k.limite>0&&<div style={{textAlign:"right"}}>
                <div style={{fontSize:10,color:"rgba(255,255,255,.6)",fontWeight:600,textTransform:"uppercase",letterSpacing:.8}}>Limite</div>
                <div style={{fontSize:14,fontWeight:600,color:"rgba(255,255,255,.8)"}}>{fmt(k.limite)}</div>
              </div>}
            </div>
          </div>
          {/* barra uso */}
          {k.limite>0&&<div style={{padding:"12px 18px"}}>
            <div style={{height:6,background:G.border,borderRadius:6,overflow:"hidden",marginBottom:6}}>
              <div style={{height:"100%",width:`${pct*100}%`,background:corBarra,borderRadius:6,transition:"width .4s"}}/>
            </div>
            <div style={{display:"flex",justifyContent:"space-between",fontSize:11}}>
              <span style={{color:G.muted}}>{Math.round(pct*100)}% usado</span>
              <span style={{color:restante>=0?G.green:G.red,fontWeight:600}}>
                {restante>=0?`${fmt(restante)} disponível`:`Estourou ${fmt(-restante)}`}
              </span>
            </div>
          </div>}
          {/* vencimento + delete */}
          <div style={{padding:"0 18px 14px",display:"flex",alignItems:"center",justifyContent:"space-between"}}>
            {k.vencimento&&<div style={{fontSize:12,color:G.muted}}>📅 Vence dia {k.vencimento}</div>}
            {confirmDel===k.id
              ?<div style={{display:"flex",gap:6,marginLeft:"auto"}}>
                <button onClick={()=>deletarCartao(k.id)} className="press"
                  style={{padding:"6px 12px",borderRadius:10,border:`1px solid ${G.red}`,background:G.red,color:"#fff",fontSize:12,cursor:"pointer",fontWeight:700}}>
                  Confirmar
                </button>
                <button onClick={()=>setConfirmDel(null)} className="press"
                  style={{padding:"6px 12px",borderRadius:10,border:`1px solid ${G.border}`,background:"none",color:G.muted,fontSize:12,cursor:"pointer"}}>
                  Cancelar
                </button>
              </div>
              :<button onClick={()=>setConfirmDel(k.id)} className="press"
                style={{padding:"6px 12px",borderRadius:10,border:`1px solid ${G.red}44`,background:G.red+"11",color:G.red,fontSize:12,cursor:"pointer",marginLeft:"auto"}}>
                🗑 Deletar
              </button>
            }
          </div>
          {/* últimas transações */}
          {(()=>{
            const txs=lancs.filter(l=>l.cartao===k.id||l.cartao===k.nome).slice(0,3);
            if(!txs.length)return null;
            return(<div style={{borderTop:`1px solid ${G.border}`,padding:"10px 18px 14px"}}>
              <div style={{fontSize:11,color:G.muted,fontWeight:700,textTransform:"uppercase",letterSpacing:.8,marginBottom:8}}>Últimas transações</div>
              {txs.map(l=>(
                <div key={l.id} style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:6}}>
                  <div>
                    <div style={{fontSize:12,color:G.text}}>{l.desc}</div>
                    <div style={{fontSize:10,color:G.muted}}>{fmtD(l.data)}</div>
                  </div>
                  <div style={{fontSize:13,fontWeight:700,color:G.red}}>-{fmt(l.valor)}</div>
                </div>
              ))}
            </div>);
          })()}
        </div>
      );
    })}
  </div>);
}

// ─── UPGRADE VIEW ────────────────────────────────────────────────────────────
function UpgradeView({uid,plano,destaque="",onActivate}){
  const isPrem=plano==="premium";

  const FREE_FEATURES=[
    {icon:"📊",txt:"Dashboard completo do mês atual"},
    {icon:"✍️",txt:"Lançamentos manuais ilimitados"},
    {icon:"💬",txt:"IA por texto — 30 msgs/mês"},
    {icon:"💳",txt:"1 cartão de crédito"},
    {icon:"📅",txt:"Histórico de 3 meses"},
  ];
  const PREMIUM_FEATURES=[
    {icon:"♾️",txt:"Tudo do gratuito sem limites"},
    {icon:"🎤",txt:"IA por voz — transcrição automática"},
    {icon:"📷",txt:"IA por foto — leia comprovantes"},
    {icon:"💳",txt:"Cartões ilimitados"},
    {icon:"📅",txt:"Histórico completo"},
    {icon:"📤",txt:"Exportar dados (CSV/PDF)"},
    {icon:"📲",txt:"Relatórios via WhatsApp (em breve)"},
    {icon:"🏦",txt:"Open Finance — conexão bancária (em breve)"},
  ];

  const [ativando,setAtivando]=useState(false);
  const [ativErr,setAtivErr]=useState("");
  async function ativarTeste(){
    if(!uid){setAtivErr("Usuário não identificado.");return;}
    setAtivando(true);setAtivErr("");
    try{
      const ref=doc(db,"users",uid,"perfil","dados");
      await setDoc(ref,{plano:"premium",ativadoEm:new Date().toISOString()},{merge:true});
      const snap=await getDoc(ref);
      console.log("[UpgradeView] plano salvo:",snap.data());
      if(onActivate)onActivate("premium");
    }catch(e){
      console.error("[UpgradeView] Erro ao ativar:",e);
      setAtivErr("Erro ao salvar: "+e.message);
    }
    setAtivando(false);
  }

  return(<div style={{padding:"16px 14px 40px",display:"flex",flexDirection:"column",gap:16}}>

    {/* Header */}
    {destaque&&(()=>{
      const info={carreira:["🚀","Perfil & Carreira","Acompanhe seu crescimento profissional"],cartoes:["💳","Cartões de Crédito","Gerencie todos os seus cartões"],contatos:["👥","Contatos","Divida gastos com seus contatos"],casal:["💑","Modo Casal","Finanças compartilhadas"],divisoes:["🤝","Divisão de Contas","Divida contas com amigos"],busca:["🔍","Busca Avançada","Encontre qualquer lançamento"],importar:["📥","Importar Extrato","Importe seus extratos CSV"],financas:["📊","Relatórios","Orçamentos e análises"]}[destaque];
      if(!info)return null;
      return(<div style={{background:`linear-gradient(135deg,${G.accent}22,${G.accent}08)`,border:`1px solid ${G.accent}44`,borderRadius:16,padding:"14px 16px",display:"flex",alignItems:"center",gap:12,marginBottom:4}}>
        <span style={{fontSize:28}}>{info[0]}</span>
        <div>
          <div style={{fontSize:11,color:G.accent,fontWeight:700,textTransform:"uppercase",letterSpacing:.8,marginBottom:2}}>Recurso Premium</div>
          <div style={{fontSize:14,fontWeight:700,color:G.text}}>{info[1]}</div>
          <div style={{fontSize:12,color:G.muted}}>{info[2]}</div>
        </div>
      </div>);
    })()}
    <div style={{textAlign:"center",padding:"8px 0 4px"}}>
      <div style={{fontSize:36,marginBottom:6}}>✨</div>
      <div style={{fontFamily:"'Fraunces',serif",fontSize:24,fontWeight:700,color:G.text}}>Planos</div>
      <div style={{fontSize:13,color:G.muted,marginTop:4}}>Escolha o melhor para você</div>
    </div>

    {/* Status atual */}
    {isPrem&&<div style={{background:`linear-gradient(135deg,${G.accent}22,${G.accent}11)`,border:`1px solid ${G.accent}44`,borderRadius:16,padding:"14px 16px",display:"flex",alignItems:"center",gap:10}}>
      <span style={{fontSize:22}}>👑</span>
      <div>
        <div style={{fontSize:13,fontWeight:700,color:G.accent}}>Você é Premium!</div>
        <div style={{fontSize:12,color:G.muted}}>Aproveite todos os recursos</div>
      </div>
    </div>}

    {/* Card Gratuito */}
    <div style={{background:G.card,border:`1px solid ${!isPrem?G.accent:G.border}`,borderRadius:20,padding:"18px 16px",position:"relative"}}>
      {!isPrem&&<div style={{position:"absolute",top:-10,left:20,background:G.accent,color:"#fff",fontSize:10,fontWeight:700,padding:"3px 12px",borderRadius:20,letterSpacing:.8}}>PLANO ATUAL</div>}
      <div style={{display:"flex",justifyContent:"space-between",alignItems:"flex-start",marginBottom:14}}>
        <div>
          <div style={{fontFamily:"'Fraunces',serif",fontSize:18,fontWeight:700,color:G.text}}>Gratuito</div>
          <div style={{fontSize:22,fontWeight:700,color:G.text,marginTop:2}}>R$ 0<span style={{fontSize:13,color:G.muted,fontWeight:400}}>/mês</span></div>
        </div>
        <span style={{fontSize:28}}>🌱</span>
      </div>
      {FREE_FEATURES.map((f,i)=>(
        <div key={i} style={{display:"flex",alignItems:"center",gap:8,marginBottom:7}}>
          <span style={{fontSize:16,width:22,textAlign:"center"}}>{f.icon}</span>
          <span style={{fontSize:13,color:G.muted}}>{f.txt}</span>
        </div>
      ))}
    </div>

    {/* Card Premium */}
    <div style={{background:`linear-gradient(145deg,${G.accent}18,${G.card})`,border:`1px solid ${G.accent}55`,borderRadius:20,padding:"18px 16px",position:"relative"}}>
      {isPrem&&<div style={{position:"absolute",top:-10,left:20,background:G.accent,color:"#fff",fontSize:10,fontWeight:700,padding:"3px 12px",borderRadius:20,letterSpacing:.8}}>PLANO ATUAL</div>}
      <div style={{display:"flex",justifyContent:"space-between",alignItems:"flex-start",marginBottom:14}}>
        <div>
          <div style={{fontFamily:"'Fraunces',serif",fontSize:18,fontWeight:700,color:G.text}}>Premium</div>
          <div style={{fontSize:22,fontWeight:700,color:G.accent,marginTop:2}}>R$ 19,90<span style={{fontSize:13,color:G.muted,fontWeight:400}}>/mês</span></div>
        </div>
        <span style={{fontSize:28}}>👑</span>
      </div>
      {PREMIUM_FEATURES.map((f,i)=>(
        <div key={i} style={{display:"flex",alignItems:"center",gap:8,marginBottom:7}}>
          <span style={{fontSize:16,width:22,textAlign:"center"}}>{f.icon}</span>
          <span style={{fontSize:13,color:G.text}}>{f.txt}</span>
          {f.txt.includes("em breve")&&<span style={{fontSize:10,padding:"1px 6px",borderRadius:8,background:G.yellow+"22",color:G.yellow,fontWeight:600,marginLeft:"auto",flexShrink:0}}>em breve</span>}
        </div>
      ))}
      {!isPrem&&<>
        {ativErr&&<div style={{fontSize:12,color:G.red,textAlign:"center",padding:"6px 0"}}>{ativErr}</div>}
        <button onClick={ativarTeste} disabled={ativando} className="press"
          style={{width:"100%",marginTop:14,padding:"14px",borderRadius:14,border:"none",
            background:ativando?"#555":`linear-gradient(135deg,${G.accent},#9C6AF7)`,
            color:"#fff",fontSize:15,fontWeight:700,cursor:ativando?"not-allowed":"pointer",
            boxShadow:`0 4px 20px ${G.accent}44`}}>
          {ativando?"Ativando...":"✨ Ativar Premium (teste grátis)"}
        </button>
      </>}
    </div>

    <div style={{fontSize:11,color:G.muted,textAlign:"center",lineHeight:1.6}}>
      Pagamentos em breve via Stripe / Mercado Pago.<br/>
      Por ora, use o botão acima para testar gratuitamente.
    </div>
  </div>);
}

// ─── LOGIN SCREEN ─────────────────────────────────────────────────────────────
function LoginScreen({onGoogle,onApple,onEmail,loading,error}){
  const [modo,setModo]=useState(""); // ""|"login"|"cadastro"
  const [email,setEmail]=useState("");
  const [senha,setSenha]=useState("");
  const [nome,setNome]=useState("");
  const [emailErr,setEmailErr]=useState("");

  async function handleEmail(){
    if(!email.includes("@")){setEmailErr("Email inválido");return;}
    if(senha.length<6){setEmailErr("Senha mínimo 6 caracteres");return;}
    setEmailErr("");
    onEmail(email,senha,modo==="cadastro"?nome:null);
  }

  return(
    <div style={{minHeight:"100vh",display:"flex",flexDirection:"column",alignItems:"center",justifyContent:"center",
      background:"linear-gradient(145deg,#0a0a12 0%,#0e0c1e 50%,#0a1020 100%)",padding:"24px",position:"relative",overflow:"hidden"}}>
      <style>{".login-inp::placeholder{color:rgba(255,255,255,.3)}"}</style>
      {/* blobs */}
      <div style={{position:"absolute",top:-100,left:-100,width:400,height:400,borderRadius:"50%",background:"radial-gradient(circle,rgba(124,106,247,.15),transparent 65%)",pointerEvents:"none"}}/>
      <div style={{position:"absolute",bottom:-100,right:-80,width:300,height:300,borderRadius:"50%",background:"radial-gradient(circle,rgba(46,204,142,.1),transparent 65%)",pointerEvents:"none"}}/>

      <div style={{width:"100%",maxWidth:380,position:"relative"}}>
        {/* Logo */}
        <div style={{textAlign:"center",marginBottom:36}}>
          <div style={{fontFamily:"'Fraunces',serif",fontSize:38,fontWeight:700,color:"#fff",marginBottom:6}}>
            fin<span style={{color:"#7C6AF7"}}>ance</span>
          </div>
          <div style={{fontSize:14,color:"rgba(255,255,255,.4)"}}>Controle financeiro inteligente</div>
        </div>

        {error&&<div style={{background:"rgba(255,92,106,.15)",border:"1px solid rgba(255,92,106,.3)",borderRadius:12,padding:"10px 14px",marginBottom:16,fontSize:13,color:"#FF5C6A"}}>{error}</div>}

        {modo===""&&(
          <div style={{display:"flex",flexDirection:"column",gap:12}}>
            <button onClick={onGoogle} disabled={loading} className="press"
              style={{width:"100%",padding:"14px",borderRadius:14,border:"1px solid rgba(255,255,255,.15)",background:"rgba(255,255,255,.06)",
                color:"#fff",fontSize:15,fontWeight:600,cursor:"pointer",display:"flex",alignItems:"center",justifyContent:"center",gap:10}}>
              <span style={{fontSize:20}}>G</span> Continuar com Google
            </button>
            <button onClick={()=>setModo("login")} className="press"
              style={{width:"100%",padding:"14px",borderRadius:14,border:"1px solid rgba(255,255,255,.15)",background:"rgba(255,255,255,.06)",
                color:"#fff",fontSize:15,fontWeight:600,cursor:"pointer"}}>
              📧 Entrar com Email
            </button>
            <button onClick={()=>setModo("cadastro")} className="press"
              style={{width:"100%",padding:"14px",borderRadius:14,border:"none",background:"#7C6AF7",
                color:"#fff",fontSize:15,fontWeight:700,cursor:"pointer"}}>
              ✨ Criar conta
            </button>
          </div>
        )}

        {(modo==="login"||modo==="cadastro")&&(
          <div style={{display:"flex",flexDirection:"column",gap:12}}>
            <button onClick={()=>setModo("")} style={{background:"none",border:"none",color:"rgba(255,255,255,.4)",cursor:"pointer",fontSize:13,textAlign:"left",marginBottom:4}}>← Voltar</button>
            {modo==="cadastro"&&(
              <input value={nome} onChange={e=>setNome(e.target.value)} placeholder="Seu nome"
                className="login-inp" style={{width:"100%",fontSize:15,padding:"13px 14px",borderRadius:12,border:"1px solid rgba(255,255,255,.15)",background:"rgba(255,255,255,.06)",color:"#fff",outline:"none",fontFamily:"'Figtree',sans-serif"}}/>
            )}
            <input value={email} onChange={e=>setEmail(e.target.value)} placeholder="Email"
              type="email" className="login-inp" style={{width:"100%",fontSize:15,padding:"13px 14px",borderRadius:12,border:"1px solid rgba(255,255,255,.15)",background:"rgba(255,255,255,.06)",color:"#fff",outline:"none",fontFamily:"'Figtree',sans-serif"}}/>
            <input value={senha} onChange={e=>setSenha(e.target.value)} placeholder="Senha"
              type="password" className="login-inp" style={{width:"100%",fontSize:15,padding:"13px 14px",borderRadius:12,border:"1px solid rgba(255,255,255,.15)",background:"rgba(255,255,255,.06)",color:"#fff",outline:"none",fontFamily:"'Figtree',sans-serif"}}/>
            {emailErr&&<div style={{fontSize:12,color:"#FF5C6A"}}>{emailErr}</div>}
            <button onClick={handleEmail} disabled={loading} className="press"
              style={{width:"100%",padding:"14px",borderRadius:14,border:"none",background:"#7C6AF7",
                color:"#fff",fontSize:15,fontWeight:700,cursor:"pointer",marginTop:4}}>
              {loading?"Aguarde...":(modo==="login"?"Entrar":"Criar conta")}
            </button>
          </div>
        )}

        {loading&&<div style={{textAlign:"center",marginTop:16}}><Spinner size={24}/></div>}
      </div>
    </div>
  );
}

// ─── CONTATOS VIEW ────────────────────────────────────────────────────────────
function ContatosView({uid,user,isPremium=false,onUpgrade}){
  const [contatos,setContatos]=useState([]);
  const [codInput,setCodInput]=useState("");
  const [buscando,setBuscando]=useState(false);
  const [erro,setErro]=useState("");
  const [sheetAdd,setSheetAdd]=useState(false);
  const [formAdd,setFormAdd]=useState({nome:"",categoria:"Amigos"});
  const [editando,setEditando]=useState(null);

  const CATS=["Família","Amigos","Trabalho","Casal","Outros"];

  useEffect(()=>{
    if(!uid)return;
    const unsub=onSnapshot(collection(db,"users",uid,"contatos"),snap=>{
      setContatos(snap.docs.map(d=>({id:d.id,...d.data()})));
    });
    // Ouve inbox de contatos novos (pessoas que digitaram meu codigo)
    const unsubInbox=onSnapshot(collection(db,"inbox",uid,"contatos"),snap=>{
      snap.docs.forEach(d=>{
        const data=d.data();
        if(!data||!data.uid)return;
        setDoc(doc(db,"users",uid,"contatos",data.uid),{
          nome:data.nome||"Contato",uid:data.uid,vinculado:true,
          categoria:data.categoria||"Amigos",criadoEm:data.criadoEm||today()
        }).then(()=>deleteDoc(doc(db,"inbox",uid,"contatos",d.id)))
          .catch(e=>console.warn("inbox contato:",e.message));
      });
    });
    return()=>{unsub();unsubInbox();};
  },[uid]);

  async function adicionarPorCodigo(){
    setErro("");setBuscando(true);
    const cod=codInput.trim().toUpperCase();
    if(cod.length<6){setErro("Código inválido");setBuscando(false);return;}
    try{
      // Lê convite
      let convSnap;
      try{
        convSnap=await getDoc(doc(db,"convites",cod));
      }catch(e){
        if(e.code==="permission-denied"){setErro("Permissão negada — adicione a regra 'convites' no Firestore Console");setBuscando(false);return;}
        throw e;
      }
      if(!convSnap.exists()){
        setErro("Código não encontrado. Gere um novo código no app e tente de novo.");
        setBuscando(false);return;
      }
      const conv=convSnap.data();
      if(conv.criadoPor===uid){setErro("Este é o seu próprio código");setBuscando(false);return;}
      if(conv.usado&&conv.usado!==uid){setErro("Código já utilizado");setBuscando(false);return;}

      // Pega meu nome: tenta perfil > displayName > email
      let meuNome=user?.displayName||user?.email?.split("@")[0]||"Contato";
      try{const p=await getDoc(doc(db,"users",uid,"carreira","perfil"));if(p.exists()&&p.data().nome)meuNome=p.data().nome;}catch(_){}

      // Pega nome do dono do código: tenta perfil > fallback "Contato"
      let nomeParc="Contato";
      try{
        const p=await getDoc(doc(db,"users",conv.criadoPor,"carreira","perfil"));
        if(p.exists()&&p.data().nome)nomeParc=p.data().nome;
      }catch(_){}
      // Se não tem perfil, usa o nome guardado no próprio convite (se existir)
      if(nomeParc==="Contato"&&conv.nomeAutor)nomeParc=conv.nomeAutor;

      // 1. Salva o dono do código na MINHA lista de contatos
      await setDoc(doc(db,"users",uid,"contatos",conv.criadoPor),{
        nome:nomeParc,uid:conv.criadoPor,vinculado:true,categoria:"Amigos",criadoEm:today()
      });

      // 2. Notifica a outra pessoa via inbox público (ela vira meu contato também)
      try{
        await setDoc(doc(db,"inbox",conv.criadoPor,"contatos",uid),{
          nome:meuNome,uid,vinculado:true,categoria:"Amigos",criadoEm:today()
        });
      }catch(e){
        // inbox pode não ter regra ainda — não bloqueia o fluxo
        console.warn("inbox não acessível:",e.message);
      }

      // 3. Salva meu nome no convite para que outros saibam quem usou
      await updateDoc(doc(db,"convites",cod),{usado:uid,usadoPor:uid,usadoEm:today(),nomeUsou:meuNome});

      setCodInput("");
      setSheetAdd(false);
    }catch(e){
      if(e.code==="permission-denied")setErro("Permissão negada — verifique as regras do Firestore");
      else setErro("Erro: "+e.message);
    }
    setBuscando(false);
  }

  async function gerarMeuCodigo(){
    const cod=Math.random().toString(36).substring(2,8).toUpperCase();
    let meuNome=user?.displayName||user?.email?.split("@")[0]||"Contato";
    try{const p=await getDoc(doc(db,"users",uid,"carreira","perfil"));if(p.exists()&&p.data().nome)meuNome=p.data().nome;}catch(_){}
    await setDoc(doc(db,"convites",cod),{criadoPor:uid,criadoEm:new Date().toISOString(),nomeAutor:meuNome});
    await setDoc(doc(db,"users",uid,"config","meucod"),{codigo:cod,criadoEm:today()},{merge:true});
    return cod;
  }

  const [meuCod,setMeuCod]=useState("");
  const [gerando,setGerando]=useState(false);
  useEffect(()=>{
    if(!uid)return;
    getDoc(doc(db,"users",uid,"config","meucod")).then(s=>{if(s.exists())setMeuCod(s.data().codigo||"");}).catch(()=>{});
  },[uid]);

  async function handleGerarCodigo(){
    setGerando(true);
    const cod=await gerarMeuCodigo();
    setMeuCod(cod);setGerando(false);
  }

  function abrirEdicao(ct){
    setFormEdit({nome:ct.nome||"",categoria:ct.categoria||"Amigos",apelido:ct.apelido||"",notas:ct.notas||""});
    setEditando(ct);
  }

  async function salvarEdicao(){
    if(!editando||!formEdit.nome.trim())return;
    try{
      await updateDoc(doc(db,"users",uid,"contatos",editando.id),{
        nome:formEdit.nome.trim(),
        categoria:formEdit.categoria,
        apelido:formEdit.apelido.trim(),
        notas:formEdit.notas.trim(),
      });
      setEditando(null);
    }catch(e){console.error("salvarEdicao:",e.message);}
  }

  async function deletarContato(id){
    try{
      await deleteDoc(doc(db,"users",uid,"contatos",id));
    }catch(e){console.error("deletarContato:",e.message);}
  }

  const catColors={"Família":G.green,"Amigos":G.accent,"Trabalho":G.yellow,"Casal":"#F472B6","Outros":G.muted};
  const grupos=["Família","Casal","Amigos","Trabalho","Outros"];

  return(<div style={{display:"flex",flexDirection:"column",gap:16}}>
    {/* Meu código */}
    <div style={{background:G.card,border:"1px solid "+G.border,borderRadius:16,padding:16}}>
      <div style={{fontSize:11,fontWeight:700,color:G.muted,letterSpacing:1,marginBottom:10}}>MEU CÓDIGO DE CONVITE</div>
      {meuCod?<>
        <div style={{fontSize:30,fontWeight:900,letterSpacing:8,color:G.accent,textAlign:"center",fontFamily:"monospace",background:G.accentL,borderRadius:12,padding:"12px 0",marginBottom:8}}>
          {meuCod}
        </div>
        <div style={{fontSize:11,color:G.muted,textAlign:"center",marginBottom:8}}>Compartilhe com quem quer adicionar como contato</div>
        <button onClick={()=>navigator.clipboard?.writeText(meuCod)} className="press"
          style={{width:"100%",padding:"9px",borderRadius:10,border:"1px solid "+G.accent+"44",background:G.accentL,color:G.accent,fontSize:13,fontWeight:600,cursor:"pointer",fontFamily:"inherit"}}>
          Copiar código
        </button>
      </>:<button onClick={handleGerarCodigo} disabled={gerando} className="press"
        style={{width:"100%",padding:12,borderRadius:12,border:"none",background:G.accent,color:"#fff",fontSize:14,fontWeight:700,cursor:"pointer",fontFamily:"inherit",opacity:gerando?.6:1}}>
        {gerando?"Gerando...":"Gerar meu código"}
      </button>}
    </div>

    {/* Adicionar por código */}
    <button onClick={()=>setSheetAdd("codigo")} className="press"
      style={{width:"100%",padding:"12px",borderRadius:12,border:"1px solid "+G.accent+"44",background:G.accentL,color:G.accent,fontSize:14,fontWeight:600,cursor:"pointer",fontFamily:"inherit",display:"flex",alignItems:"center",justifyContent:"center",gap:8}}>
      Adicionar amigo por código
    </button>

    {/* Lista por grupo */}
    {contatos.length===0&&<div style={{textAlign:"center",padding:"40px 20px",color:G.muted,background:G.card,border:"1px solid "+G.border,borderRadius:16}}>
      <div style={{fontSize:36,marginBottom:8}}></div>
      <div style={{fontSize:14,fontWeight:600,marginBottom:4}}>Nenhum contato ainda</div>
      <div style={{fontSize:12}}>Gere seu código e compartilhe, ou adicione manualmente</div>
    </div>}

    {grupos.filter(g=>contatos.some(c=>c.categoria===g||(!c.categoria&&g==="Outros"))).map(grupo=>{
      const lista=contatos.filter(c=>(c.categoria||"Outros")===grupo);
      if(!lista.length)return null;
      return(<div key={grupo}>
        <div style={{fontSize:11,fontWeight:700,color:catColors[grupo]||G.muted,letterSpacing:.8,marginBottom:8}}>
          {grupo.toUpperCase()}
        </div>
        {lista.map(ct=>(
          <div key={ct.id} style={{display:"flex",alignItems:"center",gap:12,padding:"10px 14px",background:G.card,border:"1px solid "+G.border,borderRadius:12,marginBottom:8}}>
            <div style={{width:38,height:38,borderRadius:"50%",background:(catColors[ct.categoria]||G.muted)+"33",
              color:catColors[ct.categoria]||G.muted,display:"flex",alignItems:"center",justifyContent:"center",fontSize:15,fontWeight:700,flexShrink:0}}>
              {(ct.apelido||ct.nome)[0]?.toUpperCase()}
            </div>
            <div style={{flex:1,minWidth:0}}>
              <div style={{fontSize:14,fontWeight:600}}>{ct.apelido||ct.nome}</div>
              {ct.apelido&&<div style={{fontSize:11,color:G.muted}}>{ct.nome}</div>}
              <div style={{fontSize:11,color:G.muted}}>{ct.vinculado?"🔗 Vinculado":"Manual"} · {ct.categoria||"Outros"}</div>
              {ct.notas&&<div style={{fontSize:11,color:G.muted,fontStyle:"italic",overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap"}}>{ct.notas}</div>}
            </div>
            <button onClick={()=>abrirEdicao(ct)}
              style={{background:"none",border:"none",color:G.muted,cursor:"pointer",padding:"4px 6px",display:"flex",alignItems:"center"}}><Ic d={ICON.repeat} size={11} color={G.muted}/></button>
            <button onClick={()=>deletarContato(ct.id)}
              style={{background:"none",border:"none",color:G.border2,cursor:"pointer",fontSize:20,padding:"2px 6px",lineHeight:1}}
              onMouseEnter={e=>e.currentTarget.style.color=G.red}
              onMouseLeave={e=>e.currentTarget.style.color=G.border2}>×</button>
          </div>
        ))}
      </div>);
    })}

    {/* Sheet adicionar por código */}
    <Sheet open={sheetAdd==="codigo"} onClose={()=>{setSheetAdd(false);setErro("");}} title="Adicionar por Código">
      <div style={{display:"flex",flexDirection:"column",gap:14}}>
        <div style={{fontSize:13,color:G.muted,lineHeight:1.6}}>
          Digite o código da pessoa que quer adicionar. Vocês dois aparecem na lista um do outro automaticamente.
        </div>
        <div><Lbl>Código de convite</Lbl>
          <input value={codInput} onChange={e=>setCodInput(e.target.value.toUpperCase())}
            placeholder="Ex: X4K9BZ" className="inp" style={{letterSpacing:4,fontSize:20,textAlign:"center",fontWeight:700}} maxLength={6}/>
        </div>
        {erro&&<div style={{fontSize:12,color:G.red,padding:"8px 12px",background:G.red+"15",borderRadius:8}}>{erro}</div>}
        <button onClick={adicionarPorCodigo} disabled={buscando} className="press"
          style={{width:"100%",padding:14,borderRadius:14,border:"none",background:G.accent,color:"#fff",fontSize:15,fontWeight:700,cursor:"pointer",fontFamily:"inherit",opacity:buscando?.6:1}}>
          {buscando?"Buscando...":"Adicionar contato"}
        </button>
      </div>
    </Sheet>

    {/* Sheet editar contato */}
    <Sheet open={!!editando} onClose={()=>setEditando(null)} title="Editar Contato">
      <div style={{display:"flex",flexDirection:"column",gap:14}}>
        <div><Lbl>Nome</Lbl><input value={formEdit.nome} onChange={e=>setFormEdit(f=>({...f,nome:e.target.value}))} className="inp" placeholder="Nome completo"/></div>
        <div><Lbl opt>Apelido</Lbl><input value={formEdit.apelido} onChange={e=>setFormEdit(f=>({...f,apelido:e.target.value}))} className="inp" placeholder="Como você chama essa pessoa"/></div>
        <div><Lbl>Categoria</Lbl>
          <div style={{display:"flex",flexWrap:"wrap",gap:8,marginTop:4}}>
            {["Família","Amigos","Trabalho","Casal","Outros"].map(cat=>{
              const sel=formEdit.categoria===cat;
              return(<button key={cat} onClick={()=>setFormEdit(f=>({...f,categoria:cat}))} className="press"
                style={{padding:"7px 14px",borderRadius:20,border:"1px solid "+(sel?catColors[cat]+"88":G.border),
                  background:sel?(catColors[cat]||G.accent)+"22":G.card2,color:sel?catColors[cat]||G.accent:G.muted,
                  fontSize:13,fontWeight:sel?700:500,cursor:"pointer",fontFamily:"inherit"}}>
                {cat}
              </button>);
            })}
          </div>
        </div>
        <div><Lbl opt>Notas</Lbl><input value={formEdit.notas} onChange={e=>setFormEdit(f=>({...f,notas:e.target.value}))} className="inp" placeholder="Ex: Divide a Netflix, mora em SP..."/></div>
        <button onClick={salvarEdicao} className="press"
          style={{width:"100%",padding:14,borderRadius:14,border:"none",background:G.accent,color:"#fff",fontSize:15,fontWeight:700,cursor:"pointer",fontFamily:"inherit"}}>
          Salvar
        </button>
        <button onClick={()=>{deletarContato(editando.id);setEditando(null);}} className="press"
          style={{width:"100%",padding:12,borderRadius:14,border:"1px solid "+G.red+"44",background:G.red+"15",color:G.red,fontSize:14,fontWeight:600,cursor:"pointer",fontFamily:"inherit"}}>
          Remover contato
        </button>
      </div>
    </Sheet>
  </div>);
}

// ─── CASAL VIEW ────────────────────────────────────────────────────────────────
function CasalView({uid,lancs,user}){
  const [sheetLanc,setSheetLanc]=useState(false);
  const [formLanc,setFormLanc]=useState({data:today(),desc:"",cat:CATS_DEP[0],forma:FORMAS_DEP[0],valor:"",tipo:"Despesa"});

  async function salvarLanc(){
    const v=parseFloat(formLanc.valor);
    if(!formLanc.data||!v||v<=0)return;
    try{
      await addDoc(collection(db,"users",uid,"lancamentos"),{
        tipo:formLanc.tipo,desc:formLanc.desc,cat:formLanc.cat,
        forma:formLanc.forma,valor:v,data:formLanc.data,escopo:"casal",
        autorNome:user?.displayName||"Você"
      });
      setSheetLanc(false);
    }catch(e){console.error("salvarLanc:",e.message);}
  }

  const mes=curMes();
  const lancCasal=lancs.filter(l=>l.data?.startsWith(mes)&&l.escopo==="casal");
  const tR=lancCasal.filter(l=>l.tipo==="Receita").reduce((s,l)=>s+l.valor,0);
  const tD=lancCasal.filter(l=>l.tipo==="Despesa").reduce((s,l)=>s+l.valor,0);

  return(<div style={{display:"flex",flexDirection:"column",gap:16}}>
    <div style={{display:"flex",gap:12}}>
      {[{l:"Receitas",v:tR,c:G.green},{l:"Despesas",v:tD,c:G.red},{l:"Saldo",v:tR-tD,c:tR-tD>=0?G.green:G.red}].map((k,i)=>(
        <div key={i} style={{flex:1,background:G.card,border:"1px solid "+G.border,borderRadius:14,padding:12,textAlign:"center"}}>
          <div style={{fontSize:10,color:G.muted,marginBottom:4}}>{k.l}</div>
          <div style={{fontFamily:"'Fraunces',serif",fontSize:16,fontWeight:700,color:k.c}}>{fmt(k.v)}</div>
        </div>
      ))}
    </div>

    <button onClick={()=>setSheetLanc(true)} className="press"
      style={{width:"100%",padding:"10px",borderRadius:14,border:"1px solid "+G.yellow+"55",background:G.yellow+"18",color:G.yellow,fontSize:14,fontWeight:700,cursor:"pointer",fontFamily:"inherit"}}>
      + Novo lançamento do casal
    </button>

    {lancCasal.length===0&&<div style={{textAlign:"center",padding:"30px 20px",color:G.muted,background:G.card,border:"1px solid "+G.border,borderRadius:16}}>
      <div style={{fontSize:32,marginBottom:8}}></div>
      <div style={{fontSize:13,fontWeight:600,marginBottom:4}}>Nenhum lançamento do casal</div>
      <div style={{fontSize:12}}>Registre gastos e receitas compartilhados</div>
    </div>}

    {lancCasal.length>0&&<div style={{background:G.card,border:"1px solid "+G.border,borderRadius:16,padding:16}}>
      <div style={{fontSize:11,fontWeight:700,color:G.muted,marginBottom:12,letterSpacing:.8}}>ESTE MÊS</div>
      {lancCasal.map((l,i)=>(
        <div key={i} style={{display:"flex",alignItems:"center",justifyContent:"space-between",padding:"9px 0",borderBottom:i<lancCasal.length-1?"1px solid "+G.border:"none"}}>
          <div>
            <div style={{fontSize:13,fontWeight:600}}>{l.desc||l.cat}</div>
            <div style={{fontSize:11,color:G.muted}}>{fmtD(l.data)} · {l.cat}</div>
          </div>
          <div style={{fontSize:14,fontWeight:700,color:l.tipo==="Receita"?G.green:G.red}}>
            {l.tipo==="Receita"?"+":"-"}{fmt(l.valor)}
          </div>
        </div>
      ))}
    </div>}

    <Sheet open={sheetLanc} onClose={()=>setSheetLanc(false)} title="Novo — Casal">
      <div style={{display:"flex",flexDirection:"column",gap:14}}>
        <div style={{display:"flex",background:G.card2,borderRadius:12,padding:4}}>
          {["Despesa","Receita"].map(t=>(
            <button key={t} onClick={()=>setFormLanc(f=>({...f,tipo:t,cat:t==="Receita"?CATS_REC[0]:CATS_DEP[0],forma:t==="Receita"?FORMAS_REC[0]:FORMAS_DEP[0]}))}
              style={{flex:1,padding:"9px",borderRadius:9,border:"none",cursor:"pointer",fontFamily:"inherit",fontWeight:formLanc.tipo===t?700:500,
                background:formLanc.tipo===t?(t==="Despesa"?G.red+"22":G.green+"22"):"transparent",
                color:formLanc.tipo===t?(t==="Despesa"?G.red:G.green):G.muted}}>
              {t==="Despesa"?"↓ Despesa":"↑ Receita"}
            </button>
          ))}
        </div>
        <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:12}}>
          <div><Lbl>Valor (R$)</Lbl><input type="number" value={formLanc.valor} onChange={e=>setFormLanc(f=>({...f,valor:e.target.value}))} className="inp" placeholder="0,00"/></div>
          <div><Lbl>Data</Lbl><input type="date" value={formLanc.data} onChange={e=>setFormLanc(f=>({...f,data:e.target.value}))} className="inp"/></div>
        </div>
        <div><Lbl opt>Descrição</Lbl><input value={formLanc.desc} onChange={e=>setFormLanc(f=>({...f,desc:e.target.value}))} className="inp" placeholder="Ex: Mercado, Cinema..."/></div>
        <div><Lbl>Categoria</Lbl>
          <select value={formLanc.cat} onChange={e=>setFormLanc(f=>({...f,cat:e.target.value}))} className="inp">
            {(formLanc.tipo==="Receita"?CATS_REC:CATS_DEP).map(c=><option key={c}>{c}</option>)}
          </select>
        </div>
        <button onClick={salvarLanc} className="press" style={{width:"100%",padding:14,borderRadius:14,border:"none",background:G.yellow,color:"#000",fontSize:15,fontWeight:700,cursor:"pointer",fontFamily:"inherit"}}>
          Salvar
        </button>
      </div>
    </Sheet>
  </div>);
}

// ─── DIVISOES VIEW ─────────────────────────────────────────────────────────────
function DivisoesView({uid}){
  const [divisoes,setDivisoes]=useState([]);
  const [pendentes,setPendentes]=useState([]); // divisoes que outros enviaram pra mim
  const [contatos,setContatos]=useState([]);
  const [sheetDiv,setSheetDiv]=useState(false);
  const [formDiv,setFormDiv]=useState({desc:"",valor:"",selecionados:[],data:today()});

  useEffect(()=>{
    if(!uid)return;
    const unsub=onSnapshot(collection(db,"users",uid,"divisoes"),snap=>{
      setDivisoes(snap.docs.map(d=>({id:d.id,...d.data()})));
    });
    // Divisoes pendentes via inbox público
    const unsubP=onSnapshot(collection(db,"inbox",uid,"divisoes_pendentes"),snap=>{
      setPendentes(snap.docs.map(d=>({id:d.id,...d.data()})));
    });
    // Contatos para seleção
    const unsubC=onSnapshot(collection(db,"users",uid,"contatos"),snap=>{
      setContatos(snap.docs.map(d=>({id:d.id,...d.data()})));
    });
    // Listener: outra pessoa marcou pago na minha divisão
    const unsubPagas=onSnapshot(collection(db,"inbox",uid,"divisoes_pagas"),snap=>{
      snap.docs.forEach(d=>{
        const data=d.data();
        // Valida campos obrigatórios antes de processar
        if(!data||!data.divOrigemId||data.parteIdx==null)return;
        // Atualiza estado local imediatamente (sem async no map)
        setDivisoes(prev=>prev.map(div=>{
          if(div.id!==data.divOrigemId)return div;
          const novasPartes=toPartes(div.partes).map((p,i)=>
            i===data.parteIdx?{...p,pago:!!data.pago}:p
          );
          return{...div,partes:novasPartes};
        }));
        // Persiste e limpa inbox em background (não bloqueia render)
        const divRef=doc(db,"users",uid,"divisoes",data.divOrigemId);
        const inboxRef=doc(db,"inbox",uid,"divisoes_pagas",d.id);
        const novasPartes={};
        novasPartes[`partes.${data.parteIdx}.pago`]=!!data.pago;
        updateDoc(divRef,novasPartes)
          .then(()=>deleteDoc(inboxRef))
          .catch(e=>console.warn("divisoes_pagas sync:",e.message));
      });
    });
    return()=>{unsub();unsubP();unsubC();unsubPagas();};
  },[uid]);

  function toggleSel(nome){
    setFormDiv(f=>{
      const sel=f.selecionados.includes(nome)?f.selecionados.filter(n=>n!==nome):[...f.selecionados,nome];
      return{...f,selecionados:sel};
    });
  }

  async function salvarDiv(){
    const v=parseFloat(formDiv.valor);
    const pessoas=["Você",...formDiv.selecionados];
    if(!formDiv.desc||!v||formDiv.selecionados.length<1)return;
    const valorPorPessoa=v/pessoas.length;
    const partes=pessoas.map(p=>({nome:p,valor:valorPorPessoa,pago:false}));
    try{
    // Salva minha divisão
    const divRef=await addDoc(collection(db,"users",uid,"divisoes"),{
      desc:formDiv.desc,total:v,data:formDiv.data,partes,criadoEm:today(),criadoPor:uid
    });
    // Notifica contatos vinculados via inbox público
    const contatosVinculados=contatos.filter(c=>c.vinculado&&c.uid&&formDiv.selecionados.includes(c.nome));
    for(const ct of contatosVinculados){
      try{
        await addDoc(collection(db,"inbox",ct.uid,"divisoes_pendentes"),{
          desc:formDiv.desc,total:v,data:formDiv.data,partes,
          criadoPor:uid,criadoEm:today(),status:"pendente",divOrigemId:divRef.id
        });
      }catch(e){console.warn("Erro ao notificar",ct.nome,e.message);}
    }
    setSheetDiv(false);
    setFormDiv({desc:"",valor:"",selecionados:[],data:today()});
    }catch(e){console.error("salvarDiv:",e.message);}
  }

  async function aceitarDiv(id,dados){
    // Remove o id do inbox para nao conflitar com o novo doc
    const {id:_ignore,...dadosLimpos}=dados;
    // Salva na colecao propria do usuario receptor
    const partesNorm=toPartes(dadosLimpos.partes);
    await addDoc(collection(db,"users",uid,"divisoes"),{
      ...dadosLimpos,
      partes:partesNorm,
      status:"aceito",
      recebida:true,
      criadoEm:dadosLimpos.criadoEm||today()
    });
    await deleteDoc(doc(db,"inbox",uid,"divisoes_pendentes",id));
  }

  async function recusarDiv(id){
    await deleteDoc(doc(db,"inbox",uid,"divisoes_pendentes",id));
  }

  async function marcarPago(divId,parteIdx){
    const div=divisoes.find(d=>d.id===divId);if(!div)return;
    const partes=toPartes(div.partes).map((p,i)=>i===parteIdx?{...p,pago:!p.pago}:p);
    await updateDoc(doc(db,"users",uid,"divisoes",divId),{partes});
    // Se é divisão recebida, notifica o criador que esta parte foi paga
    if(div.recebida&&div.criadoPor&&div.divOrigemId){
      try{
        await setDoc(doc(db,"inbox",div.criadoPor,"divisoes_pagas",div.divOrigemId),{
          parteIdx,pago:partes[parteIdx].pago,
          pagoEm:today(),pagoPor:uid,
          divOrigemId:div.divOrigemId
        });
      }catch(e){console.warn("Erro ao notificar pagamento",e.message);}
    }
  }

  async function deletarDiv(id){
    try{await deleteDoc(doc(db,"users",uid,"divisoes",id));}
    catch(e){console.error("deletarDiv:",e.message);}
  }

  const abertas=divisoes.filter(d=>toPartes(d.partes).some(p=>!p.pago));
  const concluidas=divisoes.filter(d=>toPartes(d.partes).every(p=>p.pago));

  return(<div style={{display:"flex",flexDirection:"column",gap:16}}>
    {/* Pendentes (notificações) */}
    {pendentes.length>0&&<div style={{background:G.yellow+"15",border:"1px solid "+G.yellow+"44",borderRadius:16,padding:16}}>
      <div style={{fontSize:11,fontWeight:700,color:G.yellow,letterSpacing:.8,marginBottom:12}}>
        DIVISÕES RECEBIDAS ({pendentes.length})
      </div>
      {pendentes.map(p=>(
        <div key={p.id} style={{marginBottom:12,paddingBottom:12,borderBottom:"1px solid "+G.yellow+"22"}}>
          <div style={{fontSize:14,fontWeight:700,marginBottom:2}}>{p.desc}</div>
          <div style={{fontSize:12,color:G.muted,marginBottom:8}}>
            {fmtD(p.data)} · Total: {fmt(p.total)} · {toPartes(p.partes).length} pessoas · Sua parte: {fmt(toPartes(p.partes).find(pt=>pt.nome!=="Você")?.valor||0)}
          </div>
          <div style={{display:"flex",gap:8}}>
            <button onClick={()=>aceitarDiv(p.id,p)} className="press"
              style={{flex:1,padding:"8px",borderRadius:10,border:"none",background:G.green,color:"#fff",fontSize:13,fontWeight:700,cursor:"pointer",fontFamily:"inherit"}}>
              Aceitar
            </button>
            <button onClick={()=>recusarDiv(p.id)} className="press"
              style={{flex:1,padding:"8px",borderRadius:10,border:"1px solid "+G.red+"44",background:G.red+"15",color:G.red,fontSize:13,fontWeight:600,cursor:"pointer",fontFamily:"inherit"}}>
              Recusar
            </button>
          </div>
        </div>
      ))}
    </div>}

    <div style={{display:"flex",alignItems:"center",justifyContent:"space-between"}}>
      <div style={{fontSize:13,fontWeight:700,color:G.muted,letterSpacing:.5}}>MINHAS DIVISÕES</div>
      <button onClick={()=>setSheetDiv(true)} className="press"
        style={{padding:"7px 14px",borderRadius:20,border:"1px solid "+G.accent+"55",background:G.accentL,color:G.accent,fontSize:12,fontWeight:700,cursor:"pointer"}}>
        + Nova
      </button>
    </div>

    {divisoes.length===0&&<div style={{textAlign:"center",padding:"40px 20px",color:G.muted}}>
      <div style={{fontSize:40,marginBottom:12}}>÷</div>
      <div style={{fontSize:14,fontWeight:600,marginBottom:6}}>Nenhuma divisão ainda</div>
      <div style={{fontSize:12}}>Crie e envie para seus contatos aprovarem</div>
    </div>}

    {abertas.length>0&&<>
      <div style={{fontSize:11,fontWeight:700,color:G.yellow,letterSpacing:.8}}>EM ABERTO</div>
      {abertas.map(div=>{
        const pendente=toPartes(div.partes).filter(p=>!p.pago);
        return(<div key={div.id} style={{background:G.card,border:"1px solid "+G.border,borderRadius:16,padding:16}}>
          <div style={{display:"flex",justifyContent:"space-between",alignItems:"flex-start",marginBottom:12}}>
            <div>
              <div style={{fontSize:14,fontWeight:700}}>{div.desc}</div>
              <div style={{fontSize:11,color:G.muted}}>{fmtD(div.data)} · Total: {fmt(div.total)}</div>
            </div>
            <div style={{textAlign:"right"}}>
              <div style={{fontSize:12,color:G.yellow,fontWeight:700}}>{fmt(pendente.reduce((s,p)=>s+p.valor,0))} pendente</div>
              <button onClick={()=>deletarDiv(div.id)} style={{background:"none",border:"none",color:G.red+"99",cursor:"pointer",fontSize:18,padding:"2px 4px",lineHeight:1}} onMouseEnter={e=>e.currentTarget.style.color=G.red} onMouseLeave={e=>e.currentTarget.style.color=G.red+"99"}>×</button>
            </div>
          </div>
          <div style={{display:"flex",flexDirection:"column",gap:8}}>
            {toPartes(div.partes).map((p,i)=>(
              <div key={i} style={{display:"flex",alignItems:"center",gap:10,padding:"8px 12px",background:p.pago?G.green+"15":G.card2,borderRadius:10}}>
                <div style={{width:32,height:32,borderRadius:"50%",background:p.pago?G.green:G.accent,color:"#fff",display:"flex",alignItems:"center",justifyContent:"center",fontSize:13,fontWeight:700,flexShrink:0}}>
                  {p.nome[0]?.toUpperCase()||"?"}
                </div>
                <div style={{flex:1}}>
                  <div style={{fontSize:13,fontWeight:600,color:p.pago?G.muted:G.text,textDecoration:p.pago?"line-through":"none"}}>{p.nome}</div>
                  <div style={{fontSize:12,color:G.muted}}>{fmt(p.valor)}</div>
                </div>
                <button onClick={()=>marcarPago(div.id,i)} className="press"
                  style={{padding:"5px 10px",borderRadius:8,border:"1px solid "+(p.pago?G.green+"55":G.border2),background:p.pago?G.green+"22":G.card,color:p.pago?G.green:G.text,fontSize:12,cursor:"pointer",fontFamily:"inherit"}}>
                  {p.pago?"✓ Pago":"Marcar pago"}
                </button>
              </div>
            ))}
          </div>
        </div>);
      })}
    </>}

    {concluidas.length>0&&<>
      <div style={{fontSize:11,fontWeight:700,color:G.green,letterSpacing:.8}}>CONCLUÍDAS</div>
      {concluidas.slice(0,3).map(div=>(
        <div key={div.id} style={{background:G.card,border:"1px solid "+G.green+"33",borderRadius:16,padding:14,display:"flex",justifyContent:"space-between",alignItems:"center"}}>
          <div>
            <div style={{fontSize:13,fontWeight:600}}>{div.desc}</div>
            <div style={{fontSize:11,color:G.muted}}>{fmtD(div.data)} · {toPartes(div.partes).length} pessoas</div>
          </div>
          <div style={{textAlign:"right"}}>
            <div style={{fontSize:13,fontWeight:700,color:G.green}}>✓ {fmt(div.total)}</div>
            <button onClick={()=>deletarDiv(div.id)} style={{background:"none",border:"none",color:G.red+"99",cursor:"pointer",fontSize:18,padding:"2px 4px",lineHeight:1}} onMouseEnter={e=>e.currentTarget.style.color=G.red} onMouseLeave={e=>e.currentTarget.style.color=G.red+"99"}>×</button>
          </div>
        </div>
      ))}
    </>}

    <Sheet open={sheetDiv} onClose={()=>setSheetDiv(false)} title="Nova Divisão">
      <div style={{display:"flex",flexDirection:"column",gap:14}}>
        <div><Lbl>Descrição</Lbl><input value={formDiv.desc} onChange={e=>setFormDiv(f=>({...f,desc:e.target.value}))} placeholder="Ex: Jantar, Airbnb..." className="inp"/></div>
        <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:12}}>
          <div><Lbl>Valor total (R$)</Lbl><input type="number" value={formDiv.valor} onChange={e=>setFormDiv(f=>({...f,valor:e.target.value}))} placeholder="0,00" className="inp"/></div>
          <div><Lbl>Data</Lbl><input type="date" value={formDiv.data} onChange={e=>setFormDiv(f=>({...f,data:e.target.value}))} className="inp"/></div>
        </div>
        <div>
          <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:8}}>
            <Lbl>Participantes (além de você)</Lbl>
            <span style={{fontSize:11,color:G.muted}}>{formDiv.selecionados.length} sel.</span>
          </div>
          {contatos.length===0?<div style={{fontSize:12,color:G.muted,padding:"10px 0",textAlign:"center"}}>
            Adicione contatos primeiro na aba Contatos
          </div>:<div style={{display:"flex",flexWrap:"wrap",gap:8}}>
            {contatos.map(ct=>{
              const sel=formDiv.selecionados.includes(ct.nome);
              return(<button key={ct.id} onClick={()=>toggleSel(ct.nome)} className="press"
                style={{padding:"7px 14px",borderRadius:20,border:"1px solid "+(sel?G.accent+"88":G.border),
                  background:sel?G.accent+"22":G.card2,color:sel?G.accent:G.muted,
                  fontSize:13,fontWeight:sel?700:500,cursor:"pointer",fontFamily:"inherit",display:"flex",alignItems:"center",gap:6}}>
                <div style={{width:20,height:20,borderRadius:"50%",background:sel?G.accent:G.border2,color:"#fff",display:"flex",alignItems:"center",justifyContent:"center",fontSize:10,fontWeight:700}}>
                  {ct.nome[0]?.toUpperCase()}
                </div>
                {ct.nome}{sel?" ✓":""}
              </button>);
            })}
          </div>}
          {formDiv.selecionados.length<1&&<div style={{fontSize:11,color:G.yellow,marginTop:6}}>Selecione pelo menos 1 pessoa</div>}
        </div>
        {formDiv.valor&&formDiv.selecionados.length>=1&&(
          <div style={{background:G.accentL,border:"1px solid "+G.accent+"33",borderRadius:12,padding:12,textAlign:"center"}}>
            <div style={{fontSize:12,color:G.muted}}>Cada pessoa paga</div>
            <div style={{fontSize:22,fontWeight:700,color:G.accent}}>{fmt(parseFloat(formDiv.valor||0)/(formDiv.selecionados.length+1))}</div>
            <div style={{fontSize:11,color:G.muted,marginTop:2}}>({formDiv.selecionados.length+1} pessoas incluindo você)</div>
          </div>
        )}
        <button onClick={salvarDiv} className="press" style={{width:"100%",padding:14,borderRadius:14,border:"none",background:G.accent,color:"#fff",fontSize:15,fontWeight:700,cursor:"pointer",fontFamily:"inherit"}}>
          Criar e enviar
        </button>
      </div>
    </Sheet>
  </div>);
}


// ─── APP ROOT ─────────────────────────────────────────────────────────────────
export default function App(){
  const [user,setUser]=useState(null);
  const [authLoading,setAuthLoading]=useState(true);
  const [loginLoading,setLoginLoading]=useState("");
  const [loginError,setLoginError]=useState("");
  const {plano,isPremium,loadingPlano,forceSetPlano}=usePlano(user?.uid||null);
  const [lancs,setLancs]=useState([]);
  const [recorrentes,setRecorrentes]=useState([]);
  const [dataLoading,setDataLoading]=useState(false);
  const [view,setView]=useState("dashboard");
  const [drawerOpen,setDrawerOpen]=useState(false);
  const [searchOpen,setSearchOpen]=useState(false);
  const [cartoesList,setCartoesList]=useState([]);
  const [divPendCount,setDivPendCount]=useState(0);
  const [profilePhoto,setProfilePhoto]=useState("");
  const [modal,setModal]=useState(false);
  const [tipo,setTipo]=useState("Despesa");
  const [form,setForm]=useState({data:today(),desc:"",cat:CATS_DEP[0],forma:FORMAS_DEP[0],valor:"",recorrente:false,freq:"mensal",dia:1});
  const [toast,setToast]=useState(null);
  const [theme,setTheme]=useState(()=>localStorage.getItem("fin_theme")||"dark");
  _theme=theme;
  const CSS=getCSS(theme);
  function toggleTheme(){const t=theme==="dark"?"light":"dark";_theme=t;setTheme(t);localStorage.setItem("fin_theme",t);}
  const tRef=useRef();


  useEffect(()=>{ return onAuthStateChanged(auth,u=>{setUser(u);setAuthLoading(false);}); },[]);

  useEffect(()=>{
    if(!user){setLancs([]);setRecorrentes([]);return;}
    setDataLoading(true);
    const uid=user.uid;
    const unsubL=onSnapshot(collection(db,"users",uid,"lancamentos"),snap=>{setLancs(snap.docs.map(d=>({id:d.id,...d.data()})));setDataLoading(false);});
    const unsubR=onSnapshot(collection(db,"users",uid,"recorrentes"),snap=>{setRecorrentes(snap.docs.map(d=>({id:d.id,...d.data()})));});
    const unsubC=onSnapshot(collection(db,"users",uid,"cartoes"),snap=>{setCartoesList(snap.docs.map(d=>({id:d.id,...d.data()})));});
    const unsubDP=onSnapshot(collection(db,"inbox",uid,"divisoes_pendentes"),s=>{setDivPendCount(s.size);});
    return()=>{unsubL();unsubR();unsubC();unsubDP();};
  },[user]);

  useEffect(()=>{
    if(!user||recorrentes.length===0)return;
    const novos=gerarRecorrentesDoMes(recorrentes,lancs);
    novos.forEach(n=>addDoc(collection(db,"users",user.uid,"lancamentos"),n).catch(()=>{}));
  },[recorrentes,user]);

  const showT=useCallback((msg,type="success")=>{setToast({msg,type});clearTimeout(tRef.current);tRef.current=setTimeout(()=>setToast(null),2400);},[]);

  function openModal(t){setTipo(t);setForm({data:today(),desc:"",cat:t==="Receita"?CATS_REC[0]:CATS_DEP[0],forma:t==="Receita"?FORMAS_REC[0]:FORMAS_DEP[0],valor:"",modo:"normal",freq:"mensal",dia:1,cartaoId:""});setModal(true);}

  async function salvar(){
    const v=parseFloat(form.valor);
    if(!form.data||!v||v<=0){showT("Informe o valor e a data.","error");return;}
    const modo=form.modo||"normal";
    // Agendado: salva com flag agendado=true — não entra no saldo até a data
    await addDoc(collection(db,"users",user.uid,"lancamentos"),{tipo,desc:form.desc,cat:tipo==="Despesa"&&form.forma==="Cartão Crédito"?"Cartão de Crédito":form.cat,forma:form.forma,valor:v,data:form.data,agendado:modo==="agendado",...(form.cartaoId?{cartaoId:form.cartaoId}:{})});
    if(modo==="recorrente")await addDoc(collection(db,"users",user.uid,"recorrentes"),{tipo,desc:form.desc,cat:form.cat,forma:form.forma,valor:v,freq:form.freq,dia:form.dia,ativo:true});
    const label=modo==="recorrente"?" ↻":modo==="agendado"?" ":"";
    showT(`${tipo} adicionada!${label}`);setModal(false);
  }
  async function deletar(id){await deleteDoc(doc(db,"users",user.uid,"lancamentos",id));showT("Removido.","error");}
  async function toggleRec(id){const r=recorrentes.find(r=>r.id===id);if(r)await updateDoc(doc(db,"users",user.uid,"recorrentes",id),{ativo:!r.ativo});}
  async function deleteRec(id){
    await deleteDoc(doc(db,"users",user.uid,"recorrentes",id));
    const snap=await getDocs(collection(db,"users",user.uid,"lancamentos"));
    snap.docs.filter(d=>d.data().recId===id).forEach(d=>deleteDoc(d.ref));
    showT("Recorrente removido.","error");
  }

  async function handleGoogle(){setLoginLoading("google");setLoginError("");try{await signInWithPopup(auth,googleProvider);}catch(e){setLoginError("Erro ao entrar com Google.");}setLoginLoading("");}
  async function handleApple(){setLoginLoading("apple");setLoginError("");try{await signInWithPopup(auth,appleProvider);}catch(e){setLoginError("Erro ao entrar com Apple. Verifique se está configurado no Firebase.");}setLoginLoading("");}
  async function handleEmail(email,senha,nome){
    setLoginLoading("email");setLoginError("");
    try{
      if(nome){// cadastro: nome é string não-vazia
        const cred=await createUserWithEmailAndPassword(auth,email,senha);
        await updateProfile(cred.user,{displayName:nome});
      }else if(nome===""){// login: nome é string vazia
        await signInWithEmailAndPassword(auth,email,senha);
      }else{// fallback null/undefined → login
        await signInWithEmailAndPassword(auth,email,senha);
      }
    }catch(e){
      const msgs={
        "auth/email-already-in-use":"Email já cadastrado.",
        "auth/weak-password":"Senha muito fraca (mín. 6 caracteres).",
        "auth/invalid-email":"Email inválido.",
        "auth/invalid-credential":"Email ou senha incorretos.",
        "auth/user-not-found":"Usuário não encontrado.",
      };
      setLoginError(msgs[e.code]||"Erro ao entrar. Tente novamente.");
    }
    setLoginLoading("");
  }
  async function handleLogout(){if(window.confirm("Sair da conta?"))await signOut(auth);}

  if(authLoading)return(<div style={{display:"flex",flexDirection:"column",alignItems:"center",justifyContent:"center",height:"100vh",background:"#0A0A0F"}}><Spinner size={32}/></div>);
  if(!user)return <LoginScreen onGoogle={handleGoogle} onApple={handleApple} onEmail={handleEmail} loading={loginLoading} error={loginError}/>;
  if(loadingPlano)return(<div style={{display:"flex",flexDirection:"column",alignItems:"center",justifyContent:"center",height:"100vh",background:"#0A0A0F"}}><Spinner size={32}/></div>);

  return(<>
    <style>{CSS}</style>
    <div style={{display:"flex",flexDirection:"column",height:"100vh",background:G.bg}}>
      <Head view={view} onRec={()=>openModal("Receita")} onDep={()=>openModal("Despesa")} user={user} profilePhoto={profilePhoto} onSearch={()=>setView("busca")} onDrawer={()=>setDrawerOpen(true)} divPendCount={divPendCount}/>
      
      {dataLoading?(
        <div style={{flex:1,display:"flex",alignItems:"center",justifyContent:"center",marginTop:HH,marginBottom:NH}}><Spinner size={28}/></div>
      ):view==="chat"?(
        <div style={{position:"fixed",top:HH,left:0,right:0,bottom:NH,display:"flex",flexDirection:"column"}}>
          <ChatView lancs={lancs} onAddLanc={l=>{addDoc(collection(db,"users",user.uid,"lancamentos"),l);showT("Salvo! ✓");}} isPremium={isPremium} onUpgrade={()=>setView("planos")}/>
        </div>
      ):(
        <ErrorBoundary key={view}><main style={{position:"fixed",top:HH,left:0,right:0,bottom:`calc(${NH}px + env(safe-area-inset-bottom, 0px))`,overflowY:"auto",overflowX:"hidden",padding:"16px 14px",WebkitOverflowScrolling:"touch",overscrollBehavior:"contain",animation:"fadeUp .2s ease both",maxWidth:"100vw",boxSizing:"border-box"}}>
          {/* ── VIEWS GRATUITAS ── */}
          {view==="dashboard"&&<Dashboard lancs={lancs} onDelete={deletar} user={user}/>}
          {view==="receitas"&&<LancsView tipo="Receita" lancs={lancs} recorrentes={recorrentes} onDelete={deletar} onToggleRec={toggleRec} onDeleteRec={deleteRec} isPremium={isPremium} onUpgrade={()=>setView("planos")}/>}
          {view==="despesas"&&<LancsView tipo="Despesa" lancs={lancs} recorrentes={recorrentes} onDelete={deletar} onToggleRec={toggleRec} onDeleteRec={deleteRec} isPremium={isPremium} onUpgrade={()=>setView("planos")}/>}
          {view==="planos"&&<UpgradeView uid={user.uid} plano={plano} onActivate={p=>{forceSetPlano(p);}}/>}

          {/* ── VIEWS PREMIUM ── */}
          {view==="carreira"&&(isPremium
            ?<CarreiraView uid={user.uid} user={user} onPhotoSave={p=>setProfilePhoto(p)} lancs={lancs}/>
            :<UpgradeView uid={user.uid} plano={plano} destaque="carreira" onActivate={p=>{forceSetPlano(p);}}/>)}
          {view==="cartoes"&&(isPremium
            ?<CartoesView uid={user.uid} lancs={lancs}/>
            :<UpgradeView uid={user.uid} plano={plano} destaque="cartoes" onActivate={p=>{forceSetPlano(p);}}/>)}
          {view==="contatos"&&(isPremium
            ?<ContatosView uid={user.uid} user={user}/>
            :<UpgradeView uid={user.uid} plano={plano} destaque="contatos" onActivate={p=>{forceSetPlano(p);}}/>)}
          {view==="compartilhados-casal"&&(isPremium
            ?<CasalView uid={user.uid} lancs={lancs} user={user}/>
            :<UpgradeView uid={user.uid} plano={plano} destaque="casal" onActivate={p=>{forceSetPlano(p);}}/>)}
          {view==="compartilhados-divisoes"&&(isPremium
            ?<DivisoesView uid={user.uid}/>
            :<UpgradeView uid={user.uid} plano={plano} destaque="divisoes" onActivate={p=>{forceSetPlano(p);}}/>)}
          {view==="busca"&&(isPremium
            ?<BuscaView lancs={lancs} onDelete={deletar}/>
            :<UpgradeView uid={user.uid} plano={plano} destaque="busca" onActivate={p=>{forceSetPlano(p);}}/>)}
          {view==="importar"&&(isPremium
            ?<ImportarView uid={user.uid} lancs={lancs} showT={showT}/>
            :<UpgradeView uid={user.uid} plano={plano} destaque="importar" onActivate={p=>{forceSetPlano(p);}}/>)}
          {view.startsWith("financas")&&(isPremium
            ?<FinancasView uid={user.uid} lancs={lancs} secao={view==="financas"?"visao":view.replace("financas-","")}/>
            :<UpgradeView uid={user.uid} plano={plano} destaque="financas" onActivate={p=>{forceSetPlano(p);}}/>)}
        </main></ErrorBoundary>
      )}
      <Nav view={view} setView={setView}/>
      <Drawer open={drawerOpen} onClose={()=>setDrawerOpen(false)} view={view} setView={setView} user={user} profilePhoto={profilePhoto} divPendCount={divPendCount} onLogout={handleLogout} theme={theme} onToggleTheme={toggleTheme}/>
    </div>
    <Sheet open={modal} onClose={()=>setModal(false)} title="Novo Lançamento">
      <LancForm tipo={tipo} setTipo={setTipo} form={form} setForm={setForm} onSave={salvar} cartoes={cartoesList}/>
    </Sheet>
    {toast&&<div style={{position:"fixed",bottom:NH+12,left:"50%",transform:"translateX(-50%)",background:G.card2,border:`1px solid ${toast.type==="success"?G.green:G.red}55`,borderRadius:20,padding:"10px 18px",fontSize:13,fontWeight:600,zIndex:9999,display:"flex",alignItems:"center",gap:8,animation:"fadeUp .28s ease",boxShadow:"0 6px 24px rgba(0,0,0,.5)",whiteSpace:"nowrap",color:toast.type==="success"?G.green:G.red}}>{toast.type==="success"?"✓":"✕"} {toast.msg}</div>}
  </>);
}
