import { render, screen, within } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import { toast } from "sonner"
import { beforeEach, describe, expect, it, vi } from "vitest"

import { FORMATO_NAO_SUPORTADO, ImportDialog } from "@/components/transactions/import-dialog"
import { api } from "@/services/apiClient"
import type { ImportSummary } from "@/services/import-export"

// IMPORT-03: a planilha aceita só .csv e .xlsx. IMPORT-06: as colunas
// opcionais começam vazias e só vão se o usuário preencher. IMPORT-33: o
// resumo mostra lidas, gravadas, ignoradas e rejeitadas, com cada rejeitada.
// IMPORT-45: as sugeridas, com o atalho para a lista filtrada.

vi.mock("@/services/apiClient", async (importOriginal) => ({
  ...(await importOriginal<typeof import("@/services/apiClient")>()),
  api: { get: vi.fn(), post: vi.fn(), patch: vi.fn() },
}))

vi.mock("sonner", () => ({ toast: Object.assign(vi.fn(), { success: vi.fn(), error: vi.fn(), info: vi.fn() }) }))

vi.mock("next/navigation", () => ({
  useRouter: () => ({ push: vi.fn(), replace: vi.fn() }),
  usePathname: () => "/importar",
  useSearchParams: () => new URLSearchParams(),
}))

const LOTE = "6f1c2a7e-3b4d-4c5e-9f60-718293a4b5c6"
const URL_PREFLIGHT = "/import/spreadsheet/preflight/"
const URL_PLANILHA = "/import/spreadsheet/"

const get = vi.mocked(api.get)
const post = vi.mocked(api.post)

function resumo(extra: Partial<ImportSummary> = {}): ImportSummary {
  return {
    total: 12,
    imported: 7,
    ignored: 2,
    rejected: 3,
    suggested: 0,
    batch_id: LOTE,
    rejected_rows: [
      { line: 3, reason: "Data inválida" },
      { line: 6, reason: "Data inválida" },
      { line: 9, reason: "Texto longo demais: descrição" },
    ],
    ...extra,
  }
}

function erro400(dados: unknown) {
  return { response: { status: 400, data: dados } }
}

// Mapeamento enviado na chamada `n` (0 = a primeira) para `url`
function mapeamentoEnviado(url: string, n = 0): Record<string, string> {
  const chamadas = post.mock.calls.filter(([destino]) => destino === url)
  const dados = chamadas[n][1] as FormData
  return JSON.parse(dados.get("mapping") as string)
}

async function abrirComArquivo(nome = "extrato.csv") {
  const usuario = userEvent.setup({ applyAccept: false })
  const onOpenChange = vi.fn()
  render(<ImportDialog open onOpenChange={onOpenChange} type="SPREADSHEET" />)
  const campo = screen.getByLabelText(/arquivo/i) as HTMLInputElement
  await usuario.upload(campo, new File(["Data;Descrição;Valor\n"], nome))
  return { usuario, campo, onOpenChange }
}

async function irAoMapeamento() {
  const contexto = await abrirComArquivo()
  await contexto.usuario.click(screen.getByRole("button", { name: /próximo passo/i }))
  return contexto
}

async function importarAte(resultado: ImportSummary) {
  post.mockImplementation(((url: string) =>
    Promise.resolve({ data: url === URL_PREFLIGHT ? { accounts: ["Nubank"] } : resultado })) as typeof api.post)
  const contexto = await irAoMapeamento()
  await contexto.usuario.type(screen.getByPlaceholderText("Nome da Conta"), "Conta")
  await contexto.usuario.click(screen.getByRole("button", { name: /analisar planilha/i }))
  await contexto.usuario.click(await screen.findByRole("button", { name: /finalizar importação/i }))
  await screen.findByText("Importação Concluída")
  return contexto
}

