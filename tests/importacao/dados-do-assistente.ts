import { AccountType } from "@/types/accounts"
import type { AnaliseDeImportacao, LinhaAnalisada, ResumoDaAnalise } from "@/types/importacao"

// Respostas da análise no formato do backend (AD-055), com o layout da
// exportação do Mobills: quatro abas, "Despesas" e "Receitas" contidas na
// primeira.

export const CABECALHO_MOBILLS = ["Data", "Descrição", "Valor", "Conta", "Situação", "Categoria", "Subcategoria", "Tags"]
export const CONTIDA = "Contida na aba Receitas e Despesas"

export function linha(numero: number, trocas: Partial<LinhaAnalisada> = {}): LinhaAnalisada {
  const aba = trocas.aba ?? "Receitas e Despesas"
  return {
    chave: `${aba}:${numero}`,
    aba,
    numero,
    estado: "VALIDA",
    motivo: null,
    data: "2026-02-01",
    descricao: `Lançamento ${numero}`,
    conta: "Nubank",
    destino: null,
    tipo: "EXPENSE",
    categoria: "Mercado",
    subcategoria: null,
    valor: "45.00",
    situacao: "COMPLETED",
    tags: [],
    ...trocas,
  }
}

export function resumo(trocas: Partial<ResumoDaAnalise> = {}): ResumoDaAnalise {
  return {
    validas: 64,
    rejeitadas: 1,
    repetidas: 2,
    excluidas: 0,
    contas_novas: 1,
    receitas: { quantidade: 20, valor: "8500.00" },
    despesas: { quantidade: 37, valor: "4321.09" },
    transferencias: { quantidade: 9, valor: "1500.50" },
    summary_rows: 4,
    ...trocas,
  }
}

export function analiseMobills(trocas: Partial<AnaliseDeImportacao> = {}): AnaliseDeImportacao {
  return {
    plano: {
      modelo: "MOBILLS",
      abas: [
        {
          nome: "Receitas e Despesas",
          papel: "RECEITAS_DESPESAS",
          colunas: {
            date_column: "Data",
            description_column: "Descrição",
            amount_column: "Valor",
            account_column: "Conta",
            status_column: "Situação",
            category_column: "Categoria",
            subcategory_column: "Subcategoria",
            tags_column: "Tags",
          },
          motivo: null,
          cabecalho: CABECALHO_MOBILLS,
        },
        { nome: "Despesas", papel: "IGNORAR", colunas: {}, motivo: CONTIDA, cabecalho: CABECALHO_MOBILLS },
        { nome: "Receitas", papel: "IGNORAR", colunas: {}, motivo: CONTIDA, cabecalho: CABECALHO_MOBILLS },
        {
          nome: "Transferências",
          papel: "TRANSFERENCIAS",
          colunas: {
            date_column: "Data",
            source_account_column: "Conta origem",
            dest_account_column: "Conta destino",
            amount_column: "Valor",
            tags_column: "Tags",
          },
          motivo: null,
          cabecalho: ["Data", "Conta origem", "Conta destino", "Valor", "Tags"],
        },
      ],
      contas: {
        Nubank: {
          acao: "vincular",
          id: "conta-nubank",
          arquivo: { quantidade: 30, soma: "-1200.00", primeira_data: "2026-01-02", ultima_data: "2026-03-30" },
        },
        "XC - Carteira": {
          acao: "criar",
          nome: "XC - Carteira",
          tipo: AccountType.WALLET,
          saldo_atual: "0.00",
          institution: null,
          color: null,
          arquivo: { quantidade: 12, soma: "350.50", primeira_data: "2026-01-05", ultima_data: "2026-02-28" },
        },
      },
      linhas: {},
    },
    linhas: [
      linha(2),
      linha(3, { estado: "REJEITADA", motivo: "Data inválida", data: "31/02/2026", valor: "-45,00", tipo: null, situacao: "Paga" }),
      linha(4, { estado: "REPETIDA", tipo: "INCOME", descricao: "Salário", valor: "5000.00" }),
      linha(2, {
        aba: "Transferências",
        chave: "Transferências:2",
        tipo: "TRANSFER",
        descricao: "Transferência",
        conta: "Nubank",
        destino: "XC - Carteira",
        categoria: null,
      }),
    ],
    resumo: resumo(),
    ...trocas,
  }
}

export const CONTAS_ATIVAS = [
  { id: "conta-nubank", name: "Nubank", type: AccountType.CHECKING, is_active: true },
  { id: "conta-itau", name: "Itaú", type: AccountType.CHECKING, is_active: true },
]
