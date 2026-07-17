import { G } from "../theme.jsx";
import { Ic, ICON } from "./ui.jsx";

function Sheet({open,onClose,title,children}){
  if(!open)return null;
  return(
    <div onClick={e=>e.target===e.currentTarget&&onClose()} style={{position:"fixed",inset:0,zIndex:9500,background:"rgba(0,0,0,.55)",backdropFilter:"blur(4px)",display:"flex",alignItems:"flex-end"}}>
      <div style={{width:"100%",maxHeight:"94vh",background:G.card,borderRadius:"20px 20px 0 0",border:`1px solid ${G.border2}`,display:"flex",flexDirection:"column",animation:"slideUp .28s cubic-bezier(.32,.72,0,1)"}}>
        <div style={{display:"flex",justifyContent:"center",paddingTop:10,paddingBottom:2}}><div style={{width:36,height:4,borderRadius:2,background:G.border2}}/></div>
        <div style={{display:"flex",alignItems:"center",justifyContent:"space-between",padding:"8px 20px 14px"}}>
          <div style={{fontSize:19,fontWeight:700}}>{title}</div>
          <button onClick={onClose} aria-label="Fechar" style={{width:32,height:32,borderRadius:10,border:"none",background:G.card2,color:G.muted,cursor:"pointer",display:"flex",alignItems:"center",justifyContent:"center"}}><Ic d={ICON.x} size={15}/></button>
        </div>
        <div style={{overflowY:"auto",padding:"0 20px 32px",flex:1}}>{children}</div>
      </div>
    </div>
  );
}

export { Sheet };
