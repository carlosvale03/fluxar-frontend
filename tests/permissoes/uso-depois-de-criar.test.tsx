import { render, screen, within } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import { beforeEach, describe, expect, it, vi } from "vitest"

import GoalsPage from "@/app/(app)/metas/page"
import { TagForm } from "@/components/tags/TagForm"
import type { User } from "@/contexts/auth-context"
import { api } from "@/services/apiClient"
import { goalsService } from "@/services/goals"
import { createTag } from "@/services/tags"
import type { Goal } from "@/types/goals"

import { usuario } from "./acesso"

// PERM-20: depois de criar ou excluir com sucesso um item que tem limite, a
// tela relê o /auth/me (refreshUser) para o `used` e o AvisoDeLimite
// acompanharem na hora. Se a criação falha, o uso não muda e nada é relido.

const auth = vi.hoisted(() => ({ user: null as User | null, refreshUser: vi.fn() }))
const estadoDoAuth = () => ({ user: auth.user, isLoading: false, refreshUser: auth.refreshUser })

vi.mock("@/contexts/auth-context", () => ({ useAuth: () => estadoDoAuth() }))
vi.mock("@/hooks/use-auth", () => ({ useAuth: () => estadoDoAuth() }))
vi.mock("@/services/goals", () => ({
  goalsService: { getGoals: vi.fn(), getPiggyBanks: vi.fn().mockResolvedValue([]), deleteGoal: vi.fn(), getHistory: vi.fn() },
}))
vi.mock("@/services/tags", () => ({ getTags: vi.fn(), createTag: vi.fn(), updateTag: vi.fn() }))
vi.mock("@/services/apiClient", async (importOriginal) => ({
  ...(await importOriginal<typeof import("@/services/apiClient")>()),
  api: { get: vi.fn(), post: vi.fn(), put: vi.fn(), delete: vi.fn() },
}))
vi.mock("sonner", () => ({ toast: Object.assign(vi.fn(), { success: vi.fn(), error: vi.fn(), info: vi.fn() }) }))
vi.mock("next/navigation", () => ({
  useRouter: () => ({ push: vi.fn(), replace: vi.fn() }),
  usePathname: () => "/",
  useSearchParams: () => new URLSearchParams(),
}))

const META = {
  id: "meta-1",
  name: "Viagem",
  target_amount: "1000.00",
  current_amount: "0.00",
  account: "conta-1",
  status: "ACTIVE",
  progress_percentage: 0,
  amount_remaining: "1000.00",
  created_at: "2026-01-01T00:00:00Z",
  updated_at: "2026-01-01T00:00:00Z",
} as unknown as Goal

beforeEach(() => {
  vi.clearAllMocks()
  auth.user = usuario({ limites: { limite_tags: { limit: 5, used: 4 }, limite_metas: { limit: 2, used: 1 } } })
  auth.refreshUser.mockResolvedValue(undefined)
  vi.mocked(api.get).mockResolvedValue({ data: [] })
  vi.mocked(goalsService.getGoals).mockResolvedValue([META])
})

describe("Uso dos limites depois de criar ou excluir (PERM-20)", () => {
  it("criar uma tag relê o /auth/me", async () => {
    vi.mocked(createTag).mockResolvedValue({ id: "tag-1", name: "Viagem", color: "#6366f1" } as never)
    render(<TagForm onSuccess={vi.fn()} onCancel={vi.fn()} />)

    await userEvent.type(screen.getByPlaceholderText(/Ex: Urgente/), "Viagem")
    await userEvent.click(screen.getByRole("button", { name: /Criar Tag/ }))

    await vi.waitFor(() => expect(createTag).toHaveBeenCalled())
    await vi.waitFor(() => expect(auth.refreshUser).toHaveBeenCalledTimes(1))
  })

  it("criar uma tag que falha não relê o /auth/me", async () => {
    vi.mocked(createTag).mockRejectedValue(new Error("falhou"))
    render(<TagForm onSuccess={vi.fn()} onCancel={vi.fn()} />)

    await userEvent.type(screen.getByPlaceholderText(/Ex: Urgente/), "Viagem")
    await userEvent.click(screen.getByRole("button", { name: /Criar Tag/ }))

    await vi.waitFor(() => expect(createTag).toHaveBeenCalled())
    expect(auth.refreshUser).not.toHaveBeenCalled()
  })

  it("excluir uma meta relê o /auth/me", async () => {
    vi.mocked(goalsService.deleteGoal).mockResolvedValue(undefined as never)
    vi.stubGlobal("confirm", () => true)
    render(<GoalsPage />)

    const titulo = await screen.findByText("Viagem")
    const cartao = titulo.closest("[class*='group']") as HTMLElement
    const botoes = within(cartao).getAllByRole("button")
    await userEvent.click(botoes.find((b) => b.getAttribute("aria-haspopup") === "menu") as HTMLElement)
    await userEvent.click(await screen.findByRole("menuitem", { name: /Excluir/ }))

    await vi.waitFor(() => expect(goalsService.deleteGoal).toHaveBeenCalledWith("meta-1"))
    await vi.waitFor(() => expect(auth.refreshUser).toHaveBeenCalledTimes(1))
    vi.unstubAllGlobals()
  })
})
