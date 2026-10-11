// Gestão do salário (SALARIO-01 a SALARIO-56). Dinheiro e percentuais vêm
// da API como texto com duas casas ("1500.00", "50.00"), como em AD-041.

export type RegraDaParte = "FIXED" | "PERCENT"
export type TipoDeDestino = "ACCOUNT" | "GOAL" | "SALARY_ACCOUNT"
export type ReferenciaDaParte = "ESSENCIAL" | "DISPENSAVEL" | ""

// SALARIO-01 e SALARIO-02: os modelos da literatura e o Personalizado
export interface ParteDoModelo {
  name: string
  rule_type: RegraDaParte
  value: string
  destination_type: TipoDeDestino | null
  reference: ReferenciaDaParte
}

export interface ModeloDeDivisao {
  code: string
  name: string
  author: string | null
  book: string | null
  parts: ParteDoModelo[]
}

// SALARIO-04 a SALARIO-07, SALARIO-55: uma parte do plano salvo
export interface ParteDoPlano {
  id: string
  name: string
  rule_type: RegraDaParte
  value: string
  destination_type: TipoDeDestino | null
  destination_name: string | null
  account: string | null
  goal: string | null
  reference: ReferenciaDaParte
  goal_monthly_needed: string | null
  goal_target_date: string | null
}

export interface PlanoDoSalario {
  has_plan: boolean
  parts: ParteDoPlano[]
  // SALARIO-14: ids das categorias de receita que contam como salário
  salary_categories: string[]
}

// Corpo do PUT /salary/plan/ e das partes da simulação
export interface ParteEnviada {
  name: string
  rule_type: RegraDaParte
  value: string
  destination_type?: TipoDeDestino | null
  account?: string | null
  goal?: string | null
  reference?: ReferenciaDaParte
}

export interface PlanoEnviado {
  parts: ParteEnviada[]
  salary_categories?: string[]
}

// SALARIO-13, SALARIO-29: um item calculado
export interface ItemDaDivisaoCalculada {
  part_id: string | null
  name: string
  destination_type: TipoDeDestino | null
  destination_name: string | null
  amount: string
  reduced: boolean
  adjusted: boolean
  generates_transaction: boolean
  origin_account?: { id: string; name: string }
  // SALARIO-66 e SALARIO-67: na revisão, o já gasto (saídas descontadas na
  // parte), o que será transferido e quanto as saídas passaram do valor
  spent?: string
  transfer?: string
  exceeded?: string
}

export interface Simulacao {
  amount: string
  items: ItemDaDivisaoCalculada[]
  total: string
  free: string
}

// SALARIO-24: um salário efetivado ainda não dividido
export interface RecebimentoDoSalario {
  id: string
  description: string
  amount: string
  date: string
  account: string
  account_name: string
  category: string | null
  category_name: string | null
  imported: boolean
}

// SALARIO-64 e SALARIO-65: uma saída da conta do salário desde o recebimento.
// CREDIT_CARD é a compra no cartão paga com a conta do salário (a data é a do
// pagamento e o destino é o nome do cartão)
export type TipoDeSaida = "EXPENSE" | "TRANSFER_OUT" | "INVOICE_PAYMENT" | "CREDIT_CARD"

export interface SaidaDoSalario {
  id: string
  date: string
  description: string
  amount: string
  type: TipoDeSaida
  destination_name: string | null
  category_name: string | null
  suggested_part_id: string | null
  // A parte escolhida no pedido, ecoada pela API
  part_id: string | null
}

// SALARIO-29 e SALARIO-30: a revisão, sem gravar nada. Com saídas
// descontadas, `total` e `free` já vêm descontados (SALARIO-72)
export interface RevisaoDaDivisao {
  receipt: RecebimentoDoSalario
  items: ItemDaDivisaoCalculada[]
  outflows: SaidaDoSalario[]
  total: string
  free: string
  date: string
}

// Ajustes da revisão: id da parte para o valor ("450.00")
export type AjustesDaDivisao = Record<string, string>

// SALARIO-71: id da saída para o id da parte, ou null para não descontar
export type SaidasDaDivisao = Record<string, string | null>

// SALARIO-68: uma saída descontada na divisão (campos nulos se ela foi
// apagada depois)
export interface SaidaDescontada {
  id: string | null
  date: string | null
  description: string | null
  amount: string | null
  type: TipoDeSaida | null
  part_name: string | null
}

// SALARIO-44: uma transação criada pela divisão
export interface TransacaoDaDivisao {
  transfer_id: string | null
  out_transaction_id: string | null
  in_transaction_id: string | null
  kind: "TRANSFER" | "GOAL_DEPOSIT"
  part_name: string
  origin_account: { id: string | null; name: string | null }
  destination_type: TipoDeDestino | null
  destination_name: string | null
  account: string | null
  goal: string | null
  amount: string
  date: string
}

export interface DivisaoDoSalario {
  id: string
  receipt: {
    id: string
    amount: string
    account: string | null
    account_name: string | null
    date: string | null
    description: string | null
  }
  items: {
    name: string
    destination_type: TipoDeDestino | null
    destination_name: string | null
    amount: string
    reduced: boolean
    generates_transaction: boolean
    spent?: string
    transfer?: string
    exceeded?: string
  }[]
  // SALARIO-68: o que foi descontado; ausente nas divisões antigas
  outflows?: SaidaDescontada[]
  // SALARIO-77: quantas saídas descontadas mudaram ou foram apagadas depois
  // da divisão
  outflows_changed?: number
  transactions: TransacaoDaDivisao[]
  total: string
  free: string
  date: string
  created_at: string
  can_undo_until: string
  undone_at: string | null
}

// SALARIO-52, SALARIO-53 e SALARIO-56: o comprometido no mês e as médias
export interface MediaDaClasse {
  class_id: string | null
  class_name: string
  reference: ReferenciaDaParte
  average: string
}

export interface ReferenciasDoSalario {
  committed: {
    recurring_pending: string
    invoices_due: string
    total: string
  }
  history: {
    months_used: number
    salary_average: string
    expense_average: string
    difference_average: string
    by_class: MediaDaClasse[]
  }
}
