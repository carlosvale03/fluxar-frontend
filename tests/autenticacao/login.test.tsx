import { render, screen } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import { beforeEach, describe, expect, it, vi } from "vitest"

import LoginPage from "@/app/auth/login/page"
import { api } from "@/services/apiClient"

// AUTH-13: conta não verificada com a senha certa vê a mensagem e o reenvio.
// AUTH-16 e AUTH-36: a tela mostra a mensagem do backend, inclusive a do 429.

const login = vi.fn()

vi.mock("@/hooks/use-auth", () => ({
  useAuth: () => ({ login }),
}))

vi.mock("next/navigation", () => ({
  useRouter: () => ({ push: vi.fn() }),
}))

vi.mock("@/services/apiClient", async (importOriginal) => ({
  ...(await importOriginal<typeof import("@/services/apiClient")>()),
  api: { post: vi.fn() },
}))

vi.mock("sonner", () => ({ toast: { success: vi.fn(), error: vi.fn() } }))

const post = vi.mocked(api.post)

async function entrar(email = "ana@x.com") {
  await userEvent.type(screen.getByLabelText("Endereço de E-mail"), email)
  await userEvent.type(screen.getByLabelText("Senha de Acesso"), "cofre-forte-2026")
  await userEvent.click(screen.getByRole("button", { name: /entrar no sistema/i }))
}

describe("Tela de login", () => {
  beforeEach(() => {
    post.mockReset()
    login.mockReset()
  })

  it("com email_not_verified mostra a mensagem e o reenvio para o e-mail digitado", async () => {
    post.mockRejectedValueOnce({
      response: { status: 400, data: { detail: "Confirme seu e-mail para entrar.", code: "email_not_verified" } },
    })
    render(<LoginPage />)

    await entrar("bia@x.com")

    expect(await screen.findByText("Confirme seu e-mail para entrar.")).toBeInTheDocument()
    post.mockResolvedValueOnce({ data: { message: "ok" } })
    await userEvent.click(screen.getByRole("button", { name: /reenviar e-mail/i }))
    expect(post).toHaveBeenLastCalledWith("/auth/resend-verification/", { email: "bia@x.com" })
    expect(login).not.toHaveBeenCalled()
  })

  it("mostra a mensagem de conta desativada, sem oferecer o reenvio", async () => {
    post.mockRejectedValueOnce({
      response: { status: 400, data: { detail: "Esta conta está desativada.", code: "account_disabled" } },
    })
    render(<LoginPage />)

    await entrar()

    expect(await screen.findByText("Esta conta está desativada.")).toBeInTheDocument()
    expect(screen.queryByRole("button", { name: /reenviar e-mail/i })).not.toBeInTheDocument()
  })

  it("mostra a mensagem do 429", async () => {
    post.mockRejectedValueOnce({
      response: { status: 429, data: { detail: "Muitas tentativas. Tente novamente em 1 minuto." } },
    })
    render(<LoginPage />)

    await entrar()

    expect(await screen.findByText("Muitas tentativas. Tente novamente em 1 minuto.")).toBeInTheDocument()
    expect(screen.queryByRole("button", { name: /reenviar e-mail/i })).not.toBeInTheDocument()
  })
})
