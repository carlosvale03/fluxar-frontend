import { render, screen, within } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import { toast } from "sonner"
import { beforeEach, describe, expect, it, vi } from "vitest"

import { GerenciarClasses } from "@/components/categories/GerenciarClasses"
import { api } from "@/services/apiClient"

// CLASSE-03 a CLASSE-09: o diálogo "Gerenciar classes" lista as classes,
// oferece as sugestões ainda não criadas, cria, edita e exclui com a contagem
// de categorias.

vi.mock("@/services/apiClient", async (importOriginal) => ({
  ...(await importOriginal<typeof import("@/services/apiClient")>()),
  api: { get: vi.fn(), post: vi.fn(), patch: vi.fn(), delete: vi.fn() },
}))

vi.mock("sonner", () => ({ toast: Object.assign(vi.fn(), { success: vi.fn(), error: vi.fn(), info: vi.fn() }) }))

const get = vi.mocked(api.get)
const post = vi.mocked(api.post)
const patch = vi.mocked(api.patch)
const apagar = vi.mocked(api.delete)

const ESSENCIAL = { id: "ess", name: "Essencial", color: "#16A34A", is_default: true, categories_count: 4 }
const DISPENSAVEL = { id: "dis", name: "Dispensável", color: "#F97316", is_default: true, categories_count: 5 }
const DIVIDAS = { id: "div", name: "Dívidas", color: "#DC2626", is_default: false, categories_count: 2 }

let classes: unknown[] = []

function erro400(dados: unknown) {
  return { response: { status: 400, data: dados } }
}

async function abrir() {
  render(<GerenciarClasses />)
  await userEvent.click(screen.getByRole("button", { name: /gerenciar classes/i }))
  const dialogo = await screen.findByRole("dialog")
  await within(dialogo).findByText("Essencial")
  return dialogo
}

