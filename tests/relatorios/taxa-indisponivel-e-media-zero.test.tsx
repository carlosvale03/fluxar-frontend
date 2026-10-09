import { cloneElement, type ReactElement } from "react"

import { render, screen, within } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import { beforeEach, describe, expect, it, vi } from "vitest"

import ReportsPage from "@/app/(app)/relatorios/page"
import TagsPage from "@/app/(app)/tags/page"
import * as relatorios from "@/services/reports"
import * as tags from "@/services/tags"

// REL-22: sem receitas no mês, a taxa de poupança (savings_rate null) aparece
// como "Indisponível". REL-23: com média zero numa comparação, a interface
// mostra "Sem histórico para comparar" no lugar da porcentagem.

process.env.TZ = "America/Sao_Paulo"

vi.mock("@/contexts/auth-context", () => ({ useAuth: () => ({ user: null, isLoading: false }) }))
vi.mock("@/hooks/use-plan", () => ({ usePlan: () => ({ podeUsar: () => true, limiteAtingido: () => false, limite: () => null }) }))
vi.mock("@/services/reports", () => ({
  getDashboardSummary: vi.fn(),
  getSimpleCharts: vi.fn(),
  getAdvancedCharts: vi.fn(),
  getMonthlyComparison: vi.fn(),
  getTagDistribution: vi.fn(),
}))
vi.mock("@/services/tags", () => ({ getTags: vi.fn(), deleteTag: vi.fn(), getTagInsights: vi.fn() }))
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

const resumo = (savings_rate: number | null) => ({
  summary: {
    total_balance: "0.00",
    total_liquid_balance: "0.00",
    monthly_income: savings_rate === null ? "0.00" : "5000.00",
    monthly_expense: "0.00",
    net_result: "0.00",
    total_credit_limit: "0.00",
    total_current_invoices: "0.00",
    payable: "0.00",
    net_worth: "0.00",
    net_worth_breakdown: { available: "0.00", reserves: "0.00", investments: "0.00", open_invoices: "0.00" },
    savings_rate,
    saved_this_month: savings_rate === null ? "0.00" : "700.00",
    total_investment_balance: "0.00",
    liquidity_ratio: 0,
    financial_score: 40,
  },
  budgets: { ok_count: 0, near_limit_count: 0, over_limit_count: 0 },
})

const monitor = (current_month: string, average_month: string) => ({
  id: "m1",
  name: "Mercado",
  type: "category",
  icon: "ShoppingCart",
  color: "#3b82f6",
  current_month,
  average_month,
  status: "error",
})

const r = vi.mocked(relatorios)

beforeEach(() => {
  vi.clearAllMocks()
  r.getDashboardSummary.mockResolvedValue(resumo(null) as never)
  r.getSimpleCharts.mockResolvedValue({ income_vs_expense: [], expense_by_category: [], income_by_category: [] } as never)
  r.getAdvancedCharts.mockResolvedValue({ custom_monitoring: [monitor("150.00", "0.00")] } as never)
  r.getMonthlyComparison.mockResolvedValue([])
  r.getTagDistribution.mockResolvedValue({ expense_by_tag: [], income_by_tag: [] } as never)
})

async function abrirAvancados() {
  render(<ReportsPage />)
  await userEvent.click(screen.getByRole("button", { name: /Avançados/ }))
  await screen.findByText("Mercado")
}

const VALOR_IMPOSSIVEL = /Infinity|NaN|null|undefined/

describe("Taxa de poupança indisponível", () => {
  it('savings_rate null mostra "Indisponível" no Poder de Aporte, sem Infinity, NaN nem null', async () => {
    await abrirAvancados()

    await vi.waitFor(() => expect(screen.getAllByText("Indisponível")).toHaveLength(2))
    expect(screen.queryByText(VALOR_IMPOSSIVEL)).not.toBeInTheDocument()
    expect(screen.queryByText("0%")).not.toBeInTheDocument()
  })

  it("com receita no mês, a taxa aparece em porcentagem", async () => {
    r.getDashboardSummary.mockResolvedValue(resumo(14) as never)
    await abrirAvancados()

    await vi.waitFor(() => expect(screen.getAllByText("14%")).toHaveLength(2))
    expect(screen.queryByText("Indisponível")).not.toBeInTheDocument()
  })
})

describe("Comparação com média zero", () => {
  it('monitor de foco com average_month 0.00 mostra "Sem histórico para comparar" no lugar da porcentagem', async () => {
    await abrirAvancados()

    expect(screen.getByText("Sem histórico para comparar")).toBeInTheDocument()
    expect(screen.queryByText(/^\d+%$/)).not.toBeInTheDocument()
    expect(screen.queryByText(VALOR_IMPOSSIVEL)).not.toBeInTheDocument()
  })

  it("monitor de foco com média mostra a porcentagem do mês sobre a média", async () => {
    r.getDashboardSummary.mockResolvedValue(resumo(14) as never)
    r.getAdvancedCharts.mockResolvedValue({ custom_monitoring: [monitor("150.00", "200.00")] } as never)
    await abrirAvancados()

    expect(screen.getByText("75%")).toBeInTheDocument()
    expect(screen.queryByText("Sem histórico para comparar")).not.toBeInTheDocument()
  })

  it('o monitor de foco da tag com média zero mostra "Sem histórico para comparar"', async () => {
    vi.mocked(tags.getTags).mockResolvedValue([{ id: "t1", name: "Viagem", color: "#ff0000" }] as never)
    vi.mocked(tags.getTagInsights).mockResolvedValue({
      tag_name: "Viagem",
      color: "#ff0000",
      focus_monitor: { current_month: "300.00", average_month: "0.00", status: "error" },
      history_chart: [],
    } as never)
    render(<TagsPage />)

    await userEvent.click(await screen.findByRole("button", { name: "Análise da tag Viagem" }))

    const dialogo = await screen.findByRole("dialog")
    expect(await within(dialogo).findByText("Sem histórico para comparar")).toBeInTheDocument()
    expect(within(dialogo).queryByText(/^\d+%$/)).not.toBeInTheDocument()
    expect(within(dialogo).queryByText(VALOR_IMPOSSIVEL)).not.toBeInTheDocument()
  })
})
