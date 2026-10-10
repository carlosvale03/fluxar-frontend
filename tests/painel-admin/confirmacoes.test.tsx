import { render, screen, within } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import { AxiosError, type AxiosResponse } from "axios"
import { toast } from "sonner"
import { beforeEach, describe, expect, it, vi } from "vitest"

import UserManagementPage from "@/app/(admin)/admin/usuarios/page"
import UserDetailsPage from "@/app/(admin)/admin/usuarios/[id]/page"
import { api } from "@/services/apiClient"

import { abrirLimpeza } from "./confirmacoes-auxiliares"

// ADMIN-17: excluir, limpar, redefinir a senha, mudar o papel e desativar
// pedem a senha do administrador. ADMIN-18: a recusa aparece no campo da
// senha. ADMIN-19: mudar o plano não pede a senha. ADMIN-20: limpar e excluir
// mostram o que será apagado e só confirmam com o e-mail do usuário.

const { roteador } = vi.hoisted(() => ({ roteador: { push: () => {}, replace: () => {}, back: () => {} } }))

vi.mock("next/navigation", () => ({
  useParams: () => ({ id: "u1" }),
  useRouter: () => roteador,
}))

vi.mock("@/contexts/auth-context", () => ({ useAuth: () => ({ user: { id: "eu", role: "ADMIN" } }) }))

vi.mock("@/services/apiClient", async (importOriginal) => ({
  ...(await importOriginal<typeof import("@/services/apiClient")>()),
  api: { get: vi.fn(), post: vi.fn(), patch: vi.fn(), delete: vi.fn() },
}))

vi.mock("sonner", () => ({ toast: { success: vi.fn(), error: vi.fn(), warning: vi.fn() } }))

// O jsdom não tem estas APIs, que o Select do Radix usa ao abrir
Element.prototype.hasPointerCapture ??= () => false
Element.prototype.releasePointerCapture ??= () => {}
Element.prototype.scrollIntoView ??= () => {}

const get = vi.mocked(api.get)
const post = vi.mocked(api.post)
const patch = vi.mocked(api.patch)
const apagar = vi.mocked(api.delete)

const SENHA_INCORRETA = "Senha do administrador incorreta."
const ROTULO_DO_EMAIL = "Digite o e-mail do usuário para confirmar"
const ROTULO_DA_SENHA = "Sua senha de administrador"

const USUARIO = {
  id: "u1",
  name: "Ana Souza",
  email: "ana@x.com",
  role: "USER",
  plan: "COMMON",
  is_active: true,
  emailVerified: true,
  cpf: null,
  phone_number: null,
  avatar_url: null,
  created_at: "2026-01-10T12:00:00Z",
}

const PAGINA_VAZIA = { count: 0, total_pages: 1, current_page: 1, next: null, previous: null, results: [] }

function erroHttp(status: number, data: unknown) {
  const response = { data, status, statusText: "", headers: {}, config: {} } as AxiosResponse
  return new AxiosError("erro", status >= 500 ? AxiosError.ERR_BAD_RESPONSE : AxiosError.ERR_BAD_REQUEST, undefined, null, response)
}

function servidor() {
  get.mockImplementation(((url: string) => {
    if (url === "/admin/users/u1/") return Promise.resolve({ data: USUARIO })
    if (url === "/admin/users/u1/financial-stats/") {
      return Promise.resolve({
        data: { total_balance: "10.00", avg_income_value: "0.00", avg_expense_value: "0.00", income_count_per_day: 0, expense_count_per_day: 0, last_transaction_date: null },
      })
    }
    if (url === "/admin/users/") return Promise.resolve({ data: { ...PAGINA_VAZIA, count: 1, results: [USUARIO] } })
    return Promise.resolve({ data: PAGINA_VAZIA })
  }) as typeof api.get)
}

function dialogo() {
  return screen.getByRole("dialog")
}

beforeEach(() => {
  vi.clearAllMocks()
  get.mockReset()
  servidor()
})

