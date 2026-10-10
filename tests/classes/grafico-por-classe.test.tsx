import { cloneElement, type ReactElement } from "react"

import { render, screen, within } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import { beforeEach, describe, expect, it, vi } from "vitest"

import DashboardPage from "@/app/(app)/dashboard/page"
import ReportsPage from "@/app/(app)/relatorios/page"
import { ClassDistributionChart, porcentagemDaClasse } from "@/components/dashboard/ClassDistributionChart"
import type { User } from "@/contexts/auth-context"
import * as relatorios from "@/services/reports"

import { usuario } from "../permissoes/acesso"

// CLASSE-31: valor e porcentagem de uma casa sobre o total, na cor da
// classe e em cinza para "Sem classe". CLASSE-32: sem despesas, a mensagem.
// CLASSE-33: o clique abre a lista filtrada pela classe e pelo período dos
// gráficos, no dashboard e na tela Relatórios.

process.env.TZ = "America/Sao_Paulo"

const navegacao = vi.hoisted(() => ({ push: vi.fn() }))
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
  api: { get: vi.fn().mockResolvedValue({ data: [] }), post: vi.fn() },
}))
vi.mock("sonner", () => ({ toast: Object.assign(vi.fn(), { success: vi.fn(), error: vi.fn() }) }))
vi.mock("next/navigation", () => ({
  useRouter: () => ({ push: navegacao.push, replace: vi.fn() }),
  usePathname: () => "/",
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

const r = vi.mocked(relatorios)

// R$ 600,00 em Essencial, R$ 300,00 em Dispensável e R$ 100,00 sem classe
const POR_CLASSE = [
  { class_id: "ess", class_name: "Essencial", color: "#16A34A", amount: "600.00" },
  { class_id: "dis", class_name: "Dispensável", color: "#F97316", amount: "300.00" },
  { class_id: null, class_name: "Sem classe", color: "#94A3B8", amount: "100.00" },
]

const PERIODO = { start_date: "2026-09-01", end_date: "2026-09-30" }

const RESUMO = {
  summary: {
    total_balance: "0.00",
    total_liquid_balance: "0.00",
    monthly_income: "0.00",
    monthly_expense: "0.00",
    net_result: "0.00",
    total_credit_limit: "0.00",
    total_current_invoices: "0.00",
    payable: "0.00",
    net_worth: "0.00",
    net_worth_breakdown: { available: "0.00", reserves: "0.00", investments: "0.00", open_invoices: "0.00" },
    savings_rate: 0,
    saved_this_month: "0.00",
    total_investment_balance: "0.00",
    liquidity_ratio: 0,
    financial_score: 0,
  },
  budgets: { ok_count: 0, near_limit_count: 0, over_limit_count: 0 },
  credit_cards: [],
  goals: { active_count: 0, average_progress: 0 },
}

function linha(nome: string) {
  return screen.getByRole("button", { name: `Ver as transações de ${nome}` })
}

beforeEach(() => {
  vi.clearAllMocks()
  localStorage.clear()
  auth.user = usuario()
  r.getDashboardSummary.mockResolvedValue(RESUMO as never)
  r.getSimpleCharts.mockResolvedValue({
    income_vs_expense: [],
    expense_by_category: [],
    income_by_category: [],
    expense_by_class: POR_CLASSE,
    period: PERIODO,
  } as never)
  r.getAdvancedCharts.mockResolvedValue({} as never)
  r.getMonthlyComparison.mockResolvedValue([])
  r.getTagDistribution.mockResolvedValue({ expense_by_tag: [], income_by_tag: [] } as never)
})

describe("Gráfico por classe", () => {
  it("600, 300 e 100 aparecem com o valor e 60,0%, 30,0% e 10,0%, com 'Sem classe' em cinza", () => {
    render(<ClassDistributionChart data={POR_CLASSE} startDate="2026-09-01" endDate="2026-09-30" />)

    expect(linha("Essencial")).toHaveTextContent(/R\$\s600,00/)
    expect(linha("Essencial")).toHaveTextContent("60,0%")
    expect(linha("Dispensável")).toHaveTextContent(/R\$\s300,00/)
    expect(linha("Dispensável")).toHaveTextContent("30,0%")
    expect(linha("Sem classe")).toHaveTextContent(/R\$\s100,00/)
    expect(linha("Sem classe")).toHaveTextContent("10,0%")

    expect(within(linha("Essencial")).getByTestId("cor-da-classe")).toHaveStyle({ backgroundColor: "rgb(22, 163, 74)" })
    expect(within(linha("Dispensável")).getByTestId("cor-da-classe")).toHaveStyle({ backgroundColor: "rgb(249, 115, 22)" })
    expect(within(linha("Sem classe")).getByTestId("cor-da-classe")).toHaveStyle({ backgroundColor: "rgb(148, 163, 184)" })
  })

  it("a porcentagem é calculada em centavos e arredondada em uma casa", () => {
    render(
      <ClassDistributionChart
        data={[
          { class_id: "a", class_name: "A", color: "#16A34A", amount: "0.01" },
          { class_id: "b", class_name: "B", color: "#F97316", amount: "0.02" },
        ]}
      />,
    )

    expect(linha("A")).toHaveTextContent("33,3%")
    expect(linha("B")).toHaveTextContent("66,7%")
    expect(porcentagemDaClasse(1, 0)).toBe("0,0%")
  })

  it("sem despesas mostra 'Nenhuma despesa no período.'", () => {
    const { rerender } = render(<ClassDistributionChart data={[]} />)
    expect(screen.getByText("Nenhuma despesa no período.")).toBeInTheDocument()

    rerender(<ClassDistributionChart data={[{ class_id: null, class_name: "Sem classe", color: "#94A3B8", amount: "0.00" }]} />)
    expect(screen.getByText("Nenhuma despesa no período.")).toBeInTheDocument()
    expect(screen.queryByRole("button", { name: /Ver as transações/ })).not.toBeInTheDocument()
  })

  it("clicar numa classe abre /transacoes com classId e o período; 'Sem classe' usa sem_classe", async () => {
    render(<ClassDistributionChart data={POR_CLASSE} startDate="2026-09-01" endDate="2026-09-30" />)

    await userEvent.click(linha("Essencial"))
    expect(navegacao.push).toHaveBeenLastCalledWith("/transacoes?classId=ess&startDate=2026-09-01&endDate=2026-09-30")

    await userEvent.click(linha("Sem classe"))
    expect(navegacao.push).toHaveBeenLastCalledWith(
      "/transacoes?classId=sem_classe&startDate=2026-09-01&endDate=2026-09-30",
    )
  })

  it("na tela Relatórios sem os relatórios avançados, o clique usa o período dos gráficos simples", async () => {
    auth.user = usuario({ fechados: ["relatorios_avancados"] })
    render(<ReportsPage />)

    await userEvent.click(await screen.findByRole("button", { name: "Ver as transações de Dispensável" }))

    expect(navegacao.push).toHaveBeenLastCalledWith("/transacoes?classId=dis&startDate=2026-09-01&endDate=2026-09-30")
    expect(r.getAdvancedCharts).not.toHaveBeenCalled()
  })

  it("no dashboard, o gráfico fica ao lado das despesas por categoria e o clique usa o período dos gráficos", async () => {
    render(<DashboardPage />)

    await userEvent.click(await screen.findByRole("button", { name: "Ver as transações de Essencial" }))

    expect(screen.getByText("Despesas por Classe")).toBeInTheDocument()
    expect(navegacao.push).toHaveBeenLastCalledWith("/transacoes?classId=ess&startDate=2026-09-01&endDate=2026-09-30")
  })
})
