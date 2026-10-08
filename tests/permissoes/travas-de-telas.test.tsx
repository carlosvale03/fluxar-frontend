import { render, screen, within } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import { beforeEach, describe, expect, it, vi } from "vitest"

import CardDetailsPage from "@/app/(app)/cartoes/[id]/page"
import CardsPage from "@/app/(app)/cartoes/page"
import GoalsPage from "@/app/(app)/metas/page"
import BudgetsPage from "@/app/(app)/orcamentos/page"
import TagsPage from "@/app/(app)/tags/page"
import { CardExpenseFormDialog } from "@/components/transactions/card-expense-form-dialog"
import { TransactionDeleteDialog } from "@/components/transactions/transaction-delete-dialog"
import { TransactionFormDialog } from "@/components/transactions/transaction-form-dialog"
import type { User } from "@/contexts/auth-context"
import { api } from "@/services/apiClient"
import { getBudgets } from "@/services/budgets"
import { goalsService } from "@/services/goals"
import { getTags } from "@/services/tags"
import type { Transaction } from "@/types/transactions"
import type { ChaveDeRecurso } from "@/types/planos"

import { usuario } from "./acesso"

// PERM-19: orcamentos, metas, tags, cartoes, compras_parceladas e
// transacoes_recorrentes fechados mostram o aviso no lugar da tela ou do
// controle, sem chamar a rota travada. PERM-22: com `cartoes` fechado, as
// faturas dos cartões existentes continuam podendo ser pagas e estornadas.

process.env.TZ = "America/Sao_Paulo"

const auth = vi.hoisted(() => ({ user: null as User | null }))
const estadoDoAuth = () => ({ user: auth.user, isLoading: false })

vi.mock("@/contexts/auth-context", () => ({ useAuth: () => estadoDoAuth() }))
vi.mock("@/hooks/use-auth", () => ({ useAuth: () => estadoDoAuth() }))
vi.mock("@/services/goals", () => ({ goalsService: { getGoals: vi.fn(), deleteGoal: vi.fn(), getHistory: vi.fn() } }))
vi.mock("@/services/budgets", () => ({ getBudgets: vi.fn(), deleteBudget: vi.fn() }))
vi.mock("@/services/tags", () => ({ getTags: vi.fn(), deleteTag: vi.fn(), getTagInsights: vi.fn(), createTag: vi.fn() }))
vi.mock("@/services/apiClient", async (importOriginal) => ({
  ...(await importOriginal<typeof import("@/services/apiClient")>()),
  api: { get: vi.fn(), post: vi.fn(), put: vi.fn(), patch: vi.fn(), delete: vi.fn() },
}))
vi.mock("sonner", () => ({ toast: Object.assign(vi.fn(), { success: vi.fn(), error: vi.fn(), info: vi.fn() }) }))
// O mesmo router em toda renderização, como no Next (o detalhe do cartão
// recarrega quando o router muda)
const router = vi.hoisted(() => ({ push: () => {}, replace: () => {} }))
vi.mock("next/navigation", () => ({
  useRouter: () => router,
  usePathname: () => "/",
  useSearchParams: () => new URLSearchParams(),
  useParams: () => ({ id: "cartao-1" }),
}))

const get = vi.mocked(api.get)
const post = vi.mocked(api.post)
const AVISO = "Este recurso não está disponível no seu plano."

const CARTAO = {
  id: "cartao-1",
  name: "Cartão Roxo",
  limit: "5000.00",
  closing_day: 30,
  due_day: 7,
  account_id: null,
  current_invoice_total: "200.00",
  available_limit: "4800.00",
  next_due_date: "2026-11-07",
}

const FATURAS = [
  { id: "f-aberta", month: 10, year: 2026, due_date: "2026-11-07", status: "CLOSED", total_amount: "200.00" },
  {
    id: "f-paga",
    month: 9,
    year: 2026,
    due_date: "2026-10-07",
    status: "PAID",
    total_amount: "150.00",
    payment: { amount: "150.00", date: "2026-10-05", account_name: "Conta" },
  },
]

