import { useState, useEffect } from "react";
import { db } from "../firebase.js";
import { collection, doc, deleteDoc, updateDoc, onSnapshot, setDoc, getDoc } from "firebase/firestore";
import { today, round2, toPartes, fmt, fmtD } from "../lib/utils.js";
import { G } from "../theme.jsx";
import { ICON, Ic, Lbl } from "../components/ui.jsx";
import { Sheet } from "../components/Sheet.jsx";

// ─── CONTATOS VIEW ────────────────────────────────────────────────────────────
function ContatosView({uid,user,onVoltar,onNovaDivisao}){
  const [contatos,setContatos]=useState([]);
  const [divisoes,setDivisoes]=useState([]);
  const [codInput,setCodInput]=useState("");
  const [buscando,setBuscando]=useState(false);
  const [erro,setErro]=useState("");
  const [sheetAdd,setSheetAdd]=useState(false);
  const [formAdd,setFormAdd]=useState({nome:"",categoria:"Amigos"});
  const [editando,setEditando]=useState(null);
  const [formEdit,setFormEdit]=useState({nome:"",categoria:"Amigos",apelido:"",notas:""});

  const CATS=["Família","Amigos","Trabalho","Casal","Outros"];

  useEffect(()=>{
    if(!uid)return;
    const unsub=onSnapshot(collection(db,"users",uid,"contatos"),snap=>{
      setContatos(snap.docs.map(d=>({id:d.id,...d.data()})));
    });
    const unsubDiv=onSnapshot(collection(db,"users",uid,"divisoes"),snap=>{
      setDivisoes(snap.docs.map(d=>({id:d.id,...d.data()})));
    });
    // Ouve inbox de contatos novos (pessoas que digitaram meu codigo)
    const unsubInbox=onSnapshot(collection(db,"inbox",uid,"contatos"),snap=>{
      snap.docs.forEach(d=>{
        const data=d.data();
        if(!data||!data.uid)return;
        setDoc(doc(db,"users",uid,"contatos",data.uid),{
          nome:data.nome||"Contato",uid:data.uid,vinculado:true,
          categoria:data.categoria||"Amigos",criadoEm:data.criadoEm||today()
        }).then(()=>deleteDoc(doc(db,"inbox",uid,"contatos",d.id)))
          .catch(e=>console.warn("inbox contato:",e.message));
      });
    });
    return()=>{unsub();unsubDiv();unsubInbox();};
  },[uid]);

  // Resumo financeiro por nome de contato: cruza com as divisões
  function resumoContato(nome){
    let total=0,aberto=0,ultima=null;
    for(const d of divisoes){
      if(d.recebida)continue;
      const partes=toPartes(d.partes);
      const p=partes.find(x=>x.nome===nome);
      if(!p)continue;
      total=round2(total+p.valor);
      if(!p.pago)aberto=round2(aberto+p.valor);
      if(!ultima||(d.data||"")>(ultima.data||""))ultima=d;
    }
    return{total,aberto,ultima,n:divisoes.filter(d=>!d.recebida&&toPartes(d.partes).some(x=>x.nome===nome)).length};
  }

  async function adicionarPorCodigo(){
    setErro("");setBuscando(true);
    const cod=codInput.trim().toUpperCase();
    if(cod.length<6){setErro("Código inválido");setBuscando(false);return;}
    try{
      // Lê convite
      let convSnap;
      try{
        convSnap=await getDoc(doc(db,"convites",cod));
      }catch(e){
        if(e.code==="permission-denied"){setErro("Permissão negada — adicione a regra 'convites' no Firestore Console");setBuscando(false);return;}
        throw e;
      }
      if(!convSnap.exists()){
        setErro("Código não encontrado. Gere um novo código no app e tente de novo.");
        setBuscando(false);return;
      }
      const conv=convSnap.data();
      if(conv.criadoPor===uid){setErro("Este é o seu próprio código");setBuscando(false);return;}
      if(conv.usado&&conv.usado!==uid){setErro("Código já utilizado");setBuscando(false);return;}

      // Pega meu nome: tenta perfil > displayName > email
      let meuNome=user?.displayName||user?.email?.split("@")[0]||"Contato";
      try{const p=await getDoc(doc(db,"users",uid,"carreira","perfil"));if(p.exists()&&p.data().nome)meuNome=p.data().nome;}catch(_){}

      // Pega nome do dono do código: tenta perfil > fallback "Contato"
      let nomeParc="Contato";
      try{
        const p=await getDoc(doc(db,"users",conv.criadoPor,"carreira","perfil"));
        if(p.exists()&&p.data().nome)nomeParc=p.data().nome;
      }catch(_){}
      // Se não tem perfil, usa o nome guardado no próprio convite (se existir)
      if(nomeParc==="Contato"&&conv.nomeAutor)nomeParc=conv.nomeAutor;

      // 1. Salva o dono do código na MINHA lista de contatos
      await setDoc(doc(db,"users",uid,"contatos",conv.criadoPor),{
        nome:nomeParc,uid:conv.criadoPor,vinculado:true,categoria:"Amigos",criadoEm:today()
      });

      // 2. Notifica a outra pessoa via inbox público (ela vira meu contato também)
      try{
        await setDoc(doc(db,"inbox",conv.criadoPor,"contatos",uid),{
          nome:meuNome,uid,vinculado:true,categoria:"Amigos",criadoEm:today()
        });
      }catch(e){
        // inbox pode não ter regra ainda — não bloqueia o fluxo
        console.warn("inbox não acessível:",e.message);
      }

      // 3. Salva meu nome no convite para que outros saibam quem usou
      await updateDoc(doc(db,"convites",cod),{usado:uid,usadoPor:uid,usadoEm:today(),nomeUsou:meuNome});

      setCodInput("");
      setSheetAdd(false);
    }catch(e){
      if(e.code==="permission-denied")setErro("Permissão negada — verifique as regras do Firestore");
      else setErro("Erro: "+e.message);
    }
    setBuscando(false);
  }

  async function gerarMeuCodigo(){
    const cod=Math.random().toString(36).substring(2,8).toUpperCase();
    let meuNome=user?.displayName||user?.email?.split("@")[0]||"Contato";
    try{const p=await getDoc(doc(db,"users",uid,"carreira","perfil"));if(p.exists()&&p.data().nome)meuNome=p.data().nome;}catch(_){}
    await setDoc(doc(db,"convites",cod),{criadoPor:uid,criadoEm:new Date().toISOString(),nomeAutor:meuNome});
    await setDoc(doc(db,"users",uid,"config","meucod"),{codigo:cod,criadoEm:today()},{merge:true});
    return cod;
  }

  const [meuCod,setMeuCod]=useState("");
  const [gerando,setGerando]=useState(false);
  useEffect(()=>{
    if(!uid)return;
    getDoc(doc(db,"users",uid,"config","meucod")).then(s=>{if(s.exists())setMeuCod(s.data().codigo||"");}).catch(()=>{});
  },[uid]);

  async function handleGerarCodigo(){
    setGerando(true);
    const cod=await gerarMeuCodigo();
    setMeuCod(cod);setGerando(false);
  }

  function abrirEdicao(ct){
    setFormEdit({nome:ct.nome||"",categoria:ct.categoria||"Amigos",apelido:ct.apelido||"",notas:ct.notas||""});
    setEditando(ct);
  }

  async function salvarEdicao(){
    if(!editando||!formEdit.nome.trim())return;
    try{
      await updateDoc(doc(db,"users",uid,"contatos",editando.id),{
        nome:formEdit.nome.trim(),
        categoria:formEdit.categoria,
        apelido:formEdit.apelido.trim(),
        notas:formEdit.notas.trim(),
      });
      setEditando(null);
    }catch(e){console.error("salvarEdicao:",e.message);}
  }

  async function deletarContato(id){
    try{
      await deleteDoc(doc(db,"users",uid,"contatos",id));
    }catch(e){console.error("deletarContato:",e.message);}
  }

  const catColors={"Família":G.green,"Amigos":G.accent,"Trabalho":G.yellow,"Casal":"#F472B6","Outros":G.muted};
  const grupos=["Família","Casal","Amigos","Trabalho","Outros"];

  return(<div style={{display:"flex",flexDirection:"column",gap:16}}>
    {onVoltar&&<button onClick={onVoltar} className="press"
      style={{display:"inline-flex",alignItems:"center",gap:6,background:"none",border:"none",color:G.muted,cursor:"pointer",fontSize:13,fontWeight:500,padding:0,alignSelf:"flex-start"}}>
      <Ic d="M15 18l-6-6 6-6" size={16} color={G.muted}/> Voltar para Divisões
    </button>}
    {/* Meu código */}
    <div style={{background:G.card,border:"1px solid "+G.border,borderRadius:16,padding:16}}>
      <div style={{fontSize:11,fontWeight:700,color:G.muted,letterSpacing:1,marginBottom:10}}>MEU CÓDIGO DE CONVITE</div>
      {meuCod?<>
        <div style={{fontSize:30,fontWeight:900,letterSpacing:8,color:G.accent,textAlign:"center",fontFamily:"monospace",background:G.accentL,borderRadius:12,padding:"12px 0",marginBottom:8}}>
          {meuCod}
        </div>
        <div style={{fontSize:11,color:G.muted,textAlign:"center",marginBottom:8}}>Compartilhe com quem quer adicionar como contato</div>
        <button onClick={()=>navigator.clipboard?.writeText(meuCod)} className="press"
          style={{width:"100%",padding:"9px",borderRadius:10,border:"1px solid "+G.accent+"44",background:G.accentL,color:G.accent,fontSize:13,fontWeight:600,cursor:"pointer",fontFamily:"inherit"}}>
          Copiar código
        </button>
      </>:<button onClick={handleGerarCodigo} disabled={gerando} className="press"
        style={{width:"100%",padding:12,borderRadius:12,border:"none",background:G.accent,color:"#fff",fontSize:14,fontWeight:700,cursor:"pointer",fontFamily:"inherit",opacity:gerando?.6:1}}>
        {gerando?"Gerando...":"Gerar meu código"}
      </button>}
    </div>

    {/* Adicionar por código */}
    <button onClick={()=>setSheetAdd("codigo")} className="press"
      style={{width:"100%",padding:"12px",borderRadius:12,border:"1px solid "+G.accent+"44",background:G.accentL,color:G.accent,fontSize:14,fontWeight:600,cursor:"pointer",fontFamily:"inherit",display:"flex",alignItems:"center",justifyContent:"center",gap:8}}>
      Adicionar amigo por código
    </button>

    {/* Lista por grupo */}
    {contatos.length===0&&<div style={{textAlign:"center",padding:"40px 20px",color:G.muted,background:G.card,border:"1px solid "+G.border,borderRadius:16}}>
      <div style={{fontSize:36,marginBottom:8}}></div>
      <div style={{fontSize:14,fontWeight:600,marginBottom:4}}>Nenhum contato ainda</div>
      <div style={{fontSize:12}}>Gere seu código e compartilhe, ou adicione manualmente</div>
    </div>}

    {grupos.filter(g=>contatos.some(c=>c.categoria===g||(!c.categoria&&g==="Outros"))).map(grupo=>{
      const lista=contatos.filter(c=>(c.categoria||"Outros")===grupo);
      if(!lista.length)return null;
      return(<div key={grupo}>
        <div style={{fontSize:11,fontWeight:700,color:catColors[grupo]||G.muted,letterSpacing:.8,marginBottom:8}}>
          {grupo.toUpperCase()}
        </div>
        {lista.map(ct=>{
          const rc=resumoContato(ct.nome);
          return(
          <div key={ct.id} style={{background:G.card,border:"1px solid "+G.border,borderRadius:12,marginBottom:8,overflow:"hidden"}}>
            <div style={{display:"flex",alignItems:"center",gap:12,padding:"10px 14px"}}>
              <div style={{width:38,height:38,borderRadius:"50%",background:(catColors[ct.categoria]||G.muted)+"33",
                color:catColors[ct.categoria]||G.muted,display:"flex",alignItems:"center",justifyContent:"center",fontSize:15,fontWeight:700,flexShrink:0}}>
                {(ct.apelido||ct.nome)[0]?.toUpperCase()}
              </div>
              <div style={{flex:1,minWidth:0}}>
                <div style={{fontSize:14,fontWeight:600}}>{ct.apelido||ct.nome}</div>
                {ct.apelido&&<div style={{fontSize:11,color:G.muted}}>{ct.nome}</div>}
                <div style={{fontSize:11,color:G.muted}}>{ct.vinculado?"Vinculado":"Manual"} · {ct.categoria||"Outros"}</div>
                {ct.notas&&<div style={{fontSize:11,color:G.muted,fontStyle:"italic",overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap"}}>{ct.notas}</div>}
              </div>
              <button onClick={()=>abrirEdicao(ct)} aria-label="Editar"
                style={{background:"none",border:"none",color:G.muted,cursor:"pointer",padding:"4px 6px",display:"flex",alignItems:"center"}}><Ic d={ICON.edit} size={14} color={G.muted}/></button>
              <button onClick={()=>deletarContato(ct.id)} aria-label="Excluir"
                style={{background:"none",border:"none",color:G.border2,cursor:"pointer",padding:"2px 6px",display:"flex"}}
                onMouseEnter={e=>e.currentTarget.style.color=G.red} onMouseLeave={e=>e.currentTarget.style.color=G.border2}><Ic d={ICON.x} size={14}/></button>
            </div>
            {/* resumo financeiro + ação */}
            <div style={{borderTop:`1px solid ${G.border}`,padding:"8px 14px",display:"flex",alignItems:"center",gap:10}}>
              <div style={{flex:1,fontSize:11,color:G.muted}}>
                {rc.n>0
                  ?<>{rc.n} divisã{rc.n>1?"o":"o"} · {rc.aberto>0?<span style={{color:G.green,fontWeight:600}}>te deve {fmt(rc.aberto)}</span>:<span style={{color:G.muted}}>tudo quitado</span>}{rc.ultima?` · última ${fmtD(rc.ultima.data)}`:""}</>
                  :"Nenhuma divisão ainda"}
              </div>
              {onNovaDivisao&&<button onClick={()=>onNovaDivisao(ct.nome)} className="press"
                style={{display:"flex",alignItems:"center",gap:5,padding:"6px 12px",borderRadius:20,border:`1px solid ${G.accent}55`,background:G.accentL,color:G.accent,fontSize:11,fontWeight:700,cursor:"pointer"}}>
                <Ic d={ICON.divide} size={12} color={G.accent}/> Dividir
              </button>}
            </div>
          </div>
        );})}
      </div>);
    })}

    {/* Sheet adicionar por código */}
    <Sheet open={sheetAdd==="codigo"} onClose={()=>{setSheetAdd(false);setErro("");}} title="Adicionar por Código">
      <div style={{display:"flex",flexDirection:"column",gap:14}}>
        <div style={{fontSize:13,color:G.muted,lineHeight:1.6}}>
          Digite o código da pessoa que quer adicionar. Vocês dois aparecem na lista um do outro automaticamente.
        </div>
        <div><Lbl>Código de convite</Lbl>
          <input value={codInput} onChange={e=>setCodInput(e.target.value.toUpperCase())}
            placeholder="Ex: X4K9BZ" className="inp" style={{letterSpacing:4,fontSize:20,textAlign:"center",fontWeight:700}} maxLength={6}/>
        </div>
        {erro&&<div style={{fontSize:12,color:G.red,padding:"8px 12px",background:G.red+"15",borderRadius:8}}>{erro}</div>}
        <button onClick={adicionarPorCodigo} disabled={buscando} className="press"
          style={{width:"100%",padding:14,borderRadius:14,border:"none",background:G.accent,color:"#fff",fontSize:15,fontWeight:700,cursor:"pointer",fontFamily:"inherit",opacity:buscando?.6:1}}>
          {buscando?"Buscando...":"Adicionar contato"}
        </button>
      </div>
    </Sheet>

    {/* Sheet editar contato */}
    <Sheet open={!!editando} onClose={()=>setEditando(null)} title="Editar Contato">
      <div style={{display:"flex",flexDirection:"column",gap:14}}>
        <div><Lbl>Nome</Lbl><input value={formEdit.nome} onChange={e=>setFormEdit(f=>({...f,nome:e.target.value}))} className="inp" placeholder="Nome completo"/></div>
        <div><Lbl opt>Apelido</Lbl><input value={formEdit.apelido} onChange={e=>setFormEdit(f=>({...f,apelido:e.target.value}))} className="inp" placeholder="Como você chama essa pessoa"/></div>
        <div><Lbl>Categoria</Lbl>
          <div style={{display:"flex",flexWrap:"wrap",gap:8,marginTop:4}}>
            {["Família","Amigos","Trabalho","Casal","Outros"].map(cat=>{
              const sel=formEdit.categoria===cat;
              return(<button key={cat} onClick={()=>setFormEdit(f=>({...f,categoria:cat}))} className="press"
                style={{padding:"7px 14px",borderRadius:20,border:"1px solid "+(sel?catColors[cat]+"88":G.border),
                  background:sel?(catColors[cat]||G.accent)+"22":G.card2,color:sel?catColors[cat]||G.accent:G.muted,
                  fontSize:13,fontWeight:sel?700:500,cursor:"pointer",fontFamily:"inherit"}}>
                {cat}
              </button>);
            })}
          </div>
        </div>
        <div><Lbl opt>Notas</Lbl><input value={formEdit.notas} onChange={e=>setFormEdit(f=>({...f,notas:e.target.value}))} className="inp" placeholder="Ex: Divide a Netflix, mora em SP..."/></div>
        <button onClick={salvarEdicao} className="press"
          style={{width:"100%",padding:14,borderRadius:14,border:"none",background:G.accent,color:"#fff",fontSize:15,fontWeight:700,cursor:"pointer",fontFamily:"inherit"}}>
          Salvar
        </button>
        <button onClick={()=>{deletarContato(editando.id);setEditando(null);}} className="press"
          style={{width:"100%",padding:12,borderRadius:14,border:"1px solid "+G.red+"44",background:G.red+"15",color:G.red,fontSize:14,fontWeight:600,cursor:"pointer",fontFamily:"inherit"}}>
          Remover contato
        </button>
      </div>
    </Sheet>
  </div>);
}

export { ContatosView };
