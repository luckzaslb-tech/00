import { curMes } from "./utils.js";


function gerarRecorrentesDoMes(recorrentes, lancs) {
  const hoje=new Date(),mes=curMes(),novos=[];
  const diaHoje=hoje.getDate();
  for (const rec of recorrentes) {
    if (!rec.ativo) continue;
    const dim=new Date(hoje.getFullYear(),hoje.getMonth()+1,0).getDate();
    if (rec.freq==="mensal"||rec.freq==="quinzenal") {
      const dia=Math.min(rec.dia||1,dim);
      // Só lança se hoje já chegou na data definida
      if (diaHoje>=dia) {
        const dt=`${mes}-${String(dia).padStart(2,"0")}`;
        if (!lancs.some(l=>l.recId===rec.id&&l.data===dt))
          novos.push({recId:rec.id,tipo:rec.tipo,desc:rec.desc,cat:rec.cat,forma:rec.forma,valor:rec.valor,data:dt,auto:true});
      }
      if (rec.freq==="quinzenal") {
        const dia2=Math.min((rec.dia||1)+15,dim);
        if (diaHoje>=dia2) {
          const dt2=`${mes}-${String(dia2).padStart(2,"0")}`;
          if (!lancs.some(l=>l.recId===rec.id&&l.data===dt2))
            novos.push({recId:rec.id,tipo:rec.tipo,desc:rec.desc,cat:rec.cat,forma:rec.forma,valor:rec.valor,data:dt2,auto:true});
        }
      }
    }
    // Semanal: gera TODAS as ocorrências do mês até hoje no dia da semana escolhido
    if (rec.freq==="semanal") {
      // diaSemana (0=dom..6=sab) é o campo novo; recorrentes antigas usavam dia%7
      const recDow=rec.diaSemana!=null?rec.diaSemana:(rec.dia||1)%7;
      for(let d=1;d<=diaHoje;d++){
        if(new Date(hoje.getFullYear(),hoje.getMonth(),d).getDay()!==recDow)continue;
        const dt=`${mes}-${String(d).padStart(2,"0")}`;
        if (!lancs.some(l=>l.recId===rec.id&&l.data===dt))
          novos.push({recId:rec.id,tipo:rec.tipo,desc:rec.desc,cat:rec.cat,forma:rec.forma,valor:rec.valor,data:dt,auto:true});
      }
    }
    // Anual: só lança no mês/dia correto
    if (rec.freq==="anual") {
      const mesAnual=rec.mesAnual||String(hoje.getMonth()+1).padStart(2,"0");
      const diaAnual=Math.min(rec.dia||1,dim);
      const anoAtual=hoje.getFullYear();
      if (mes===`${anoAtual}-${mesAnual}` && diaHoje>=diaAnual) {
        const dt=`${mes}-${String(diaAnual).padStart(2,"0")}`;
        if (!lancs.some(l=>l.recId===rec.id&&l.data===dt))
          novos.push({recId:rec.id,tipo:rec.tipo,desc:rec.desc,cat:rec.cat,forma:rec.forma,valor:rec.valor,data:dt,auto:true});
      }
    }
  }
  return novos;
}

export { gerarRecorrentesDoMes };
