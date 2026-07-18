import { useState } from "react";
import { db } from "../firebase.js";
import { doc, setDoc, getDoc } from "firebase/firestore";
import { G } from "../theme.jsx";
import { ICON, Ic } from "../components/ui.jsx";

// ─── UPGRADE VIEW ────────────────────────────────────────────────────────────
function UpgradeView({uid,plano,destaque="",onActivate}){
  const isPrem=plano==="premium";

  const FREE_FEATURES=[
    "Dashboard completo",
    "Lançamentos ilimitados (recorrências e agendados)",
    "IA por texto — ilimitada",
    "Transações com busca e filtros",
    "Metas e importação de extrato",
    "Histórico de 3 meses",
  ];
  const PREMIUM_FEATURES=[
    "Histórico completo",
    "IA por voz — transcrição automática",
    "IA por foto — leia comprovantes",
    "Cartões com fatura por ciclo e parcelas",
    "Finanças: orçamentos e relatórios",
    "Exportar dados (Excel/PDF/imagem)",
    "Modo Casal — finanças compartilhadas",
    "Divisão de contas com contatos",
  ];

  const [ativando,setAtivando]=useState(false);
  const [ativErr,setAtivErr]=useState("");
  async function ativarTeste(){
    if(!uid){setAtivErr("Usuário não identificado.");return;}
    setAtivando(true);setAtivErr("");
    try{
      const ref=doc(db,"users",uid,"perfil","dados");
      await setDoc(ref,{plano:"premium",ativadoEm:new Date().toISOString()},{merge:true});
      await getDoc(ref);
      if(onActivate)onActivate("premium");
    }catch(e){
      setAtivErr("Erro ao salvar: "+e.message);
    }
    setAtivando(false);
  }

  const destIcon={cartoes:ICON.card,contatos:ICON.users,casal:ICON.handshake,divisoes:ICON.divide,financas:ICON.chart};

  return(<div style={{padding:"16px 14px 40px",display:"flex",flexDirection:"column",gap:16}}>

    {/* Header do recurso que disparou o paywall */}
    {destaque&&(()=>{
      const info={cartoes:["Cartões de Crédito","Fatura por ciclo, parcelas e histórico"],contatos:["Contatos","Divida gastos com seus contatos"],casal:["Modo Casal","Finanças compartilhadas do casal"],divisoes:["Divisão de Contas","Divida contas com amigos"],financas:["Relatórios","Orçamentos e análises"]}[destaque];
      if(!info)return null;
      return(<div style={{background:G.accentL,border:`1px solid ${G.accent}44`,borderRadius:16,padding:"14px 16px",display:"flex",alignItems:"center",gap:12,marginBottom:4}}>
        <div style={{width:44,height:44,borderRadius:12,background:G.accent+"22",display:"flex",alignItems:"center",justifyContent:"center",flexShrink:0}}><Ic d={destIcon[destaque]||ICON.star} size={22} color={G.accent}/></div>
        <div>
          <div style={{fontSize:11,color:G.accent,fontWeight:700,textTransform:"uppercase",letterSpacing:.8,marginBottom:2}}>Recurso Premium</div>
          <div style={{fontSize:14,fontWeight:700,color:G.text}}>{info[0]}</div>
          <div style={{fontSize:12,color:G.muted}}>{info[1]}</div>
        </div>
      </div>);
    })()}

    <div style={{textAlign:"center",padding:"8px 0 4px"}}>
      <div style={{width:48,height:48,borderRadius:14,background:G.accentL,display:"flex",alignItems:"center",justifyContent:"center",margin:"0 auto 10px"}}><Ic d={ICON.star} size={24} color={G.accent}/></div>
      <div style={{fontSize:24,fontWeight:800,color:G.text}}>Planos</div>
      <div style={{fontSize:13,color:G.muted,marginTop:4}}>Escolha o melhor para você</div>
    </div>

    {isPrem&&<div style={{background:G.accentL,border:`1px solid ${G.accent}44`,borderRadius:16,padding:"14px 16px",display:"flex",alignItems:"center",gap:10}}>
      <Ic d={ICON.star} size={20} color={G.accent}/>
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
          <div style={{fontSize:18,fontWeight:700,color:G.text}}>Gratuito</div>
          <div className="num" style={{fontSize:22,fontWeight:800,color:G.text,marginTop:2}}>R$ 0<span style={{fontSize:13,color:G.muted,fontWeight:400}}>/mês</span></div>
        </div>
      </div>
      {FREE_FEATURES.map((txt,i)=>(
        <div key={i} style={{display:"flex",alignItems:"center",gap:10,marginBottom:8}}>
          <Ic d={ICON.check} size={15} color={G.green}/>
          <span style={{fontSize:13,color:G.muted}}>{txt}</span>
        </div>
      ))}
    </div>

    {/* Card Premium */}
    <div style={{background:G.card,border:`1px solid ${G.accent}55`,borderRadius:20,padding:"18px 16px",position:"relative"}}>
      {isPrem&&<div style={{position:"absolute",top:-10,left:20,background:G.accent,color:"#fff",fontSize:10,fontWeight:700,padding:"3px 12px",borderRadius:20,letterSpacing:.8}}>PLANO ATUAL</div>}
      <div style={{display:"flex",justifyContent:"space-between",alignItems:"flex-start",marginBottom:14}}>
        <div>
          <div style={{fontSize:18,fontWeight:700,color:G.text}}>Premium</div>
          <div className="num" style={{fontSize:22,fontWeight:800,color:G.accent,marginTop:2}}>R$ 19,90<span style={{fontSize:13,color:G.muted,fontWeight:400}}>/mês</span></div>
        </div>
        <Ic d={ICON.star} size={24} color={G.accent}/>
      </div>
      {PREMIUM_FEATURES.map((txt,i)=>(
        <div key={i} style={{display:"flex",alignItems:"center",gap:10,marginBottom:8}}>
          <Ic d={ICON.check} size={15} color={G.accent}/>
          <span style={{fontSize:13,color:G.text}}>{txt}</span>
        </div>
      ))}
      {!isPrem&&<>
        {ativErr&&<div style={{fontSize:12,color:G.red,textAlign:"center",padding:"6px 0"}}>{ativErr}</div>}
        <button onClick={ativarTeste} disabled={ativando} className="press"
          style={{width:"100%",marginTop:14,padding:"14px",borderRadius:14,border:"none",
            background:ativando?G.muted:G.accent,color:"#fff",fontSize:15,fontWeight:700,cursor:ativando?"not-allowed":"pointer"}}>
          {ativando?"Ativando...":"Ativar Premium (teste grátis)"}
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
