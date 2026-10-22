// SALARIO-57: o que cada modelo e cada parte significam, com a obra de
// origem. Os textos são resumos nossos das ideias de cada obra.

export interface FonteDoModelo {
  autores: string
  obra: string
  ano: number
}

export interface ExplicacaoDaParte {
  nome: string
  // Percentual sugerido pelo modelo, como no campo ("10", "55")
  percentual: string
  significado: string
}

export interface ExplicacaoDoModelo {
  codigo: string
  nome: string
  fonte: FonteDoModelo | null
  descricao: string
  partes: ExplicacaoDaParte[]
}

export const EXPLICACOES_DOS_MODELOS: Record<string, ExplicacaoDoModelo> = {
  pague_se_primeiro: {
    codigo: "pague_se_primeiro",
    nome: "Pague-se primeiro",
    fonte: { autores: "George S. Clason", obra: "O Homem Mais Rico da Babilônia", ano: 1926 },
    descricao: "Guardar para você pelo menos um décimo de tudo o que ganha, antes de pagar qualquer outra conta.",
    partes: [
      {
        nome: "Guardar",
        percentual: "10",
        significado: "A parte que é sua para ficar; vai para a reserva ou para investimentos antes de qualquer gasto.",
      },
    ],
  },
  "50_30_20": {
    codigo: "50_30_20",
    nome: "50/30/20",
    fonte: { autores: "Elizabeth Warren e Amelia Warren Tyagi", obra: "All Your Worth", ano: 2005 },
    descricao: "Dividir a renda em três grupos simples: o que é obrigatório, o que é escolha e o que é futuro.",
    partes: [
      {
        nome: "Essenciais",
        percentual: "50",
        significado:
          "O que você precisa pagar todo mês mesmo se a renda cair: moradia, contas da casa, mercado, transporte para o trabalho, saúde e o mínimo das dívidas.",
      },
      {
        nome: "Dispensáveis",
        percentual: "30",
        significado:
          "O que deixa a vida melhor mas pode ser cortado: lazer, restaurantes, assinaturas e compras que não são necessárias.",
      },
      {
        nome: "Guardar",
        percentual: "20",
        significado: "Reserva de emergência, aposentadoria, investimentos e pagamento extra de dívidas.",
      },
    ],
  },
  seis_potes: {
    codigo: "seis_potes",
    nome: "Seis potes",
    fonte: { autores: "T. Harv Eker", obra: "Os Segredos da Mente Milionária", ano: 2005 },
    descricao: "Separar o dinheiro em seis potes, cada um com um propósito, para equilibrar o presente e o futuro.",
    partes: [
      { nome: "Necessidades", percentual: "55", significado: "Saídas do dia a dia: moradia, alimentação, contas e transporte." },
      {
        nome: "Liberdade financeira",
        percentual: "10",
        significado: "Dinheiro para investir e gerar renda passiva; não é para gastar, só os rendimentos no futuro.",
      },
      {
        nome: "Poupança para gastos futuros",
        percentual: "10",
        significado: "Guardar para compras grandes planejadas, como viagem, carro ou troca de celular.",
      },
      { nome: "Educação", percentual: "10", significado: "Cursos, livros e tudo o que faz você aprender e crescer." },
      {
        nome: "Diversão",
        percentual: "10",
        significado: "Gastar sem culpa com algo que te dê prazer; a ideia é usar esse pote todo mês.",
      },
      { nome: "Doações", percentual: "5", significado: "Ajudar pessoas ou causas que importam para você." },
    ],
  },
  personalizado: {
    codigo: "personalizado",
    nome: "Personalizado",
    fonte: null,
    descricao: "Monte as partes do seu jeito. Comece pelo que precisa pagar e pelo que quer guardar.",
    partes: [],
  },
}

// "George S. Clason, O Homem Mais Rico da Babilônia (1926)"
export function textoDaFonte(fonte: FonteDoModelo): string {
  return `${fonte.autores}, ${fonte.obra} (${fonte.ano})`
}

// Nome comparável: minúsculas, sem acentos e sem espaços nas pontas
export function normalizarNome(nome: string): string {
  return nome
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .trim()
}

// Sem um modelo de preferência, "Guardar" fica com o sentido do 50/30/20
const ORDEM_DE_BUSCA = ["50_30_20", "seis_potes", "pague_se_primeiro"]

// A explicação de uma parte pelo nome, com o modelo de onde ela vem. Com o
// código do modelo do plano, a parte desse modelo vem primeiro.
export function explicacaoDaParte(
  nome: string,
  codigoDoModelo?: string | null,
): { parte: ExplicacaoDaParte; modelo: ExplicacaoDoModelo } | null {
  const procurado = normalizarNome(nome)
  if (!procurado) return null
  const ordem = codigoDoModelo ? [codigoDoModelo, ...ORDEM_DE_BUSCA.filter((c) => c !== codigoDoModelo)] : ORDEM_DE_BUSCA
  for (const codigo of ordem) {
    const modelo = EXPLICACOES_DOS_MODELOS[codigo]
    const parte = modelo?.partes.find((p) => normalizarNome(p.nome) === procurado)
    if (modelo && parte) return { parte, modelo }
  }
  return null
}
