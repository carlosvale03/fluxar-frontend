import { render, screen, waitFor } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import { toast } from "sonner"
import { beforeEach, describe, expect, it, vi } from "vitest"

import SettingsPage from "@/app/(app)/configuracoes/page"
import { api } from "@/services/apiClient"

// LGPD-01: as configurações oferecem "Excluir minha conta".
// LGPD-02: o download dos dados em XLSX vem antes da confirmação.
// LGPD-03 e LGPD-04: a confirmação pede a senha, e a senha errada aparece no campo.
// LGPD-05: com a senha certa, a tela mostra a data da exclusão e a sessão termina.

const { logout, refreshUser } = vi.hoisted(() => ({ logout: vi.fn(), refreshUser: vi.fn() }))

const USUARIO = {
  id: "1",
  name: "Ana",
  email: "ana@x.com",
  role: "USER",
  plan: "COMMON",
  preferences: { currency: "BRL", language: "pt-BR", theme: "light", notifications: {} },
  product_improvement_consent: false,
  terms: { accepted_version: "2.0", current_version: "2.0" },
}

vi.mock("@/hooks/use-auth", () => ({
  useAuth: () => ({ user: USUARIO, refreshUser, logout }),
}))

vi.mock("@/services/apiClient", async (importOriginal) => ({
  ...(await importOriginal<typeof import("@/services/apiClient")>()),
  api: { get: vi.fn(), post: vi.fn(), put: vi.fn(), patch: vi.fn() },
}))

vi.mock("next-themes", () => ({ useTheme: () => ({ setTheme: vi.fn() }) }))
vi.mock("next/navigation", () => ({ useRouter: () => ({ push: vi.fn(), replace: vi.fn() }) }))
vi.mock("sonner", () => ({ toast: Object.assign(vi.fn(), { success: vi.fn(), error: vi.fn() }) }))

const get = vi.mocked(api.get)
const post = vi.mocked(api.post)

async function abrirPrivacidade() {
  render(<SettingsPage />)
  await userEvent.click(screen.getByRole("button", { name: "Privacidade" }))
}

describe("Excluir minha conta nas configurações", () => {
  beforeEach(() => {
    vi.clearAllMocks()
    get.mockImplementation(async (url: string) => {
      if (url === "/users/me/consent/") return { data: { consent: false, decided_at: null, policy_version: null } }
      return { data: new Blob(["xlsx"]) }
    })
    window.URL.createObjectURL = vi.fn(() => "blob:dados")
    window.URL.revokeObjectURL = vi.fn()
  })

  it("a aba Privacidade oferece excluir a conta", async () => {
    await abrirPrivacidade()

    expect(await screen.findByRole("button", { name: "Excluir minha conta" })).toBeInTheDocument()
  })

  it("o download dos dados chama /users/me/export/ sem pedir a exclusão", async () => {
    await abrirPrivacidade()

    await userEvent.click(await screen.findByRole("button", { name: /baixar meus dados/i }))

    await waitFor(() =>
      expect(get).toHaveBeenCalledWith("/users/me/export/", expect.objectContaining({ responseType: "blob" })),
    )
    expect(post).not.toHaveBeenCalled()
    expect(logout).not.toHaveBeenCalled()
  })

  it("a senha errada aparece no campo e a sessão continua", async () => {
    post.mockRejectedValueOnce({ response: { status: 400, data: { password: ["Senha incorreta."] } } })
    await abrirPrivacidade()

    await userEvent.click(await screen.findByRole("button", { name: "Excluir minha conta" }))
    await userEvent.type(screen.getByLabelText("Senha atual"), "errada-123")
    await userEvent.click(screen.getByRole("button", { name: "Confirmar exclusão" }))

    expect(post).toHaveBeenCalledWith("/users/me/delete/", { password: "errada-123" })
    expect(await screen.findByText("Senha incorreta.")).toBeInTheDocument()
    expect(logout).not.toHaveBeenCalled()
  })

  it("a senha certa mostra a data da exclusão e encerra a sessão", async () => {
    post.mockResolvedValueOnce({ data: { deletion_scheduled_for: "2026-11-08T15:00:00Z", email_sent: true } })
    await abrirPrivacidade()

    await userEvent.click(await screen.findByRole("button", { name: "Excluir minha conta" }))
    await userEvent.type(screen.getByLabelText("Senha atual"), "cofre-forte-2026")
    await userEvent.click(screen.getByRole("button", { name: "Confirmar exclusão" }))

    await waitFor(() => expect(logout).toHaveBeenCalled())
    expect(toast.success).toHaveBeenCalledWith(expect.stringContaining("08/11/2026"), expect.anything())
  })

  it("sem a senha, não envia o pedido", async () => {
    await abrirPrivacidade()

    await userEvent.click(await screen.findByRole("button", { name: "Excluir minha conta" }))
    await userEvent.click(screen.getByRole("button", { name: "Confirmar exclusão" }))

    expect(await screen.findByText("Informe a sua senha atual")).toBeInTheDocument()
    expect(post).not.toHaveBeenCalled()
  })
})
