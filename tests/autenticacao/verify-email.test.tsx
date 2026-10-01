import { StrictMode } from "react"
import { render, screen } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import { beforeEach, describe, expect, it, vi } from "vitest"

import VerifyEmailPage from "@/app/auth/verify-email/page"
import { api } from "@/services/apiClient"

// AUTH-08: o link válido confirma o e-mail e inicia a sessão.
// AUTH-09: o link inválido mostra a mensagem do backend e oferece o reenvio.

const login = vi.fn()

vi.mock("@/contexts/auth-context", () => ({
  useAuth: () => ({ login }),
}))

vi.mock("next/navigation", () => ({
  useRouter: () => ({ push: vi.fn() }),
  useSearchParams: () => new URLSearchParams("token=link-do-email"),
}))

vi.mock("@/services/apiClient", async (importOriginal) => ({
  ...(await importOriginal<typeof import("@/services/apiClient")>()),
  api: { get: vi.fn(), post: vi.fn() },
}))

vi.mock("sonner", () => ({ toast: { success: vi.fn(), error: vi.fn() } }))

const get = vi.mocked(api.get)
const post = vi.mocked(api.post)

describe("Tela de verificação de e-mail", () => {
  beforeEach(() => {
    get.mockReset()
    post.mockReset()
    login.mockReset()
  })

  it("com o link válido confirma e entra com o token de acesso recebido", async () => {
    get.mockResolvedValue({
      data: { message: "E-mail verificado com sucesso.", access: "acesso-novo" },
    })
    render(<VerifyEmailPage />)

    await userEvent.click(await screen.findByRole("button", { name: /acessar minha conta/i }))

    expect(get).toHaveBeenCalledWith("/auth/verify-email/?token=link-do-email")
    expect(login).toHaveBeenCalledWith("acesso-novo")
  })

  it("com o link inválido mostra a mensagem do backend e o reenvio", async () => {
    get.mockRejectedValue({
      response: { status: 400, data: { detail: "Link inválido ou expirado.", code: "invalid_link" } },
    })
    post.mockResolvedValue({
      data: { message: "Se houver uma conta aguardando verificação com este e-mail, enviamos um novo link." },
    })
    render(<VerifyEmailPage />)

    expect(await screen.findByText("Link inválido ou expirado.")).toBeInTheDocument()
    await userEvent.type(screen.getByLabelText(/seu e-mail/i), "ana@x.com")
    await userEvent.click(screen.getByRole("button", { name: /reenviar e-mail/i }))

    expect(post).toHaveBeenCalledWith("/auth/resend-verification/", { email: "ana@x.com" })
    expect(login).not.toHaveBeenCalled()
  })

  it("usa o link uma vez só, mesmo com o efeito rodando duas vezes no StrictMode", async () => {
    get.mockResolvedValue({
      data: { message: "E-mail verificado com sucesso.", access: "acesso-novo" },
    })
    render(
      <StrictMode>
        <VerifyEmailPage />
      </StrictMode>,
    )

    expect(await screen.findByRole("button", { name: /acessar minha conta/i })).toBeInTheDocument()
    expect(get).toHaveBeenCalledTimes(1)
  })
})
