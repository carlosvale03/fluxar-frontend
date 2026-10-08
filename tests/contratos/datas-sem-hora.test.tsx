import { render, screen } from "@testing-library/react"
import { beforeAll, beforeEach, describe, expect, it, vi } from "vitest"

import GoalsPage from "@/app/(app)/metas/page"
import { GoalHistory } from "@/components/goals/GoalHistory"
import { hojeNaApi, paraApi } from "@/lib/datas"
import { goalsService } from "@/services/goals"
import { Goal } from "@/types/goals"

// CONTRATO-24 e CONTRATO-25: datas sem hora aparecem e vão para a API no dia
// gravado, no fuso de Brasília e no de Lisboa.

vi.mock("@/services/goals", () => ({
  goalsService: { getGoals: vi.fn(), getHistory: vi.fn() },
}))

vi.mock("@/hooks/use-auth", () => ({ useAuth: () => ({ user: { id: "u1" }, isLoading: false }) }))
// PERM-18: o acesso do /auth/me com tudo liberado
vi.mock("@/hooks/use-plan", () => ({ usePlan: () => ({ podeUsar: () => true }) }))
vi.mock("sonner", () => ({ toast: { success: vi.fn(), error: vi.fn() } }))

const META = {
  id: "meta-1",
  name: "Viagem",
  target_amount: "5000.00",
  current_amount: "1000.00",
  // Meia-noite UTC de 01/01 ainda é 31/12 no Brasil
  target_date: "2027-01-01",
  account: "conta-1",
  status: "IN_PROGRESS",
  progress_percentage: 20,
  amount_remaining: "4000.00",
  suggested_monthly_saving: "400.00",
  months_remaining: 10,
  created_at: "2026-01-01T12:00:00Z",
  updated_at: "2026-01-01T12:00:00Z",
} as unknown as Goal

const HISTORICO = [
  { id: "a1", goal: "meta-1", account: "conta-1", account_name: "Banco", amount: "100.00", type: "DEPOSIT", datetime: "2026-12-31" },
  { id: "a2", goal: "meta-1", account: "conta-1", account_name: "Banco", amount: "50.00", type: "DEPOSIT", datetime: "2028-02-29" },
]

describe.each(["America/Sao_Paulo", "Europe/Lisbon"])("Datas sem hora no fuso %s", (fuso) => {
  beforeAll(() => {
    process.env.TZ = fuso
  })

  beforeEach(() => {
    vi.mocked(goalsService.getGoals).mockResolvedValue([META])
    vi.mocked(goalsService.getHistory).mockResolvedValue(HISTORICO as never)
  })

  it("o fuso do teste está ativo", () => {
    // Em Brasília, new Date("2026-12-31") é 30/12 às 21h; em Lisboa, 31/12
    expect(new Date("2026-12-31").getDate()).toBe(fuso === "Europe/Lisbon" ? 31 : 30)
  })

  it('paraApi(new Date(2026, 11, 31, 23, 30)) dá "2026-12-31"', () => {
    expect(paraApi(new Date(2026, 11, 31, 23, 30))).toBe("2026-12-31")
  })

  it("hojeNaApi devolve o dia local, mesmo às 23h30", () => {
    vi.useFakeTimers({ toFake: ["Date"] })
    vi.setSystemTime(new Date(2026, 11, 31, 23, 30))
    try {
      expect(hojeNaApi()).toBe("2026-12-31")
    } finally {
      vi.useRealTimers()
    }
  })

  it("o histórico da meta mostra 31/12/2026 e 29/02/2028 no dia gravado", async () => {
    render(<GoalHistory goal={META} open onOpenChange={vi.fn()} />)

    expect(await screen.findByText("31 de dez, 2026")).toBeInTheDocument()
    expect(screen.getByText("29 de fev, 2028")).toBeInTheDocument()
  })

  it("a tela de metas mostra a data-alvo 01/01/2027 em janeiro de 2027", async () => {
    render(<GoalsPage />)

    expect(await screen.findByText(/atingir sua meta em janeiro de 2027\./)).toBeInTheDocument()
  })
})
