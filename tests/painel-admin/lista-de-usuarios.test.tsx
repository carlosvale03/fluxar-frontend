import { render, screen } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import { AxiosError } from "axios"
import { toast } from "sonner"
import { beforeEach, describe, expect, it, vi } from "vitest"

import UserManagementPage from "@/app/(admin)/admin/usuarios/page"
import { api } from "@/services/apiClient"

// ADMIN-16: a busca por nome ou e-mail e os filtros de plano, papel e status
// vão como parâmetros da lista paginada e voltam à página 1. AD-042: os
// erros da lista passam pelo tratarErro.

vi.mock("next/navigation", () => ({
  useParams: () => ({}),
  useRouter: () => ({ push: () => {}, replace: () => {}, back: () => {} }),
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

type Params = Record<string, unknown>

const MARIA = {
  id: "m1",
  name: "Maria Lima",
  email: "maria@x.com",
  role: "USER",
  plan: "PREMIUM",
  is_active: true,
  avatar_url: null,
  created_at: "2026-01-10T12:00:00Z",
}

function servidor() {
  get.mockImplementation(((url: string, config?: { params?: Params }) =>
    url === "/admin/users/"
      ? Promise.resolve({
          data: { count: 45, total_pages: 3, current_page: Number(config?.params?.page ?? 1), next: null, previous: null, results: [MARIA] },
        })
      : Promise.resolve({ data: {} })) as typeof api.get)
}

function ultimaBusca(): Params {
  const chamadas = get.mock.calls.filter(([url]) => url === "/admin/users/")
  return (chamadas.at(-1)?.[1] as { params: Params }).params
}

// Os parâmetros que de fato vão na requisição (o axios descarta undefined)
function enviados(params: Params) {
  return Object.fromEntries(Object.entries(params).filter(([, valor]) => valor !== undefined))
}

async function abrirNaPagina2() {
  render(<UserManagementPage />)
  await screen.findByText("Maria Lima")
  await userEvent.click(screen.getByRole("button", { name: /próx/i }))
  await vi.waitFor(() => expect(ultimaBusca().page).toBe(2))
}

async function escolher(filtro: string, opcao: string) {
  await userEvent.click(screen.getByRole("combobox", { name: filtro }))
  await userEvent.click(await screen.findByRole("option", { name: opcao }))
}

describe("Lista de usuários do admin", () => {
  beforeEach(() => {
    vi.clearAllMocks()
    get.mockReset()
    servidor()
  })

  it("a busca vai como parâmetro e volta à página 1", async () => {
    await abrirNaPagina2()

    await userEvent.type(screen.getByPlaceholderText("Buscar por nome ou e-mail..."), "maria")

    await vi.waitFor(() => expect(enviados(ultimaBusca())).toEqual({ page: 1, search: "maria", show_archived: "false" }), { timeout: 3000 })
  })

  it("os filtros de plano e de papel vão como parâmetros, juntos com a busca, e voltam à página 1", async () => {
    await abrirNaPagina2()

    await escolher("Filtrar por plano", "Premium")
    await vi.waitFor(() => expect(enviados(ultimaBusca())).toEqual({ page: 1, show_archived: "false", plan: "PREMIUM" }))

    await userEvent.click(screen.getByRole("button", { name: /próx/i }))
    await vi.waitFor(() => expect(ultimaBusca().page).toBe(2))
    await escolher("Filtrar por cargo", "Administradores")
    await vi.waitFor(() =>
      expect(enviados(ultimaBusca())).toEqual({ page: 1, show_archived: "false", plan: "PREMIUM", role: "ADMIN" }),
    )
  })

  it("o status (arquivados) vai como parâmetro e volta à página 1", async () => {
    await abrirNaPagina2()

    await userEvent.click(screen.getByRole("button", { name: "Arquivados" }))

    await vi.waitFor(() => expect(enviados(ultimaBusca())).toEqual({ page: 1, show_archived: "true" }))
  })

  it('o erro da lista passa pelo tratarErro, com "Tentar de novo", e não diz que a lista está vazia', async () => {
    get.mockRejectedValueOnce(new AxiosError("Network Error", AxiosError.ERR_NETWORK))
    render(<UserManagementPage />)

    await vi.waitFor(() => expect(toast.error).toHaveBeenCalled())
    const [mensagem, opcoes] = vi.mocked(toast.error).mock.calls[0] as [string, { action: { label: string; onClick: () => void } }]
    expect(mensagem).toBe("Não foi possível falar com o servidor.")
    expect(opcoes.action.label).toBe("Tentar de novo")
    expect(await screen.findByText("Não foi possível carregar a lista")).toBeInTheDocument()
    expect(screen.queryByText("Nenhum usuário encontrado")).not.toBeInTheDocument()

    await userEvent.click(screen.getByRole("button", { name: "Tentar de novo" }))
    expect(await screen.findByText("Maria Lima")).toBeInTheDocument()
  })
})
