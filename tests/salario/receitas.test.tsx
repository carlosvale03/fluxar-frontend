import { render, screen, within } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import { toast } from "sonner"
import { beforeEach, describe, expect, it, vi } from "vitest"

import SalarioPage from "@/app/(app)/salario/page"
import type { User } from "@/contexts/auth-context"
import { api } from "@/services/apiClient"
import type { PlanoDoSalario } from "@/types/salario"

import { usuario } from "../permissoes/acesso"
import { CATEGORIAS_DE_RECEITA, CONTAS, METAS, MODELOS, PLANO_SALVO, SEM_PLANO, recebimento, referencias, resposta } from "./dados"

// SALARIO-14: as receitas de salário ficam num painel próprio, visível com ou
// sem plano, que grava só as categorias (PUT /salary/categories/) e relê os
// salários a dividir

const auth = vi.hoisted(() => ({ user: null as User | null }))
const estadoDoAuth = () => ({ user: auth.user, isLoading: false, refreshUser: vi.fn() })

vi.mock("next/navigation", () => ({
  useRouter: () => ({ push: vi.fn(), replace: vi.fn() }),
  usePathname: () => "/salario",
  useSearchParams: () => new URLSearchParams(),
}))
vi.mock("@/hooks/use-auth", () => ({ useAuth: () => estadoDoAuth() }))
vi.mock("@/contexts/auth-context", () => ({ useAuth: () => estadoDoAuth() }))
vi.mock("sonner", () => ({ toast: Object.assign(vi.fn(), { success: vi.fn(), error: vi.fn() }) }))
vi.mock("@/services/apiClient", async (importOriginal) => ({
  ...(await importOriginal<typeof import("@/services/apiClient")>()),
  api: { get: vi.fn(), post: vi.fn(), put: vi.fn() },
}))

Element.prototype.hasPointerCapture ??= () => false
Element.prototype.releasePointerCapture ??= () => {}
Element.prototype.scrollIntoView ??= () => {}

const get = vi.mocked(api.get)
const put = vi.mocked(api.put)

// Salário com a subcategoria Bônus, e Freelance
const CATEGORIAS = [
  {
    ...CATEGORIAS_DE_RECEITA[0],
    subcategories: [
      { id: "cat-bonus", name: "Bônus", type: "INCOME", icon: "Gift", color: "#00aa00", is_active: true, is_default: false, parent: "cat-salario", subcategories: [] },
    ],
  },
  CATEGORIAS_DE_RECEITA[1],
]

let pendentes: () => unknown[]

function comPlano(plano: PlanoDoSalario) {
  const dados: Record<string, unknown> = {
    "/salary/references/": referencias(),
    "/salary/plan/": plano,
    "/salary/models/": MODELOS,
    "/accounts/": CONTAS,
    "/goals/": METAS,
    "/categories/": CATEGORIAS,
  }
  get.mockImplementation(((url: string) => resposta(url === "/salary/pending/" ? pendentes() : (dados[url] ?? []))) as typeof api.get)
}

const chamadasDosPendentes = () => get.mock.calls.filter(([url]) => url === "/salary/pending/")
const painel = () => screen.findByRole("region", { name: "Entradas do salário" })

beforeEach(() => {
  vi.clearAllMocks()
  auth.user = usuario()
  pendentes = () => []
  comPlano(SEM_PLANO)
  put.mockImplementation(((url: string, corpo: unknown) =>
    resposta(url === "/salary/categories/" ? { ...SEM_PLANO, ...(corpo as object) } : { ...PLANO_SALVO, ...(corpo as object) })) as typeof api.put)
})

