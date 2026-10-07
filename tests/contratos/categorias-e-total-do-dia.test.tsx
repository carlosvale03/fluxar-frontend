import { render, screen, within } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import { beforeEach, describe, expect, it, vi } from "vitest"

import TransactionsPage from "@/app/(app)/transacoes/page"
import { api } from "@/services/apiClient"

// CONTRATO-10 e CONTRATO-12: várias categorias no filtro, enviadas como
// categoryId repetido, sem expandir as subcategorias na tela (a API faz).
// CONTRATO-09: o total do dia vem de day_totals, não da soma da página.

process.env.TZ = "America/Sao_Paulo"

vi.mock("@/services/apiClient", async (importOriginal) => ({
  ...(await importOriginal<typeof import("@/services/apiClient")>()),
  api: { get: vi.fn(), post: vi.fn(), patch: vi.fn() },
}))

vi.mock("sonner", () => ({ toast: Object.assign(vi.fn(), { success: vi.fn(), error: vi.fn(), info: vi.fn() }) }))

vi.mock("next/navigation", () => {
  const parametros = new URLSearchParams()
  return {
    useSearchParams: () => parametros,
    useRouter: () => ({ push: vi.fn(), replace: vi.fn() }),
    usePathname: () => "/transacoes",
  }
})

const get = vi.mocked(api.get)

const CATEGORIAS = [
  {
    id: "alim",
    name: "Alimentação",
    type: "EXPENSE",
    color: "#f00",
    icon: "Utensils",
    parent: null,
    subcategories: [{ id: "rest", name: "Restaurante", type: "EXPENSE", color: "#f00", icon: "Utensils", parent: "alim" }],
  },
  { id: "transp", name: "Transporte", type: "EXPENSE", color: "#00f", icon: "Car", parent: null, subcategories: [] },
]

// Uma despesa de R$ 10,00 na página; o dia inteiro, no filtro, soma -R$ 250,00
const PAGINA = {
  count: 30,
  total_pages: 2,
  current_page: 1,
  next: null,
  previous: null,
  results: [
    { id: "t1", description: "Padaria", amount: "10.00", date: "2026-10-01", type: "EXPENSE", status: "COMPLETED", account: "c1", account_name: "Banco", tags: [] },
  ],
  day_totals: { "2026-10-01": "-250.00" },
}

function servidor(url: string) {
  if (url.startsWith("/transactions/")) return Promise.resolve({ data: PAGINA })
  if (url === "/categories/") return Promise.resolve({ data: CATEGORIAS })
  return Promise.resolve({ data: [] })
}

const ultimaBusca = () =>
  new URL(String(get.mock.calls.filter(([url]) => String(url).startsWith("/transactions/")).at(-1)![0]), "http://x").searchParams

describe("Várias categorias e total do dia", () => {
  beforeEach(() => {
    get.mockReset()
    get.mockImplementation(servidor as typeof api.get)
  })

  it("escolher duas categorias envia categoryId=a&categoryId=b, sem expandir as subcategorias", async () => {
    render(<TransactionsPage />)
    await screen.findAllByText("Padaria")

    await userEvent.click(screen.getByRole("button", { name: /refinar seleção/i }))
    const painel = await screen.findByRole("dialog")
    await userEvent.click(await within(painel).findByRole("checkbox", { name: "Alimentação" }))
    await userEvent.click(within(painel).getByRole("checkbox", { name: "Transporte" }))
    await userEvent.click(within(painel).getByRole("button", { name: /aplicar filtros/i }))

    await vi.waitFor(() => expect(ultimaBusca().getAll("categoryId")).toEqual(["alim", "transp"]))
    expect(ultimaBusca().get("page")).toBe("1")
  })

  it("o total do dia mostrado é o de day_totals, não a soma da página", async () => {
    render(<TransactionsPage />)
    await screen.findAllByText("Padaria")

    expect(screen.getByText(/^Saldo do Dia:\s+-R\$\s250,00$/)).toBeInTheDocument()
    expect(screen.queryByText(/Saldo do Dia:.*10,00/)).not.toBeInTheDocument()
  })

  it("um dia com saldo positivo mostra o sinal de mais e o valor de day_totals", async () => {
    get.mockImplementation(((url: string) =>
      url.startsWith("/transactions/")
        ? Promise.resolve({ data: { ...PAGINA, day_totals: { "2026-10-01": "1500.00" } } })
        : servidor(url)) as typeof api.get)
    render(<TransactionsPage />)
    await screen.findAllByText("Padaria")

    expect(screen.getByText(/^Saldo do Dia:\s\+\sR\$\s1\.500,00$/)).toBeInTheDocument()
  })
})
