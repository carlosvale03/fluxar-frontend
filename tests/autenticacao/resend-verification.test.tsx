import { render, screen } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import { beforeEach, describe, expect, it, vi } from "vitest"

import { ResendVerification } from "@/components/auth/resend-verification"
import { api } from "@/services/apiClient"

// AUTH-10 e AUTH-11: o reenvio chama a API com o e-mail e mostra a resposta
// neutra do backend. AUTH-36: mostra a mensagem do 429.

vi.mock("@/services/apiClient", async (importOriginal) => ({
  ...(await importOriginal<typeof import("@/services/apiClient")>()),
  api: { post: vi.fn() },
}))

vi.mock("sonner", () => ({ toast: { success: vi.fn(), error: vi.fn() } }))

const post = vi.mocked(api.post)

const MENSAGEM_NEUTRA = "Se houver uma conta aguardando verificação com este e-mail, enviamos um novo link."

describe("ResendVerification", () => {
  beforeEach(() => {
    post.mockReset()
  })

  it("chama o reenvio com o e-mail recebido", async () => {
    post.mockResolvedValue({ data: { message: MENSAGEM_NEUTRA } })
    render(<ResendVerification email="ana@x.com" />)

    await userEvent.click(screen.getByRole("button", { name: /reenviar e-mail/i }))

    expect(post).toHaveBeenCalledWith("/auth/resend-verification/", { email: "ana@x.com" })
  })

  it("mostra a mensagem neutra do backend no sucesso", async () => {
    post.mockResolvedValue({ data: { message: MENSAGEM_NEUTRA } })
    render(<ResendVerification email="ana@x.com" />)

    await userEvent.click(screen.getByRole("button", { name: /reenviar e-mail/i }))

    expect(await screen.findByText(MENSAGEM_NEUTRA)).toBeInTheDocument()
  })

  it("mostra a mensagem do 429", async () => {
    post.mockRejectedValue({
      response: { status: 429, data: { detail: "Muitas tentativas. Tente novamente em 42 minutos." } },
    })
    render(<ResendVerification email="ana@x.com" />)

    await userEvent.click(screen.getByRole("button", { name: /reenviar e-mail/i }))

    expect(await screen.findByText("Muitas tentativas. Tente novamente em 42 minutos.")).toBeInTheDocument()
    expect(screen.queryByText(MENSAGEM_NEUTRA)).not.toBeInTheDocument()
  })
})
