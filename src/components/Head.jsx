import { G, HH } from "../theme.jsx";
import { ICON, Ic } from "./ui.jsx";

function Head({view,onRec,onDep,user,onDrawer,divPendCount=0,onSearch}){
  const TITLES={dashboard:"Início",receitas:"Receitas",despesas:"Despesas",chat:"IA",
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

export { Head };
