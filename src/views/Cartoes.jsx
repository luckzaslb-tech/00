import { useState, useEffect } from "react";
import { db } from "../firebase.js";
import { collection, doc, addDoc, deleteDoc, onSnapshot } from "firebase/firestore";
import { curMes, fmt, fmtD, getMes, pct, round2, today } from "../lib/utils.js";
import { G } from "../theme.jsx";
import { ICON, Ic } from "../components/ui.jsx";

// ─── FAMÍLIA / CASAL VIEW ──────────────────────────────────────────────────────
// ─── CARTÕES VIEW ────────────────────────────────────────────────────────────
function CartoesView({uid,lancs}){
  const [cartoes,setCartoes]=useState([]);
  const [adding,setAdding]=useState(false);
  const [form,setForm]=useState({nome:"",limite:"",vencimento:"",cor:"#7C6AF7"});
  const [saving,setSaving]=useState(false);
  const [confirmDel,setConfirmDel]=useState(null); // id do cartão a deletar

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
        cor:form.cor,
        criadoEm:today(),
      });
      setForm({nome:"",limite:"",vencimento:"",cor:"#7C6AF7"});
      setAdding(false);
    }catch(e){alert("Erro: "+e.message);}
    setSaving(false);
  }

  async function deletarCartao(id){
    try{await deleteDoc(doc(db,"users",uid,"cartoes",id));setConfirmDel(null);}catch(e){setConfirmDel(null);}
  }

  const CORES=["#7C6AF7","#2ECC8E","#FF5C6A","#4A9EFF","#F5C842","#FF8C42","#E040FB","#00BCD4"];

  return(<div style={{padding:"16px 14px 32px",display:"flex",flexDirection:"column",gap:14}}>

    {/* Header */}
    <div style={{display:"flex",alignItems:"center",justifyContent:"space-between"}}>
      <div style={{fontFamily:"'Fraunces',serif",fontSize:20,fontWeight:700,color:G.text}}>Cartões de Crédito</div>
      <button onClick={()=>setAdding(v=>!v)} className="press"
        style={{width:36,height:36,borderRadius:10,border:"none",background:G.accent,color:"#fff",cursor:"pointer",display:"flex",alignItems:"center",justifyContent:"center",position:"relative"}}>
        <Ic d={adding?ICON.x:ICON.plus} size={18}/>
      </button>
    </div>

    {/* Add form */}
    {adding&&<div style={{background:G.card,border:`1px solid ${G.border}`,borderRadius:18,padding:16,display:"flex",flexDirection:"column",gap:12}}>
      <div style={{fontSize:13,fontWeight:700,color:G.text}}>Novo cartão</div>
      {[
        {l:"Nome do cartão",k:"nome",ph:"Ex: Nubank, Itaú..."},
        {l:"Limite (R$)",k:"limite",ph:"5000",type:"number"},
        {l:"Dia do vencimento",k:"vencimento",ph:"10",type:"number"},
      ].map(({l,k,ph,type})=>(
        <div key={k}>
          <div style={{fontSize:11,color:G.muted,marginBottom:4}}>{l}</div>
          <input value={form[k]} onChange={e=>setForm(f=>({...f,[k]:e.target.value}))}
            placeholder={ph} type={type||"text"} className="inp" style={{width:"100%"}}/>
        </div>
      ))}
      <div>
        <div style={{fontSize:11,color:G.muted,marginBottom:6}}>Cor</div>
        <div style={{display:"flex",gap:8,flexWrap:"wrap"}}>
          {CORES.map(cor=>(
            <button key={cor} onClick={()=>setForm(f=>({...f,cor}))}
              style={{width:28,height:28,borderRadius:"50%",background:cor,border:`3px solid ${form.cor===cor?"#fff":"transparent"}`,cursor:"pointer",outline:form.cor===cor?`2px solid ${cor}`:"none"}}/>
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

    {/* Cards list */}
    {cartoes.length===0&&!adding&&<div style={{textAlign:"center",padding:"48px 0",color:G.muted}}>
      <div style={{fontSize:40,marginBottom:8}}>💳</div>
      <div style={{fontSize:14}}>Nenhum cartão cadastrado</div>
      <div style={{fontSize:12,marginTop:4}}>Toque em + para adicionar</div>
    </div>}

    {cartoes.map(k=>{
      // Fatura do mês atual: despesas vinculadas ao cartão (cartaoId é o campo atual; cartao é legado)
      const doCartao=lancs.filter(l=>l.tipo==="Despesa"&&(l.cartaoId===k.id||l.cartao===k.id||l.cartao===k.nome));
      const gastos=round2(doCartao.filter(l=>getMes(l.data)===curMes()).reduce((s,l)=>s+l.valor,0));
      const pct=k.limite>0?Math.min(gastos/k.limite,1):0;
      const restante=(k.limite||0)-gastos;
      const corBarra=pct>.85?G.red:pct>.6?G.yellow:G.green;
      return(
        <div key={k.id} style={{background:G.card,border:`1px solid ${G.border}`,borderRadius:20,overflow:"hidden"}}>
          {/* card visual */}
          <div style={{background:`linear-gradient(135deg,${k.cor}dd,${k.cor}88)`,padding:"20px 18px 16px",position:"relative"}}>
            <div style={{position:"absolute",top:-20,right:-20,width:100,height:100,borderRadius:"50%",background:"rgba(255,255,255,.08)"}}/>
            <div style={{position:"absolute",bottom:-30,right:20,width:80,height:80,borderRadius:"50%",background:"rgba(255,255,255,.06)"}}/>
            <div style={{fontFamily:"'Fraunces',serif",fontSize:17,fontWeight:700,color:"#fff",marginBottom:12}}>{k.nome}</div>
            <div style={{display:"flex",justifyContent:"space-between",alignItems:"flex-end"}}>
              <div>
                <div style={{fontSize:10,color:"rgba(255,255,255,.6)",fontWeight:600,textTransform:"uppercase",letterSpacing:.8}}>Gasto</div>
                <div style={{fontFamily:"'Fraunces',serif",fontSize:20,fontWeight:700,color:"#fff"}}>{fmt(gastos)}</div>
              </div>
              {k.limite>0&&<div style={{textAlign:"right"}}>
                <div style={{fontSize:10,color:"rgba(255,255,255,.6)",fontWeight:600,textTransform:"uppercase",letterSpacing:.8}}>Limite</div>
                <div style={{fontSize:14,fontWeight:600,color:"rgba(255,255,255,.8)"}}>{fmt(k.limite)}</div>
              </div>}
            </div>
          </div>
          {/* barra uso */}
          {k.limite>0&&<div style={{padding:"12px 18px"}}>
            <div style={{height:6,background:G.border,borderRadius:6,overflow:"hidden",marginBottom:6}}>
              <div style={{height:"100%",width:`${pct*100}%`,background:corBarra,borderRadius:6,transition:"width .4s"}}/>
            </div>
            <div style={{display:"flex",justifyContent:"space-between",fontSize:11}}>
              <span style={{color:G.muted}}>{Math.round(pct*100)}% usado</span>
              <span style={{color:restante>=0?G.green:G.red,fontWeight:600}}>
                {restante>=0?`${fmt(restante)} disponível`:`Estourou ${fmt(-restante)}`}
              </span>
            </div>
          </div>}
          {/* vencimento + delete */}
          <div style={{padding:"0 18px 14px",display:"flex",alignItems:"center",justifyContent:"space-between"}}>
            {k.vencimento&&<div style={{fontSize:12,color:G.muted}}>📅 Vence dia {k.vencimento}</div>}
            {confirmDel===k.id
              ?<div style={{display:"flex",gap:6,marginLeft:"auto"}}>
                <button onClick={()=>deletarCartao(k.id)} className="press"
                  style={{padding:"6px 12px",borderRadius:10,border:`1px solid ${G.red}`,background:G.red,color:"#fff",fontSize:12,cursor:"pointer",fontWeight:700}}>
                  Confirmar
                </button>
                <button onClick={()=>setConfirmDel(null)} className="press"
                  style={{padding:"6px 12px",borderRadius:10,border:`1px solid ${G.border}`,background:"none",color:G.muted,fontSize:12,cursor:"pointer"}}>
                  Cancelar
                </button>
              </div>
              :<button onClick={()=>setConfirmDel(k.id)} className="press"
                style={{padding:"6px 12px",borderRadius:10,border:`1px solid ${G.red}44`,background:G.red+"11",color:G.red,fontSize:12,cursor:"pointer",marginLeft:"auto"}}>
                🗑 Deletar
              </button>
            }
          </div>
          {/* últimas transações */}
          {(()=>{
            const txs=doCartao.slice().sort((a,b)=>(b.data||"").localeCompare(a.data||"")).slice(0,3);
            if(!txs.length)return null;
            return(<div style={{borderTop:`1px solid ${G.border}`,padding:"10px 18px 14px"}}>
              <div style={{fontSize:11,color:G.muted,fontWeight:700,textTransform:"uppercase",letterSpacing:.8,marginBottom:8}}>Últimas transações</div>
              {txs.map(l=>(
                <div key={l.id} style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:6}}>
                  <div>
                    <div style={{fontSize:12,color:G.text}}>{l.desc}</div>
                    <div style={{fontSize:10,color:G.muted}}>{fmtD(l.data)}</div>
                  </div>
                  <div style={{fontSize:13,fontWeight:700,color:G.red}}>-{fmt(l.valor)}</div>
                </div>
              ))}
            </div>);
          })()}
        </div>
      );
    })}
  </div>);
}

export { CartoesView };
