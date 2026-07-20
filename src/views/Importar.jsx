import { useState, useRef, useEffect } from "react";
import { db } from "../firebase.js";
import { collection, addDoc } from "firebase/firestore";
import { CAT_COLORS } from "../lib/constants.js";
import { fmt, fmtD, getMes, round2, today } from "../lib/utils.js";
import { categorizar } from "../lib/ai.js";
import { subDe } from "../lib/taxonomia.js";
import { G } from "../theme.jsx";
import { ICON, Ic, Tag } from "../components/ui.jsx";

// Mini-parser de uma linha CSV: respeita aspas com vírgula/;
function parseLinha(line, sep){
  const out=[]; let cur="", dentro=false;
  for(let i=0;i<line.length;i++){
    const ch=line[i];
    if(ch==='"'){ if(dentro&&line[i+1]==='"'){cur+='"';i++;} else dentro=!dentro; }
    else if(ch===sep&&!dentro){ out.push(cur); cur=""; }
    else cur+=ch;
  }
  out.push(cur);
  return out.map(c=>c.trim().replace(/^"|"$/g,""));
}

function parseValorBR(s){
  let v=String(s).replace(/[R$\s]/gi,"").trim();
  // "1.234,56" -> 1234.56 ; "1234.56" -> 1234.56
  if(/,\d{1,2}$/.test(v))v=v.replace(/\./g,"").replace(",",".");
  else v=v.replace(",",".");
  return Math.abs(parseFloat(v)||0);
}

