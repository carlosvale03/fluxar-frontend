import { fireEvent, render, screen, within } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import { beforeEach, describe, expect, it, vi } from "vitest"

import TransactionsPage from "@/app/(app)/transacoes/page"
import { useAvisoDoSalario } from "@/components/salario/AvisoDoSalario"
import { TransactionFormDialog } from "@/components/transactions/transaction-form-dialog"
import type { User } from "@/contexts/auth-context"
import { api } from "@/services/apiClient"

import { usuario } from "../permissoes/acesso"
import { PLANO_SALVO, resposta } from "./dados"

// SALARIO-19: lançar uma receita efetivada numa categoria de salário, ou
// efetivar uma pendente, abre o aviso com o valor. SALARIO-20: os três
// benefícios. SALARIO-21: "Dividir agora" leva à revisão desse recebimento.
// SALARIO-23: "Agora não" fecha. SALARIO-25: com o recurso travado, não abre.

process.env.TZ = "America/Sao_Paulo"

const auth = vi.hoisted(() => ({ user: null as User | null }))
const estadoDoAuth = () => ({ user: auth.user, isLoading: false, refreshUser: vi.fn() })

vi.mock("next/navigation", () => ({
  useRouter: () => ({ push: vi.fn(), replace: vi.fn() }),
  usePathname: () => "/transacoes",
  useSearchParams: () => new URLSearchParams(),
}))
vi.mock("@/hooks/use-auth", () => ({ useAuth: () => estadoDoAuth() }))
vi.mock("@/contexts/auth-context", () => ({ useAuth: () => estadoDoAuth() }))
vi.mock("sonner", () => ({ toast: Object.assign(vi.fn(), { success: vi.fn(), error: vi.fn(), info: vi.fn() }) }))
vi.mock("@/services/apiClient", async (importOriginal) => ({
  ...(await importOriginal<typeof import("@/services/apiClient")>()),
  api: { get: vi.fn(), post: vi.fn(), put: vi.fn(), patch: vi.fn() },
}))

// O jsdom não tem estas APIs, que o Select do Radix usa ao abrir
Element.prototype.hasPointerCapture ??= () => false
Element.prototype.releasePointerCapture ??= () => {}
Element.prototype.scrollIntoView ??= () => {}

const get = vi.mocked(api.get)
const post = vi.mocked(api.post)
const patch = vi.mocked(api.patch)

const SALARIO = { id: "cat-salario", name: "Salário", type: "INCOME", color: "#0a0", icon: "Banknote", subcategories: [] }
const FREELA = { id: "cat-freela", name: "Freelance", type: "INCOME", color: "#00a", icon: "Briefcase", subcategories: [] }

function receita(trocas: Record<string, unknown> = {}) {
  return {
    id: "rec-novo",
    description: "Salário de outubro",
    amount: "3000.00",
    signed_amount: "3000.00",
    date: "2026-10-05",
    type: "INCOME",
    status: "COMPLETED",
    account: "conta-1",
    category: "cat-salario",
    category_detail: SALARIO,
    tags: [],
    import_batch: null,
    created_at: "2026-10-05T12:00:00Z",
    updated_at: "2026-10-05T12:00:00Z",
    ...trocas,
  }
}

const chamadasDoPlano = () => get.mock.calls.filter(([url]) => url === "/salary/plan/")

function servidor(transacoes: unknown[] = []) {
  get.mockImplementation(((url: string) => {
    if (url === "/salary/plan/") return resposta(PLANO_SALVO)
    if (url.startsWith("/transactions/")) {
      return resposta({ count: transacoes.length, total_pages: 1, results: transacoes, day_totals: {} })
    }
    if (url.startsWith("/categories/")) return resposta([SALARIO, FREELA])
    if (url === "/accounts/") return resposta([{ id: "conta-1", name: "Banco Azul", type: "CHECKING", is_active: true, balance: "0.00" }])
    return resposta([])
  }) as typeof api.get)
}

