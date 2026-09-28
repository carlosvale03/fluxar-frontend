import { render, screen, within } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import { beforeEach, describe, expect, it, vi } from "vitest"

import RegisterPage from "@/app/auth/register/page"
import { api } from "@/services/apiClient"
import { toast } from "sonner"

// AUTH-07: cada erro do cadastro aparece no campo, com a mensagem do backend.
// AUTH-26: com email_sent false, a tela mostra a mensagem e oferece o reenvio.

const push = vi.fn()

vi.mock("next/navigation", () => ({
  useRouter: () => ({ push }),
}))

vi.mock("@/services/apiClient", async (importOriginal) => ({
  ...(await importOriginal<typeof import("@/services/apiClient")>()),
  api: { post: vi.fn() },
}))

vi.mock("sonner", () => ({ toast: { success: vi.fn(), error: vi.fn() } }))

const post = vi.mocked(api.post)

// O bloco do campo: o elemento que guarda o rótulo, a entrada e o erro
function campo(id: string, niveis = 1) {
  let elemento = document.querySelector(`label[for="${id}"]`) as HTMLElement
  for (let i = 0; i < niveis; i++) elemento = elemento.parentElement as HTMLElement
  return elemento
}

async function preencherEEnviar() {
  await userEvent.type(screen.getByLabelText("Nome Completo"), "Ana Souza")
  await userEvent.type(screen.getByLabelText("Melhor E-mail"), "ana@x.com")
  await userEvent.type(screen.getByLabelText("Senha"), "cofre-forte-2026")
  await userEvent.type(screen.getByLabelText("Confirmar"), "cofre-forte-2026")
  await userEvent.click(screen.getByRole("checkbox"))
  await userEvent.click(screen.getByRole("button", { name: /criar minha conta/i }))
}

describe("Tela de cadastro", () => {
  beforeEach(() => {
    post.mockReset()
    push.mockReset()
    vi.mocked(toast.success).mockReset()
  })

  it("mostra cada erro do backend no campo correspondente", async () => {
    post.mockRejectedValue({
      response: {
        status: 400,
        data: {
          name: ["O nome é obrigatório."],
          email: ['Este e-mail já está cadastrado. Se a conta é sua, use "Esqueci a senha".'],
          password: ["Esta senha é muito comum."],
          password_confirm: ["Este campo é obrigatório."],
          terms_accepted: ["Você precisa aceitar os termos de uso."],
        },
      },
    })
    render(<RegisterPage />)

    await preencherEEnviar()

    expect(await within(campo("name")).findByText("O nome é obrigatório.")).toBeInTheDocument()
    expect(
      within(campo("email")).getByText('Este e-mail já está cadastrado. Se a conta é sua, use "Esqueci a senha".')
    ).toBeInTheDocument()
    expect(within(campo("password")).getByText("Esta senha é muito comum.")).toBeInTheDocument()
    expect(within(campo("confirmPassword")).getByText("Este campo é obrigatório.")).toBeInTheDocument()
    expect(
      within(campo("termsAccepted", 3)).getByText("Você precisa aceitar os termos de uso.")
    ).toBeInTheDocument()
    expect(push).not.toHaveBeenCalled()
  })

  it("com email_sent false mostra a mensagem e o reenvio, sem sair da tela", async () => {
    const mensagem = 'Conta criada, mas não conseguimos enviar o e-mail de verificação. Use "Reenviar e-mail".'
    post.mockResolvedValue({ status: 201, data: { message: mensagem, email_sent: false } })
    render(<RegisterPage />)

    await preencherEEnviar()

    expect(await screen.findByText(mensagem)).toBeInTheDocument()
    expect(screen.getByRole("button", { name: /reenviar e-mail/i })).toBeInTheDocument()
    expect(push).not.toHaveBeenCalled()

    post.mockResolvedValue({ data: { message: "ok" } })
    await userEvent.click(screen.getByRole("button", { name: /reenviar e-mail/i }))
    expect(post).toHaveBeenLastCalledWith("/auth/resend-verification/", { email: "ana@x.com" })
  })

  it("com email_sent true avisa com a mensagem do backend e vai para o login", async () => {
    const mensagem = "Conta criada. Enviamos um link de verificação para o seu e-mail."
    post.mockResolvedValue({ status: 201, data: { message: mensagem, email_sent: true } })
    render(<RegisterPage />)

    await preencherEEnviar()

    await vi.waitFor(() => expect(push).toHaveBeenCalledWith("/auth/login"))
    expect(toast.success).toHaveBeenCalledWith(mensagem)
  })

  it("mostra a mensagem do 429", async () => {
    post.mockRejectedValue({
      response: { status: 429, data: { detail: "Muitas tentativas. Tente novamente em 58 minutos." } },
    })
    render(<RegisterPage />)

    await preencherEEnviar()

    expect(await screen.findByText("Muitas tentativas. Tente novamente em 58 minutos.")).toBeInTheDocument()
  })
})
