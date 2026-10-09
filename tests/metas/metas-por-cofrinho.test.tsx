import { render, screen, within } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import { beforeEach, describe, expect, it, vi } from "vitest"

import GoalsPage from "@/app/(app)/metas/page"
import type { User } from "@/contexts/auth-context"
import { goalsService } from "@/services/goals"

import { usuario } from "../permissoes/acesso"
import { cofrinho, meta } from "./dados"

// META-04: as metas aparecem agrupadas por cofrinho, com o saldo, a soma das
// metas e o saldo livre. META-05: saldo livre negativo mostra o aviso. O
// rateio automático saiu (AD-028), e a ajuda não fala mais dele.

const auth = vi.hoisted(() => ({ user: null as User | null }))
const estadoDoAuth = () => ({ user: auth.user, isLoading: false, refreshUser: vi.fn() })

vi.mock("@/contexts/auth-context", () => ({ useAuth: () => estadoDoAuth() }))
vi.mock("@/hooks/use-auth", () => ({ useAuth: () => estadoDoAuth() }))
vi.mock("@/services/goals", () => ({
  goalsService: {
    getGoals: vi.fn(),
    getPiggyBanks: vi.fn(),
    deleteGoal: vi.fn(),
  },
}))
vi.mock("@/services/apiClient", async (importOriginal) => ({
  ...(await importOriginal<typeof import("@/services/apiClient")>()),
  api: { get: vi.fn().mockResolvedValue({ data: [] }), post: vi.fn(), delete: vi.fn() },
}))
vi.mock("sonner", () => ({ toast: Object.assign(vi.fn(), { success: vi.fn(), error: vi.fn(), info: vi.fn() }) }))
vi.mock("next/navigation", () => ({
  useRouter: () => ({ push: vi.fn(), replace: vi.fn() }),
  usePathname: () => "/metas",
  useSearchParams: () => new URLSearchParams(),
}))

const METAS = [
  meta({ id: "m1", name: "Viagem", current_amount: "300.00", account: "cofrinho-1" }),
  meta({ id: "m2", name: "Carro", current_amount: "200.00", account: "cofrinho-1" }),
  meta({ id: "m3", name: "Reserva", current_amount: "50.00", account: "cofrinho-2" }),
]

function cofrinhos(livreDaCasa = "200.00") {
  return [
    cofrinho({ account_id: "cofrinho-1", name: "Cofrinho Casa", balance: "700.00", goals_total: "500.00", free_balance: livreDaCasa }),
    cofrinho({ account_id: "cofrinho-2", name: "Cofrinho Férias", balance: "80.00", goals_total: "50.00", free_balance: "30.00" }),
  ]
}

describe("Metas agrupadas por cofrinho", () => {
  beforeEach(() => {
    vi.clearAllMocks()
    auth.user = usuario()
    vi.mocked(goalsService.getGoals).mockResolvedValue(METAS)
  })

  it("metas do mesmo cofrinho ficam no mesmo grupo, com saldo, soma e saldo livre", async () => {
    vi.mocked(goalsService.getPiggyBanks).mockResolvedValue(cofrinhos())
    render(<GoalsPage />)

    const casa = await screen.findByRole("region", { name: "Cofrinho Casa" })
    expect(within(casa).getByText("Viagem")).toBeInTheDocument()
    expect(within(casa).getByText("Carro")).toBeInTheDocument()
    expect(within(casa).queryByText("Reserva")).not.toBeInTheDocument()
    expect(within(casa).getByLabelText("Saldo do cofrinho")).toHaveTextContent(/^R\$\s700,00$/)
    expect(within(casa).getByLabelText("Soma das metas")).toHaveTextContent(/^R\$\s500,00$/)
    expect(within(casa).getByLabelText("Saldo livre")).toHaveTextContent(/^R\$\s200,00$/)

    const ferias = screen.getByRole("region", { name: "Cofrinho Férias" })
    expect(within(ferias).getByText("Reserva")).toBeInTheDocument()
    expect(within(ferias).getByLabelText("Saldo livre")).toHaveTextContent(/^R\$\s30,00$/)
  })

  it("saldo livre negativo mostra o aviso de cofrinho descoberto", async () => {
    vi.mocked(goalsService.getPiggyBanks).mockResolvedValue(cofrinhos("-200.00"))
    render(<GoalsPage />)

    const aviso = await screen.findByText("O cofrinho Cofrinho Casa tem R$ 200,00 a menos do que as metas somam.")
    expect(aviso).toBeInTheDocument()
    // O cofrinho com saldo livre positivo não tem aviso
    expect(screen.queryByText(/O cofrinho Cofrinho Férias tem/)).not.toBeInTheDocument()
  })

  it("sem saldo livre negativo, nenhum aviso aparece", async () => {
    vi.mocked(goalsService.getPiggyBanks).mockResolvedValue(cofrinhos("0.00"))
    render(<GoalsPage />)

    await screen.findByRole("region", { name: "Cofrinho Casa" })
    expect(screen.queryByText(/a menos do que as metas somam/)).not.toBeInTheDocument()
  })

  it("a ajuda não explica mais o rateio do cofrinho compartilhado", async () => {
    vi.mocked(goalsService.getPiggyBanks).mockResolvedValue(cofrinhos())
    render(<GoalsPage />)

    await userEvent.click(screen.getByRole("button", { name: "Ajuda da página" }))

    const ajuda = await screen.findByRole("dialog")
    expect(within(ajuda).queryByText(/proporcional/i)).not.toBeInTheDocument()
    expect(within(ajuda).getByRole("heading", { name: "Saldo Livre" })).toBeInTheDocument()
  })
})
