import { cloneElement, type ReactElement } from "react"

import { render, screen } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import { beforeEach, describe, expect, it, vi } from "vitest"

import CalendarPage from "@/app/(app)/calendario/page"
import DashboardPage from "@/app/(app)/dashboard/page"
import ReportsPage from "@/app/(app)/relatorios/page"
import TagsPage from "@/app/(app)/tags/page"
import type { User } from "@/contexts/auth-context"
import * as relatorios from "@/services/reports"
import * as tags from "@/services/tags"
import type { ChaveDeRecurso } from "@/types/planos"

import { usuario } from "./acesso"

// PERM-19 e PERM-26: com relatorios_avancados, comparacao_mensal,
// analise_por_tag, monitor_de_foco, calendario ou personalizar_dashboard
// fechado, a tela mostra o aviso do plano e não chama a rota travada; com a
// trava aberta, carrega normalmente.

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
  getCalendarReport: vi.fn(),
}))
vi.mock("@/services/tags", () => ({ getTags: vi.fn(), deleteTag: vi.fn(), getTagInsights: vi.fn() }))
vi.mock("@/services/apiClient", async (importOriginal) => ({
  ...(await importOriginal<typeof import("@/services/apiClient")>()),
  api: { get: vi.fn().mockResolvedValue({ data: [] }), post: vi.fn() },
}))
vi.mock("sonner", () => ({ toast: Object.assign(vi.fn(), { success: vi.fn(), error: vi.fn() }) }))
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

const RESUMO = {
  summary: {
    total_balance: "0.00",
    total_liquid_balance: "0.00",
    monthly_income: "0.00",
    monthly_expense: "0.00",
    net_result: "0.00",
    total_credit_limit: "0.00",
    total_current_invoices: "0.00",
    net_worth: "0.00",
    savings_rate: 0,
    total_investment_balance: "0.00",
    liquidity_ratio: 0,
    financial_score: 0,
  },
  budgets: { ok_count: 0, near_limit_count: 0, over_limit_count: 0 },
  credit_cards: [],
  goals: { active_count: 0, average_progress: 0 },
}

const AVISO = "Este recurso não está disponível no seu plano."
const r = vi.mocked(relatorios)

function comAcesso(fechados: ChaveDeRecurso[] = []) {
  auth.user = usuario({ fechados })
}

beforeEach(() => {
  vi.clearAllMocks()
  r.getDashboardSummary.mockResolvedValue(RESUMO as never)
  r.getSimpleCharts.mockResolvedValue({ income_vs_expense: [], expense_by_category: [], income_by_category: [] } as never)
  r.getAdvancedCharts.mockResolvedValue({} as never)
  r.getMonthlyComparison.mockResolvedValue([])
  r.getTagDistribution.mockResolvedValue({ expense_by_tag: [], income_by_tag: [] } as never)
  r.getCalendarReport.mockResolvedValue({ days: [] } as never)
  vi.mocked(tags.getTags).mockResolvedValue([{ id: "t1", name: "Viagem", color: "#ff0000" }] as never)
  localStorage.clear()
})

describe("Relatórios", () => {
  it("relatorios_avancados fechado: a aba Avançados mostra o aviso e não chama /charts/advanced/", async () => {
    comAcesso(["relatorios_avancados"])
    render(<ReportsPage />)

    await userEvent.click(screen.getByRole("button", { name: /Avançados/ }))

    expect(await screen.findByRole("heading", { name: "Relatórios avançados" })).toBeInTheDocument()
    expect(screen.getByText(AVISO)).toBeInTheDocument()
    expect(r.getAdvancedCharts).not.toHaveBeenCalled()
  })

  it("comparacao_mensal fechado: mostra o aviso no lugar dos gráficos e não chama /monthly-comparison/", async () => {
    comAcesso(["comparacao_mensal"])
    render(<ReportsPage />)

    expect(await screen.findByRole("heading", { name: "Comparação mensal" })).toBeInTheDocument()
    expect(screen.queryByText("Balanço por Mês")).not.toBeInTheDocument()
    await vi.waitFor(() => expect(r.getSimpleCharts).toHaveBeenCalled())
    expect(r.getMonthlyComparison).not.toHaveBeenCalled()
    expect(r.getTagDistribution).toHaveBeenCalled()
  })

  it("analise_por_tag fechado: mostra o aviso no lugar da análise por tag e não chama /tag-distribution/", async () => {
    comAcesso(["analise_por_tag"])
    render(<ReportsPage />)

    expect(await screen.findByRole("heading", { name: "Análise por tag" })).toBeInTheDocument()
    expect(screen.queryByText("Despesas por Tag")).not.toBeInTheDocument()
    await vi.waitFor(() => expect(r.getSimpleCharts).toHaveBeenCalled())
    expect(r.getTagDistribution).not.toHaveBeenCalled()
    expect(r.getMonthlyComparison).toHaveBeenCalled()
  })

  it("monitor_de_foco fechado: o monitor dá lugar ao aviso, sem o botão de monitorar", async () => {
    comAcesso(["monitor_de_foco"])
    render(<ReportsPage />)

    await userEvent.click(screen.getByRole("button", { name: /Avançados/ }))

    expect(await screen.findByRole("heading", { name: "Monitor de foco" })).toBeInTheDocument()
    expect(screen.queryByText("Monitorar Nova Categoria/Tag")).not.toBeInTheDocument()
    expect(r.getAdvancedCharts).toHaveBeenCalled()
  })

  it("com as travas abertas, carrega comparação, tags, avançados e o monitor", async () => {
    comAcesso()
    render(<ReportsPage />)

    expect(await screen.findAllByText("Balanço por Mês")).not.toHaveLength(0)
    expect(screen.getAllByText("Despesas por Tag")).not.toHaveLength(0)
    await userEvent.click(screen.getByRole("button", { name: /Avançados/ }))
    expect(await screen.findByText("Monitorar Nova Categoria/Tag")).toBeInTheDocument()
    expect(r.getMonthlyComparison).toHaveBeenCalled()
    expect(r.getTagDistribution).toHaveBeenCalled()
    expect(r.getAdvancedCharts).toHaveBeenCalled()
    expect(screen.queryByText(AVISO)).not.toBeInTheDocument()
  })
})

