import { useState, useEffect, useCallback, useRef } from "react";
import { auth, db, googleProvider, appleProvider } from "./firebase.js";
import {
  signInWithPopup, signOut, onAuthStateChanged,
  createUserWithEmailAndPassword, signInWithEmailAndPassword, updateProfile
} from "firebase/auth";
import { collection, doc, addDoc, deleteDoc, updateDoc, getDocs, onSnapshot } from "firebase/firestore";
import { G, NH, HH, getCSS, setThemeVar } from "./theme.jsx";
import { CATS_REC, CATS_DEP, FORMAS_REC, FORMAS_DEP } from "./lib/constants.js";
import { today, round2 } from "./lib/utils.js";
import { gerarRecorrentesDoMes } from "./lib/recorrentes.js";
import { usePlano } from "./lib/usePlano.js";
import { Spinner } from "./components/ui.jsx";
import { ErrorBoundary } from "./components/ErrorBoundary.jsx";
import { Sheet } from "./components/Sheet.jsx";
import { Nav } from "./components/Nav.jsx";
import { Drawer } from "./components/Drawer.jsx";
import { Head } from "./components/Head.jsx";
import { LancForm } from "./components/LancForm.jsx";
import { Dashboard } from "./views/Dashboard.jsx";
import { TransacoesView } from "./views/Transacoes.jsx";
import { FinancasView } from "./views/Financas.jsx";
import { ChatView } from "./views/Chat.jsx";
import { ImportarView } from "./views/Importar.jsx";
import { CartoesView } from "./views/Cartoes.jsx";
import { UpgradeView } from "./views/Upgrade.jsx";
import { LoginScreen } from "./views/Login.jsx";
import { ContatosView } from "./views/Contatos.jsx";
import { CasalView } from "./views/Casal.jsx";
import { DivisoesView } from "./views/Divisoes.jsx";

