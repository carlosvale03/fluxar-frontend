import type {
  DivisaoDoSalario,
  ModeloDeDivisao,
  ParteDoPlano,
  PlanoDoSalario,
  RecebimentoDoSalario,
  ReferenciasDoSalario,
  RevisaoDaDivisao,
} from "@/types/salario"

// Respostas da API da gestão do salário para os testes (contratos de T3 a T7)

export const MODELOS: ModeloDeDivisao[] = [
  {
    code: "pague_se_primeiro",
    name: "Pague-se primeiro",
    author: "George S. Clason",
    book: "O Homem Mais Rico da Babilônia",
    parts: [{ name: "Guardar", rule_type: "PERCENT", value: "10.00", destination_type: null, reference: "" }],
  },
  {
    code: "50_30_20",
    name: "50/30/20",
    author: "Elizabeth Warren e Amelia Warren Tyagi",
    book: "All Your Worth",
    parts: [
      { name: "Essenciais", rule_type: "PERCENT", value: "50.00", destination_type: "SALARY_ACCOUNT", reference: "ESSENCIAL" },
      { name: "Dispensáveis", rule_type: "PERCENT", value: "30.00", destination_type: "SALARY_ACCOUNT", reference: "DISPENSAVEL" },
      { name: "Guardar", rule_type: "PERCENT", value: "20.00", destination_type: null, reference: "" },
    ],
  },
  {
    code: "seis_potes",
    name: "Seis potes",
    author: "T. Harv Eker",
    book: "Os Segredos da Mente Milionária",
    parts: [
      { name: "Necessidades", rule_type: "PERCENT", value: "55.00", destination_type: "SALARY_ACCOUNT", reference: "ESSENCIAL" },
      { name: "Liberdade financeira", rule_type: "PERCENT", value: "10.00", destination_type: null, reference: "" },
      { name: "Poupança para gastos futuros", rule_type: "PERCENT", value: "10.00", destination_type: null, reference: "" },
      { name: "Educação", rule_type: "PERCENT", value: "10.00", destination_type: "SALARY_ACCOUNT", reference: "" },
      { name: "Diversão", rule_type: "PERCENT", value: "10.00", destination_type: "SALARY_ACCOUNT", reference: "DISPENSAVEL" },
      { name: "Doações", rule_type: "PERCENT", value: "5.00", destination_type: "SALARY_ACCOUNT", reference: "" },
    ],
  },
  { code: "personalizado", name: "Personalizado", author: null, book: null, parts: [] },
]

export function parte(trocas: Partial<ParteDoPlano> = {}): ParteDoPlano {
  return {
    id: "parte-1",
    name: "Guardar",
    rule_type: "PERCENT",
    value: "20.00",
    destination_type: null,
    destination_name: null,
    account: null,
    goal: null,
    reference: "",
    goal_monthly_needed: null,
    goal_target_date: null,
    ...trocas,
  }
}

// 50/30/20 salvo com Guardar na meta Viagem
export const PLANO_SALVO: PlanoDoSalario = {
  has_plan: true,
  parts: [
    parte({ id: "p-ess", name: "Essenciais", value: "50.00", destination_type: "SALARY_ACCOUNT", destination_name: "Fica na conta do salário", reference: "ESSENCIAL" }),
    parte({ id: "p-dis", name: "Dispensáveis", value: "30.00", destination_type: "SALARY_ACCOUNT", destination_name: "Fica na conta do salário", reference: "DISPENSAVEL" }),
    parte({
      id: "p-gua",
      name: "Guardar",
      value: "20.00",
      destination_type: "GOAL",
      destination_name: "Viagem",
      goal: "meta-viagem",
      goal_monthly_needed: "250.00",
      goal_target_date: "2027-06-30",
    }),
  ],
  salary_categories: ["cat-salario"],
}

export const SEM_PLANO: PlanoDoSalario = { has_plan: false, parts: [], salary_categories: ["cat-salario"] }

export function recebimento(trocas: Partial<RecebimentoDoSalario> = {}): RecebimentoDoSalario {
  return {
    id: "rec-1",
    description: "Salário de outubro",
    amount: "3000.00",
    date: "2026-10-05",
    account: "conta-salario",
    account_name: "Banco Azul",
    category: "cat-salario",
    category_name: "Salário",
    imported: false,
    ...trocas,
  }
}

