import { useState, useEffect } from "react";
import { db } from "../firebase.js";
import { collection, doc, addDoc, deleteDoc, onSnapshot } from "firebase/firestore";
import { fmt, fmtD, round2, today } from "../lib/utils.js";
import { MESES } from "../lib/constants.js";
import { diaFechamento, faturaAberta, proximoVencimento, diasAte, lancsDoCartao, totalFaturaAberta, historicoFaturas } from "../lib/cartao.js";
import { G } from "../theme.jsx";
import { ICON, Ic } from "../components/ui.jsx";

const mesLbl = m => { const [y, mm] = m.split("-"); return `${MESES[parseInt(mm) - 1]} '${y.slice(2)}`; };

// ─── CARTÕES VIEW ────────────────────────────────────────────────────────────
function CartoesView({uid,lancs,previewCartoes}){
  const [cartoes,setCartoes]=useState(previewCartoes||[]); // previewCartoes só p/ preview sem Firestore
  const [adding,setAdding]=useState(false);
  const [form,setForm]=useState({nome:"",limite:"",vencimento:"",fechamento:"",cor:G.accent});
  const [saving,setSaving]=useState(false);
  const [confirmDel,setConfirmDel]=useState(null);

  useEffect(()=>{
    if(!uid)return;
    const unsub=onSnapshot(collection(db,"users",uid,"cartoes"),snap=>{
      setCartoes(snap.docs.map(d=>({id:d.id,...d.data()})));
    });
    return()=>unsub();
  },[uid]);

  async function salvarCartao(){
    if(!form.nome.trim())return;
    setSaving(true);
    try{
      await addDoc(collection(db,"users",uid,"cartoes"),{
        nome:form.nome.trim(),
        limite:parseFloat(form.limite)||0,
        vencimento:parseInt(form.vencimento)||10,
        fechamento:parseInt(form.fechamento)||Math.max(1,(parseInt(form.vencimento)||10)-7),
        cor:form.cor,
        criadoEm:today(),
      });
      setForm({nome:"",limite:"",vencimento:"",fechamento:"",cor:G.accent});
      setAdding(false);
    }catch(e){alert("Erro: "+e.message);}
    setSaving(false);
  }

  async function deletarCartao(id){
    try{await deleteDoc(doc(db,"users",uid,"cartoes",id));setConfirmDel(null);}catch(e){setConfirmDel(null);}
  }

  const CORES=["#10B981","#7C3AED","#F87171","#4A9EFF","#F5C842","#FB923C","#E040FB","#00BCD4"];

  // consolidado entre todos os cartões
  const totLimite=round2(cartoes.reduce((s,k)=>s+(k.limite||0),0));
  const totGasto=round2(cartoes.reduce((s,k)=>s+totalFaturaAberta(lancs,k),0));
  const totDisp=round2(totLimite-totGasto);

  return(<div style={{padding:"16px 14px 32px",display:"flex",flexDirection:"column",gap:14}}>

    {/* Header */}
    <div style={{display:"flex",alignItems:"center",justifyContent:"space-between"}}>
      <div style={{fontSize:20,fontWeight:700,color:G.text}}>Cartões</div>
      <button onClick={()=>setAdding(v=>!v)} aria-label={adding?"Cancelar":"Adicionar cartão"} className="press"
        style={{width:36,height:36,borderRadius:10,border:"none",background:G.accent,color:"#fff",cursor:"pointer",display:"flex",alignItems:"center",justifyContent:"center"}}>
        <Ic d={adding?ICON.x:ICON.plus} size={18}/>
      </button>
    </div>

    {/* Consolidado */}
    {cartoes.length>0&&<div style={{background:G.card,border:`1px solid ${G.border}`,borderRadius:16,padding:16}}>
      <div style={{fontSize:10,fontWeight:700,letterSpacing:1,textTransform:"uppercase",color:G.muted,marginBottom:12}}>Total dos cartões</div>
      <div style={{display:"flex"}}>
        {[{l:"Fatura aberta",v:fmt(totGasto),c:G.red},{l:"Limite total",v:fmt(totLimite),c:G.text},{l:"Disponível",v:fmt(totDisp),c:totDisp>=0?G.green:G.red}].map((k,i)=>(
          <div key={i} style={{flex:1,borderRight:i<2?`1px solid ${G.border}`:"none",paddingRight:i<2?12:0,paddingLeft:i>0?12:0}}>
            <div style={{fontSize:10,color:G.muted,marginBottom:3}}>{k.l}</div>
            <div className="num" style={{fontSize:15,fontWeight:700,color:k.c}}>{k.v}</div>
          </div>
        ))}
      </div>
    </div>}

    {/* Add form */}
    {adding&&<div style={{background:G.card,border:`1px solid ${G.border}`,borderRadius:18,padding:16,display:"flex",flexDirection:"column",gap:12}}>
      <div style={{fontSize:13,fontWeight:700,color:G.text}}>Novo cartão</div>
      <div>
        <div style={{fontSize:11,color:G.muted,marginBottom:4}}>Nome do cartão</div>
        <input value={form.nome} onChange={e=>setForm(f=>({...f,nome:e.target.value}))} placeholder="Ex: Nubank, Itaú..." className="inp" style={{width:"100%"}}/>
      </div>
      <div>
        <div style={{fontSize:11,color:G.muted,marginBottom:4}}>Limite (R$)</div>
        <input value={form.limite} onChange={e=>setForm(f=>({...f,limite:e.target.value}))} placeholder="5000" type="number" className="inp" style={{width:"100%"}}/>
      </div>
      <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:12}}>
        <div>
          <div style={{fontSize:11,color:G.muted,marginBottom:4}}>Dia de fechamento</div>
          <input value={form.fechamento} onChange={e=>setForm(f=>({...f,fechamento:e.target.value}))} placeholder="3" type="number" className="inp" style={{width:"100%"}}/>
        </div>
        <div>
          <div style={{fontSize:11,color:G.muted,marginBottom:4}}>Dia de vencimento</div>
          <input value={form.vencimento} onChange={e=>setForm(f=>({...f,vencimento:e.target.value}))} placeholder="10" type="number" className="inp" style={{width:"100%"}}/>
        </div>
      </div>
      <div style={{fontSize:11,color:G.muted,marginTop:-4}}>A fatura fecha no dia de fechamento e vence alguns dias depois.</div>
      <div>
        <div style={{fontSize:11,color:G.muted,marginBottom:6}}>Cor</div>
        <div style={{display:"flex",gap:8,flexWrap:"wrap"}}>
          {CORES.map(cor=>(
            <button key={cor} onClick={()=>setForm(f=>({...f,cor}))} aria-label="Cor"
              style={{width:28,height:28,borderRadius:"50%",background:cor,border:`3px solid ${form.cor===cor?G.card:"transparent"}`,cursor:"pointer",outline:form.cor===cor?`2px solid ${cor}`:"none"}}/>
          ))}
        </div>
      </div>
      <div style={{display:"flex",gap:8}}>
        <button onClick={salvarCartao} disabled={saving} className="press"
          style={{flex:1,padding:"11px",borderRadius:12,border:"none",background:G.accent,color:"#fff",fontSize:13,fontWeight:700,cursor:"pointer"}}>
          {saving?"Salvando...":"Adicionar"}
        </button>
        <button onClick={()=>setAdding(false)} className="press"
          style={{padding:"11px 14px",borderRadius:12,border:`1px solid ${G.border}`,background:"none",color:G.muted,cursor:"pointer"}}>Cancelar</button>
      </div>
    </div>}

    {/* Empty */}
    {cartoes.length===0&&!adding&&<div style={{textAlign:"center",padding:"48px 0",color:G.muted}}>
      <Ic d={ICON.card} size={40} color={G.border2}/>
      <div style={{fontSize:14,marginTop:10}}>Nenhum cartão cadastrado</div>
      <div style={{fontSize:12,marginTop:4}}>Toque em + para adicionar</div>
    </div>}

    {/* Cards */}
    {cartoes.map(k=>{
      const gastos=totalFaturaAberta(lancs,k);
      const pct=k.limite>0?Math.min(gastos/k.limite,1):0;
      const restante=(k.limite||0)-gastos;
      const corBarra=pct>.85?G.red:pct>.6?G.yellow:G.green;
      const fa=faturaAberta(k);
      const diasFecha=diasAte(fa.fechamento);
      const diasVence=diasAte(proximoVencimento(k));
      const txs=lancsDoCartao(lancs,k).filter(l=>l.data>=fa.inicioISO&&l.data<=fa.fimISO).sort((a,b)=>(b.data||"").localeCompare(a.data||"")).slice(0,4);
      const hist=historicoFaturas(lancs,k,4);
      return(
        <div key={k.id} style={{background:G.card,border:`1px solid ${G.border}`,borderRadius:20,overflow:"hidden"}}>
          {/* card visual */}
          <div style={{background:`linear-gradient(135deg,${k.cor}dd,${k.cor}88)`,padding:"18px 18px 16px",position:"relative"}}>
            <div style={{position:"absolute",top:-20,right:-20,width:100,height:100,borderRadius:"50%",background:"rgba(255,255,255,.08)"}}/>
            <div style={{display:"flex",alignItems:"center",justifyContent:"space-between",marginBottom:14}}>
              <div style={{fontSize:16,fontWeight:700,color:"#fff"}}>{k.nome}</div>
              <Ic d={ICON.chip} size={22} color="rgba(255,255,255,.85)"/>
            </div>
            <div style={{display:"flex",justifyContent:"space-between",alignItems:"flex-end"}}>
              <div>
                <div style={{fontSize:10,color:"rgba(255,255,255,.7)",fontWeight:600,textTransform:"uppercase",letterSpacing:.8}}>Fatura aberta</div>
                <div className="num" style={{fontSize:22,fontWeight:800,color:"#fff"}}>{fmt(gastos)}</div>
              </div>
              {k.limite>0&&<div style={{textAlign:"right"}}>
                <div style={{fontSize:10,color:"rgba(255,255,255,.7)",fontWeight:600,textTransform:"uppercase",letterSpacing:.8}}>Limite</div>
                <div style={{fontSize:14,fontWeight:600,color:"rgba(255,255,255,.9)"}}>{fmt(k.limite)}</div>
              </div>}
            </div>
          </div>
          {/* barra + dias */}
          {k.limite>0&&<div style={{padding:"12px 18px 6px"}}>
            <div style={{height:6,background:G.border,borderRadius:6,overflow:"hidden",marginBottom:6}}>
              <div style={{height:"100%",width:`${pct*100}%`,background:corBarra,borderRadius:6,transition:"width .4s"}}/>
            </div>
            <div style={{display:"flex",justifyContent:"space-between",fontSize:11}}>
              <span style={{color:G.muted}}>{Math.round(pct*100)}% usado</span>
              <span style={{color:restante>=0?G.green:G.red,fontWeight:600}}>{restante>=0?`${fmt(restante)} disponível`:`Estourou ${fmt(-restante)}`}</span>
            </div>
          </div>}
          {/* fecha/vence */}
          <div style={{padding:"6px 18px 12px",display:"flex",gap:8}}>
            <div style={{flex:1,display:"flex",alignItems:"center",gap:6,fontSize:11,color:G.muted}}>
              <Ic d={ICON.clock} size={13} color={G.muted}/>
              {diasFecha<=0?"Fecha hoje":`Fecha em ${diasFecha} dia${diasFecha>1?"s":""}`}
            </div>
            <div style={{flex:1,display:"flex",alignItems:"center",gap:6,fontSize:11,color:G.muted}}>
              <Ic d={ICON.calendar} size={13} color={G.muted}/>
              {diasVence<=0?"Vence hoje":`Vence em ${diasVence} dia${diasVence>1?"s":""}`}
            </div>
          </div>
          {/* últimas transações */}
          {txs.length>0&&<div style={{borderTop:`1px solid ${G.border}`,padding:"10px 18px 12px"}}>
            <div style={{fontSize:11,color:G.muted,fontWeight:700,textTransform:"uppercase",letterSpacing:.8,marginBottom:8}}>Nesta fatura</div>
            {txs.map(l=>(
              <div key={l.id} style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:6}}>
                <div>
                  <div style={{fontSize:12,color:G.text}}>{l.desc||l.cat}{l.parcelaTotal>1?<span style={{color:G.muted}}> ({l.parcelaN}/{l.parcelaTotal})</span>:null}</div>
                  <div style={{fontSize:10,color:G.muted}}>{fmtD(l.data)}</div>
                </div>
                <div className="num" style={{fontSize:13,fontWeight:700,color:G.red}}>-{fmt(l.valor)}</div>
              </div>
            ))}
          </div>}
          {/* histórico */}
          {hist.length>1&&<div style={{borderTop:`1px solid ${G.border}`,padding:"10px 18px 12px"}}>
            <div style={{fontSize:11,color:G.muted,fontWeight:700,textTransform:"uppercase",letterSpacing:.8,marginBottom:8}}>Histórico de faturas</div>
            {hist.map(h=>(
              <div key={h.mes} style={{display:"flex",justifyContent:"space-between",alignItems:"center",padding:"4px 0"}}>
                <span style={{fontSize:12,color:G.muted}}>{mesLbl(h.mes)}</span>
                <span className="num" style={{fontSize:12,fontWeight:600,color:G.text}}>{fmt(h.valor)}</span>
              </div>
            ))}
          </div>}
          {/* delete */}
          <div style={{borderTop:`1px solid ${G.border}`,padding:"10px 18px",display:"flex",justifyContent:"flex-end"}}>
            {confirmDel===k.id
              ?<div style={{display:"flex",gap:6}}>
                <button onClick={()=>deletarCartao(k.id)} className="press" style={{padding:"6px 12px",borderRadius:10,border:"none",background:G.red,color:"#fff",fontSize:12,cursor:"pointer",fontWeight:700}}>Confirmar</button>
                <button onClick={()=>setConfirmDel(null)} className="press" style={{padding:"6px 12px",borderRadius:10,border:`1px solid ${G.border}`,background:"none",color:G.muted,fontSize:12,cursor:"pointer"}}>Cancelar</button>
              </div>
              :<button onClick={()=>setConfirmDel(k.id)} className="press" style={{display:"flex",alignItems:"center",gap:6,padding:"6px 12px",borderRadius:10,border:`1px solid ${G.red}44`,background:G.redL,color:G.red,fontSize:12,cursor:"pointer"}}><Ic d={ICON.trash} size={13}/> Excluir</button>
            }
          </div>
        </div>
      );
    })}
  </div>);
}

export { CartoesView };