// ─── APP ROOT ─────────────────────────────────────────────────────────────────
export default function App(){
  const [user,setUser]=useState(null);
  const [authLoading,setAuthLoading]=useState(true);
  const [loginLoading,setLoginLoading]=useState("");
  const [loginError,setLoginError]=useState("");
  const {plano,isPremium,loadingPlano,forceSetPlano}=usePlano(user?.uid||null);
  const [lancs,setLancs]=useState([]);
  const [lancsLoaded,setLancsLoaded]=useState(false);
  const [recorrentes,setRecorrentes]=useState([]);
  const [dataLoading,setDataLoading]=useState(false);
  const [view,setView]=useState("dashboard");
  const [drawerOpen,setDrawerOpen]=useState(false);
  const [searchOpen,setSearchOpen]=useState(false);
  const [divPreselect,setDivPreselect]=useState(null); // contato p/ pré-selecionar ao criar divisão
  const [cartoesList,setCartoesList]=useState([]);
  const [orcamentosList,setOrcamentosList]=useState([]);
  const [divPendCount,setDivPendCount]=useState(0);
  const [modal,setModal]=useState(false);
  const [tipo,setTipo]=useState("Despesa");
  const [form,setForm]=useState({data:today(),desc:"",cat:CATS_DEP[0],forma:FORMAS_DEP[0],valor:"",recorrente:false,freq:"mensal",dia:1});
  const [toast,setToast]=useState(null);
  const [theme,setTheme]=useState(()=>localStorage.getItem("fin_theme")||"dark");
  setThemeVar(theme);
  const CSS=getCSS(theme);
  function toggleTheme(){const t=theme==="dark"?"light":"dark";setThemeVar(t);setTheme(t);localStorage.setItem("fin_theme",t);}
  const tRef=useRef();


  useEffect(()=>{ return onAuthStateChanged(auth,u=>{setUser(u);setAuthLoading(false);}); },[]);

  useEffect(()=>{
    if(!user){setLancs([]);setLancsLoaded(false);setRecorrentes([]);return;}
    setDataLoading(true);
    const uid=user.uid;
    const unsubL=onSnapshot(collection(db,"users",uid,"lancamentos"),snap=>{setLancs(snap.docs.map(d=>({id:d.id,...d.data()})));setLancsLoaded(true);setDataLoading(false);});
    const unsubR=onSnapshot(collection(db,"users",uid,"recorrentes"),snap=>{setRecorrentes(snap.docs.map(d=>({id:d.id,...d.data()})));});
    const unsubC=onSnapshot(collection(db,"users",uid,"cartoes"),snap=>{setCartoesList(snap.docs.map(d=>({id:d.id,...d.data()})));});
    const unsubO=onSnapshot(collection(db,"users",uid,"orcamentos"),snap=>{setOrcamentosList(snap.docs.map(d=>({id:d.id,...d.data()})));});
    const unsubDP=onSnapshot(collection(db,"inbox",uid,"divisoes_pendentes"),s=>{setDivPendCount(s.size);});
    return()=>{unsubL();unsubR();unsubC();unsubO();unsubDP();};
  },[user]);

  // Guarda contra dupla gravação: chaves recId+data já geradas nesta sessão
  const geradosRef=useRef(new Set());
  useEffect(()=>{
    // Só gera depois que os lançamentos chegaram do servidor (senão duplica os já existentes)
    if(!user||!lancsLoaded||recorrentes.length===0)return;
    const novos=gerarRecorrentesDoMes(recorrentes,lancs)
      .filter(n=>!geradosRef.current.has(n.recId+n.data));
    novos.forEach(n=>{
      geradosRef.current.add(n.recId+n.data);
      addDoc(collection(db,"users",user.uid,"lancamentos"),n).catch(()=>{});
    });
  },[recorrentes,user,lancsLoaded,lancs]);

  const showT=useCallback((msg,type="success")=>{setToast({msg,type});clearTimeout(tRef.current);tRef.current=setTimeout(()=>setToast(null),2400);},[]);

  function openModal(t){setTipo(t);setForm({data:today(),desc:"",cat:t==="Receita"?CATS_REC[0]:CATS_DEP[0],forma:t==="Receita"?FORMAS_REC[0]:FORMAS_DEP[0],valor:"",modo:"normal",freq:"mensal",dia:1,cartaoId:""});setModal(true);}

  async function salvar(){
    const v=parseFloat(form.valor);
    if(!form.data||!v||v<=0){showT("Informe o valor e a data.","error");return;}
    const modo=form.modo||"normal";
    const cat=tipo==="Despesa"&&form.forma==="Cartão Crédito"?"Cartão de Crédito":form.cat;
    const base={tipo,desc:form.desc,cat,forma:form.forma,...(form.cartaoId?{cartaoId:form.cartaoId}:{})};
    const parcelas=tipo==="Despesa"&&form.forma==="Cartão Crédito"&&modo==="normal"?(form.parcelas||1):1;

    if(parcelas>1){
      // Parcela: uma por mês, mesma diária; centavos residuais na 1ª parcela
      const valParc=Math.floor(v/parcelas*100)/100;
      const primeira=round2(v-valParc*(parcelas-1));
      const grupo=Date.now().toString(36)+Math.random().toString(36).slice(2,6);
      const [y,mo,d]=form.data.split("-").map(Number);
      for(let i=0;i<parcelas;i++){
        const dt=new Date(y,mo-1+i,1);
        const dim=new Date(dt.getFullYear(),dt.getMonth()+1,0).getDate();
        const dataP=`${dt.getFullYear()}-${String(dt.getMonth()+1).padStart(2,"0")}-${String(Math.min(d,dim)).padStart(2,"0")}`;
        await addDoc(collection(db,"users",user.uid,"lancamentos"),{
          ...base,desc:`${form.desc||cat} (${i+1}/${parcelas})`,
          valor:i===0?primeira:valParc,data:dataP,agendado:false,
          parcelaGrupo:grupo,parcelaN:i+1,parcelaTotal:parcelas,
        });
      }
      showT(`Compra parcelada em ${parcelas}x!`);setModal(false);return;
    }

    // Agendado: salva com flag agendado=true — não entra no saldo até a data
    await addDoc(collection(db,"users",user.uid,"lancamentos"),{...base,valor:v,data:form.data,agendado:modo==="agendado"});
    if(modo==="recorrente")await addDoc(collection(db,"users",user.uid,"recorrentes"),{tipo,desc:form.desc,cat:form.cat,forma:form.forma,valor:v,freq:form.freq,dia:form.dia,...(form.freq==="semanal"?{diaSemana:form.diaSemana??1}:{}),ativo:true});
    const label=modo==="recorrente"?" ↻":modo==="agendado"?" ":"";
    showT(`${tipo} adicionada!${label}`);setModal(false);
  }
  async function deletar(id){await deleteDoc(doc(db,"users",user.uid,"lancamentos",id));showT("Removido.","error");}
  async function toggleRec(id){const r=recorrentes.find(r=>r.id===id);if(r)await updateDoc(doc(db,"users",user.uid,"recorrentes",id),{ativo:!r.ativo});}
  async function deleteRec(id){
    await deleteDoc(doc(db,"users",user.uid,"recorrentes",id));
    const snap=await getDocs(collection(db,"users",user.uid,"lancamentos"));
    snap.docs.filter(d=>d.data().recId===id).forEach(d=>deleteDoc(d.ref));
    showT("Recorrente removido.","error");
  }

  async function handleGoogle(){setLoginLoading("google");setLoginError("");try{await signInWithPopup(auth,googleProvider);}catch(e){setLoginError("Erro ao entrar com Google.");}setLoginLoading("");}
  async function handleApple(){setLoginLoading("apple");setLoginError("");try{await signInWithPopup(auth,appleProvider);}catch(e){setLoginError("Erro ao entrar com Apple. Verifique se está configurado no Firebase.");}setLoginLoading("");}
  async function handleEmail(email,senha,nome){
    setLoginLoading("email");setLoginError("");
    try{
      if(nome){// cadastro: nome é string não-vazia
        const cred=await createUserWithEmailAndPassword(auth,email,senha);
        await updateProfile(cred.user,{displayName:nome});
      }else if(nome===""){// login: nome é string vazia
        await signInWithEmailAndPassword(auth,email,senha);
      }else{// fallback null/undefined → login
        await signInWithEmailAndPassword(auth,email,senha);
      }
    }catch(e){
      const msgs={
        "auth/email-already-in-use":"Email já cadastrado.",
        "auth/weak-password":"Senha muito fraca (mín. 6 caracteres).",
        "auth/invalid-email":"Email inválido.",
        "auth/invalid-credential":"Email ou senha incorretos.",
        "auth/user-not-found":"Usuário não encontrado.",
      };
      setLoginError(msgs[e.code]||"Erro ao entrar. Tente novamente.");
    }
    setLoginLoading("");
  }
  async function handleLogout(){if(window.confirm("Sair da conta?"))await signOut(auth);}

  // O <style> global precisa existir também nos returns antecipados (login/loaders)
  const Loader=(
    <><style>{CSS}</style>
    <div style={{display:"flex",flexDirection:"column",alignItems:"center",justifyContent:"center",height:"100vh",background:G.bg}}><Spinner size={32}/></div></>
  );
  if(authLoading)return Loader;
  if(!user)return(<><style>{CSS}</style><LoginScreen onGoogle={handleGoogle} onApple={handleApple} onEmail={handleEmail} loading={loginLoading} error={loginError}/></>);
  if(loadingPlano)return Loader;

  return(<>
    <style>{CSS}</style>
    <div style={{display:"flex",flexDirection:"column",height:"100vh",background:G.bg}}>
      <Head view={view} onRec={()=>openModal("Receita")} onDep={()=>openModal("Despesa")} user={user} onSearch={()=>setView("transacoes")} onDrawer={()=>setDrawerOpen(true)} divPendCount={divPendCount}/>
      
      {dataLoading?(
        <div style={{flex:1,display:"flex",alignItems:"center",justifyContent:"center",marginTop:HH,marginBottom:NH}}><Spinner size={28}/></div>
      ):view==="chat"?(
        <div style={{position:"fixed",top:HH,left:0,right:0,bottom:NH,display:"flex",flexDirection:"column"}}>
          <ChatView lancs={lancs} uid={user.uid} cartoes={cartoesList} orcamentos={orcamentosList} isPremium={isPremium} onUpgrade={()=>setView("planos")} onAddLanc={l=>{addDoc(collection(db,"users",user.uid,"lancamentos"),l);showT("Salvo! ✓");}}/>
        </div>
      ):(
        <ErrorBoundary key={view}><main style={{position:"fixed",top:HH,left:0,right:0,bottom:`calc(${NH}px + env(safe-area-inset-bottom, 0px))`,overflowY:"auto",overflowX:"hidden",padding:"16px 14px",WebkitOverflowScrolling:"touch",overscrollBehavior:"contain",animation:"fadeUp .2s ease both",maxWidth:"100vw",boxSizing:"border-box"}}>
          {/* ── VIEWS GRATUITAS ── */}
          {view==="dashboard"&&<Dashboard lancs={lancs} onDelete={deletar} user={user} onNovaDespesa={()=>openModal("Despesa")} onNovaReceita={()=>openModal("Receita")} onIrCartoes={()=>setView("cartoes")} onIrRelatorio={()=>setView("financas-relatorio")}/>}
          {view==="transacoes"&&<TransacoesView lancs={lancs} recorrentes={recorrentes} onDelete={deletar} onToggleRec={toggleRec} onDeleteRec={deleteRec} isPremium={isPremium} onUpgrade={()=>setView("planos")}/>}
          {view==="planos"&&<UpgradeView uid={user.uid} plano={plano} onActivate={p=>{forceSetPlano(p);}}/>}
          {view==="importar"&&<ImportarView uid={user.uid} lancs={lancs} showT={showT}/>}

          {/* ── VIEWS PREMIUM ── */}
          {view==="cartoes"&&(isPremium
            ?<CartoesView uid={user.uid} lancs={lancs}/>
            :<UpgradeView uid={user.uid} plano={plano} destaque="cartoes" onActivate={p=>{forceSetPlano(p);}}/>)}
          {view==="contatos"&&(isPremium
            ?<ContatosView uid={user.uid} user={user} onVoltar={()=>setView("compartilhados-divisoes")} onNovaDivisao={nome=>{setDivPreselect(nome);setView("compartilhados-divisoes");}}/>
            :<UpgradeView uid={user.uid} plano={plano} destaque="contatos" onActivate={p=>{forceSetPlano(p);}}/>)}
          {view==="compartilhados-casal"&&(isPremium
            ?<CasalView uid={user.uid} lancs={lancs} user={user}/>
            :<UpgradeView uid={user.uid} plano={plano} destaque="casal" onActivate={p=>{forceSetPlano(p);}}/>)}
          {view==="compartilhados-divisoes"&&(isPremium
            ?<DivisoesView uid={user.uid} onContatos={()=>setView("contatos")} preselect={divPreselect} onPreselectDone={()=>setDivPreselect(null)}/>
            :<UpgradeView uid={user.uid} plano={plano} destaque="divisoes" onActivate={p=>{forceSetPlano(p);}}/>)}
          {view.startsWith("financas")&&(isPremium
            ?<FinancasView uid={user.uid} lancs={lancs} secao={view==="financas"?"orcamentos":view.replace("financas-","")}/>
            :<UpgradeView uid={user.uid} plano={plano} destaque="financas" onActivate={p=>{forceSetPlano(p);}}/>)}
        </main></ErrorBoundary>
      )}
      <Nav view={view} setView={setView} onMais={()=>setDrawerOpen(true)}/>
      <Drawer open={drawerOpen} onClose={()=>setDrawerOpen(false)} view={view} setView={setView} user={user} divPendCount={divPendCount} onLogout={handleLogout} theme={theme} onToggleTheme={toggleTheme}/>
    </div>
    <Sheet open={modal} onClose={()=>setModal(false)} title="Novo Lançamento">
      <LancForm tipo={tipo} setTipo={setTipo} form={form} setForm={setForm} onSave={salvar} cartoes={cartoesList}/>
    </Sheet>
    {toast&&<div style={{position:"fixed",bottom:NH+12,left:"50%",transform:"translateX(-50%)",background:G.card2,border:`1px solid ${toast.type==="success"?G.green:G.red}55`,borderRadius:20,padding:"10px 18px",fontSize:13,fontWeight:600,zIndex:9999,display:"flex",alignItems:"center",gap:8,animation:"fadeUp .28s ease",boxShadow:"0 6px 24px rgba(0,0,0,.5)",whiteSpace:"nowrap",color:toast.type==="success"?G.green:G.red}}>{toast.type==="success"?"✓":"✕"} {toast.msg}</div>}
  </>);
}