function comAcesso(fechados: ChaveDeRecurso[] = []) {
  auth.user = usuario({ fechados })
}

const urlsChamadas = () => get.mock.calls.map(([url]) => url)

beforeEach(() => {
  vi.clearAllMocks()
  get.mockImplementation(((url: string) => {
    if (url === "/credit-cards/") return Promise.resolve({ data: [CARTAO] })
    if (url === "/credit-cards/cartao-1/invoices/") return Promise.resolve({ data: FATURAS })
    if (url === "/invoices/f-aberta/") return Promise.resolve({ data: { ...FATURAS[0], credit_card_id: "cartao-1" } })
    if (url === "/credit-cards/cartao-1/") return Promise.resolve({ data: CARTAO })
    return Promise.resolve({ data: [] })
  }) as typeof api.get)
  vi.mocked(goalsService.getGoals).mockResolvedValue([])
  vi.mocked(getBudgets).mockResolvedValue([] as never)
  vi.mocked(getTags).mockResolvedValue([])
})

describe("Telas travadas", () => {
  it("metas fechado: a tela Metas mostra o aviso sem chamar /goals/", () => {
    comAcesso(["metas"])
    render(<GoalsPage />)

    expect(screen.getByRole("heading", { name: "Metas" })).toBeInTheDocument()
    expect(screen.getByText(AVISO)).toBeInTheDocument()
    expect(screen.getByRole("link", { name: "Ver planos" })).toHaveAttribute("href", "/planos")
    expect(goalsService.getGoals).not.toHaveBeenCalled()
    expect(urlsChamadas()).not.toContain("/goals/")
  })

  it("metas aberto: a tela carrega as metas, sem o aviso", async () => {
    comAcesso()
    render(<GoalsPage />)

    await vi.waitFor(() => expect(goalsService.getGoals).toHaveBeenCalled())
    expect(screen.queryByText(AVISO)).not.toBeInTheDocument()
  })

  it("orcamentos fechado: a tela Orçamentos mostra o aviso sem chamar /budgets/", () => {
    comAcesso(["orcamentos"])
    render(<BudgetsPage />)

    expect(screen.getByRole("heading", { name: "Orçamentos" })).toBeInTheDocument()
    expect(screen.getByText(AVISO)).toBeInTheDocument()
    expect(getBudgets).not.toHaveBeenCalled()
  })

  it("tags fechado: a tela Tags mostra o aviso sem chamar /tags/", () => {
    comAcesso(["tags"])
    render(<TagsPage />)

    expect(screen.getByRole("heading", { name: "Tags" })).toBeInTheDocument()
    expect(screen.getByText(AVISO)).toBeInTheDocument()
    expect(getTags).not.toHaveBeenCalled()
  })
})

