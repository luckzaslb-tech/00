import { useState } from "react";
import { CATS_DEP, CATS_REC, CAT_COLORS, CAT_EMOJI, MESES } from "../lib/constants.js";
import { curMes, fmt, getMes, isRealizado, mesLblFull, soPessoais } from "../lib/utils.js";
import { G } from "../theme.jsx";
import { Tag } from "../components/ui.jsx";
import { TxRow } from "../components/TxRow.jsx";

// ─── LANCS VIEW ───────────────────────────────────────────────────────────────
function LancsView({tipo,lancs,recorrentes,onDelete,onToggleRec,onDeleteRec,isPremium=false,onUpgrade}){
  const [mf,setMf]=useState(curMes());
  const [cf,setCf]=useState("");
  const [showCats,setShowCats]=useState(false);
  const isR=tipo==="Receita", ac=isR?G.green:G.red;
  const cats=isR?CATS_REC:CATS_DEP;

  const todos=soPessoais(lancs).filter(l=>l.tipo===tipo);
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
      <div style={{fontVariantNumeric:"tabular-nums",fontSize:38,fontWeight:700,letterSpacing:-1.5,lineHeight:1,color:ac,
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
            <div style={{fontVariantNumeric:"tabular-nums",fontSize:13,fontWeight:700,color:k.c,lineHeight:1.2}}>{k.v}</div>
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
        <span style={{fontSize:12,fontVariantNumeric:"tabular-nums",fontWeight:700,color:ac,marginLeft:"auto"}}>{fmt(totalRec)}<span style={{fontSize:10,color:G.muted,fontWeight:400}}>/mês</span></span>
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
            <div style={{fontVariantNumeric:"tabular-nums",fontSize:14,fontWeight:700,color:r.ativo?ac:G.muted,flexShrink:0}}>{fmt(r.valor)}</div>
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
                <span style={{fontVariantNumeric:"tabular-nums",fontSize:12,fontWeight:700,color:cat.color}}>{fmt(cat.v)}</span>
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
        <span style={{fontVariantNumeric:"tabular-nums",fontSize:15,fontWeight:700,color:ac}}>
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
export { LancsView };
