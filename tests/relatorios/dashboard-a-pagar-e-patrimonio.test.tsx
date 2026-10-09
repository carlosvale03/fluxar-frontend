import { cloneElement, type ReactElement } from "react"

import { render, screen, within } from "@testing-library/react"
import { beforeEach, describe, expect, it, vi } from "vitest"

import DashboardPage from "@/app/(app)/dashboard/page"
import * as relatorios from "@/services/reports"

// REL-04: o dashboard mostra à parte, como "A pagar", as despesas pendentes.
// REL-15: o patrimônio aparece separado em disponível, reservas,
// investimentos e faturas em aberto. REL-18: as faturas do mês aparecem com
// o valor em aberto das faturas que vencem no mês.

process.env.TZ = "America/Sao_Paulo"

vi.mock("@/services/reports", () => ({
  getDashboardSummary: vi.fn(),
  getSimpleCharts: vi.fn(),
  getMonthlyComparison: vi.fn(),
  getTagDistribution: vi.fn(),
}))
vi.mock("@/services/apiClient", async (importOriginal) => ({
  ...(await importOriginal<typeof import("@/services/apiClient")>()),
  api: { get: vi.fn().mockResolvedValue({ data: [] }), post: vi.fn() },
}))
vi.mock("sonner", () => ({ toast: Object.assign(vi.fn(), { success: vi.fn(), error: vi.fn() }) }))
vi.mock("@/hooks/use-plan", () => ({ usePlan: () => ({ podeUsar: () => true }) }))
vi.mock("next/navigation", () => ({
  useRouter: () => ({ push: vi.fn(), replace: vi.fn() }),
  usePathname: () => "/dashboard",
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

// Independent Tests de REL-01 e REL-13: R$ 180,00 de despesas e R$ 50,00
// "A pagar"; patrimônio de R$ 5.350,00 = 3.000 + 800 + 2.000 - 450
const RESUMO = {
  summary: {
    total_balance: "3000.00",
    total_liquid_balance: "3000.00",
    monthly_income: "5000.00",
    monthly_expense: "180.00",
    net_result: "4820.00",
    total_credit_limit: "5000.00",
    total_current_invoices: "120.00",
    payable: "50.00",
    net_worth: "5350.00",
    net_worth_breakdown: {
      available: "3000.00",
      reserves: "800.00",
      investments: "2000.00",
      open_invoices: "450.00",
    },
    savings_rate: 14,
    saved_this_month: "700.00",
    total_investment_balance: "2000.00",
    liquidity_ratio: 1.5,
    financial_score: 70,
  },
  budgets: { ok_count: 0, near_limit_count: 0, over_limit_count: 0 },
  credit_cards: [],
  goals: { active_count: 0, average_progress: 0 },
}

const r = vi.mocked(relatorios)

beforeEach(() => {
  vi.clearAllMocks()
  localStorage.clear()
  r.getDashboardSummary.mockResolvedValue(RESUMO as never)
  r.getSimpleCharts.mockResolvedValue({ income_vs_expense: [], expense_by_category: [], income_by_category: [] } as never)
  r.getMonthlyComparison.mockResolvedValue([])
  r.getTagDistribution.mockResolvedValue({ expense_by_tag: [], income_by_tag: [] } as never)
})

const reais = (texto: string) => new RegExp(`^${texto.replace("R$ ", "R\\$\\s")}$`)

describe("Dashboard: A pagar, patrimônio e faturas do mês", () => {
  it('com payable 50.00, o card "A pagar" mostra R$ 50,00, separado das despesas do mês', async () => {
    render(<DashboardPage />)

    const aPagar = await screen.findByRole("group", { name: "A pagar" })
    expect(within(aPagar).getByText(reais("R$ 50,00"))).toBeInTheDocument()
    const despesas = screen.getByRole("group", { name: "Despesas do Mês" })
    expect(within(despesas).getByText(reais("R$ 180,00"))).toBeInTheDocument()
  })

  it("o patrimônio mostra o total e as quatro partes de net_worth_breakdown", async () => {
    render(<DashboardPage />)

    const patrimonio = await screen.findByRole("region", { name: "Patrimônio" })
    expect(within(patrimonio).getByText(reais("R$ 5.350,00"))).toBeInTheDocument()
    const parte = (nome: string) => within(patrimonio).getByRole("group", { name: nome })
    expect(within(parte("Disponível")).getByText(reais("R$ 3.000,00"))).toBeInTheDocument()
    expect(within(parte("Reservas")).getByText(reais("R$ 800,00"))).toBeInTheDocument()
    expect(within(parte("Investimentos")).getByText(reais("R$ 2.000,00"))).toBeInTheDocument()
    // As faturas em aberto saem do patrimônio
    expect(within(parte("Faturas em aberto")).getByText(reais("- R$ 450,00"))).toBeInTheDocument()
  })

  it("as faturas do mês mostram total_current_invoices", async () => {
    render(<DashboardPage />)

    const faturas = await screen.findByRole("group", { name: "Faturas do Mês" })
    expect(within(faturas).getByText(reais("R$ 120,00"))).toBeInTheDocument()
  })

  it("sem pendências, A pagar mostra R$ 0,00 e nada aparece como NaN", async () => {
    r.getDashboardSummary.mockResolvedValue({
      ...RESUMO,
      summary: { ...RESUMO.summary, payable: "0.00" },
    } as never)
    render(<DashboardPage />)

    const aPagar = await screen.findByRole("group", { name: "A pagar" })
    expect(within(aPagar).getByText(reais("R$ 0,00"))).toBeInTheDocument()
    expect(screen.queryByText(/NaN|undefined|null/)).not.toBeInTheDocument()
  })
})
