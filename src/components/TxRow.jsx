import { CAT_COLORS } from "../lib/constants.js";
import { fmt, fmtD, today } from "../lib/utils.js";
import { G } from "../theme.jsx";
import { Tag } from "./ui.jsx";

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

export { TxRow };
