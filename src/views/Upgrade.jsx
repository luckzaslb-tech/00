import { useState } from "react";
import { db } from "../firebase.js";
import { doc, setDoc, getDoc } from "firebase/firestore";
import { G } from "../theme.jsx";
import { Dashboard } from "./Dashboard.jsx";

// ─── UPGRADE VIEW ────────────────────────────────────────────────────────────
function UpgradeView({uid,plano,destaque="",onActivate}){
  const isPrem=plano==="premium";

  const FREE_FEATURES=[
    {icon:"📊",txt:"Dashboard completo"},
    {icon:"✍️",txt:"Lançamentos ilimitados (com recorrências e agendados)"},
    {icon:"💬",txt:"IA por texto — ilimitada"},
    {icon:"🔍",txt:"Busca de lançamentos"},
    {icon:"📥",txt:"Importar extrato CSV"},
    {icon:"📅",txt:"Histórico de 3 meses"},
  ];
  const PREMIUM_FEATURES=[
    {icon:"📅",txt:"Histórico completo"},
    {icon:"🎤",txt:"IA por voz — transcrição automática"},
    {icon:"📷",txt:"IA por foto — leia comprovantes"},
    {icon:"💳",txt:"Cartões de crédito com fatura do mês"},
    {icon:"📊",txt:"Finanças: orçamentos, relatórios e alertas"},
    {icon:"📤",txt:"Exportar dados (Excel/PDF/imagem)"},
    {icon:"💑",txt:"Modo Casal — finanças compartilhadas"},
    {icon:"🤝",txt:"Divisão de contas com contatos"},
  ];

  const [ativando,setAtivando]=useState(false);
  const [ativErr,setAtivErr]=useState("");
  async function ativarTeste(){
    if(!uid){setAtivErr("Usuário não identificado.");return;}
    setAtivando(true);setAtivErr("");
    try{
      const ref=doc(db,"users",uid,"perfil","dados");
      await setDoc(ref,{plano:"premium",ativadoEm:new Date().toISOString()},{merge:true});
      const snap=await getDoc(ref);
      console.log("[UpgradeView] plano salvo:",snap.data());
      if(onActivate)onActivate("premium");
    }catch(e){
      console.error("[UpgradeView] Erro ao ativar:",e);
      setAtivErr("Erro ao salvar: "+e.message);
    }
    setAtivando(false);
  }

  return(<div style={{padding:"16px 14px 40px",display:"flex",flexDirection:"column",gap:16}}>

    {/* Header */}
    {destaque&&(()=>{
      const info={cartoes:["💳","Cartões de Crédito","Gerencie todos os seus cartões"],contatos:["👥","Contatos","Divida gastos com seus contatos"],casal:["💑","Modo Casal","Finanças compartilhadas"],divisoes:["🤝","Divisão de Contas","Divida contas com amigos"],financas:["📊","Relatórios","Orçamentos e análises"]}[destaque];
      if(!info)return null;
      return(<div style={{background:G.accentL,border:`1px solid ${G.accent}44`,borderRadius:16,padding:"14px 16px",display:"flex",alignItems:"center",gap:12,marginBottom:4}}>
        <span style={{fontSize:28}}>{info[0]}</span>
        <div>
          <div style={{fontSize:11,color:G.accent,fontWeight:700,textTransform:"uppercase",letterSpacing:.8,marginBottom:2}}>Recurso Premium</div>
          <div style={{fontSize:14,fontWeight:700,color:G.text}}>{info[1]}</div>
          <div style={{fontSize:12,color:G.muted}}>{info[2]}</div>
        </div>
      </div>);
    })()}
    <div style={{textAlign:"center",padding:"8px 0 4px"}}>
      <div style={{fontSize:36,marginBottom:6}}>✨</div>
      <div style={{fontVariantNumeric:"tabular-nums",fontSize:24,fontWeight:700,color:G.text}}>Planos</div>
      <div style={{fontSize:13,color:G.muted,marginTop:4}}>Escolha o melhor para você</div>
    </div>

    {/* Status atual */}
    {isPrem&&<div style={{background:G.accentL,border:`1px solid ${G.accent}44`,borderRadius:16,padding:"14px 16px",display:"flex",alignItems:"center",gap:10}}>
      <span style={{fontSize:22}}>👑</span>
      <div>
        <div style={{fontSize:13,fontWeight:700,color:G.accent}}>Você é Premium!</div>
        <div style={{fontSize:12,color:G.muted}}>Aproveite todos os recursos</div>
      </div>
    </div>}

    {/* Card Gratuito */}
    <div style={{background:G.card,border:`1px solid ${!isPrem?G.accent:G.border}`,borderRadius:20,padding:"18px 16px",position:"relative"}}>
      {!isPrem&&<div style={{position:"absolute",top:-10,left:20,background:G.accent,color:"#fff",fontSize:10,fontWeight:700,padding:"3px 12px",borderRadius:20,letterSpacing:.8}}>PLANO ATUAL</div>}
      <div style={{display:"flex",justifyContent:"space-between",alignItems:"flex-start",marginBottom:14}}>
        <div>
          <div style={{fontVariantNumeric:"tabular-nums",fontSize:18,fontWeight:700,color:G.text}}>Gratuito</div>
          <div style={{fontSize:22,fontWeight:700,color:G.text,marginTop:2}}>R$ 0<span style={{fontSize:13,color:G.muted,fontWeight:400}}>/mês</span></div>
        </div>
        <span style={{fontSize:28}}>🌱</span>
      </div>
      {FREE_FEATURES.map((f,i)=>(
        <div key={i} style={{display:"flex",alignItems:"center",gap:8,marginBottom:7}}>
          <span style={{fontSize:16,width:22,textAlign:"center"}}>{f.icon}</span>
          <span style={{fontSize:13,color:G.muted}}>{f.txt}</span>
        </div>
      ))}
    </div>

    {/* Card Premium */}
    <div style={{background:G.card,border:`1px solid ${G.accent}55`,borderRadius:20,padding:"18px 16px",position:"relative"}}>
      {isPrem&&<div style={{position:"absolute",top:-10,left:20,background:G.accent,color:"#fff",fontSize:10,fontWeight:700,padding:"3px 12px",borderRadius:20,letterSpacing:.8}}>PLANO ATUAL</div>}
      <div style={{display:"flex",justifyContent:"space-between",alignItems:"flex-start",marginBottom:14}}>
        <div>
          <div style={{fontVariantNumeric:"tabular-nums",fontSize:18,fontWeight:700,color:G.text}}>Premium</div>
          <div style={{fontSize:22,fontWeight:700,color:G.accent,marginTop:2}}>R$ 19,90<span style={{fontSize:13,color:G.muted,fontWeight:400}}>/mês</span></div>
        </div>
        <span style={{fontSize:28}}>👑</span>
      </div>
      {PREMIUM_FEATURES.map((f,i)=>(
        <div key={i} style={{display:"flex",alignItems:"center",gap:8,marginBottom:7}}>
          <span style={{fontSize:16,width:22,textAlign:"center"}}>{f.icon}</span>
          <span style={{fontSize:13,color:G.text}}>{f.txt}</span>
          {f.txt.includes("em breve")&&<span style={{fontSize:10,padding:"1px 6px",borderRadius:8,background:G.yellow+"22",color:G.yellow,fontWeight:600,marginLeft:"auto",flexShrink:0}}>em breve</span>}
        </div>
      ))}
      {!isPrem&&<>
        {ativErr&&<div style={{fontSize:12,color:G.red,textAlign:"center",padding:"6px 0"}}>{ativErr}</div>}
        <button onClick={ativarTeste} disabled={ativando} className="press"
          style={{width:"100%",marginTop:14,padding:"14px",borderRadius:14,border:"none",
            background:ativando?G.muted:G.accent,
            color:"#fff",fontSize:15,fontWeight:700,cursor:ativando?"not-allowed":"pointer",
            boxShadow:`0 4px 20px ${G.accent}44`}}>
          {ativando?"Ativando...":"✨ Ativar Premium (teste grátis)"}
        </button>
      </>}
    </div>

    <div style={{fontSize:11,color:G.muted,textAlign:"center",lineHeight:1.6}}>
      Pagamentos em breve via Stripe / Mercado Pago.<br/>
      Por ora, use o botão acima para testar gratuitamente.
    </div>
  </div>);
}

export { UpgradeView };
