import { useState, useEffect, useRef } from "react";
import { db } from "../firebase.js";
import { doc, getDoc, setDoc } from "firebase/firestore";
import { CATS_DEP, CATS_REC, CAT_COLORS, CAT_EMOJI } from "../lib/constants.js";
import { fmt, fmtD, today } from "../lib/utils.js";
import { analyzePhoto, callAI, createSpeechRecognizer } from "../lib/ai.js";
import { G } from "../theme.jsx";
import { ICON, Ic } from "../components/ui.jsx";

// ─── CHAT VIEW ────────────────────────────────────────────────────────────────
function ChatView({lancs,onAddLanc,isPremium=false,onUpgrade,uid,cartoes=[],orcamentos=[]}){
  const SUGS=["Gastei 45 no Uber","Meu maior gasto","Gasto por cartão","Tô dentro do orçamento?"];
  const [msgs,setMsgs]=useState([]);
  const [histLoaded,setHistLoaded]=useState(false);
  const [input,setInput]=useState("");
  const [busy,setBusy]=useState(false);
  const [pending,setPending]=useState(null);
  const [editVal,setEditVal]=useState("");
  const [showCatPicker,setShowCatPicker]=useState(false);
  const [catPickerIdx,setCatPickerIdx]=useState(null); // null = single, number = multiplos index
  const [recSt,setRecSt]=useState("idle");
  const [recSec,setRecSec]=useState(0);
  const [recErr,setRecErr]=useState("");
  const botRef=useRef(),inpRef=useRef(),tmrRef=useRef(null),srRef=useRef(null),photoRef=useRef(null);
  useEffect(()=>{botRef.current?.scrollIntoView({behavior:"smooth"});},[msgs]);
  const push=(from,text,ex={})=>setMsgs(p=>[...p,{id:Date.now()+Math.random(),from,text,ts:new Date(),...ex}]);
  const [photoLoading,setPhotoLoading]=useState(false);

  // Carrega histórico salvo (últimas mensagens de texto)
  useEffect(()=>{
    if(!uid){setHistLoaded(true);return;}
    getDoc(doc(db,"users",uid,"chat","historico")).then(s=>{
      if(s.exists()&&Array.isArray(s.data().msgs))setMsgs(s.data().msgs);
      setHistLoaded(true);
    }).catch(()=>setHistLoaded(true));
  },[uid]);

  // Persiste histórico (só texto; sem cards de confirmação pendentes) — máx 40 msgs
  useEffect(()=>{
    if(!uid||!histLoaded)return;
    const salvar=msgs.filter(m=>m.text&&!m.lanc&&!m.multi).slice(-40).map(m=>({id:m.id,from:m.from,text:m.text}));
    setDoc(doc(db,"users",uid,"chat","historico"),{msgs:salvar}).catch(()=>{});
  },[msgs,uid,histLoaded]);

  async function startRec(){
    setRecErr("");
    // Tenta Web Speech API primeiro (nativa, sem custo)
    const sr=createSpeechRecognizer(
      txt=>{
        if(txt.trim()){
          setInput(txt.trim());
          push("ai",`🎤 Transcrevi: *"${txt.trim()}"*\nRevise e toque enviar! ✉️`);
        } else push("ai","🎤 Não entendi. Fale mais alto e tente de novo 😊");
        setRecSt("idle");setRecSec(0);clearInterval(tmrRef.current);
      },
      err=>{
        setRecSt("idle");setRecSec(0);clearInterval(tmrRef.current);
        if(err==="not-allowed")setRecErr("Microfone bloqueado — libere nas configurações.");
        else push("ai","🎤 Erro na transcrição. Pode digitar? 😊");
      }
    );
    if(sr){
      try{
        setRecSt("rec");setRecSec(0);
        tmrRef.current=setInterval(()=>setRecSec(s=>s+1),1000);
        srRef.current=sr;
        sr.start();
        return;
      }catch(e){/* navegador sem suporte */}
    }
    // Sem Web Speech API: não há transcrição — avisa em vez de gravar áudio sem uso
    setRecErr("Seu navegador não suporta transcrição de voz. Use o Chrome ou digite a mensagem.");
  }
  function stopRec(){
    clearInterval(tmrRef.current);
    if(srRef.current){try{srRef.current.stop();}catch{}srRef.current=null;}
  }
  function cancelRec(){clearInterval(tmrRef.current);if(srRef.current){try{srRef.current.stop();}catch{}srRef.current=null;}setRecSt("idle");setRecSec(0);}

  async function send(txt){
    const msg=(txt||input).trim();if(!msg||busy)return;
    setInput("");if(inpRef.current)inpRef.current.style.height="auto";
    push("user",msg);setBusy(true);setPending(null);setEditVal("");setShowCatPicker(false);
    try{
      const r=await callAI(msg,{lancs,cartoes,orcamentos});
      if(r.action==="lancamento"){
        push("ai",r.confirmacao||"Entendido!",{lanc:r});
        setPending(r);
        setEditVal(r.valor.toFixed(2));
      }
      else if(r.action==="multiplos"){push("ai",`${r.confirmacao}\n\n${r.itens.map(i=>`• ${i.tipo==="Receita"?"↑":"↓"} ${i.desc} — R$${i.valor.toFixed(2)}`).join("\n")}`,{multi:r.itens});setPending(r);}
      else push("ai",r.resposta||"Não entendi 😊");
    }catch(e){console.error('Chat error:',e);push("ai","❌ Erro: "+(e?.message||"Tente novamente"));}
    setBusy(false);
  }

  function confirmar(){
    if(!pending)return;
    const valorFinal=parseFloat((editVal||"0").replace(",","."))||pending.valor;
    if(pending.action==="multiplos"){pending.itens.forEach(i=>onAddLanc({tipo:i.tipo,desc:i.desc,cat:i.cat,forma:i.forma||"PIX",valor:i.valor,data:i.data||today()}));}
    else{onAddLanc({tipo:pending.tipo,desc:pending.desc,cat:pending.cat,forma:pending.forma||"PIX",valor:valorFinal,data:pending.data||today()});}
    push("ai","✅ Lançamento salvo!");
    setPending(null);setEditVal("");setShowCatPicker(false);
  }

  function cancelar(){
    push("ai","Cancelei! 😊");
    setPending(null);setEditVal("");setShowCatPicker(false);
  }

  async function sendPhoto(file){
    if(!file)return;
    setPhotoLoading(true);
    push("user","📷 Enviando comprovante...");
    try{
      const base64=await new Promise((res,rej)=>{
        const r=new FileReader();
        r.onload=x=>res(x.target.result.split(",")[1]);
        r.onerror=rej;
        r.readAsDataURL(file);
      });
      const mime=file.type||"image/jpeg";
      push("ai","🔍 Analisando comprovante...");
      const result=await analyzePhoto(base64,mime);
      if(result.erro){
        push("ai","😕 Não consegui identificar os dados. Pode digitar o valor e descrição?");
      } else {
        const r={
          action:"lancamento",
          tipo:result.tipo||"Despesa",
          desc:result.desc||"Comprovante",
          cat:result.cat||"Outros",
          forma:result.forma||"PIX",
          valor:parseFloat(result.valor)||0,
          data:today(),
        };
        r.confirmacao=`📄 Identifiquei:\n*${r.desc}* — ${fmt(r.valor)}\nCategoria: ${r.cat} · ${r.forma}\n\nConfirma?`;
        push("ai",r.confirmacao,{lanc:r});
        setPending(r);
        setEditVal(r.valor.toFixed(2));
      }
    }catch(e){push("ai","❌ Erro ao analisar foto. Tente novamente ou digite manualmente.");}
    setPhotoLoading(false);
  }

  function escolherCat(cat){
    if(!pending)return;
    if(catPickerIdx!==null){
      // multiplos: update specific item
      setPending(p=>({...p,itens:p.itens.map((it,i)=>i===catPickerIdx?{...it,cat}:it)}));
    } else {
      setPending(p=>({...p,cat}));
    }
    setShowCatPicker(false);
    setCatPickerIdx(null);
  }

  const fmtS=s=>`${String(Math.floor(s/60)).padStart(2,"0")}:${String(s%60).padStart(2,"0")}`;
  const isRec=recSt==="rec",isProc=recSt==="proc";

  // Card de confirmação do lançamento
  function LancCard({lanc}){
    const isLast=msgs[msgs.length-1]?.lanc===lanc;
    const isPend=isLast&&!!pending;
    const cor=lanc.tipo==="Receita"?G.green:G.red;
    const cat=isPend?pending.cat:lanc.cat;
    const catCor=CAT_COLORS[cat]||G.muted;
    return(
      <div style={{marginTop:6,maxWidth:"88%",background:G.card,border:`1px solid ${cor}33`,borderRadius:16,padding:"14px 14px 12px"}}>
        <span style={{fontSize:10,fontWeight:700,padding:"2px 8px",borderRadius:20,background:cor+"22",color:cor,letterSpacing:.5,textTransform:"uppercase"}}>{lanc.tipo==="Receita"?"↑ Receita":"↓ Despesa"}</span>
        <div style={{fontSize:14,fontWeight:600,marginTop:8,marginBottom:10,color:G.text}}>{lanc.desc||lanc.cat}</div>
        <div style={{display:"flex",alignItems:"center",gap:8,marginBottom:8}}>
          <span style={{fontSize:11,color:G.muted,width:36}}>Valor</span>
          {isPend
            ?<div style={{display:"flex",alignItems:"center",flex:1,background:G.card2,border:`1px solid ${G.border}`,borderRadius:10,padding:"4px 10px"}}>
                <span style={{color:cor,fontWeight:700,marginRight:4,fontSize:13}}>R$</span>
                <input value={editVal} onChange={e=>setEditVal(e.target.value.replace(/[^0-9,.]/g,""))}
                  style={{background:"none",border:"none",outline:"none",fontVariantNumeric:"tabular-nums",fontSize:17,fontWeight:700,color:cor,width:"100%",minWidth:0}}
                  inputMode="decimal"/>
              </div>
            :<span style={{fontVariantNumeric:"tabular-nums",fontSize:17,fontWeight:700,color:cor}}>R${Number(lanc.valor).toFixed(2).replace(".",",")}</span>
          }
        </div>
        <div style={{display:"flex",alignItems:"center",gap:8,marginBottom:isPend?12:0}}>
          <span style={{fontSize:11,color:G.muted,width:36}}>Cat.</span>
          {isPend
            ?<button onClick={()=>setShowCatPicker(true)} className="press"
                style={{display:"flex",alignItems:"center",gap:6,padding:"5px 12px",borderRadius:20,border:`1px solid ${catCor}55`,background:catCor+"18",cursor:"pointer"}}>
                <span style={{fontSize:12,fontWeight:600,color:catCor}}>{cat}</span>
                <Ic d={ICON.repeat} size={11} color={catCor}/>
              </button>
            :<span style={{fontSize:12,padding:"3px 10px",borderRadius:20,background:catCor+"22",color:catCor,fontWeight:600}}>{cat}</span>
          }
          {!isPend&&<span style={{fontSize:11,color:G.muted}}>{lanc.forma} · {fmtD(lanc.data||today())}</span>}
        </div>
        {isPend&&<div style={{display:"flex",gap:8}}>
          <button onClick={confirmar} className="press" style={{flex:1,padding:"10px",borderRadius:10,border:"none",cursor:"pointer",background:G.accent,color:"#fff",fontSize:13,fontWeight:700}}>✓ Confirmar</button>
          <button onClick={cancelar} className="press" style={{padding:"10px 14px",borderRadius:10,border:`1px solid ${G.border}`,background:"none",color:G.muted,fontSize:13,cursor:"pointer"}}>✕</button>
        </div>}
      </div>
    );
  }

  return(<div style={{display:"flex",flexDirection:"column",height:"100%"}}>
    <div style={{flex:1,overflowY:"auto",padding:"12px 14px",display:"flex",flexDirection:"column",gap:10}}>
      {msgs.map(m=>(<div key={m.id} style={{display:"flex",flexDirection:"column",alignItems:m.from==="user"?"flex-end":"flex-start"}}>
        <div style={{maxWidth:"84%",padding:"10px 14px",borderRadius:m.from==="user"?"18px 18px 4px 18px":"18px 18px 18px 4px",background:m.from==="user"?G.accent:G.card2,color:m.from==="user"?"#fff":G.text,fontSize:14,lineHeight:1.5,whiteSpace:"pre-wrap"}}>
          {m.text}
        </div>
        {m.lanc&&<LancCard lanc={m.lanc}/>}
        {m.multi&&<div style={{marginTop:6,maxWidth:"84%",display:"flex",flexDirection:"column",gap:6}}>
          {m.multi.map((item,idx)=>{
            const liveItem=pending?.action==="multiplos"&&pending.itens?.[idx]?pending.itens[idx]:item;
            const cor=liveItem.tipo==="Receita"?G.green:G.red;
            const catCor=CAT_COLORS[liveItem.cat]||G.muted;
            const isPend=pending?.action==="multiplos";
            return(
              <div key={idx} style={{background:G.card,border:`1px solid ${cor}44`,borderRadius:12,padding:"10px 12px",display:"flex",alignItems:"center",gap:10}}>
                <span style={{fontSize:18,color:cor}}>{liveItem.tipo==="Receita"?"↑":"↓"}</span>
                <div style={{flex:1,minWidth:0}}>
                  <div style={{fontSize:13,fontWeight:500,color:G.text}}>{liveItem.desc||liveItem.cat}</div>
                  {isPend
                    ?<button onClick={()=>{setCatPickerIdx(idx);setShowCatPicker(true);}} className="press"
                        style={{display:"inline-flex",alignItems:"center",gap:4,marginTop:3,padding:"2px 8px",borderRadius:10,
                          border:`1px solid ${catCor}55`,background:catCor+"18",cursor:"pointer"}}>
                        <span style={{fontSize:11,fontWeight:600,color:catCor}}>{liveItem.cat}</span>
                        <Ic d={ICON.repeat} size={10} color={catCor}/>
                      </button>
                    :<div style={{fontSize:11,color:G.muted,marginTop:2}}>{liveItem.cat}</div>
                  }
                </div>
                <div style={{fontVariantNumeric:"tabular-nums",fontSize:14,fontWeight:700,color:cor}}>R${liveItem.valor.toFixed(2)}</div>
              </div>
            );
          })}
          {pending?.action==="multiplos"&&<div style={{display:"flex",gap:8,marginTop:4}}>
            <button onClick={confirmar} className="press" style={{flex:1,padding:"10px",borderRadius:10,border:"none",cursor:"pointer",background:G.accent,color:"#fff",fontSize:13,fontWeight:700}}>✓ Confirmar tudo</button>
            <button onClick={cancelar} className="press" style={{padding:"10px 14px",borderRadius:10,border:`1px solid ${G.border}`,background:"none",color:G.muted,fontSize:13,cursor:"pointer"}}>✕</button>
          </div>}
        </div>}
        <div style={{fontSize:10,color:G.muted,marginTop:3}}>{m.ts.toLocaleTimeString("pt-BR",{hour:"2-digit",minute:"2-digit"})}</div>
      </div>))}
      {(busy||isProc)&&<div style={{display:"flex",alignItems:"center",gap:10}}>
        <div style={{padding:"12px 16px",borderRadius:"18px 18px 18px 4px",background:G.card2,border:`1px solid ${G.border}`}}>
          <div style={{display:"flex",gap:4}}>{[0,1,2].map(i=><div key={i} style={{width:6,height:6,borderRadius:"50%",background:G.muted,animation:`bounce .9s ${i*0.15}s infinite`}}/>)}</div>
        </div>
        {isProc&&<span style={{fontSize:12,color:G.muted}}>transcrevendo...</span>}
      </div>}
      <div ref={botRef}/>
    </div>

    {/* Cat picker modal — fora do scroll div, sem depender de pending */}
    {showCatPicker&&<div style={{position:"fixed",inset:0,zIndex:500,display:"flex",flexDirection:"column",justifyContent:"flex-end"}}>
      <div style={{position:"absolute",inset:0,background:"rgba(0,0,0,.6)",backdropFilter:"blur(4px)"}} onClick={()=>setShowCatPicker(false)}/>
      <div style={{position:"relative",background:G.card,borderRadius:"22px 22px 0 0",maxHeight:"72vh",display:"flex",flexDirection:"column",paddingBottom:"env(safe-area-inset-bottom,0px)"}}>
        <div style={{display:"flex",justifyContent:"center",padding:"10px 0 4px"}}><div style={{width:36,height:4,borderRadius:2,background:G.border}}/></div>
        <div style={{display:"flex",alignItems:"center",justifyContent:"space-between",padding:"8px 20px 14px"}}>
          <div style={{fontVariantNumeric:"tabular-nums",fontSize:18,fontWeight:700}}>Mudar categoria</div>
          <button onClick={()=>setShowCatPicker(false)} style={{width:30,height:30,borderRadius:8,border:"none",background:G.card2,color:G.muted,cursor:"pointer",display:"flex",alignItems:"center",justifyContent:"center"}}>
            <Ic d={ICON.x} size={14}/>
          </button>
        </div>
        <div style={{overflowY:"auto",padding:"0 16px 16px"}}>
          {((()=>{
            if(catPickerIdx!==null&&pending?.itens) return pending.itens[catPickerIdx]?.tipo==="Receita"?CATS_REC:CATS_DEP;
            return pending?.tipo==="Receita"?CATS_REC:CATS_DEP;
          })()).map(cat=>{
            const cor=CAT_COLORS[cat]||G.muted;
            const curCat=catPickerIdx!==null?pending?.itens?.[catPickerIdx]?.cat:pending?.cat;
            const sel=curCat===cat;
            return(
              <div key={cat} onClick={()=>escolherCat(cat)} className="press"
                style={{display:"flex",alignItems:"center",gap:14,padding:"12px 14px",borderRadius:14,marginBottom:6,cursor:"pointer",
                  background:sel?cor+"22":"transparent",border:`1px solid ${sel?cor+"66":"transparent"}`}}>
                <div style={{width:36,height:36,borderRadius:10,background:cor+"22",display:"flex",alignItems:"center",justifyContent:"center",fontSize:18}}>{CAT_EMOJI[cat]||"💰"}</div>
                <span style={{fontSize:15,fontWeight:600,color:sel?cor:G.text}}>{cat}</span>
                {sel&&<Ic d={ICON.check} size={16} color={cor} style={{marginLeft:"auto"}}/>}
                {!sel&&<div style={{marginLeft:"auto",width:8,height:8,borderRadius:"50%",background:cor}}/>}
              </div>
            );
          })}
        </div>
      </div>
    </div>}

    {recErr&&<div style={{margin:"0 14px 8px",padding:"10px 14px",borderRadius:12,background:G.redL,border:`1px solid ${G.red}44`,fontSize:12,color:G.red}}>{recErr}</div>}
    {msgs.length<=2&&!isRec&&<div style={{display:"flex",gap:8,overflowX:"auto",padding:"4px 14px 8px",flexShrink:0}}>{SUGS.map(s=><div key={s} onClick={()=>send(s)} className="press" style={{padding:"8px 14px",borderRadius:20,background:G.card2,border:`1px solid ${G.border}`,fontSize:12,color:G.muted,cursor:"pointer",whiteSpace:"nowrap",flexShrink:0}}>{s}</div>)}</div>}
    <div style={{padding:"10px 12px",background:G.card,borderTop:`1px solid ${G.border}`,flexShrink:0}}>
      {isRec?(<div style={{display:"flex",alignItems:"center",gap:12}}>
        <div style={{width:44,height:44,borderRadius:"50%",flexShrink:0,background:G.redL,border:`2px solid ${G.red}`,display:"flex",alignItems:"center",justifyContent:"center",fontSize:20}}>🎙</div>
        <div style={{flex:1}}><div style={{fontSize:13,fontWeight:700,color:G.red}}>Gravando...</div><div style={{fontSize:12,color:G.muted}}>{fmtS(recSec)}</div></div>
        <button onClick={stopRec} className="press" style={{padding:"10px 16px",borderRadius:22,border:"none",cursor:"pointer",background:G.accent,color:"#fff",fontSize:13,fontWeight:700}}>Enviar</button>
        <button onClick={cancelRec} className="press" style={{width:36,height:36,borderRadius:"50%",border:`1px solid ${G.border}`,background:"none",color:G.muted,cursor:"pointer",display:"flex",alignItems:"center",justifyContent:"center"}}>
          <Ic d={ICON.x} size={16}/>
        </button>
      </div>):(<div style={{display:"flex",gap:8,alignItems:"flex-end"}}>
        <button onClick={()=>{if(!isPremium&&onUpgrade){onUpgrade();return;}startRec();}} disabled={busy||isProc||photoLoading} className="press"
          style={{width:44,height:44,borderRadius:"50%",border:`1px solid ${isPremium?G.border:G.accent+"44"}`,background:isPremium?"none":G.accent+"11",cursor:"pointer",display:"flex",alignItems:"center",justifyContent:"center",flexShrink:0,color:isPremium?G.muted:G.accent,position:"relative"}}>
          <Ic d="M12 1a3 3 0 00-3 3v8a3 3 0 006 0V4a3 3 0 00-3-3zM19 10v2a7 7 0 01-14 0v-2M12 19v4M8 23h8" size={20}/>
          {!isPremium&&<span style={{position:"absolute",top:-4,right:-4,fontSize:9,background:G.accent,color:"#fff",borderRadius:8,padding:"1px 4px",fontWeight:700}}>PRO</span>}
        </button>
        <button onClick={()=>{if(!isPremium&&onUpgrade){onUpgrade();return;}photoRef.current?.click();}} disabled={busy||isProc||photoLoading} className="press"
          style={{width:44,height:44,borderRadius:"50%",border:`1px solid ${isPremium?G.border:G.accent+"44"}`,background:isPremium?"none":G.accent+"11",cursor:"pointer",display:"flex",alignItems:"center",justifyContent:"center",flexShrink:0,color:isPremium?G.muted:G.accent,position:"relative"}}>
          <Ic d={ICON.camera} size={20}/>
          {!isPremium&&<span style={{position:"absolute",top:-4,right:-4,fontSize:9,background:G.accent,color:"#fff",borderRadius:8,padding:"1px 4px",fontWeight:700}}>PRO</span>}
        </button>
        <input ref={photoRef} type="file" accept="image/*" capture="environment" style={{display:"none"}}
          onChange={e=>{const f=e.target.files?.[0];if(f)sendPhoto(f);e.target.value="";}}/>
        <textarea ref={inpRef} value={input} onChange={e=>{setInput(e.target.value);e.target.style.height="auto";e.target.style.height=Math.min(e.target.scrollHeight,120)+"px";}}
          onKeyDown={e=>{if(e.key==="Enter"&&!e.shiftKey){e.preventDefault();send();}}}
          placeholder="Ex: Gastei 50 no mercado..." rows={1}
          style={{flex:1,resize:"none",padding:"12px 14px",borderRadius:22,border:`1px solid ${G.border}`,background:G.card2,color:G.text,fontSize:14,outline:"none",lineHeight:1.4,fontFamily:"'Figtree',sans-serif",overflowY:"hidden"}}/>
        <button onClick={()=>send()} disabled={!input.trim()||busy||photoLoading} className="press" style={{width:44,height:44,borderRadius:"50%",border:"none",cursor:"pointer",background:G.accent,color:"#fff",display:"flex",alignItems:"center",justifyContent:"center",flexShrink:0}}>
          <Ic d={ICON.arrow_up} size={20}/>
        </button>
      </div>)}
    </div>
  </div>);
}


export { ChatView };
