import { render, screen } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import { beforeEach, describe, expect, it, vi } from "vitest"

import { InvoicePaymentDialog } from "@/components/transactions/invoice-payment-dialog"
import { api } from "@/services/apiClient"
import { toast } from "sonner"

// FATURA-29: o diálogo envia um identificador da tentativa e o reaproveita
// em todo reenvio até o sucesso. Também preenche a conta pelo cartão da
// fatura e mostra a recusa do backend.

vi.mock("@/services/apiClient", async (importOriginal) => ({
  ...(await importOriginal<typeof import("@/services/apiClient")>()),
  api: { get: vi.fn(), post: vi.fn() },
}))

vi.mock("sonner", () => ({ toast: { success: vi.fn(), error: vi.fn() } }))

const get = vi.mocked(api.get)
const post = vi.mocked(api.post)

const CONTAS = [
  { id: "conta-1", name: "Banco Azul", type: "CHECKING", is_active: true, balance: "3000.00" },
  { id: "conta-2", name: "Carteira", type: "WALLET", is_active: true, balance: "100.00" },
]
const FATURA = {
  id: "fatura-1",
  credit_card_id: "cartao-1",
  month: 10,
  year: 2026,
  due_date: "2026-10-10",
  closing_date: "2026-10-03",
  status: "CLOSED",
  total_amount: "1000.00",
  payment: null,
}

function respostas(url: string) {
  const dados: Record<string, unknown> = {
    "/accounts/": CONTAS,
    "/invoices/fatura-1/": FATURA,
    "/credit-cards/cartao-1/": { id: "cartao-1", account_id: "conta-1" },
  }
  // Como na rede, cada resposta chega numa tarefa própria, depois da renderização
  return new Promise((resolve) => setTimeout(() => resolve({ data: dados[url] ?? [] }), 0))
}

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/

const botaoConfirmar = () => screen.getByRole("button", { name: /confirmar baixa/i })

function dialogo(open: boolean) {
  return (
    <InvoicePaymentDialog open={open} onOpenChange={vi.fn()} onSuccess={vi.fn()} invoiceId="fatura-1" initialAmount="1000.00" />
  )
}

async function confirmarQuandoPronto() {
  await screen.findByText("10/10/2026")
  await vi.waitFor(() => expect(botaoConfirmar()).toBeEnabled())
  await userEvent.click(botaoConfirmar())
}

const chaveDoEnvio = (n: number) => (post.mock.calls[n][1] as { idempotency_key: string }).idempotency_key

describe("Pagamento com identificador da tentativa", () => {
  beforeEach(() => {
    get.mockReset()
    post.mockReset()
    get.mockImplementation(respostas as typeof api.get)
    vi.mocked(toast.error).mockReset()
  })

  it("reenvia com a mesma chave depois de um timeout", async () => {
    post
      .mockRejectedValueOnce(Object.assign(new Error("timeout of 30000ms exceeded"), { code: "ECONNABORTED" }))
      .mockResolvedValueOnce({ data: { status: "PAID", payment: {} } })
    render(dialogo(true))

    await confirmarQuandoPronto()
    await vi.waitFor(() => expect(toast.error).toHaveBeenCalledTimes(1))
    await vi.waitFor(() => expect(botaoConfirmar()).toBeEnabled())
    await userEvent.click(botaoConfirmar())

    await vi.waitFor(() => expect(post).toHaveBeenCalledTimes(2))
    expect(chaveDoEnvio(0)).toMatch(UUID)
    expect(chaveDoEnvio(1)).toBe(chaveDoEnvio(0))
    expect(post.mock.calls[1][0]).toBe("/invoices/fatura-1/pay/")
  })

  it("fechar e abrir o diálogo gera uma chave nova", async () => {
    post.mockRejectedValue({ response: { status: 400, data: { detail: "Erro qualquer." } } })
    const { rerender } = render(dialogo(true))

    await confirmarQuandoPronto()
    await vi.waitFor(() => expect(post).toHaveBeenCalledTimes(1))

    rerender(dialogo(false))
    rerender(dialogo(true))
    await vi.waitFor(() => expect(get.mock.calls.filter(([url]) => url === "/invoices/fatura-1/")).toHaveLength(2))
    await confirmarQuandoPronto()

    await vi.waitFor(() => expect(post).toHaveBeenCalledTimes(2))
    expect(chaveDoEnvio(0)).toMatch(UUID)
    expect(chaveDoEnvio(1)).toMatch(UUID)
    expect(chaveDoEnvio(1)).not.toBe(chaveDoEnvio(0))
  })

  it("abre com a conta de pagamento do cartão da fatura", async () => {
    post.mockResolvedValue({ data: { status: "PAID", payment: {} } })
    render(dialogo(true))

    await vi.waitFor(() => expect(get).toHaveBeenCalledWith("/credit-cards/cartao-1/"))
    await vi.waitFor(() => expect(screen.getAllByRole("combobox")[0]).toHaveTextContent("Banco Azul"))

    // Sem escolher a conta, o envio já leva a conta do cartão
    await confirmarQuandoPronto()
    await vi.waitFor(() => expect(post).toHaveBeenCalledTimes(1))
    expect(post).toHaveBeenCalledWith(
      "/invoices/fatura-1/pay/",
      expect.objectContaining({ account_id: "conta-1", amount: "1000.00" })
    )
  })

  it("mostra no toast a mensagem 400 do backend", async () => {
    post.mockRejectedValue({
      response: { status: 400, data: { detail: "O valor pago não pode ser maior que o total da fatura." } },
    })
    render(dialogo(true))

    await confirmarQuandoPronto()

    await vi.waitFor(() =>
      expect(toast.error).toHaveBeenCalledWith("O valor pago não pode ser maior que o total da fatura.")
    )
  })
})
