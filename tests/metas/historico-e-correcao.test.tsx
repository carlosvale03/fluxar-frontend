import { render, screen } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import { beforeEach, describe, expect, it, vi } from "vitest"

import { GoalDetails } from "@/components/goals/GoalDetails"
import { GoalHistory } from "@/components/goals/GoalHistory"
import { goalsService } from "@/services/goals"
import { GoalTransaction } from "@/types/goals"

import { meta } from "./dados"

// META-32: o histórico vem paginado (CONTRATO-02) e a tela mostra o total e
// os controles de página. META-11: a meta corrigida mostra uma vez o valor de
// antes e o de depois, até o usuário confirmar com "Entendi".

vi.mock("@/hooks/use-auth", () => ({ useAuth: () => ({ user: { id: "u1" }, isLoading: false }) }))
vi.mock("@/services/goals", () => ({ goalsService: { getHistory: vi.fn(), dismissCorrection: vi.fn() } }))
vi.mock("sonner", () => ({ toast: Object.assign(vi.fn(), { success: vi.fn(), error: vi.fn() }) }))

function registro(id: string, trocas: Partial<GoalTransaction> = {}): GoalTransaction {
  return {
    id,
    goal: "meta-1",
    account: "conta-1",
    account_name: "Banco",
    amount: "100.00",
    type: "DEPOSIT",
    description: `Registro ${id}`,
    date: "2026-09-15",
    transaction: null,
    is_correction: false,
    ...trocas,
  }
}

function pagina(numero: number, results: GoalTransaction[]) {
  return { count: 45, total_pages: 3, current_page: numero, next: null, previous: null, results }
}

beforeEach(() => {
  vi.clearAllMocks()
})

describe("Histórico paginado", () => {
  it("pede a página 1, mostra o total e os controles e muda de página", async () => {
    vi.mocked(goalsService.getHistory)
      .mockResolvedValueOnce(pagina(1, [registro("r1"), registro("r2", { type: "WITHDRAWAL", amount: "40.00" })]))
      .mockResolvedValueOnce(pagina(2, [registro("r21")]))
    render(<GoalHistory goal={meta()} open onOpenChange={vi.fn()} />)

    expect(await screen.findByText("Registro r1")).toBeInTheDocument()
    expect(goalsService.getHistory).toHaveBeenCalledWith("meta-1", 1)
    expect(screen.getByText("45 registros")).toBeInTheDocument()
    expect(screen.getByText("1 de 3")).toBeInTheDocument()

    await userEvent.click(screen.getByRole("button", { name: /próx/i }))

    expect(await screen.findByText("Registro r21")).toBeInTheDocument()
    expect(goalsService.getHistory).toHaveBeenLastCalledWith("meta-1", 2)
    expect(screen.getByText("2 de 3")).toBeInTheDocument()
    expect(screen.queryByText("Registro r1")).not.toBeInTheDocument()
  })

  it("o registro de correção aparece como correção", async () => {
    vi.mocked(goalsService.getHistory).mockResolvedValue(
      pagina(1, [registro("c1", { is_correction: true, amount: "50.00", description: "Correção do valor da meta" })]),
    )
    render(<GoalHistory goal={meta()} open onOpenChange={vi.fn()} />)

    expect(await screen.findByText("Correção do valor da meta")).toBeInTheDocument()
    expect(screen.getByText("Correção")).toBeInTheDocument()
    expect(screen.queryByText("Aporte")).not.toBeInTheDocument()
  })
})

describe("Aviso da correção do valor", () => {
  function abrir(goal = meta(), onCorrectionDismissed = vi.fn()) {
    vi.mocked(goalsService.getHistory).mockResolvedValue(pagina(1, []))
    render(
      <GoalDetails
        open
        onOpenChange={vi.fn()}
        goal={goal}
        onOpenHistory={vi.fn()}
        onOpenDeposit={vi.fn()}
        onOpenSimulator={vi.fn()}
        onOpenWithdraw={vi.fn()}
        onCorrectionDismissed={onCorrectionDismissed}
      />,
    )
    return onCorrectionDismissed
  }

  it("mostra o valor de antes e o de depois, e \"Entendi\" chama dismiss-correction e esconde o aviso", async () => {
    vi.mocked(goalsService.dismissCorrection).mockResolvedValue(meta({ correction: null }))
    const aoConfirmar = abrir(meta({ current_amount: "0.00", correction: { before: "-50.00", after: "0.00" } }))

    const aviso = await screen.findByText(/^O valor desta meta foi corrigido de -R\$\s50,00 para R\$\s0,00\.$/)
    expect(aviso).toBeInTheDocument()

    await userEvent.click(screen.getByRole("button", { name: "Entendi" }))

    await vi.waitFor(() => expect(goalsService.dismissCorrection).toHaveBeenCalledWith("meta-1"))
    await vi.waitFor(() => expect(screen.queryByText(/foi corrigido/)).not.toBeInTheDocument())
    expect(aoConfirmar).toHaveBeenCalledTimes(1)
  })

  it("sem correção, não há aviso", async () => {
    abrir(meta({ correction: null }))

    await vi.waitFor(() => expect(goalsService.getHistory).toHaveBeenCalled())
    expect(screen.queryByText(/foi corrigido/)).not.toBeInTheDocument()
    expect(screen.queryByRole("button", { name: "Entendi" })).not.toBeInTheDocument()
  })
})
