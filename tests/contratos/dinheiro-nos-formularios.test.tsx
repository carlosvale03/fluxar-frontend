import { fireEvent, render, screen } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import { beforeEach, describe, expect, it, vi } from "vitest"

import { BalanceAdjustmentDialog } from "@/components/accounts/balance-adjustment-dialog"
import { BudgetForm } from "@/components/budgets/BudgetForm"
import { GoalDepositForm } from "@/components/goals/GoalDepositForm"
import { GoalWithdrawForm } from "@/components/goals/GoalWithdrawForm"
import { SpareChangeBank } from "@/components/goals/SpareChangeBank"
import { Dialog, DialogContent } from "@/components/ui/dialog"
import { accountsService } from "@/services/accounts"
import { api } from "@/services/apiClient"
import * as orcamentos from "@/services/budgets"
import { goalsService } from "@/services/goals"
import { Account, AccountType } from "@/types/accounts"
import { Budget } from "@/types/budgets"
import { Goal } from "@/types/goals"

// CONTRATO-17: os formulários enviam texto decimal com duas casas,
// calculado sem ponto flutuante. CONTRATO-19: o valor digitado segue AD-009
// ("1.500" é R$ 1.500,00). CONTRATO-20: o novo saldo aceita o sinal de menos.

vi.mock("@/services/apiClient", async (importOriginal) => ({
  ...(await importOriginal<typeof import("@/services/apiClient")>()),
  api: { get: vi.fn(), post: vi.fn() },
}))

vi.mock("@/services/goals", () => ({
  goalsService: { deposit: vi.fn(), withdraw: vi.fn(), getSpareChange: vi.fn(), depositSpareChange: vi.fn() },
}))
vi.mock("@/services/accounts", () => ({ accountsService: { getAccounts: vi.fn() } }))
vi.mock("@/services/budgets", () => ({ createBudget: vi.fn(), updateBudget: vi.fn() }))
vi.mock("@/services/categories", () => ({
  getCategories: vi.fn().mockResolvedValue([
    { id: "cat-1", name: "Mercado", type: "EXPENSE", color: "#f00", icon: "Tag", subcategories: [] },
  ]),
}))
vi.mock("sonner", () => ({ toast: Object.assign(vi.fn(), { success: vi.fn(), error: vi.fn() }) }))

// O jsdom não tem estas APIs, que o Select do Radix usa ao abrir
Element.prototype.hasPointerCapture ??= () => false
Element.prototype.releasePointerCapture ??= () => {}
Element.prototype.scrollIntoView ??= () => {}

const CONTA = {
  id: "conta-1",
  name: "Banco",
  type: AccountType.CHECKING,
  balance: "5000.00",
  initial_balance: "0.00",
  is_active: true,
  created_at: "2026-01-01T00:00:00Z",
  updated_at: "2026-01-01T00:00:00Z",
} as Account

const META = {
  id: "meta-1",
  name: "Viagem",
  target_amount: "10000.00",
  current_amount: "2000.00",
  account: "cofrinho-1",
  status: "IN_PROGRESS",
  progress_percentage: 20,
  amount_remaining: "8000.00",
  created_at: "2026-01-01T00:00:00Z",
  updated_at: "2026-01-01T00:00:00Z",
} as Goal

async function escolher(nome: RegExp, indice = 0) {
  await userEvent.click(screen.getAllByRole("combobox")[indice])
  await userEvent.click(await screen.findByRole("option", { name: nome }))
}

function digitarValor(texto: string) {
  const campo = screen.getByRole("textbox")
  fireEvent.change(campo, { target: { value: texto } })
  fireEvent.blur(campo)
}