describe("Calendário", () => {
  it("calendario fechado: mostra o aviso e não chama /reports/calendar/", async () => {
    comAcesso(["calendario"])
    render(<CalendarPage />)

    expect(screen.getByRole("heading", { name: "Calendário" })).toBeInTheDocument()
    expect(screen.getByText(AVISO)).toBeInTheDocument()
    expect(screen.queryByText("Fluxo Financeiro Mensal")).not.toBeInTheDocument()
    expect(r.getCalendarReport).not.toHaveBeenCalled()
  })

  it("calendario aberto: carrega o calendário do mês", async () => {
    comAcesso()
    render(<CalendarPage />)

    expect(screen.getByText(/Fluxo Financeiro Mensal/)).toBeInTheDocument()
    await vi.waitFor(() => expect(r.getCalendarReport).toHaveBeenCalledTimes(1))
    expect(screen.queryByText(AVISO)).not.toBeInTheDocument()
  })
})

describe("Dashboard", () => {
  // Layout salvo no navegador com os módulos de tag visíveis
  const LAYOUT_COM_TAGS = JSON.stringify([
    { id: "MONTHLY_BALANCE", visible: true },
    { id: "TAG_EXPENSE_DISTRIBUTION", visible: true },
    { id: "TAG_INCOME_SOURCE", visible: true },
  ])

  it("comparacao_mensal e analise_por_tag fechados: avisos no lugar dos módulos e nenhuma rota travada", async () => {
    localStorage.setItem("dashboard_layout_config", LAYOUT_COM_TAGS)
    comAcesso(["comparacao_mensal", "analise_por_tag"])
    render(<DashboardPage />)

    expect(await screen.findAllByRole("heading", { name: "Comparação mensal" })).not.toHaveLength(0)
    expect(screen.getAllByRole("heading", { name: "Análise por tag" })).toHaveLength(2)
    expect(screen.queryByText("Despesas por Tag")).not.toBeInTheDocument()
    expect(r.getDashboardSummary).toHaveBeenCalled()
    expect(r.getMonthlyComparison).not.toHaveBeenCalled()
    expect(r.getTagDistribution).not.toHaveBeenCalled()
  })

  it("personalizar_dashboard fechado: o botão dá lugar ao aviso e o layout salvo não vale", async () => {
    localStorage.setItem("dashboard_layout_config", LAYOUT_COM_TAGS)
    comAcesso(["personalizar_dashboard"])
    render(<DashboardPage />)

    expect(await screen.findByText(AVISO)).toBeInTheDocument()
    expect(screen.getByRole("link", { name: "Ver planos" })).toHaveAttribute("href", "/planos")
    expect(screen.queryByRole("button", { name: "Personalizar dashboard" })).not.toBeInTheDocument()
    // O layout padrão não mostra os módulos de tag
    expect(screen.queryByText("Despesas por Tag")).not.toBeInTheDocument()
  })

  it("com as travas abertas, carrega a comparação, as tags e deixa personalizar", async () => {
    localStorage.setItem("dashboard_layout_config", LAYOUT_COM_TAGS)
    comAcesso()
    render(<DashboardPage />)

    expect(await screen.findByRole("button", { name: "Personalizar dashboard" })).toBeInTheDocument()
    expect(screen.getAllByText("Despesas por Tag")).not.toHaveLength(0)
    expect(screen.queryByText(AVISO)).not.toBeInTheDocument()
    expect(r.getMonthlyComparison).toHaveBeenCalled()
    expect(r.getTagDistribution).toHaveBeenCalled()
  })
})

describe("Tags", () => {
  it("analise_por_tag fechado tira a análise da tag; aberto, ela abre /tag-insights/", async () => {
    comAcesso(["analise_por_tag"])
    const { unmount } = render(<TagsPage />)
    expect(await screen.findByText("Viagem")).toBeInTheDocument()
    expect(screen.queryByRole("button", { name: "Análise da tag Viagem" })).not.toBeInTheDocument()
    unmount()

    comAcesso()
    // A análise fica carregando: o teste só confere a chamada
    vi.mocked(tags.getTagInsights).mockReturnValue(new Promise(() => undefined) as never)
    render(<TagsPage />)
    await userEvent.click(await screen.findByRole("button", { name: "Análise da tag Viagem" }))
    expect(tags.getTagInsights).toHaveBeenCalledWith("t1", 6)
  })
})
