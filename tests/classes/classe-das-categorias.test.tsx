import { render, screen, within } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import { beforeEach, describe, expect, it, vi } from "vitest"

import CategoriesPage from "@/app/(app)/categorias/page"
import type { User } from "@/contexts/auth-context"
import { api } from "@/services/apiClient"

import { usuario } from "../permissoes/acesso"

// CLASSE-17, CLASSE-19 e CLASSE-20: o formulário de despesa escolhe a classe,
// a subcategoria começa herdando a da mãe, a receita não tem classe e a
// lista mostra a classe efetiva com a cor e "(herdada)".

const auth = vi.hoisted(() => ({ user: null as User | null }))
const estadoDoAuth = () => ({ user: auth.user, isLoading: false })

vi.mock("@/contexts/auth-context", () => ({ useAuth: () => estadoDoAuth() }))
vi.mock("@/hooks/use-auth", () => ({ useAuth: () => estadoDoAuth() }))
vi.mock("@/services/apiClient", async (importOriginal) => ({
  ...(await importOriginal<typeof import("@/services/apiClient")>()),
  api: { get: vi.fn(), post: vi.fn(), put: vi.fn(), patch: vi.fn(), delete: vi.fn() },
}))
vi.mock("sonner", () => ({ toast: Object.assign(vi.fn(), { success: vi.fn(), error: vi.fn(), info: vi.fn() }) }))
vi.mock("next/navigation", () => ({
  useRouter: () => ({ push: vi.fn(), replace: vi.fn() }),
  usePathname: () => "/categorias",
  useSearchParams: () => new URLSearchParams(),
}))

// O jsdom não tem estas APIs, que o Select do Radix usa ao abrir
Element.prototype.hasPointerCapture ??= () => false
Element.prototype.releasePointerCapture ??= () => {}
Element.prototype.scrollIntoView ??= () => {}

const get = vi.mocked(api.get)
const post = vi.mocked(api.post)
const put = vi.mocked(api.put)

const ESSENCIAL = { id: "ess", name: "Essencial", color: "#16A34A" }
const DISPENSAVEL = { id: "dis", name: "Dispensável", color: "#F97316" }

const CLASSES = [
  { ...ESSENCIAL, is_default: true, categories_count: 1 },
  { ...DISPENSAVEL, is_default: true, categories_count: 1 },
]

const base = { icon: "Tag", is_active: true, is_default: false }

const CATEGORIAS = [
  {
    ...base,
    id: "comida",
    name: "Comida",
    type: "EXPENSE",
    color: "#f00000",
    parent: null,
    expense_class: "ess",
    effective_class: ESSENCIAL,
    class_inherited: false,
    subcategories: [
      {
        ...base,
        id: "delivery",
        name: "Delivery",
        type: "EXPENSE",
        color: "#f00000",
        parent: "comida",
        expense_class: null,
        effective_class: ESSENCIAL,
        class_inherited: true,
      },
      {
        ...base,
        id: "doce",
        name: "Doceria",
        type: "EXPENSE",
        color: "#f00000",
        parent: "comida",
        expense_class: "dis",
        effective_class: DISPENSAVEL,
        class_inherited: false,
      },
    ],
  },
  {
    ...base,
    id: "outros",
    name: "Outros gastos",
    type: "EXPENSE",
    color: "#000000",
    parent: null,
    expense_class: null,
    effective_class: null,
    class_inherited: false,
    subcategories: [],
  },
  { ...base, id: "salario", name: "Salário", type: "INCOME", color: "#00ff00", parent: null, subcategories: [] },
]

async function escolher(gatilho: HTMLElement, opcao: RegExp) {
  await userEvent.click(gatilho)
  await userEvent.click(await screen.findByRole("option", { name: opcao }))
}

beforeEach(() => {
  vi.clearAllMocks()
  auth.user = usuario()
  get.mockImplementation(((url: string) => {
    if (url === "/categories/") return Promise.resolve({ data: CATEGORIAS })
    if (url === "/expense-classes/") return Promise.resolve({ data: CLASSES })
    return Promise.resolve({ data: [] })
  }) as typeof api.get)
  post.mockResolvedValue({ data: {} })
  put.mockResolvedValue({ data: {} })
})

describe("Classe na lista de categorias", () => {
  it("mostra a classe efetiva com a cor, '(herdada)' quando vem da mãe e 'Sem classe' em cinza", async () => {
    render(<CategoriesPage />)
    await screen.findAllByText("Delivery")

    const herdada = screen.getAllByText("Essencial (herdada)")[0]
    expect(herdada).toHaveStyle({ color: "rgb(22, 163, 74)" })
    expect(screen.getAllByText("Essencial")[0]).toHaveStyle({ color: "rgb(22, 163, 74)" })
    expect(screen.getAllByText("Dispensável")[0]).toHaveStyle({ color: "rgb(249, 115, 22)" })
    expect(screen.getAllByText("Sem classe")[0]).toHaveStyle({ color: "rgb(148, 163, 184)" })

    // A linha de Delivery é a que diz "(herdada)"; a de Doceria, não
    expect(within(screen.getAllByText("Delivery")[0].closest("tr")!).getByText("Essencial (herdada)")).toBeInTheDocument()
    expect(within(screen.getAllByText("Doceria")[0].closest("tr")!).queryByText(/herdada/)).not.toBeInTheDocument()
  })
})

