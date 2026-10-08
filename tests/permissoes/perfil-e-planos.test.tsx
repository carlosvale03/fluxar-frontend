import { render, screen, within } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import { beforeEach, describe, expect, it, vi } from "vitest"

import PlanosPage from "@/app/(app)/planos/page"
import ProfilePage from "@/app/(app)/perfil/page"
import { Header } from "@/components/layout/header"
import type { User } from "@/contexts/auth-context"
import { api } from "@/services/apiClient"
import type { TravaDoCatalogo } from "@/types/planos"

import { usuario } from "./acesso"

// PERM-25: com a liberação ligada, o perfil mostra o plano real e o aviso.
// PERM-27: a página de planos mostra recursos e limites de cada plano, vindos
// de /api/plans/, com o plano do usuário em destaque.

const auth = vi.hoisted(() => ({ user: null as User | null }))
const estadoDoAuth = () => ({ user: auth.user, isLoading: false, refreshUser: vi.fn(), logout: vi.fn() })

vi.mock("next/navigation", () => ({
  useRouter: () => ({ push: vi.fn(), replace: vi.fn() }),
  usePathname: () => "/perfil",
}))
vi.mock("next-themes", () => ({ useTheme: () => ({ theme: "light", setTheme: vi.fn() }) }))
vi.mock("@/hooks/use-auth", () => ({ useAuth: () => estadoDoAuth() }))
vi.mock("@/contexts/auth-context", () => ({ useAuth: () => estadoDoAuth() }))
vi.mock("sonner", () => ({ toast: { success: vi.fn(), error: vi.fn() } }))
vi.mock("@/services/apiClient", async (importOriginal) => ({
  ...(await importOriginal<typeof import("@/services/apiClient")>()),
  api: { get: vi.fn(), post: vi.fn(), patch: vi.fn() },
}))

const get = vi.mocked(api.get)

const AVISO = "Todos os recursos estão liberados durante a fase de testes."

const CATALOGO: TravaDoCatalogo[] = [
  {
    key: "metas",
    type: "feature",
    name: "Metas",
    description: "Metas, aportes e cofrinho",
    values: { COMMON: false, PREMIUM: true, PREMIUM_PLUS: true },
  },
  {
    key: "exportacao_pdf",
    type: "feature",
    name: "Exportação em PDF",
    description: "Transações em PDF",
    values: { COMMON: false, PREMIUM: false, PREMIUM_PLUS: true },
  },
  {
    key: "limite_contas",
    type: "limit",
    name: "Contas",
    description: "Contas ativas",
    values: { COMMON: { limit: 2 }, PREMIUM: { limit: 5 }, PREMIUM_PLUS: { limit: null } },
  },
]

describe("Plano no perfil", () => {
  beforeEach(() => {
    get.mockReset()
    get.mockResolvedValue({ data: {} })
  })

  it("com a liberação ligada, um Comum vê \"Plano Comum\" e o aviso da fase de testes", () => {
    auth.user = usuario({ plan: "COMMON", testing_unlock: true })
    render(<ProfilePage />)

    expect(screen.getByText("Plano Comum")).toBeInTheDocument()
    expect(screen.getByText(AVISO)).toBeInTheDocument()
    expect(screen.getByRole("link", { name: "Ver planos" })).toHaveAttribute("href", "/planos")
  })

  it("com a liberação desligada, mostra o plano real sem o aviso", () => {
    auth.user = usuario({ plan: "PREMIUM", testing_unlock: false })
    render(<ProfilePage />)

    expect(screen.getByText("Plano Premium")).toBeInTheDocument()
    expect(screen.queryByText(AVISO)).not.toBeInTheDocument()
  })
})

describe("Página de planos", () => {
  beforeEach(() => {
    auth.user = usuario({ plan: "PREMIUM" })
    get.mockReset()
    get.mockImplementation(((url: string) =>
      url === "/plans/"
        ? Promise.resolve({ data: { plan: "PREMIUM", catalog: CATALOGO } })
        : Promise.reject(new Error(url))) as typeof api.get)
  })

  it("mostra cada trava com o valor dos três planos, vindos de /api/plans/", async () => {
    render(<PlanosPage />)

    const tabela = await screen.findByRole("table")
    expect(get).toHaveBeenCalledWith("/plans/")
    const linha = (nome: string) =>
      within(tabela).getByText(nome).closest("tr") as HTMLElement
    const celulas = (nome: string) =>
      within(linha(nome))
        .getAllByRole("cell")
        .slice(1)
        .map((celula) => celula.textContent)

    expect(celulas("Metas")).toEqual(["Não incluído", "Incluído", "Incluído"])
    expect(celulas("Exportação em PDF")).toEqual(["Não incluído", "Não incluído", "Incluído"])
    expect(celulas("Contas")).toEqual(["Até 2", "Até 5", "Sem limite"])
    expect(within(linha("Contas")).getByText("Contas ativas")).toBeInTheDocument()
  })

  it("destaca o plano do usuário", async () => {
    render(<PlanosPage />)

    const tabela = await screen.findByRole("table")
    const cabecalhos = within(tabela).getAllByRole("columnheader")
    const atual = cabecalhos.filter((th) => th.getAttribute("aria-current") === "true")
    expect(atual).toHaveLength(1)
    expect(atual[0]).toHaveTextContent("PremiumSeu plano")
    expect(screen.getByText("Seu plano atual: Premium")).toBeInTheDocument()
  })

  it("o menu do usuário leva à página de planos", async () => {
    render(<Header />)

    await userEvent.click(screen.getByRole("button", { name: "A" }))
    expect(await screen.findByRole("menuitem", { name: /Planos/ })).toHaveAttribute("href", "/planos")
  })
})
