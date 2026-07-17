import { useState } from "react";
import { G } from "../theme.jsx";
import { ICON, Ic } from "./ui.jsx";

// ─── DRAWER ───────────────────────────────────────────────────────────────────
function Drawer({open,onClose,view,setView,user,divPendCount=0,onLogout,theme,onToggleTheme}){
  const [finOpen,setFinOpen]=useState(true);
  const [compOpen,setCompOpen]=useState(false);
  const [showDuvidas,setShowDuvidas]=useState(false);
  const G2=G;
  const navTo=(v)=>{setView(v);onClose();};
  const finActive=["financas-orcamentos","financas-relatorio"].includes(view);
  const compActive=["compartilhados-casal","compartilhados-divisoes"].includes(view);

  const items=[
    {id:"dashboard",icon:<Ic d={ICON.home} size={18}/>,l:"Início"},
    {id:"transacoes",icon:<Ic d={ICON.wallet} size={18}/>,l:"Transações"},
    {id:"cartoes",icon:<Ic d={ICON.card} size={18}/>,l:"Cartões de Crédito"},
    {id:"importar",icon:<Ic d={ICON.import} size={18}/>,l:"Importar Extrato"},
  ];
  const finSubs=[
    {id:"financas-orcamentos",icon:<Ic d={ICON.target} size={15}/>,l:"Orçamentos"},
    {id:"financas-relatorio",icon:<Ic d={ICON.chart} size={15}/>,l:"Relatório"},
  ];
  const compSubs=[
    {id:"compartilhados-casal",icon:<Ic d={ICON.handshake} size={15}/>,l:"Casal"},
    {id:"compartilhados-divisoes",icon:<Ic d={ICON.divide} size={15}/>,l:"Divisões",badge:divPendCount},
  ];

  if(!open)return null;
  const btnStyle=(active)=>({width:"100%",display:"flex",alignItems:"center",gap:12,padding:"11px 12px",borderRadius:12,border:"none",cursor:"pointer",fontFamily:"inherit",fontSize:14,fontWeight:active?700:500,background:active?G2.accentL:"transparent",color:active?G2.accent:G2.text,textAlign:"left",transition:"background .15s"});
  const subStyle=(active)=>({width:"100%",display:"flex",alignItems:"center",gap:10,padding:"9px 12px",borderRadius:10,border:"none",cursor:"pointer",fontFamily:"inherit",fontSize:13,fontWeight:active?600:400,background:active?G2.accentL:"transparent",color:active?G2.accent:G2.muted,textAlign:"left"});

  return(
    <>
      <div onClick={onClose} style={{position:"fixed",inset:0,zIndex:9000,background:"rgba(0,0,0,.6)",backdropFilter:"blur(4px)"}}/>
      <div style={{position:"fixed",top:0,left:0,bottom:0,zIndex:9001,width:"80%",maxWidth:300,background:G2.card,borderRight:`1px solid ${G2.border2}`,display:"flex",flexDirection:"column",animation:"slideInLeft .25s cubic-bezier(.32,.72,0,1)"}}>
        {/* Header */}
        <div style={{padding:"20px 20px 16px",borderBottom:`1px solid ${G2.border}`}}>
          <div style={{display:"flex",alignItems:"center",justifyContent:"space-between",marginBottom:14}}>
            <div style={{fontSize:22,fontWeight:800,letterSpacing:-.5}}>fin<span style={{color:G2.accent}}>ance</span></div>
            <button onClick={onClose} aria-label="Fechar menu" style={{width:32,height:32,borderRadius:10,border:"none",background:G2.card2,color:G2.muted,cursor:"pointer",display:"flex",alignItems:"center",justifyContent:"center"}}><Ic d={ICON.x} size={15}/></button>
          </div>
          {user&&<div style={{display:"flex",alignItems:"center",gap:10}}>
            <div style={{width:38,height:38,borderRadius:"50%",overflow:"hidden",flexShrink:0,border:`2px solid ${G2.border2}`}}>
              {user.photoURL?<img src={user.photoURL} style={{width:"100%",height:"100%",objectFit:"cover"}} referrerPolicy="no-referrer"/>
                :<div style={{width:"100%",height:"100%",display:"flex",alignItems:"center",justifyContent:"center",fontSize:13,fontWeight:700,color:G2.accent,background:G2.accentL}}>{(user.displayName||user.email||"U")[0].toUpperCase()}</div>}
            </div>
            <div>
              <div style={{fontSize:13,fontWeight:600,color:G2.text}}>{user.displayName||"Usuário"}</div>
              <div style={{fontSize:11,color:G2.muted}}>{user.email}</div>
            </div>
          </div>}
        </div>

        {/* Nav items */}
        <div style={{flex:1,overflowY:"auto",padding:"10px 10px"}}>
          {items.map(it=>(
            <button key={it.id} onClick={()=>navTo(it.id)} className="press" style={btnStyle(view===it.id)}>
              <span style={{width:24,display:"flex",justifyContent:"center",alignItems:"center"}}>{it.icon}</span>{it.l}
            </button>
          ))}

          {/* Compartilhados expandível */}
          <button onClick={()=>setCompOpen(v=>!v)} className="press" style={btnStyle(compActive)}>
            <span style={{width:24,display:"flex",justifyContent:"center"}}><Ic d={ICON.handshake} size={18}/></span>
            <span style={{flex:1}}>Compartilhados</span>
            <span style={{display:"flex",color:G2.muted,transform:compOpen?"rotate(180deg)":"none",transition:"transform .2s"}}><Ic d="M6 9l6 6 6-6" size={14}/></span>
          </button>
          {compOpen&&<div style={{paddingLeft:16,marginBottom:4}}>
            {compSubs.map(s=>(
              <button key={s.id} onClick={()=>navTo(s.id)} className="press" style={{...subStyle(view===s.id),justifyContent:"space-between"}}>
                <span style={{display:"flex",alignItems:"center",gap:8}}><span style={{display:"flex",alignItems:"center"}}>{s.icon}</span>{s.l}</span>
                {s.badge>0&&<span style={{background:G2.red,color:"#fff",borderRadius:10,fontSize:10,fontWeight:700,padding:"1px 7px",minWidth:16,textAlign:"center"}}>{s.badge}</span>}
              </button>
            ))}
          </div>}

          {/* Finanças expandível */}
          <button onClick={()=>setFinOpen(v=>!v)} className="press" style={btnStyle(finActive)}>
            <span style={{width:24,display:"flex",justifyContent:"center"}}><Ic d={ICON.wallet} size={18}/></span>
            <span style={{flex:1}}>Finanças</span>
            <span style={{display:"flex",color:G2.muted,transform:finOpen?"rotate(180deg)":"none",transition:"transform .2s"}}><Ic d="M6 9l6 6 6-6" size={14}/></span>
          </button>
          {finOpen&&<div style={{paddingLeft:16,marginBottom:4}}>
            {finSubs.map(s=>(
              <button key={s.id} onClick={()=>navTo(s.id)} className="press" style={subStyle(view===s.id)}>
                <span style={{display:"flex",alignItems:"center"}}>{s.icon}</span>{s.l}
              </button>
            ))}
          </div>}
        </div>

        {/* Footer */}
        <div style={{padding:"10px 10px 24px",borderTop:`1px solid ${G2.border}`}}>
          <button onClick={()=>{setView("planos");onClose();}} className="press" style={btnStyle(view==="planos")}>
            <span style={{width:24,display:"flex",justifyContent:"center"}}><Ic d={ICON.star} size={18}/></span>Planos & Premium
          </button>
          <button onClick={()=>setShowDuvidas(true)} className="press" style={btnStyle(false)}>
            <span style={{width:24,display:"flex",justifyContent:"center"}}><Ic d={ICON.help||"M12 22C6.477 22 2 17.523 2 12S6.477 2 12 2s10 4.477 10 10-4.477 10-10 10zm-1-7v2h2v-2h-2zm2-1.645A3.502 3.502 0 0012 8.5a3.501 3.501 0 00-3.433 2.813l1.963.382A1.5 1.5 0 1113.5 13H12v1.355z"} size={18}/></span>Dúvidas
          </button>
          <button onClick={()=>{onToggleTheme();}} className="press" style={btnStyle(false)}>
            <span style={{width:24,display:"flex",justifyContent:"center"}}><Ic d={theme==="dark"?ICON.sun:ICON.moon} size={18}/></span>{theme==="dark"?"Modo Claro":"Modo Escuro"}
          </button>
          <button onClick={()=>{onLogout();onClose();}} className="press" style={btnStyle(false)}>
            <span style={{width:24,display:"flex",justifyContent:"center"}}><Ic d={ICON.logout} size={18}/></span>Sair da conta
          </button>
        </div>
      </div>

      {/* ── MODAL DÚVIDAS ─────────────────────────────── */}
      {showDuvidas&&<div style={{position:"fixed",inset:0,zIndex:9100,display:"flex",flexDirection:"column",justifyContent:"flex-end"}}>
        <div onClick={()=>setShowDuvidas(false)} style={{position:"absolute",inset:0,background:"rgba(0,0,0,.7)",backdropFilter:"blur(4px)"}}/>
        <div style={{position:"relative",background:G2.card,borderRadius:"24px 24px 0 0",maxHeight:"90vh",display:"flex",flexDirection:"column",paddingBottom:"env(safe-area-inset-bottom,16px)"}}>
          {/* handle */}
          <div style={{display:"flex",justifyContent:"center",padding:"10px 0 4px"}}><div style={{width:36,height:4,borderRadius:2,background:G2.border}}/></div>
          {/* header */}
          <div style={{display:"flex",alignItems:"center",justifyContent:"space-between",padding:"8px 20px 14px",borderBottom:`1px solid ${G2.border}`}}>
            <div style={{fontSize:19,fontWeight:700,color:G2.text}}>Dúvidas</div>
            <button onClick={()=>setShowDuvidas(false)} aria-label="Fechar" style={{width:32,height:32,borderRadius:10,border:"none",background:G2.card2,color:G2.muted,cursor:"pointer",display:"flex",alignItems:"center",justifyContent:"center"}}><Ic d={ICON.x} size={15}/></button>
          </div>
          {/* content */}
          <div style={{overflowY:"auto",padding:"16px 20px 24px",display:"flex",flexDirection:"column",gap:16}}>

            {[
              {
                emoji:"🏠", titulo:"Dashboard",
                itens:[
                  "O Dashboard mostra seu saldo do mês atual com comparação ao mês anterior.",
                  "Use as pills de mês no topo para navegar entre meses passados.",
                  "Os mini-cards mostram: maior categoria de gastos, total de lançamentos, média diária e variação vs mês anterior.",
                  "O gráfico de barras mostra seus gastos por semana do mês.",
                  "O donut interativo mostra seus gastos por categoria — toque em uma fatia para ver o valor.",
                  "Abaixo aparecem lançamentos agendados futuros e os últimos registros.",
                ]
              },
              {
                emoji:"🤖", titulo:"IA — Como usar",
                itens:[
                  'Fale naturalmente: "Gastei 50 no mercado", "Paguei 120 de aluguel".',
                  'Para receitas: "Recebi 3000 de salário", "Ganhei 800 de freela".',
                  'Registre vários gastos de uma vez: "30 lanche, 20 uber, 15 farmácia".',
                  'Use "ontem" para registrar no dia anterior: "Paguei 90 de academia ontem".',
                  'Informe o dia: "Gastei 40 no mercado no dia 5".',
                  "Antes de confirmar, você pode editar o valor e trocar a categoria.",
                  'Para ver um resumo do mês, pergunte: "Quanto gastei esse mês?" ou "Qual meu saldo?".',
                ]
              },
              {
                emoji:"💸", titulo:"Receitas & Despesas",
                itens:[
                  "Use as abas Receitas e Despesas na barra inferior para ver seus lançamentos.",
                  "Filtre por mês usando as pills coloridas.",
                  "Filtre por categoria tocando nos emojis de categorias.",
                  "O breakdown de categorias mostra barras de progresso com o percentual de cada gasto.",
                  "Lançamentos recorrentes aparecem no topo — ative ou desative com o toggle.",
                  "Toque e segure (ou deslize) um lançamento para excluir.",
                ]
              },
              {
                emoji:"🔄", titulo:"Lançamentos Recorrentes",
                itens:[
                  "Recorrentes são cobranças fixas mensais (assinaturas, aluguel, etc.).",
                  "Adicione pelo botão + na aba de Receitas ou Despesas.",
                  "Ao ativar o toggle de um recorrente, ele é adicionado automaticamente ao mês.",
                  "Recorrentes desativados não entram no cálculo do saldo.",
                ]
              },
              {
                emoji:"💳", titulo:"Cartões de Crédito",
                itens:[
                  "Cadastre seus cartões com limite e dia de vencimento da fatura.",
                  "Os gastos no cartão aparecem agrupados por cartão.",
                  "Acompanhe o total gasto e o limite restante de cada cartão.",
                ]
              },
              {
                emoji:"👥", titulo:"Contatos & Divisões",
                itens:[
                  "Cadastre contatos para dividir despesas com amigos.",
                  "Na aba Compartilhados > Divisões, crie divisões de conta entre contatos.",
                  "O badge vermelho no menu mostra divisões pendentes de pagamento.",
                  "Marque uma divisão como paga para quitar a pendência.",
                ]
              },
              {
                emoji:"👤", titulo:"Perfil",
                itens:[
                  "Adicione foto, nome, cidade, frase pessoal e links (Instagram, site).",
                  "Acompanhe seu resumo financeiro do ano: receitas, despesas e taxa de poupança.",
                  "Registre seu humor e nível de energia diários — veja o histórico em barras.",
                  "Crie rotinas do dia com checklist e acompanhe sua sequência (streak) de dias.",
                  "Defina metas pessoais com emoji, progresso e prazo.",
                ]
              },
              {
                emoji:"📥", titulo:"Importar Extrato",
                itens:[
                  "Importe extratos bancários em formato CSV ou OFX.",
                  "O app detecta automaticamente receitas e despesas do arquivo.",
                  "Revise os lançamentos antes de confirmar a importação.",
                ]
              },
              {
                emoji:"🌙", titulo:"Modo Claro / Escuro",
                itens:[
                  "Alterne entre modo claro e escuro pelo menu lateral (abaixo de Dúvidas).",
                  "A preferência é salva automaticamente para a próxima vez.",
                ]
              },
            ].map((sec,si)=>(
              <div key={si} style={{background:G2.card2,borderRadius:16,padding:"14px 16px",border:`1px solid ${G2.border}`}}>
                <div style={{display:"flex",alignItems:"center",gap:8,marginBottom:10}}>
                  <span style={{fontSize:20}}>{sec.emoji}</span>
                  <span style={{fontVariantNumeric:"tabular-nums",fontSize:15,fontWeight:700,color:G2.text}}>{sec.titulo}</span>
                </div>
                <div style={{display:"flex",flexDirection:"column",gap:6}}>
                  {sec.itens.map((item,ii)=>(
                    <div key={ii} style={{display:"flex",gap:8,alignItems:"flex-start"}}>
                      <div style={{width:5,height:5,borderRadius:"50%",background:G2.accent,flexShrink:0,marginTop:6}}/>
                      <span style={{fontSize:13,color:G2.muted,lineHeight:1.5}}>{item}</span>
                    </div>
                  ))}
                </div>
              </div>
            ))}

          </div>
        </div>
      </div>}
    </>
  );
}


export { Drawer };