// A página inteira é pesada no jsdom quando a suíte roda em paralelo
describe("Entradas do salário", { timeout: 15000 }, () => {
  it("sem plano, mostra as categorias de receita com as subcategorias e as salvas marcadas", async () => {
    render(<SalarioPage />)
    const receitas = await painel()

    expect(receitas).toHaveTextContent("As entradas nestas categorias aparecem para dividir.")
    const caixas = await within(receitas).findAllByRole("checkbox")
    expect(caixas.map((c) => c.getAttribute("id"))).toEqual([
      "categoria-do-salario-cat-salario",
      "categoria-do-salario-cat-bonus",
      "categoria-do-salario-cat-freela",
    ])
    expect(within(receitas).getByRole("checkbox", { name: "Salário" })).toBeChecked()
    expect(within(receitas).getByRole("checkbox", { name: "Bônus" })).not.toBeChecked()
    expect(within(receitas).getByRole("checkbox", { name: "Freelance" })).not.toBeChecked()
  })

  it("Salvar só habilita quando a escolha muda", async () => {
    render(<SalarioPage />)
    const receitas = await painel()
    const salvar = await within(receitas).findByRole("button", { name: "Salvar" })

    expect(salvar).toBeDisabled()
    await userEvent.click(within(receitas).getByRole("checkbox", { name: "Freelance" }))
    expect(salvar).toBeEnabled()
    await userEvent.click(within(receitas).getByRole("checkbox", { name: "Freelance" }))
    expect(salvar).toBeDisabled()
  })

  it("salvar envia só as categorias e relê os salários a dividir", async () => {
    render(<SalarioPage />)
    const receitas = await painel()
    await vi.waitFor(() => expect(chamadasDosPendentes()).toHaveLength(1))
    // Com Freelance marcada, o freela passa a aparecer para dividir
    pendentes = () => [recebimento({ id: "rec-freela", description: "Freela de outubro", category: "cat-freela", category_name: "Freelance" })]

    await userEvent.click(await within(receitas).findByRole("checkbox", { name: "Freelance" }))
    await userEvent.click(within(receitas).getByRole("checkbox", { name: "Salário" }))
    await userEvent.click(within(receitas).getByRole("button", { name: "Salvar" }))

    await vi.waitFor(() => expect(put).toHaveBeenCalledTimes(1))
    expect(put).toHaveBeenCalledWith("/salary/categories/", { salary_categories: ["cat-freela"] })
    await vi.waitFor(() => expect(chamadasDosPendentes()).toHaveLength(2))
    expect(await screen.findByRole("list", { name: "Salários a dividir" })).toHaveTextContent("Freela de outubro")
    expect(toast.success).toHaveBeenCalledWith("Entradas do salário salvas.")
    // SALARIO-62: salvo, a seção recolhe com o nome escolhido e o foco no "Alterar"
    const alterar = await within(receitas).findByRole("button", { name: "Alterar entradas do salário" })
    expect(alterar).toHaveAttribute("aria-expanded", "false")
    expect(document.activeElement).toBe(alterar)
    expect(receitas).toHaveTextContent("Freelance")
    expect(within(receitas).queryByRole("checkbox")).not.toBeInTheDocument()
    // Aberta de novo, o botão está desabilitado com a nova escolha marcada
    await userEvent.click(alterar)
    expect(within(receitas).getByRole("button", { name: "Salvar" })).toBeDisabled()
    expect(within(receitas).getByRole("checkbox", { name: "Freelance" })).toBeChecked()
  })

  it("com categorias escolhidas e salário a dividir, a seção começa recolhida com os nomes e \"Alterar\"", async () => {
    pendentes = () => [recebimento()]
    comPlano({ ...SEM_PLANO, salary_categories: ["cat-salario", "cat-bonus"] })
    render(<SalarioPage />)
    const receitas = await painel()

    const alterar = await within(receitas).findByRole("button", { name: "Alterar entradas do salário" })
    expect(alterar).toHaveTextContent("Alterar")
    expect(alterar).toHaveAttribute("aria-expanded", "false")
    const conteudo = document.getElementById(alterar.getAttribute("aria-controls")!)
    expect(conteudo).not.toBeNull()
    expect(conteudo).not.toBeVisible()
    expect(receitas).toHaveTextContent("Salário, Bônus")
    expect(within(receitas).queryByRole("checkbox")).not.toBeInTheDocument()

    await userEvent.click(alterar)

    const recolher = within(receitas).getByRole("button", { name: "Recolher entradas do salário" })
    expect(recolher).toHaveAttribute("aria-expanded", "true")
    expect(conteudo).toBeVisible()
    expect(within(receitas).getByRole("checkbox", { name: "Bônus" })).toBeChecked()
    await userEvent.click(recolher)
    expect(within(receitas).queryByRole("checkbox")).not.toBeInTheDocument()
  })

  it("sem categorias escolhidas, a seção começa aberta mesmo com salário a dividir", async () => {
    pendentes = () => [recebimento()]
    comPlano({ ...SEM_PLANO, salary_categories: [] })
    render(<SalarioPage />)
    const receitas = await painel()

    expect(await within(receitas).findByRole("checkbox", { name: "Salário" })).not.toBeChecked()
    expect(within(receitas).getByRole("button", { name: "Recolher entradas do salário" })).toHaveAttribute("aria-expanded", "true")
  })

  it("com a seção recolhida, \"Escolher entradas do salário\" abre e põe o foco na primeira categoria", async () => {
    render(<SalarioPage />)
    const receitas = await painel()
    await userEvent.click(await within(receitas).findByRole("checkbox", { name: "Freelance" }))
    await userEvent.click(within(receitas).getByRole("button", { name: "Salvar" }))
    await within(receitas).findByRole("button", { name: "Alterar entradas do salário" })

    await userEvent.click(await screen.findByRole("button", { name: "Escolher entradas do salário" }))

    expect(within(receitas).getByRole("button", { name: "Recolher entradas do salário" })).toHaveAttribute("aria-expanded", "true")
    expect(document.activeElement).toBe(within(receitas).getByRole("checkbox", { name: "Salário" }))
  })

  it("salvar o plano grava só as partes, sem reenviar as categorias", async () => {
    render(<SalarioPage />)
    const receitas = await painel()

    await userEvent.click(await within(receitas).findByRole("checkbox", { name: "Freelance" }))
    await userEvent.click(within(receitas).getByRole("button", { name: "Salvar" }))
    await vi.waitFor(() => expect(put).toHaveBeenCalledTimes(1))
    // Salvas, a seção recolhe
    await within(receitas).findByRole("button", { name: "Alterar entradas do salário" })

    await userEvent.click(await screen.findByRole("button", { name: "Usar o modelo 50/30/20" }))
    await userEvent.click(screen.getByRole("button", { name: "Salvar plano" }))

    await vi.waitFor(() => expect(put).toHaveBeenCalledTimes(2))
    expect(put.mock.calls[1][0]).toBe("/salary/plan/")
    expect(put.mock.calls[1][1]).not.toHaveProperty("salary_categories")
  })

  it("uma categoria salva que foi inativada não aparece nem vai no envio", async () => {
    comPlano({ ...SEM_PLANO, salary_categories: ["cat-salario", "cat-inativada"] })
    render(<SalarioPage />)
    const receitas = await painel()

    const salvar = await within(receitas).findByRole("button", { name: "Salvar" })
    expect(within(receitas).getByText("1 marcada")).toBeInTheDocument()
    expect(salvar).toBeDisabled()
    await userEvent.click(within(receitas).getByRole("checkbox", { name: "Freelance" }))
    await userEvent.click(salvar)

    await vi.waitFor(() => expect(put).toHaveBeenCalledTimes(1))
    expect(put).toHaveBeenCalledWith("/salary/categories/", { salary_categories: ["cat-salario", "cat-freela"] })
  })

  it("sem salário a dividir, explica e leva ao painel com o foco na primeira categoria", async () => {
    render(<SalarioPage />)

    const faixa = await screen.findByRole("region", { name: "Salário recebido" })
    expect(await within(faixa).findByText("Nenhum salário a dividir neste mês ou no anterior.")).toBeInTheDocument()
    expect(faixa).toHaveTextContent("Suas entradas de salário estão em outra categoria?")
    const receitas = await painel()
    await within(receitas).findByRole("checkbox", { name: "Salário" })

    await userEvent.click(within(faixa).getByRole("button", { name: "Escolher entradas do salário" }))

    expect(receitas).toContainElement(document.activeElement as HTMLElement)
    expect(document.activeElement).toBe(within(receitas).getByRole("checkbox", { name: "Salário" }))
  })

  it("a categoria recusada pelo backend aparece no toast, e a escolha continua", async () => {
    put.mockRejectedValue({ response: { status: 400, data: { salary_categories: ["Categoria não encontrada."] } } })
    render(<SalarioPage />)
    const receitas = await painel()

    await userEvent.click(await within(receitas).findByRole("checkbox", { name: "Freelance" }))
    await userEvent.click(within(receitas).getByRole("button", { name: "Salvar" }))

    await vi.waitFor(() => expect(toast.error).toHaveBeenCalledWith("Categoria não encontrada."))
    expect(within(receitas).getByRole("checkbox", { name: "Freelance" })).toBeChecked()
    expect(within(receitas).getByRole("button", { name: "Salvar" })).toBeEnabled()
    expect(chamadasDosPendentes()).toHaveLength(1)
  })
})
