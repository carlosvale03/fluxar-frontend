import { render, screen } from "@testing-library/react"
import { beforeEach, describe, expect, it, vi } from "vitest"

import CardDetailsPage from "@/app/(app)/cartoes/[id]/page"
import { CreditCardItem } from "@/components/cards/credit-card-item"
import { api } from "@/services/apiClient"
import { CreditCard } from "@/types/cards"

// FATURA-06: a tela do cartão mostra o próximo vencimento que a API calcula.
// FATURA-42: o limite disponível é o available_limit da API.

process.env.TZ = "America/Sao_Paulo"

vi.mock("@/services/apiClient", async (importOriginal) => ({
  ...(await importOriginal<typeof import("@/services/apiClient")>()),
  api: { get: vi.fn(), post: vi.fn() },
}))

vi.mock("sonner", () => ({ toast: { success: vi.fn(), error: vi.fn() } }))

vi.mock("next/navigation", () => {
  // O mesmo router em toda renderização, como no Next
  const router = { push: vi.fn() }
  return {
    useParams: () => ({ id: "cartao-1" }),
    useRouter: () => router,
    usePathname: () => "/cartoes/cartao-1",
  }
})

const get = vi.mocked(api.get)

// Limite de R$ 5.000,00 com R$ 1.200,00 em compras não pagas; a fatura atual
// tem só R$ 200,00, então limite menos fatura atual daria outro valor
const CARTAO = {
  id: "cartao-1",
  name: "Cartão Roxo",
  limit: "5000.00",
  closing_day: 30,
  due_day: 7,
  account_id: null,
  current_invoice_total: "200.00",
  available_limit: "3800.00",
  next_due_date: "2026-11-07",
  created_at: "2026-01-01T00:00:00Z",
  updated_at: "2026-01-01T00:00:00Z",
}

describe("Tela do cartão", () => {
  beforeEach(() => {
    get.mockReset()
    get.mockImplementation(((url: string) =>
      Promise.resolve({ data: url === "/credit-cards/cartao-1/" ? CARTAO : [] })) as typeof api.get)
  })

  it("mostra o next_due_date e o available_limit da API na tela do cartão", async () => {
    render(<CardDetailsPage />)

    expect(await screen.findByText(/Vence em 07\/11/)).toBeInTheDocument()
    const rotulo = screen.getByText("Limite Disponível")
    expect(rotulo.parentElement).toHaveTextContent(/^Limite DisponívelR\$\s3\.800,00$/)
  })

  it("o cartão da lista usa o available_limit da API no limite utilizado", () => {
    render(<CreditCardItem card={CARTAO as unknown as CreditCard} onEdit={vi.fn()} onDelete={vi.fn()} />)

    expect(screen.getByText(/^Utilizado: R\$\s1\.200,00$/)).toBeInTheDocument()
  })
})
