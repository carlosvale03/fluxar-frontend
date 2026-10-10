import { render, screen, within } from "@testing-library/react"
import { AxiosError } from "axios"
import { toast } from "sonner"
import { beforeEach, describe, expect, it, vi } from "vitest"

import AdminSettingsPage from "@/app/(admin)/admin/configuracoes/page"
import { api } from "@/services/apiClient"

// ADMIN-04: a tela mostra só o que o backend executa (manutenção, liberação
// para testes e travas). ADMIN-02 e ADMIN-03: saúde e versão vindas da API,
// sem valor fixo de reserva.

vi.mock("@/services/apiClient", async (importOriginal) => ({
  ...(await importOriginal<typeof import("@/services/apiClient")>()),
  api: { get: vi.fn(), post: vi.fn(), patch: vi.fn() },
}))

vi.mock("sonner", () => ({ toast: { success: vi.fn(), error: vi.fn(), warning: vi.fn(), promise: vi.fn() } }))

const get = vi.mocked(api.get)

const STATS = {
  total_users: 3,
  users_by_plan: { COMMON: 3, PREMIUM: 0, PREMIUM_PLUS: 0 },
  paid_users_percentage: "0.0",
  recent_users: [],
  health: { api: "ok", database: { status: "ok", latency_ms: 12, version: "16.4" } },
  version: "2.7.0-rc1",
}

function servidor(falhaEm?: string) {
  get.mockImplementation(((url: string) => {
    if (url === falhaEm) return Promise.reject(new AxiosError("Network Error", AxiosError.ERR_NETWORK))
    if (url === "/admin/stats/") return Promise.resolve({ data: STATS })
    if (url === "/admin/settings/") return Promise.resolve({ data: { maintenance_mode: "true" } })
    if (url === "/admin/plans/") return Promise.resolve({ data: { testing_unlock: false, catalog: [] } })
    if (url === "/admin/logs/") return Promise.resolve({ data: { count: 0, total_pages: 1, current_page: 1, next: null, previous: null, results: [] } })
    if (url === "/admin/users/") return Promise.resolve({ data: { count: 0, total_pages: 1, current_page: 1, next: null, previous: null, results: [] } })
    return Promise.resolve({ data: {} })
  }) as typeof api.get)
}

describe("Configurações do admin", () => {
  beforeEach(() => {
    get.mockReset()
    vi.mocked(toast.error).mockReset()
  })

  it("mostra a versão do deploy e a saúde medida que vêm da API", async () => {
    servidor()
    render(<AdminSettingsPage />)

    expect(await within(screen.getByTestId("versao-do-sistema")).findByText("2.7.0-rc1")).toBeInTheDocument()
    const banco = screen.getByTestId("saude-banco")
    expect(within(banco).getByText("Latência: 12 ms")).toBeInTheDocument()
    expect(within(banco).getByText("PostgreSQL 16.4")).toBeInTheDocument()
    // A manutenção vem da configuração gravada
    expect(screen.getByText(/MANUTENÇÃO ATIVA/)).toBeInTheDocument()
  })

  it('não mostra "Uptime", "PostgreSQL 15.4", "Build" nem "Limpar Cache"', async () => {
    servidor()
    const { container } = render(<AdminSettingsPage />)

    await within(screen.getByTestId("versao-do-sistema")).findByText("2.7.0-rc1")
    const texto = container.textContent ?? ""
    expect(texto).not.toMatch(/uptime/i)
    expect(texto).not.toMatch(/PostgreSQL 15\.4/)
    expect(texto).not.toMatch(/build/i)
    expect(texto).not.toMatch(/cache/i)
    expect(screen.queryByRole("button", { name: /limpar cache/i })).not.toBeInTheDocument()
    // Só as ações que o backend executa
    expect(screen.getByText("Modo de Manutenção")).toBeInTheDocument()
    expect(screen.getByRole("switch", { name: "Liberação para testes" })).toBeInTheDocument()
    expect(screen.getByRole("button", { name: /Planos e travas/ })).toBeInTheDocument()
  })

  it("com a API fora, não inventa versão nem saúde e o erro passa pelo tratarErro", async () => {
    servidor("/admin/stats/")
    const { container } = render(<AdminSettingsPage />)

    await vi.waitFor(() => expect(toast.error).toHaveBeenCalledWith("Não foi possível falar com o servidor.", expect.anything()))
    const texto = container.textContent ?? ""
    for (const fixo of ["1.2.5", "Online", "Conectado", "0ms", "0 ms", "Operacional"]) {
      expect(texto).not.toContain(fixo)
    }
    expect(within(screen.getByTestId("versao-do-sistema")).getByText("Sem dados")).toBeInTheDocument()
  })
})