describe("Formulários enviam dinheiro em texto", () => {
  beforeEach(() => {
    vi.clearAllMocks()
    vi.mocked(accountsService.getAccounts).mockResolvedValue([CONTA])
  })

  it('aporte de "1.500" envia amount "1500.00"', async () => {
    vi.mocked(goalsService.deposit).mockResolvedValue({} as never)
    render(<GoalDepositForm goal={META} open onOpenChange={vi.fn()} onSuccess={vi.fn()} />)

    await escolher(/banco/i)
    digitarValor("1.500")
    await userEvent.click(screen.getByRole("button", { name: /confirmar aporte/i }))

    await vi.waitFor(() => expect(goalsService.deposit).toHaveBeenCalledTimes(1))
    expect(vi.mocked(goalsService.deposit).mock.calls[0][1]).toMatchObject({ amount: "1500.00", account_from: "conta-1" })
  })

  it('resgate de "1.500" envia amount "1500.00", dentro do saldo da meta em texto', async () => {
    vi.mocked(goalsService.withdraw).mockResolvedValue({} as never)
    render(<GoalWithdrawForm goal={META} open onOpenChange={vi.fn()} onSuccess={vi.fn()} />)

    await escolher(/banco/i)
    digitarValor("1.500")
    await userEvent.click(screen.getByRole("button", { name: /confirmar resgate/i }))

    await vi.waitFor(() => expect(goalsService.withdraw).toHaveBeenCalledTimes(1))
    expect(vi.mocked(goalsService.withdraw).mock.calls[0][1]).toMatchObject({ amount: "1500.00", account_to: "conta-1" })
  })

  it('ajuste para "-50,00" envia new_balance "-50.00"', async () => {
    vi.mocked(api.post).mockResolvedValue({ status: 201, data: {} })
    const onSuccess = vi.fn()
    render(<BalanceAdjustmentDialog open onOpenChange={vi.fn()} account={CONTA} onSuccess={onSuccess} />)

    digitarValor("-50,00")
    expect((screen.getByRole("textbox") as HTMLInputElement).value).toMatch(/^-R\$\s50,00$/)
    await userEvent.click(screen.getByRole("button", { name: /confirmar reajuste/i }))

    await vi.waitFor(() => expect(onSuccess).toHaveBeenCalledTimes(1))
    expect(api.post).toHaveBeenCalledWith("/accounts/conta-1/adjust-balance/", { new_balance: "-50.00" })
  })

  it("o limite do orçamento é um campo de dinheiro e vai como texto", async () => {
    vi.mocked(orcamentos.updateBudget).mockResolvedValue({} as Budget)
    const orcamento = {
      id: "orc-1",
      category: "cat-1",
      category_detail: { id: "cat-1", name: "Mercado" },
      amount_limit: "500.00",
      month: 10,
      year: 2026,
      total_spent: "0.00",
      percentage_used: 0,
      status: "OK",
    } as Budget
    render(
      <Dialog open>
        <DialogContent>
          <BudgetForm budget={orcamento} onSuccess={vi.fn()} onCancel={vi.fn()} />
        </DialogContent>
      </Dialog>,
    )

    expect((screen.getByRole("textbox") as HTMLInputElement).value).toMatch(/^R\$\s500,00$/)
    digitarValor("1.500")
    expect((screen.getByRole("textbox") as HTMLInputElement).value).toMatch(/^R\$\s1\.500,00$/)
    await userEvent.click(screen.getByRole("button", { name: /salvar alterações/i }))

    await vi.waitFor(() => expect(orcamentos.updateBudget).toHaveBeenCalledTimes(1))
    expect(vi.mocked(orcamentos.updateBudget).mock.calls[0][1]).toMatchObject({ amount_limit: "1500.00" })
  })

  it('o cofrinho mostra o total dos trocos que vem da API em texto: "0.30" é R$ 0,30', async () => {
    // META-37: os trocos de 10.90 e 20.80 (0.10 e 0.20) são somados pelo
    // backend; a tela não calcula troco nem envia valor (FE-10)
    vi.mocked(goalsService.getSpareChange).mockResolvedValue({
      active: true, goal: "meta-1", paused: false, pending_total: "0.30", pending_count: 2,
    })
    vi.mocked(goalsService.depositSpareChange).mockResolvedValue({
      deposits: [{ account_id: "conta-1", amount: "0.30" }], discarded: 0,
    })
    render(<SpareChangeBank goals={[META]} onSuccess={vi.fn()} />)

    expect(await screen.findByText(/^R\$\s0,30$/, { selector: "p" })).toBeInTheDocument()
    await userEvent.click(screen.getByRole("button", { name: /depositar trocos/i }))

    await vi.waitFor(() => expect(goalsService.depositSpareChange).toHaveBeenCalledTimes(1))
    expect(vi.mocked(goalsService.depositSpareChange).mock.calls[0]).toEqual([])
    expect(goalsService.deposit).not.toHaveBeenCalled()
    expect(api.get).not.toHaveBeenCalled()
  })
})
