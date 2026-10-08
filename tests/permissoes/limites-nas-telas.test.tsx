import { readdirSync, readFileSync, statSync } from "node:fs"
import path from "node:path"

import { render, screen } from "@testing-library/react"
import { beforeEach, describe, expect, it, vi } from "vitest"

import CardsPage from "@/app/(app)/cartoes/page"
import CategoriesPage from "@/app/(app)/categorias/page"
import AccountsPage from "@/app/(app)/contas/page"
import GoalsPage from "@/app/(app)/metas/page"
import TagsPage from "@/app/(app)/tags/page"
import type { User } from "@/contexts/auth-context"
import { api } from "@/services/apiClient"
import { getCategories } from "@/services/categories"
import { goalsService } from "@/services/goals"
import { getTags } from "@/services/tags"
import type { ChaveDeLimite, UsoDoLimite } from "@/types/planos"

import { usuario } from "./acesso"

// PERM-20: no limite, a tela mostra o uso e o limite, desabilita a criação e
// oferece o link para os planos. PERM-18: os limites vêm só do /auth/me, sem
// número nem nome de plano no código das telas.

const auth = vi.hoisted(() => ({ user: null as User | null }))
const estadoDoAuth = () => ({ user: auth.user, isLoading: false })

vi.mock("@/contexts/auth-context", () => ({ useAuth: () => estadoDoAuth() }))
vi.mock("@/hooks/use-auth", () => ({ useAuth: () => estadoDoAuth() }))
vi.mock("@/services/goals", () => ({ goalsService: { getGoals: vi.fn(), deleteGoal: vi.fn() } }))
vi.mock("@/services/tags", () => ({ getTags: vi.fn(), deleteTag: vi.fn(), getTagInsights: vi.fn(), createTag: vi.fn() }))
vi.mock("@/services/categories", () => ({ getCategories: vi.fn(), deleteCategory: vi.fn() }))
vi.mock("@/services/apiClient", async (importOriginal) => ({
  ...(await importOriginal<typeof import("@/services/apiClient")>()),
  api: { get: vi.fn(), post: vi.fn(), delete: vi.fn() },
}))
vi.mock("sonner", () => ({ toast: Object.assign(vi.fn(), { success: vi.fn(), error: vi.fn(), info: vi.fn() }) }))
vi.mock("next/navigation", () => ({
  useRouter: () => ({ push: vi.fn(), replace: vi.fn() }),
  usePathname: () => "/",
  useSearchParams: () => new URLSearchParams(),
}))

const get = vi.mocked(api.get)
const ATINGIDO = "Você atingiu o limite do seu plano."

function comLimite(chave: ChaveDeLimite, uso: UsoDoLimite) {
  auth.user = usuario({ limites: { [chave]: uso } })
}

function categoria(id: string, nome: string, subcategorias: number) {
  return {
    id,
    name: nome,
    type: "EXPENSE",
    icon: "Tag",
    color: "#000000",
    is_active: true,
    is_default: false,
    subcategories: Array.from({ length: subcategorias }, (_, i) => ({
      id: `${id}-sub-${i}`,
      name: `${nome} ${i}`,
      type: "EXPENSE",
      icon: "Tag",
      color: "#000000",
      is_active: true,
      is_default: false,
      parent: id,
    })),
  }
}

beforeEach(() => {
  vi.clearAllMocks()
  get.mockResolvedValue({ data: [] })
  vi.mocked(goalsService.getGoals).mockResolvedValue([])
  vi.mocked(getTags).mockResolvedValue([])
  vi.mocked(getCategories).mockResolvedValue([])
})

