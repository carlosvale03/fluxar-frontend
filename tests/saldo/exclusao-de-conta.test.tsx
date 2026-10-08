import { render, screen } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import { beforeEach, describe, expect, it, vi } from "vitest"

import AccountsPage from "@/app/(app)/contas/page"
import { api } from "@/services/apiClient"
import { toast } from "sonner"

// SALDO-32 e SALDO-33: quando o backend recusa a exclusão, a tela mostra a
// mensagem dele, que diz o que fazer antes de excluir.

vi.mock("@/services/apiClient", async (importOriginal) => ({
  ...(await importOriginal<typeof import("@/services/apiClient")>()),
  api: { get: vi.fn(), delete: vi.fn() },
}))

vi.mock("@/hooks/use-plan", () => ({
  // PERM-18: o acesso do /auth/me com tudo liberado e sem limite
  usePlan: () => ({ podeUsar: () => true, limite: () => ({ limit: null, used: 0 }), limiteAtingido: () => false }),
}))

vi.mock("sonner", () => ({ toast: { success: vi.fn(), error: vi.fn(), info: vi.fn() } }))

const get = vi.mocked(api.get)
const del = vi.mocked(api.delete)

const CONTA = {
  id: "conta-1",
  name: "Banco",
  type: "CHECKING",
  balance: "100.00",
  initial_balance: "100.00",
  is_active: true,
  created_at: "2026-01-01T00:00:00Z",
  updated_at: "2026-01-01T00:00:00Z",
}

const SALDO_32 = "Zere o saldo antes de excluir a conta: transfira ou ajuste o valor restante."
const SALDO_33 = "Resolva as transações pendentes antes de excluir a conta: efetive, mova ou exclua cada uma."

async function tentarExcluir() {
  render(<AccountsPage />)
  await userEvent.click(await screen.findByTitle("Excluir Conta"))
  await userEvent.click(await screen.findByRole("button", { name: /sim, excluir/i }))
}

describe("Exclusão de conta com a mensagem do backend", () => {
  beforeEach(() => {
    get.mockReset()
    del.mockReset()
    get.mockResolvedValue({ data: [CONTA] })
    vi.mocked(toast.error).mockReset()
    vi.mocked(toast.success).mockReset()
  })

  it("mostra a mensagem de SALDO-32 quando a conta tem saldo", async () => {
    del.mockRejectedValue({ response: { status: 400, data: { detail: SALDO_32 } } })

    await tentarExcluir()

    await vi.waitFor(() => expect(toast.error).toHaveBeenCalledWith(SALDO_32))
    expect(del).toHaveBeenCalledWith("/accounts/conta-1/")
    expect(toast.success).not.toHaveBeenCalled()
  })

  it("mostra a mensagem de SALDO-33 quando a conta tem pendentes", async () => {
    del.mockRejectedValue({ response: { status: 400, data: { detail: SALDO_33 } } })

    await tentarExcluir()

    await vi.waitFor(() => expect(toast.error).toHaveBeenCalledWith(SALDO_33))
    expect(toast.success).not.toHaveBeenCalled()
  })
})
