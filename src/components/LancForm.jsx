import { CATS_DEP, CATS_REC, FORMAS_DEP, FORMAS_REC, FREQ_OPTS } from "../lib/constants.js";
import { G } from "../theme.jsx";
import { Lbl } from "./ui.jsx";

// ─── LANC FORM ────────────────────────────────────────────────────────────────
function LancForm({tipo,setTipo,form,setForm,onSave,cartoes=[]}){
  const sw=t=>{setTipo(t);setForm(f=>({...f,cat:t==="Receita"?CATS_REC[0]:CATS_DEP[0],forma:t==="Receita"?FORMAS_REC[0]:FORMAS_DEP[0]}));};
  const ac=tipo==="Receita"?G.green:G.red;
  const isRec=form.recorrente;
  return(
    <div>
      <div style={{display:"flex",gap:8,marginBottom:20}}>
        {["Receita","Despesa"].map(t=><button key={t} onClick={()=>sw(t)} className="press" style={{flex:1,padding:"12px",borderRadius:12,cursor:"pointer",fontWeight:700,fontSize:14,fontFamily:"inherit",background:tipo===t?(t==="Receita"?G.greenL:G.redL):G.card2,color:tipo===t?(t==="Receita"?G.green:G.red):G.muted,border:`1px solid ${tipo===t?(t==="Receita"?G.green+"66":G.red+"66"):G.border}`}}>{t==="Receita"?"↑ Receita":"↓ Despesa"}</button>)}
      </div>
      <div style={{textAlign:"center",marginBottom:20}}>
        <Lbl>Valor (R$)</Lbl>
        <input type="number" inputMode="decimal" placeholder="0,00" min="0" step="0.01" value={form.valor} onChange={e=>setForm(f=>({...f,valor:e.target.value}))} style={{width:"100%",textAlign:"center",fontVariantNumeric:"tabular-nums",fontSize:36,fontWeight:700,color:ac,background:"transparent",border:"none",borderBottom:`2px solid ${ac}`,borderRadius:0,padding:"4px 0 10px",outline:"none"}}/>
      </div>
      <div style={{marginBottom:14}}><Lbl opt>Descrição</Lbl><input type="text" placeholder="Ex: Salário, Mercado, Uber..." value={form.desc} onChange={e=>setForm(f=>({...f,desc:e.target.value}))} className="inp"/></div>
      <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:12,marginBottom:14}}>
        <div><Lbl>Data</Lbl><input type="date" value={form.data} onChange={e=>setForm(f=>({...f,data:e.target.value}))} className="inp"/></div>
        <div><Lbl>Categoria</Lbl>{tipo==="Despesa"&&form.forma==="Cartão Crédito"?(<div className="inp" style={{color:G.muted,fontSize:14}}>💳 Cartão de Crédito</div>):(<select value={form.cat} onChange={e=>setForm(f=>({...f,cat:e.target.value}))} className="inp">{(tipo==="Receita"?CATS_REC:CATS_DEP).map(c=><option key={c}>{c}</option>)}</select>)}</div>
      </div>
      <div style={{marginBottom:16}}><Lbl>Forma de Pagamento</Lbl>
        <div style={{display:"flex",gap:8,overflowX:"auto",paddingBottom:4}}>
          {(tipo==="Receita"?FORMAS_REC:FORMAS_DEP).map(f=><div key={f} onClick={()=>setForm(fm=>({...fm,forma:f}))} className="press" style={{padding:"8px 14px",borderRadius:20,cursor:"pointer",flexShrink:0,fontSize:12,fontWeight:600,background:form.forma===f?ac+"22":G.card2,border:`1px solid ${form.forma===f?ac+"88":G.border}`,color:form.forma===f?ac:G.muted}}>{f}</div>)}
        </div>
      </div>
      {tipo==="Despesa"&&form.forma==="Cartão Crédito"&&cartoes.length>0&&<div style={{marginBottom:16}}>
        <Lbl>Qual cartão?</Lbl>
        <div style={{display:"flex",gap:8,overflowX:"auto",paddingBottom:4}}>
          <div onClick={()=>setForm(f=>({...f,cartaoId:""}))} className="press"
            style={{padding:"8px 14px",borderRadius:20,cursor:"pointer",flexShrink:0,fontSize:12,fontWeight:600,
              background:!form.cartaoId?G.accent+"22":G.card2,border:"1px solid "+(!form.cartaoId?G.accent+"88":G.border),color:!form.cartaoId?G.accent:G.muted}}>
            Sem vínculo
          </div>
          {cartoes.map(c=>(
            <div key={c.id} onClick={()=>setForm(f=>({...f,cartaoId:c.id}))} className="press"
              style={{padding:"8px 14px",borderRadius:20,cursor:"pointer",flexShrink:0,fontSize:12,fontWeight:600,display:"flex",alignItems:"center",gap:6,
                background:form.cartaoId===c.id?c.cor+"33":G.card2,border:"1px solid "+(form.cartaoId===c.id?c.cor:G.border),color:form.cartaoId===c.id?c.cor:G.muted}}>
              <div style={{width:8,height:8,borderRadius:"50%",background:c.cor,flexShrink:0}}/>
              {c.nome}
            </div>
          ))}
        </div>
      </div>}
      {/* ── Modo: Normal / Recorrente / Agendado ── */}
      <div style={{marginBottom:16}}>
        <div style={{display:"flex",gap:8,marginBottom:form.modo&&form.modo!=="normal"?10:0}}>
          {[{id:"normal",icon:"✓",l:"Normal"},{id:"recorrente",icon:"↻",l:"Recorrente"},{id:"agendado",icon:"",l:"Agendado"}].map(opt=>{
            const sel=(form.modo||"normal")===opt.id;
            return(<button key={opt.id} onClick={()=>setForm(f=>({...f,modo:opt.id}))} className="press"
              style={{flex:1,padding:"10px 6px",borderRadius:12,border:`1px solid ${sel?ac+"88":G.border}`,background:sel?ac+"18":G.card2,color:sel?ac:G.muted,fontSize:12,fontWeight:sel?700:500,cursor:"pointer",fontFamily:"inherit",display:"flex",flexDirection:"column",alignItems:"center",gap:3}}>
              <span style={{fontSize:16}}>{opt.icon}</span><span>{opt.l}</span>
            </button>);
          })}
        </div>
        {(form.modo||"normal")==="recorrente"&&<div style={{background:G.card2,borderRadius:12,padding:12,animation:"fadeUp .15s ease"}}>
          <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:10,marginBottom:8}}>
            <div><Lbl>Frequência</Lbl><select value={form.freq||"mensal"} onChange={e=>setForm(f=>({...f,freq:e.target.value}))} className="inp">{FREQ_OPTS.map(f=><option key={f.id} value={f.id}>{f.icon} {f.label}</option>)}</select></div>
            {form.freq==="semanal"
              ?<div><Lbl>Dia da semana</Lbl><select value={form.diaSemana??1} onChange={e=>setForm(f=>({...f,diaSemana:parseInt(e.target.value)}))} className="inp">{["Domingo","Segunda","Terça","Quarta","Quinta","Sexta","Sábado"].map((d,i)=><option key={d} value={i}>{d}</option>)}</select></div>
              :<div><Lbl>Dia do mês</Lbl><input type="text" inputMode="numeric" pattern="[0-9]*" placeholder="1–31" value={form.dia===0||form.dia===undefined?"":form.dia} onChange={e=>{const v=e.target.value.replace(/\D/g,"");setForm(f=>({...f,dia:v===""?0:Math.min(31,Math.max(1,parseInt(v)||1))}));}} onBlur={()=>{if(!form.dia||form.dia<1)setForm(f=>({...f,dia:1}));}} className="inp"/></div>}
          </div>
          <div style={{fontSize:11,color:G.muted,textAlign:"center"}}>↻ {form.freq==="semanal"?"Entra automaticamente toda semana no dia escolhido":"Entra automaticamente na data definida"}</div>
        </div>}
        {(form.modo||"normal")==="agendado"&&<div style={{background:G.yellow+"12",border:`1px solid ${G.yellow}44`,borderRadius:12,padding:12,animation:"fadeUp .15s ease"}}>
          <div style={{fontSize:12,color:G.yellow,fontWeight:600,marginBottom:4}}> Agendado</div>
          <div style={{fontSize:12,color:G.muted,lineHeight:1.5}}>Vai entrar no saldo só na data escolhida acima. Aparece na lista com visual diferente até lá.</div>
        </div>}
      </div>
      <button onClick={onSave} className="press" style={{width:"100%",padding:"16px",borderRadius:14,border:"none",cursor:"pointer",fontWeight:700,fontSize:16,fontFamily:"inherit",background:ac,color:"#fff"}}>Salvar {tipo}</button>
    </div>
  );
}

export { LancForm };
