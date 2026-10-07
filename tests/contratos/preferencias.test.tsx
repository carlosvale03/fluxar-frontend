import { render, screen } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import { beforeEach, describe, expect, it, vi } from "vitest"

import SettingsPage from "@/app/(app)/configuracoes/page"
import { AuthProvider, type User } from "@/contexts/auth-context"
import { ThemeProvider } from "@/providers/theme-provider"
import { api } from "@/services/apiClient"

// CONTRATO-26: as configurações enviam só o objeto preferences.
// CONTRATO-27: o tema salvo é aplicado quando o usuário carrega.
// CONTRATO-28 e CONTRATO-30: o erro de uma preferência aparece no campo.

const { usuarioAtual, refreshUser } = vi.hoisted(() => ({
  usuarioAtual: { valor: null as unknown },
  refreshUser: vi.fn(),
}))

vi.mock("@/hooks/use-auth", () => ({
  useAuth: () => ({ user: usuarioAtual.valor, refreshUser }),
}))

vi.mock("@/services/apiClient", async (importOriginal) => ({
  ...(await importOriginal<typeof import("@/services/apiClient")>()),
  api: { get: vi.fn(), post: vi.fn(), put: vi.fn(), patch: vi.fn() },
  aoSessaoEncerrada: () => () => {},
  limparTokensAntigos: () => {},
  definirTokenDeAcesso: () => {},
}))

vi.mock("@/lib/sessao-entre-abas", () => ({
  renovarSessao: () => Promise.resolve(),
  aoFimDaSessao: () => () => {},
  anunciarFimDaSessao: () => {},
}))

vi.mock("next/navigation", () => ({ useRouter: () => ({ push: vi.fn(), replace: vi.fn() }) }))
vi.mock("sonner", () => ({ toast: Object.assign(vi.fn(), { success: vi.fn(), error: vi.fn() }) }))

// O jsdom não tem matchMedia, que o next-themes usa para o tema do sistema
window.matchMedia ??= ((consulta: string) => ({
  matches: false,
  media: consulta,
  addEventListener: () => {},
  removeEventListener: () => {},
  addListener: () => {},
  removeListener: () => {},
})) as unknown as typeof window.matchMedia

function usuario(preferencias: Partial<User["preferences"]>): User {
  return {
    id: "1",
    name: "Ana",
    email: "ana@x.com",
    role: "USER",
    plan: "COMMON",
    preferences: {
      currency: "BRL",
      language: "pt-BR",
      theme: "light",
      notifications: { email: true, push: false },
      ...preferencias,
    },
  } as User
}

describe("Preferências salvas e aplicadas", () => {
  beforeEach(() => {
    vi.clearAllMocks()
    vi.mocked(api.patch).mockResolvedValue({ data: {} })
    document.documentElement.className = ""
    localStorage.clear()
  })

  it("salvar o tema escuro e desligar o e-mail envia só {preferences}", async () => {
    usuarioAtual.valor = usuario({})
    render(<SettingsPage />)

    await userEvent.click(screen.getByRole("switch", { name: /notificações por e-mail/i }))
    await userEvent.click(screen.getByRole("button", { name: /escuro/i }))

    await vi.waitFor(() => expect(api.patch).toHaveBeenCalledTimes(1))
    expect(api.put).not.toHaveBeenCalled()
    expect(api.patch).toHaveBeenCalledWith("/users/me/", {
      preferences: {
        currency: "BRL",
        language: "pt-BR",
        theme: "dark",
        notifications: { email: false, push: false },
      },
    })
  })

  it("com um usuário que volta com theme dark, o tema escuro é aplicado ao carregar", async () => {
    vi.mocked(api.get).mockResolvedValue({ data: usuario({ theme: "dark" }) })
    render(
      <ThemeProvider attribute="class" defaultTheme="light">
        <AuthProvider>
          <p>conteúdo</p>
        </AuthProvider>
      </ThemeProvider>,
    )

    await vi.waitFor(() => expect(api.get).toHaveBeenCalledWith("/auth/me/"))
    await vi.waitFor(() => expect(document.documentElement).toHaveClass("dark"))
    expect(document.documentElement).not.toHaveClass("light")
  })

  it("o erro de uma preferência aparece no campo", async () => {
    usuarioAtual.valor = usuario({})
    vi.mocked(api.patch).mockRejectedValue({
      response: { status: 400, data: { preferences: { theme: ['"roxo" não é um escolha válida.'] } } },
    })
    render(<SettingsPage />)

    await userEvent.click(screen.getByRole("button", { name: /salvar alterações/i }))

    expect(await screen.findByText('"roxo" não é um escolha válida.')).toBeInTheDocument()
    const { toast } = await import("sonner")
    expect(toast.error).not.toHaveBeenCalled()
  })
})
