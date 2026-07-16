import { useState, useEffect } from "react";
import { db } from "../firebase.js";
import { doc, onSnapshot, getDoc } from "firebase/firestore";

// ─── HOOK DE PLANO ────────────────────────────────────────────────────────────
function usePlano(uid){
  const [plano,setPlano]=useState("free");
  const [loadingPlano,setLoadingPlano]=useState(true);
  const [planoOverride,setPlanoOverride]=useState(null);
  useEffect(()=>{
    if(!uid){setLoadingPlano(false);return;}
    const ref=doc(db,"users",uid,"perfil","dados");
    const unsub=onSnapshot(ref,
      snap=>{
        const p=snap.data()?.plano||"free";
        console.log("[usePlano] plano lido:",p,"data:",snap.data());
        setPlano(p);
        setPlanoOverride(null); // clear override, use real value
        setLoadingPlano(false);
      },
      err=>{
        console.error("[usePlano] erro onSnapshot:",err);
        getDoc(ref).then(snap=>{
          const p=snap.data()?.plano||"free";
          setPlano(p);
        }).catch(e=>console.error("[usePlano] fallback falhou:",e))
        .finally(()=>setLoadingPlano(false));
      }
    );
    return()=>unsub();
  },[uid]);
  const effectivePlano=planoOverride||plano;
  return{plano:effectivePlano,loadingPlano,isPremium:effectivePlano==="premium",forceSetPlano:setPlanoOverride};
}


export { usePlano };
