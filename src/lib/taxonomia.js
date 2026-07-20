// Taxonomia de DESPESAS: mantém as categorias principais já usadas no app e
// adiciona subcategorias com muitos sinônimos (palavras-chave) para acertar a
// categorização automática. Retrocompatível: categoria principal continua igual.
// Palavras-chave em minúsculas; o matcher normaliza acentos dos dois lados.

const TAXONOMIA = {
  "Alimentação": [
    { sub: "Supermercado", kw: ["mercado","supermercado","mercearia","hortifruti","acougue","açougue","atacadao","atacadão","assai","assaí","carrefour","pao de acucar","feira","mantimentos","compras do mes"] },
    { sub: "Restaurantes e Bares", kw: ["restaurante","lanchonete","pizzaria","churrascaria","fast food","delivery","ifood","uber eats","rappi","almoco","almoço","jantar","comer fora","lanche","hamburguer","hambúrguer","sushi","pizza","marmita","self service","boteco"] },
    { sub: "Café e Padaria", kw: ["cafe","café","cafeteria","starbucks","padaria","confeitaria","cappuccino","espresso","cafe da manha"] },
    { sub: "Bebidas Alcoólicas", kw: ["cerveja","vinho","chopp","whisky","vodka","cachaca","cachaça","destilado","adega"] },
    { sub: "Snacks e Doces", kw: ["salgadinho","biscoito","pipoca","chocolate","doce","guloseima","petisco","sorvete","acai","açaí","bala"] },
  ],
  "Transporte": [
    { sub: "Combustível", kw: ["gasolina","diesel","etanol","alcool","álcool","combustivel","combustível","posto","abastecer","abastecimento","shell","ipiranga","petrobras","gnv"] },
    { sub: "Transporte por App / Público", kw: ["uber","cabify","taxi","táxi","onibus","ônibus","metro","metrô","trem","passagem","bilhete","bilhete unico","vlt","brt","barca"] },
    { sub: "Estacionamento", kw: ["estacionamento","garagem","vaga","manobrista","valet","zona azul","parking"] },
    { sub: "Manutenção do Veículo", kw: ["oficina","mecanico","mecânico","revisao","revisão","troca de oleo","óleo","pneu","bateria","filtro","conserto do carro","funilaria","alinhamento","balanceamento","lavagem"] },
    { sub: "Pedágio", kw: ["pedagio","pedágio","sem parar","conectcar","veloe"] },
    { sub: "Licenciamento / IPVA", kw: ["ipva","licenciamento","emplacamento","detran","dpvat","multa de transito"] },
    { sub: "Viagens / Deslocamento", kw: ["passagem aerea","aviao","avião","voo","rodoviaria","viagem de onibus"] },
  ],
  "Moradia": [
    { sub: "Aluguel", kw: ["aluguel","aluguel do apartamento","aluguel da casa","imobiliaria","locacao"] },
    { sub: "Condomínio", kw: ["condominio","condomínio","taxa de condominio","sindico"] },
    { sub: "Energia / Luz", kw: ["luz","energia","eletricidade","conta de luz","enel","cemig","light","cpfl","coelba","celpe","copel"] },
    { sub: "Água / Esgoto", kw: ["agua","água","saneamento","conta de agua","sabesp","esgoto","cedae","embasa"] },
    { sub: "Gás", kw: ["botijao","botijão","gas de cozinha","gás de cozinha","comgas","ultragaz","gas natural"] },
    { sub: "Internet / Telefone", kw: ["internet","wifi","banda larga","fibra optica","telefone","plano de celular","operadora","vivo fibra","claro net"] },
    { sub: "Limpeza / Manutenção", kw: ["produtos de limpeza","reforma","pintura","dedetizacao","reparo em casa","material de construcao","conserto em casa"] },
    { sub: "Móveis e Decoração", kw: ["movel","móvel","moveis","sofa","sofá","cama","mesa","cadeira","tapete","cortina","decoracao","decoração","tok stok","mobly"] },
    { sub: "Eletrodomésticos", kw: ["geladeira","fogao","fogão","microondas","lava roupa","maquina de lavar","ventilador","ar condicionado","liquidificador","aspirador"] },
  ],
  "Saúde": [
    { sub: "Consultas Médicas", kw: ["medico","médico","consulta","clinica","clínica","consultorio","especialista","cardiologista","dermatologista","telemedicina"] },
    { sub: "Exames e Diagnósticos", kw: ["exame","ultrassom","raio-x","raio x","ressonancia","tomografia","laboratorio","laboratório","hemograma","analise clinica","fleury","dasa"] },
    { sub: "Dentista", kw: ["dentista","odontologo","odontológico","ortodontia","aparelho","implante","clareamento","limpeza dental","canal"] },
    { sub: "Oftalmologia", kw: ["oftalmologista","oculos","óculos","lente de contato","exame de vista","optica","óptica"] },
    { sub: "Fisioterapia", kw: ["fisioterapia","fisioterapeuta","reabilitacao","rpg","pilates clinico"] },
    { sub: "Psicologia / Terapia", kw: ["psicologo","psicólogo","psiquiatra","terapia","psicoterapia","analise","sessao"] },
    { sub: "Nutrição", kw: ["nutricionista","nutricao","nutrição","consulta nutricional"] },
    { sub: "Plano de Saúde", kw: ["plano de saude","plano de saúde","convenio","convênio","unimed","amil","hapvida","bradesco saude","sulamerica"] },
    { sub: "Hospital", kw: ["hospital","pronto socorro","internacao","cirurgia","emergencia"] },
  ],
  "Farmácia": [
    { sub: "Medicamentos", kw: ["farmacia","farmácia","remedio","remédio","drogaria","drogasil","ultrafarma","pacheco","medicamento","antibiotico","generico"] },
    { sub: "Vitaminas e Suplementos", kw: ["vitamina","suplemento","whey","creatina","colageno","probiotico","omega 3"] },
    { sub: "Higiene Pessoal", kw: ["sabonete","shampoo","condicionador","desodorante","creme dental","pasta de dente","papel higienico","absorvente","fralda","escova de dente"] },
  ],
  "Academia": [
    { sub: "Academia / Musculação", kw: ["academia","gym","musculacao","musculação","smart fit","bodytech","bio ritmo"] },
    { sub: "Aulas / Modalidades", kw: ["crossfit","natacao","natação","pilates","yoga","danca","dança","jiu jitsu","muay thai","funcional","spinning"] },
    { sub: "Personal Trainer", kw: ["personal","personal trainer","treinador"] },
  ],
  "Beleza e Cuidados": [
    { sub: "Cabeleireiro / Barbeiro", kw: ["cabeleireiro","cabelereiro","barbeiro","barbearia","salao","salão","corte de cabelo","tintura","progressiva","escova","penteado"] },
    { sub: "Manicure / Estética", kw: ["manicure","pedicure","unha","depilacao","depilação","estetica","estética","spa","massagem","limpeza de pele","sobrancelha"] },
    { sub: "Cosméticos e Perfumaria", kw: ["cosmetico","maquiagem","perfume","colonia","batom","hidratante","serum","creme","natura","boticario","o boticário","sephora"] },
  ],
  "Educação": [
    { sub: "Mensalidade Escolar", kw: ["escola","colegio","colégio","mensalidade","educacao infantil","fundamental","creche escolar"] },
    { sub: "Faculdade / Pós", kw: ["faculdade","universidade","graduacao","pos graduacao","mestrado","doutorado","especializacao","mensalidade faculdade"] },
    { sub: "Cursos e Treinamentos", kw: ["curso","udemy","alura","coursera","workshop","treinamento","capacitacao","aula particular","reforco"] },
    { sub: "Idiomas", kw: ["ingles","inglês","espanhol","frances","alemao","cna","wizard","fisk","escola de idiomas","curso de idioma"] },
    { sub: "Livros e Material", kw: ["livro","material escolar","caderno","apostila","mochila","caneta","lapis"] },
  ],
  "Lazer": [
    { sub: "Cinema e Shows", kw: ["cinema","filme","ingresso","show","concerto","teatro","espetaculo","evento","festival"] },
    { sub: "Jogos e Games", kw: ["game","jogo","videogame","playstation","xbox","nintendo","steam","console","skin"] },
    { sub: "Viagens e Turismo", kw: ["viagem","ferias","férias","turismo","passeio","excursao","hotel","pousada","airbnb","hospedagem","tour"] },
    { sub: "Bares e Baladas", kw: ["balada","boteco","festa","night club","pub","chopp"] },
    { sub: "Hobbies e Passeios", kw: ["parque","praia","hobby","colecao","artesanato","zoologico","museu"] },
  ],
  "Assinaturas": [
    { sub: "Streaming de Vídeo", kw: ["netflix","amazon prime","prime video","disney","hbo","hbo max","globoplay","paramount","apple tv"] },
    { sub: "Música e Áudio", kw: ["spotify","deezer","youtube premium","apple music","tidal","audible"] },
    { sub: "Apps e Software", kw: ["assinatura","icloud","google one","microsoft 365","office","adobe","canva","chatgpt","notion","dropbox"] },
  ],
  "Vestuário": [
    { sub: "Roupas", kw: ["roupa","camiseta","camisa","calca","calça","vestido","blusa","jaqueta","casaco","bermuda","shorts","shein","zara","renner","c&a","riachuelo","hering"] },
    { sub: "Calçados", kw: ["sapato","tenis","tênis","bota","sandalia","sandália","chinelo","nike","adidas","calcado"] },
    { sub: "Acessórios", kw: ["bolsa","mochila","cinto","chapeu","gorro","luva","relogio","relógio","joia","colar","pulseira","brinco","oculos de sol"] },
    { sub: "Roupas Íntimas", kw: ["cueca","sutia","sutiã","calcinha","lingerie","pijama","meia"] },
  ],
  "Pets": [
    { sub: "Ração e Alimentos", kw: ["racao","ração","petisco","sache","alimento para cachorro","alimento para gato"] },
    { sub: "Veterinário", kw: ["veterinario","veterinário","clinica veterinaria","vacina","castracao","consulta pet","cirurgia pet"] },
    { sub: "Banho e Tosa", kw: ["banho e tosa","tosa","banho do cachorro","pet shop","petshop"] },
    { sub: "Acessórios e Higiene", kw: ["coleira","guia","cama para pet","brinquedo para pet","tapete higienico","shampoo para pet","areia de gato"] },
    { sub: "Medicamentos Pet", kw: ["vermifugo","antipulgas","remedio para pet","medicamento veterinario"] },
  ],
  "Eletrônicos": [
    { sub: "Computadores e Periféricos", kw: ["computador","notebook","laptop","desktop","monitor","teclado","mouse","impressora","webcam","headset","fone"] },
    { sub: "Celular e Tablet", kw: ["celular","smartphone","iphone","tablet","ipad","samsung","xiaomi","motorola"] },
    { sub: "Acessórios Tech", kw: ["cabo","carregador","power bank","pen drive","cartao de memoria","hd externo","ssd","capinha","pelicula","fone bluetooth"] },
    { sub: "Reparo / Assistência", kw: ["assistencia tecnica","conserto de celular","troca de tela","reparo eletronico","formatacao"] },
  ],
  "Serviços": [
    { sub: "Limpeza / Diarista", kw: ["diarista","faxineira","empregada","servico de limpeza","passadeira"] },
    { sub: "Reparos (Reformas)", kw: ["encanador","eletricista","pedreiro","carpinteiro","pintor","marido de aluguel","chaveiro"] },
    { sub: "Jurídico / Contábil", kw: ["advogado","contador","contabilidade","cartorio","cartório","despachante","honorarios"] },
    { sub: "Babá / Cuidados", kw: ["baba","babá","cuidador","cuidadora","creche","daycare"] },
    { sub: "Frete / Mudança", kw: ["frete","mudanca","mudança","carreto","transportadora","sedex","correios"] },
  ],
  "Presentes": [
    { sub: "Presentes", kw: ["presente","gift","brinde","lembranca","aniversario","natal","dia das maes","dia dos pais","namorados"] },
    { sub: "Ocasiões Especiais", kw: ["casamento","formatura","cha de bebe","batizado","noivado"] },
  ],
  "Doações": [
    { sub: "Doações e Caridade", kw: ["doacao","doação","caridade","ong","dizimo","dízimo","oferta","vaquinha","apadrinhamento"] },
  ],
  "Impostos": [
    { sub: "Impostos e Contribuições", kw: ["imposto","irpf","imposto de renda","darf","inss","fgts","iss","contribuicao"] },
    { sub: "Taxas e Documentos", kw: ["taxa","rg","cpf","passaporte","certidao","alvara","licenca","cartorio"] },
    { sub: "Multas", kw: ["multa","infracao","penalidade"] },
  ],
  "Dívidas": [
    { sub: "Empréstimos / Financiamento", kw: ["emprestimo","empréstimo","financiamento","prestacao","parcela do emprestimo","consignado","crediario"] },
    { sub: "Juros e Tarifas", kw: ["juros","tarifa","anuidade","multa do cartao","iof","tarifa bancaria"] },
    { sub: "Fatura de Cartão", kw: ["fatura","pagamento de fatura","fatura do cartao"] },
  ],
  "Seguros": [
    { sub: "Seguros", kw: ["seguro","seguro de vida","seguro residencial","seguro do carro","seguro automotivo","apolice","porto seguro"] },
  ],
};

const _n = s => String(s).toLowerCase().normalize("NFD").replace(/\p{Diacritic}/gu, "");

// Melhor subcategoria dentro de uma categoria principal (ou "" se nada casar)
function subDe(desc, cat) {
  const subs = TAXONOMIA[cat];
  if (!subs) return "";
  const fn = _n(desc);
  for (const { sub, kw } of subs) {
    if (kw.some(w => fn.includes(_n(w)))) return sub;
  }
  return "";
}

// Categoria principal por palavra-chave da taxonomia (ou null se nada casar)
function catDaTaxonomia(desc) {
  const fn = _n(desc);
  for (const cat of Object.keys(TAXONOMIA)) {
    for (const { kw } of TAXONOMIA[cat]) {
      if (kw.some(w => fn.includes(_n(w)))) return cat;
    }
  }
  return null;
}

// Subcategorias (nomes) de uma categoria — para o seletor no formulário
const subcategoriasDe = cat => (TAXONOMIA[cat] || []).map(s => s.sub);

export { TAXONOMIA, subDe, catDaTaxonomia, subcategoriasDe };
