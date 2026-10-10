import { render, screen, within } from "@testing-library/react"
import { AxiosError } from "axios"
import { toast } from "sonner"
import { beforeEach, describe, expect, it, vi } from "vitest"

import AdminDashboardPage from "@/app/(admin)/admin/dashboard/page"
import { api } from "@/services/apiClient"

// ADMIN-07: total, cada plano, cadastros recentes e "Usuários em planos
// pagos". ADMIN-02: saúde da API e do banco medida na hora, com o banco em
// erro quando o backend diz "error". ADMIN-05: nenhuma receita.

vi.mock("@/services/apiClient", async (importOriginal) => ({
  ...(await importOriginal<typeof import("@/services/apiClient")>()),
  api: { get: vi.fn() },
}))

vi.mock("sonner", () => ({ toast: { success: vi.fn(), error: vi.fn(), warning: vi.fn() } }))

const get = vi.mocked(api.get)

function stats(banco: { status: "ok" | "error"; latency_ms: number | null; version: string | null }) {
  return {
    total_users: 7,
    users_by_plan: { COMMON: 4, PREMIUM: 2, PREMIUM_PLUS: 1 },
    paid_users_percentage: "42.9",
    recent_users: [{ id: "u9", name: "Bruno Lima", email: "bruno@x.com", created_at: "2026-10-01T12:00:00Z" }],
    health: { api: "ok", database: banco },
    version: "abc1234",
  }
}

function card(titulo: string) {
  return screen.getByText(titulo).closest(".rounded-\\[24px\\]") as HTMLElement
}

describe("Dashboard do admin", () => {
  beforeEach(() => {
    get.mockReset()
    vi.mocked(toast.error).mockReset()
  })

  it("mostra o total, a contagem de cada plano, os planos pagos e os cadastros recentes", async () => {
    get.mockResolvedValue({ data: stats({ status: "ok", latency_ms: 3, version: "16.4" }) })
    render(<AdminDashboardPage />)

    expect(await screen.findByText("Bruno Lima")).toBeInTheDocument()
    expect(within(card("Total de Usuários")).getByText("7")).toBeInTheDocument()
    expect(within(card("Plano Comum")).getByText("4")).toBeInTheDocument()
    expect(within(card("Plano Premium")).getByText("2")).toBeInTheDocument()
    expect(within(card("Plano Premium Plus")).getByText("1")).toBeInTheDocument()
    expect(within(card("Usuários em planos pagos")).getByText("42,9%")).toBeInTheDocument()
  })

  it("mostra a saúde medida: latência e versão do banco vindas da API", async () => {
    get.mockResolvedValue({ data: stats({ status: "ok", latency_ms: 3, version: "16.4" }) })
    render(<AdminDashboardPage />)

    const banco = await screen.findByTestId("saude-banco")
    expect(await within(banco).findByText("Operacional")).toBeInTheDocument()
    expect(within(banco).getByText("Latência: 3 ms")).toBeInTheDocument()
    expect(within(banco).getByText("PostgreSQL 16.4")).toBeInTheDocument()
    expect(within(screen.getByTestId("saude-api")).getByText("Operacional")).toBeInTheDocument()
  })

  it('com o banco em "error", o card do banco mostra erro e nenhuma latência', async () => {
    get.mockResolvedValue({ data: stats({ status: "error", latency_ms: null, version: null }) })
    render(<AdminDashboardPage />)

    const banco = await screen.findByTestId("saude-banco")
    expect(await within(banco).findByText("Com erro")).toBeInTheDocument()
    expect(within(banco).getByText("Sem latência")).toBeInTheDocument()
    expect(within(banco).queryByText("Operacional")).not.toBeInTheDocument()
  })

  it('não mostra "API HEALTH CHECK OK", "ASSINATURAS ATIVAS" nem receita', async () => {
    get.mockResolvedValue({ data: stats({ status: "ok", latency_ms: 3, version: "16.4" }) })
    const { container } = render(<AdminDashboardPage />)

    await screen.findByText("Bruno Lima")
    const texto = container.textContent ?? ""
    expect(texto).not.toMatch(/API HEALTH CHECK OK/i)
    expect(texto).not.toMatch(/ASSINATURAS ATIVAS/i)
    expect(texto).not.toMatch(/receita/i)
    expect(texto).not.toMatch(/R\$/)
  })

  it('a falha da API passa pelo tratarErro, com "Tentar de novo", sem números inventados', async () => {
    get.mockRejectedValueOnce(new AxiosError("Network Error", AxiosError.ERR_NETWORK))
    render(<AdminDashboardPage />)

    await vi.waitFor(() => expect(toast.error).toHaveBeenCalled())
    const [mensagem, opcoes] = vi.mocked(toast.error).mock.calls[0] as [string, { action: { label: string; onClick: () => void } }]
    expect(mensagem).toBe("Não foi possível falar com o servidor.")
    expect(opcoes.action.label).toBe("Tentar de novo")
    expect(within(card("Total de Usuários")).getByText("—")).toBeInTheDocument()
    expect(within(screen.getByTestId("saude-banco")).getByText("Sem dados")).toBeInTheDocument()

    get.mockResolvedValue({ data: stats({ status: "ok", latency_ms: 3, version: "16.4" }) })
    opcoes.action.onClick()
    expect(await screen.findByText("Bruno Lima")).toBeInTheDocument()
  })
})
