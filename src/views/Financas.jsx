import { useState, useEffect, useRef } from "react";
import { db } from "../firebase.js";
import { collection, doc, addDoc, deleteDoc, updateDoc, getDocs } from "firebase/firestore";
import { XAxis, YAxis, Tooltip, ResponsiveContainer, LineChart, Line } from "recharts";
import { CATS_DEP, CAT_COLORS, CAT_EMOJI, MESES } from "../lib/constants.js";
import { curMes, fmt, fmtD, getMes, isRealizado, mesLbl, pct, round2, soPessoais, today } from "../lib/utils.js";
import { G, DARK, LIGHT, getTheme } from "../theme.jsx";
import { ICON, Ic, Lbl } from "../components/ui.jsx";
import { Sheet } from "../components/Sheet.jsx";

// ─── FINANÇAS VIEW ────────────────────────────────────────────────────────────
const CAT_ICONS={"Moradia":"🏠","Alimentação":"🍔","Transporte":"🚗","Saúde":"❤️","Educação":"📚","Lazer":"🎮","Vestuário":"👕","Assinaturas":"📱","Pets":"🐾","Beleza e Cuidados":"💅","Eletrônicos":"💻","Presentes":"🎁","Impostos":"🧾","Dívidas":"💳","Seguros":"🛡️","Academia":"💪","Farmácia":"💊","Outros":"","Salário":"","Freelance":"🖥️","Investimentos":<Ic d={ICON.chart} size={15}/>,"Aluguel Recebido":"🏡","Bônus":"⭐","Reembolso":"↩️","Renda Extra":"💡","Dividendos":"💰"};
const ORC_CORES=["#FB923C","#A78BFA","#F472B6","#34D399","#FBBF24","#60A5FA","#818CF8","#2DD4BF","#F97316","#E879F9"];

