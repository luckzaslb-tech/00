import { G } from "../theme.jsx";
import { ICON, Ic } from "./ui.jsx";

function Nav({view,setView,onMais}){
  const transAtiva=view==="transacoes";
  const items=[
    {id:"dashboard",icon:<Ic d={ICON.home} size={20}/>,l:"Início"},
    {id:"transacoes",icon:<Ic d={ICON.wallet} size={20}/>,l:"Transações"},
    {id:"chat",icon:<Ic d={ICON.ai} size={20}/>,l:"IA"},
    {id:"mais",icon:<Ic d={ICON.menu} size={20}/>,l:"Mais",action:true},
  ];
  return(
    <div className="nav-bar">
      {items.map(it=>{
        const active=it.action?false:view===it.id;
        return(
        <button key={it.id} onClick={()=>it.action?onMais&&onMais():setView(it.id)} className="press" style={{flex:1,padding:"8px 0",background:"none",border:"none",cursor:"pointer",display:"flex",flexDirection:"column",alignItems:"center",gap:2,color:active?G.accent:G.muted,position:"relative"}}>
          {active&&<div style={{position:"absolute",top:0,left:"50%",transform:"translateX(-50%)",width:24,height:2,borderRadius:"0 0 2px 2px",background:G.accent}}/>}
          <span style={{display:"flex",alignItems:"center",justifyContent:"center",height:20}}>{it.icon}</span>
          <span style={{fontSize:10,fontWeight:600}}>{it.l}</span>
        </button>
      );})}
    </div>
  );
}

export { Nav };