// Como a tela usa: o formulário passa a receita criada ao aviso
function TelaComFormulario() {
  const { conferirSalario, avisoDoSalario } = useAvisoDoSalario()
  return (
    <>
      <TransactionFormDialog open onOpenChange={vi.fn()} type="INCOME" onSuccess={(criada) => void conferirSalario(criada)} />
      {avisoDoSalario}
    </>
  )
}

async function lancarReceita(categoria: string) {
  render(<TelaComFormulario />)
  // fireEvent: digitar letra a letra no formulário inteiro é lento
  fireEvent.change(await screen.findByPlaceholderText("Ex: Salário, Mercado, Aluguel..."), { target: { value: "Salário de outubro" } })
  fireEvent.change(within(screen.getByText("Valor Total").closest(".space-y-2") as HTMLElement).getByRole("textbox"), {
    target: { value: "3000" },
  })
  await userEvent.click(screen.getByLabelText("Categoria"))
  await userEvent.click(await screen.findByRole("option", { name: new RegExp(categoria) }))
  await userEvent.click(screen.getByLabelText("Carteira / Conta"))
  await userEvent.click(await screen.findByRole("option", { name: /Banco Azul/ }))
  await userEvent.click(screen.getByRole("button", { name: "Adicionar Receita" }))
  await vi.waitFor(() => expect(post).toHaveBeenCalledWith("/transactions/", expect.anything()))
}

const aviso = () => screen.findByRole("dialog", { name: "Seu salário chegou!" })

beforeEach(() => {
  vi.clearAllMocks()
  auth.user = usuario()
  servidor()
  post.mockImplementation((() => resposta(receita())) as typeof api.post)
})

