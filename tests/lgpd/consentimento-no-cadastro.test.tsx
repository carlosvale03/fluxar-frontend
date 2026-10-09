import { render, screen, waitFor } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import { beforeEach, describe, expect, it, vi } from "vitest"

import RegisterPage from "@/app/auth/register/page"
import AboutPage from "@/app/sobre/page"
import { api } from "@/services/apiClient"

// LGPD-33: o cadastro oferece o consentimento numa caixa própria e
// desmarcada, sem condicionar o cadastro a ele.
// LGPD-32: os textos de segurança do cadastro e da página Sobre descrevem só
// o que o app faz, sem ponta a ponta nem padrões bancários.

vi.mock("next/navigation", () => ({
  useRouter: () => ({ push: vi.fn() }),
}))

vi.mock("@/services/apiClient", async (importOriginal) => ({
  ...(await importOriginal<typeof import("@/services/apiClient")>()),
  api: { post: vi.fn() },
}))

vi.mock("sonner", () => ({ toast: Object.assign(vi.fn(), { success: vi.fn(), error: vi.fn() }) }))

const post = vi.mocked(api.post)

const caixaDoConsentimento = () => screen.getByRole("checkbox", { name: /melhorar o produto/i })

async function preencher() {
  await userEvent.type(screen.getByLabelText("Nome Completo"), "Ana Souza")
  await userEvent.type(screen.getByLabelText("Melhor E-mail"), "ana@x.com")
  await userEvent.type(screen.getByLabelText("Senha"), "cofre-forte-2026")
  await userEvent.type(screen.getByLabelText("Confirmar"), "cofre-forte-2026")
  await userEvent.click(screen.getByRole("checkbox", { name: /termos de uso/i }))
}

const enviar = () => userEvent.click(screen.getByRole("button", { name: /criar minha conta/i }))

describe("Consentimento no cadastro", () => {
  beforeEach(() => {
    post.mockReset()
    post.mockResolvedValue({ data: { message: "Conta criada.", email_sent: true } })
  })

  it("a caixa de consentimento começa desmarcada e o cadastro passa sem ela", async () => {
    render(<RegisterPage />)

    expect(caixaDoConsentimento()).not.toBeChecked()
    await preencher()
    await enviar()

    await waitFor(() => expect(post).toHaveBeenCalled())
    expect(post).toHaveBeenCalledWith(
      "/auth/register/",
      expect.objectContaining({ terms_accepted: true, product_improvement_consent: false }),
    )
  })

  it("marcada, envia product_improvement_consent: true", async () => {
    render(<RegisterPage />)

    await preencher()
    await userEvent.click(caixaDoConsentimento())
    await enviar()

    await waitFor(() =>
      expect(post).toHaveBeenCalledWith(
        "/auth/register/",
        expect.objectContaining({ product_improvement_consent: true }),
      ),
    )
  })

  it("o consentimento não substitui o aceite dos termos", async () => {
    render(<RegisterPage />)

    await userEvent.type(screen.getByLabelText("Nome Completo"), "Ana Souza")
    await userEvent.type(screen.getByLabelText("Melhor E-mail"), "ana@x.com")
    await userEvent.type(screen.getByLabelText("Senha"), "cofre-forte-2026")
    await userEvent.type(screen.getByLabelText("Confirmar"), "cofre-forte-2026")
    await userEvent.click(caixaDoConsentimento())
    await enviar()

    expect(await screen.findByText("Você deve aceitar os termos para continuar")).toBeInTheDocument()
    expect(post).not.toHaveBeenCalled()
  })

  it.each([
    ["cadastro", RegisterPage],
    ["Sobre", AboutPage],
  ])("o texto de segurança do %s não fala em ponta a ponta nem em padrões bancários", (_, Pagina) => {
    const { container } = render(<Pagina />)

    const texto = container.textContent ?? ""
    expect(texto).not.toMatch(/ponta a ponta/i)
    expect(texto).not.toMatch(/padr(õ|o)es banc(á|a)rios/i)
    expect(texto).toMatch(/criptografad/i)
  })
})
