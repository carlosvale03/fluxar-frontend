import { render, screen, waitFor } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import { toast } from "sonner"
import { beforeEach, describe, expect, it, vi } from "vitest"

import UserDetailsPage from "@/app/(admin)/admin/usuarios/[id]/page"
import * as admin from "@/services/admin"
import { api } from "@/services/apiClient"
import { goalsService } from "@/services/goals"

// LGPD-19: o painel mostra o CPF e o telefone mascarados como vêm da API, sem
// a renda nem a data de nascimento.
// LGPD-20: a imagem da meta é enviada com um nome genérico, sem o nome original.
// LGPD-13 e LGPD-21: a resposta da exclusão não traz o nome; a falha do
// Cloudinary (503 deletion_failed) mostra a mensagem do backend.

// O roteador do Next é o mesmo objeto entre renderizações
const { push, roteador } = vi.hoisted(() => {
  const push = vi.fn()
  return { push, roteador: { push, replace: () => {} } }
})

vi.mock("next/navigation", () => ({
  useParams: () => ({ id: "u1" }),
  useRouter: () => roteador,
}))

vi.mock("@/services/admin", async (importOriginal) => ({
  ...(await importOriginal<typeof import("@/services/admin")>()),
  getAdminUser: vi.fn(),
  getUserFinancialStats: vi.fn(),
  getUserLogs: vi.fn(),
  hardDeleteAdminUser: vi.fn(),
}))

vi.mock("@/services/apiClient", async (importOriginal) => ({
  ...(await importOriginal<typeof import("@/services/apiClient")>()),
  api: { get: vi.fn(), post: vi.fn(), patch: vi.fn(), delete: vi.fn() },
}))

vi.mock("sonner", () => ({ toast: Object.assign(vi.fn(), { success: vi.fn(), error: vi.fn() }) }))

// O que o AdminUserSerializer devolve: CPF e telefone mascarados, sem nascimento nem renda
const USUARIO_NO_PAINEL = {
  id: "u1-abcdefgh",
  name: "Ana Souza",
  email: "ana@x.com",
  role: "USER",
  plan: "COMMON",
  emailVerified: true,
  is_active: true,
  cpf: "***.***.***-12",
  phone_number: "*******4321",
  avatar_url: null,
  created_at: "2026-01-10T12:00:00Z",
  preferences: { currency: "BRL", language: "pt-BR", theme: "light", notifications: {} },
}

describe("Painel admin com dados pessoais mascarados", () => {
  beforeEach(() => {
    vi.clearAllMocks()
    vi.mocked(admin.getAdminUser).mockResolvedValue(USUARIO_NO_PAINEL as admin.UsuarioNoPainel)
    vi.mocked(admin.getUserFinancialStats).mockResolvedValue({
      total_balance: "100.00",
      avg_income_value: "0.00",
      avg_expense_value: "0.00",
      income_count_per_day: 0,
      expense_count_per_day: 0,
      last_transaction_date: "2026-10-01",
    })
    vi.mocked(admin.getUserLogs).mockResolvedValue({
      count: 0,
      total_pages: 1,
      current_page: 1,
      next: null,
      previous: null,
      results: [],
    })
  })

  it("o detalhe mostra o CPF e o telefone mascarados e não mostra renda nem nascimento", async () => {
    const { container } = render(<UserDetailsPage />)

    expect(await screen.findByText("***.***.***-12")).toBeInTheDocument()
    expect(screen.getByText("*******4321")).toBeInTheDocument()
    const texto = container.textContent ?? ""
    expect(texto).not.toMatch(/renda/i)
    expect(texto).not.toMatch(/nascimento/i)
  })

  it("a exclusão confirmada avisa com o nome que a tela já tem", async () => {
    vi.mocked(admin.hardDeleteAdminUser).mockResolvedValueOnce(undefined)
    render(<UserDetailsPage />)

    await userEvent.click(await screen.findByRole("button", { name: /excluir permanente/i }))
    await userEvent.type(screen.getByPlaceholderText("Sua senha de acesso admin"), "senha-admin")
    await userEvent.click(screen.getByRole("button", { name: /excluir permanentemente/i }))

    await waitFor(() => expect(toast.success).toHaveBeenCalledWith("Usuário Ana Souza excluído permanentemente."))
    expect(push).toHaveBeenCalledWith("/admin/usuarios")
  })

  it("com a falha no Cloudinary, mostra a mensagem do backend e continua na tela", async () => {
    const detail = "Não foi possível concluir a exclusão agora. Nada foi apagado; tente de novo mais tarde."
    vi.mocked(admin.hardDeleteAdminUser).mockRejectedValueOnce({
      response: { status: 503, data: { detail, code: "deletion_failed" } },
    })
    render(<UserDetailsPage />)

    await userEvent.click(await screen.findByRole("button", { name: /excluir permanente/i }))
    await userEvent.type(screen.getByPlaceholderText("Sua senha de acesso admin"), "senha-admin")
    await userEvent.click(screen.getByRole("button", { name: /excluir permanentemente/i }))

    await waitFor(() => expect(toast.error).toHaveBeenCalledWith(detail))
    expect(push).not.toHaveBeenCalledWith("/admin/usuarios")
  })
})

describe("Imagem da meta", () => {
  beforeEach(() => {
    vi.clearAllMocks()
    vi.mocked(api.post).mockResolvedValue({ data: {} })
    vi.mocked(api.patch).mockResolvedValue({ data: {} })
  })

  function imagemEnviada(chamada: unknown[]) {
    const formData = chamada[1] as FormData
    return formData.get("image") as File
  }

  it("a criação envia a imagem com nome genérico, sem o nome original", async () => {
    const arquivo = new File(["x"], "joao-silva.jpg", { type: "image/jpeg" })

    await goalsService.createGoal({ name: "Viagem", target_amount: "1000.00", image: arquivo } as never)

    const imagem = imagemEnviada(vi.mocked(api.post).mock.calls[0])
    expect(imagem.name).not.toMatch(/joao|silva/i)
    expect(imagem.name).toMatch(/\.jpg$/)
  })

  it("a edição também envia a imagem sem o nome original", async () => {
    const arquivo = new File(["x"], "Foto de Maria Souza.png", { type: "image/png" })

    await goalsService.updateGoal("g1", { image: arquivo } as never)

    const imagem = imagemEnviada(vi.mocked(api.patch).mock.calls[0])
    expect(imagem.name).not.toMatch(/maria|souza|foto/i)
    expect(imagem.name).toMatch(/\.png$/)
  })
})
