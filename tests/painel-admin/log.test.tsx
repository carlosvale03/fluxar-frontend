import { fireEvent, render, screen, within } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import { AxiosError, type AxiosResponse } from "axios"
import { toast } from "sonner"
import { beforeEach, describe, expect, it, vi } from "vitest"

import AdminSettingsPage from "@/app/(admin)/admin/configuracoes/page"
import UserDetailsPage from "@/app/(admin)/admin/usuarios/[id]/page"
import { api } from "@/services/apiClient"

// ADMIN-12: lista paginada do log, com navegação. ADMIN-13: filtros por
// ação, administrador e período, que voltam à página 1. ADMIN-14: o log do
// usuário. ADMIN-08 e ADMIN-09: cada registro mostra o antes e o depois.

// O roteador do Next é o mesmo objeto entre renderizações
const { roteador } = vi.hoisted(() => ({ roteador: { push: () => {}, replace: () => {}, back: () => {} } }))

vi.mock("next/navigation", () => ({
  useParams: () => ({ id: "u1" }),
  useRouter: () => roteador,
}))

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

function registro(id: string, action: string, before: unknown, after: unknown, description = `Registro ${id}`) {
  return {
    id,
    action,
    description,
    admin_id: "a1",
    admin_email: "c***@x.com",
    user_id: "u1",
    user_email: "a***@x.com",
    before,
    after,
    timestamp: "2026-10-01T12:00:00Z",
  }
}

const REGISTROS = [
  registro("1", "CHANGE_PLAN", "COMMON", "PREMIUM", "Plano alterado"),
  registro("2", "UPDATE_PLAN_LIMIT", 5, null, "Limite alterado"),
  registro("3", "UPDATE_MAINTENANCE", false, true, "Manutenção ligada"),
  registro("4", "RESET_PASSWORD", null, null, "Senha redefinida"),
]

function pagina(results: unknown[], numero = 1, total_pages = 2) {
  return { count: 25, total_pages, current_page: numero, next: null, previous: null, results }
}

const ADMINS = [
  { id: "a1", name: "Carla Admin", email: "carla@x.com", role: "ADMIN" },
  { id: "a2", name: "Davi Admin", email: "davi@x.com", role: "ADMIN" },
]

function servidor() {
  get.mockImplementation(((url: string, config?: { params?: Params }) => {
    if (url === "/admin/logs/") return Promise.resolve({ data: pagina(REGISTROS, Number(config?.params?.page ?? 1)) })
    if (url === "/admin/users/") return Promise.resolve({ data: { ...pagina(ADMINS, 1, 1), count: 2 } })
    if (url === "/admin/plans/") return Promise.resolve({ data: { testing_unlock: false, catalog: [] } })
    return Promise.resolve({ data: {} })
  }) as typeof api.get)
}

function chamadasDoLog(): Params[] {
  return get.mock.calls.filter(([url]) => url === "/admin/logs/").map(([, config]) => (config as { params: Params }).params)
}

async function abrirLog() {
  render(<AdminSettingsPage />)
  await userEvent.click(screen.getByRole("button", { name: /Logs/ }))
  await screen.findByText("Plano alterado")
}

async function irParaPagina2() {
  await userEvent.click(screen.getByRole("button", { name: /próx/i }))
  await vi.waitFor(() => expect(chamadasDoLog().at(-1)).toEqual({ page: 2 }))
}

async function escolher(filtro: string, opcao: string) {
  await userEvent.click(screen.getByRole("combobox", { name: filtro }))
  await userEvent.click(await screen.findByRole("option", { name: opcao }))
}

