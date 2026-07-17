import { useState } from "react";
import { db } from "../firebase.js";
import { collection, addDoc } from "firebase/firestore";
import { CATS_DEP, CATS_REC, FORMAS_DEP, FORMAS_REC } from "../lib/constants.js";
import { curMes, fmt, fmtD, today } from "../lib/utils.js";
import { G } from "../theme.jsx";
import { Lbl } from "../components/ui.jsx";
import { Sheet } from "../components/Sheet.jsx";

// ─── CASAL VIEW ────────────────────────────────────────────────────────────────
function CasalView({uid,lancs,user}){
  const [sheetLanc,setSheetLanc]=useState(false);
  const [formLanc,setFormLanc]=useState({data:today(),desc:"",cat:CATS_DEP[0],forma:FORMAS_DEP[0],valor:"",tipo:"Despesa"});

  async function salvarLanc(){
    const v=parseFloat(formLanc.valor);
    if(!formLanc.data||!v||v<=0)return;
    try{
      await addDoc(collection(db,"users",uid,"lancamentos"),{
        tipo:formLanc.tipo,desc:formLanc.desc,cat:formLanc.cat,
        forma:formLanc.forma,valor:v,data:formLanc.data,escopo:"casal",
        autorNome:user?.displayName||"Você"
      });
      setSheetLanc(false);
    }catch(e){console.error("salvarLanc:",e.message);}
  }

  const mes=curMes();
  const lancCasal=lancs.filter(l=>l.data?.startsWith(mes)&&l.escopo==="casal");
  const tR=lancCasal.filter(l=>l.tipo==="Receita").reduce((s,l)=>s+l.valor,0);
  const tD=lancCasal.filter(l=>l.tipo==="Despesa").reduce((s,l)=>s+l.valor,0);

  return(<div style={{display:"flex",flexDirection:"column",gap:16}}>
    <div style={{display:"flex",gap:12}}>
      {[{l:"Receitas",v:tR,c:G.green},{l:"Despesas",v:tD,c:G.red},{l:"Saldo",v:tR-tD,c:tR-tD>=0?G.green:G.red}].map((k,i)=>(
        <div key={i} style={{flex:1,background:G.card,border:"1px solid "+G.border,borderRadius:14,padding:12,textAlign:"center"}}>
          <div style={{fontSize:10,color:G.muted,marginBottom:4}}>{k.l}</div>
          <div style={{fontVariantNumeric:"tabular-nums",fontSize:16,fontWeight:700,color:k.c}}>{fmt(k.v)}</div>
        </div>
      ))}
    </div>

    <button onClick={()=>setSheetLanc(true)} className="press"
      style={{width:"100%",padding:"10px",borderRadius:14,border:"1px solid "+G.yellow+"55",background:G.yellow+"18",color:G.yellow,fontSize:14,fontWeight:700,cursor:"pointer",fontFamily:"inherit"}}>
      + Novo lançamento do casal
    </button>

    {lancCasal.length===0&&<div style={{textAlign:"center",padding:"30px 20px",color:G.muted,background:G.card,border:"1px solid "+G.border,borderRadius:16}}>
      <div style={{fontSize:32,marginBottom:8}}></div>
      <div style={{fontSize:13,fontWeight:600,marginBottom:4}}>Nenhum lançamento do casal</div>
      <div style={{fontSize:12}}>Registre gastos e receitas compartilhados</div>
    </div>}

    {lancCasal.length>0&&<div style={{background:G.card,border:"1px solid "+G.border,borderRadius:16,padding:16}}>
      <div style={{fontSize:11,fontWeight:700,color:G.muted,marginBottom:12,letterSpacing:.8}}>ESTE MÊS</div>
      {lancCasal.map((l,i)=>(
        <div key={i} style={{display:"flex",alignItems:"center",justifyContent:"space-between",padding:"9px 0",borderBottom:i<lancCasal.length-1?"1px solid "+G.border:"none"}}>
          <div>
            <div style={{fontSize:13,fontWeight:600}}>{l.desc||l.cat}</div>
            <div style={{fontSize:11,color:G.muted}}>{fmtD(l.data)} · {l.cat}</div>
          </div>
          <div style={{fontSize:14,fontWeight:700,color:l.tipo==="Receita"?G.green:G.red}}>
            {l.tipo==="Receita"?"+":"-"}{fmt(l.valor)}
          </div>
        </div>
      ))}
    </div>}

    <Sheet open={sheetLanc} onClose={()=>setSheetLanc(false)} title="Novo — Casal">
      <div style={{display:"flex",flexDirection:"column",gap:14}}>
        <div style={{display:"flex",background:G.card2,borderRadius:12,padding:4}}>
          {["Despesa","Receita"].map(t=>(
            <button key={t} onClick={()=>setFormLanc(f=>({...f,tipo:t,cat:t==="Receita"?CATS_REC[0]:CATS_DEP[0],forma:t==="Receita"?FORMAS_REC[0]:FORMAS_DEP[0]}))}
              style={{flex:1,padding:"9px",borderRadius:9,border:"none",cursor:"pointer",fontFamily:"inherit",fontWeight:formLanc.tipo===t?700:500,
                background:formLanc.tipo===t?(t==="Despesa"?G.red+"22":G.green+"22"):"transparent",
                color:formLanc.tipo===t?(t==="Despesa"?G.red:G.green):G.muted}}>
              {t==="Despesa"?"↓ Despesa":"↑ Receita"}
            </button>
          ))}
        </div>
        <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:12}}>
          <div><Lbl>Valor (R$)</Lbl><input type="number" value={formLanc.valor} onChange={e=>setFormLanc(f=>({...f,valor:e.target.value}))} className="inp" placeholder="0,00"/></div>
          <div><Lbl>Data</Lbl><input type="date" value={formLanc.data} onChange={e=>setFormLanc(f=>({...f,data:e.target.value}))} className="inp"/></div>
        </div>
        <div><Lbl opt>Descrição</Lbl><input value={formLanc.desc} onChange={e=>setFormLanc(f=>({...f,desc:e.target.value}))} className="inp" placeholder="Ex: Mercado, Cinema..."/></div>
        <div><Lbl>Categoria</Lbl>
          <select value={formLanc.cat} onChange={e=>setFormLanc(f=>({...f,cat:e.target.value}))} className="inp">
            {(formLanc.tipo==="Receita"?CATS_REC:CATS_DEP).map(c=><option key={c}>{c}</option>)}
          </select>
        </div>
        <button onClick={salvarLanc} className="press" style={{width:"100%",padding:14,borderRadius:14,border:"none",background:G.yellow,color:"#000",fontSize:15,fontWeight:700,cursor:"pointer",fontFamily:"inherit"}}>
          Salvar
        </button>
      </div>
    </Sheet>
  </div>);
}

export { CasalView };
