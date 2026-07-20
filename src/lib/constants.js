// ─── CONSTANTS ────────────────────────────────────────────────────────────────
const CATS_REC = ["Salário","Freelance","Investimentos","Aluguel Recebido","Bônus","Reembolso","Pensão Recebida","Venda de Produtos","Comissão","Renda Extra","Dividendos","Aposentadoria","Outros"];
const CATS_DEP = ["Cartão de Crédito","Moradia","Alimentação","Transporte","Saúde","Educação","Lazer","Vestuário","Assinaturas","Pets","Beleza e Cuidados","Eletrônicos","Serviços","Presentes","Doações","Impostos","Dívidas","Seguros","Academia","Farmácia","Outros"];
const FORMAS_REC = ["PIX","Transferência","Depósito","TED","Dinheiro","Automático"];
const FORMAS_DEP = ["Cartão Crédito","Cartão Débito","PIX","Dinheiro","Débito Auto","Boleto","App"];
const MESES = ["Jan","Fev","Mar","Abr","Mai","Jun","Jul","Ago","Set","Out","Nov","Dez"];
const FREQ_OPTS = [{id:"mensal",label:"Todo mês",icon:"↻"},{id:"quinzenal",label:"Quinzenal",icon:"↻"},{id:"semanal",label:"Toda semana",icon:"↻"},{id:"anual",label:"Todo ano",icon:"↻"}];

const CAT_EMOJI={"Alimentação":"🍔","Transporte":"🚗","Moradia":"🏠","Saúde":"❤️","Academia":"💪","Educação":"📚","Lazer":"🎮","Assinaturas":"📱","Vestuário":"👕","Pets":"🐾","Eletrônicos":"💻","Serviços":"🔧","Presentes":"🎁","Doações":"🤝","Impostos":"📄","Dívidas":"💳","Farmácia":"💊","Outros":"💰","Salário":"💰","Freelance":"🖥","Investimentos":"📈","Bônus":"🏆","Reembolso":"↩","Renda Extra":"⭐","Aluguel Recebido":"🏘","Dividendos":"📊"};
const CAT_COLORS = {
  "Moradia":"#60A5FA","Alimentação":"#FB923C","Transporte":"#A78BFA","Saúde":"#34D399","Educação":"#FBBF24",
  "Lazer":"#F472B6","Vestuário":"#2DD4BF","Assinaturas":"#818CF8","Outros":"#94A3B8","Pets":"#F97316",
  "Beleza e Cuidados":"#E879F9","Eletrônicos":"#38BDF8","Presentes":"#FB7185","Impostos":"#FCD34D",
  "Dívidas":"#F87171","Seguros":"#6EE7B7","Academia":"#67E8F9","Farmácia":"#86EFAC","Salário":"#34D399",
  "Serviços":"#A3A3F5","Doações":"#5EEAD4",
  "Freelance":"#60A5FA","Investimentos":"#FBBF24","Aluguel Recebido":"#A78BFA","Bônus":"#F472B6",
  "Reembolso":"#2DD4BF","Pensão Recebida":"#FCA5A5","Venda de Produtos":"#FDE68A","Comissão":"#6EE7B7",
  "Renda Extra":"#93C5FD","Dividendos":"#C4B5FD","Aposentadoria":"#A7F3D0",
};
export { CATS_REC, CATS_DEP, FORMAS_REC, FORMAS_DEP, MESES, FREQ_OPTS, CAT_EMOJI, CAT_COLORS };