describe("Log de auditoria nas configurações", () => {
  beforeEach(() => {
    get.mockReset()
    vi.mocked(toast.error).mockReset()
    servidor()
  })

  it("escolher a ação chama a API com o parâmetro e volta à página 1", async () => {
    await abrirLog()
    await irParaPagina2()

    await escolher("Filtrar por ação", "Mudança de plano")

    await vi.waitFor(() => expect(chamadasDoLog().at(-1)).toEqual({ page: 1, action: "CHANGE_PLAN" }))
    expect(screen.getByText("1 de 2")).toBeInTheDocument()
  })

  it("o filtro de administrador lista os usuários com papel ADMIN e envia o id escolhido", async () => {
    await abrirLog()
    expect(get).toHaveBeenCalledWith("/admin/users/", { params: { role: "ADMIN", page_size: 100 } })
    await irParaPagina2()

    await escolher("Filtrar por administrador", "Davi Admin (davi@x.com)")

    await vi.waitFor(() => expect(chamadasDoLog().at(-1)).toEqual({ page: 1, admin: "a2" }))
  })

  it("o período envia inicio e fim em AAAA-MM-DD e volta à página 1", async () => {
    await abrirLog()
    await irParaPagina2()

    fireEvent.change(screen.getByLabelText("De"), { target: { value: "2026-09-01" } })
    await vi.waitFor(() => expect(chamadasDoLog().at(-1)).toEqual({ page: 1, inicio: "2026-09-01" }))
    fireEvent.change(screen.getByLabelText("Até"), { target: { value: "2026-09-30" } })
    await vi.waitFor(() => expect(chamadasDoLog().at(-1)).toEqual({ page: 1, inicio: "2026-09-01", fim: "2026-09-30" }))
  })

  it("a navegação entre as páginas continua com os filtros escolhidos", async () => {
    await abrirLog()
    await escolher("Filtrar por ação", "Modo manutenção")
    await vi.waitFor(() => expect(chamadasDoLog().at(-1)).toEqual({ page: 1, action: "UPDATE_MAINTENANCE" }))

    await userEvent.click(screen.getByRole("button", { name: /próx/i }))

    await vi.waitFor(() => expect(chamadasDoLog().at(-1)).toEqual({ page: 2, action: "UPDATE_MAINTENANCE" }))
    expect(await screen.findByText("2 de 2")).toBeInTheDocument()
  })

  it("cada registro mostra o antes e o depois de forma legível, com o e-mail mascarado", async () => {
    await abrirLog()

    const valores = screen.getAllByTestId("antes-e-depois").map((el) => el.textContent?.replace(/\s+/g, " ").trim())
    expect(valores).toEqual([
      "Antes:GratuitoDepois:Premium",
      "Antes:5Depois:sem limite",
      "Antes:DesligadoDepois:Ligado",
    ])
    // Redefinir a senha não tem antes nem depois
    const senha = screen.getByText("Senha redefinida").closest("div.p-4") as HTMLElement
    expect(within(senha).queryByTestId("antes-e-depois")).not.toBeInTheDocument()
    expect(screen.getAllByText("por c***@x.com").length).toBeGreaterThan(0)
  })

  it("uma data recusada pela API aparece no aviso", async () => {
    await abrirLog()
    const response = {
      data: { inicio: ["Data inválida. Use o formato AAAA-MM-DD."] },
      status: 400, statusText: "", headers: {}, config: {},
    } as AxiosResponse
    get.mockImplementation(((url: string) =>
      url === "/admin/logs/"
        ? Promise.reject(new AxiosError("erro", AxiosError.ERR_BAD_REQUEST, undefined, null, response))
        : Promise.resolve({ data: {} })) as typeof api.get)

    fireEvent.change(screen.getByLabelText("De"), { target: { value: "2026-09-01" } })

    await vi.waitFor(() => expect(toast.error).toHaveBeenCalledWith("Data inválida. Use o formato AAAA-MM-DD."))
  })
})

describe("Log do usuário", () => {
  beforeEach(() => {
    get.mockReset()
    get.mockImplementation(((url: string) => {
      if (url === "/admin/users/u1/logs/") return Promise.resolve({ data: pagina([registro("9", "CHANGE_ROLE", "USER", "ADMIN", "Papel alterado")], 1, 1) })
      if (url === "/admin/users/u1/") {
        return Promise.resolve({
          data: { id: "u1", name: "Ana Souza", email: "ana@x.com", role: "USER", plan: "COMMON", is_active: true, emailVerified: true, created_at: "2026-01-10T12:00:00Z", avatar_url: null },
        })
      }
      if (url === "/admin/users/u1/financial-stats/") {
        return Promise.resolve({
          data: { total_balance: "0.00", avg_income_value: "0.00", avg_expense_value: "0.00", income_count_per_day: 0, expense_count_per_day: 0, last_transaction_date: null },
        })
      }
      return Promise.resolve({ data: {} })
    }) as typeof api.get)
  })

  it("a aba de logs do usuário mostra o antes e o depois de cada registro", async () => {
    render(<UserDetailsPage />)
    await userEvent.click(await screen.findByRole("button", { name: /Logs de Atividade/ }))

    expect(await screen.findByText("Papel alterado")).toBeInTheDocument()
    const valores = screen.getByTestId("antes-e-depois")
    expect(valores.textContent?.replace(/\s+/g, " ")).toContain("Usuário")
    expect(valores.textContent).toContain("Administrador")
    expect(screen.getByText(/Autor: c\*\*\*@x\.com/)).toBeInTheDocument()
  })
})
