import { act, render, screen, within } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import { beforeEach, describe, expect, it, vi } from "vitest"

import TransactionsPage from "@/app/(app)/transacoes/page"
import type { User } from "@/contexts/auth-context"
import { api } from "@/services/apiClient"

import { usuario } from "../permissoes/acesso"
import { CINEMA, LAZER, PADARIA, TRANSPORTE, TRANSPORTE_DO_CINEMA, resposta } from "./dados"

// VINCULO-24: a principal mostra o custo total com a quantidade de
// dependentes. VINCULO-25: a dependente mostra "Por causa de: <descrição>,
// dd/mm/aaaa". VINCULO-31: o custo total abre a lista filtrada pela
// principal, com as dependentes (descrição, categoria e valor).

process.env.TZ = "America/Sao_Paulo"

const auth = vi.hoisted(() => ({ user: null as User | null }))
const navegacao = vi.hoisted(() => ({
  parametros: new URLSearchParams(),
  router: { push: vi.fn(), replace: vi.fn() },
}))

vi.mock("@/contexts/auth-context", () => ({ useAuth: () => ({ user: auth.user, isLoading: false, refreshUser: vi.fn() }) }))
vi.mock("next/navigation", () => ({
  useSearchParams: () => navegacao.parametros,
  useRouter: () => navegacao.router,
  usePathname: () => "/transacoes",
}))
vi.mock("sonner", () => ({ toast: Object.assign(vi.fn(), { success: vi.fn(), error: vi.fn(), info: vi.fn() }) }))
vi.mock("@/services/apiClient", async (importOriginal) => ({
  ...(await importOriginal<typeof import("@/services/apiClient")>()),
  api: { get: vi.fn(), post: vi.fn(), put: vi.fn(), patch: vi.fn(), delete: vi.fn() },
}))

const get = vi.mocked(api.get)

function servidor(resultados: unknown[]) {
  get.mockImplementation(((url: string) => {
    if (url.startsWith("/transactions/")) {
      return resposta({ count: resultados.length, total_pages: 1, results: resultados, day_totals: { "2026-09-12": "-95.00" } })
    }
    if (url.startsWith("/categories/")) return resposta([LAZER, TRANSPORTE])
    if (url === "/accounts/") return resposta([{ id: "conta-1", name: "Banco" }])
    return resposta([])
  }) as typeof api.get)
}

const chamadasDeTransacoes = () =>
  get.mock.calls
    .filter(([url]) => String(url).startsWith("/transactions/"))
    .map(([url]) => new URL(String(url), "http://x").searchParams)

const esperar = (ms: number) => act(() => new Promise((r) => setTimeout(r, ms)))

// A linha da tabela (desktop) com a descrição
const linha = (descricao: string) => screen.getAllByText(descricao).map((el) => el.closest("tr")).find(Boolean)!
// O cartão do celular com a descrição
const cartao = (descricao: string) =>
  screen.getAllByText(descricao).find((el) => !el.closest("tr"))!.closest(".rounded-\\[28px\\]") as HTMLElement

beforeEach(() => {
  vi.clearAllMocks()
  auth.user = usuario()
  navegacao.parametros = new URLSearchParams()
  servidor([CINEMA, TRANSPORTE_DO_CINEMA, PADARIA])
})

describe("Custo total e principal na lista", { timeout: 15000 }, () => {
  it("o cinema mostra \"Custo total R$ 95,00\" e 1 dependente, na tabela e no cartão do celular", async () => {
    render(<TransactionsPage />)
    await screen.findAllByText("Cinema")

    for (const lugar of [linha("Cinema"), cartao("Cinema")]) {
      expect(lugar).toHaveTextContent("Custo total R$ 95,00")
      expect(lugar).toHaveTextContent("1 gasto relacionado")
      expect(lugar).not.toHaveTextContent("Por causa de")
    }
    // Sem vínculo, nenhuma das marcas
    expect(linha("Padaria")).not.toHaveTextContent("Custo total")
    expect(linha("Padaria")).not.toHaveTextContent("Por causa de")
  })

  it("o transporte mostra \"Por causa de: Cinema, 12/09/2026\"", async () => {
    render(<TransactionsPage />)
    await screen.findAllByText("Uber até o cinema")

    for (const lugar of [linha("Uber até o cinema"), cartao("Uber até o cinema")]) {
      expect(lugar).toHaveTextContent("Por causa de: Cinema, 12/09/2026")
      expect(lugar).not.toHaveTextContent("Custo total")
    }
  })

  it("clicar no custo total abre a lista filtrada pela principal, sem abrir a edição", async () => {
    render(<TransactionsPage />)
    await screen.findAllByText("Cinema")

    await userEvent.click(within(cartao("Cinema")).getByRole("button", { name: /Custo total R\$\s95,00/ }))
    expect(navegacao.router.push).toHaveBeenCalledWith("/transacoes?principalId=t-cinema")
    expect(screen.queryByRole("dialog")).not.toBeInTheDocument()

    await userEvent.click(within(linha("Cinema")).getByRole("button", { name: /Custo total/ }))
    expect(navegacao.router.push).toHaveBeenCalledTimes(2)
  })

  it("com principalId na URL, envia o filtro sem o período e mostra a principal e as dependentes", async () => {
    navegacao.parametros = new URLSearchParams("principalId=t-cinema")
    servidor([CINEMA, TRANSPORTE_DO_CINEMA])
    render(<TransactionsPage />)
    await screen.findAllByText("Uber até o cinema")
    await esperar(400)

    const enviada = chamadasDeTransacoes()[0]
    expect(enviada.get("principalId")).toBe("t-cinema")
    // As dependentes podem ter outra data
    expect(enviada.has("startDate")).toBe(false)
    expect(enviada.has("endDate")).toBe(false)

    expect(screen.getByRole("status")).toHaveTextContent("Gasto principal e os gastos relacionados")
    const dependente = linha("Uber até o cinema")
    expect(dependente).toHaveTextContent("Transporte")
    expect(dependente).toHaveTextContent("R$ 45,00")
    expect(linha("Cinema")).toHaveTextContent("R$ 50,00")

    await userEvent.click(screen.getByRole("button", { name: /limpar filtro/i }))
    await esperar(400)
    expect(navegacao.router.replace).toHaveBeenCalledWith("/transacoes")
    const depois = chamadasDeTransacoes().at(-1)!
    expect(depois.has("principalId")).toBe(false)
    expect(depois.has("startDate")).toBe(true)
  })

  it("com o recurso travado, o custo total aparece, mas não abre o filtro travado", async () => {
    auth.user = usuario({ fechados: ["vinculos"] })
    render(<TransactionsPage />)
    await screen.findAllByText("Cinema")

    expect(linha("Cinema")).toHaveTextContent("Custo total R$ 95,00")
    expect(within(linha("Cinema")).queryByRole("button", { name: /Custo total/ })).not.toBeInTheDocument()
    expect(linha("Uber até o cinema")).toHaveTextContent("Por causa de: Cinema, 12/09/2026")
  })
})
