import { cloneElement, type ReactElement } from "react"

import { render, screen, within } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import { beforeEach, describe, expect, it, vi } from "vitest"

import ReportsPage from "@/app/(app)/relatorios/page"
import { GastosPuxados } from "@/components/reports/GastosPuxados"
import type { User } from "@/contexts/auth-context"
import { api } from "@/services/apiClient"
import * as relatorios from "@/services/reports"

import { usuario } from "../permissoes/acesso"

// VINCULO-36: o relatório mostra, para cada categoria das principais, o total
// puxado e a divisão, como "Lazer puxou R$ 180,00 de Transporte". VINCULO-37:
// sem vínculos, "Nenhum gasto vinculado no período.". VINCULO-20: com o
// recurso travado, a seção fica dentro do aviso do plano e a rota não é
// chamada.

process.env.TZ = "America/Sao_Paulo"

const auth = vi.hoisted(() => ({ user: null as User | null }))
const estadoDoAuth = () => ({ user: auth.user, isLoading: false })

vi.mock("@/contexts/auth-context", () => ({ useAuth: () => estadoDoAuth() }))
vi.mock("@/hooks/use-auth", () => ({ useAuth: () => estadoDoAuth() }))
vi.mock("@/services/reports", () => ({
  getDashboardSummary: vi.fn(),
  getSimpleCharts: vi.fn(),
  getAdvancedCharts: vi.fn(),
  getMonthlyComparison: vi.fn(),
  getTagDistribution: vi.fn(),
}))
vi.mock("@/services/apiClient", async (importOriginal) => ({
  ...(await importOriginal<typeof import("@/services/apiClient")>()),
  api: { get: vi.fn(), post: vi.fn() },
}))
vi.mock("sonner", () => ({ toast: Object.assign(vi.fn(), { success: vi.fn(), error: vi.fn() }) }))
vi.mock("next/navigation", () => ({
  useRouter: () => ({ push: vi.fn(), replace: vi.fn() }),
  usePathname: () => "/relatorios",
  useSearchParams: () => new URLSearchParams(),
}))
vi.mock("recharts", async (importOriginal) => {
  const original = await importOriginal<typeof import("recharts")>()
  return {
    ...original,
    ResponsiveContainer: ({ children }: { children: ReactElement }) =>
      cloneElement(children as ReactElement<{ width: number; height: number }>, { width: 600, height: 300 }),
  }
})

const get = vi.mocked(api.get)
const r = vi.mocked(relatorios)

const RELATORIO = {
  groups: [
    {
      category_id: "cat-lazer",
      category_name: "Lazer",
      color: "#a855f7",
      total: "200.00",
      pulled: [
        { category_id: "cat-transp", category_name: "Transporte", color: "#3b82f6", amount: "180.00" },
        { category_id: null, category_name: "Sem categoria", color: "#CBD5E1", amount: "20.00" },
      ],
    },
    {
      category_id: "cat-viagem",
      category_name: "Viagem",
      color: "#f97316",
      total: "50.00",
      pulled: [{ category_id: "cat-alim", category_name: "Alimentação", color: "#16a34a", amount: "50.00" }],
    },
  ],
  period: { start_date: "2026-10-01", end_date: "2026-10-10" },
}

const VAZIO = { groups: [], period: { start_date: "2026-10-01", end_date: "2026-10-10" } }

const chamadasDoRelatorio = () => get.mock.calls.filter(([url]) => url === "/reports/linked-expenses/")

function servidor(relatorio: unknown = RELATORIO) {
  get.mockImplementation(((url: string) => {
    if (url === "/reports/linked-expenses/") return Promise.resolve({ data: relatorio })
    return Promise.resolve({ data: [] })
  }) as typeof api.get)
}

