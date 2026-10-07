import { fireEvent, render, screen } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import { beforeEach, describe, expect, it, vi } from "vitest"

import { TransferFormDialog } from "@/components/transactions/transfer-form-dialog"
import { api } from "@/services/apiClient"
import { Transaction } from "@/types/transactions"

// SALDO-13 e SALDO-14: a edição manda ao backend a conta da perna editada
// (`account`), a da outra perna (`target_account_id`), o valor, a data e a
// descrição.

vi.mock("@/services/apiClient", async (importOriginal) => ({
  ...(await importOriginal<typeof import("@/services/apiClient")>()),
  api: { get: vi.fn(), post: vi.fn(), put: vi.fn(), patch: vi.fn() },
}))

vi.mock("sonner", () => ({ toast: { success: vi.fn(), error: vi.fn() } }))

const get = vi.mocked(api.get)
const put = vi.mocked(api.put)

const CONTAS = [
  { id: "conta-a", name: "Conta A", type: "CHECKING", is_active: true, balance: "1000.00" },
  { id: "conta-b", name: "Conta B", type: "CHECKING", is_active: true, balance: "500.00" },
]

const SAIDA = {
  id: "perna-saida",
  type: "TRANSFER_OUT",
  account: "conta-a",
  amount: "100.00",
  date: "2026-10-01",
  description: "Reserva",
  status: "COMPLETED",
  transfer_id: "tr-1",
  related_transaction: { id: "perna-entrada" },
  tags: [],
}

const ENTRADA = { ...SAIDA, id: "perna-entrada", type: "TRANSFER_IN", account: "conta-b", related_transaction: { id: "perna-saida" } }

function respostas(url: string) {
  const dados: Record<string, unknown> = {
    "/accounts/": CONTAS,
    "/transactions/perna-saida/": SAIDA,
    "/transactions/perna-entrada/": ENTRADA,
  }
  return Promise.resolve({ data: dados[url] ?? [] })
}

async function editarValorPara150(perna: typeof SAIDA) {
  render(
    <TransferFormDialog open onOpenChange={vi.fn()} onSuccess={vi.fn()} initialData={perna as unknown as Transaction} />
  )
  // CONTRATO-19: o campo de dinheiro mostra o valor em reais
  const valor = await screen.findByDisplayValue(/^R\$\s100,00$/)
  fireEvent.change(valor, { target: { value: "150,00" } })
  await userEvent.click(screen.getByRole("button", { name: /salvar alterações/i }))
  await vi.waitFor(() => expect(put).toHaveBeenCalledTimes(1))
  return put.mock.calls[0]
}

describe("Edição de transferência", () => {
  beforeEach(() => {
    get.mockReset()
    put.mockReset()
    get.mockImplementation(respostas as typeof api.get)
    put.mockResolvedValue({ data: {} })
  })

  it("editando a saída, account é a origem e target_account_id é o destino", async () => {
    const [url, corpo] = await editarValorPara150(SAIDA)

    expect(url).toBe("/transactions/perna-saida/")
    expect(corpo).toMatchObject({
      account: "conta-a",
      target_account_id: "conta-b",
      amount: "150.00",
      date: "2026-10-01",
      description: "Reserva",
    })
    expect(corpo).not.toHaveProperty("account_id")
  })

  it("editando a entrada, account é o destino e target_account_id é a origem", async () => {
    const [url, corpo] = await editarValorPara150(ENTRADA)

    expect(url).toBe("/transactions/perna-entrada/")
    expect(corpo).toMatchObject({
      account: "conta-b",
      target_account_id: "conta-a",
      amount: "150.00",
      date: "2026-10-01",
      description: "Reserva",
    })
    expect(corpo).not.toHaveProperty("account_id")
  })
})