describe("Diálogo de importação", () => {
  beforeEach(() => {
    vi.clearAllMocks()
    get.mockResolvedValue({ data: [{ id: "conta-1", name: "Nubank" }] })
  })

  it("a planilha aceita só .csv e .xlsx e recusa .xls com a mensagem do backend", async () => {
    const { campo } = await abrirComArquivo("extrato.xls")

    expect(campo).toHaveAttribute("accept", ".csv,.xlsx")
    expect(screen.getByText("Arquivo (.csv, .xlsx)")).toBeInTheDocument()
    expect(toast.error).toHaveBeenCalledWith(FORMATO_NAO_SUPORTADO)
    expect(FORMATO_NAO_SUPORTADO).toBe("Formato não suportado. Envie um arquivo OFX, CSV ou XLSX.")
    expect(screen.getByRole("button", { name: /próximo passo/i })).toBeDisabled()
    expect(post).not.toHaveBeenCalled()
  })

  it("o 400 do backend no campo file aparece pelo tratarErro", async () => {
    post.mockRejectedValue(erro400({ file: ["O arquivo passa do limite de 10.000 linhas."] }))
    const { usuario } = await irAoMapeamento()

    await usuario.click(screen.getByRole("button", { name: /analisar planilha/i }))

    expect(toast.error).toHaveBeenCalledWith("O arquivo passa do limite de 10.000 linhas.")
    expect(screen.queryByText("Importação Concluída")).not.toBeInTheDocument()
  })

  it("as colunas opcionais começam vazias e só vão se o usuário preencher", async () => {
    post.mockResolvedValue({ data: { accounts: [] } })
    const { usuario } = await irAoMapeamento()

    for (const opcional of ["Situação", "Categoria", "Subcategoria", "Tags", "Nome da Conta"]) {
      expect(screen.getByPlaceholderText(opcional)).toHaveValue("")
    }
    await usuario.click(screen.getByRole("button", { name: /analisar planilha/i }))
    expect(mapeamentoEnviado(URL_PREFLIGHT)).toEqual({
      date_column: "Data",
      description_column: "Descrição",
      amount_column: "Valor",
    })

    await usuario.type(screen.getByPlaceholderText("Categoria"), "Categoria")
    await usuario.click(screen.getByRole("button", { name: /analisar planilha/i }))
    expect(mapeamentoEnviado(URL_PREFLIGHT, 1)).toEqual({
      date_column: "Data",
      description_column: "Descrição",
      amount_column: "Valor",
      category_column: "Categoria",
    })
  })

  it("o resumo mostra os quatro totais e cada rejeitada com a linha e o motivo", async () => {
    await importarAte(resumo())

    expect(screen.getByText("Lidas").parentElement).toHaveTextContent(/^Σ12Lidas$/)
    expect(screen.getByText("Gravadas").parentElement).toHaveTextContent(/^7Gravadas$/)
    expect(screen.getByText("Ignoradas").parentElement).toHaveTextContent(/^2Ignoradas$/)
    expect(screen.getByText("Rejeitadas").parentElement).toHaveTextContent(/^3Rejeitadas$/)
    const lista = screen.getByRole("list")
    expect(within(lista).getAllByRole("listitem").map((item) => item.textContent)).toEqual([
      "•Linha 3: Data inválida",
      "•Linha 6: Data inválida",
      "•Linha 9: Texto longo demais: descrição",
    ])
    expect(mapeamentoEnviado(URL_PLANILHA)).toEqual({
      date_column: "Data",
      description_column: "Descrição",
      amount_column: "Valor",
      account_column: "Conta",
    })
    expect(screen.queryByText(/categoria sugerida/)).not.toBeInTheDocument()
  })

  it("com sugeridas, mostra quantas e o atalho para a lista filtrada", async () => {
    const { usuario, onOpenChange } = await importarAte(resumo({ suggested: 3 }))

    expect(screen.getByText("3 linhas com categoria sugerida")).toBeInTheDocument()
    const atalho = screen.getByRole("link", { name: /revisar sugeridas/i })
    expect(atalho).toHaveAttribute("href", `/transacoes?import_batch=${LOTE}&suggested_category=true`)
    await usuario.click(atalho)
    expect(onOpenChange).toHaveBeenCalledWith(false)
  })

  it("uma sugerida aparece no singular", async () => {
    await importarAte(resumo({ suggested: 1, rejected: 0, rejected_rows: [] }))

    expect(screen.getByText("1 linha com categoria sugerida")).toBeInTheDocument()
    expect(screen.queryByText("Linhas rejeitadas")).not.toBeInTheDocument()
  })
})
