import { act, render, screen } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import { beforeEach, describe, expect, it, vi } from "vitest"

import TransactionsPage from "@/app/(app)/transacoes/page"
import { TransactionFormDialog } from "@/components/transactions/transaction-form-dialog"
import { api } from "@/services/apiClient"
import { Transaction } from "@/types/transactions"

// IMPORT-45: a lista lê import_batch e suggested_category da URL, envia os
// dois e mostra o filtro ativo com a opção de limpar. IMPORT-46: a transação
// com categoria sugerida mostra "Sugerida pelo seu histórico" na lista
// (desktop e celular) e no formulário de edição.

process.env.TZ = "America/Sao_Paulo"

const LOTE = "6f1c2a7e-3b4d-4c5e-9f60-718293a4b5c6"
const SELO = "Sugerida pelo seu histórico"

const navegacao = vi.hoisted(() => ({
  parametros: new URLSearchParams(),
  router: { push: vi.fn(), replace: vi.fn() },
}))

vi.mock("@/services/apiClient", async (importOriginal) => ({
  ...(await importOriginal<typeof import("@/services/apiClient")>()),
  api: { get: vi.fn(), post: vi.fn(), patch: vi.fn(), put: vi.fn() },
}))

vi.mock("sonner", () => ({ toast: Object.assign(vi.fn(), { success: vi.fn(), error: vi.fn(), info: vi.fn() }) }))

vi.mock("next/navigation", () => ({
  useSearchParams: () => navegacao.parametros,
  useRouter: () => navegacao.router,
  usePathname: () => "/transacoes",
}))

const get = vi.mocked(api.get)

const TRANSPORTE = { id: "cat-1", name: "Transporte", type: "EXPENSE", color: "#3b82f6", icon: "Car", subcategories: [] }

function transacao(id: string, descricao: string, sugerida: boolean) {
  return {
    id,
    description: descricao,
    amount: "31.50",
    signed_amount: "-31.50",
    date: "2026-09-12",
    type: "EXPENSE",
    status: "COMPLETED",
    account: "conta-1",
    category: "cat-1",
    category_detail: TRANSPORTE,
    tags: [],
    import_batch: LOTE,
    category_suggested: sugerida,
    created_at: "2026-10-07T12:00:00Z",
    updated_at: "2026-10-07T12:00:00Z",
  }
}

function servidor(resultados = [transacao("t1", "UBER *TRIP 5678", true), transacao("t2", "Padaria", false)]) {
  get.mockImplementation(((url: string) => {
    if (url.startsWith("/transactions/")) {
      return Promise.resolve({
        data: { count: resultados.length, total_pages: 1, results: resultados, day_totals: { "2026-09-12": "-63.00" } },
      })
    }
    if (url.startsWith("/categories/")) return Promise.resolve({ data: [TRANSPORTE] })
    if (url === "/accounts/") return Promise.resolve({ data: [{ id: "conta-1", name: "Banco" }] })
    return Promise.resolve({ data: [] })
  }) as typeof api.get)
}

const chamadasDeTransacoes = () =>
  get.mock.calls
    .filter(([url]) => String(url).startsWith("/transactions/"))
    .map(([url]) => new URL(String(url), "http://x").searchParams)

const esperar = (ms: number) => act(() => new Promise((r) => setTimeout(r, ms)))

describe("Lista filtrada pela importação e selo de sugerida", () => {
  beforeEach(() => {
    vi.clearAllMocks()
    navegacao.parametros = new URLSearchParams()
    servidor()
  })

  it("a URL do atalho envia o lote e as sugeridas, mostra o filtro e permite limpar", async () => {
    navegacao.parametros = new URLSearchParams(`import_batch=${LOTE}&suggested_category=true`)
    render(<TransactionsPage />)
    await screen.findAllByText("UBER *TRIP 5678")
    await esperar(400)

    expect(chamadasDeTransacoes()).toHaveLength(1)
    const enviada = chamadasDeTransacoes()[0]
    expect(enviada.get("import_batch")).toBe(LOTE)
    expect(enviada.get("suggested_category")).toBe("true")
    // O extrato pode ser de outro mês: com o lote, o período não vai
    expect(enviada.has("startDate")).toBe(false)
    expect(enviada.has("endDate")).toBe(false)
    const filtro = screen.getByRole("status")
    expect(filtro).toHaveTextContent("Categorias sugeridas nesta importação")

    await userEvent.click(screen.getByRole("button", { name: /limpar filtro/i }))
    await esperar(400)

    expect(navegacao.router.replace).toHaveBeenCalledWith("/transacoes")
    expect(screen.queryByRole("status")).not.toBeInTheDocument()
    const depois = chamadasDeTransacoes().at(-1)!
    expect(depois.has("import_batch")).toBe(false)
    expect(depois.has("suggested_category")).toBe(false)
    expect(depois.has("startDate")).toBe(true)
  })

  it("sem os parâmetros, a lista não envia o lote nem mostra o filtro", async () => {
    render(<TransactionsPage />)
    await screen.findAllByText("UBER *TRIP 5678")
    await esperar(400)

    const enviada = chamadasDeTransacoes()[0]
    expect(enviada.has("import_batch")).toBe(false)
    expect(enviada.has("suggested_category")).toBe(false)
    expect(screen.queryByRole("status")).not.toBeInTheDocument()
  })

  it("a transação sugerida mostra o selo na tabela e no cartão do celular; as outras, não", async () => {
    render(<TransactionsPage />)
    const sugerida = await screen.findAllByText("UBER *TRIP 5678")
    const comum = screen.getAllByText("Padaria")

    // Um nome no cartão do celular e outro na linha da tabela
    expect(sugerida).toHaveLength(2)
    const linhaDaTabela = sugerida.map((el) => el.closest("tr")).find(Boolean)!
    const cartao = sugerida.find((el) => !el.closest("tr"))!.closest(".rounded-\\[28px\\]")!
    expect(linhaDaTabela).toHaveTextContent(SELO)
    expect(cartao).toHaveTextContent(SELO)
    expect(screen.getAllByText(SELO)).toHaveLength(2)
    for (const el of comum) {
      expect((el.closest("tr") ?? el.closest(".rounded-\\[28px\\]"))!).not.toHaveTextContent(SELO)
    }
  })

  it("o formulário de edição mostra o selo só na transação sugerida", async () => {
    const { rerender } = render(
      <TransactionFormDialog
        open onOpenChange={vi.fn()} type="EXPENSE" onSuccess={vi.fn()}
        initialData={transacao("t1", "UBER *TRIP 5678", true) as unknown as Transaction}
      />,
    )

    const selo = await screen.findByText(SELO)
    expect(selo.closest(".space-y-2")).toHaveTextContent(/categoria/i)

    rerender(
      <TransactionFormDialog
        open onOpenChange={vi.fn()} type="EXPENSE" onSuccess={vi.fn()}
        initialData={transacao("t2", "Padaria", false) as unknown as Transaction}
      />,
    )
    await esperar(50)
    expect(screen.queryByText(SELO)).not.toBeInTheDocument()
  })
})
