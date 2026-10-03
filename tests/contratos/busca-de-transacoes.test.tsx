import { act, fireEvent, render, screen } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import { toast } from "sonner"
import { beforeEach, describe, expect, it, vi } from "vitest"

import TransactionsPage from "@/app/(app)/transacoes/page"
import { api } from "@/services/apiClient"

// CONTRATO-05 a CONTRATO-08: a lista de transações busca uma vez por
// mudança, volta para a página 1 com o filtro novo, espera 300 ms na busca e
// descarta a resposta de uma busca já substituída.

process.env.TZ = "America/Sao_Paulo"

vi.mock("@/services/apiClient", async (importOriginal) => ({
  ...(await importOriginal<typeof import("@/services/apiClient")>()),
  api: { get: vi.fn(), post: vi.fn(), patch: vi.fn() },
}))

vi.mock("sonner", () => ({ toast: Object.assign(vi.fn(), { success: vi.fn(), error: vi.fn(), info: vi.fn() }) }))

vi.mock("next/navigation", () => {
  const parametros = new URLSearchParams()
  const router = { push: vi.fn(), replace: vi.fn() }
  return {
    useSearchParams: () => parametros,
    useRouter: () => router,
    usePathname: () => "/transacoes",
  }
})

const get = vi.mocked(api.get)

function transacao(id: string, descricao: string) {
  return {
    id,
    description: descricao,
    amount: "10.00",
    signed_amount: "-10.00",
    date: "2026-10-01",
    type: "EXPENSE",
    status: "COMPLETED",
    account: "conta-1",
    account_name: "Banco",
    category: null,
    tags: [],
  }
}

function pagina(descricao = "Padaria", numero = 1) {
  return {
    count: 100,
    total_pages: 5,
    current_page: numero,
    next: null,
    previous: null,
    results: [transacao(`t-${descricao}`, descricao)],
    day_totals: { "2026-10-01": "-10.00" },
  }
}

const chamadasDeTransacoes = () =>
  get.mock.calls.filter(([url]) => String(url).startsWith("/transactions/")).map(([url]) => new URL(String(url), "http://x").searchParams)

const esperar = (ms: number) => act(() => new Promise((r) => setTimeout(r, ms)))

function servidor() {
  get.mockImplementation(((url: string) => {
    if (url.startsWith("/transactions/")) {
      const numero = Number(new URL(url, "http://x").searchParams.get("page"))
      return Promise.resolve({ data: pagina("Padaria", numero) })
    }
    return Promise.resolve({ data: [] })
  }) as typeof api.get)
}

describe("Busca da lista de transações", () => {
  beforeEach(() => {
    get.mockReset()
    vi.mocked(toast.error).mockReset()
    servidor()
  })

  it("montar a tela faz um GET de transações", async () => {
    render(<TransactionsPage />)

    expect((await screen.findAllByText("Padaria")).length).toBeGreaterThan(0)
    await esperar(400)
    expect(chamadasDeTransacoes()).toHaveLength(1)
    expect(chamadasDeTransacoes()[0].get("page")).toBe("1")
  })

  it("mudar um filtro estando na página 3 faz um GET só, com page=1", async () => {
    const { container } = render(<TransactionsPage />)
    await screen.findAllByText("Padaria")

    const proximo = () => screen.getByRole("button", { name: "Próximo" })
    await userEvent.click(proximo())
    await vi.waitFor(() => expect(chamadasDeTransacoes().at(-1)?.get("page")).toBe("2"))
    await vi.waitFor(() => expect(proximo()).toBeEnabled())
    await userEvent.click(proximo())
    await vi.waitFor(() => expect(chamadasDeTransacoes().at(-1)?.get("page")).toBe("3"))
    const antes = chamadasDeTransacoes().length

    // Mês anterior: troca o filtro de período
    fireEvent.click(container.querySelector(".lucide-chevron-left")!.closest("button")!)
    await esperar(400)

    const novas = chamadasDeTransacoes().slice(antes)
    expect(novas).toHaveLength(1)
    expect(novas[0].get("page")).toBe("1")
  })

  it('digitar "mercado" faz um GET só, 300 ms depois da última tecla', async () => {
    render(<TransactionsPage />)
    await screen.findAllByText("Padaria")
    const antes = chamadasDeTransacoes().length
    const horarios: number[] = []
    get.mockImplementation(((url: string) => {
      if (url.startsWith("/transactions/")) horarios.push(Date.now())
      return Promise.resolve({ data: url.startsWith("/transactions/") ? pagina() : [] })
    }) as typeof api.get)

    await userEvent.type(screen.getByPlaceholderText("Busca..."), "mercado")
    const ultimaTecla = Date.now()
    expect(chamadasDeTransacoes().length).toBe(antes)
    await esperar(500)

    const novas = chamadasDeTransacoes().slice(antes)
    expect(novas).toHaveLength(1)
    expect(novas[0].get("search")).toBe("mercado")
    expect(novas[0].get("page")).toBe("1")
    expect(horarios[0] - ultimaTecla).toBeGreaterThanOrEqual(290)
  })

  it("uma resposta lenta que chega depois da mais nova não aparece e não mostra erro", async () => {
    let responderAntiga: (valor: unknown) => void = () => {}
    let primeira = true
    get.mockImplementation(((url: string) => {
      if (!url.startsWith("/transactions/")) return Promise.resolve({ data: [] })
      if (primeira) {
        primeira = false
        return new Promise<unknown>((resolver) => {
          responderAntiga = resolver
        })
      }
      return Promise.resolve({ data: pagina("Nova") })
    }) as typeof api.get)
    const { container } = render(<TransactionsPage />)
    await vi.waitFor(() => expect(chamadasDeTransacoes()).toHaveLength(1))

    fireEvent.click(container.querySelector(".lucide-chevron-left")!.closest("button")!)
    expect((await screen.findAllByText("Nova")).length).toBeGreaterThan(0)

    await act(async () => responderAntiga({ data: pagina("Antiga") }))

    // A busca antiga foi cancelada e a resposta dela foi descartada
    const configDaAntiga = get.mock.calls.find(([url]) => String(url).startsWith("/transactions/"))![1] as { signal: AbortSignal }
    expect(configDaAntiga.signal.aborted).toBe(true)
    expect(screen.queryByText("Antiga")).not.toBeInTheDocument()
    expect(screen.getAllByText("Nova").length).toBeGreaterThan(0)
    expect(toast.error).not.toHaveBeenCalled()
  })
})
