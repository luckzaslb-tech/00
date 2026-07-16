import { useState } from "react";
import { CAT_COLORS, CAT_EMOJI, MESES } from "../lib/constants.js";
import { fmt, fmtD, getMes, soPessoais } from "../lib/utils.js";
import { G } from "../theme.jsx";
import { ICON, Ic } from "../components/ui.jsx";

// ─── BUSCA VIEW ──────────────────────────────────────────────────────────────
function BuscaView({lancs,onDelete}){
  const [q,setQ]=useState("");
  const [filtTipo,setFiltTipo]=useState("Todos");
  const [filtCat,setFiltCat]=useState("Todas");
  const [filtMes,setFiltMes]=useState("Todos");
  const [sortBy,setSortBy]=useState("data"); // data | valor

  const lancsVisiveis=soPessoais(lancs);
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

export { BuscaView };