beforeEach(() => {
  vi.clearAllMocks()
  auth.user = usuario()
  servidor()
  r.getDashboardSummary.mockResolvedValue(null as never)
  r.getSimpleCharts.mockResolvedValue({ income_vs_expense: [], expense_by_category: [], income_by_category: [] } as never)
  r.getAdvancedCharts.mockResolvedValue({} as never)
  r.getMonthlyComparison.mockResolvedValue([])
  r.getTagDistribution.mockResolvedValue({ expense_by_tag: [], income_by_tag: [] } as never)
})

describe("Relatório de gastos puxados", { timeout: 15000 }, () => {
  it("mostra cada categoria das principais com o total e as linhas \"Lazer puxou R$ 180,00 de Transporte\"", async () => {
    render(<GastosPuxados period="this_month" />)

    const secao = screen.getByRole("region", { name: "Gastos puxados" })
    expect(await within(secao).findAllByText(/Lazer puxou/)).toHaveLength(2)
    expect(chamadasDoRelatorio()[0][1]).toEqual({ params: { period: "this_month" } })

    const grupos = within(secao).getAllByRole("listitem").filter((li) => li.querySelector("h4"))
    expect(grupos.map((g) => g.querySelector("h4")!.textContent)).toEqual(["Lazer", "Viagem"])
    expect(grupos[0]).toHaveTextContent("R$ 200,00 puxados")
    const linhas = within(grupos[0]).getAllByRole("listitem").map((li) => li.textContent?.replace(/\s+/g, " "))
    expect(linhas).toEqual(["Lazer puxou R$ 180,00 de Transporte", "Lazer puxou R$ 20,00 de Sem categoria"])
    expect(grupos[1]).toHaveTextContent("Viagem puxou R$ 50,00 de Alimentação")
    expect(within(secao).queryByText("Nenhum gasto vinculado no período.")).not.toBeInTheDocument()
  })

  it("sem gastos vinculados no período, mostra \"Nenhum gasto vinculado no período.\"", async () => {
    servidor(VAZIO)
    render(<GastosPuxados period="last_30_days" />)

    expect(await screen.findByText("Nenhum gasto vinculado no período.")).toBeInTheDocument()
    expect(screen.queryAllByRole("listitem")).toHaveLength(0)
    expect(chamadasDoRelatorio()[0][1]).toEqual({ params: { period: "last_30_days" } })
  })

  it("a falha aparece só no bloco, e \"Tentar de novo\" busca de novo", async () => {
    get.mockRejectedValueOnce({ response: { status: 500, data: {} } })
    render(<GastosPuxados period="this_month" />)

    await userEvent.click(await screen.findByRole("button", { name: "Tentar de novo" }))
    expect(await screen.findAllByText(/Lazer puxou/)).toHaveLength(2)
    expect(screen.queryByRole("button", { name: "Tentar de novo" })).not.toBeInTheDocument()
    expect(chamadasDoRelatorio()).toHaveLength(2)
  })

  it("na tela Relatórios, a seção aparece com o recurso liberado e segue o período", async () => {
    render(<ReportsPage />)

    const secao = await screen.findByRole("region", { name: "Gastos puxados" })
    expect(await within(secao).findAllByText(/Lazer puxou/)).toHaveLength(2)
    expect(chamadasDoRelatorio()[0][1]).toEqual({ params: { period: "this_month" } })

    await userEvent.click(screen.getByRole("button", { name: /90 Dias/ }))
    await vi.waitFor(() => expect(chamadasDoRelatorio().at(-1)![1]).toEqual({ params: { period: "last_90_days" } }))
  })

  it("com o recurso travado, mostra o aviso do plano no lugar da seção e não chama a rota", async () => {
    auth.user = usuario({ fechados: ["vinculos"] })
    render(<ReportsPage />)

    expect(await screen.findByRole("heading", { name: "Gastos puxados" })).toBeInTheDocument()
    await vi.waitFor(() => expect(r.getSimpleCharts).toHaveBeenCalled())
    expect(screen.queryByRole("region", { name: "Gastos puxados" })).not.toBeInTheDocument()
    expect(chamadasDoRelatorio()).toHaveLength(0)
  })
})
