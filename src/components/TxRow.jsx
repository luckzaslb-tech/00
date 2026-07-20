import { CAT_COLORS } from "../lib/constants.js";
import { fmt, fmtD, today } from "../lib/utils.js";
import { G } from "../theme.jsx";
import { Tag, Ic, ICON } from "./ui.jsx";

// ─── TX ROW ───────────────────────────────────────────────────────────────────
function TxRow({l,onDelete,full,hideValor,hideDate}){
  const isR=l.tipo==="Receita",c=isR?G.green:G.red;
  const isPendente=l.agendado&&l.data>today();
  return(
    <div style={{display:"flex",alignItems:"center",gap:12,padding:"12px 0",borderBottom:`1px solid ${G.border}`,opacity:isPendente?.55:1}}>
      <div style={{width:38,height:38,borderRadius:12,flexShrink:0,background:isPendente?G.card2:isR?G.greenL:G.redL,display:"flex",alignItems:"center",justifyContent:"center",color:isPendente?G.muted:c,position:"relative",border:isPendente?`1.5px dashed ${G.border2}`:"none"}}>
        {isPendente?<Ic d={ICON.clock} size={15} color={G.muted}/>:<Ic d={isR?ICON.arrow_up:ICON.arrow_down} size={15} color={c}/>}
        {l.auto&&<div style={{position:"absolute",bottom:-2,right:-2,width:14,height:14,borderRadius:"50%",background:G.accent,display:"flex",alignItems:"center",justifyContent:"center",border:`1.5px solid ${G.card}`}}><Ic d={ICON.repeat} size={8} color="#fff"/></div>}
      </div>
      <div style={{flex:1,minWidth:0}}>
        <div style={{fontSize:14,fontWeight:500,overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap",color:isPendente?G.muted:G.text}}>{l.desc||l.cat}</div>
        <div style={{display:"flex",alignItems:"center",gap:6,marginTop:3,flexWrap:"wrap"}}>
          {!hideDate&&<span style={{fontSize:11,color:G.muted}}>{fmtD(l.data)}</span>}
          <Tag color={CAT_COLORS[l.cat]||G.muted}>{l.cat}</Tag>
          {l.subcat&&<span style={{fontSize:11,color:G.muted}}>· {l.subcat}</span>}
          {full&&<span style={{fontSize:11,color:G.muted}}>{l.forma}</span>}
          {l.auto&&<Tag color={G.accent}>auto</Tag>}
          {isPendente&&<Tag color={G.yellow}>agendado</Tag>}
        </div>
      </div>
      <div className="num" style={{fontSize:15,fontWeight:700,color:isPendente?G.muted:c,flexShrink:0,textDecoration:isPendente?"line-through":"none",filter:hideValor?"blur(7px)":"none",transition:"filter .3s"}}>{isR?"+":"-"}{fmt(l.valor)}</div>
      <button onClick={()=>onDelete(l.id)} aria-label="Excluir lançamento" style={{background:"none",border:"none",color:G.border2,cursor:"pointer",padding:"8px 6px",lineHeight:1,display:"flex"}}
        onMouseEnter={e=>e.currentTarget.style.color=G.red} onMouseLeave={e=>e.currentTarget.style.color=G.border2}><Ic d={ICON.x} size={15}/></button>
    </div>
  );
}

export { TxRow };