function FinancasView({uid,lancs:lancsAll,secao}){
  // secao comes from drawer nav
  const lancs=soPessoais(lancsAll); // casal não entra nas finanças pessoais
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
  const tR=round2(dm.filter(l=>l.tipo==="Receita").reduce((s,l)=>s+l.valor,0));
  const tD=round2(dm.filter(l=>l.tipo==="Despesa").reduce((s,l)=>s+l.valor,0));
  const sal=round2(tR-tD);
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
    const W=480,isDark=getTheme()==="dark";
    const T=isDark?DARK:LIGHT;
    const bg=T.bg,cardBg=T.card,textC=T.text,mutedC=T.muted;
    const greenC=T.green,redC=T.red,accentC=T.accent;
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
    <div style={{background:G.card,border:`1px solid ${G.border}`,borderRadius:20,padding:"20px",marginBottom:16,position:"relative",overflow:"hidden"}}>
      <div style={{display:"flex",alignItems:"center",justifyContent:"space-between",marginBottom:4}}>
        <div style={{fontSize:11,fontWeight:700,letterSpacing:1.2,textTransform:"uppercase",color:G.muted}}>Planejamento · {mesLbl(mes)}</div>
      </div>
      <div style={{marginBottom:18}}>
        <div style={{fontVariantNumeric:"tabular-nums",fontSize:36,fontWeight:700,letterSpacing:-2,color:sal>=0?G.green:G.red,lineHeight:1}}>{sal>=0?"+":""}{fmt(sal)}</div>
        <div style={{fontSize:12,color:G.muted,marginTop:4}}>Saldo livre · {tx>=0?tx.toFixed(0):0}% da renda poupado</div>
      </div>
      <div style={{display:"flex"}}>
        {[{l:"Receitas",v:fmt(tR),c:G.green},{l:"Despesas",v:fmt(tD),c:G.red},{l:"Orçamentos",v:`${orcamentos.length} ativos`,c:G.accent}].map((k,i)=>(
          <div key={i} style={{flex:1,borderRight:i<2?`1px solid ${G.border}`:"none",paddingRight:i<2?14:0,paddingLeft:i>0?14:0}}>
            <div style={{fontSize:10,color:G.muted,marginBottom:3}}>{k.l}</div>
            <div style={{fontVariantNumeric:"tabular-nums",fontSize:14,fontWeight:700,color:k.c}}>{k.v}</div>
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

    {/* ── ORÇAMENTOS ── */}
    {secao==="orcamentos"&&<div>
      <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:14}}>
        <div><div style={{fontSize:15,fontWeight:700}}>{orcamentos.length} orçamentos</div><div style={{fontSize:12,color:G.muted,marginTop:2}}>Limite mensal por categoria</div></div>
        <button onClick={()=>{setFo({cat:CATS_DEP[0],limite:"",cor:ORC_CORES[0]});setSheet("orc");}} className="press" style={{padding:"9px 18px",borderRadius:20,border:`1px solid ${G.accent}55`,background:G.accentL,color:G.accent,fontSize:12,fontWeight:700,cursor:"pointer",fontFamily:"inherit"}}>+ Novo</button>
      </div>
      {/* Avisos automáticos de estouro/limite (antes era a tela "Alertas") */}
      {autoAlertas.length>0&&<div style={{marginBottom:14,display:"flex",flexDirection:"column",gap:8}}>
        {autoAlertas.map((a,i)=><div key={i} style={{display:"flex",alignItems:"center",gap:10,padding:"11px 14px",borderRadius:12,background:a.cor+"12",border:`1px solid ${a.cor}44`}}>
          <Ic d={ICON.warning} size={16} color={a.cor}/><div style={{fontSize:12,lineHeight:1.4,flex:1,color:G.text}}>{a.msg}</div>
        </div>)}
      </div>}
      <div style={{background:G.card,border:`1px solid ${G.border}`,borderRadius:16,padding:16,marginBottom:14}}>
        <div style={{display:"flex",justifyContent:"space-between",marginBottom:10}}>
          <div><div style={{fontSize:11,color:G.muted,marginBottom:2}}>Total gasto</div><div style={{fontVariantNumeric:"tabular-nums",fontSize:20,fontWeight:700,color:G.red}}>{fmt(totalGasto)}</div></div>
          <div style={{textAlign:"right"}}><div style={{fontSize:11,color:G.muted,marginBottom:2}}>Total limite</div><div style={{fontVariantNumeric:"tabular-nums",fontSize:20,fontWeight:700,color:G.accent}}>{fmt(totalLimite)}</div></div>
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
              <span style={{fontSize:12,color:G.muted}}>Gasto: <span style={{fontVariantNumeric:"tabular-nums",fontWeight:700,color:over?G.red:G.text}}>{fmt(g)}</span></span>
              <span style={{fontSize:12,color:G.muted}}>{over?<span style={{color:G.red}}>Estourou {fmt(g-o.limite)}</span>:<span>Faltam <span style={{fontVariantNumeric:"tabular-nums",fontWeight:700,color:G.green}}>{fmt(Math.max(0,o.limite-g))}</span></span>}</span>
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
                    <span style={{fontVariantNumeric:"tabular-nums",fontSize:13,fontWeight:700,color:cor}}>{fmt(v)}</span>
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
                  <div style={{fontVariantNumeric:"tabular-nums",fontSize:15,fontWeight:700,color:r.c}}>{fmt(r.cur)}</div>
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
              <div style={{flex:1}}><div style={{fontSize:12,color:G.muted}}>{m.l}</div><div style={{fontVariantNumeric:"tabular-nums",fontSize:16,fontWeight:700,color:m.c}}>{m.v}</div></div>
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
              <div style={{fontVariantNumeric:"tabular-nums",fontSize:13,fontWeight:700,color:s>=0?G.green:G.red}}>{s>=0?"+":""}{fmt(s)}</div>
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
                  <div style={{height:"100%",width:`${frac*100}%`,background:G.accent,borderRadius:6}}/>
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
                  <div style={{flex:1}}><div style={{fontSize:11,color:G.muted}}>{r.l}</div><div style={{fontVariantNumeric:"tabular-nums",fontSize:15,fontWeight:700,color:r.c}}>{r.v}</div></div>
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

    {/* ── SHEETS ── */}
    <Sheet open={sheet==="orc"} onClose={()=>setSheet(null)} title="Novo Orçamento">
      <div style={{display:"flex",flexDirection:"column",gap:14}}>
        <div><Lbl>Categoria</Lbl><select value={fo.cat} onChange={e=>setFo(f=>({...f,cat:e.target.value}))} className="inp">{CATS_DEP.map(c=><option key={c}>{c}</option>)}</select></div>
        <div><Lbl>Limite Mensal (R$)</Lbl><input type="number" value={fo.limite} onChange={e=>setFo(f=>({...f,limite:e.target.value}))} placeholder="Ex: 500" className="inp"/></div>
        <div><Lbl>Cor</Lbl><div style={{display:"flex",gap:8,flexWrap:"wrap"}}>{ORC_CORES.map(c=><div key={c} onClick={()=>setFo(f=>({...f,cor:c}))} style={{width:30,height:30,borderRadius:"50%",background:c,cursor:"pointer",border:`3px solid ${fo.cor===c?"#fff":"transparent"}`,transition:"border .15s"}}/> )}</div></div>
        <button onClick={salvarOrc} className="press" style={{padding:"15px",borderRadius:14,border:"none",background:G.accent,color:"#fff",fontWeight:700,fontSize:15,cursor:"pointer",fontFamily:"inherit"}}>Criar Orçamento</button>
      </div>
    </Sheet>

  </div>);
}

export { FinancasView };
