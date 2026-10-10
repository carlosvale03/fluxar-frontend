import { act, fireEvent, render, screen, within } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import { toast } from "sonner"
import { beforeEach, describe, expect, it, vi } from "vitest"

import TransactionsPage from "@/app/(app)/transacoes/page"
import { CardExpenseFormDialog } from "@/components/transactions/card-expense-form-dialog"
import { TransactionFormDialog } from "@/components/transactions/transaction-form-dialog"
import type { User } from "@/contexts/auth-context"
import { api } from "@/services/apiClient"

import { usuario } from "../permissoes/acesso"
import { CINEMA, LAZER, PADARIA, TRANSPORTE, TRANSPORTE_DO_CINEMA, resposta, transacao } from "./dados"

// VINCULO-01: "Lançar gasto relacionado" cria a despesa ou a compra no cartão
// já com a principal. VINCULO-02 e VINCULO-03: "Vincular a um gasto" procura
// pela descrição, data ou valor entre as despesas e compras no cartão e liga
// a escolhida. VINCULO-04: "Desfazer vínculo". VINCULO-05 a VINCULO-08: a
// recusa aparece no toast. VINCULO-20 e VINCULO-21: com o recurso travado,
// lançar e vincular aparecem travados, e desfazer funciona.

process.env.TZ = "America/Sao_Paulo"

const auth = vi.hoisted(() => ({ user: null as User | null }))
const navegacao = vi.hoisted(() => ({
  parametros: new URLSearchParams(),
  router: { push: vi.fn(), replace: vi.fn() },
}))

vi.mock("@/contexts/auth-context", () => ({ useAuth: () => ({ user: auth.user, isLoading: false, refreshUser: vi.fn() }) }))
vi.mock("next/navigation", () => ({
  useSearchParams: () => navegacao.parametros,
  useRouter: () => navegacao.router,
  usePathname: () => "/transacoes",
}))
vi.mock("sonner", () => ({ toast: Object.assign(vi.fn(), { success: vi.fn(), error: vi.fn(), info: vi.fn() }) }))
vi.mock("@/services/apiClient", async (importOriginal) => ({
  ...(await importOriginal<typeof import("@/services/apiClient")>()),
  api: { get: vi.fn(), post: vi.fn(), put: vi.fn(), patch: vi.fn(), delete: vi.fn() },
}))

// O jsdom não tem estas APIs, que o Select e o DropdownMenu do Radix usam
Element.prototype.hasPointerCapture ??= () => false
Element.prototype.releasePointerCapture ??= () => {}
Element.prototype.scrollIntoView ??= () => {}

const get = vi.mocked(api.get)
const post = vi.mocked(api.post)
const apagar = vi.mocked(api.delete)

const SALARIO = transacao({ id: "t-salario", description: "Salário", type: "INCOME", amount: "3000.00" })
const JANTAR_NO_CARTAO = transacao({
  id: "t-jantar",
  description: "Jantar",
  type: "CREDIT_CARD",
  amount: "50.00",
  date: "2026-10-05",
  purchase_date: "2026-09-12",
})
const CINEMA_DE_OUTRO_DIA = transacao({ id: "t-cine2", description: "Cinema", amount: "30.00", date: "2026-09-20" })

function servidor(lista: unknown[], busca: unknown[] = []) {
  get.mockImplementation(((url: string) => {
    if (url.startsWith("/transactions/?") && url.includes("type=EXPENSE")) {
      return resposta({ count: busca.length, total_pages: 1, results: busca, day_totals: {} })
    }
    if (url.startsWith("/transactions/")) {
      return resposta({ count: lista.length, total_pages: 1, results: lista, day_totals: {} })
    }
    if (url.startsWith("/categories/")) return resposta([LAZER, TRANSPORTE])
    if (url === "/accounts/") return resposta([{ id: "conta-1", name: "Banco Azul", type: "CHECKING", is_active: true, balance: "0.00" }])
    if (url === "/credit-cards/") return resposta([{ id: "cartao-1", name: "Cartão Roxo", color: "#a0a" }])
    return resposta([])
  }) as typeof api.get)
}

