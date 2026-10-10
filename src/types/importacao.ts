import type { AccountType } from "@/types/accounts"

// IMPCOMP-13 e AD-055: o plano da importação completa. A análise devolve o
// plano detectado; a tela edita e manda de volta, e a importação grava a
// partir dele. Tudo é opcional no envio: o que faltar vem da detecção.

export type PapelDaAba = "RECEITAS_DESPESAS" | "TRANSFERENCIAS" | "IGNORAR"

// Campos de coluna que o backend reconhece (IMPCOMP-04)
export const CAMPOS_DE_COLUNA = [
  "date_column",
  "description_column",
  "amount_column",
  "account_column",
  "source_account_column",
  "dest_account_column",
  "type_column",
  "status_column",
  "category_column",
  "subcategory_column",
  "tags_column",
  "income_column",
  "expense_column",
] as const

export type CampoDeColuna = (typeof CAMPOS_DE_COLUNA)[number]

// Campo -> texto do cabeçalho; null ou vazio deixa o campo sem coluna
export type ColunasDaAba = Partial<Record<CampoDeColuna, string | null>>

export interface AbaDoPlano {
  nome: string
  papel: PapelDaAba
  colunas?: ColunasDaAba
  // Só na resposta da análise; ignorados no envio
  motivo?: string | null
  cabecalho?: string[]
}

// Dados da conta no arquivo, só na resposta da análise (IMPCOMP-10)
export interface ContaNoArquivo {
  quantidade: number
  soma: string
  primeira_data: string | null
  ultima_data: string | null
}

export interface ContaVinculada {
  acao: "vincular"
  id: string
  arquivo?: ContaNoArquivo
}

export interface ContaACriar {
  acao: "criar"
  nome: string
  tipo: AccountType
  // Texto decimal da API ("1234.56"), pode ser zero ou negativo
  saldo_atual: string
  institution?: string | null
  color?: string | null
  arquivo?: ContaNoArquivo
}

export type AcaoDaConta = ContaVinculada | ContaACriar

export interface CorrecaoDeLinha {
  data?: string | null
  valor?: string | null
  descricao?: string | null
  conta?: string | null
  destino?: string | null
  tipo?: string | null
  situacao?: string | null
  categoria?: string | null
  subcategoria?: string | null
  tags?: string | string[] | null
}

export type AjusteDeLinha = { excluir: true } | CorrecaoDeLinha

export interface PlanoDeImportacao {
  modelo?: "MOBILLS" | null
  abas?: AbaDoPlano[]
  // Nome da conta no arquivo -> ação
  contas?: Record<string, AcaoDaConta>
  // "<aba>:<número>" -> exclusão ou correção (IMPCOMP-32 a IMPCOMP-34)
  linhas?: Record<string, AjusteDeLinha>
}

export type EstadoDaLinha = "VALIDA" | "REJEITADA" | "REPETIDA" | "EXCLUIDA"

// IMPCOMP-31: cada linha interpretada, com a chave "<aba>:<número>". Nas
// rejeitadas os campos vêm com o texto cru da célula.
export interface LinhaAnalisada {
  chave: string
  aba: string
  numero: number
  estado: EstadoDaLinha
  motivo: string | null
  data: string | null
  descricao: string | null
  conta: string | null
  destino: string | null
  tipo: string | null
  categoria: string | null
  subcategoria: string | null
  valor: string | null
  situacao: string | null
  tags?: string[]
}

export interface TotalPorTipo {
  quantidade: number
  valor: string
}

export interface ResumoDaAnalise {
  validas: number
  rejeitadas: number
  repetidas: number
  excluidas: number
  contas_novas: number
  receitas: TotalPorTipo
  despesas: TotalPorTipo
  transferencias: TotalPorTipo
  summary_rows: number
}

export interface PlanoAnalisado extends PlanoDeImportacao {
  modelo: "MOBILLS" | null
  abas: AbaDoPlano[]
  contas: Record<string, AcaoDaConta>
  linhas: Record<string, AjusteDeLinha>
}

export interface AnaliseDeImportacao {
  plano: PlanoAnalisado
  linhas: LinhaAnalisada[]
  resumo: ResumoDaAnalise
}

// IMPCOMP-47: o resultado da importação
export interface RejeitadaDaImportacao {
  line: number
  reason: string
  sheet: string
}

export interface TotaisDaAba {
  imported: number
  ignored: number
  rejected: number
}

export interface ResultadoDaImportacao {
  total: number
  imported: number
  ignored: number
  rejected: number
  suggested: number
  batch_id: string
  rejected_rows: RejeitadaDaImportacao[]
  excluded: number
  accounts_created: { id: string; name: string }[]
  by_sheet: Record<string, TotaisDaAba>
  summary_rows: number
}
