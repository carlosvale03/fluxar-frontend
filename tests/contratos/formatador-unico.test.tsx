import { readdirSync, readFileSync, statSync } from "node:fs"
import path from "node:path"
import { cloneElement, type ReactElement } from "react"

import { render, screen } from "@testing-library/react"
import { beforeEach, describe, expect, it, vi } from "vitest"

import DashboardPage from "@/app/(app)/dashboard/page"
import { MonthlyComparisonChart } from "@/components/dashboard/MonthlyComparisonChart"
import * as relatorios from "@/services/reports"

// CONTRATO-18: um formatador único em reais, inclusive nos eixos dos
// gráficos. CONTRATO-16: os valores chegam como texto, e nenhuma soma de dois
// valores da API pode concatenar texto.

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

// PERM-18: o acesso do /auth/me com tudo liberado
vi.mock("@/hooks/use-plan", () => ({ usePlan: () => ({ podeUsar: () => true }) }))

vi.mock("next/navigation", () => ({
  useRouter: () => ({ push: vi.fn(), replace: vi.fn() }),
  usePathname: () => "/dashboard",
  useSearchParams: () => new URLSearchParams(),
}))

// O ResponsiveContainer mede o elemento, e o jsdom não tem layout: o
// gráfico recebe um tamanho fixo para desenhar os eixos
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
    total_balance: "1000.10",
    total_liquid_balance: "1234.56",
    monthly_income: "2000.20",
    monthly_expense: "800.05",
    net_result: "1200.15",
    total_credit_limit: "5000.00",
    total_current_invoices: "300.30",
    net_worth: "1234.56",
    savings_rate: 60,
    total_investment_balance: "0.00",
    liquidity_ratio: 1.5,
    financial_score: 700,
  },
  budgets: { ok_count: 0, near_limit_count: 0, over_limit_count: 0 },
  credit_cards: [
    {
      id: "c1",
      name: "Cartão Azul",
      limit: "5000.00",
      current_invoice: "300.30",
      available_limit: "1234.56",
      color: "#2563eb",
      institution: "Banco",
      due_day: 10,
    },
  ],
  goals: { active_count: 0, average_progress: 0 },
}

// Duas categorias: "100.10" + "200.20" somam R$ 300,30; concatenando,
// daria "100.10200.20"
const GRAFICOS = {
  income_vs_expense: [],
  expense_by_category: [
    { id: "a", category_name: "Mercado", amount: "100.10", color: "#f00", percentage: 33 },
    { id: "b", category_name: "Aluguel", amount: "200.20", color: "#00f", percentage: 67 },
  ],
  income_by_category: [],
}

function arquivos(pasta: string): string[] {
  return readdirSync(pasta).flatMap((nome) => {
    const caminho = path.join(pasta, nome)
    return statSync(caminho).isDirectory() ? arquivos(caminho) : [caminho]
  })
}

describe("Formatador único", () => {
  beforeEach(() => {
    vi.mocked(relatorios.getDashboardSummary).mockResolvedValue(RESUMO as never)
    vi.mocked(relatorios.getSimpleCharts).mockResolvedValue(GRAFICOS as never)
    vi.mocked(relatorios.getMonthlyComparison).mockResolvedValue([
      { month: "Out", income: "2000.20", expense: "800.05", balance: "1200.15" },
    ] as never)
    vi.mocked(relatorios.getTagDistribution).mockResolvedValue({ expense_by_tag: [], income_by_tag: [] } as never)
  })

  it("nenhuma definição local de formatCurrency nem Intl.NumberFormat de moeda fora de src/lib/dinheiro.ts", () => {
    const raiz = path.resolve(__dirname, "../../src")
    const fora = arquivos(raiz)
      .filter((arquivo) => /\.(ts|tsx)$/.test(arquivo))
      .filter((arquivo) => !arquivo.endsWith(path.join("lib", "dinheiro.ts")))
      .filter((arquivo) => {
        const texto = readFileSync(arquivo, "utf-8")
        return (
          /const formatCurrency\w*\s*=/.test(texto) ||
          /Intl\.NumberFormat/.test(texto) ||
          /toLocaleString\([^)]*FractionDigits/.test(texto) ||
          /`R\$\s?\$\{/.test(texto)
        )
      })
      .map((arquivo) => path.relative(raiz, arquivo))
    expect(fora).toEqual([])
  })

  it("o eixo de um gráfico com 800 mostra R$ 800,00", async () => {
    const { container } = render(
      <MonthlyComparisonChart data={[{ month: "Out", income: "800.00", expense: "800.00", balance: "0.00" }]} />,
    )
    const marcas = () =>
      Array.from(container.querySelectorAll(".recharts-yAxis-tick-labels .recharts-cartesian-axis-tick-value")).map((marca) =>
        marca.textContent?.replace(/\s/g, " "),
      )
    await vi.waitFor(() => expect(marcas()).toContain("R$ 800,00"))
    expect(marcas()).toEqual(["R$ 0,00", "R$ 200,00", "R$ 400,00", "R$ 600,00", "R$ 800,00"])
  })

  it("o dashboard com valores em texto mostra os valores em reais e soma sem concatenar", async () => {
    render(<DashboardPage />)

    // KPIs no formato brasileiro, direto do texto da API
    expect(await screen.findByText(/^R\$\s1\.234,56$/, { selector: "h3" })).toBeInTheDocument()
    expect(screen.getByText(/^R\$\s2\.000,20$/, { selector: "h3" })).toBeInTheDocument()
    expect(screen.getByText(/^R\$\s1\.200,15$/, { selector: "h3" })).toBeInTheDocument()

    // Total da distribuição: "100.10" + "200.20" = R$ 300,30
    expect(screen.getByText(/^R\$\s300,30$/, { selector: "span" })).toBeInTheDocument()

    // Cartão: limite "5000.00" menos disponível "1234.56" = R$ 3.765,44 utilizado
    expect(screen.getByText(/^Utilizado:\sR\$\s3\.765,44$/)).toBeInTheDocument()

    expect(screen.queryByText(/NaN|100\.10200/)).not.toBeInTheDocument()
  })
})