const buscas = () =>
  get.mock.calls
    .map(([url]) => String(url))
    .filter((url) => url.startsWith("/transactions/?") && url.includes("type=EXPENSE"))
    .map((url) => new URL(url, "http://x").searchParams)

const esperar = (ms: number) => act(() => new Promise((r) => setTimeout(r, ms)))

const cartao = (descricao: string) =>
  screen.getAllByText(descricao).find((el) => !el.closest("tr"))!.closest(".rounded-\\[28px\\]") as HTMLElement

async function abrirMenu(descricao: string) {
  await userEvent.click(within(cartao(descricao)).getByRole("button", { name: "Vínculo" }))
  return screen.findByRole("menu")
}

beforeEach(() => {
  vi.clearAllMocks()
  auth.user = usuario()
  navegacao.parametros = new URLSearchParams()
  servidor([CINEMA, TRANSPORTE_DO_CINEMA, PADARIA, SALARIO])
})

describe("Lançar, vincular e desfazer", { timeout: 20000 }, () => {
  it("\"Lançar gasto relacionado\" abre o formulário de despesa com a principal", async () => {
    render(<TransactionsPage />)
    await screen.findAllByText("Cinema")

    const menu = await abrirMenu("Cinema")
    // A principal não vira dependente nem tem vínculo para desfazer
    expect(within(menu).queryByRole("menuitem", { name: /Vincular a um gasto/ })).not.toBeInTheDocument()
    expect(within(menu).queryByRole("menuitem", { name: /Desfazer vínculo/ })).not.toBeInTheDocument()
    await userEvent.click(within(menu).getByRole("menuitem", { name: /Lançar gasto relacionado/ }))

    const formulario = await screen.findByRole("dialog", { name: "Nova Despesa" })
    expect(formulario).toHaveTextContent("Por causa de: Cinema, 12/09/2026")
  })

  it("a despesa relacionada envia a principal na criação", async () => {
    post.mockImplementation((() => resposta(TRANSPORTE_DO_CINEMA)) as typeof api.post)
    const principal = { id: "t-cinema", description: "Cinema", date: "2026-09-12" }
    render(<TransactionFormDialog open onOpenChange={vi.fn()} type="EXPENSE" onSuccess={vi.fn()} principal={principal} />)

    fireEvent.change(await screen.findByPlaceholderText("Ex: Salário, Mercado, Aluguel..."), { target: { value: "Uber até o cinema" } })
    fireEvent.change(within(screen.getByText("Valor Total").closest(".space-y-2") as HTMLElement).getByRole("textbox"), {
      target: { value: "45" },
    })
    await userEvent.click(screen.getByLabelText("Categoria"))
    await userEvent.click(await screen.findByRole("option", { name: /Transporte/ }))
    await userEvent.click(screen.getByLabelText("Carteira / Conta"))
    await userEvent.click(await screen.findByRole("option", { name: /Banco Azul/ }))
    await userEvent.click(screen.getByRole("button", { name: "Adicionar Despesa" }))

    await vi.waitFor(() => expect(post).toHaveBeenCalledWith("/transactions/", expect.anything()))
    expect(post.mock.calls[0][1]).toMatchObject({ type: "EXPENSE", amount: "45.00", category: "cat-transp", principal: "t-cinema" })
  })

  it("a compra relacionada no cartão envia a principal na criação", async () => {
    post.mockImplementation((() => resposta([TRANSPORTE_DO_CINEMA])) as typeof api.post)
    const principal = { id: "t-cinema", description: "Cinema", date: "2026-09-12" }
    render(<CardExpenseFormDialog open onOpenChange={vi.fn()} onSuccess={vi.fn()} principal={principal} />)

    expect(await screen.findByRole("note")).toHaveTextContent("Por causa de: Cinema, 12/09/2026")
    fireEvent.change(await screen.findByPlaceholderText("Ex: Assinatura Netflix, Jantar..."), { target: { value: "Pipoca" } })
    fireEvent.change(within(screen.getByText("Valor Total").closest(".space-y-2") as HTMLElement).getByRole("textbox"), {
      target: { value: "20" },
    })
    await userEvent.click(screen.getByLabelText("Cartão Utilizado"))
    await userEvent.click(await screen.findByRole("option", { name: /Cartão Roxo/ }))
    await userEvent.click(screen.getByLabelText("Categoria"))
    await userEvent.click(await screen.findByRole("option", { name: /Lazer/ }))
    await userEvent.click(screen.getByRole("button", { name: "Adicionar Despesa" }))

    await vi.waitFor(() => expect(post).toHaveBeenCalledWith("/transactions/credit-card-expense/", expect.anything()))
    expect(post.mock.calls[0][1]).toMatchObject({ amount: "20.00", credit_card: "cartao-1", principal: "t-cinema" })
  })

  it("a busca procura pela descrição só entre despesas e compras no cartão e liga a escolhida", async () => {
    servidor([CINEMA, TRANSPORTE_DO_CINEMA, PADARIA, SALARIO], [CINEMA, PADARIA, JANTAR_NO_CARTAO, SALARIO])
    post.mockImplementation((() => resposta({ ...PADARIA, principal: "t-cinema" })) as typeof api.post)
    render(<TransactionsPage />)
    await screen.findAllByText("Padaria")
    // Receita não se vincula: sem as ações
    expect(within(cartao("Salário")).queryByRole("button", { name: "Vínculo" })).not.toBeInTheDocument()

    const menu = await abrirMenu("Padaria")
    await userEvent.click(within(menu).getByRole("menuitem", { name: /Vincular a um gasto/ }))
    const janela = await screen.findByRole("dialog", { name: "Vincular a um gasto" })
    await userEvent.type(within(janela).getByLabelText("Descrição"), "Cine")
    await userEvent.click(within(janela).getByRole("button", { name: /Buscar/ }))

    const achados = await within(janela).findByRole("list", { name: "Gastos encontrados" })
    const enviada = buscas().at(-1)!
    expect(enviada.get("type")).toBe("EXPENSE")
    expect(enviada.get("search")).toBe("Cine")
    // A própria transação e a receita ficam de fora; a compra no cartão entra
    const nomes = within(achados).getAllByRole("listitem").map((li) => li.querySelector("p")!.textContent)
    expect(nomes).toEqual(["Cinema", "Jantar"])

    const listasAntes = get.mock.calls.filter(([url]) => String(url).startsWith("/transactions/?page=")).length
    await userEvent.click(within(achados).getByRole("button", { name: "Vincular a Cinema" }))
    await vi.waitFor(() => expect(post).toHaveBeenCalledWith("/transactions/t-padaria/link/", { principal: "t-cinema" }))
    expect(toast.success).toHaveBeenCalledWith("Gasto vinculado.")
    await vi.waitFor(() => expect(screen.queryByRole("dialog", { name: "Vincular a um gasto" })).not.toBeInTheDocument())
    // A lista recarrega para mostrar o vínculo
    await vi.waitFor(() =>
      expect(get.mock.calls.filter(([url]) => String(url).startsWith("/transactions/?page=")).length).toBeGreaterThan(listasAntes),
    )
  })

  it("a busca pela data e pelo valor envia o dia e mostra só o gasto com o valor", async () => {
    servidor([PADARIA], [CINEMA, CINEMA_DE_OUTRO_DIA])
    render(<TransactionsPage />)
    await screen.findAllByText("Padaria")

    const menu = await abrirMenu("Padaria")
    await userEvent.click(within(menu).getByRole("menuitem", { name: /Vincular a um gasto/ }))
    const janela = await screen.findByRole("dialog", { name: "Vincular a um gasto" })
    fireEvent.change(within(janela).getByLabelText("Data"), { target: { value: "2026-09-12" } })
    fireEvent.change(within(janela).getByLabelText("Valor"), { target: { value: "50" } })
    await userEvent.click(within(janela).getByRole("button", { name: /Buscar/ }))

    const achados = await within(janela).findByRole("list", { name: "Gastos encontrados" })
    const enviada = buscas().at(-1)!
    expect(enviada.get("startDate")).toBe("2026-09-12")
    expect(enviada.get("endDate")).toBe("2026-09-12")
    const itens = within(achados).getAllByRole("listitem")
    expect(itens).toHaveLength(1)
    expect(itens[0]).toHaveTextContent("R$ 50,00")
  })

  it("o 400 do vínculo aparece no toast e a janela continua aberta", async () => {
    servidor([PADARIA], [TRANSPORTE_DO_CINEMA])
    post.mockRejectedValue({
      response: { status: 400, data: { detail: "Uma transação dependente não pode ser principal.", code: "invalid" } },
    })
    render(<TransactionsPage />)
    await screen.findAllByText("Padaria")

    const menu = await abrirMenu("Padaria")
    await userEvent.click(within(menu).getByRole("menuitem", { name: /Vincular a um gasto/ }))
    const janela = await screen.findByRole("dialog", { name: "Vincular a um gasto" })
    await userEvent.click(within(janela).getByRole("button", { name: /Buscar/ }))
    await userEvent.click(await within(janela).findByRole("button", { name: "Vincular a Uber até o cinema" }))

    await vi.waitFor(() => expect(toast.error).toHaveBeenCalledWith("Uma transação dependente não pode ser principal."))
    expect(toast.success).not.toHaveBeenCalled()
    expect(screen.getByRole("dialog", { name: "Vincular a um gasto" })).toBeInTheDocument()
  })

  it("\"Desfazer vínculo\" remove só o vínculo da dependente e recarrega a lista", async () => {
    apagar.mockImplementation((() => resposta({ ...TRANSPORTE_DO_CINEMA, principal: null, principal_detail: null })) as typeof api.delete)
    render(<TransactionsPage />)
    await screen.findAllByText("Uber até o cinema")
    await esperar(400)
    const listasAntes = get.mock.calls.filter(([url]) => String(url).startsWith("/transactions/?page=")).length

    const menu = await abrirMenu("Uber até o cinema")
    await userEvent.click(within(menu).getByRole("menuitem", { name: /Desfazer vínculo/ }))

    await vi.waitFor(() => expect(apagar).toHaveBeenCalledWith("/transactions/t-transp/link/"))
    expect(post).not.toHaveBeenCalled()
    expect(toast.success).toHaveBeenCalledWith("Vínculo desfeito.")
    await vi.waitFor(() =>
      expect(get.mock.calls.filter(([url]) => String(url).startsWith("/transactions/?page=")).length).toBeGreaterThan(listasAntes),
    )
  })

  it("com o recurso travado, lançar e vincular aparecem travados e desfazer funciona", async () => {
    auth.user = usuario({ fechados: ["vinculos"] })
    apagar.mockImplementation((() => resposta({ ...TRANSPORTE_DO_CINEMA, principal: null, principal_detail: null })) as typeof api.delete)
    render(<TransactionsPage />)
    await screen.findAllByText("Padaria")

    let menu = await abrirMenu("Padaria")
    for (const nome of [/Lançar gasto relacionado/, /Vincular a um gasto/]) {
      const item = within(menu).getByRole("menuitem", { name: nome })
      expect(item).toHaveAttribute("aria-disabled", "true")
      expect(within(item).getByLabelText("Travado pelo plano")).toBeInTheDocument()
    }
    await userEvent.click(within(menu).getByRole("menuitem", { name: /Lançar gasto relacionado/ }))
    expect(screen.queryByRole("dialog", { name: "Nova Despesa" })).not.toBeInTheDocument()
    await userEvent.keyboard("{Escape}")

    menu = await abrirMenu("Uber até o cinema")
    const desfazer = within(menu).getByRole("menuitem", { name: /Desfazer vínculo/ })
    expect(desfazer).not.toHaveAttribute("aria-disabled")
    await userEvent.click(desfazer)
    await vi.waitFor(() => expect(apagar).toHaveBeenCalledWith("/transactions/t-transp/link/"))
  })
})
