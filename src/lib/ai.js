import { MESES } from "./constants.js";
import { curMes, fmt, isRealizado, round2, soPessoais, toISO, today } from "./utils.js";

const _nrm=s=>String(s).toLowerCase().normalize("NFD").replace(/\p{Diacritic}/gu,"");
// Regras de categorização por palavra-chave — reusadas pelo chat e pelo importador
const CAT_RULES=[
  ["Salário",["salario","holerite","clr"]],["Freelance",["freelance","freela","bico","trampo extra"]],
  ["Investimentos",["investimento","rendimento","cdb","fii","acoes","dividendo","tesouro"]],["Bônus",["bonus","gratificacao","13 salario","premio"]],
  ["Reembolso",["reembolso","ressarcimento","devolucao","estorno"]],["Renda Extra",["renda extra","vendi","venda"]],
  ["Alimentação",["mercado","supermercado","ifood","restaurante","lanche","pizza","hamburguer","sushi","acai","padaria","cafe","comida","almoco","jantar","feira","hortifruti","acougue","mercearia","atacadao","assai","carrefour","pao"]],
  ["Transporte",["uber","99","taxi","onibus","metro","gasolina","combustivel","estacionamento","pedagio","posto","passagem","bilhete","brt","trem","moto","revisao","mecanico","oficina","pneu"]],
  ["Moradia",["aluguel","condominio","iptu","agua","luz","energia","internet","reforma","manutencao","faxina","limpeza"]],
  ["Saúde",["medico","consulta","plano de saude","plano saude","exame","hospital","dentista","ortopedista","psicologo","terapia","clinica"]],
  ["Farmácia",["farmacia","remedio","drogaria","drogasil","ultrafarma","medicamento","vitamina"]],
  ["Academia",["academia","gym","musculacao","crossfit","natacao","pilates","yoga","personal"]],
  ["Educação",["curso","faculdade","escola","livro","udemy","alura","coursera","material escolar","idioma","ingles"]],
  ["Lazer",["netflix","cinema","show","teatro","viagem","hotel","bar","balada","game","steam","ingresso","passeio","praia","parque","cerveja","chopp","boteco"]],
  ["Assinaturas",["spotify","amazon prime","apple","youtube premium","deezer","hbo","disney","globoplay","assinatura","prime video"]],
  ["Vestuário",["roupa","calcado","tenis","camisa","calca","vestido","sapato","shein","zara","renner","c&a","americanas"]],
  ["Pets",["pet","veterinario","racao","dog","gato","cachorro"]],
  ["Eletrônicos",["celular","notebook","computador","tablet","fone","headphone","carregador","smartwatch"]],
  ["Presentes",["presente","gift","aniversario","natal","casamento"]],["Impostos",["imposto","multa","ipva","irpf","darf"]],
  ["Dívidas",["parcela","prestacao","emprestimo","fatura","divida","financiamento"]],
];
const REC_CATS=["Salário","Freelance","Investimentos","Bônus","Reembolso","Renda Extra","Aluguel Recebido","Dividendos"];
// Categoriza uma descrição por palavra-chave. tipo: "Receita" | "Despesa"
function categorizar(desc,tipo="Despesa"){
  const isRec=tipo==="Receita",fn=_nrm(desc);
  for(const [c,words] of CAT_RULES){
    if(words.some(w=>fn.includes(_nrm(w)))&&REC_CATS.includes(c)===isRec)return c;
  }
  return isRec?"Renda Extra":"Outros";
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
    let s=String(str).trim();
    // "12.90" (ponto seguido de 1-2 dígitos no fim) = decimal; "1.200" = milhar
    if(/^\d+\.\d{1,2}$/.test(s))return parseFloat(s)||0;
    s=s.replace(/\./g,"").replace(",",".");
    return parseFloat(s)||0;
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
  if(t.includes("ontem")){const d=new Date();d.setDate(d.getDate()-1);data=toISO(d);}
  const dm=t.match(/dia\s+(\d{1,2})/);
  if(dm){const m=curMes();data=`${m}-${String(dm[1]).padStart(2,"0")}`;}

  // ── sem valor = conversa ───────────────────────────
  const pergW=["quanto","gastei","recebi","resumo","relatorio","saldo","como estou","quanto tenho","me mostra","total","mes","esse mes","cartao","cartoes","fatura","orcamento","limite","maior gasto","onde gastei","por categoria","categoria","dentro do","estour"];
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
    const pairPat=/r?\$?\s*(\d{1,3}(?:[.]\d{3})+(?:[,]\d{1,2})?|\d+[.,]\d{1,2}|\d+)\s+(?:com|no|na|nos|nas|de|em|p\/|para|num|numa)?\s*([^,;0-9]+?)(?=r?\$?\s*\d|,|;|$)/gi;
    let pm;
    while((pm=pairPat.exec(msg))!==null){
      segments.push(pm[0].trim());
    }
  }

  // ── single lançamento ─────────────────────────────
  function parseSingle(fragment){
    const nt=norm(fragment);
    const vm=nt.match(/r?\$?\s*(\d{1,3}(?:[.]\d{3})+(?:[,]\d{1,2})?|\d+[.,]\d{1,2}|\d+)/);
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

const _norm=s=>s.toLowerCase().normalize("NFD").replace(/[̀-ͯ]/g,"");

// ctx: {lancs, cartoes, orcamentos} — mantém compat com callAI(msg, lancsArray)
async function callAI(msg,ctx){
  const {lancs=[],cartoes=[],orcamentos=[]}=Array.isArray(ctx)?{lancs:ctx}:(ctx||{});
  const r=localAI(msg,lancs);
  if(!r.isSummary)return r;

  const t=_norm(msg);
  const mes=curMes();
  const dm=soPessoais(lancs).filter(l=>l.data?.startsWith(mes)&&isRealizado(l.data,l.agendado));
  const desp=dm.filter(l=>l.tipo==="Despesa");
  const mn=MESES[new Date().getMonth()];

  // ── gasto por cartão ──
  if(/carta|fatura/.test(t)&&cartoes.length){
    const linhas=cartoes.map(k=>{
      const g=round2(desp.filter(l=>l.cartaoId===k.id||l.cartao===k.id||l.cartao===k.nome).reduce((s,l)=>s+l.valor,0));
      return{nome:k.nome,g};
    }).filter(x=>x.g>0).sort((a,b)=>b.g-a.g);
    if(!linhas.length)return{action:"conversa",resposta:`Nenhum gasto no cartão em ${mn}. 💳`};
    const tot=round2(linhas.reduce((s,x)=>s+x.g,0));
    return{action:"conversa",resposta:`💳 Gasto por cartão em ${mn}:\n\n`+linhas.map(x=>`• ${x.nome}: ${fmt(x.g)}`).join("\n")+`\n\nTotal no crédito: ${fmt(tot)}`};
  }

  // ── status do orçamento ──
  if(/orcamento|limite|dentro do|estour/.test(t)&&orcamentos.length){
    const linhas=orcamentos.map(o=>{
      const g=round2(desp.filter(l=>l.cat===o.cat).reduce((s,l)=>s+l.valor,0));
      const p=o.limite>0?Math.round(g/o.limite*100):0;
      return{cat:o.cat,g,limite:o.limite,p};
    }).sort((a,b)=>b.p-a.p);
    const estourou=linhas.filter(x=>x.g>x.limite);
    const head=estourou.length?`⚠️ ${estourou.length} orçamento(s) estourado(s):`:`✅ Tudo dentro do orçamento em ${mn}!`;
    return{action:"conversa",resposta:`${head}\n\n`+linhas.map(x=>`${x.g>x.limite?"🔴":x.p>=80?"🟡":"🟢"} ${x.cat}: ${fmt(x.g)} / ${fmt(x.limite)} (${x.p}%)`).join("\n")};
  }

  // ── maior gasto / por categoria ──
  if(/maior gasto|onde gastei|por categoria|mais gastei|categoria/.test(t)){
    const porCat={};
    for(const l of desp){porCat[l.cat]=round2((porCat[l.cat]||0)+l.valor);}
    const cats=Object.entries(porCat).sort((a,b)=>b[1]-a[1]);
    if(!cats.length)return{action:"conversa",resposta:`Nenhuma despesa em ${mn} ainda. 🎉`};
    const maiorLanc=[...desp].sort((a,b)=>b.valor-a.valor)[0];
    return{action:"conversa",resposta:`📊 Onde foi o dinheiro em ${mn}:\n\n`+cats.slice(0,5).map(([c,v])=>`• ${c}: ${fmt(v)}`).join("\n")+`\n\n💥 Maior gasto: ${maiorLanc.desc||maiorLanc.cat} — ${fmt(maiorLanc.valor)}`};
  }

  // ── resumo geral (padrão) ──
  const tR=round2(dm.filter(l=>l.tipo==="Receita").reduce((s,l)=>s+l.valor,0));
  const tD=round2(desp.reduce((s,l)=>s+l.valor,0));
  const sal=round2(tR-tD);
  return{action:"conversa",resposta:`📊 ${mn}/${new Date().getFullYear()}\n\n💚 Receitas: ${fmt(tR)}\n🔴 Despesas: ${fmt(tD)}\n${sal>=0?"💰":"😬"} Saldo: ${fmt(sal)}`};
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
  // Passa pelo proxy serverless (/api/chat) que injeta a ANTHROPIC_KEY — nunca chamar a API direto do browser
  const r=await fetch("/api/chat",{
    method:"POST",
    headers:{"Content-Type":"application/json"},
    body:JSON.stringify({
      model:"claude-haiku-4-5-20251001",
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

export { localAI, callAI, createSpeechRecognizer, analyzePhoto, categorizar };
