import { render, screen, within } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import { beforeEach, describe, expect, it, vi } from "vitest"

import ResetPasswordPage from "@/app/auth/reset-password/page"
import { api } from "@/services/apiClient"
import { toast } from "sonner"

// AUTH-23: a redefinição envia token, new_password e new_password_confirm.
// AUTH-22: o erro da senha aparece no campo. AUTH-21: com o link inválido, a
// tela mostra a mensagem e oferece pedir um novo link.

const push = vi.fn()

vi.mock("next/navigation", () => ({
  useRouter: () => ({ push }),
  useSearchParams: () => new URLSearchParams("token=link-de-redefinicao"),
}))

vi.mock("@/services/apiClient", async (importOriginal) => ({
  ...(await importOriginal<typeof import("@/services/apiClient")>()),
  api: { post: vi.fn() },
}))

vi.mock("sonner", () => ({ toast: { success: vi.fn(), error: vi.fn() } }))

const post = vi.mocked(api.post)

async function redefinir(senha = "cofre-forte-2026", confirmacao = senha) {
  await userEvent.type(await screen.findByLabelText("Nova Senha de Acesso"), senha)
  await userEvent.type(screen.getByLabelText("Confirmar Nova Senha"), confirmacao)
  await userEvent.click(screen.getByRole("button", { name: /atualizar senha/i }))
}

describe("Tela de redefinição de senha", () => {
  beforeEach(() => {
    post.mockReset()
    push.mockReset()
    vi.mocked(toast.error).mockReset()
  })

  it("envia token, new_password e new_password_confirm", async () => {
    post.mockResolvedValue({ data: { message: "Senha redefinida com sucesso." } })
    render(<ResetPasswordPage />)

    await redefinir("cofre-forte-2026")

    expect(post).toHaveBeenCalledWith("/auth/reset-password/", {
      token: "link-de-redefinicao",
      new_password: "cofre-forte-2026",
      new_password_confirm: "cofre-forte-2026",
    })
    await vi.waitFor(() => expect(push).toHaveBeenCalledWith("/auth/login"))
  })

  it("mostra o erro de new_password no campo da senha", async () => {
    post.mockRejectedValue({
      response: { status: 400, data: { new_password: ["Esta senha é muito comum."] } },
    })
    render(<ResetPasswordPage />)

    await redefinir()

    const campoSenha = document.querySelector('label[for="newPassword"]')!.parentElement as HTMLElement
    expect(await within(campoSenha).findByText("Esta senha é muito comum.")).toBeInTheDocument()
    expect(push).not.toHaveBeenCalled()
  })

  it("com o link inválido mostra a mensagem e o link para pedir outro", async () => {
    post.mockRejectedValue({
      response: { status: 400, data: { detail: "Link inválido ou expirado.", code: "invalid_link" } },
    })
    render(<ResetPasswordPage />)

    await redefinir()

    expect(await screen.findByText("Link inválido ou expirado.")).toBeInTheDocument()
    expect(screen.getByRole("link", { name: /solicitar novo link/i })).toHaveAttribute("href", "/auth/forgot-password")
  })

  it("mostra a mensagem do 429", async () => {
    post.mockRejectedValue({
      response: { status: 429, data: { detail: "Muitas tentativas. Tente novamente em 12 minutos." } },
    })
    render(<ResetPasswordPage />)

    await redefinir()

    await vi.waitFor(() =>
      expect(toast.error).toHaveBeenCalledWith("Muitas tentativas. Tente novamente em 12 minutos.")
    )
  })
})
