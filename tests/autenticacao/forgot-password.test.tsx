import { render, screen } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import { beforeEach, describe, expect, it, vi } from "vitest"

import ForgotPasswordPage from "@/app/auth/forgot-password/page"
import { api } from "@/services/apiClient"
import { toast } from "sonner"

// AUTH-18: a tela mostra a resposta neutra do backend. AUTH-36: mostra a
// mensagem do 429.

vi.mock("@/services/apiClient", async (importOriginal) => ({
  ...(await importOriginal<typeof import("@/services/apiClient")>()),
  api: { post: vi.fn() },
}))

vi.mock("sonner", () => ({ toast: { success: vi.fn(), error: vi.fn() } }))

const post = vi.mocked(api.post)

const MENSAGEM_NEUTRA = "Se o e-mail estiver cadastrado, enviamos um link para redefinir a senha."

async function pedirLink() {
  await userEvent.type(screen.getByLabelText("Seu E-mail Cadastrado"), "ana@x.com")
  await userEvent.click(screen.getByRole("button", { name: /enviar link de recuperação/i }))
}

describe("Tela de esqueci a senha", () => {
  beforeEach(() => {
    post.mockReset()
    vi.mocked(toast.error).mockReset()
  })

  it("mostra a mensagem neutra do backend", async () => {
    post.mockResolvedValue({ data: { message: MENSAGEM_NEUTRA } })
    render(<ForgotPasswordPage />)

    await pedirLink()

    expect(post).toHaveBeenCalledWith("/auth/forgot-password/", { email: "ana@x.com" })
    expect(await screen.findByText(MENSAGEM_NEUTRA)).toBeInTheDocument()
  })

  it("mostra a mensagem do 429", async () => {
    post.mockRejectedValue({
      response: { status: 429, data: { detail: "Muitas tentativas. Tente novamente em 60 minutos." } },
    })
    render(<ForgotPasswordPage />)

    await pedirLink()

    await vi.waitFor(() =>
      expect(toast.error).toHaveBeenCalledWith("Muitas tentativas. Tente novamente em 60 minutos.")
    )
    expect(screen.queryByText(MENSAGEM_NEUTRA)).not.toBeInTheDocument()
  })
})
