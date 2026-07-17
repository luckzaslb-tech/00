import { useState } from "react";
import { CATS_DEP, CATS_REC, CAT_COLORS, CAT_EMOJI, MESES } from "../lib/constants.js";
import { curMes, fmt, getMes, isRealizado, lblDia, round2, soPessoais } from "../lib/utils.js";
import { G } from "../theme.jsx";
import { ICON, Ic, Tag } from "../components/ui.jsx";
import { TxRow } from "../components/TxRow.jsx";

// ─── TRANSAÇÕES — lista única (funde Receitas + Despesas + Busca) ─────────────
function TransacoesView({lancs,recorrentes=[],onDelete,onToggleRec,onDeleteRec,isPremium=false,onUpgrade}){
  const [q,setQ]=useState("");
  const [filtTipo,setFiltTipo]=useState("Tudo"); // Tudo | Receita | Despesa
  const [mf,setMf]=useState(curMes());
  const [cf,setCf]=useState("");
  const [showCats,setShowCats]=useState(false);
  const [showRec,setShowRec]=useState(false);

  const todos=soPessoais(lancs);
  const allMeses=[...new Set(todos.map(l=>getMes(l.data)))].sort().reverse();
  if(!allMeses.includes(curMes()))allMeses.unshift(curMes());
  const meses=isPremium?allMeses:allMeses.slice(0,3);

  // categorias disponíveis conforme o filtro de tipo
  const catsDisp=filtTipo==="Receita"?CATS_REC:filtTipo==="Despesa"?CATS_DEP:[...new Set([...CATS_DEP,...CATS_REC])];

  const nq=q.trim().toLowerCase();
  let data=todos.filter(l=>{
    if(filtTipo!=="Tudo"&&l.tipo!==filtTipo)return false;
    if(mf&&getMes(l.data)!==mf)return false;
    if(cf&&l.cat!==cf)return false;
    if(nq&&!`${l.desc||""} ${l.cat||""} ${l.forma||""} ${l.valor}`.toLowerCase().includes(nq))return false;
    return true;
  }).sort((a,b)=>b.data.localeCompare(a.data));

  const totalR=round2(data.filter(l=>l.tipo==="Receita").reduce((s,l)=>s+l.valor,0));
  const totalD=round2(data.filter(l=>l.tipo==="Despesa").reduce((s,l)=>s+l.valor,0));

  // recorrentes (ambos os tipos)
  const listaRec=recorrentes.filter(r=>filtTipo==="Tudo"||r.tipo===filtTipo);

  // agrupamento por dia
  const grupos=[];
  for(const l of data){
    const g=grupos.find(x=>x.data===l.data);
    if(g)g.itens.push(l); else grupos.push({data:l.data,itens:[l]});
  }

  const seg=[["Tudo","Tudo"],["Receita","Entradas"],["Despesa","Saídas"]];

  return(<div style={{paddingBottom:24,display:"flex",flexDirection:"column",gap:12}}>

    {/* busca */}
    <div style={{position:"relative"}}>
      <div style={{position:"absolute",left:12,top:"50%",transform:"translateY(-50%)",pointerEvents:"none"}}>
        <Ic d={ICON.search} size={16} color={G.muted}/>
      </div>
      <input value={q} onChange={e=>setQ(e.target.value)} placeholder="Buscar por descrição, categoria, valor..."
        className="inp" style={{width:"100%",paddingLeft:36,fontSize:14}}/>
      {q&&<button onClick={()=>setQ("")} aria-label="Limpar busca" style={{position:"absolute",right:8,top:"50%",transform:"translateY(-50%)",background:"none",border:"none",color:G.muted,cursor:"pointer",display:"flex",padding:4}}><Ic d={ICON.x} size={14}/></button>}
    </div>

    {/* segmento Tudo / Entradas / Saídas */}
    <div style={{display:"flex",gap:6,background:G.card2,borderRadius:12,padding:4}}>
      {seg.map(([val,lbl])=>{
        const on=filtTipo===val;
        const c=val==="Receita"?G.green:val==="Despesa"?G.red:G.accent;
        return(<button key={val} onClick={()=>{setFiltTipo(val);setCf("");}} className="press"
          style={{flex:1,padding:"8px 0",borderRadius:9,border:"none",cursor:"pointer",fontFamily:"inherit",fontSize:13,fontWeight:on?700:500,
            background:on?G.card:"transparent",color:on?c:G.muted,boxShadow:on?"0 1px 3px rgba(0,0,0,.12)":"none",transition:"all .15s"}}>
          {lbl}
        </button>);
      })}
    </div>

    {/* filtros mês + categoria */}
    <div>
      <div style={{display:"flex",gap:6,overflowX:"auto",scrollbarWidth:"none",paddingBottom:2,marginBottom:8}}>
        {["",...meses].map((m,i)=>{
          const lbl=m?(()=>{const[y,mm]=m.split("-");return MESES[parseInt(mm)-1]+" '"+y.slice(2);})():"Todos";
          const on=mf===m;
          return(<button key={i} onClick={()=>setMf(m)} className="press"
            style={{padding:"6px 14px",borderRadius:20,border:`1px solid ${on?G.accent:G.border}`,
              background:on?G.accent:"transparent",color:on?G.onCard:G.muted,fontSize:12,fontWeight:on?700:500,cursor:"pointer",flexShrink:0,whiteSpace:"nowrap",transition:"all .2s"}}>
            {lbl}
          </button>);
        })}
      </div>

      {!isPremium&&<button onClick={()=>onUpgrade&&onUpgrade()} className="press"
        style={{display:"flex",alignItems:"center",gap:10,padding:"9px 14px",borderRadius:12,background:G.accentL,border:`1px solid ${G.accent}33`,marginBottom:8,cursor:"pointer",width:"100%",textAlign:"left"}}>
        <Ic d={ICON.star} size={15} color={G.accent}/>
        <div style={{flex:1}}>
          <span style={{fontSize:12,color:G.accent,fontWeight:600}}>Histórico limitado a 3 meses </span>
          <span style={{fontSize:11,color:G.muted}}>— toque para ver planos</span>
        </div>
      </button>}

      <button onClick={()=>setShowCats(v=>!v)} className="press"
        style={{display:"inline-flex",alignItems:"center",gap:6,padding:"6px 14px",borderRadius:20,
          border:`1px solid ${cf?G.accent:G.border}`,background:cf?G.accentL:"transparent",
          color:cf?G.accent:G.muted,fontSize:12,cursor:"pointer",fontWeight:cf?700:500,transition:"all .2s"}}>
        {cf||"Categoria"} <Ic d="M6 9l6 6 6-6" size={12} color={cf?G.accent:G.muted}/>
      </button>
      {showCats&&<div style={{display:"flex",gap:6,overflowX:"auto",scrollbarWidth:"none",paddingBottom:4,marginTop:6}}>
        <button onClick={()=>{setCf("");setShowCats(false);}} className="press"
          style={{padding:"6px 14px",borderRadius:20,border:`1px solid ${G.border}`,background:"transparent",color:G.muted,fontSize:12,cursor:"pointer",flexShrink:0}}>
          Todas
        </button>
        {catsDisp.map(cat=>(
          <button key={cat} onClick={()=>{setCf(cf===cat?"":cat);setShowCats(false);}} className="press"
            style={{padding:"6px 14px",borderRadius:20,border:`1px solid ${cf===cat?G.accent:G.border}`,
              background:cf===cat?G.accentL:"transparent",color:cf===cat?G.accent:G.muted,fontSize:12,cursor:"pointer",flexShrink:0,whiteSpace:"nowrap",transition:"all .2s"}}>
            {CAT_EMOJI[cat]||""} {cat}
          </button>
        ))}
      </div>}
    </div>

    {/* resumo entradas/saídas do filtro */}
    {data.length>0&&<div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:8}}>
      <div style={{background:G.greenL,borderRadius:12,padding:"10px 12px"}}>
        <div style={{fontSize:10,color:G.muted,fontWeight:700,textTransform:"uppercase",letterSpacing:.8}}>Entradas</div>
        <div className="num" style={{fontSize:16,fontWeight:700,color:G.green,marginTop:2}}>{fmt(totalR)}</div>
      </div>
      <div style={{background:G.redL,borderRadius:12,padding:"10px 12px"}}>
        <div style={{fontSize:10,color:G.muted,fontWeight:700,textTransform:"uppercase",letterSpacing:.8}}>Saídas</div>
        <div className="num" style={{fontSize:16,fontWeight:700,color:G.red,marginTop:2}}>{fmt(totalD)}</div>
      </div>
    </div>}

    {/* recorrentes recolhível */}
    {listaRec.length>0&&<div style={{background:G.card,border:`1px solid ${G.border}`,borderRadius:16,overflow:"hidden"}}>
      <button onClick={()=>setShowRec(v=>!v)} className="press"
        style={{width:"100%",display:"flex",alignItems:"center",gap:8,padding:"13px 16px",background:"none",border:"none",cursor:"pointer",fontFamily:"inherit"}}>
        <Ic d={ICON.repeat} size={15} color={G.accent}/>
        <span style={{fontSize:11,fontWeight:700,letterSpacing:1,textTransform:"uppercase",color:G.accent}}>Recorrentes</span>
        <span style={{fontSize:11,color:G.muted,marginLeft:"auto"}}>{listaRec.length}</span>
        <Ic d="M6 9l6 6 6-6" size={14} color={G.muted}/>
      </button>
      {showRec&&<div style={{padding:"0 16px 4px"}}>
        {listaRec.map(r=>{const isR=r.tipo==="Receita",ac=isR?G.green:G.red;return(
          <div key={r.id} style={{display:"flex",alignItems:"center",gap:12,padding:"11px 0",borderTop:`1px solid ${G.border}`}}>
            <div style={{width:34,height:34,borderRadius:11,flexShrink:0,background:r.ativo?(isR?G.greenL:G.redL):G.card2,display:"flex",alignItems:"center",justifyContent:"center",fontSize:15}}>{CAT_EMOJI[r.cat]||"🔁"}</div>
            <div style={{flex:1,minWidth:0}}>
              <div style={{fontSize:13,fontWeight:600,color:r.ativo?G.text:G.muted,overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap"}}>{r.desc||r.cat}</div>
              <div style={{display:"flex",gap:6,marginTop:3,alignItems:"center"}}>
                <Tag color={CAT_COLORS[r.cat]||G.muted}>{r.cat}</Tag>
                <span style={{fontSize:10,color:G.muted}}>{r.freq==="semanal"?"semanal":r.dia?`dia ${r.dia}`:""}</span>
              </div>
            </div>
            <div className="num" style={{fontSize:14,fontWeight:700,color:r.ativo?ac:G.muted,flexShrink:0}}>{fmt(r.valor)}</div>
            <button onClick={()=>onToggleRec(r.id)} aria-label={r.ativo?"Pausar":"Ativar"} className="press"
              style={{width:38,height:22,borderRadius:11,border:"none",cursor:"pointer",flexShrink:0,background:r.ativo?ac:G.border2,position:"relative"}}>
              <div style={{position:"absolute",top:3,width:16,height:16,borderRadius:"50%",background:"#fff",transition:"left .2s",left:r.ativo?19:3,boxShadow:"0 1px 3px rgba(0,0,0,.3)"}}/>
            </button>
            <button onClick={()=>onDeleteRec(r.id)} aria-label="Remover recorrente" style={{background:"none",border:"none",color:G.border2,cursor:"pointer",padding:4,display:"flex"}}><Ic d={ICON.x} size={14}/></button>
          </div>
        );})}
      </div>}
    </div>}

    {/* lista agrupada por dia */}
    {grupos.length===0
      ?<div style={{background:G.card,border:`1px solid ${G.border}`,borderRadius:16,textAlign:"center",color:G.muted,padding:"40px 20px",fontSize:14}}>
        {q||cf||filtTipo!=="Tudo"||mf?"Nenhum resultado":"Nenhum lançamento ainda"}
        {(q||cf||filtTipo!=="Tudo")&&<div><button onClick={()=>{setQ("");setCf("");setFiltTipo("Tudo");}} style={{marginTop:12,padding:"8px 16px",borderRadius:12,border:`1px solid ${G.border}`,background:"none",color:G.accent,cursor:"pointer",fontSize:13}}>Limpar filtros</button></div>}
      </div>
      :grupos.map(g=>(
        <div key={g.data}>
          <div style={{fontSize:11,fontWeight:600,color:G.muted,padding:"2px 2px 6px",textTransform:"capitalize"}}>{lblDia(g.data)}</div>
          <div style={{background:G.card,border:`1px solid ${G.border}`,borderRadius:16,padding:"2px 16px"}}>
            {g.itens.map(l=><TxRow key={l.id} l={l} onDelete={onDelete} hideDate full/>)}
          </div>
        </div>
      ))
    }
  </div>);
}
export { TransacoesView };
