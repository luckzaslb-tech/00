import { useState, useEffect } from "react";
import { db } from "../firebase.js";
import { collection, doc, addDoc, deleteDoc, updateDoc, onSnapshot } from "firebase/firestore";
import { fmt, round2, today } from "../lib/utils.js";
import { G } from "../theme.jsx";
import { ICON, Ic, Lbl } from "../components/ui.jsx";
import { Sheet } from "../components/Sheet.jsx";

const CORES = ["#10B981", "#7C3AED", "#60A5FA", "#FB923C", "#F472B6", "#FBBF24", "#2DD4BF", "#F87171"];

// ─── METAS / OBJETIVOS ─────────────────────────────────────────────────────────
function MetasView({uid,previewMetas}){
  const [metas,setMetas]=useState(previewMetas||[]);
  const [sheet,setSheet]=useState(null); // "nova" | {id} p/ guardar/retirar
  const [form,setForm]=useState({nome:"",alvo:"",cor:CORES[0]});
  const [mov,setMov]=useState({valor:"",tipo:"guardar"});

  useEffect(()=>{
    if(!uid)return;
    const unsub=onSnapshot(collection(db,"users",uid,"metas"),snap=>setMetas(snap.docs.map(d=>({id:d.id,...d.data()}))));
    return()=>unsub();
  },[uid]);

  async function salvarMeta(){
    const alvo=parseFloat(form.alvo);
    if(!form.nome.trim()||!alvo||alvo<=0)return;
    await addDoc(collection(db,"users",uid,"metas"),{nome:form.nome.trim(),alvo:round2(alvo),guardado:0,cor:form.cor,criadoEm:today()});
    setForm({nome:"",alvo:"",cor:CORES[0]});setSheet(null);
  }
  async function movimentar(meta){
    const v=parseFloat(mov.valor);
    if(!v||v<=0)return;
    const novo=Math.max(0,round2(meta.guardado+(mov.tipo==="guardar"?v:-v)));
    await updateDoc(doc(db,"users",uid,"metas",meta.id),{guardado:novo});
    setMov({valor:"",tipo:"guardar"});setSheet(null);
  }
  async function deletar(id){await deleteDoc(doc(db,"users",uid,"metas",id));setSheet(null);}

  const totAlvo=round2(metas.reduce((s,m)=>s+(m.alvo||0),0));
  const totGuardado=round2(metas.reduce((s,m)=>s+(m.guardado||0),0));
  const metaSheet=sheet&&typeof sheet==="object"?metas.find(m=>m.id===sheet.id):null;

  return(<div style={{padding:"16px 14px 32px",display:"flex",flexDirection:"column",gap:14}}>

    {/* header */}
    <div style={{display:"flex",alignItems:"center",justifyContent:"space-between"}}>
      <div style={{fontSize:20,fontWeight:700,color:G.text}}>Metas</div>
      <button onClick={()=>{setForm({nome:"",alvo:"",cor:CORES[0]});setSheet("nova");}} aria-label="Nova meta" className="press"
        style={{width:36,height:36,borderRadius:10,border:"none",background:G.accent,color:"#fff",cursor:"pointer",display:"flex",alignItems:"center",justifyContent:"center"}}>
        <Ic d={ICON.plus} size={18}/>
      </button>
    </div>

    {/* total */}
    {metas.length>0&&<div style={{background:G.card,border:`1px solid ${G.border}`,borderRadius:16,padding:16}}>
      <div style={{fontSize:10,fontWeight:700,letterSpacing:1,textTransform:"uppercase",color:G.muted,marginBottom:8}}>Total guardado</div>
      <div style={{display:"flex",alignItems:"baseline",gap:8,marginBottom:10}}>
        <span className="num" style={{fontSize:24,fontWeight:800,color:G.green}}>{fmt(totGuardado)}</span>
        <span style={{fontSize:13,color:G.muted}}>de {fmt(totAlvo)}</span>
      </div>
      <div style={{height:8,background:G.card2,borderRadius:6,overflow:"hidden"}}>
        <div style={{height:"100%",width:`${totAlvo>0?Math.min(100,totGuardado/totAlvo*100):0}%`,background:G.green,borderRadius:6,transition:"width .4s"}}/>
      </div>
    </div>}

    {/* empty */}
    {metas.length===0&&<div style={{textAlign:"center",padding:"48px 20px",color:G.muted}}>
      <Ic d={ICON.target} size={40} color={G.border2}/>
      <div style={{fontSize:14,marginTop:10,fontWeight:600}}>Nenhuma meta ainda</div>
      <div style={{fontSize:12,marginTop:4}}>Crie um objetivo pra guardar dinheiro — viagem, reserva, um sonho.</div>
    </div>}

    {/* lista */}
    {metas.map(m=>{
      const p=m.alvo>0?Math.min(100,m.guardado/m.alvo*100):0;
      const falta=round2(Math.max(0,m.alvo-m.guardado));
      const done=m.guardado>=m.alvo&&m.alvo>0;
      return(
        <div key={m.id} style={{background:G.card,border:`1px solid ${done?m.cor+"66":G.border}`,borderRadius:16,padding:16}}>
          <div style={{display:"flex",alignItems:"center",gap:12,marginBottom:12}}>
            <div style={{width:40,height:40,borderRadius:12,background:m.cor+"22",display:"flex",alignItems:"center",justifyContent:"center",flexShrink:0}}>
              <Ic d={done?ICON.check:ICON.target} size={20} color={m.cor}/>
            </div>
            <div style={{flex:1,minWidth:0}}>
              <div style={{fontSize:15,fontWeight:700,color:G.text}}>{m.nome}</div>
              <div style={{fontSize:12,color:G.muted}}>{done?"🎉 Objetivo alcançado!":`Faltam ${fmt(falta)}`}</div>
            </div>
            <button onClick={()=>deletar(m.id)} aria-label="Excluir meta" style={{background:"none",border:"none",color:G.border2,cursor:"pointer",padding:4,display:"flex"}}
              onMouseEnter={e=>e.currentTarget.style.color=G.red} onMouseLeave={e=>e.currentTarget.style.color=G.border2}><Ic d={ICON.x} size={15}/></button>
          </div>
          <div style={{display:"flex",justifyContent:"space-between",marginBottom:6}}>
            <span className="num" style={{fontSize:14,fontWeight:700,color:m.cor}}>{fmt(m.guardado)}</span>
            <span style={{fontSize:12,color:G.muted}}>de <span className="num">{fmt(m.alvo)}</span> · {p.toFixed(0)}%</span>
          </div>
          <div style={{height:8,background:G.card2,borderRadius:6,overflow:"hidden",marginBottom:12}}>
            <div style={{height:"100%",width:`${p}%`,background:m.cor,borderRadius:6,transition:"width .4s"}}/>
          </div>
          <div style={{display:"flex",gap:8}}>
            <button onClick={()=>{setMov({valor:"",tipo:"guardar"});setSheet({id:m.id});}} className="press"
              style={{flex:1,padding:"10px",borderRadius:12,border:`1px solid ${m.cor}55`,background:m.cor+"18",color:m.cor,fontSize:13,fontWeight:700,cursor:"pointer",fontFamily:"inherit",display:"flex",alignItems:"center",justifyContent:"center",gap:6}}>
              <Ic d={ICON.plus} size={14} color={m.cor}/> Guardar
            </button>
            <button onClick={()=>{setMov({valor:"",tipo:"retirar"});setSheet({id:m.id});}} className="press"
              style={{padding:"10px 16px",borderRadius:12,border:`1px solid ${G.border}`,background:"none",color:G.muted,fontSize:13,fontWeight:600,cursor:"pointer",fontFamily:"inherit",display:"flex",alignItems:"center",justifyContent:"center",gap:6}}>
              <Ic d={ICON.minus} size={14} color={G.muted}/> Retirar
            </button>
          </div>
        </div>
      );
    })}

    {/* sheet nova meta */}
    <Sheet open={sheet==="nova"} onClose={()=>setSheet(null)} title="Nova Meta">
      <div style={{display:"flex",flexDirection:"column",gap:14}}>
        <div><Lbl>Objetivo</Lbl><input value={form.nome} onChange={e=>setForm(f=>({...f,nome:e.target.value}))} placeholder="Ex: Viagem, Reserva de emergência..." className="inp"/></div>
        <div><Lbl>Valor alvo (R$)</Lbl><input type="number" value={form.alvo} onChange={e=>setForm(f=>({...f,alvo:e.target.value}))} placeholder="5000" className="inp"/></div>
        <div><Lbl>Cor</Lbl><div style={{display:"flex",gap:8,flexWrap:"wrap"}}>{CORES.map(c=><button key={c} onClick={()=>setForm(f=>({...f,cor:c}))} aria-label="Cor" style={{width:30,height:30,borderRadius:"50%",background:c,cursor:"pointer",border:`3px solid ${form.cor===c?G.card:"transparent"}`,outline:form.cor===c?`2px solid ${c}`:"none"}}/>)}</div></div>
        <button onClick={salvarMeta} className="press" style={{padding:15,borderRadius:14,border:"none",background:G.accent,color:"#fff",fontWeight:700,fontSize:15,cursor:"pointer",fontFamily:"inherit"}}>Criar meta</button>
      </div>
    </Sheet>

    {/* sheet guardar/retirar */}
    <Sheet open={!!metaSheet} onClose={()=>setSheet(null)} title={mov.tipo==="guardar"?"Guardar dinheiro":"Retirar dinheiro"}>
      {metaSheet&&<div style={{display:"flex",flexDirection:"column",gap:14}}>
        <div style={{fontSize:13,color:G.muted}}>{metaSheet.nome} · guardado <span className="num" style={{fontWeight:700,color:G.text}}>{fmt(metaSheet.guardado)}</span> de {fmt(metaSheet.alvo)}</div>
        <div><Lbl>Valor (R$)</Lbl><input type="number" autoFocus value={mov.valor} onChange={e=>setMov(v=>({...v,valor:e.target.value}))} placeholder="0,00" className="inp"/></div>
        <button onClick={()=>movimentar(metaSheet)} className="press" style={{padding:15,borderRadius:14,border:"none",background:mov.tipo==="guardar"?G.green:G.red,color:"#fff",fontWeight:700,fontSize:15,cursor:"pointer",fontFamily:"inherit"}}>
          {mov.tipo==="guardar"?"Guardar":"Retirar"}
        </button>
      </div>}
    </Sheet>
  </div>);
}

export { MetasView };
