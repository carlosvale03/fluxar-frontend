import { render, screen, waitFor } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import { beforeEach, describe, expect, it, vi } from "vitest"

import LoginPage from "@/app/auth/login/page"
import { api } from "@/services/apiClient"

// LGPD-07: o login de uma conta com exclusão marcada mostra a data da
// exclusão e a opção de cancelar, sem abrir a sessão.
// LGPD-08: cancelar a exclusão envia o token do login e abre a sessão.

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

vi.mock("sonner", () => ({ toast: Object.assign(vi.fn(), { success: vi.fn(), error: vi.fn() }) }))

const post = vi.mocked(api.post)

const EXCLUSAO_PENDENTE = {
  response: {
    status: 400,
    data: {
      detail: "A exclusão desta conta está marcada. Cancele a exclusão para voltar a usar o Fluxar.",
      code: "deletion_pending",
      deletion_scheduled_for: "2026-11-08T15:00:00Z",
      cancel_token: "token-de-cancelamento",
    },
  },
}

async function entrar() {
  await userEvent.type(screen.getByLabelText("Endereço de E-mail"), "ana@x.com")
  await userEvent.type(screen.getByLabelText("Senha de Acesso"), "cofre-forte-2026")
  await userEvent.click(screen.getByRole("button", { name: /entrar no sistema/i }))
}

describe("Login com exclusão marcada", () => {
  beforeEach(() => {
    post.mockReset()
    login.mockReset()
  })

  it("deletion_pending mostra a data da exclusão e o botão de cancelar, sem abrir a sessão", async () => {
    post.mockRejectedValueOnce(EXCLUSAO_PENDENTE)
    render(<LoginPage />)

    await entrar()

    expect(await screen.findByText("08/11/2026")).toBeInTheDocument()
    expect(screen.getByRole("button", { name: "Cancelar exclusão" })).toBeInTheDocument()
    expect(login).not.toHaveBeenCalled()
  })

  it("Cancelar exclusão envia o cancel_token e abre a sessão com o access devolvido", async () => {
    post.mockRejectedValueOnce(EXCLUSAO_PENDENTE)
    render(<LoginPage />)
    await entrar()

    post.mockResolvedValueOnce({ data: { access: "access-novo" } })
    await userEvent.click(await screen.findByRole("button", { name: "Cancelar exclusão" }))

    expect(post).toHaveBeenLastCalledWith("/auth/cancel-deletion/", { cancel_token: "token-de-cancelamento" })
    await waitFor(() => expect(login).toHaveBeenCalledWith("access-novo"))
  })

  it("outro erro de login não oferece cancelar a exclusão", async () => {
    post.mockRejectedValueOnce({
      response: { status: 400, data: { detail: "E-mail ou senha incorretos.", code: "invalid_credentials" } },
    })
    render(<LoginPage />)

    await entrar()

    expect(await screen.findByText("E-mail ou senha incorretos.")).toBeInTheDocument()
    expect(screen.queryByRole("button", { name: "Cancelar exclusão" })).not.toBeInTheDocument()
  })
})