describe("Gerenciar classes", () => {
  beforeEach(() => {
    vi.clearAllMocks()
    classes = [ESSENCIAL, DISPENSAVEL]
    get.mockImplementation(((url: string) =>
      url === "/expense-classes/" ? Promise.resolve({ data: classes }) : Promise.resolve({ data: [] })) as typeof api.get)
  })

  it("as sugestões mostram só Dívidas, Impostos e taxas e Profissional que ainda não foram criadas, sem diferença de acento", async () => {
    classes = [ESSENCIAL, DISPENSAVEL, { ...DIVIDAS, name: "dividas" }]
    const dialogo = await abrir()

    expect(within(dialogo).getByRole("button", { name: "Criar Impostos e taxas" })).toBeInTheDocument()
    expect(within(dialogo).getByRole("button", { name: "Criar Profissional" })).toBeInTheDocument()
    expect(within(dialogo).queryByRole("button", { name: "Criar Dívidas" })).not.toBeInTheDocument()
  })

  it("criar pela sugestão envia o nome e a cor da sugestão", async () => {
    post.mockResolvedValue({ data: { id: "imp", name: "Impostos e taxas", color: "#7C3AED", is_default: false, categories_count: 0 } })
    const dialogo = await abrir()

    await userEvent.click(within(dialogo).getByRole("button", { name: "Criar Impostos e taxas" }))

    await vi.waitFor(() =>
      expect(post).toHaveBeenCalledWith("/expense-classes/", { name: "Impostos e taxas", color: "#7C3AED" }),
    )
    expect(toast.success).toHaveBeenCalled()
  })

  it("o nome repetido aparece no campo do nome, sem toast", async () => {
    classes = [ESSENCIAL, DISPENSAVEL, DIVIDAS]
    post.mockRejectedValue(erro400({ name: ["Já existe uma classe com esse nome."] }))
    const dialogo = await abrir()

    await userEvent.type(within(dialogo).getByLabelText(/nome da classe/i), "dividas")
    await userEvent.click(within(dialogo).getByRole("button", { name: /criar classe/i }))

    expect(await within(dialogo).findByText("Já existe uma classe com esse nome.")).toBeInTheDocument()
    expect(post).toHaveBeenCalledWith("/expense-classes/", expect.objectContaining({ name: "dividas" }))
    expect(toast.error).not.toHaveBeenCalled()
  })

  it("o limite de 5 classes vem no toast", async () => {
    classes = [ESSENCIAL, DISPENSAVEL, DIVIDAS, { ...DIVIDAS, id: "pro", name: "Profissional" }]
    post.mockRejectedValue(erro400({ detail: "Limite de 5 classes atingido.", code: "invalid" }))
    const dialogo = await abrir()

    await userEvent.type(within(dialogo).getByLabelText(/nome da classe/i), "Viagens")
    await userEvent.click(within(dialogo).getByRole("button", { name: /criar classe/i }))

    await vi.waitFor(() => expect(toast.error).toHaveBeenCalledWith("Limite de 5 classes atingido."))
  })

  it("com 5 classes não oferece sugestões nem a criação", async () => {
    classes = [
      ESSENCIAL,
      DISPENSAVEL,
      DIVIDAS,
      { ...DIVIDAS, id: "a", name: "Viagens" },
      { ...DIVIDAS, id: "b", name: "Pets" },
    ]
    const dialogo = await abrir()

    expect(within(dialogo).queryByRole("button", { name: /^Criar / })).not.toBeInTheDocument()
    expect(within(dialogo).queryByRole("button", { name: /criar classe/i })).not.toBeInTheDocument()
    expect(within(dialogo).getByText(/limite de 5 classes atingido/i)).toBeInTheDocument()
  })

  it("Essencial e Dispensável não têm as ações de renomear e excluir; a cor delas muda", async () => {
    classes = [ESSENCIAL, DISPENSAVEL, DIVIDAS]
    patch.mockResolvedValue({ data: { ...ESSENCIAL, color: "#0EA5E9" } })
    const dialogo = await abrir()

    expect(within(dialogo).queryByRole("button", { name: "Excluir Essencial" })).not.toBeInTheDocument()
    expect(within(dialogo).queryByRole("button", { name: "Excluir Dispensável" })).not.toBeInTheDocument()
    expect(within(dialogo).queryByRole("button", { name: "Editar Essencial" })).not.toBeInTheDocument()
    expect(within(dialogo).getByRole("button", { name: "Excluir Dívidas" })).toBeInTheDocument()

    await userEvent.click(within(dialogo).getByRole("button", { name: "Mudar a cor de Essencial" }))
    expect(within(dialogo).getByLabelText(/nome da classe/i)).toBeDisabled()
    await userEvent.click(within(dialogo).getByRole("button", { name: "Cor #0EA5E9" }))
    await userEvent.click(within(dialogo).getByRole("button", { name: /salvar classe/i }))

    await vi.waitFor(() => expect(patch).toHaveBeenCalledWith("/expense-classes/ess/", { color: "#0EA5E9" }))
  })

  it("renomear uma classe criada envia o nome novo", async () => {
    classes = [ESSENCIAL, DISPENSAVEL, DIVIDAS]
    patch.mockResolvedValue({ data: { ...DIVIDAS, name: "Empréstimos" } })
    const dialogo = await abrir()

    await userEvent.click(within(dialogo).getByRole("button", { name: "Editar Dívidas" }))
    const nome = within(dialogo).getByLabelText(/nome da classe/i)
    await userEvent.clear(nome)
    await userEvent.type(nome, "Empréstimos")
    await userEvent.click(within(dialogo).getByRole("button", { name: /salvar classe/i }))

    await vi.waitFor(() =>
      expect(patch).toHaveBeenCalledWith("/expense-classes/div/", { name: "Empréstimos", color: "#DC2626" }),
    )
  })

  it("excluir mostra quantas categorias usam a classe e só chama a API depois da confirmação", async () => {
    classes = [ESSENCIAL, DISPENSAVEL, DIVIDAS]
    apagar.mockResolvedValue({ data: null })
    const aoAlterar = vi.fn()
    render(<GerenciarClasses onAlterar={aoAlterar} />)
    await userEvent.click(screen.getByRole("button", { name: /gerenciar classes/i }))
    const dialogo = await screen.findByRole("dialog")
    await within(dialogo).findByText("Dívidas")

    await userEvent.click(within(dialogo).getByRole("button", { name: "Excluir Dívidas" }))
    const alerta = await screen.findByRole("alertdialog")
    expect(within(alerta).getByText(/2 categorias usam esta classe\./)).toBeInTheDocument()
    expect(apagar).not.toHaveBeenCalled()

    await userEvent.click(within(alerta).getByRole("button", { name: "Cancelar" }))
    expect(apagar).not.toHaveBeenCalled()

    await userEvent.click(within(dialogo).getByRole("button", { name: "Excluir Dívidas" }))
    await userEvent.click(within(await screen.findByRole("alertdialog")).getByRole("button", { name: "Excluir classe" }))

    await vi.waitFor(() => expect(apagar).toHaveBeenCalledWith("/expense-classes/div/"))
    await vi.waitFor(() => expect(aoAlterar).toHaveBeenCalled())
  })
})
