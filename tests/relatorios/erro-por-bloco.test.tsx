import { cloneElement, type ReactElement } from "react"

import { render, screen, within } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import { AxiosError } from "axios"
import { beforeEach, describe, expect, it, vi } from "vitest"

import ReportsPage from "@/app/(app)/relatorios/page"
import * as relatorios from "@/services/reports"

// REL-24: se um bloco do relatório falhar ao carregar, a interface mostra o
// erro só naquele bloco, com a opção de tentar de novo, sem tirar os outros
// blocos da tela. "Tentar de novo" chama só a rota do bloco.

process.env.TZ = "America/Sao_Paulo"

vi.mock("@/contexts/auth-context", () => ({ useAuth: () => ({ user: null, isLoading: false }) }))
vi.mock("@/hooks/use-plan", () => ({ usePlan: () => ({ podeUsar: () => true }) }))
vi.mock("@/services/reports", () => ({
  getDashboardSummary: vi.fn(),
  getSimpleCharts: vi.fn(),
  getAdvancedCharts: vi.fn(),
  getMonthlyComparison: vi.fn(),
  getTagDistribution: vi.fn(),
}))
vi.mock("@/services/apiClient", async (importOriginal) => ({
  ...(await importOriginal<typeof import("@/services/apiClient")>()),
  api: { get: vi.fn().mockResolvedValue({ data: [] }), post: vi.fn() },
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

const RESUMO = {
  summary: {
    total_balance: "0.00",
    total_liquid_balance: "1500.00",
    monthly_income: "5000.00",
    monthly_expense: "180.00",
    net_result: "4820.00",
    total_credit_limit: "0.00",
    total_current_invoices: "0.00",
    payable: "50.00",
    net_worth: "0.00",
    net_worth_breakdown: { available: "0.00", reserves: "0.00", investments: "0.00", open_invoices: "0.00" },
    savings_rate: 14,
    saved_this_month: "700.00",
    total_investment_balance: "0.00",
    liquidity_ratio: 1,
    financial_score: 77,
  },
  budgets: { ok_count: 0, near_limit_count: 0, over_limit_count: 0 },
}

const GRAFICOS = {
  income_vs_expense: [],
  expense_by_category: [{ id: "a", category_name: "Mercado", amount: "180.00", color: "#f00", percentage: 100 }],
  income_by_category: [],
}

const COMPARACAO = [{ month: "Out", income: "5000.00", expense: "180.00", balance: "4820.00" }]

const AVANCADOS = {
  custom_monitoring: [
    {
      id: "m1",
      name: "Lazer",
      type: "category",
      current_month: "100.00",
      average_month: "200.00",
      status: "success",
    },
  ],
}

const foraDoAr = () => new AxiosError("Network Error", AxiosError.ERR_NETWORK)
const r = vi.mocked(relatorios)

beforeEach(() => {
  vi.clearAllMocks()
  r.getDashboardSummary.mockResolvedValue(RESUMO as never)
  r.getSimpleCharts.mockResolvedValue(GRAFICOS as never)
  r.getAdvancedCharts.mockResolvedValue(AVANCADOS as never)
  r.getMonthlyComparison.mockResolvedValue(COMPARACAO as never)
  r.getTagDistribution.mockResolvedValue({
    expense_by_tag: [{ id: "t1", name: "Viagem", amount: "90.00", color: "#0f0" }],
    income_by_tag: [],
  } as never)
})

const botoesDeTentar = () => screen.queryAllByRole("button", { name: "Tentar de novo" })

describe("Erro por bloco nos relatórios", () => {
  it("com a comparação mensal fora do ar, só esse bloco mostra o erro e os demais carregam", async () => {
    r.getMonthlyComparison.mockRejectedValue(foraDoAr())
    render(<ReportsPage />)

    const bloco = await screen.findByRole("region", { name: "Comparação mensal" })
    expect(within(bloco).getByRole("button", { name: "Tentar de novo" })).toBeInTheDocument()
    expect(botoesDeTentar()).toHaveLength(1)
    expect(screen.queryByText("Balanço por Mês")).not.toBeInTheDocument()

    // Os outros blocos seguem na tela, com os dados deles
    expect(await screen.findAllByText("Mercado")).not.toHaveLength(0)
    expect(await screen.findAllByText("Viagem")).not.toHaveLength(0)
    expect(screen.getByText("Distribuição de Gastos")).toBeInTheDocument()
    expect(screen.getByText("Despesas por Tag")).toBeInTheDocument()
  })

  it('"Tentar de novo" chama só a rota da comparação mensal e o gráfico volta', async () => {
    r.getMonthlyComparison.mockRejectedValueOnce(foraDoAr())
    render(<ReportsPage />)

    const bloco = await screen.findByRole("region", { name: "Comparação mensal" })
    await vi.waitFor(() => expect(r.getTagDistribution).toHaveBeenCalledTimes(1))
    await userEvent.click(within(bloco).getByRole("button", { name: "Tentar de novo" }))

    expect(await screen.findByText("Balanço por Mês")).toBeInTheDocument()
    expect(r.getMonthlyComparison).toHaveBeenCalledTimes(2)
    expect(r.getSimpleCharts).toHaveBeenCalledTimes(1)
    expect(r.getDashboardSummary).toHaveBeenCalledTimes(1)
    expect(r.getTagDistribution).toHaveBeenCalledTimes(1)
    expect(botoesDeTentar()).toHaveLength(0)
  })

  it("com os gráficos simples fora do ar, comparação e tags carregam; tentar de novo chama só /charts/simple/", async () => {
    r.getSimpleCharts.mockRejectedValueOnce(foraDoAr())
    render(<ReportsPage />)

    const bloco = await screen.findByRole("region", { name: "Fluxo e categorias" })
    expect(botoesDeTentar()).toHaveLength(1)
    // Sem dados, as distribuições por categoria não aparecem como vazias
    expect(screen.queryByText("Distribuição de Gastos")).not.toBeInTheDocument()
    expect(await screen.findByText("Balanço por Mês")).toBeInTheDocument()
    expect(await screen.findAllByText("Viagem")).not.toHaveLength(0)

    await userEvent.click(within(bloco).getByRole("button", { name: "Tentar de novo" }))
    expect(await screen.findAllByText("Mercado")).not.toHaveLength(0)
    expect(r.getSimpleCharts).toHaveBeenCalledTimes(2)
    expect(r.getMonthlyComparison).toHaveBeenCalledTimes(1)
    expect(r.getTagDistribution).toHaveBeenCalledTimes(1)
  })

  it("com os avançados fora do ar, a saúde financeira continua; tentar de novo chama só /charts/advanced/", async () => {
    r.getAdvancedCharts.mockRejectedValueOnce(foraDoAr())
    render(<ReportsPage />)
    await userEvent.click(screen.getByRole("button", { name: /Avançados/ }))

    const bloco = await screen.findByRole("region", { name: "Relatórios avançados" })
    expect(botoesDeTentar()).toHaveLength(1)
    expect(await screen.findByText("77/100")).toBeInTheDocument()

    await userEvent.click(within(bloco).getByRole("button", { name: "Tentar de novo" }))
    expect(await screen.findByText("Lazer")).toBeInTheDocument()
    expect(r.getAdvancedCharts).toHaveBeenCalledTimes(2)
    expect(r.getDashboardSummary).toHaveBeenCalledTimes(1)
    expect(botoesDeTentar()).toHaveLength(0)
  })

  it("com o resumo fora do ar, os avançados carregam e só a saúde financeira mostra o erro", async () => {
    r.getDashboardSummary.mockRejectedValueOnce(foraDoAr())
    render(<ReportsPage />)
    await userEvent.click(screen.getByRole("button", { name: /Avançados/ }))

    const bloco = await screen.findByRole("region", { name: "Saúde financeira" })
    expect(await screen.findByText("Lazer")).toBeInTheDocument()
    expect(botoesDeTentar()).toHaveLength(1)

    await userEvent.click(within(bloco).getByRole("button", { name: "Tentar de novo" }))
    expect(await screen.findByText("77/100")).toBeInTheDocument()
    expect(r.getDashboardSummary).toHaveBeenCalledTimes(2)
    expect(r.getAdvancedCharts).toHaveBeenCalledTimes(1)
  })
})
