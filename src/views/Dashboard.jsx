import { useState } from "react";
import { CATS_DEP, CAT_COLORS, MESES } from "../lib/constants.js";
import { curMes, fmt, fmtD, getMes, isRealizado, mesLblFull, pct, prevMes, round2, soPessoais, today } from "../lib/utils.js";
import { G } from "../theme.jsx";
import { ICON, Ic } from "../components/ui.jsx";
import { TxRow } from "../components/TxRow.jsx";

// ─── DASHBOARD ────────────────────────────────────────────────────────────────
function Dashboard({lancs:lancsAll,onDelete,user}){
  const [mes,setMes]=useState(curMes());
  const [hide,setHide]=useState(false);
  const [selCat,setSelCat]=useState(null);

  // Saldo pessoal: lançamentos do modo casal ficam de fora (têm tela própria)
  const lancs=soPessoais(lancsAll);
  const md=[...new Set(lancs.map(l=>getMes(l.data)))].sort().reverse().slice(0,6);
  if(!md.includes(curMes()))md.unshift(curMes());
  const dm=lancs.filter(l=>getMes(l.data)===mes&&isRealizado(l.data,l.agendado));
  const tR=round2(dm.filter(l=>l.tipo==="Receita").reduce((s,l)=>s+l.valor,0));
  const tD=round2(dm.filter(l=>l.tipo==="Despesa").reduce((s,l)=>s+l.valor,0));
  const sal=round2(tR-tD), pct=tR>0?Math.round(sal/tR*100):0;

  // últimos 6 meses para sparkline
  const spark=md.slice().sort().map(m=>{
    const d=lancs.filter(l=>getMes(l.data)===m&&isRealizado(l.data,l.agendado));
    const r=d.filter(l=>l.tipo==="Receita").reduce((s,l)=>s+l.valor,0);
    const dep=d.filter(l=>l.tipo==="Despesa").reduce((s,l)=>s+l.valor,0);
    return{m,sal:round2(r-dep),dep:round2(dep),rec:round2(r)};
  });

  const cats=CATS_DEP
    .map(c=>({name:c,v:dm.filter(l=>l.tipo==="Despesa"&&l.cat===c).reduce((s,l)=>s+l.valor,0),color:CAT_COLORS[c]||"#94A3B8"}))
    .filter(c=>c.v>0).sort((a,b)=>b.v-a.v);

  const agendados=lancs.filter(l=>l.agendado&&l.data>today()).sort((a,b)=>a.data.localeCompare(b.data)).slice(0,3);

  // donut arc helper
  function arc(pct,r=38){
    const circ=2*Math.PI*r;
    return{dasharray:`${circ*pct} ${circ*(1-pct)}`,dashoffset:circ*0.25};
  }

  const top3=cats.slice(0,3);
  const outV=cats.slice(3).reduce((s,c)=>s+c.v,0);
  const donut=[...top3,...(outV>0?[{name:"Outros",v:outV,color:"#475569"}]:[])];
  const total_donut=donut.reduce((s,d)=>s+d.v,0);

  // semanais
  const [y,mN]=mes.split("-").map(Number);
  const dim=new Date(y,mN,0).getDate();
  const weeks=Array.from({length:5},(_,i)=>{
    const s=i*7+1,e=Math.min((i+1)*7,dim);
    if(s>dim)return null;
    const v=dm.filter(l=>l.tipo==="Despesa"&&l.data).filter(l=>{const d=parseInt(l.data.slice(8,10));return d>=s&&d<=e;}).reduce((a,l)=>a+l.valor,0);
    return{name:`S${i+1}`,v,s,e};
  }).filter(Boolean);
  const maxW=Math.max(...weeks.map(w=>w.v),1);

  const [hovWeek,setHovWeek]=useState(null);
  const hv=v=>hide?"•••":v;

  // compara com o mês-calendário anterior de verdade (não o último mês com dados)
  const prevM=prevMes(mes);
  const prevLancs=lancs.filter(l=>getMes(l.data)===prevM&&isRealizado(l.data,l.agendado));
  const prevSal=prevLancs.length?round2(prevLancs.filter(l=>l.tipo==="Receita").reduce((s,l)=>s+l.valor,0)-prevLancs.filter(l=>l.tipo==="Despesa").reduce((s,l)=>s+l.valor,0)):null;
  const diff=prevSal!==null?round2(sal-prevSal):null;

  return(
  <div style={{paddingBottom:32}}>

    {/* ════ HERO CARD — superfície limpa, segue o tema ═══════════ */}
    <div style={{
      margin:"0 0 20px",
      borderRadius:20,
      padding:"24px 20px 20px",
      background:G.card,
      border:`1px solid ${G.border}`,
    }}>
      {/* top row: greeting + hide */}
      <div style={{display:"flex",alignItems:"center",justifyContent:"space-between",marginBottom:18}}>
        <div>
          <div style={{fontSize:11,fontWeight:600,letterSpacing:1.2,textTransform:"uppercase",color:G.muted,marginBottom:2}}>Olá,</div>
          <div style={{fontSize:19,fontWeight:700,color:G.text,lineHeight:1.1}}>
            {(user?.displayName||user?.email||"").split(" ")[0]||"bem-vindo"}
          </div>
        </div>
        <button onClick={()=>setHide(h=>!h)} className="press" style={{background:G.card2,border:`1px solid ${G.border}`,borderRadius:20,padding:"6px 12px",cursor:"pointer",fontSize:11,fontWeight:600,color:G.muted,flexShrink:0,marginLeft:8,display:"flex",alignItems:"center",gap:5}}>
          <Ic d={ICON.eye} size={13} color={G.muted}/>{hide?"Ver":"Ocultar"}
        </button>
      </div>

      {/* saldo grande */}
      <div style={{marginBottom:4}}>
        <div style={{fontSize:10,fontWeight:600,letterSpacing:1.6,textTransform:"uppercase",color:G.muted,marginBottom:6}}>Saldo do mês</div>
        <div className="num" style={{fontSize:40,fontWeight:800,letterSpacing:-1.5,lineHeight:1,
          color:hide?"transparent":sal>=0?G.green:G.red,
          filter:hide?"blur(12px)":"none",transition:"filter .3s,color .3s",userSelect:hide?"none":"auto"}}>
          {fmt(sal)}
        </div>
        {diff!==null&&!hide&&<div style={{fontSize:12,fontWeight:500,color:diff>=0?G.green:G.red,marginTop:6,display:"flex",alignItems:"center",gap:4}}>
          <Ic d={diff>=0?ICON.arrow_up:ICON.arrow_down} size={11} color={diff>=0?G.green:G.red}/>
          {diff>=0?"+":""}{fmt(diff)} vs mês anterior
        </div>}
      </div>

      {/* sparkline SVG — últimos meses */}
      {spark.length>1&&<div style={{height:52,margin:"16px 0 14px",position:"relative"}}>
        {(()=>{
          const vals=spark.map(s=>s.sal);
          const min=Math.min(...vals),max=Math.max(...vals);
          const range=max-min||1;
          const W=320,H=48;
          const pts=vals.map((v,i)=>`${(i/(vals.length-1))*W},${H-((v-min)/range)*H*0.85-4}`).join(" ");
          const fillPts=`0,${H} ${pts} ${W},${H}`;
          const lineColor=sal>=0?G.green:G.red;
          return(
            <svg viewBox={`0 0 ${W} ${H}`} preserveAspectRatio="none" style={{width:"100%",height:"100%"}}>
              <defs>
                <linearGradient id="sg" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor={lineColor} stopOpacity=".18"/>
                  <stop offset="100%" stopColor={lineColor} stopOpacity="0"/>
                </linearGradient>
              </defs>
              <polygon points={fillPts} fill="url(#sg)"/>
              <polyline points={pts} fill="none" stroke={lineColor} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
              {vals.map((v,i)=>{
                const cx=(i/(vals.length-1))*W,cy=H-((v-min)/range)*H*0.85-4;
                return i===vals.length-1?<circle key={i} cx={cx} cy={cy} r={4} fill={lineColor} opacity={.9}/>:null;
              })}
            </svg>
          );
        })()}
        <div style={{position:"absolute",bottom:-2,left:0,right:0,display:"flex",justifyContent:"space-between"}}>
          {spark.map((s,i)=><span key={i} style={{fontSize:9,color:G.muted}}>{MESES[parseInt(s.m.split("-")[1])-1]}</span>)}
        </div>
      </div>}

      {/* 3 chips */}
      <div style={{display:"grid",gridTemplateColumns:"1fr 1fr 1fr",gap:8,marginTop:4}}>
        {[
          {l:"Receitas",v:"+"+fmt(tR),c:G.green,bg:G.greenL},
          {l:"Despesas",v:"-"+fmt(tD),c:G.red,bg:G.redL},
          {l:"Poupança",v:pct+"%",c:G.text,bg:G.card2},
        ].map((k,i)=>(
          <div key={i} style={{background:k.bg,borderRadius:12,padding:"10px 10px 8px"}}>
            <div style={{fontSize:9,color:G.muted,marginBottom:4,fontWeight:600,letterSpacing:.8,textTransform:"uppercase"}}>{k.l}</div>
            <div className="num" style={{fontSize:12,fontWeight:700,color:hide?G.muted:k.c,filter:hide?"blur(5px)":"none",transition:"filter .3s",lineHeight:1.2}}>{hide?"•••":k.v}</div>
          </div>
        ))}
      </div>
    </div>

    {/* mes pills */}
    <div style={{display:"flex",gap:6,overflowX:"auto",scrollbarWidth:"none",padding:"4px 0 8px"}}>
      {md.map(m=>{
        const [my,mm]=m.split("-");
        const lbl=MESES[parseInt(mm)-1]+" '"+my.slice(2);
        const on=m===mes;
        return(<button key={m} onClick={()=>setMes(m)} className="press"
          style={{padding:"5px 14px",borderRadius:20,
            border:`1px solid ${on?G.accent:G.border}`,
            background:on?G.accentL:"transparent",
            color:on?G.accent:G.muted,
            fontSize:12,fontWeight:on?700:400,cursor:"pointer",flexShrink:0,whiteSpace:"nowrap",transition:"all .2s"}}>
          {lbl}
        </button>);
      })}
    </div>


    {/* ════ GRÁFICO SEMANAL ══════════════════════════ */}
    <div style={{background:G.card,border:`1px solid ${G.border}`,borderRadius:16,padding:"18px 16px",marginBottom:16}}>
      <div style={{display:"flex",alignItems:"flex-start",justifyContent:"space-between",marginBottom:20}}>
        <div>
          <div style={{fontSize:11,fontWeight:700,letterSpacing:1.2,textTransform:"uppercase",color:G.muted}}>Gastos por semana</div>
          {hovWeek
            ?<div style={{marginTop:4}}><span style={{fontVariantNumeric:"tabular-nums",fontSize:18,fontWeight:700,color:G.red}}>{fmt(hovWeek.v)}</span><span style={{fontSize:11,color:G.muted,marginLeft:6}}>{hovWeek.name} · dia {hovWeek.s}–{hovWeek.e}</span></div>
            :<div style={{fontVariantNumeric:"tabular-nums",fontSize:18,fontWeight:700,color:G.text,marginTop:4}}>{hv(fmt(weeks.reduce((s,w)=>s+w.v,0)))}</div>
          }
        </div>
        <div style={{fontSize:11,color:G.muted,marginTop:2}}>{mesLblFull(mes)}</div>
      </div>

      {/* barras customizadas */}
      {weeks.length>0&&weeks.some(w=>w.v>0)
        ?<div style={{display:"flex",alignItems:"flex-end",gap:8,height:96,padding:"0 4px"}}>
          {weeks.map((w,i)=>{
            const h=Math.max((w.v/maxW)*80,w.v>0?6:0);
            const hov=hovWeek?.name===w.name;
            return(
              <div key={i} style={{flex:1,display:"flex",flexDirection:"column",alignItems:"center",cursor:"pointer",gap:4}}
                onMouseEnter={()=>setHovWeek(w)} onMouseLeave={()=>setHovWeek(null)}
                onClick={()=>setHovWeek(v=>v?.name===w.name?null:w)}>
                <div style={{fontSize:9,color:hov?G.red:"transparent",fontWeight:700,transition:"color .15s",textAlign:"center"}}>{fmt(w.v).replace("R$ ","")}</div>
                <div style={{width:"100%",display:"flex",flexDirection:"column",justifyContent:"flex-end",flex:1,position:"relative"}}>
                  <div style={{
                    width:"100%",height:Math.max(h,2),borderRadius:"6px 6px 2px 2px",
                    background:hov?G.red:w.v>0?G.red+"77":G.border,
                    transition:"all .2s",
                  }}/>
                </div>
                <div style={{fontSize:10,color:hov?G.text:G.muted,fontWeight:hov?700:400,transition:"color .15s"}}>{w.name}</div>
              </div>
            );
          })}
        </div>
        :<div style={{textAlign:"center",color:G.muted,fontSize:13,padding:"28px 0"}}>Sem despesas este mês</div>
      }
    </div>

    {/* ════ DONUT + TOP CATS ═════════════════════════ */}
    {cats.length>0&&<div style={{background:G.card,border:`1px solid ${G.border}`,borderRadius:16,padding:"18px 16px",marginBottom:16}}>
      <div style={{fontSize:11,fontWeight:700,letterSpacing:1.2,textTransform:"uppercase",color:G.muted,marginBottom:16}}>Onde foi o dinheiro</div>
      <div style={{display:"flex",alignItems:"center",gap:20}}>

        {/* SVG Donut */}
        <div style={{position:"relative",flexShrink:0,width:100,height:100}}>
          <svg viewBox="0 0 96 96" style={{width:100,height:100,transform:"rotate(-90deg)"}}>
            {(()=>{
              let offset=0;
              const r=36,circ=2*Math.PI*r;
              return donut.map((d,i)=>{
                const p=total_donut>0?d.v/total_donut:0;
                const dash=circ*p;
                const el=<circle key={i} cx="48" cy="48" r={r}
                  fill="none" stroke={d.color} strokeWidth={selCat&&selCat!==d.name?8:10}
                  strokeDasharray={`${dash} ${circ-dash}`}
                  strokeDashoffset={-circ*offset}
                  opacity={selCat&&selCat!==d.name?.4:1}
                  style={{cursor:"pointer",transition:"all .25s"}}
                  onClick={()=>setSelCat(s=>s===d.name?null:d.name)}/>;
                offset+=p;
                return el;
              });
            })()}
            <circle cx="48" cy="48" r="26" fill={G.card}/>
          </svg>
          {/* centro */}
          <div style={{position:"absolute",inset:0,display:"flex",flexDirection:"column",alignItems:"center",justifyContent:"center",pointerEvents:"none"}}>
            {selCat
              ?<><div style={{fontSize:9,color:G.muted,textAlign:"center",lineHeight:1.2,maxWidth:48}}>{selCat}</div>
                <div style={{fontVariantNumeric:"tabular-nums",fontSize:12,fontWeight:700,color:cats.find(c=>c.name===selCat)?.color||G.accent}}>
                  {hide?"•":fmt(cats.find(c=>c.name===selCat)?.v||0).replace("R$ ","R$")}
                </div></>
              :<><div style={{fontSize:9,color:G.muted}}>Total</div>
                <div style={{fontVariantNumeric:"tabular-nums",fontSize:11,fontWeight:700,color:G.text}}>{hide?"•••":fmt(tD).replace("R$ ","R$")}</div></>
            }
          </div>
        </div>

        {/* lista cats */}
        <div style={{flex:1,display:"flex",flexDirection:"column",gap:6}}>
          {cats.slice(0,5).map(cat=>{
            const p=tD>0?cat.v/tD*100:0;
            const sel=selCat===cat.name;
            return(
              <div key={cat.name} onClick={()=>setSelCat(s=>s===cat.name?null:cat.name)}
                style={{cursor:"pointer",opacity:selCat&&!sel?.4:1,transition:"opacity .2s"}}>
                <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:3}}>
                  <div style={{display:"flex",alignItems:"center",gap:6}}>
                    <div style={{width:6,height:6,borderRadius:"50%",background:cat.color,flexShrink:0}}/>
                    <span style={{fontSize:12,color:G.text,fontWeight:sel?700:400}}>{cat.name}</span>
                  </div>
                  <span style={{fontVariantNumeric:"tabular-nums",fontSize:11,fontWeight:700,color:sel?cat.color:G.muted}}>{hide?"•••":fmt(cat.v)}</span>
                </div>
                <div style={{height:3,background:G.border,borderRadius:3,overflow:"hidden"}}>
                  <div style={{height:"100%",width:`${p}%`,background:cat.color,borderRadius:3,opacity:sel?1:.6,transition:"width .35s ease"}}/>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>}

    {/* ════ AGENDADOS ════════════════════════════════ */}
    {agendados.length>0&&<div style={{background:G.yellow+"12",border:`1px solid ${G.yellow}33`,borderRadius:24,padding:"16px",marginBottom:16}}>
      <div style={{display:"flex",alignItems:"center",gap:6,marginBottom:12}}>
        <Ic d={ICON.clock} size={12} color={G.yellow}/>
        <span style={{fontSize:11,fontWeight:700,letterSpacing:1.2,textTransform:"uppercase",color:G.yellow}}>Próximos</span>
      </div>
      {agendados.map(l=>{const isR=l.tipo==="Receita";return(
        <div key={l.id} style={{display:"flex",alignItems:"center",gap:12,padding:"8px 0",borderBottom:`1px solid ${G.yellow}18`}}>
          <div style={{width:30,height:30,borderRadius:10,background:(isR?G.green:G.red)+"22",display:"flex",alignItems:"center",justifyContent:"center",flexShrink:0}}>
            <Ic d={isR?ICON.arrow_up:ICON.arrow_down} size={14} color={isR?G.green:G.red}/>
          </div>
          <div style={{flex:1}}>
            <div style={{fontSize:13,fontWeight:500,color:G.text}}>{l.desc||l.cat}</div>
            <div style={{fontSize:10,color:G.muted}}>{fmtD(l.data)}</div>
          </div>
          <div style={{fontVariantNumeric:"tabular-nums",fontSize:13,fontWeight:700,color:isR?G.green:G.red}}>{hv((isR?"+":"-")+fmt(l.valor))}</div>
        </div>
      );})}
    </div>}

    {/* ════ ÚLTIMOS LANÇAMENTOS ══════════════════════ */}
    <div style={{background:G.card,border:`1px solid ${G.border}`,borderRadius:16,padding:"18px 16px"}}>
      <div style={{fontSize:11,fontWeight:700,letterSpacing:1.2,textTransform:"uppercase",color:G.muted,marginBottom:14}}>Últimos lançamentos</div>
      {dm.length===0
        ?<div style={{textAlign:"center",color:G.muted,padding:"24px 0",fontSize:13}}>Nenhum lançamento neste mês</div>
        :[...dm].sort((a,b)=>b.data.localeCompare(a.data)).slice(0,8).map(l=><TxRow key={l.id} l={l} onDelete={onDelete}/>)
      }
    </div>

  </div>);
}
export { Dashboard };
