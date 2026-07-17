import { useState } from "react";
import { db } from "../firebase.js";
import { collection, addDoc } from "firebase/firestore";
import { CATS_DEP, CATS_REC, FORMAS_DEP, FORMAS_REC, CAT_COLORS, MESES } from "../lib/constants.js";
import { curMes, fmt, fmtD, getMes, round2, today } from "../lib/utils.js";
import { G } from "../theme.jsx";
import { Lbl, Ic, ICON } from "../components/ui.jsx";
import { Sheet } from "../components/Sheet.jsx";

// ─── CASAL VIEW ────────────────────────────────────────────────────────────────
function CasalView({uid,lancs,user}){
  const [sheetLanc,setSheetLanc]=useState(false);
  const [mes,setMes]=useState(curMes());
  const [formLanc,setFormLanc]=useState({data:today(),desc:"",cat:CATS_DEP[0],forma:FORMAS_DEP[0],valor:"",tipo:"Despesa"});
  const meuNome=user?.displayName||"Você";

  async function salvarLanc(){
    const v=parseFloat(formLanc.valor);
    if(!formLanc.data||!v||v<=0)return;
    try{
      await addDoc(collection(db,"users",uid,"lancamentos"),{
        tipo:formLanc.tipo,desc:formLanc.desc,cat:formLanc.cat,
        forma:formLanc.forma,valor:v,data:formLanc.data,escopo:"casal",
        autorNome:meuNome
      });
      setSheetLanc(false);
      setFormLanc({data:today(),desc:"",cat:CATS_DEP[0],forma:FORMAS_DEP[0],valor:"",tipo:"Despesa"});
    }catch(e){console.error("salvarLanc:",e.message);}
  }

  const todosCasal=lancs.filter(l=>l.escopo==="casal");
  const mesesDisp=[...new Set(todosCasal.map(l=>getMes(l.data)))].sort().reverse();
  if(!mesesDisp.includes(curMes()))mesesDisp.unshift(curMes());

  const lancCasal=todosCasal.filter(l=>getMes(l.data)===mes);
  const desp=lancCasal.filter(l=>l.tipo==="Despesa");
  const tR=round2(lancCasal.filter(l=>l.tipo==="Receita").reduce((s,l)=>s+l.valor,0));
  const tD=round2(desp.reduce((s,l)=>s+l.valor,0));

  // Balanço: quanto cada pessoa pagou de despesa
  const porAutor={};
  for(const l of desp){const a=l.autorNome||"Você";porAutor[a]=round2((porAutor[a]||0)+l.valor);}
  const autores=Object.entries(porAutor).sort((a,b)=>b[1]-a[1]);
  // Acerto simples entre 2 pessoas: quem pagou mais que a metade tem a receber
  let acerto=null;
  if(autores.length===2){
    const media=round2(tD/2);
    const [aMais,aMenos]=autores;
    const dif=round2(aMais[1]-media);
    if(dif>0.005)acerto={credor:aMais[0],devedor:aMenos[0],valor:dif};
  }

  // Gasto por categoria do casal
  const cats=CATS_DEP.map(c=>({name:c,v:round2(desp.filter(l=>l.cat===c).reduce((s,l)=>s+l.valor,0)),color:CAT_COLORS[c]||G.muted}))
    .filter(c=>c.v>0).sort((a,b)=>b.v-a.v).slice(0,5);

  return(<div style={{display:"flex",flexDirection:"column",gap:16}}>
    {/* resumo */}
    <div style={{display:"flex",gap:10}}>
      {[{l:"Receitas",v:tR,c:G.green},{l:"Despesas",v:tD,c:G.red},{l:"Saldo",v:round2(tR-tD),c:tR-tD>=0?G.green:G.red}].map((k,i)=>(
        <div key={i} style={{flex:1,background:G.card,border:`1px solid ${G.border}`,borderRadius:14,padding:12,textAlign:"center"}}>
          <div style={{fontSize:10,color:G.muted,marginBottom:4}}>{k.l}</div>
          <div className="num" style={{fontSize:15,fontWeight:700,color:k.c}}>{fmt(k.v)}</div>
        </div>
      ))}
    </div>

    {/* meses */}
    <div style={{display:"flex",gap:6,overflowX:"auto",scrollbarWidth:"none"}}>
      {mesesDisp.map(m=>{const[y,mm]=m.split("-");const on=m===mes;return(
        <button key={m} onClick={()=>setMes(m)} className="press"
          style={{padding:"6px 14px",borderRadius:20,border:`1px solid ${on?G.accent:G.border}`,background:on?G.accent:"transparent",color:on?G.onCard:G.muted,fontSize:12,fontWeight:on?700:500,cursor:"pointer",flexShrink:0,whiteSpace:"nowrap"}}>
          {MESES[parseInt(mm)-1]} '{y.slice(2)}
        </button>);})}
    </div>

    <button onClick={()=>setSheetLanc(true)} className="press"
      style={{width:"100%",padding:"11px",borderRadius:14,border:`1px solid ${G.accent}55`,background:G.accentL,color:G.accent,fontSize:14,fontWeight:700,cursor:"pointer",fontFamily:"inherit"}}>
      + Novo lançamento do casal
    </button>

    {/* Balanço quem pagou */}
    {autores.length>0&&<div style={{background:G.card,border:`1px solid ${G.border}`,borderRadius:16,padding:16}}>
      <div style={{fontSize:11,fontWeight:700,letterSpacing:1,textTransform:"uppercase",color:G.muted,marginBottom:12}}>Quem pagou este mês</div>
      {autores.map(([nome,val])=>{
        const p=tD>0?val/tD*100:0;
        const eu=nome===meuNome;
        return(<div key={nome} style={{marginBottom:10}}>
          <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:5}}>
            <div style={{display:"flex",alignItems:"center",gap:8}}>
              <div style={{width:26,height:26,borderRadius:"50%",background:eu?G.accent:G.blue,color:"#fff",display:"flex",alignItems:"center",justifyContent:"center",fontSize:12,fontWeight:700}}>{nome[0]?.toUpperCase()}</div>
              <span style={{fontSize:13,fontWeight:600,color:G.text}}>{nome}{eu?" (você)":""}</span>
            </div>
            <span className="num" style={{fontSize:13,fontWeight:700,color:G.text}}>{fmt(val)}</span>
          </div>
          <div style={{height:5,background:G.card2,borderRadius:3,overflow:"hidden"}}>
            <div style={{height:"100%",width:`${p}%`,background:eu?G.accent:G.blue,borderRadius:3}}/>
          </div>
        </div>);
      })}
      {acerto&&<div style={{marginTop:12,padding:"11px 14px",borderRadius:12,background:G.greenL,border:`1px solid ${G.green}44`,fontSize:13,color:G.text,display:"flex",alignItems:"center",gap:8}}>
        <Ic d={ICON.handshake} size={16} color={G.green}/>
        <span><b>{acerto.devedor}</b> deve <b className="num">{fmt(acerto.valor)}</b> para <b>{acerto.credor}</b> pra dividir igual.</span>
      </div>}
      {autores.length===1&&<div style={{marginTop:6,fontSize:12,color:G.muted}}>Só um autor lançou este mês — o acerto aparece quando os dois registram.</div>}
    </div>}

    {/* Por categoria */}
    {cats.length>0&&<div style={{background:G.card,border:`1px solid ${G.border}`,borderRadius:16,padding:16}}>
      <div style={{fontSize:11,fontWeight:700,letterSpacing:1,textTransform:"uppercase",color:G.muted,marginBottom:12}}>Gastos por categoria</div>
      {cats.map(c=>{const p=tD>0?c.v/tD*100:0;return(
        <div key={c.name} style={{marginBottom:10}}>
          <div style={{display:"flex",justifyContent:"space-between",marginBottom:4}}>
            <div style={{display:"flex",alignItems:"center",gap:7}}><div style={{width:7,height:7,borderRadius:"50%",background:c.color}}/><span style={{fontSize:13,color:G.text}}>{c.name}</span></div>
            <span className="num" style={{fontSize:12,fontWeight:700,color:G.text}}>{fmt(c.v)}</span>
          </div>
          <div style={{height:4,background:G.card2,borderRadius:3,overflow:"hidden"}}><div style={{height:"100%",width:`${p}%`,background:c.color,borderRadius:3}}/></div>
        </div>);})}
    </div>}

    {/* lista */}
    {lancCasal.length===0
      ?<div style={{textAlign:"center",padding:"30px 20px",color:G.muted,background:G.card,border:`1px solid ${G.border}`,borderRadius:16}}>
        <div style={{fontSize:13,fontWeight:600,marginBottom:4}}>Nenhum lançamento do casal</div>
        <div style={{fontSize:12}}>Registre gastos e receitas compartilhados</div>
      </div>
      :<div style={{background:G.card,border:`1px solid ${G.border}`,borderRadius:16,padding:16}}>
        <div style={{fontSize:11,fontWeight:700,color:G.muted,marginBottom:12,letterSpacing:.8}}>LANÇAMENTOS</div>
        {lancCasal.sort((a,b)=>(b.data||"").localeCompare(a.data||"")).map((l,i)=>(
          <div key={l.id||i} style={{display:"flex",alignItems:"center",justifyContent:"space-between",padding:"9px 0",borderBottom:i<lancCasal.length-1?`1px solid ${G.border}`:"none"}}>
            <div>
              <div style={{fontSize:13,fontWeight:600}}>{l.desc||l.cat}</div>
              <div style={{fontSize:11,color:G.muted}}>{fmtD(l.data)} · {l.cat}{l.autorNome?` · ${l.autorNome}`:""}</div>
            </div>
            <div className="num" style={{fontSize:14,fontWeight:700,color:l.tipo==="Receita"?G.green:G.red}}>{l.tipo==="Receita"?"+":"-"}{fmt(l.valor)}</div>
          </div>
        ))}
      </div>}

    <Sheet open={sheetLanc} onClose={()=>setSheetLanc(false)} title="Novo — Casal">
      <div style={{display:"flex",flexDirection:"column",gap:14}}>
        <div style={{display:"flex",background:G.card2,borderRadius:12,padding:4}}>
          {["Despesa","Receita"].map(t=>(
            <button key={t} onClick={()=>setFormLanc(f=>({...f,tipo:t,cat:t==="Receita"?CATS_REC[0]:CATS_DEP[0],forma:t==="Receita"?FORMAS_REC[0]:FORMAS_DEP[0]}))}
              style={{flex:1,padding:"9px",borderRadius:9,border:"none",cursor:"pointer",fontFamily:"inherit",fontWeight:formLanc.tipo===t?700:500,
                background:formLanc.tipo===t?(t==="Despesa"?G.redL:G.greenL):"transparent",
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
        <div style={{fontSize:11,color:G.muted}}>Será registrado em nome de <b>{meuNome}</b>.</div>
        <button onClick={salvarLanc} className="press" style={{width:"100%",padding:14,borderRadius:14,border:"none",background:G.accent,color:"#fff",fontSize:15,fontWeight:700,cursor:"pointer",fontFamily:"inherit"}}>
          Salvar
        </button>
      </div>
    </Sheet>
  </div>);
}

export { CasalView };
