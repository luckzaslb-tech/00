import { toISO, getMes, round2 } from "./utils.js";

// Dia de fechamento efetivo do cartão (default: 7 dias antes do vencimento)
const diaFechamento = k => {
  const f = parseInt(k.fechamento);
  if (f >= 1 && f <= 31) return f;
  const v = parseInt(k.vencimento) || 10;
  return Math.max(1, v - 7);
};

// Clampa um "dia" ao último dia do mês (y, mIndex 0-11)
const clampDia = (y, m, dia) => {
  const dim = new Date(y, m + 1, 0).getDate();
  return Math.min(dia, dim);
};

// Janela [inicioISO, fimISO] da fatura ABERTA hoje:
// compras feitas DEPOIS do último fechamento até o próximo fechamento (inclusive).
function faturaAberta(k, hoje = new Date()) {
  const fech = diaFechamento(k);
  const y = hoje.getFullYear(), m = hoje.getMonth(), d = hoje.getDate();
  // próximo fechamento >= hoje
  let fy = y, fm = m;
  if (d > clampDia(y, m, fech)) { fm = m + 1; if (fm > 11) { fm = 0; fy++; } }
  const fim = new Date(fy, fm, clampDia(fy, fm, fech));
  // fechamento anterior
  let py = fy, pm = fm - 1; if (pm < 0) { pm = 11; py--; }
  const inicio = new Date(py, pm, clampDia(py, pm, fech));
  inicio.setDate(inicio.getDate() + 1); // dia seguinte ao fechamento anterior
  return { inicioISO: toISO(inicio), fimISO: toISO(fim), fechamento: fim };
}

// Vencimento como Date do próximo vencimento >= hoje
function proximoVencimento(k, hoje = new Date()) {
  const v = parseInt(k.vencimento) || 10;
  const y = hoje.getFullYear(), m = hoje.getMonth(), d = hoje.getDate();
  let vy = y, vm = m;
  if (d > clampDia(y, m, v)) { vm = m + 1; if (vm > 11) { vm = 0; vy++; } }
  return new Date(vy, vm, clampDia(vy, vm, v));
}

const diasAte = dt => Math.ceil((dt - new Date(new Date().toDateString())) / 86400000);

// Lançamentos (despesa) vinculados a este cartão — cartaoId atual, cartao legado
const lancsDoCartao = (lancs, k) =>
  lancs.filter(l => l.tipo === "Despesa" && (l.cartaoId === k.id || l.cartao === k.id || l.cartao === k.nome));

// Total da fatura aberta
function totalFaturaAberta(lancs, k, hoje = new Date()) {
  const { inicioISO, fimISO } = faturaAberta(k, hoje);
  return round2(lancsDoCartao(lancs, k)
    .filter(l => l.data >= inicioISO && l.data <= fimISO)
    .reduce((s, l) => s + l.valor, 0));
}

// Histórico das últimas N competências (mês do fechamento) desse cartão
function historicoFaturas(lancs, k, n = 4) {
  const doCartao = lancsDoCartao(lancs, k);
  const porMes = {};
  for (const l of doCartao) {
    const mes = getMes(l.data);
    porMes[mes] = round2((porMes[mes] || 0) + l.valor);
  }
  return Object.entries(porMes)
    .sort((a, b) => b[0].localeCompare(a[0]))
    .slice(0, n)
    .map(([mes, valor]) => ({ mes, valor }));
}

export { diaFechamento, faturaAberta, proximoVencimento, diasAte, lancsDoCartao, totalFaturaAberta, historicoFaturas };
