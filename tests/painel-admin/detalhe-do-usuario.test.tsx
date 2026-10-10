import { render, screen, within } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import { AxiosError, type AxiosResponse } from "axios"
import { toast } from "sonner"
import { beforeEach, describe, expect, it, vi } from "vitest"

import UserDetailsPage from "@/app/(admin)/admin/usuarios/[id]/page"
import { api } from "@/services/apiClient"

import { abrirLimpeza, confirmarLimpeza } from "./confirmacoes-auxiliares"

// ADMIN-01: falha ao carregar mostra o erro com "Tentar de novo", sem dados
// e com as ações desabilitadas. ADMIN-06: sem aba "Assinatura" nem histórico
// simulado. Depois da limpeza, a tela usa as estatísticas da API.

const { push, roteador } = vi.hoisted(() => {
  const push = vi.fn()
  return { push, roteador: { push, replace: () => {}, back: () => {} } }
})

vi.mock("next/navigation", () => ({
  useParams: () => ({ id: "u1" }),
  useRouter: () => roteador,
}))

vi.mock("@/services/apiClient", async (importOriginal) => ({
  ...(await importOriginal<typeof import("@/services/apiClient")>()),
  api: { get: vi.fn(), post: vi.fn(), patch: vi.fn(), delete: vi.fn() },
}))

vi.mock("sonner", () => ({ toast: { success: vi.fn(), error: vi.fn(), warning: vi.fn() } }))

const get = vi.mocked(api.get)
const post = vi.mocked(api.post)

const USUARIO = {
  id: "u1",
  name: "Ana Souza",
  email: "ana@x.com",
  role: "USER",
  plan: "PREMIUM",
  is_active: true,
  emailVerified: true,
  cpf: "***.***.***-12",
  phone_number: null,
  avatar_url: null,
  created_at: "2026-01-10T12:00:00Z",
}

const ESTATISTICAS = {
  total_balance: "1500.00",
  avg_income_value: "166.67",
  avg_expense_value: "6.00",
  income_count_per_day: 1.5,
  expense_count_per_day: 2,
  last_transaction_date: "2026-10-01",
}

const PAGINA_VAZIA = { count: 0, total_pages: 1, current_page: 1, next: null, previous: null, results: [] }

function erro500() {
  const response = { data: "", status: 500, statusText: "", headers: {}, config: {} } as AxiosResponse
  return new AxiosError("erro", AxiosError.ERR_BAD_RESPONSE, undefined, null, response)
}

function servidor({ usuarioFalha = false } = {}) {
  get.mockImplementation(((url: string) => {
    if (url === "/admin/users/u1/") return usuarioFalha ? Promise.reject(erro500()) : Promise.resolve({ data: USUARIO })
    if (url === "/admin/users/u1/financial-stats/") return Promise.resolve({ data: ESTATISTICAS })
    if (url === "/admin/users/u1/logs/") return Promise.resolve({ data: PAGINA_VAZIA })
    return Promise.resolve({ data: {} })
  }) as typeof api.get)
}

const ACOES = [/resetar senha/i, /limpar dados/i, /arquivar conta/i, /excluir permanente/i, /alterar plano/i]

describe("Detalhe do usuário sem dados falsos", () => {
  beforeEach(() => {
    vi.clearAllMocks()
    get.mockReset()
  })

  it("com a API devolvendo 500, mostra o erro, nenhum dado do usuário e nenhuma ação habilitada", async () => {
    servidor({ usuarioFalha: true })
    const { container } = render(<UserDetailsPage />)

    const alerta = await screen.findByRole("alert")
    expect(within(alerta).getByText("Não foi possível carregar o usuário")).toBeInTheDocument()
    const texto = container.textContent ?? ""
    for (const dado of ["Ana Souza", "ana@x.com", "***.***.***-12", "Mock", "R$"]) expect(texto).not.toContain(dado)
    for (const acao of ACOES) {
      for (const botao of screen.queryAllByRole("button", { name: acao })) expect(botao).toBeDisabled()
    }
    // Só voltar e tentar de novo ficam disponíveis
    const habilitados = screen.getAllByRole("button").filter((b) => !(b as HTMLButtonElement).disabled)
    expect(habilitados.map((b) => b.textContent?.trim())).toEqual(["Voltar para Lista", "Tentar de novo"])
    // O erro passa pelo tratarErro, e a tela não leva de volta à lista
    expect(toast.error).toHaveBeenCalledWith("Não foi possível falar com o servidor.", expect.anything())
    expect(push).not.toHaveBeenCalled()
  })

  it('"Tentar de novo" chama a API de novo e mostra o usuário', async () => {
    servidor({ usuarioFalha: true })
    render(<UserDetailsPage />)

    await screen.findByRole("alert")
    servidor()
    await userEvent.click(screen.getByRole("button", { name: "Tentar de novo" }))

    expect(await screen.findByRole("heading", { name: "Ana Souza" })).toBeInTheDocument()
    expect(get.mock.calls.filter(([url]) => url === "/admin/users/u1/")).toHaveLength(2)
    expect(screen.getByRole("button", { name: /excluir permanente/i })).toBeEnabled()
  })

  it('não existe aba "Assinatura" nem histórico simulado; o plano muda pela visão geral', async () => {
    servidor()
    const { container } = render(<UserDetailsPage />)

    await screen.findByRole("heading", { name: "Ana Souza" })
    expect(screen.queryByRole("button", { name: /assinatura/i })).not.toBeInTheDocument()
    const texto = container.textContent ?? ""
    for (const falso of ["#TRX-9902", "R$ 29,90", "Renovação Mensal", "Histórico de Transações"]) expect(texto).not.toContain(falso)
    expect(screen.getByRole("button", { name: /alterar plano/i })).toBeEnabled()
  })

  it("depois de limpar os dados, a tela mostra as estatísticas devolvidas pela API", async () => {
    servidor()
    post.mockResolvedValueOnce({
      data: {
        message: "Dados do usuário limpos com sucesso.",
        financial_stats: { ...ESTATISTICAS, total_balance: "0.00", avg_income_value: "0.00", avg_expense_value: "0.00", income_count_per_day: 0, expense_count_per_day: 0, last_transaction_date: null },
      },
    })
    render(<UserDetailsPage />)

    expect(await screen.findByText(/1\.500,00/)).toBeInTheDocument()
    await abrirLimpeza()
    await confirmarLimpeza("ana@x.com", "senha-admin")

    await vi.waitFor(() => expect(screen.queryByText(/1\.500,00/)).not.toBeInTheDocument())
    expect(post).toHaveBeenCalledWith("/admin/users/u1/clear-data/", { admin_password: "senha-admin" })
    expect(screen.getAllByText(/0,00/).length).toBeGreaterThan(0)
  })
})
