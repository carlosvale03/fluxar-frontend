import { render, screen, within } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import { toast } from "sonner"
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest"

import GoalsPage from "@/app/(app)/metas/page"
import { GoalForm } from "@/components/goals/GoalForm"
import type { User } from "@/contexts/auth-context"
import { accountsService } from "@/services/accounts"
import { goalsService } from "@/services/goals"
import { AccountType } from "@/types/accounts"

import { usuario } from "../permissoes/acesso"
import { cofrinho, conta, erroDaApi, meta } from "./dados"

// META-26: o cofrinho existente é escolhido só entre cofrinhos ativos.
// META-29: a recusa de excluir meta com valor vem do backend. META-30: excluir
// a última meta de um cofrinho zerado pergunta se exclui o cofrinho também.

const auth = vi.hoisted(() => ({ user: null as User | null }))
const estadoDoAuth = () => ({ user: auth.user, isLoading: false, refreshUser: vi.fn() })

vi.mock("@/contexts/auth-context", () => ({ useAuth: () => estadoDoAuth() }))
vi.mock("@/hooks/use-auth", () => ({ useAuth: () => estadoDoAuth() }))
vi.mock("@/services/goals", () => ({
  goalsService: { getGoals: vi.fn(), getPiggyBanks: vi.fn(), deleteGoal: vi.fn(), createGoal: vi.fn() },
}))
vi.mock("@/services/accounts", () => ({ accountsService: { getAccounts: vi.fn(), deleteAccount: vi.fn() } }))
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

// O jsdom não tem estas APIs, que o Select do Radix usa ao abrir
Element.prototype.hasPointerCapture ??= () => false
Element.prototype.releasePointerCapture ??= () => {}
Element.prototype.scrollIntoView ??= () => {}

beforeEach(() => {
  vi.clearAllMocks()
  auth.user = usuario()
})

afterEach(() => {
  vi.unstubAllGlobals()
})

describe("Formulário da meta", () => {
  it("o cofrinho existente é escolhido só entre cofrinhos ativos", async () => {
    vi.mocked(accountsService.getAccounts).mockResolvedValue([
      conta({ id: "conta-1", name: "Banco", type: AccountType.CHECKING }),
      conta({ id: "cofrinho-1", name: "Cofrinho Casa", type: AccountType.PIGGY_BANK }),
      conta({ id: "cofrinho-2", name: "Cofrinho Antigo", type: AccountType.PIGGY_BANK, is_active: false }),
    ])
    render(<GoalForm open onOpenChange={vi.fn()} initialData={null} onSuccess={vi.fn()} />)

    await userEvent.click(screen.getByRole("button", { name: /usar existente/i }))
    await userEvent.click(screen.getByText("Selecione um cofrinho...").closest("button") as HTMLElement)

    const opcoes = await screen.findAllByRole("option")
    expect(opcoes.map((opcao) => opcao.textContent)).toEqual([expect.stringMatching(/^Cofrinho Casa/)])
  })
})

describe("Exclusão da meta", () => {
  async function excluir(nome = "Viagem") {
    const titulo = await screen.findByText(nome)
    const cartao = titulo.closest("[class*='group']") as HTMLElement
    const botoes = within(cartao).getAllByRole("button")
    await userEvent.click(botoes.find((b) => b.getAttribute("aria-haspopup") === "menu") as HTMLElement)
    await userEvent.click(await screen.findByRole("menuitem", { name: /Excluir/ }))
  }

  function comMeta(trocas = {}) {
    vi.mocked(goalsService.getGoals).mockResolvedValue([meta({ id: "meta-1", name: "Viagem", ...trocas })])
    vi.mocked(goalsService.getPiggyBanks).mockResolvedValue([cofrinho({ account_id: "cofrinho-1", name: "Cofrinho Casa" })])
  }

  it("com o cofrinho vazio, pergunta e, confirmando, exclui o cofrinho", async () => {
    comMeta({ current_amount: "0.00" })
    vi.mocked(goalsService.deleteGoal).mockResolvedValue({ piggy_bank_empty: true })
    vi.mocked(accountsService.deleteAccount).mockResolvedValue(undefined)
    const confirmar = vi.fn(() => true)
    vi.stubGlobal("confirm", confirmar)
    render(<GoalsPage />)

    await excluir()

    await vi.waitFor(() => expect(accountsService.deleteAccount).toHaveBeenCalledWith("cofrinho-1"))
    expect(goalsService.deleteGoal).toHaveBeenCalledWith("meta-1")
    expect(confirmar).toHaveBeenLastCalledWith(
      "O cofrinho Cofrinho Casa ficou vazio e sem metas. Deseja excluir o cofrinho também?",
    )
  })

  it("sem confirmar, o cofrinho continua", async () => {
    comMeta({ current_amount: "0.00" })
    vi.mocked(goalsService.deleteGoal).mockResolvedValue({ piggy_bank_empty: true })
    const confirmar = vi.fn().mockReturnValueOnce(true).mockReturnValueOnce(false)
    vi.stubGlobal("confirm", confirmar)
    render(<GoalsPage />)

    await excluir()

    await vi.waitFor(() => expect(confirmar).toHaveBeenCalledTimes(2))
    expect(accountsService.deleteAccount).not.toHaveBeenCalled()
  })

  it("sem piggy_bank_empty, não pergunta pelo cofrinho", async () => {
    comMeta({ current_amount: "0.00" })
    vi.mocked(goalsService.deleteGoal).mockResolvedValue({ piggy_bank_empty: false })
    const confirmar = vi.fn(() => true)
    vi.stubGlobal("confirm", confirmar)
    render(<GoalsPage />)

    await excluir()

    await vi.waitFor(() => expect(toast.success).toHaveBeenCalledWith("Meta excluída com sucesso!"))
    expect(confirmar).toHaveBeenCalledTimes(1)
    expect(accountsService.deleteAccount).not.toHaveBeenCalled()
  })

  it("a falha ao excluir o cofrinho mostra a mensagem do backend", async () => {
    comMeta({ current_amount: "0.00" })
    vi.mocked(goalsService.deleteGoal).mockResolvedValue({ piggy_bank_empty: true })
    vi.mocked(accountsService.deleteAccount).mockRejectedValue(
      erroDaApi(400, { detail: "A conta só pode ser excluída com saldo zero." }),
    )
    vi.stubGlobal("confirm", () => true)
    render(<GoalsPage />)

    await excluir()

    await vi.waitFor(() => expect(toast.error).toHaveBeenCalledWith("A conta só pode ser excluída com saldo zero."))
  })

  it("a recusa de excluir meta com valor mostra a mensagem do backend", async () => {
    comMeta({ current_amount: "10.00" })
    vi.mocked(goalsService.deleteGoal).mockRejectedValue(
      erroDaApi(400, { detail: "Resgate o valor da meta antes de excluí-la.", code: "invalid" }),
    )
    vi.stubGlobal("confirm", () => true)
    render(<GoalsPage />)

    await excluir()

    await vi.waitFor(() => expect(toast.error).toHaveBeenCalledWith("Resgate o valor da meta antes de excluí-la."))
    expect(goalsService.deleteGoal).toHaveBeenCalledWith("meta-1")
    expect(accountsService.deleteAccount).not.toHaveBeenCalled()
  })
})
