import { G } from "../theme.jsx";
import { ICON, Ic } from "./ui.jsx";

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
          <span style={{fontSize:10,fontWeight:600}}>{it.l}</span>
        </button>
      ))}
    </div>
  );
}

export { Nav };
