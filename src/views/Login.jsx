import { useState } from "react";
import { G } from "../theme.jsx";
import { Spinner } from "../components/ui.jsx";

// ─── LOGIN SCREEN ─────────────────────────────────────────────────────────────
function LoginScreen({onGoogle,onApple,onEmail,loading,error}){
  const [modo,setModo]=useState(""); // ""|"login"|"cadastro"
  const [email,setEmail]=useState("");
  const [senha,setSenha]=useState("");
  const [nome,setNome]=useState("");
  const [emailErr,setEmailErr]=useState("");

  async function handleEmail(){
    if(!email.includes("@")){setEmailErr("Email inválido");return;}
    if(senha.length<6){setEmailErr("Senha mínimo 6 caracteres");return;}
    setEmailErr("");
    onEmail(email,senha,modo==="cadastro"?nome:null);
  }

  return(
    <div style={{minHeight:"100vh",display:"flex",flexDirection:"column",alignItems:"center",justifyContent:"center",
      background:"linear-gradient(145deg,#0a0a12 0%,#0e0c1e 50%,#0a1020 100%)",padding:"24px",position:"relative",overflow:"hidden"}}>
      <style>{".login-inp::placeholder{color:rgba(255,255,255,.3)}"}</style>
      {/* blobs */}
      <div style={{position:"absolute",top:-100,left:-100,width:400,height:400,borderRadius:"50%",background:"radial-gradient(circle,rgba(124,106,247,.15),transparent 65%)",pointerEvents:"none"}}/>
      <div style={{position:"absolute",bottom:-100,right:-80,width:300,height:300,borderRadius:"50%",background:"radial-gradient(circle,rgba(46,204,142,.1),transparent 65%)",pointerEvents:"none"}}/>

      <div style={{width:"100%",maxWidth:380,position:"relative"}}>
        {/* Logo */}
        <div style={{textAlign:"center",marginBottom:36}}>
          <div style={{fontFamily:"'Fraunces',serif",fontSize:38,fontWeight:700,color:"#fff",marginBottom:6}}>
            fin<span style={{color:"#7C6AF7"}}>ance</span>
          </div>
          <div style={{fontSize:14,color:"rgba(255,255,255,.4)"}}>Controle financeiro inteligente</div>
        </div>

        {error&&<div style={{background:"rgba(255,92,106,.15)",border:"1px solid rgba(255,92,106,.3)",borderRadius:12,padding:"10px 14px",marginBottom:16,fontSize:13,color:"#FF5C6A"}}>{error}</div>}

        {modo===""&&(
          <div style={{display:"flex",flexDirection:"column",gap:12}}>
            <button onClick={onGoogle} disabled={loading} className="press"
              style={{width:"100%",padding:"14px",borderRadius:14,border:"1px solid rgba(255,255,255,.15)",background:"rgba(255,255,255,.06)",
                color:"#fff",fontSize:15,fontWeight:600,cursor:"pointer",display:"flex",alignItems:"center",justifyContent:"center",gap:10}}>
              <span style={{fontSize:20}}>G</span> Continuar com Google
            </button>
            <button onClick={()=>setModo("login")} className="press"
              style={{width:"100%",padding:"14px",borderRadius:14,border:"1px solid rgba(255,255,255,.15)",background:"rgba(255,255,255,.06)",
                color:"#fff",fontSize:15,fontWeight:600,cursor:"pointer"}}>
              📧 Entrar com Email
            </button>
            <button onClick={()=>setModo("cadastro")} className="press"
              style={{width:"100%",padding:"14px",borderRadius:14,border:"none",background:"#7C6AF7",
                color:"#fff",fontSize:15,fontWeight:700,cursor:"pointer"}}>
              ✨ Criar conta
            </button>
          </div>
        )}

        {(modo==="login"||modo==="cadastro")&&(
          <div style={{display:"flex",flexDirection:"column",gap:12}}>
            <button onClick={()=>setModo("")} style={{background:"none",border:"none",color:"rgba(255,255,255,.4)",cursor:"pointer",fontSize:13,textAlign:"left",marginBottom:4}}>← Voltar</button>
            {modo==="cadastro"&&(
              <input value={nome} onChange={e=>setNome(e.target.value)} placeholder="Seu nome"
                className="login-inp" style={{width:"100%",fontSize:15,padding:"13px 14px",borderRadius:12,border:"1px solid rgba(255,255,255,.15)",background:"rgba(255,255,255,.06)",color:"#fff",outline:"none",fontFamily:"'Figtree',sans-serif"}}/>
            )}
            <input value={email} onChange={e=>setEmail(e.target.value)} placeholder="Email"
              type="email" className="login-inp" style={{width:"100%",fontSize:15,padding:"13px 14px",borderRadius:12,border:"1px solid rgba(255,255,255,.15)",background:"rgba(255,255,255,.06)",color:"#fff",outline:"none",fontFamily:"'Figtree',sans-serif"}}/>
            <input value={senha} onChange={e=>setSenha(e.target.value)} placeholder="Senha"
              type="password" className="login-inp" style={{width:"100%",fontSize:15,padding:"13px 14px",borderRadius:12,border:"1px solid rgba(255,255,255,.15)",background:"rgba(255,255,255,.06)",color:"#fff",outline:"none",fontFamily:"'Figtree',sans-serif"}}/>
            {emailErr&&<div style={{fontSize:12,color:"#FF5C6A"}}>{emailErr}</div>}
            <button onClick={handleEmail} disabled={loading} className="press"
              style={{width:"100%",padding:"14px",borderRadius:14,border:"none",background:"#7C6AF7",
                color:"#fff",fontSize:15,fontWeight:700,cursor:"pointer",marginTop:4}}>
              {loading?"Aguarde...":(modo==="login"?"Entrar":"Criar conta")}
            </button>
          </div>
        )}

        {loading&&<div style={{textAlign:"center",marginTop:16}}><Spinner size={24}/></div>}
      </div>
    </div>
  );
}

export { LoginScreen };