describe("Confirmações no detalhe do usuário", () => {
  async function abrirDetalhe() {
    render(<UserDetailsPage />)
    await screen.findByRole("heading", { name: "Ana Souza" })
  }

  it("limpar mostra o que será apagado e só confirma com o e-mail exato e a senha", async () => {
    await abrirDetalhe()
    await abrirLimpeza()

    const janela = dialogo()
    expect(within(janela).getByText("Contas, cartões e faturas")).toBeInTheDocument()
    expect(within(janela).getByText(/Login, senha, perfil, plano e papel/)).toBeInTheDocument()
    const confirmar = within(janela).getByRole("button", { name: /limpar dados/i })

    await userEvent.type(within(janela).getByLabelText(ROTULO_DA_SENHA), "senha-admin")
    expect(confirmar).toBeDisabled()
    await userEvent.type(within(janela).getByLabelText(ROTULO_DO_EMAIL), "outra@x.com")
    expect(confirmar).toBeDisabled()
    await userEvent.click(confirmar)
    expect(post).not.toHaveBeenCalled()

    await userEvent.clear(within(janela).getByLabelText(ROTULO_DO_EMAIL))
    await userEvent.type(within(janela).getByLabelText(ROTULO_DO_EMAIL), "ana@x.com")
    expect(confirmar).toBeEnabled()
  })

  it("excluir mostra o que será removido e fica desabilitado com o e-mail errado ou sem a senha", async () => {
    await abrirDetalhe()
    await userEvent.click(screen.getByRole("button", { name: /excluir permanente/i }))

    const janela = dialogo()
    expect(within(janela).getByText(/O que será removido/i)).toBeInTheDocument()
    const confirmar = within(janela).getByRole("button", { name: /excluir permanentemente/i })

    await userEvent.type(within(janela).getByLabelText(ROTULO_DO_EMAIL), "ANA@x.com")
    await userEvent.type(within(janela).getByLabelText(ROTULO_DA_SENHA), "senha-admin")
    expect(confirmar).toBeDisabled()

    await userEvent.clear(within(janela).getByLabelText(ROTULO_DO_EMAIL))
    await userEvent.type(within(janela).getByLabelText(ROTULO_DO_EMAIL), "ana@x.com")
    await userEvent.clear(within(janela).getByLabelText(ROTULO_DA_SENHA))
    expect(confirmar).toBeDisabled()
    expect(apagar).not.toHaveBeenCalled()
  })

  it("mudar o plano não mostra campo de senha e envia a requisição sem admin_password", async () => {
    patch.mockResolvedValueOnce({ data: { ...USUARIO, plan: "PREMIUM_PLUS" } })
    await abrirDetalhe()

    await userEvent.click(screen.getByRole("button", { name: /alterar plano/i }))
    const janela = dialogo()
    expect(within(janela).queryByLabelText(ROTULO_DA_SENHA)).not.toBeInTheDocument()
    expect(within(janela).queryByPlaceholderText(/senha/i)).not.toBeInTheDocument()
    await userEvent.click(within(janela).getByRole("combobox", { name: "Novo plano" }))
    await userEvent.click(await screen.findByRole("option", { name: "PREMIUM PLUS" }))
    await userEvent.click(within(dialogo()).getByRole("button", { name: /confirmar alteração/i }))

    await vi.waitFor(() => expect(patch).toHaveBeenCalledWith("/admin/users/u1/", { plan: "PREMIUM_PLUS" }))
  })

  it("o 403 de admin_password aparece no campo da senha e a janela continua aberta", async () => {
    apagar.mockRejectedValueOnce(erroHttp(403, { admin_password: [SENHA_INCORRETA] }))
    await abrirDetalhe()

    await userEvent.click(screen.getByRole("button", { name: /arquivar conta/i }))
    const campo = within(dialogo()).getByLabelText(ROTULO_DA_SENHA)
    await userEvent.type(campo, "errada")
    await userEvent.click(within(dialogo()).getByRole("button", { name: /confirmar arquivamento/i }))

    expect(await within(dialogo()).findByText(SENHA_INCORRETA)).toBeInTheDocument()
    expect(campo).toHaveAttribute("aria-invalid", "true")
    expect(campo).toHaveAccessibleDescription(SENHA_INCORRETA)
    expect(apagar).toHaveBeenCalledWith("/admin/users/u1/", { data: { admin_password: "errada" } })
    expect(toast.error).not.toHaveBeenCalled()
  })

  it.each([
    [503, { detail: "Não foi possível limpar os dados agora. Nada foi apagado; tente de novo mais tarde.", code: "clear_failed" }],
    [400, { detail: "Você não pode limpar os próprios dados pelo painel.", code: "own_account" }],
  ])("a limpeza recusada com %i mostra a mensagem do backend", async (status, data) => {
    post.mockRejectedValueOnce(erroHttp(status, data))
    await abrirDetalhe()
    await abrirLimpeza()

    await userEvent.type(within(dialogo()).getByLabelText(ROTULO_DO_EMAIL), "ana@x.com")
    await userEvent.type(within(dialogo()).getByLabelText(ROTULO_DA_SENHA), "senha-admin")
    await userEvent.click(within(dialogo()).getByRole("button", { name: /limpar dados/i }))

    await vi.waitFor(() => expect(toast.error).toHaveBeenCalledWith(data.detail))
  })

  it("redefinir a senha pede a senha do administrador", async () => {
    post.mockResolvedValueOnce({ data: { message: "ok" } })
    await abrirDetalhe()

    await userEvent.click(screen.getByRole("button", { name: /resetar senha/i }))
    const confirmar = within(dialogo()).getByRole("button", { name: /confirmar reset/i })
    await userEvent.type(within(dialogo()).getByLabelText("Nova Senha do Usuário"), "NovaSenha#2026")
    expect(confirmar).toBeDisabled()
    await userEvent.type(within(dialogo()).getByLabelText(ROTULO_DA_SENHA), "senha-admin")
    await userEvent.click(confirmar)

    await vi.waitFor(() =>
      expect(post).toHaveBeenCalledWith("/admin/users/u1/reset-password/", { new_password: "NovaSenha#2026", admin_password: "senha-admin" }),
    )
  })
})

