import { useState } from "react";
import { G } from "../theme.jsx";
import { Spinner } from "../components/ui.jsx";

// ─── LOGIN SCREEN — superfície limpa, segue o tema dark/light ─────────────────
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

  const inpStyle={width:"100%",fontSize:15,padding:"13px 14px",borderRadius:12,border:`1px solid ${G.border2}`,background:G.card2,color:G.text,outline:"none"};
  const btnSec={width:"100%",padding:"14px",borderRadius:12,border:`1px solid ${G.border2}`,background:G.card,color:G.text,fontSize:15,fontWeight:600,cursor:"pointer",display:"flex",alignItems:"center",justifyContent:"center",gap:10};

  return(
    <div style={{minHeight:"100vh",display:"flex",flexDirection:"column",alignItems:"center",justifyContent:"center",
      background:G.bg,padding:"24px"}}>
      <div style={{width:"100%",maxWidth:380}}>
        {/* Logo */}
        <div style={{textAlign:"center",marginBottom:36}}>
          <div style={{fontSize:36,fontWeight:800,letterSpacing:-1,color:G.text,marginBottom:6}}>
            fin<span style={{color:G.accent}}>ance</span>
          </div>
          <div style={{fontSize:14,color:G.muted}}>Controle financeiro inteligente</div>
        </div>

        {error&&<div style={{background:G.redL,border:`1px solid ${G.red}44`,borderRadius:12,padding:"10px 14px",marginBottom:16,fontSize:13,color:G.red}}>{error}</div>}

        {modo===""&&(
          <div style={{display:"flex",flexDirection:"column",gap:12}}>
            <button onClick={onGoogle} disabled={loading} className="press" style={btnSec}>
              <span style={{fontSize:18,fontWeight:700}}>G</span> Continuar com Google
            </button>
            <button onClick={()=>setModo("login")} className="press" style={btnSec}>
              Entrar com Email
            </button>
            <button onClick={()=>setModo("cadastro")} className="press"
              style={{width:"100%",padding:"14px",borderRadius:12,border:"none",background:G.accent,
                color:"#fff",fontSize:15,fontWeight:700,cursor:"pointer"}}>
              Criar conta
            </button>
          </div>
        )}

        {(modo==="login"||modo==="cadastro")&&(
          <div style={{display:"flex",flexDirection:"column",gap:12}}>
            <button onClick={()=>setModo("")} style={{background:"none",border:"none",color:G.muted,cursor:"pointer",fontSize:13,textAlign:"left",marginBottom:4}}>← Voltar</button>
            {modo==="cadastro"&&(
              <input value={nome} onChange={e=>setNome(e.target.value)} placeholder="Seu nome" style={inpStyle}/>
            )}
            <input value={email} onChange={e=>setEmail(e.target.value)} placeholder="Email" type="email" style={inpStyle}/>
            <input value={senha} onChange={e=>setSenha(e.target.value)} placeholder="Senha" type="password" style={inpStyle}/>
            {emailErr&&<div style={{fontSize:12,color:G.red}}>{emailErr}</div>}
            <button onClick={handleEmail} disabled={loading} className="press"
              style={{width:"100%",padding:"14px",borderRadius:12,border:"none",background:G.accent,
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