describe("Cartões travados (PERM-22)", () => {
  it("mostra o aviso, sem \"Novo Cartão\", e as faturas dos cartões existentes com pagar e estornar", async () => {
    comAcesso(["cartoes"])
    render(<CardsPage />)

    expect(screen.getByRole("heading", { name: "Cartões" })).toBeInTheDocument()
    expect(screen.getByText(AVISO)).toBeInTheDocument()
    expect(screen.queryByRole("button", { name: /Novo Cartão/ })).not.toBeInTheDocument()

    const faturas = await screen.findByRole("region", { name: "Faturas do Cartão Roxo" })
    expect(await within(faturas).findByRole("button", { name: "Pagar Fatura" })).toBeInTheDocument()

    post.mockResolvedValue({ data: {} })
    await userEvent.click(within(faturas).getByRole("button", { name: "Estornar" }))
    expect(post).toHaveBeenCalledWith("/invoices/f-paga/unpay/")
  })

  it("pagar a fatura abre o pagamento dessa fatura", async () => {
    comAcesso(["cartoes"])
    render(<CardsPage />)

    await userEvent.click(await screen.findByRole("button", { name: "Pagar Fatura" }))

    await vi.waitFor(() => expect(urlsChamadas()).toContain("/invoices/f-aberta/"))
  })

  it("detalhe do cartão: mostra o aviso, sem \"Editar Cartão\", e as faturas com pagar e estornar", async () => {
    comAcesso(["cartoes"])
    render(<CardDetailsPage />)

    expect(await screen.findByRole("heading", { name: "Cartão Roxo" })).toBeInTheDocument()
    expect(screen.getByText(AVISO)).toBeInTheDocument()
    expect(screen.getByRole("link", { name: "Ver planos" })).toHaveAttribute("href", "/planos")
    expect(screen.queryByRole("button", { name: /Editar Cartão/ })).not.toBeInTheDocument()
    expect(screen.queryByRole("button", { name: /Excluir/ })).not.toBeInTheDocument()
    expect(await screen.findByRole("button", { name: "Pagar Fatura" })).toBeInTheDocument()

    post.mockResolvedValue({ data: {} })
    const recarregar = vi.fn()
    vi.stubGlobal("location", { ...window.location, reload: recarregar })
    await userEvent.click(screen.getByRole("button", { name: "Estornar" }))
    expect(post).toHaveBeenCalledWith("/invoices/f-paga/unpay/")
    vi.unstubAllGlobals()
  })

  it("detalhe do cartão: com cartoes aberto, \"Editar Cartão\" aparece, sem o aviso", async () => {
    comAcesso()
    render(<CardDetailsPage />)

    expect(await screen.findByRole("button", { name: /Editar Cartão/ })).toBeInTheDocument()
    expect(screen.queryByText(AVISO)).not.toBeInTheDocument()
  })

  it("a compra nova no cartão mostra o aviso no lugar do formulário", () => {
    comAcesso(["cartoes"])
    render(<CardExpenseFormDialog open onOpenChange={vi.fn()} onSuccess={vi.fn()} />)

    expect(screen.getByText(AVISO)).toBeInTheDocument()
    expect(screen.queryByRole("button", { name: "Adicionar Despesa" })).not.toBeInTheDocument()
  })
})

