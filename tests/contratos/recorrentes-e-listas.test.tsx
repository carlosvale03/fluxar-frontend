import { readdirSync, readFileSync, statSync } from "node:fs"
import path from "node:path"

import { render, screen } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import { beforeEach, describe, expect, it, vi } from "vitest"

import RecurringTransactionsPage from "@/app/(app)/transacoes/recorrentes/page"
import { TransactionFormDialog } from "@/components/transactions/transaction-form-dialog"
import { api } from "@/services/apiClient"

// CONTRATO-15: a tela Recorrentes lista só as transações de série, com
// CONTRATO-05 (total e controles de página). CONTRATO-14: nenhuma chamada
// envia `limit`, que a API recusa; o tamanho da página é `page_size`.

process.env.TZ = "America/Sao_Paulo"

vi.mock("@/services/apiClient", async (importOriginal) => ({
  ...(await importOriginal<typeof import("@/services/apiClient")>()),
  api: { get: vi.fn(), post: vi.fn(), put: vi.fn(), patch: vi.fn() },
}))

vi.mock("sonner", () => ({ toast: Object.assign(vi.fn(), { success: vi.fn(), error: vi.fn(), info: vi.fn() }) }))

const get = vi.mocked(api.get)

function recorrente(n: number) {
  return {
    id: `r-${n}`,
    description: `Aluguel ${n}`,
    amount: "1500.00",
    date: "2026-10-01",
    type: "EXPENSE",
    frequency: "MONTHLY",
    is_recurring: true,
  }
}

function paginaDeRecorrentes(pagina: number) {
  return {
    count: 25,
    total_pages: 2,
    current_page: pagina,
    next: null,
    previous: null,
    results: pagina === 1 ? Array.from({ length: 20 }, (_, i) => recorrente(i + 1)) : Array.from({ length: 5 }, (_, i) => recorrente(i + 21)),
    day_totals: {},
  }
}

function arquivos(pasta: string): string[] {
  return readdirSync(pasta).flatMap((nome) => {
    const caminho = path.join(pasta, nome)
    return statSync(caminho).isDirectory() ? arquivos(caminho) : [caminho]
  })
}

describe("Recorrentes e outras listas de transações", () => {
  beforeEach(() => {
    get.mockReset()
    get.mockImplementation(((url: string, config?: { params?: { page?: number } }) => {
      if (url !== "/transactions/") return Promise.resolve({ data: [] })
      if (config?.params && "is_recurring" in config.params) return Promise.resolve({ data: paginaDeRecorrentes(config.params.page ?? 1) })
      // Transações vêm sempre paginadas (CONTRATO-02)
      return Promise.resolve({ data: { count: 0, total_pages: 1, current_page: 1, next: null, previous: null, results: [], day_totals: {} } })
    }) as typeof api.get)
  })

  it("Recorrentes pede is_recurring=true e mostra total e controles de página", async () => {
    render(<RecurringTransactionsPage />)

    expect(await screen.findByText("Aluguel 1")).toBeInTheDocument()
    expect(get).toHaveBeenCalledWith("/transactions/", { params: { is_recurring: "true", page: 1 } })
    expect(screen.getByText("25 transações")).toBeInTheDocument()
    expect(screen.getByText("1 de 2")).toBeInTheDocument()

    await userEvent.click(screen.getByRole("button", { name: /próx/i }))

    expect(await screen.findByText("Aluguel 25")).toBeInTheDocument()
    expect(get).toHaveBeenLastCalledWith("/transactions/", { params: { is_recurring: "true", page: 2 } })
    expect(screen.getByText("2 de 2")).toBeInTheDocument()
  })

  it("Recorrentes mostra a data sem hora no dia gravado", async () => {
    render(<RecurringTransactionsPage />)

    expect((await screen.findAllByText("01/10/2026")).length).toBe(20)
  })

  it("as sugestões do formulário de transação pedem page_size, sem limit", async () => {
    render(<TransactionFormDialog open onOpenChange={vi.fn()} onSuccess={vi.fn()} type="EXPENSE" />)

    await userEvent.type(screen.getByPlaceholderText(/Salário, Mercado/), "M")

    await vi.waitFor(() =>
      expect(get).toHaveBeenCalledWith("/transactions/", { params: { page_size: 50, type: "EXPENSE" } }),
    )
  })

  it("nenhuma chamada de src envia limit", () => {
    const fontes = arquivos(path.resolve(__dirname, "../../src")).filter((f) => /\.tsx?$/.test(f))
    const comLimit = fontes.filter((f) => /[?&]limit=|params:\s*\{[^}]*\blimit\b/.test(readFileSync(f, "utf-8")))

    expect(comLimit).toEqual([])
  })
})