export function referencias(trocas: { months_used?: number } = {}): ReferenciasDoSalario {
  return {
    committed: { recurring_pending: "1200.00", invoices_due: "450.00", total: "1650.00" },
    history: {
      months_used: trocas.months_used ?? 3,
      salary_average: "3000.00",
      expense_average: "2500.00",
      difference_average: "500.00",
      by_class: [
        { class_id: "classe-ess", class_name: "Essencial", reference: "ESSENCIAL", average: "1860.00" },
        { class_id: "classe-dis", class_name: "Dispensável", reference: "DISPENSAVEL", average: "640.00" },
      ],
    },
  }
}

export const CONTAS = [
  { id: "conta-salario", name: "Banco Azul", type: "CHECKING", is_active: true, balance: "3000.00" },
  { id: "conta-reserva", name: "Reserva", type: "SAVINGS", is_active: true, balance: "100.00" },
  { id: "conta-velha", name: "Conta antiga", type: "CHECKING", is_active: false, balance: "0.00" },
  { id: "cofrinho-1", name: "Cofrinho Casa", type: "PIGGY_BANK", is_active: true, balance: "700.00" },
]

export const METAS = [
  { id: "meta-viagem", name: "Viagem", status: "IN_PROGRESS", is_active: true, target_amount: "6000.00", current_amount: "0.00", account: "cofrinho-1" },
  { id: "meta-carro", name: "Carro velho", status: "COMPLETED", is_active: false, target_amount: "100.00", current_amount: "100.00", account: "cofrinho-1" },
]

export const CATEGORIAS_DE_RECEITA = [
  {
    id: "cat-salario",
    name: "Salário",
    type: "INCOME",
    icon: "Banknote",
    color: "#00aa00",
    is_active: true,
    is_default: true,
    subcategories: [],
  },
  { id: "cat-freela", name: "Freelance", type: "INCOME", icon: "Briefcase", color: "#0000aa", is_active: true, is_default: false, subcategories: [] },
]

export function revisao(trocas: Partial<RevisaoDaDivisao> = {}): RevisaoDaDivisao {
  const origem = { id: "conta-salario", name: "Banco Azul" }
  return {
    receipt: recebimento(),
    items: [
      { part_id: "p-ess", name: "Essenciais", destination_type: "SALARY_ACCOUNT", destination_name: "Fica na conta do salário", amount: "1500.00", reduced: false, adjusted: false, generates_transaction: false, origin_account: origem },
      { part_id: "p-dis", name: "Dispensáveis", destination_type: "SALARY_ACCOUNT", destination_name: "Fica na conta do salário", amount: "900.00", reduced: false, adjusted: false, generates_transaction: false, origin_account: origem },
      { part_id: "p-gua", name: "Guardar", destination_type: "GOAL", destination_name: "Viagem", amount: "600.00", reduced: false, adjusted: false, generates_transaction: true, origin_account: origem },
    ],
    total: "600.00",
    free: "2400.00",
    date: "2026-10-10",
    ...trocas,
  }
}

export function divisao(trocas: Partial<DivisaoDoSalario> = {}): DivisaoDoSalario {
  return {
    id: "div-1",
    receipt: { id: "rec-1", amount: "3000.00", account: "conta-salario", account_name: "Banco Azul", date: "2026-10-05", description: "Salário de outubro" },
    items: [
      { name: "Essenciais", destination_type: "SALARY_ACCOUNT", destination_name: "Fica na conta do salário", amount: "1500.00", reduced: false, generates_transaction: false },
      { name: "Dispensáveis", destination_type: "SALARY_ACCOUNT", destination_name: "Fica na conta do salário", amount: "900.00", reduced: false, generates_transaction: false },
      { name: "Guardar", destination_type: "GOAL", destination_name: "Viagem", amount: "600.00", reduced: false, generates_transaction: true },
    ],
    transactions: [
      {
        transfer_id: "tr-1",
        out_transaction_id: "t-out",
        in_transaction_id: "t-in",
        kind: "GOAL_DEPOSIT",
        part_name: "Guardar",
        origin_account: { id: "conta-salario", name: "Banco Azul" },
        destination_type: "GOAL",
        destination_name: "Viagem",
        account: null,
        goal: "meta-viagem",
        amount: "600.00",
        date: "2026-10-10",
      },
    ],
    total: "600.00",
    free: "2400.00",
    date: "2026-10-10",
    created_at: "2026-10-10T12:00:00-03:00",
    can_undo_until: "2026-10-17",
    undone_at: null,
    ...trocas,
  }
}

// Como na rede, cada resposta chega numa tarefa própria
export function resposta<T>(data: T) {
  return new Promise<{ data: T }>((resolve) => setTimeout(() => resolve({ data }), 0))
}
