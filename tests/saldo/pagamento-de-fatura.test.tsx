import { fireEvent, render, screen } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import { beforeEach, describe, expect, it, vi } from "vitest"

import { InvoicePaymentDialog } from "@/components/transactions/invoice-payment-dialog"
import { api } from "@/services/apiClient"
import { toast } from "sonner"

// SALDO-18 (CON-09): o pagamento de fatura exige uma fatura escolhida e
// nunca cria INVOICE_PAYMENT pelo endpoint genérico de transações.

vi.mock("@/services/apiClient", async (importOriginal) => ({
  ...(await importOriginal<typeof import("@/services/apiClient")>()),
  api: { get: vi.fn(), post: vi.fn() },
}))

vi.mock("sonner", () => ({ toast: { success: vi.fn(), error: vi.fn() } }))

const get = vi.mocked(api.get)
const post = vi.mocked(api.post)

const CONTA = { id: "conta-1", name: "Banco", type: "CHECKING", is_active: true, balance: "3000.00" }
const FATURA = {
  id: "fatura-1",
  credit_card_id: "cartao-1",
  due_date: "2026-10-10",
  status: "CLOSED",
  total_amount: "1000.00",
}

function respostas(url: string) {
  const dados: Record<string, unknown> = {
    "/accounts/": [CONTA],
    "/credit-cards/": [{ id: "cartao-1", name: "Cartão", account_id: "conta-1" }],
    "/invoices/fatura-1/": FATURA,
    "/credit-cards/cartao-1/": { id: "cartao-1", account_id: "conta-1" },
  }
  return Promise.resolve({ data: dados[url] ?? [] })
}

// O jsdom não tem estas APIs, que o Select do Radix usa ao abrir
Element.prototype.hasPointerCapture ??= () => false
Element.prototype.releasePointerCapture ??= () => {}
Element.prototype.scrollIntoView ??= () => {}

async function escolherConta() {
  await userEvent.click(screen.getAllByRole("combobox")[0])
  await userEvent.click(await screen.findByRole("option", { name: /banco/i }))
}

const botaoConfirmar = () => screen.getByRole("button", { name: /confirmar baixa/i })

describe("Pagamento de fatura exige a fatura", () => {
  beforeEach(() => {
    get.mockReset()
    post.mockReset()
    get.mockImplementation(respostas as typeof api.get)
    post.mockResolvedValue({ data: {} })
    vi.mocked(toast.error).mockReset()
  })

  it("sem fatura escolhida, bloqueia o envio e não chama /transactions/", async () => {
    const onSuccess = vi.fn()
    const { container } = render(<InvoicePaymentDialog open onOpenChange={vi.fn()} onSuccess={onSuccess} />)

    expect(await screen.findByText("Escolha a fatura a pagar.")).toBeInTheDocument()
    await vi.waitFor(() => expect(get).toHaveBeenCalledWith("/credit-cards/"))
    await escolherConta()
    await vi.waitFor(() => expect(botaoConfirmar()).toBeDisabled())

    // Mesmo um envio forçado do formulário não chega à API
    fireEvent.submit(document.querySelector("form") ?? container)
    await new Promise((r) => setTimeout(r, 50))

    expect(post).not.toHaveBeenCalled()
    expect(onSuccess).not.toHaveBeenCalled()
  })

  it("com a fatura, paga por /invoices/{id}/pay/", async () => {
    const onSuccess = vi.fn()
    render(
      <InvoicePaymentDialog open onOpenChange={vi.fn()} onSuccess={onSuccess} invoiceId="fatura-1" initialAmount={1000} />
    )

    await vi.waitFor(() => expect(get).toHaveBeenCalledWith("/credit-cards/cartao-1/"))
    await vi.waitFor(() => expect(botaoConfirmar()).toBeEnabled())
    expect(screen.queryByText("Escolha a fatura a pagar.")).not.toBeInTheDocument()

    await escolherConta()
    await userEvent.click(botaoConfirmar())

    await vi.waitFor(() => expect(onSuccess).toHaveBeenCalledTimes(1))
    expect(post).toHaveBeenCalledTimes(1)
    expect(post).toHaveBeenCalledWith(
      "/invoices/fatura-1/pay/",
      expect.objectContaining({ amount: 1000, account_id: "conta-1" })
    )
  })
})