// O formulário e a lista de transações inteiros são pesados no jsdom
describe("Aviso ao receber o salário", { timeout: 15000 }, () => {
  it("lançar R$ 3.000,00 em Salário, efetivada, abre o aviso com o valor e os três benefícios", async () => {
    await lancarReceita("Salário")

    const janela = await aviso()
    expect(janela).toHaveTextContent("Você recebeu R$ 3.000,00")
    const beneficios = within(within(janela).getByRole("list", { name: "Benefícios de dividir o salário" })).getAllByRole("listitem")
    expect(beneficios.map((b) => b.textContent)).toEqual([
      "Guardar antes de gastar",
      "Garantir as contas do mês",
      "Saber quanto sobra livre para gastar",
    ])
    expect(post.mock.calls[0][1]).toMatchObject({ type: "INCOME", category: "cat-salario", amount: "3000.00" })
  })

  it("\"Dividir agora\" leva à revisão desse recebimento, e \"Agora não\" fecha", async () => {
    await lancarReceita("Salário")
    const janela = await aviso()

    expect(within(janela).getByRole("link", { name: "Dividir agora" })).toHaveAttribute("href", "/salario?dividir=rec-novo")
    await userEvent.click(within(janela).getByRole("button", { name: "Agora não" }))
    await vi.waitFor(() => expect(screen.queryByRole("dialog", { name: "Seu salário chegou!" })).not.toBeInTheDocument())
  })

  it("receita de outra categoria não abre o aviso", async () => {
    post.mockImplementation((() => resposta(receita({ category: "cat-freela", category_detail: FREELA }))) as typeof api.post)
    await lancarReceita("Freelance")

    await vi.waitFor(() => expect(chamadasDoPlano()).toHaveLength(1))
    expect(screen.queryByRole("dialog", { name: "Seu salário chegou!" })).not.toBeInTheDocument()
  })

  it("receita pendente não abre o aviso nem lê o plano", async () => {
    post.mockImplementation((() => resposta(receita({ status: "PENDING", date: "2026-11-05" }))) as typeof api.post)
    await lancarReceita("Salário")

    await new Promise((r) => setTimeout(r, 20))
    expect(chamadasDoPlano()).toHaveLength(0)
    expect(screen.queryByRole("dialog", { name: "Seu salário chegou!" })).not.toBeInTheDocument()
  })

  it("com o recurso travado, não abre o aviso nem lê o plano", async () => {
    auth.user = usuario({ fechados: ["gestao_do_salario"] })
    await lancarReceita("Salário")

    await new Promise((r) => setTimeout(r, 20))
    expect(chamadasDoPlano()).toHaveLength(0)
    expect(screen.queryByRole("dialog", { name: "Seu salário chegou!" })).not.toBeInTheDocument()
  })

  it("efetivar uma receita pendente de Salário na lista abre o aviso", async () => {
    servidor([receita({ id: "rec-pendente", status: "PENDING", date: "2026-10-05", recurring_source: "serie-1" })])
    patch.mockImplementation((() => resposta(receita({ id: "rec-pendente", status: "COMPLETED" }))) as typeof api.patch)
    render(<TransactionsPage />)

    const efetivar = await screen.findAllByTitle("Efetivar Transação")
    await userEvent.click(efetivar[0])

    expect(patch).toHaveBeenCalledWith("/transactions/rec-pendente/", { status: "COMPLETED" })
    const janela = await aviso()
    expect(janela).toHaveTextContent("Você recebeu R$ 3.000,00")
    expect(within(janela).getByRole("link", { name: "Dividir agora" })).toHaveAttribute("href", "/salario?dividir=rec-pendente")
  })

  it("a edição que efetiva uma receita pendente de Salário abre o aviso; a que não efetiva, não", async () => {
    const put = vi.mocked(api.put)
    const editar = async (inicial: Record<string, unknown>, devolvida: Record<string, unknown>) => {
      put.mockImplementation((() => resposta(devolvida)) as typeof api.put)
      function TelaDeEdicao() {
        const { conferirSalario, avisoDoSalario } = useAvisoDoSalario()
        return (
          <>
            <TransactionFormDialog open onOpenChange={vi.fn()} type="INCOME" initialData={inicial} onSuccess={(t) => void conferirSalario(t)} />
            {avisoDoSalario}
          </>
        )
      }
      const tela = render(<TelaDeEdicao />)
      await userEvent.click(await screen.findByRole("button", { name: "Salvar Lançamento" }))
      await vi.waitFor(() => expect(put).toHaveBeenCalledWith(`/transactions/${inicial.id}/`, expect.anything()))
      return tela
    }

    // Já efetivada antes da edição: não abre
    const primeira = await editar(receita({ id: "rec-ja" }), receita({ id: "rec-ja" }))
    await new Promise((r) => setTimeout(r, 20))
    expect(chamadasDoPlano()).toHaveLength(0)
    expect(screen.queryByRole("dialog", { name: "Seu salário chegou!" })).not.toBeInTheDocument()
    primeira.unmount()

    // Pendente que volta efetivada: abre com o valor e o id dela
    await editar(receita({ id: "rec-pendente", status: "PENDING" }), receita({ id: "rec-pendente", status: "COMPLETED" }))
    const janela = await aviso()
    expect(janela).toHaveTextContent("Você recebeu R$ 3.000,00")
    expect(within(janela).getByRole("link", { name: "Dividir agora" })).toHaveAttribute("href", "/salario?dividir=rec-pendente")
  })

  it("efetivar uma despesa não abre o aviso nem lê o plano", async () => {
    const despesa = receita({ id: "desp-1", type: "EXPENSE", status: "PENDING", description: "Aluguel", category: "cat-x", category_detail: null, recurring_source: "serie-2" })
    servidor([despesa])
    patch.mockImplementation((() => resposta({ ...despesa, status: "COMPLETED" })) as typeof api.patch)
    render(<TransactionsPage />)

    const efetivar = await screen.findAllByTitle("Efetivar Transação")
    await userEvent.click(efetivar[0])

    await vi.waitFor(() => expect(patch).toHaveBeenCalledTimes(1))
    await new Promise((r) => setTimeout(r, 20))
    expect(chamadasDoPlano()).toHaveLength(0)
    expect(screen.queryByRole("dialog", { name: "Seu salário chegou!" })).not.toBeInTheDocument()
  })
})
