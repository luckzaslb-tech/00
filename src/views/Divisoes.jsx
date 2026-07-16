import { useState, useEffect } from "react";
import { db } from "../firebase.js";
import { collection, doc, addDoc, deleteDoc, updateDoc, onSnapshot, setDoc } from "firebase/firestore";
import { fmt, fmtD, round2, toPartes, today } from "../lib/utils.js";
import { G } from "../theme.jsx";
import { Lbl } from "../components/ui.jsx";
import { Sheet } from "../components/Sheet.jsx";

// ─── DIVISOES VIEW ─────────────────────────────────────────────────────────────
function DivisoesView({uid}){
  const [divisoes,setDivisoes]=useState([]);
  const [pendentes,setPendentes]=useState([]); // divisoes que outros enviaram pra mim
  const [contatos,setContatos]=useState([]);
  const [sheetDiv,setSheetDiv]=useState(false);
  const [formDiv,setFormDiv]=useState({desc:"",valor:"",selecionados:[],data:today()});

  useEffect(()=>{
    if(!uid)return;
    const unsub=onSnapshot(collection(db,"users",uid,"divisoes"),snap=>{
      setDivisoes(snap.docs.map(d=>({id:d.id,...d.data()})));
    });
    // Divisoes pendentes via inbox público
    const unsubP=onSnapshot(collection(db,"inbox",uid,"divisoes_pendentes"),snap=>{
      setPendentes(snap.docs.map(d=>({id:d.id,...d.data()})));
    });
    // Contatos para seleção
    const unsubC=onSnapshot(collection(db,"users",uid,"contatos"),snap=>{
      setContatos(snap.docs.map(d=>({id:d.id,...d.data()})));
    });
    // Listener: outra pessoa marcou pago na minha divisão
    const unsubPagas=onSnapshot(collection(db,"inbox",uid,"divisoes_pagas"),snap=>{
      snap.docs.forEach(d=>{
        const data=d.data();
        // Valida campos obrigatórios antes de processar
        if(!data||!data.divOrigemId||data.parteIdx==null)return;
        // Atualiza estado local imediatamente (sem async no map)
        setDivisoes(prev=>prev.map(div=>{
          if(div.id!==data.divOrigemId)return div;
          const novasPartes=toPartes(div.partes).map((p,i)=>
            i===data.parteIdx?{...p,pago:!!data.pago}:p
          );
          return{...div,partes:novasPartes};
        }));
        // Persiste e limpa inbox em background (não bloqueia render)
        const divRef=doc(db,"users",uid,"divisoes",data.divOrigemId);
        const inboxRef=doc(db,"inbox",uid,"divisoes_pagas",d.id);
        const novasPartes={};
        novasPartes[`partes.${data.parteIdx}.pago`]=!!data.pago;
        updateDoc(divRef,novasPartes)
          .then(()=>deleteDoc(inboxRef))
          .catch(e=>console.warn("divisoes_pagas sync:",e.message));
      });
    });
    return()=>{unsub();unsubP();unsubC();unsubPagas();};
  },[uid]);

  function toggleSel(nome){
    setFormDiv(f=>{
      const sel=f.selecionados.includes(nome)?f.selecionados.filter(n=>n!==nome):[...f.selecionados,nome];
      return{...f,selecionados:sel};
    });
  }

  async function salvarDiv(){
    const v=parseFloat(formDiv.valor);
    const pessoas=["Você",...formDiv.selecionados];
    if(!formDiv.desc||!v||formDiv.selecionados.length<1)return;
    // Divide em centavos exatos: cada um paga o valor arredondado e a sobra fica com "Você"
    const valorPorPessoa=Math.floor(v/pessoas.length*100)/100;
    const sobra=round2(v-valorPorPessoa*pessoas.length);
    const partes=pessoas.map((p,i)=>({nome:p,valor:round2(valorPorPessoa+(i===0?sobra:0)),pago:false}));
    try{
    // Salva minha divisão
    const divRef=await addDoc(collection(db,"users",uid,"divisoes"),{
      desc:formDiv.desc,total:v,data:formDiv.data,partes,criadoEm:today(),criadoPor:uid
    });
    // Notifica contatos vinculados via inbox público
    const contatosVinculados=contatos.filter(c=>c.vinculado&&c.uid&&formDiv.selecionados.includes(c.nome));
    for(const ct of contatosVinculados){
      try{
        await addDoc(collection(db,"inbox",ct.uid,"divisoes_pendentes"),{
          desc:formDiv.desc,total:v,data:formDiv.data,partes,
          criadoPor:uid,criadoEm:today(),status:"pendente",divOrigemId:divRef.id
        });
      }catch(e){console.warn("Erro ao notificar",ct.nome,e.message);}
    }
    setSheetDiv(false);
    setFormDiv({desc:"",valor:"",selecionados:[],data:today()});
    }catch(e){console.error("salvarDiv:",e.message);}
  }

  async function aceitarDiv(id,dados){
    // Remove o id do inbox para nao conflitar com o novo doc
    const {id:_ignore,...dadosLimpos}=dados;
    // Salva na colecao propria do usuario receptor
    const partesNorm=toPartes(dadosLimpos.partes);
    await addDoc(collection(db,"users",uid,"divisoes"),{
      ...dadosLimpos,
      partes:partesNorm,
      status:"aceito",
      recebida:true,
      criadoEm:dadosLimpos.criadoEm||today()
    });
    await deleteDoc(doc(db,"inbox",uid,"divisoes_pendentes",id));
  }

  async function recusarDiv(id){
    await deleteDoc(doc(db,"inbox",uid,"divisoes_pendentes",id));
  }

  async function marcarPago(divId,parteIdx){
    const div=divisoes.find(d=>d.id===divId);if(!div)return;
    const partes=toPartes(div.partes).map((p,i)=>i===parteIdx?{...p,pago:!p.pago}:p);
    await updateDoc(doc(db,"users",uid,"divisoes",divId),{partes});
    // Se é divisão recebida, notifica o criador que esta parte foi paga
    if(div.recebida&&div.criadoPor&&div.divOrigemId){
      try{
        await setDoc(doc(db,"inbox",div.criadoPor,"divisoes_pagas",div.divOrigemId),{
          parteIdx,pago:partes[parteIdx].pago,
          pagoEm:today(),pagoPor:uid,
          divOrigemId:div.divOrigemId
        });
      }catch(e){console.warn("Erro ao notificar pagamento",e.message);}
    }
  }

  async function deletarDiv(id){
    try{await deleteDoc(doc(db,"users",uid,"divisoes",id));}
    catch(e){console.error("deletarDiv:",e.message);}
  }

  const abertas=divisoes.filter(d=>toPartes(d.partes).some(p=>!p.pago));
  const concluidas=divisoes.filter(d=>toPartes(d.partes).every(p=>p.pago));

  return(<div style={{display:"flex",flexDirection:"column",gap:16}}>
    {/* Pendentes (notificações) */}
    {pendentes.length>0&&<div style={{background:G.yellow+"15",border:"1px solid "+G.yellow+"44",borderRadius:16,padding:16}}>
      <div style={{fontSize:11,fontWeight:700,color:G.yellow,letterSpacing:.8,marginBottom:12}}>
        DIVISÕES RECEBIDAS ({pendentes.length})
      </div>
      {pendentes.map(p=>(
        <div key={p.id} style={{marginBottom:12,paddingBottom:12,borderBottom:"1px solid "+G.yellow+"22"}}>
          <div style={{fontSize:14,fontWeight:700,marginBottom:2}}>{p.desc}</div>
          <div style={{fontSize:12,color:G.muted,marginBottom:8}}>
            {fmtD(p.data)} · Total: {fmt(p.total)} · {toPartes(p.partes).length} pessoas · Sua parte: {fmt(toPartes(p.partes).find(pt=>pt.nome!=="Você")?.valor||0)}
          </div>
          <div style={{display:"flex",gap:8}}>
            <button onClick={()=>aceitarDiv(p.id,p)} className="press"
              style={{flex:1,padding:"8px",borderRadius:10,border:"none",background:G.green,color:"#fff",fontSize:13,fontWeight:700,cursor:"pointer",fontFamily:"inherit"}}>
              Aceitar
            </button>
            <button onClick={()=>recusarDiv(p.id)} className="press"
              style={{flex:1,padding:"8px",borderRadius:10,border:"1px solid "+G.red+"44",background:G.red+"15",color:G.red,fontSize:13,fontWeight:600,cursor:"pointer",fontFamily:"inherit"}}>
              Recusar
            </button>
          </div>
        </div>
      ))}
    </div>}

    <div style={{display:"flex",alignItems:"center",justifyContent:"space-between"}}>
      <div style={{fontSize:13,fontWeight:700,color:G.muted,letterSpacing:.5}}>MINHAS DIVISÕES</div>
      <button onClick={()=>setSheetDiv(true)} className="press"
        style={{padding:"7px 14px",borderRadius:20,border:"1px solid "+G.accent+"55",background:G.accentL,color:G.accent,fontSize:12,fontWeight:700,cursor:"pointer"}}>
        + Nova
      </button>
    </div>

    {divisoes.length===0&&<div style={{textAlign:"center",padding:"40px 20px",color:G.muted}}>
      <div style={{fontSize:40,marginBottom:12}}>÷</div>
      <div style={{fontSize:14,fontWeight:600,marginBottom:6}}>Nenhuma divisão ainda</div>
      <div style={{fontSize:12}}>Crie e envie para seus contatos aprovarem</div>
    </div>}

    {abertas.length>0&&<>
      <div style={{fontSize:11,fontWeight:700,color:G.yellow,letterSpacing:.8}}>EM ABERTO</div>
      {abertas.map(div=>{
        const pendente=toPartes(div.partes).filter(p=>!p.pago);
        return(<div key={div.id} style={{background:G.card,border:"1px solid "+G.border,borderRadius:16,padding:16}}>
          <div style={{display:"flex",justifyContent:"space-between",alignItems:"flex-start",marginBottom:12}}>
            <div>
              <div style={{fontSize:14,fontWeight:700}}>{div.desc}</div>
              <div style={{fontSize:11,color:G.muted}}>{fmtD(div.data)} · Total: {fmt(div.total)}</div>
            </div>
            <div style={{textAlign:"right"}}>
              <div style={{fontSize:12,color:G.yellow,fontWeight:700}}>{fmt(pendente.reduce((s,p)=>s+p.valor,0))} pendente</div>
              <button onClick={()=>deletarDiv(div.id)} style={{background:"none",border:"none",color:G.red+"99",cursor:"pointer",fontSize:18,padding:"2px 4px",lineHeight:1}} onMouseEnter={e=>e.currentTarget.style.color=G.red} onMouseLeave={e=>e.currentTarget.style.color=G.red+"99"}>×</button>
            </div>
          </div>
          <div style={{display:"flex",flexDirection:"column",gap:8}}>
            {toPartes(div.partes).map((p,i)=>(
              <div key={i} style={{display:"flex",alignItems:"center",gap:10,padding:"8px 12px",background:p.pago?G.green+"15":G.card2,borderRadius:10}}>
                <div style={{width:32,height:32,borderRadius:"50%",background:p.pago?G.green:G.accent,color:"#fff",display:"flex",alignItems:"center",justifyContent:"center",fontSize:13,fontWeight:700,flexShrink:0}}>
                  {p.nome[0]?.toUpperCase()||"?"}
                </div>
                <div style={{flex:1}}>
                  <div style={{fontSize:13,fontWeight:600,color:p.pago?G.muted:G.text,textDecoration:p.pago?"line-through":"none"}}>{p.nome}</div>
                  <div style={{fontSize:12,color:G.muted}}>{fmt(p.valor)}</div>
                </div>
                <button onClick={()=>marcarPago(div.id,i)} className="press"
                  style={{padding:"5px 10px",borderRadius:8,border:"1px solid "+(p.pago?G.green+"55":G.border2),background:p.pago?G.green+"22":G.card,color:p.pago?G.green:G.text,fontSize:12,cursor:"pointer",fontFamily:"inherit"}}>
                  {p.pago?"✓ Pago":"Marcar pago"}
                </button>
              </div>
            ))}
          </div>
        </div>);
      })}
    </>}

    {concluidas.length>0&&<>
      <div style={{fontSize:11,fontWeight:700,color:G.green,letterSpacing:.8}}>CONCLUÍDAS</div>
      {concluidas.slice(0,3).map(div=>(
        <div key={div.id} style={{background:G.card,border:"1px solid "+G.green+"33",borderRadius:16,padding:14,display:"flex",justifyContent:"space-between",alignItems:"center"}}>
          <div>
            <div style={{fontSize:13,fontWeight:600}}>{div.desc}</div>
            <div style={{fontSize:11,color:G.muted}}>{fmtD(div.data)} · {toPartes(div.partes).length} pessoas</div>
          </div>
          <div style={{textAlign:"right"}}>
            <div style={{fontSize:13,fontWeight:700,color:G.green}}>✓ {fmt(div.total)}</div>
            <button onClick={()=>deletarDiv(div.id)} style={{background:"none",border:"none",color:G.red+"99",cursor:"pointer",fontSize:18,padding:"2px 4px",lineHeight:1}} onMouseEnter={e=>e.currentTarget.style.color=G.red} onMouseLeave={e=>e.currentTarget.style.color=G.red+"99"}>×</button>
          </div>
        </div>
      ))}
    </>}

    <Sheet open={sheetDiv} onClose={()=>setSheetDiv(false)} title="Nova Divisão">
      <div style={{display:"flex",flexDirection:"column",gap:14}}>
        <div><Lbl>Descrição</Lbl><input value={formDiv.desc} onChange={e=>setFormDiv(f=>({...f,desc:e.target.value}))} placeholder="Ex: Jantar, Airbnb..." className="inp"/></div>
        <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:12}}>
          <div><Lbl>Valor total (R$)</Lbl><input type="number" value={formDiv.valor} onChange={e=>setFormDiv(f=>({...f,valor:e.target.value}))} placeholder="0,00" className="inp"/></div>
          <div><Lbl>Data</Lbl><input type="date" value={formDiv.data} onChange={e=>setFormDiv(f=>({...f,data:e.target.value}))} className="inp"/></div>
        </div>
        <div>
          <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:8}}>
            <Lbl>Participantes (além de você)</Lbl>
            <span style={{fontSize:11,color:G.muted}}>{formDiv.selecionados.length} sel.</span>
          </div>
          {contatos.length===0?<div style={{fontSize:12,color:G.muted,padding:"10px 0",textAlign:"center"}}>
            Adicione contatos primeiro na aba Contatos
          </div>:<div style={{display:"flex",flexWrap:"wrap",gap:8}}>
            {contatos.map(ct=>{
              const sel=formDiv.selecionados.includes(ct.nome);
              return(<button key={ct.id} onClick={()=>toggleSel(ct.nome)} className="press"
                style={{padding:"7px 14px",borderRadius:20,border:"1px solid "+(sel?G.accent+"88":G.border),
                  background:sel?G.accent+"22":G.card2,color:sel?G.accent:G.muted,
                  fontSize:13,fontWeight:sel?700:500,cursor:"pointer",fontFamily:"inherit",display:"flex",alignItems:"center",gap:6}}>
                <div style={{width:20,height:20,borderRadius:"50%",background:sel?G.accent:G.border2,color:"#fff",display:"flex",alignItems:"center",justifyContent:"center",fontSize:10,fontWeight:700}}>
                  {ct.nome[0]?.toUpperCase()}
                </div>
                {ct.nome}{sel?" ✓":""}
              </button>);
            })}
          </div>}
          {formDiv.selecionados.length<1&&<div style={{fontSize:11,color:G.yellow,marginTop:6}}>Selecione pelo menos 1 pessoa</div>}
        </div>
        {formDiv.valor&&formDiv.selecionados.length>=1&&(
          <div style={{background:G.accentL,border:"1px solid "+G.accent+"33",borderRadius:12,padding:12,textAlign:"center"}}>
            <div style={{fontSize:12,color:G.muted}}>Cada pessoa paga</div>
            <div style={{fontSize:22,fontWeight:700,color:G.accent}}>{fmt(parseFloat(formDiv.valor||0)/(formDiv.selecionados.length+1))}</div>
            <div style={{fontSize:11,color:G.muted,marginTop:2}}>({formDiv.selecionados.length+1} pessoas incluindo você)</div>
          </div>
        )}
        <button onClick={salvarDiv} className="press" style={{width:"100%",padding:14,borderRadius:14,border:"none",background:G.accent,color:"#fff",fontSize:15,fontWeight:700,cursor:"pointer",fontFamily:"inherit"}}>
          Criar e enviar
        </button>
      </div>
    </Sheet>
  </div>);
}


export { DivisoesView };