// ─── IMPORTAR VIEW ────────────────────────────────────────────────────────────
function ImportarView({uid,lancs,showT,__seedCsv}){
  const [csv,setCsv]=useState("");
  const [rows,setRows]=useState([]); // {data,desc,valor,tipo,cat,forma,dup,incluir}
  const [importing,setImporting]=useState(false);
  const fileRef=useRef();
  useEffect(()=>{if(__seedCsv){setCsv(__seedCsv);processar(__seedCsv);}},[]); // só p/ preview

  function processar(text){
    const linhas=text.trim().split(/\r?\n/).filter(l=>l.trim());
    if(linhas.length<2){setRows([]);return;}
    const sep=(linhas[0].match(/;/g)||[]).length>(linhas[0].match(/,/g)||[]).length?";":",";
    const header=parseLinha(linhas[0],sep).map(h=>h.toLowerCase());
    const idx=names=>header.findIndex(h=>names.some(n=>h.includes(n)));
    const iData=idx(["data","date"]),iDesc=idx(["desc","hist","memo","lançamento","lancamento"]),
      iVal=idx(["valor","value","amount","montante"]),iTipo=idx(["tipo","type"]),iCat=idx(["categoria","cat","category"]);

    // chaves já existentes p/ dedup
    const existentes=new Set((lancs||[]).map(l=>`${l.data}|${round2(l.valor)}|${(l.desc||"").toLowerCase().trim()}`));

    const parsed=linhas.slice(1).map(line=>{
      const c=parseLinha(line,sep);
      const desc=(iDesc>=0?c[iDesc]:c[1])||"Importado";
      const rawVal=iVal>=0?c[iVal]:c[2];
      const valor=parseValorBR(rawVal);
      // tipo: coluna explícita, ou sinal negativo no valor
      let tipo="Despesa";
      if(iTipo>=0&&/rec|entr|cred|\+/i.test(c[iTipo]))tipo="Receita";
      else if(iTipo<0&&/^\s*-/.test(String(rawVal)))tipo="Despesa";
      else if(iTipo<0&&/^\s*\+/.test(String(rawVal)))tipo="Receita";
      const cat=(iCat>=0&&c[iCat])?c[iCat]:categorizar(desc,tipo);
      const subcat=tipo==="Despesa"?subDe(desc,cat):"";
      const data=(iData>=0&&c[iData])?normData(c[iData]):today();
      const chave=`${data}|${round2(valor)}|${desc.toLowerCase().trim()}`;
      return{data,desc,valor:round2(valor),tipo,cat,subcat,forma:"Transferência",dup:existentes.has(chave),incluir:!existentes.has(chave)};
    }).filter(r=>r.valor>0);
    setRows(parsed);
  }

  function normData(s){
    s=String(s).trim();
    if(/^\d{4}-\d{2}-\d{2}/.test(s))return s.slice(0,10);
    const m=s.match(/^(\d{1,2})[\/.-](\d{1,2})[\/.-](\d{2,4})/);
    if(m){const[_,d,mo,y]=m;const yy=y.length===2?"20"+y:y;return `${yy}-${mo.padStart(2,"0")}-${d.padStart(2,"0")}`;}
    return today();
  }

  function onFile(e){
    const f=e.target.files?.[0]; if(!f)return;
    const r=new FileReader();
    r.onload=()=>{const txt=String(r.result||"");setCsv(txt);processar(txt);};
    r.readAsText(f);
  }

  const incluidos=rows.filter(r=>r.incluir);
  const dups=rows.filter(r=>r.dup).length;

  async function importar(){
    if(!incluidos.length)return;
    setImporting(true);
    try{
      for(const r of incluidos){
        await addDoc(collection(db,"users",uid,"lancamentos"),{tipo:r.tipo,desc:r.desc,cat:r.cat,...(r.subcat?{subcat:r.subcat}:{}),forma:r.forma,valor:r.valor,data:r.data,agendado:false,origem:"import"});
      }
      showT(`${incluidos.length} lançamentos importados!`);
      setCsv("");setRows([]);
    }catch(e){alert("Erro ao importar: "+e.message);}
    setImporting(false);
  }

  return(<div style={{padding:"16px 14px 32px",display:"flex",flexDirection:"column",gap:14}}>
    <div style={{background:G.card,border:`1px solid ${G.border}`,borderRadius:16,padding:18}}>
      <div style={{fontSize:15,fontWeight:700,marginBottom:6}}>Importar extrato</div>
      <div style={{fontSize:12,color:G.muted,marginBottom:14,lineHeight:1.6}}>
        Envie um arquivo <b>.csv</b> ou cole o conteúdo. Reconhece colunas de data, descrição, valor, tipo e categoria — e sugere a categoria automaticamente.
      </div>
      <input ref={fileRef} type="file" accept=".csv,text/csv" onChange={onFile} style={{display:"none"}}/>
      <button onClick={()=>fileRef.current?.click()} className="press"
        style={{width:"100%",padding:"13px",borderRadius:12,border:`1px dashed ${G.border2}`,background:G.card2,color:G.text,fontSize:14,fontWeight:600,cursor:"pointer",display:"flex",alignItems:"center",justifyContent:"center",gap:8,marginBottom:10}}>
        <Ic d={ICON.import} size={17} color={G.accent}/> Escolher arquivo CSV
      </button>
      <textarea value={csv} onChange={e=>{setCsv(e.target.value);processar(e.target.value);}}
        placeholder={"...ou cole aqui:\ndata,descricao,valor,tipo\n2026-07-15,Mercado Extra,150.00,Despesa"}
        className="inp" style={{width:"100%",minHeight:90,resize:"vertical",fontSize:12,fontFamily:"monospace"}}/>
    </div>

    {rows.length>0&&<div style={{background:G.card,border:`1px solid ${G.border}`,borderRadius:16,padding:16}}>
      <div style={{display:"flex",alignItems:"center",justifyContent:"space-between",marginBottom:12}}>
        <span style={{fontSize:11,fontWeight:700,letterSpacing:1,textTransform:"uppercase",color:G.muted}}>Prévia — {rows.length} linhas</span>
        <span style={{fontSize:12,color:G.muted}}>{incluidos.length} p/ importar{dups>0?` · ${dups} duplicada${dups>1?"s":""}`:""}</span>
      </div>
      <div style={{maxHeight:340,overflowY:"auto",display:"flex",flexDirection:"column",gap:6}}>
        {rows.map((r,i)=>(
          <div key={i} onClick={()=>setRows(rs=>rs.map((x,j)=>j===i?{...x,incluir:!x.incluir}:x))}
            style={{display:"flex",alignItems:"center",gap:10,padding:"9px 10px",borderRadius:10,cursor:"pointer",background:r.incluir?G.card2:"transparent",border:`1px solid ${r.incluir?G.border:"transparent"}`,opacity:r.incluir?1:.5}}>
            <div style={{width:20,height:20,borderRadius:6,border:`1.5px solid ${r.incluir?G.accent:G.border2}`,background:r.incluir?G.accent:"transparent",display:"flex",alignItems:"center",justifyContent:"center",flexShrink:0}}>
              {r.incluir&&<Ic d={ICON.check} size={13} color="#fff"/>}
            </div>
            <div style={{flex:1,minWidth:0}}>
              <div style={{fontSize:13,fontWeight:500,color:G.text,overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap"}}>{r.desc}</div>
              <div style={{display:"flex",gap:6,alignItems:"center",marginTop:2}}>
                <span style={{fontSize:10,color:G.muted}}>{fmtD(r.data)}</span>
                <Tag color={CAT_COLORS[r.cat]||G.muted}>{r.cat}</Tag>
                {r.dup&&<Tag color={G.yellow}>duplicada</Tag>}
              </div>
            </div>
            <div className="num" style={{fontSize:14,fontWeight:700,color:r.tipo==="Receita"?G.green:G.red,flexShrink:0}}>{r.tipo==="Receita"?"+":"-"}{fmt(r.valor)}</div>
          </div>
        ))}
      </div>
      <button onClick={importar} disabled={importing||!incluidos.length} className="press"
        style={{width:"100%",marginTop:12,padding:14,borderRadius:14,border:"none",background:incluidos.length?G.accent:G.border2,color:"#fff",fontSize:14,fontWeight:700,cursor:incluidos.length?"pointer":"not-allowed"}}>
        {importing?"Importando...":`Importar ${incluidos.length} lançamento${incluidos.length!==1?"s":""}`}
      </button>
    </div>}
  </div>);
}

export { ImportarView };
