import { render, screen, within } from "@testing-library/react"
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest"

import { InvoiceList } from "@/components/cards/invoice-list"
import { InvoicePaymentDialog } from "@/components/transactions/invoice-payment-dialog"
import { lerData, nomeDoMes } from "@/lib/datas"
import { api } from "@/services/apiClient"

// FATURA-43: as datas da fatura aparecem no dia e no mês gravados, sem
// deslocamento de fuso. FATURA-27: a fatura paga mostra o pagamento.

// O fuso de Brasília é o que expõe o deslocamento de new Date("yyyy-MM-dd")
process.env.TZ = "America/Sao_Paulo"

vi.mock("@/services/apiClient", async (importOriginal) => ({
  ...(await importOriginal<typeof import("@/services/apiClient")>()),
  api: { get: vi.fn(), post: vi.fn() },
}))

vi.mock("sonner", () => ({ toast: { success: vi.fn(), error: vi.fn() } }))

const get = vi.mocked(api.get)

const FATURA_ABERTA = {
  id: "fatura-1",
  credit_card_id: "cartao-1",
  month: 10,
  year: 2026,
  due_date: "2026-10-01",
  closing_date: "2026-09-24",
  status: "CLOSED",
  total_amount: "1000.00",
  payment: null,
}

const FATURA_PAGA = {
  id: "fatura-2",
  credit_card_id: "cartao-1",
  month: 9,
  year: 2026,
  due_date: "2026-09-01",
  closing_date: "2026-08-24",
  status: "PAID",
  total_amount: "700.00",
  payment: { amount: "700.00", account_id: "conta-1", account_name: "Banco Azul", date: "2026-09-05" },
}

function respostas(url: string) {
  const dados: Record<string, unknown> = {
    "/accounts/": [],
    "/invoices/fatura-1/": FATURA_ABERTA,
    "/credit-cards/cartao-1/": { id: "cartao-1", account_id: "conta-1" },
    "/credit-cards/cartao-1/invoices/": [FATURA_ABERTA, FATURA_PAGA],
  }
  return Promise.resolve({ data: dados[url] ?? [] })
}

describe("Datas da fatura sem deslocamento de fuso", () => {
  beforeEach(() => {
    get.mockReset()
    get.mockImplementation(respostas as typeof api.get)
  })

  afterEach(() => {
    vi.useRealTimers()
  })

  it("lerData mantém o dia gravado no fuso de Brasília", () => {
    // Confirma que o ambiente reproduz o bug: new Date volta um dia
    expect(new Date("2026-10-01").getDate()).toBe(30)

    const data = lerData("2026-10-01")
    expect([data.getFullYear(), data.getMonth() + 1, data.getDate()]).toEqual([2026, 10, 1])
  })

  it("o diálogo de pagamento mostra o vencimento 01/10/2026, em outubro", async () => {
    render(<InvoicePaymentDialog open onOpenChange={vi.fn()} onSuccess={vi.fn()} invoiceId="fatura-1" />)

    expect(await screen.findByText("01/10/2026")).toBeInTheDocument()
    expect(screen.getByText("outubro de 2026")).toBeInTheDocument()
  })

  it("a lista mostra o vencimento 01/10/2026 e o mês certo mesmo num dia 31", async () => {
    vi.useFakeTimers({ toFake: ["Date"] })
    vi.setSystemTime(new Date(2026, 7, 31, 12))

    expect(nomeDoMes(9)).toBe("setembro")
    expect(nomeDoMes(2)).toBe("fevereiro")

    render(<InvoiceList cardId="cartao-1" onPayInvoice={vi.fn()} />)

    const linhaOutubro = (await screen.findByText("01/10/2026")).closest("tr") as HTMLElement
    expect(within(linhaOutubro).getByText("outubro")).toBeInTheDocument()
    const linhaSetembro = screen.getByText("01/09/2026").closest("tr") as HTMLElement
    expect(within(linhaSetembro).getByText("setembro")).toBeInTheDocument()
  })

  it("a fatura paga mostra o valor, a conta e a data do pagamento", async () => {
    render(<InvoiceList cardId="cartao-1" onPayInvoice={vi.fn()} />)

    const linhaPaga = (await screen.findByText("01/09/2026")).closest("tr") as HTMLElement
    expect(within(linhaPaga).getByText(/^Pago R\$\s700,00 em 05\/09\/2026 · Banco Azul$/)).toBeInTheDocument()

    const linhaAberta = screen.getByText("01/10/2026").closest("tr") as HTMLElement
    expect(within(linhaAberta).queryByText(/^Pago /)).not.toBeInTheDocument()
  })
})
