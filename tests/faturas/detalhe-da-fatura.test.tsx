import { render, screen } from "@testing-library/react"
import { beforeEach, describe, expect, it, vi } from "vitest"

import { InvoiceDetailsDialog } from "@/components/cards/invoice-details-dialog"
import { api } from "@/services/apiClient"
import { Invoice } from "@/types/cards"

// FATURA-44: o detalhe lista todas as compras da fatura, qualquer que seja a
// quantidade. FATURA-16: cada compra mostra a data da compra.

process.env.TZ = "America/Sao_Paulo"

vi.mock("@/services/apiClient", async (importOriginal) => ({
  ...(await importOriginal<typeof import("@/services/apiClient")>()),
  api: { get: vi.fn() },
}))

const get = vi.mocked(api.get)

const FATURA = {
  id: "fatura-1",
  credit_card_id: "cartao-1",
  month: 10,
  year: 2026,
  due_date: "2026-10-10",
  closing_date: "2026-10-03",
  status: "OPEN",
  total_amount: 350,
  payment: null,
} as Invoice

function compra(n: number, purchase_date: string | null) {
  return {
    id: `compra-${n}`,
    description: `Compra ${n}`,
    amount: "10.00",
    date: "2026-10-10",
    purchase_date,
    status: "PENDING",
    is_installment: false,
  }
}

describe("Detalhe da fatura com todas as compras", () => {
  beforeEach(() => {
    get.mockReset()
  })

  it("uma fatura com 35 compras lista as 35", async () => {
    const compras = Array.from({ length: 35 }, (_, i) => compra(i + 1, "2026-09-15"))
    get.mockResolvedValue({ data: compras })

    render(<InvoiceDetailsDialog open onOpenChange={vi.fn()} invoice={FATURA} />)

    expect(await screen.findByText("Compra 35")).toBeInTheDocument()
    expect(screen.getAllByText(/^Compra \d+$/)).toHaveLength(35)
    expect(get).toHaveBeenCalledWith("/invoices/fatura-1/transactions/")
  })

  it("mostra a data da compra, ou a data gravada quando ela é nula", async () => {
    get.mockResolvedValue({ data: [compra(1, "2026-09-01"), compra(2, null)] })

    render(<InvoiceDetailsDialog open onOpenChange={vi.fn()} invoice={FATURA} />)

    const comData = (await screen.findByText("Compra 1")).closest("div.rounded-2xl") as HTMLElement
    expect(comData).toHaveTextContent("01 de setembro")
    expect(comData).not.toHaveTextContent("10 de outubro")

    const semData = screen.getByText("Compra 2").closest("div.rounded-2xl") as HTMLElement
    expect(semData).toHaveTextContent("10 de outubro")
  })
})
