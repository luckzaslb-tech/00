import { useState } from "react";
import { db } from "../firebase.js";
import { collection, addDoc } from "firebase/firestore";
import { fmt, fmtD, today } from "../lib/utils.js";
import { G } from "../theme.jsx";

// ─── IMPORTAR VIEW ────────────────────────────────────────────────────────────
function ImportarView({uid,lancs,showT}){
  const [csv,setCsv]=useState("");
  const [preview,setPreview]=useState([]);
  const [importing,setImporting]=useState(false);

  function parseCsv(text){
    const lines=text.trim().split("\n").filter(l=>l.trim());
    if(lines.length<2)return[];
    const header=lines[0].split(",").map(h=>h.trim().toLowerCase().replace(/["\']/g,""));
    return lines.slice(1).map(line=>{
      const cols=line.split(",").map(c=>c.trim().replace(/["\']/g,""));
      const obj={};
      header.forEach((h,i)=>obj[h]=cols[i]||"");
      return{
        data:obj.data||obj.date||today(),
        desc:obj.desc||obj.descricao||obj.description||obj.memo||"Importado",
        valor:parseFloat((obj.valor||obj.value||obj.amount||"0").replace(",","."))||0,
        tipo:(obj.tipo||obj.type||"").toLowerCase().includes("rec")?"Receita":"Despesa",
        cat:obj.cat||obj.categoria||obj.category||"Outros",
        forma:obj.forma||obj.method||"Transferência",
      };
    }).filter(r=>r.valor>0);
  }

  async function importar(){
    if(!preview.length)return;
    setImporting(true);
    try{
      for(const l of preview){
        await addDoc(collection(db,"users",uid,"lancamentos"),l);
      }
      showT(`${preview.length} lançamentos importados!`);
      setCsv("");setPreview([]);
    }catch(e){alert("Erro ao importar: "+e.message);}
    setImporting(false);
  }

  return(<div style={{padding:"16px 14px 32px",display:"flex",flexDirection:"column",gap:16}}>
    <div style={{background:G.card,border:`1px solid ${G.border}`,borderRadius:16,padding:20}}>
      <div style={{fontSize:13,fontWeight:700,marginBottom:12}}>Importar CSV</div>
      <div style={{fontSize:12,color:G.muted,marginBottom:12,lineHeight:1.6}}>
        Cole o conteúdo do seu CSV abaixo. O arquivo deve ter colunas: <b>data, desc, valor, tipo</b>
      </div>
      <textarea value={csv} onChange={e=>{setCsv(e.target.value);setPreview(parseCsv(e.target.value));}}
        placeholder="data,desc,valor,tipo\n2024-01-15,Mercado,150.00,Despesa"
        className="inp" style={{width:"100%",minHeight:120,resize:"vertical",fontSize:12}}/>
      {preview.length>0&&<>
        <div style={{fontSize:12,color:G.green,marginTop:8,marginBottom:8}}>
          ✓ {preview.length} lançamentos encontrados
        </div>
        <div style={{maxHeight:200,overflowY:"auto",display:"flex",flexDirection:"column",gap:6}}>
          {preview.slice(0,10).map((l,i)=>(
            <div key={i} style={{display:"flex",justifyContent:"space-between",fontSize:12,
              padding:"6px 10px",background:G.card2,borderRadius:8}}>
              <span>{l.desc}</span>
              <span style={{color:l.tipo==="Receita"?G.green:G.red,fontWeight:600}}>
                {l.tipo==="Receita"?"+":"-"}{fmt(l.valor)}
              </span>
            </div>
          ))}
          {preview.length>10&&<div style={{fontSize:11,color:G.muted,textAlign:"center"}}>
            +{preview.length-10} mais...
          </div>}
        </div>
        <button onClick={importar} disabled={importing} className="press"
          style={{width:"100%",marginTop:12,padding:14,borderRadius:14,border:"none",
            background:G.accent,color:"#fff",fontSize:14,fontWeight:700,cursor:"pointer"}}>
          {importing?"Importando...":"Importar "+preview.length+" lançamentos"}
        </button>
      </>}
    </div>
    <div style={{background:G.card,border:`1px solid ${G.border}`,borderRadius:16,padding:20}}>
      <div style={{fontSize:13,fontWeight:700,marginBottom:8}}>Lançamentos recentes</div>
      {lancs.slice(0,10).map(l=>(
        <div key={l.id} style={{display:"flex",justifyContent:"space-between",
          padding:"8px 0",borderBottom:`1px solid ${G.border}`}}>
          <div>
            <div style={{fontSize:13}}>{l.desc}</div>
            <div style={{fontSize:11,color:G.muted}}>{fmtD(l.data)}</div>
          </div>
          <div style={{color:l.tipo==="Receita"?G.green:G.red,fontWeight:700,fontSize:13}}>
            {l.tipo==="Receita"?"+":"-"}{fmt(l.valor)}
          </div>
        </div>
      ))}
    </div>
  </div>);
}

export { ImportarView };
