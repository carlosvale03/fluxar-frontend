import { render, screen, within } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import { beforeEach, describe, expect, it, vi } from "vitest"

import TransactionsPage from "@/app/(app)/transacoes/page"
import { CardExpenseFormDialog } from "@/components/transactions/card-expense-form-dialog"
import { TransactionDeleteDialog } from "@/components/transactions/transaction-delete-dialog"
import { api } from "@/services/apiClient"
import { Transaction } from "@/types/transactions"
import { toast } from "sonner"

// FATURA-16 e FATURA-17: a edição da compra no cartão carrega e envia a data
// da compra (purchase_date). FATURA-19: a recusa da compra em fatura paga
// aparece no toast. FATURA-20: excluir uma parcela exclui a compra inteira.

process.env.TZ = "America/Sao_Paulo"

vi.mock("@/services/apiClient", async (importOriginal) => ({
  ...(await importOriginal<typeof import("@/services/apiClient")>()),
  api: { get: vi.fn(), post: vi.fn(), put: vi.fn(), patch: vi.fn(), delete: vi.fn() },
}))

vi.mock("sonner", () => ({ toast: { success: vi.fn(), error: vi.fn(), info: vi.fn() } }))

vi.mock("next/navigation", () => ({
  useSearchParams: () => new URLSearchParams(),
  useRouter: () => ({ push: vi.fn() }),
  usePathname: () => "/transacoes",
}))

const get = vi.mocked(api.get)
const put = vi.mocked(api.put)
const del = vi.mocked(api.delete)

const RECUSA_FATURA_PAGA = "Estorne o pagamento da fatura antes de alterar esta compra."

// Parcela 1/3 que vence em 10/10/2026, comprada em 15/09/2026
const PARCELA = {
  id: "parcela-1",
  type: "CREDIT_CARD",
  description: "Notebook",
  amount: "300.00",
  date: "2026-10-10",
  purchase_date: "2026-09-15",
  status: "PENDING",
  credit_card: "cartao-1",
  category: "cat-1",
  is_installment: true,
  installment_number: 1,
  installment_total: 3,
  tags: [],
  created_at: "2026-09-15T12:00:00Z",
  updated_at: "2026-09-15T12:00:00Z",
}

function respostas(url: string) {
  const dados: Record<string, unknown> = {
    "/categories/?type=EXPENSE": [{ id: "cat-1", name: "Eletrônicos", color: "#000", subcategories: [] }],
    "/credit-cards/": [{ id: "cartao-1", name: "Cartão Roxo" }],
  }
  if (url.startsWith("/transactions/?")) return Promise.resolve({ data: [PARCELA] })
  return Promise.resolve({ data: dados[url] ?? [] })
}

function abrirEdicao(compra: Partial<typeof PARCELA> & { purchase_date: string | null }) {
  render(
    <CardExpenseFormDialog
      open
      onOpenChange={vi.fn()}
      onSuccess={vi.fn()}
      initialData={{ ...PARCELA, ...compra } as unknown as Transaction}
    />
  )
}

const botaoData = () => screen.getByRole("button", { name: "Data da Compra" })
const salvar = () => userEvent.click(screen.getByRole("button", { name: /salvar alterações/i }))

describe("Edição e exclusão da compra no cartão", () => {
  beforeEach(() => {
    get.mockReset()
    put.mockReset()
    del.mockReset()
    get.mockImplementation(respostas as typeof api.get)
    put.mockResolvedValue({ data: {} })
    vi.mocked(toast.error).mockReset()
  })

  it("carrega a data da compra e envia a data escolhida em purchase_date", async () => {
    abrirEdicao({ purchase_date: "2026-09-15" })

    await vi.waitFor(() => expect(botaoData()).toHaveTextContent("15 de set"))

    await userEvent.click(botaoData())
    await userEvent.click(within(await screen.findByRole("grid")).getByText("20"))
    await userEvent.click(screen.getByRole("button", { name: "OK" }))
    await vi.waitFor(() => expect(botaoData()).toHaveTextContent("20 de set"))
    await salvar()

    await vi.waitFor(() => expect(put).toHaveBeenCalledTimes(1))
    expect(put.mock.calls[0][0]).toBe("/transactions/parcela-1/")
    expect(put.mock.calls[0][1]).toEqual(expect.objectContaining({ purchase_date: "2026-09-20" }))
  })

  it("compra antiga sem purchase_date carrega a data gravada e a reenvia sem mudar", async () => {
    abrirEdicao({ purchase_date: null })

    await vi.waitFor(() => expect(botaoData()).toHaveTextContent("10 de out"))
    await salvar()

    await vi.waitFor(() => expect(put).toHaveBeenCalledTimes(1))
    expect(put.mock.calls[0][1]).toEqual(expect.objectContaining({ purchase_date: "2026-10-10" }))
  })

  it("mostra no toast a recusa da compra em fatura paga", async () => {
    put.mockRejectedValue({ response: { status: 400, data: { detail: RECUSA_FATURA_PAGA } } })
    abrirEdicao({ purchase_date: "2026-09-15" })

    await vi.waitFor(() => expect(botaoData()).toHaveTextContent("15 de set"))
    await salvar()

    await vi.waitFor(() => expect(toast.error).toHaveBeenCalledWith(RECUSA_FATURA_PAGA))
  })

  it("excluir uma parcela avisa que todas as parcelas saem e mostra a recusa do backend", async () => {
    del.mockRejectedValue({ response: { status: 400, data: { detail: RECUSA_FATURA_PAGA } } })
    render(
      <TransactionDeleteDialog
        open
        onOpenChange={vi.fn()}
        onSuccess={vi.fn()}
        transaction={PARCELA as unknown as Transaction}
      />
    )

    expect(screen.getByText("Todas as parcelas desta compra serão excluídas.")).toBeInTheDocument()

    await userEvent.click(screen.getByRole("button", { name: /^excluir/i }))
    await vi.waitFor(() => expect(toast.error).toHaveBeenCalledWith(RECUSA_FATURA_PAGA))
    expect(del).toHaveBeenCalledWith("/transactions/parcela-1/")
  })

  it("a lista de transações mostra a data da compra na linha da parcela", async () => {
    render(<TransactionsPage />)

    const linhas = await screen.findAllByText("Compra em 15/09")
    expect(linhas.length).toBeGreaterThan(0)
  })
})