describe("Confirmações na lista de usuários", () => {
  async function abrirAcao(acao: RegExp) {
    render(<UserManagementPage />)
    const linha = (await screen.findByText("Ana Souza")).closest("tr") as HTMLElement
    const menu = within(linha).getAllByRole("button").find((b) => b.getAttribute("aria-haspopup") === "menu") as HTMLElement
    await userEvent.click(menu)
    await userEvent.click(await screen.findByRole("menuitem", { name: acao }))
    return dialogo()
  }

  it("mudar o papel pede a senha e a envia junto", async () => {
    patch.mockResolvedValueOnce({ data: { ...USUARIO, role: "ADMIN" } })
    const janela = await abrirAcao(/tornar admin/i)

    const confirmar = within(janela).getByRole("button", { name: /confirmar alteração/i })
    expect(confirmar).toBeDisabled()
    await userEvent.type(within(janela).getByLabelText(ROTULO_DA_SENHA), "senha-admin")
    await userEvent.click(confirmar)

    await vi.waitFor(() => expect(patch).toHaveBeenCalledWith("/admin/users/u1/", { role: "ADMIN", admin_password: "senha-admin" }))
  })

  it("arquivar pede a senha, e o 403 aparece no campo", async () => {
    apagar.mockRejectedValueOnce(erroHttp(403, { admin_password: [SENHA_INCORRETA] }))
    const janela = await abrirAcao(/arquivar conta/i)

    const confirmar = within(janela).getByRole("button", { name: /confirmar arquivamento/i })
    expect(confirmar).toBeDisabled()
    await userEvent.type(within(janela).getByLabelText(ROTULO_DA_SENHA), "errada")
    await userEvent.click(confirmar)

    expect(await within(dialogo()).findByText(SENHA_INCORRETA)).toBeInTheDocument()
    expect(within(dialogo()).getByLabelText(ROTULO_DA_SENHA)).toHaveAccessibleDescription(SENHA_INCORRETA)
  })

  it("mudar o plano na lista não pede a senha", async () => {
    patch.mockResolvedValueOnce({ data: { ...USUARIO, plan: "PREMIUM" } })
    const janela = await abrirAcao(/alterar plano/i)

    expect(within(janela).queryByLabelText(ROTULO_DA_SENHA)).not.toBeInTheDocument()
    await userEvent.click(within(janela).getByRole("combobox", { name: "Novo plano" }))
    await userEvent.click(await screen.findByRole("option", { name: "PREMIUM" }))
    await userEvent.click(within(dialogo()).getByRole("button", { name: /confirmar alteração/i }))

    await vi.waitFor(() => expect(patch).toHaveBeenCalledWith("/admin/users/u1/", { plan: "PREMIUM" }))
  })

  it("restaurar um arquivado não pede a senha e envia só is_active", async () => {
    patch.mockResolvedValueOnce({ data: { ...USUARIO, is_active: true } })
    render(<UserManagementPage />)
    await screen.findByText("Ana Souza")
    await userEvent.click(screen.getByRole("button", { name: "Arquivados" }))
    await vi.waitFor(() =>
      expect(get).toHaveBeenLastCalledWith("/admin/users/", expect.objectContaining({ params: expect.objectContaining({ show_archived: "true" }) })),
    )

    const linha = (await screen.findByText("Ana Souza")).closest("tr") as HTMLElement
    const menu = within(linha).getAllByRole("button").find((b) => b.getAttribute("aria-haspopup") === "menu") as HTMLElement
    await userEvent.click(menu)
    await userEvent.click(await screen.findByRole("menuitem", { name: /restaurar conta/i }))

    const janela = dialogo()
    expect(within(janela).queryByLabelText(ROTULO_DA_SENHA)).not.toBeInTheDocument()
    await userEvent.click(within(janela).getByRole("button", { name: /confirmar restauração/i }))

    await vi.waitFor(() => expect(patch).toHaveBeenCalledWith("/admin/users/u1/", { is_active: true }))
    expect(patch.mock.calls[0][1]).not.toHaveProperty("admin_password")
  })

  it("arquivar em lote pede a senha e envia os selecionados", async () => {
    apagar.mockResolvedValueOnce({ data: {} })
    render(<UserManagementPage />)
    await screen.findByText("Ana Souza")

    await userEvent.click(screen.getByRole("button", { name: /seleção/i }))
    const linha = screen.getByText("Ana Souza").closest("tr") as HTMLElement
    await userEvent.click(within(linha).getByRole("checkbox"))
    await userEvent.click(screen.getByRole("button", { name: /^excluir$/i }))

    const confirmar = within(dialogo()).getByRole("button", { name: /arquivamento em massa/i })
    expect(confirmar).toBeDisabled()
    await userEvent.type(within(dialogo()).getByLabelText(ROTULO_DA_SENHA), "senha-admin")
    await userEvent.click(confirmar)

    await vi.waitFor(() => expect(apagar).toHaveBeenCalledWith("/admin/users/", { data: { user_ids: ["u1"], admin_password: "senha-admin" } }))
  })
})
