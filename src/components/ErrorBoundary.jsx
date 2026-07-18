import React from "react";
import { G } from "../theme.jsx";


// ─── ERROR BOUNDARY ───────────────────────────────────────────────────────────
class ErrorBoundary extends React.Component {
  constructor(p){super(p);this.state={err:null};}
  static getDerivedStateFromError(e){return{err:e};}
  componentDidCatch(e,i){console.error("View error:",e,i);}
  render(){
    if(this.state.err)return(
      <div style={{padding:32,textAlign:"center",color:G.muted}}>
        <div style={{fontSize:36,marginBottom:12}}>⚠️</div>
        <div style={{fontSize:18,fontWeight:700,color:G.text,marginBottom:8}}>Algo deu errado</div>
        <div style={{fontSize:13,marginBottom:20,lineHeight:1.6}}>{this.state.err.message}</div>
        <button onClick={()=>this.setState({err:null})} style={{padding:"10px 24px",borderRadius:12,border:"none",background:G.accent,color:"#fff",fontWeight:700,cursor:"pointer",fontFamily:"inherit"}}>Tentar novamente</button>
      </div>
    );
    return this.props.children;
  }
}
export { ErrorBoundary };
