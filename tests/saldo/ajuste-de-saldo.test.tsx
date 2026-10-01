import { fireEvent, render, screen } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import { beforeEach, describe, expect, it, vi } from "vitest"

import { BalanceAdjustmentDialog } from "@/components/accounts/balance-adjustment-dialog"
import { api } from "@/services/apiClient"
import { toast } from "sonner"
import { Account, AccountType } from "@/types/accounts"

// SALDO-40 e SALDO-41: o diálogo manda o novo saldo para a rota de ajuste,
// em texto decimal, e não cria transação pelo endpoint genérico (CON-06).

vi.mock("@/services/apiClient", async (importOriginal) => ({
  ...(await importOriginal<typeof import("@/services/apiClient")>()),
  api: { post: vi.fn(), get: vi.fn() },
}))

vi.mock("sonner", () => ({ toast: { success: vi.fn(), error: vi.fn() } }))

const post = vi.mocked(api.post)

// A API manda o saldo como texto decimal
const conta = {
  id: "conta-1",
  name: "Banco",
  type: AccountType.CHECKING,
  balance: "1000.10",
  initial_balance: "0.00",
  is_active: true,
  created_at: "2026-01-01T00:00:00Z",
  updated_at: "2026-01-01T00:00:00Z",
} as unknown as Account

function abrir(onSuccess = vi.fn()) {
  render(<BalanceAdjustmentDialog open onOpenChange={vi.fn()} account={conta} onSuccess={onSuccess} />)
  return onSuccess
}

function informarNovoSaldo(texto: string) {
  fireEvent.change(screen.getByRole("textbox"), { target: { value: texto } })
}

const botaoConfirmar = () => screen.getByRole("button", { name: /confirmar reajuste/i })

describe("Ajuste de saldo pelo valor final", () => {
  beforeEach(() => {
    post.mockReset()
    vi.mocked(api.get).mockReset()
    vi.mocked(toast.error).mockReset()
  })

  it("envia o novo saldo 999.90 para a rota de ajuste, sem o endpoint genérico", async () => {
    post.mockResolvedValue({ status: 201, data: { id: "conta-1", balance: "999.90" } })
    const onSuccess = abrir()

    informarNovoSaldo("999,90")
    await userEvent.click(botaoConfirmar())

    await vi.waitFor(() => expect(onSuccess).toHaveBeenCalledTimes(1))
    expect(post).toHaveBeenCalledTimes(1)
    expect(post).toHaveBeenCalledWith("/accounts/conta-1/adjust-balance/", { new_balance: "999.90" })
    expect(post.mock.calls.some(([url]) => String(url).includes("/transactions/"))).toBe(false)
  })

  it("não envia nada quando o novo saldo é igual ao atual", async () => {
    abrir()

    informarNovoSaldo("1.000,10")

    expect(botaoConfirmar()).toBeDisabled()
    await userEvent.click(botaoConfirmar())
    expect(post).not.toHaveBeenCalled()
  })

  it("mostra a mensagem do backend quando o ajuste é recusado", async () => {
    post.mockRejectedValue({ response: { status: 400, data: { detail: "Conta não encontrada." } } })
    const onSuccess = abrir()

    informarNovoSaldo("999,90")
    await userEvent.click(botaoConfirmar())

    await vi.waitFor(() => expect(toast.error).toHaveBeenCalledWith("Conta não encontrada."))
    expect(onSuccess).not.toHaveBeenCalled()
  })
})
