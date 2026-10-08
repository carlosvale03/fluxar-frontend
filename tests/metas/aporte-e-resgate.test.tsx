import { fireEvent, render, screen } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import { toast } from "sonner"
import { beforeEach, describe, expect, it, vi } from "vitest"

import { GoalDepositForm } from "@/components/goals/GoalDepositForm"
import { GoalWithdrawForm } from "@/components/goals/GoalWithdrawForm"
import { accountsService } from "@/services/accounts"
import { goalsService } from "@/services/goals"
import { AccountType } from "@/types/accounts"

import { cofrinho, conta, erroDaApi, meta } from "./dados"

// META-12 a META-18 e META-21: aporte e resgate com outra conta ou com o
// saldo livre do cofrinho; o próprio cofrinho não é conta de origem do
// aporte, e as recusas mostram a mensagem do backend.

vi.mock("@/services/goals", () => ({ goalsService: { deposit: vi.fn(), withdraw: vi.fn() } }))
vi.mock("@/services/accounts", () => ({ accountsService: { getAccounts: vi.fn() } }))
vi.mock("sonner", () => ({ toast: Object.assign(vi.fn(), { success: vi.fn(), error: vi.fn() }) }))

// O jsdom não tem estas APIs, que o Select do Radix usa ao abrir
Element.prototype.hasPointerCapture ??= () => false
Element.prototype.releasePointerCapture ??= () => {}
Element.prototype.scrollIntoView ??= () => {}

const META = meta({ current_amount: "300.00", account: "cofrinho-1" })
const COFRINHO = cofrinho({ balance: "700.00", free_balance: "200.00" })
const CONTAS = [
  conta({ id: "conta-1", name: "Banco" }),
  conta({ id: "cofrinho-1", name: "Cofrinho Casa", type: AccountType.PIGGY_BANK, balance: "700.00" }),
]

async function escolher(nome: RegExp) {
  await userEvent.click(screen.getByRole("combobox"))
  await userEvent.click(await screen.findByRole("option", { name: nome }))
}

function digitarValor(texto: string) {
  const campo = screen.getByRole("textbox")
  fireEvent.change(campo, { target: { value: texto } })
  fireEvent.blur(campo)
}

beforeEach(() => {
  vi.clearAllMocks()
  vi.mocked(accountsService.getAccounts).mockResolvedValue(CONTAS)
})

describe("Aporte na meta", () => {
  function abrir() {
    return render(<GoalDepositForm goal={META} cofrinho={COFRINHO} open onOpenChange={vi.fn()} onSuccess={vi.fn()} />)
  }

  it("o saldo livre do cofrinho envia from_free_balance, sem conta", async () => {
    vi.mocked(goalsService.deposit).mockResolvedValue({} as never)
    abrir()

    await escolher(/^saldo livre do cofrinho \(R\$\s200,00\)$/i)
    digitarValor("150,00")
    await userEvent.click(screen.getByRole("button", { name: /confirmar aporte/i }))

    await vi.waitFor(() => expect(goalsService.deposit).toHaveBeenCalledTimes(1))
    const [id, dados] = vi.mocked(goalsService.deposit).mock.calls[0]
    expect(id).toBe("meta-1")
    expect(dados).toMatchObject({ amount: "150.00", from_free_balance: true })
    expect(dados).not.toHaveProperty("account_from")
    expect(dados).not.toHaveProperty("account_id")
  })

  it("o próprio cofrinho não aparece entre as contas de origem", async () => {
    abrir()

    await userEvent.click(screen.getByRole("combobox"))

    expect(await screen.findByRole("option", { name: /banco/i })).toBeInTheDocument()
    expect(screen.queryByRole("option", { name: /cofrinho casa/i })).not.toBeInTheDocument()
  })

  it("outra conta envia a conta de origem, sem o saldo livre", async () => {
    vi.mocked(goalsService.deposit).mockResolvedValue({} as never)
    abrir()

    await escolher(/banco/i)
    digitarValor("100,00")
    await userEvent.click(screen.getByRole("button", { name: /confirmar aporte/i }))

    await vi.waitFor(() => expect(goalsService.deposit).toHaveBeenCalledTimes(1))
    const dados = vi.mocked(goalsService.deposit).mock.calls[0][1]
    expect(dados).toMatchObject({ amount: "100.00", account_from: "conta-1" })
    expect(dados).not.toHaveProperty("from_free_balance")
  })

  it.each([
    ["saldo livre insuficiente", "O saldo livre do cofrinho é de R$ 50,00."],
    ["meta arquivada", "Metas arquivadas não recebem aportes."],
  ])("a recusa por %s mostra a mensagem do backend", async (_, mensagem) => {
    vi.mocked(goalsService.deposit).mockRejectedValue(erroDaApi(400, { detail: mensagem, code: "invalid" }))
    const onSuccess = vi.fn()
    render(<GoalDepositForm goal={META} cofrinho={COFRINHO} open onOpenChange={vi.fn()} onSuccess={onSuccess} />)

    await escolher(/saldo livre do cofrinho/i)
    digitarValor("100,00")
    await userEvent.click(screen.getByRole("button", { name: /confirmar aporte/i }))

    await vi.waitFor(() => expect(toast.error).toHaveBeenCalledWith(mensagem))
    expect(onSuccess).not.toHaveBeenCalled()
  })
})

describe("Resgate da meta", () => {
  function abrir(onSuccess = vi.fn()) {
    return render(<GoalWithdrawForm goal={META} cofrinho={COFRINHO} open onOpenChange={vi.fn()} onSuccess={onSuccess} />)
  }

  it("o saldo livre do cofrinho envia to_free_balance, sem conta", async () => {
    vi.mocked(goalsService.withdraw).mockResolvedValue({} as never)
    abrir()

    await escolher(/^saldo livre do cofrinho$/i)
    digitarValor("100,00")
    await userEvent.click(screen.getByRole("button", { name: /confirmar resgate/i }))

    await vi.waitFor(() => expect(goalsService.withdraw).toHaveBeenCalledTimes(1))
    const [id, dados] = vi.mocked(goalsService.withdraw).mock.calls[0]
    expect(id).toBe("meta-1")
    expect(dados).toMatchObject({ amount: "100.00", to_free_balance: true })
    expect(dados).not.toHaveProperty("account_to")
  })

  it("mostra os limites: o valor da meta e o saldo do cofrinho", async () => {
    abrir()

    expect(await screen.findByText(/^Na meta: R\$\s300,00$/)).toBeInTheDocument()
    expect(screen.getByText(/^No cofrinho: R\$\s700,00$/)).toBeInTheDocument()
  })

  it.each([
    ["valor da meta", "A meta tem R$ 100,00 para resgatar."],
    ["saldo do cofrinho", "O cofrinho tem só R$ 80,00."],
  ])("a recusa pelo %s mostra a mensagem do backend", async (_, mensagem) => {
    vi.mocked(goalsService.withdraw).mockRejectedValue(erroDaApi(400, { detail: mensagem, code: "invalid" }))
    const onSuccess = vi.fn()
    abrir(onSuccess)

    await escolher(/banco/i)
    digitarValor("200,00")
    await userEvent.click(screen.getByRole("button", { name: /confirmar resgate/i }))

    await vi.waitFor(() => expect(toast.error).toHaveBeenCalledWith(mensagem))
    expect(onSuccess).not.toHaveBeenCalled()
  })
})