describe("Classe no formulário de categoria", () => {
  it("a subcategoria nova começa herdando a classe da mãe e envia expense_class null", async () => {
    render(<CategoriesPage />)
    await screen.findAllByText("Delivery")

    await userEvent.click(screen.getAllByTitle("Nova Subcategoria")[0])
    const dialogo = await screen.findByRole("dialog")
    expect(within(dialogo).getByRole("combobox")).toHaveTextContent("Herdar da categoria-mãe (Essencial)")

    await userEvent.type(within(dialogo).getByPlaceholderText("Ex: Alimentação"), "Feira")
    await userEvent.click(within(dialogo).getByRole("button", { name: /ativar categoria/i }))

    await vi.waitFor(() =>
      expect(post).toHaveBeenCalledWith(
        "/categories/",
        expect.objectContaining({ name: "Feira", parent: "comida", type: "EXPENSE", expense_class: null }),
      ),
    )
  })

  it("a subcategoria pode escolher outra classe no lugar da herdada", async () => {
    render(<CategoriesPage />)
    await screen.findAllByText("Delivery")

    await userEvent.click(screen.getAllByTitle("Nova Subcategoria")[0])
    const dialogo = await screen.findByRole("dialog")
    await escolher(within(dialogo).getByRole("combobox"), /^Dispensável$/)
    await userEvent.type(within(dialogo).getByPlaceholderText("Ex: Alimentação"), "Sorvete")
    await userEvent.click(within(dialogo).getByRole("button", { name: /ativar categoria/i }))

    await vi.waitFor(() =>
      expect(post).toHaveBeenCalledWith("/categories/", expect.objectContaining({ name: "Sorvete", expense_class: "dis" })),
    )
  })

  it("categoria de receita não mostra a seleção de classe nem envia a classe", async () => {
    render(<CategoriesPage />)
    await screen.findAllByText("Delivery")

    await userEvent.click(screen.getByRole("button", { name: /nova categoria/i }))
    const dialogo = await screen.findByRole("dialog")
    expect(within(dialogo).getByText("Classe da Despesa")).toBeInTheDocument()

    await escolher(within(dialogo).getAllByRole("combobox")[0], /^Receita$/)
    expect(within(dialogo).queryByText("Classe da Despesa")).not.toBeInTheDocument()

    await userEvent.type(within(dialogo).getByPlaceholderText("Ex: Alimentação"), "Freelas")
    await userEvent.click(within(dialogo).getByRole("button", { name: /ativar categoria/i }))

    await vi.waitFor(() => expect(post).toHaveBeenCalled())
    const enviado = post.mock.calls[0][1] as Record<string, unknown>
    expect(enviado.type).toBe("INCOME")
    expect(enviado).not.toHaveProperty("expense_class")
  })

  it("a categoria principal de despesa escolhe uma classe ou nenhuma", async () => {
    render(<CategoriesPage />)
    await screen.findAllByText("Delivery")

    await userEvent.click(screen.getByRole("button", { name: /nova categoria/i }))
    const dialogo = await screen.findByRole("dialog")
    const classe = within(dialogo).getAllByRole("combobox")[1]
    expect(classe).toHaveTextContent("Sem classe")

    await escolher(classe, /^Essencial$/)
    await userEvent.type(within(dialogo).getByPlaceholderText("Ex: Alimentação"), "Farmácia")
    await userEvent.click(within(dialogo).getByRole("button", { name: /ativar categoria/i }))

    await vi.waitFor(() =>
      expect(post).toHaveBeenCalledWith(
        "/categories/",
        expect.objectContaining({ name: "Farmácia", type: "EXPENSE", expense_class: "ess" }),
      ),
    )
  })

  it("tirar a classe própria de uma subcategoria volta a herdar a da mãe", async () => {
    render(<CategoriesPage />)
    await screen.findAllByText("Doceria")

    const linha = screen.getAllByText("Doceria")[0].closest("tr")!
    await userEvent.click(within(linha).getAllByRole("button")[0])
    const dialogo = await screen.findByRole("dialog")
    const classe = within(dialogo).getAllByRole("combobox").at(-1)!
    expect(classe).toHaveTextContent("Dispensável")

    await escolher(classe, /Herdar da categoria-mãe \(Essencial\)/)
    await userEvent.click(within(dialogo).getByRole("button", { name: /gravar alterações/i }))

    await vi.waitFor(() =>
      expect(put).toHaveBeenCalledWith("/categories/doce/", expect.objectContaining({ expense_class: null })),
    )
  })
})
