import { useState } from "react";
import { CATS_DEP, CAT_COLORS, MESES } from "../lib/constants.js";
import { curMes, fmt, fmtD, getMes, isRealizado, lblDia, prevMes, round2, soPessoais, today } from "../lib/utils.js";
import { G } from "../theme.jsx";
import { ICON, Ic } from "../components/ui.jsx";
import { TxRow } from "../components/TxRow.jsx";

// ─── DASHBOARD — neobank: cartão + ações + extrato ────────────────────────────
function Dashboard({lancs:lancsAll,onDelete,user,onNovaDespesa,onNovaReceita,onIrCartoes,onIrRelatorio}){
  const [mes,setMes]=useState(curMes());
  const [hide,setHide]=useState(false);

  // Saldo pessoal: lançamentos do modo casal ficam de fora (têm tela própria)
  const lancs=soPessoais(lancsAll);
  const md=[...new Set(lancs.map(l=>getMes(l.data)))].sort().reverse().slice(0,6);
  if(!md.includes(curMes()))md.unshift(curMes());
  const dm=lancs.filter(l=>getMes(l.data)===mes&&isRealizado(l.data,l.agendado));
  const tR=round2(dm.filter(l=>l.tipo==="Receita").reduce((s,l)=>s+l.valor,0));
  const tD=round2(dm.filter(l=>l.tipo==="Despesa").reduce((s,l)=>s+l.valor,0));
  const sal=round2(tR-tD);

  // top categorias de despesa do mês
  const cats=CATS_DEP
    .map(c=>({name:c,v:dm.filter(l=>l.tipo==="Despesa"&&l.cat===c).reduce((s,l)=>s+l.valor,0),color:CAT_COLORS[c]||G.muted}))
    .filter(c=>c.v>0).sort((a,b)=>b.v-a.v).slice(0,4);

  // agendados futuros (próximos)
  const agendados=lancs.filter(l=>l.agendado&&l.data>today()).sort((a,b)=>a.data.localeCompare(b.data)).slice(0,3);

  // variação vs mês-calendário anterior
  const prevM=prevMes(mes);
  const prevLancs=lancs.filter(l=>getMes(l.data)===prevM&&isRealizado(l.data,l.agendado));
  const prevSal=prevLancs.length?round2(prevLancs.filter(l=>l.tipo==="Receita").reduce((s,l)=>s+l.valor,0)-prevLancs.filter(l=>l.tipo==="Despesa").reduce((s,l)=>s+l.valor,0)):null;
  const diff=prevSal!==null?round2(sal-prevSal):null;

  // extrato agrupado por dia (mais recente primeiro)
  const ordenados=[...dm].sort((a,b)=>b.data.localeCompare(a.data));
  const grupos=[];
  for(const l of ordenados){
    const g=grupos.find(x=>x.data===l.data);
    if(g)g.itens.push(l); else grupos.push({data:l.data,itens:[l]});
  }

  const [yy,mmN]=mes.split("-");
  const mesNome=MESES[parseInt(mmN)-1].toLowerCase();
  const acoes=[
    {l:"Despesa",ic:ICON.arrow_down,fn:onNovaDespesa,c:G.red},
    {l:"Receita",ic:ICON.arrow_up,fn:onNovaReceita,c:G.green},
    {l:"Cartões",ic:ICON.card,fn:onIrCartoes,c:G.accent},
    {l:"Relatório",ic:ICON.chart,fn:onIrRelatorio,c:G.accent},
  ];

  return(
  <div style={{paddingBottom:32}}>

    {/* ════ CARTÃO DO SALDO — assinatura da marca ════════════ */}
    <div style={{
      margin:"0 0 16px",
      borderRadius:20,
      padding:"20px 20px 18px",
      position:"relative",
      overflow:"hidden",
      background:`linear-gradient(135deg,${G.cardGrad1} 0%,${G.cardGrad2} 100%)`,
      boxShadow:"0 10px 30px rgba(4,120,87,.25)",
      color:G.onCard,
    }}>
      <div style={{position:"absolute",top:-50,right:-30,width:180,height:180,borderRadius:"50%",background:"radial-gradient(circle,rgba(255,255,255,.14),transparent 65%)",pointerEvents:"none"}}/>

      {/* topo: saudação */}
      <div style={{marginBottom:22}}>
        <div style={{fontSize:11,fontWeight:600,letterSpacing:.8,textTransform:"uppercase",color:"rgba(255,255,255,.65)"}}>Olá,</div>
        <div style={{fontSize:18,fontWeight:800,color:"#fff",lineHeight:1.1}}>{(user?.displayName||user?.email||"").split(" ")[0]||"bem-vindo"}</div>
      </div>

      {/* saldo */}
      <div style={{display:"flex",alignItems:"flex-end",justifyContent:"space-between"}}>
        <div>
          <div style={{fontSize:11,fontWeight:600,letterSpacing:.8,textTransform:"uppercase",color:"rgba(255,255,255,.7)",marginBottom:4}}>Saldo em {mesNome} '{yy.slice(2)}</div>
          <div className="num" style={{fontSize:34,fontWeight:800,letterSpacing:-1,lineHeight:1,color:sal<0?"#FECACA":"#fff",filter:hide?"blur(11px)":"none",transition:"filter .3s",userSelect:hide?"none":"auto"}}>
            {fmt(sal)}
          </div>
          {sal<0&&!hide&&<div style={{display:"inline-flex",alignItems:"center",gap:4,marginTop:8,background:"rgba(0,0,0,.22)",borderRadius:8,padding:"3px 9px"}}>
            <Ic d={ICON.warning} size={12} color="#FECACA"/>
            <span style={{fontSize:11,fontWeight:700,color:"#FECACA"}}>Saldo negativo</span>
          </div>}
          {diff!==null&&!hide&&<div style={{fontSize:12,fontWeight:500,color:"rgba(255,255,255,.85)",marginTop:7,display:"flex",alignItems:"center",gap:4}}>
            <Ic d={diff>=0?ICON.arrow_up:ICON.arrow_down} size={12} color="rgba(255,255,255,.85)"/>
            {diff>=0?"+":""}{fmt(diff)} vs mês anterior
          </div>}
        </div>
        <button onClick={()=>setHide(h=>!h)} aria-label={hide?"Mostrar saldo":"Ocultar saldo"} className="press"
          style={{background:"rgba(255,255,255,.16)",border:"none",borderRadius:20,padding:"7px",cursor:"pointer",display:"flex",flexShrink:0}}>
          <Ic d={ICON.eye} size={16} color="#fff"/>
        </button>
      </div>
    </div>

    {/* ════ PRIMEIROS PASSOS (só quando não há lançamentos) ══ */}
    {lancs.length===0&&<div style={{background:G.card,border:`1px solid ${G.border}`,borderRadius:16,padding:16,marginBottom:16}}>
      <div style={{fontSize:14,fontWeight:700,color:G.text,marginBottom:3}}>Bem-vindo ao Fine 👋</div>
      <div style={{fontSize:12,color:G.muted,marginBottom:14}}>Comece a controlar seu dinheiro em 3 passos:</div>
      {[
        {ic:ICON.plus,c:G.green,t:"Adicione um lançamento",d:"Toque em Despesa ou Receita aqui embaixo.",fn:onNovaDespesa},
        {ic:ICON.ai,c:G.accent,t:"Fale com a IA",d:'Escreva "gastei 30 no mercado" na aba IA.',fn:null},
        {ic:ICON.card,c:G.accent,t:"Cadastre seus cartões",d:"Acompanhe faturas e parcelas.",fn:onIrCartoes},
      ].map((p,i)=>(
        <button key={i} onClick={p.fn||undefined} className={p.fn?"press":""} style={{width:"100%",display:"flex",alignItems:"center",gap:12,padding:"9px 2px",background:"none",border:"none",cursor:p.fn?"pointer":"default",fontFamily:"inherit",textAlign:"left"}}>
          <div style={{width:32,height:32,borderRadius:9,background:p.c+"18",display:"flex",alignItems:"center",justifyContent:"center",flexShrink:0}}><Ic d={p.ic} size={15} color={p.c}/></div>
          <div style={{flex:1,minWidth:0}}>
            <div style={{fontSize:13,fontWeight:600,color:G.text}}>{p.t}</div>
            <div style={{fontSize:11,color:G.muted}}>{p.d}</div>
          </div>
        </button>
      ))}
    </div>}

    {/* ════ AÇÕES RÁPIDAS ════════════════════════════════════ */}
    <div style={{display:"grid",gridTemplateColumns:"repeat(4,1fr)",gap:8,marginBottom:20}}>
      {acoes.map((a,i)=>(
        <button key={i} onClick={a.fn} className="press"
          style={{display:"flex",flexDirection:"column",alignItems:"center",gap:7,padding:"12px 4px",borderRadius:14,border:`1px solid ${G.border}`,background:G.card,cursor:"pointer"}}>
          <div style={{width:38,height:38,borderRadius:12,background:a.c+"18",display:"flex",alignItems:"center",justifyContent:"center"}}>
            <Ic d={a.ic} size={18} color={a.c}/>
          </div>
          <span style={{fontSize:11,fontWeight:600,color:G.text}}>{a.l}</span>
        </button>
      ))}
    </div>

    {/* ════ RESUMO ENTROU/SAIU + MESES ═══════════════════════ */}
    <div style={{display:"flex",gap:10,marginBottom:14}}>
      {[{l:"Entrou",v:tR,c:G.green,ic:ICON.arrow_up},{l:"Saiu",v:tD,c:G.red,ic:ICON.arrow_down}].map((k,i)=>(
        <div key={i} style={{flex:1,background:G.card,border:`1px solid ${G.border}`,borderRadius:14,padding:"12px 14px"}}>
          <div style={{display:"flex",alignItems:"center",gap:6,marginBottom:4}}>
            <Ic d={k.ic} size={13} color={k.c}/>
            <span style={{fontSize:11,fontWeight:600,color:G.muted,textTransform:"uppercase",letterSpacing:.6}}>{k.l}</span>
          </div>
          <div className="num" style={{fontSize:17,fontWeight:700,color:k.c,filter:hide?"blur(7px)":"none",transition:"filter .3s"}}>{fmt(k.v)}</div>
        </div>
      ))}
    </div>

    {/* mes pills */}
    <div style={{display:"flex",gap:6,overflowX:"auto",scrollbarWidth:"none",padding:"2px 0 12px"}}>
      {md.map(m=>{
        const [my,mm]=m.split("-");
        const lbl=MESES[parseInt(mm)-1]+" '"+my.slice(2);
        const on=m===mes;
        return(<button key={m} onClick={()=>setMes(m)} className="press"
          style={{padding:"6px 14px",borderRadius:20,
            border:`1px solid ${on?G.accent:G.border}`,
            background:on?G.accent:"transparent",
            color:on?G.onCard:G.muted,
            fontSize:12,fontWeight:on?700:500,cursor:"pointer",flexShrink:0,whiteSpace:"nowrap",transition:"all .2s"}}>
          {lbl}
        </button>);
      })}
    </div>

    {/* ════ ONDE FOI O DINHEIRO (lista enxuta, sem donut) ════ */}
    {cats.length>0&&<div style={{background:G.card,border:`1px solid ${G.border}`,borderRadius:16,padding:"16px",marginBottom:16}}>
      <div style={{display:"flex",alignItems:"center",justifyContent:"space-between",marginBottom:14}}>
        <span style={{fontSize:11,fontWeight:700,letterSpacing:1,textTransform:"uppercase",color:G.muted}}>Onde foi o dinheiro</span>
        <button onClick={onIrRelatorio} className="press" style={{display:"flex",alignItems:"center",gap:3,background:"none",border:"none",cursor:"pointer",color:G.accent,fontSize:11,fontWeight:600,padding:0}}>
          Relatório <Ic d={ICON.arrowRight} size={12} color={G.accent}/>
        </button>
      </div>
      <div style={{display:"flex",flexDirection:"column",gap:11}}>
        {cats.map(cat=>{
          const p=tD>0?cat.v/tD*100:0;
          return(
            <div key={cat.name}>
              <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:5}}>
                <div style={{display:"flex",alignItems:"center",gap:7}}>
                  <div style={{width:7,height:7,borderRadius:"50%",background:cat.color,flexShrink:0}}/>
                  <span style={{fontSize:13,color:G.text}}>{cat.name}</span>
                </div>
                <span className="num" style={{fontSize:12,fontWeight:700,color:G.text}}>{hide?"•••":fmt(cat.v)}</span>
              </div>
              <div style={{height:5,background:G.card2,borderRadius:3,overflow:"hidden"}}>
                <div style={{height:"100%",width:`${p}%`,background:cat.color,borderRadius:3,transition:"width .35s ease"}}/>
              </div>
            </div>
          );
        })}
      </div>
    </div>}

    {/* ════ PRÓXIMOS (agendados) ═════════════════════════════ */}
    {agendados.length>0&&<div style={{background:G.yellow+"12",border:`1px solid ${G.yellow}33`,borderRadius:16,padding:"14px 16px",marginBottom:16}}>
      <div style={{display:"flex",alignItems:"center",gap:6,marginBottom:10}}>
        <Ic d={ICON.clock} size={12} color={G.yellow}/>
        <span style={{fontSize:11,fontWeight:700,letterSpacing:1,textTransform:"uppercase",color:G.yellow}}>Próximos</span>
      </div>
      {agendados.map(l=>{const isR=l.tipo==="Receita";return(
        <div key={l.id} style={{display:"flex",alignItems:"center",gap:12,padding:"7px 0"}}>
          <div style={{width:30,height:30,borderRadius:10,background:(isR?G.green:G.red)+"22",display:"flex",alignItems:"center",justifyContent:"center",flexShrink:0}}>
            <Ic d={isR?ICON.arrow_up:ICON.arrow_down} size={14} color={isR?G.green:G.red}/>
          </div>
          <div style={{flex:1}}>
            <div style={{fontSize:13,fontWeight:500,color:G.text}}>{l.desc||l.cat}</div>
            <div style={{fontSize:10,color:G.muted}}>{fmtD(l.data)}</div>
          </div>
          <div className="num" style={{fontSize:13,fontWeight:700,color:isR?G.green:G.red}}>{hide?"•••":(isR?"+":"-")+fmt(l.valor)}</div>
        </div>
      );})}
    </div>}

    {/* ════ EXTRATO — feed agrupado por dia ══════════════════ */}
    <div style={{fontSize:11,fontWeight:700,letterSpacing:1,textTransform:"uppercase",color:G.muted,margin:"4px 2px 8px"}}>Extrato</div>
    {grupos.length===0
      ?<div style={{background:G.card,border:`1px solid ${G.border}`,borderRadius:16,textAlign:"center",color:G.muted,padding:"32px 0",fontSize:13}}>Nenhum lançamento neste mês</div>
      :grupos.map(g=>(
        <div key={g.data} style={{marginBottom:10}}>
          <div style={{fontSize:11,fontWeight:600,color:G.muted,padding:"6px 2px 4px",textTransform:"capitalize"}}>{lblDia(g.data)}</div>
          <div style={{background:G.card,border:`1px solid ${G.border}`,borderRadius:16,padding:"2px 16px"}}>
            {g.itens.map(l=><TxRow key={l.id} l={l} onDelete={onDelete} hideValor={hide} hideDate minimal/>)}
          </div>
        </div>
      ))
    }

  </div>);
}
export { Dashboard };