describe("Limites nas telas", () => {
  it("contas com {limit: 2, used: 2}: mostra \"2 de 2\", desabilita \"Nova Conta\" e leva aos planos", async () => {
    comLimite("limite_contas", { limit: 2, used: 2 })
    render(<AccountsPage />)

    const aviso = await screen.findByRole("note")
    expect(aviso).toHaveTextContent(ATINGIDO)
    expect(aviso).toHaveTextContent("2 de 2 contas")
    expect(screen.getByRole("link", { name: "Ver planos" })).toHaveAttribute("href", "/planos")
    await vi.waitFor(() => expect(screen.getByRole("button", { name: /Nova Conta/ })).toBeDisabled())
  })

  it("contas abaixo do limite: mostra o uso e deixa criar", async () => {
    comLimite("limite_contas", { limit: 2, used: 1 })
    render(<AccountsPage />)

    expect(screen.getByText("1 de 2 contas do seu plano")).toBeInTheDocument()
    await vi.waitFor(() => expect(screen.getByRole("button", { name: /Nova Conta/ })).toBeEnabled())
    expect(screen.queryByText(ATINGIDO)).not.toBeInTheDocument()
  })

  it("cartões no limite: desabilita \"Novo Cartão\" e mostra o aviso", async () => {
    comLimite("limite_cartoes", { limit: 1, used: 1 })
    render(<CardsPage />)

    expect(await screen.findByRole("note")).toHaveTextContent("1 de 1 cartões")
    await vi.waitFor(() => expect(screen.getByRole("button", { name: /Novo Cartão/ })).toBeDisabled())
  })

  it("categorias principais no limite: desabilita \"Nova Categoria\" e mostra o aviso", () => {
    comLimite("limite_categorias", { limit: 3, used: 3 })
    render(<CategoriesPage />)

    expect(screen.getByRole("note")).toHaveTextContent("3 de 3 categorias")
    expect(screen.getByRole("button", { name: /Nova Categoria/ })).toBeDisabled()
  })

  it("subcategorias: o limite vale por categoria-pai, com o uso contado na tela", async () => {
    comLimite("limite_subcategorias", { limit: 2 })
    vi.mocked(getCategories).mockResolvedValue([categoria("cheia", "Moradia", 2), categoria("livre", "Lazer", 1)] as never)
    render(<CategoriesPage />)

    expect(await screen.findByText("2 / 2")).toBeInTheDocument()
    expect(screen.getByText("1 / 2")).toBeInTheDocument()
    const botoes = screen.getAllByTitle("Nova Subcategoria")
    expect(botoes).toHaveLength(2)
    expect(botoes[0]).toBeDisabled()
    expect(botoes[1]).toBeEnabled()
  })

  it("tags no limite: desabilita a criação de tag e mostra o aviso", async () => {
    comLimite("limite_tags", { limit: 5, used: 5 })
    render(<TagsPage />)

    expect(screen.getByRole("note")).toHaveTextContent("5 de 5 tags")
    expect(screen.getByRole("button", { name: /Nova Tag/ })).toBeDisabled()
  })

  it("metas no limite: desabilita \"Nova Meta\" e mostra o aviso", () => {
    comLimite("limite_metas", { limit: 1, used: 1 })
    render(<GoalsPage />)

    expect(screen.getByRole("note")).toHaveTextContent("1 de 1 metas")
    expect(screen.getByRole("button", { name: /Nova Meta/ })).toBeDisabled()
  })
})

// Exibir o nome do plano só em use-plan.ts, na página de planos e no tipo;
// o painel admin edita o plano dos usuários e fica de fora
const PERMITIDOS = ["hooks/use-plan.ts", "app/(app)/planos/page.tsx", "types/planos.ts"].map((p) => path.normalize(p))

function arquivos(pasta: string): string[] {
  return readdirSync(pasta).flatMap((nome) => {
    const caminho = path.join(pasta, nome)
    return statSync(caminho).isDirectory() ? arquivos(caminho) : [caminho]
  })
}

describe("Nenhuma decisão de acesso escrita no código (PERM-18)", () => {
  it("nenhum nome de plano nem limite fixo nas telas fora de use-plan.ts e da página de planos", () => {
    const raiz = path.resolve(__dirname, "../../src")
    const encontrados = arquivos(raiz)
      .filter((arquivo) => /\.tsx?$/.test(arquivo))
      .map((arquivo) => path.relative(raiz, arquivo))
      .filter((relativo) => !relativo.startsWith(path.normalize("app/(admin)")) && !PERMITIDOS.includes(relativo))
      .filter((relativo) => {
        const fonte = readFileSync(path.join(raiz, relativo), "utf-8")
        return /PREMIUM|COMMON|isPremium|PLAN_LIMITS|CARD_LIMITS|\} \/ 5\b|Count >= 5/.test(fonte)
      })

    expect(encontrados).toEqual([])
  })
})