describe("Formulários", () => {
  it("compras_parceladas fechado: o parcelamento fica em 1x, com o aviso", () => {
    comAcesso(["compras_parceladas"])
    render(<CardExpenseFormDialog open onOpenChange={vi.fn()} onSuccess={vi.fn()} />)

    const parcelas = screen.getByPlaceholderText("1")
    expect(parcelas).toBeDisabled()
    expect(parcelas).toHaveValue(1)
    expect(screen.getByText(AVISO)).toBeInTheDocument()
  })

  it("compras_parceladas aberto: o parcelamento fica livre, sem aviso", () => {
    comAcesso()
    render(<CardExpenseFormDialog open onOpenChange={vi.fn()} onSuccess={vi.fn()} />)

    expect(screen.getByPlaceholderText("1")).toBeEnabled()
    expect(screen.queryByText(AVISO)).not.toBeInTheDocument()
  })

  it("transacoes_recorrentes fechado: a opção recorrente dá lugar ao aviso", () => {
    comAcesso(["transacoes_recorrentes"])
    render(<TransactionFormDialog open onOpenChange={vi.fn()} onSuccess={vi.fn()} type="EXPENSE" />)

    expect(screen.queryByText("Planejamento Recorrente")).not.toBeInTheDocument()
    expect(screen.getByText(AVISO)).toBeInTheDocument()
  })

  it("transacoes_recorrentes fechado: editar e excluir a série mostram o aviso, sem a opção da série", () => {
    comAcesso(["transacoes_recorrentes"])
    const ocorrencia = {
      id: "t1",
      description: "Aluguel",
      amount: "1000.00",
      date: "2026-10-05",
      type: "EXPENSE",
      recurring_source: "serie-1",
      tags: [],
    } as unknown as Transaction

    const { unmount } = render(
      <TransactionFormDialog open onOpenChange={vi.fn()} onSuccess={vi.fn()} type="EXPENSE" initialData={ocorrencia} />,
    )
    expect(screen.queryByText("Série recorrente:")).not.toBeInTheDocument()
    expect(screen.getByText(AVISO)).toBeInTheDocument()
    unmount()

    render(<TransactionDeleteDialog open onOpenChange={vi.fn()} onSuccess={vi.fn()} transaction={ocorrencia} />)
    expect(screen.queryByText("Todas as recorrentes (série completa)")).not.toBeInTheDocument()
    expect(screen.getByText(AVISO)).toBeInTheDocument()
  })

  it("transacoes_recorrentes aberto: a opção recorrente e a exclusão da série aparecem", () => {
    comAcesso()
    const ocorrencia = { id: "t1", type: "EXPENSE", recurring_source: "serie-1" } as unknown as Transaction

    const { unmount } = render(<TransactionFormDialog open onOpenChange={vi.fn()} onSuccess={vi.fn()} type="EXPENSE" />)
    expect(screen.getByText("Planejamento Recorrente")).toBeInTheDocument()
    unmount()

    render(<TransactionDeleteDialog open onOpenChange={vi.fn()} onSuccess={vi.fn()} transaction={ocorrencia} />)
    expect(screen.getByText("Todas as recorrentes (série completa)")).toBeInTheDocument()
    expect(screen.queryByText(AVISO)).not.toBeInTheDocument()
  })

  it("tags fechado: o campo de tags some do lançamento, sem chamar /tags/; aberto, ele aparece", () => {
    comAcesso(["tags"])
    const { unmount } = render(<TransactionFormDialog open onOpenChange={vi.fn()} onSuccess={vi.fn()} type="EXPENSE" />)
    expect(screen.queryByText("Tags Interativas")).not.toBeInTheDocument()
    expect(getTags).not.toHaveBeenCalled()
    unmount()

    comAcesso()
    render(<TransactionFormDialog open onOpenChange={vi.fn()} onSuccess={vi.fn()} type="EXPENSE" />)
    expect(screen.getByText("Tags Interativas")).toBeInTheDocument()
  })

  // PERM-21: editar a transação é essencial; com `tags` fechada o corpo da
  // edição vai sem o campo `tags`, para o backend manter as que ela já tem
  const comTags = {
    id: "t2",
    description: "Padaria",
    amount: "12.34",
    date: "2026-10-05",
    type: "EXPENSE",
    category: "cat-1",
    account: "conta-1",
    tags: [{ id: "tag-1", name: "Viagem" }],
  } as unknown as Transaction

  async function salvarEdicao() {
    const put = vi.mocked(api.put)
    put.mockResolvedValue({ data: {} })
    render(<TransactionFormDialog open onOpenChange={vi.fn()} onSuccess={vi.fn()} type="EXPENSE" initialData={comTags} />)
    await userEvent.click(screen.getByRole("button", { name: "Salvar Lançamento" }))
    await vi.waitFor(() => expect(put).toHaveBeenCalled())
    return put.mock.calls[0]
  }

  it("tags fechado: editar a transação não envia o campo tags", async () => {
    comAcesso(["tags"])
    const [url, corpo] = await salvarEdicao()
    expect(url).toBe("/transactions/t2/")
    expect(corpo).not.toHaveProperty("tags")
    expect(corpo).toMatchObject({ description: "Padaria", category: "cat-1", account: "conta-1" })
  })

  it("tags aberto: editar a transação envia as tags dela", async () => {
    comAcesso()
    const [, corpo] = await salvarEdicao()
    expect(corpo).toMatchObject({ tags: ["tag-1"] })
  })
})
