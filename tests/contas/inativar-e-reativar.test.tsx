import { render, screen, within } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import { beforeEach, describe, expect, it, vi } from "vitest"

import AccountsPage from "@/app/(app)/contas/page"
import { AccountFormDialog } from "@/components/accounts/account-form-dialog"
import { accountsService } from "@/services/accounts"
import { api } from "@/services/apiClient"
import { Account, AccountType } from "@/types/accounts"
import { toast } from "sonner"

// SALDO-46 a SALDO-52: o interruptor "Conta ativa" inativa e reativa a conta
// pelas rotas próprias, o filtro "Inativas" pede as inativas ao backend e o
// cartão da conta inativa tem a ação de reativar.

vi.mock("@/services/apiClient", async (importOriginal) => ({
  ...(await importOriginal<typeof import("@/services/apiClient")>()),
  api: { get: vi.fn(), post: vi.fn(), put: vi.fn(), delete: vi.fn() },
}))

const atualizarUso = vi.fn()
vi.mock("@/hooks/use-plan", () => ({
  // PERM-18: o acesso do /auth/me com tudo liberado e sem limite
  usePlan: () => ({
    podeUsar: () => true,
    limite: () => ({ limit: null, used: 0 }),
    limiteAtingido: () => false,
    atualizarUso,
  }),
}))

vi.mock("sonner", () => ({ toast: { success: vi.fn(), error: vi.fn(), info: vi.fn() } }))

const get = vi.mocked(api.get)
const post = vi.mocked(api.post)
const put = vi.mocked(api.put)

function conta(dados: Partial<Account> = {}): Account {
  return {
    id: "conta-1",
    name: "Banco",
    type: AccountType.CHECKING,
    balance: "0.00",
    initial_balance: "0.00",
    institution: "",
    color: "#6366f1",
    is_active: true,
    created_at: "2026-01-01T00:00:00Z",
    updated_at: "2026-01-01T00:00:00Z",
    ...dados,
  } as Account
}

const ATIVA = conta()
const INATIVA = conta({ id: "conta-2", name: "Conta antiga", is_active: false })

const SALDO_47 = "Zere o saldo antes de inativar a conta: transfira ou ajuste o valor restante."
const LIMITE = "Você atingiu o limite do seu plano."

async function escolherStatus(rotulo: "Ativas" | "Inativas" | "Todas") {
  await userEvent.click(await screen.findByRole("button", { name: /filtros avançados/i }))
  await userEvent.click(await screen.findByRole("button", { name: rotulo }))
  await userEvent.click(screen.getByRole("button", { name: /aplicar filtros/i }))
}

beforeEach(() => {
  get.mockReset()
  post.mockReset()
  put.mockReset()
  atualizarUso.mockReset()
  vi.mocked(toast.error).mockReset()
  vi.mocked(toast.success).mockReset()
  get.mockImplementation(async (_url, config) => {
    const status = (config?.params as { status?: string } | undefined)?.status
    if (status === "inactive") return { data: [INATIVA] }
    if (status === "all") return { data: [ATIVA, INATIVA] }
    return { data: [ATIVA] }
  })
})

describe("Lista de contas por status (SALDO-51)", () => {
  it("abre pedindo a lista padrão, sem parâmetro", async () => {
    render(<AccountsPage />)

    expect(await screen.findByText("Banco")).toBeInTheDocument()
    expect(get.mock.calls[0]).toEqual(["/accounts/"])
  })

  it("o filtro Inativas pede status=inactive e mostra a conta inativa", async () => {
    render(<AccountsPage />)
    await screen.findByText("Banco")

    await escolherStatus("Inativas")

    await vi.waitFor(() =>
      expect(get).toHaveBeenLastCalledWith("/accounts/", { params: { status: "inactive" } }),
    )
    expect(await screen.findByText("Conta antiga")).toBeInTheDocument()
    expect(screen.queryByText("Banco")).not.toBeInTheDocument()
  })

  it("o filtro Todas pede status=all", async () => {
    render(<AccountsPage />)
    await screen.findByText("Banco")

    await escolherStatus("Todas")

    await vi.waitFor(() =>
      expect(get).toHaveBeenLastCalledWith("/accounts/", { params: { status: "all" } }),
    )
    expect(await screen.findByText("Conta antiga")).toBeInTheDocument()
    expect(screen.getByText("Banco")).toBeInTheDocument()
  })

  it("quem já chamava getAccounts() continua pedindo só /accounts/", async () => {
    await accountsService.getAccounts()

    expect(get).toHaveBeenCalledTimes(1)
    expect(get.mock.calls[0]).toEqual(["/accounts/"])
  })
})

describe("Reativar pelo cartão da conta inativa (SALDO-49 e SALDO-50)", () => {
  it("só a conta inativa tem a ação Reativar", async () => {
    render(<AccountsPage />)
    await screen.findByText("Banco")
    await escolherStatus("Todas")
    await screen.findByText("Conta antiga")

    expect(screen.getAllByRole("button", { name: "Reativar" })).toHaveLength(1)
  })

  it("reativa, relê a lista e o uso do plano", async () => {
    post.mockResolvedValue({ data: { ...INATIVA, is_active: true } })
    render(<AccountsPage />)
    await screen.findByText("Banco")
    await escolherStatus("Inativas")
    await screen.findByText("Conta antiga")
    const chamadasAntes = get.mock.calls.length

    await userEvent.click(screen.getByRole("button", { name: "Reativar" }))

    expect(post).toHaveBeenCalledWith("/accounts/conta-2/reactivate/")
    await vi.waitFor(() => expect(toast.success).toHaveBeenCalledWith("Conta reativada."))
    expect(atualizarUso).toHaveBeenCalled()
    await vi.waitFor(() => expect(get.mock.calls.length).toBeGreaterThan(chamadasAntes))
    expect(get).toHaveBeenLastCalledWith("/accounts/", { params: { status: "inactive" } })
  })

  it("mostra a recusa do limite do plano", async () => {
    post.mockRejectedValue({
      response: {
        status: 403,
        data: { detail: LIMITE, code: "plan_limit_reached", feature: "limite_contas", limit: 2 },
      },
    })
    render(<AccountsPage />)
    await screen.findByText("Banco")
    await escolherStatus("Inativas")
    await screen.findByText("Conta antiga")

    await userEvent.click(screen.getByRole("button", { name: "Reativar" }))

    await vi.waitFor(() =>
      expect(toast.error).toHaveBeenCalledWith(LIMITE, expect.objectContaining({ action: expect.anything() })),
    )
    expect(toast.success).not.toHaveBeenCalled()
  })
})

describe("Interruptor Conta ativa na edição (SALDO-52)", () => {
  function abrirEdicao(account: Account) {
    const onSuccess = vi.fn()
    render(<AccountFormDialog open onOpenChange={vi.fn()} account={account} onSuccess={onSuccess} />)
    return { onSuccess }
  }

  it("mostra o texto de ajuda do interruptor", () => {
    abrirEdicao(ATIVA)

    expect(
      screen.getByText("Inativar tira a conta das listas e dos totais. O histórico continua."),
    ).toBeInTheDocument()
  })

  it("desligar e salvar inativa a conta pela rota própria, sem o PUT", async () => {
    post.mockResolvedValue({ data: { ...ATIVA, is_active: false } })
    const { onSuccess } = abrirEdicao(ATIVA)

    await userEvent.click(screen.getByRole("switch", { name: "Conta ativa" }))
    await userEvent.click(screen.getByRole("button", { name: /salvar alterações/i }))

    await vi.waitFor(() => expect(onSuccess).toHaveBeenCalled())
    expect(post).toHaveBeenCalledWith("/accounts/conta-1/deactivate/")
    expect(put).not.toHaveBeenCalled()
    expect(toast.success).toHaveBeenCalledWith("Conta inativada.")
    expect(atualizarUso).toHaveBeenCalled()
  })

  it("a recusa do backend vai ao toast, o interruptor volta e o diálogo fica aberto", async () => {
    post.mockRejectedValue({ response: { status: 400, data: { detail: SALDO_47 } } })
    const { onSuccess } = abrirEdicao(ATIVA)
    const interruptor = screen.getByRole("switch", { name: "Conta ativa" })

    await userEvent.click(interruptor)
    expect(interruptor).toHaveAttribute("aria-checked", "false")
    await userEvent.click(screen.getByRole("button", { name: /salvar alterações/i }))

    await vi.waitFor(() => expect(toast.error).toHaveBeenCalledWith(SALDO_47))
    expect(post).toHaveBeenCalledWith("/accounts/conta-1/deactivate/")
    expect(interruptor).toHaveAttribute("aria-checked", "true")
    expect(onSuccess).not.toHaveBeenCalled()
    expect(screen.getByText("Editar Conta")).toBeInTheDocument()
    expect(toast.success).not.toHaveBeenCalled()
  })

  it("com outros dados alterados, faz o PUT sem is_active e depois inativa", async () => {
    put.mockResolvedValue({ data: ATIVA })
    post.mockResolvedValue({ data: { ...ATIVA, is_active: false } })
    const { onSuccess } = abrirEdicao(ATIVA)

    const nome = screen.getByLabelText(/nome amigável/i)
    await userEvent.clear(nome)
    await userEvent.type(nome, "Banco novo")
    await userEvent.click(screen.getByRole("switch", { name: "Conta ativa" }))
    await userEvent.click(screen.getByRole("button", { name: /salvar alterações/i }))

    await vi.waitFor(() => expect(onSuccess).toHaveBeenCalled())
    const corpo = put.mock.calls[0][1] as Record<string, unknown>
    expect(corpo.name).toBe("Banco novo")
    expect(corpo).not.toHaveProperty("is_active")
    expect(post).toHaveBeenCalledWith("/accounts/conta-1/deactivate/")
    expect(put.mock.invocationCallOrder[0]).toBeLessThan(post.mock.invocationCallOrder[0])
  })

  it("ligar numa conta inativa reativa a conta", async () => {
    post.mockResolvedValue({ data: { ...INATIVA, is_active: true } })
    const { onSuccess } = abrirEdicao(INATIVA)

    await userEvent.click(screen.getByRole("switch", { name: "Conta ativa" }))
    await userEvent.click(screen.getByRole("button", { name: /salvar alterações/i }))

    await vi.waitFor(() => expect(onSuccess).toHaveBeenCalled())
    expect(post).toHaveBeenCalledWith("/accounts/conta-2/reactivate/")
    expect(put).not.toHaveBeenCalled()
    expect(toast.success).toHaveBeenCalledWith("Conta reativada.")
  })

  it("sem mexer no interruptor, salva só pelo PUT", async () => {
    put.mockResolvedValue({ data: ATIVA })
    const { onSuccess } = abrirEdicao(ATIVA)

    await userEvent.click(screen.getByRole("button", { name: /salvar alterações/i }))

    await vi.waitFor(() => expect(onSuccess).toHaveBeenCalled())
    expect(put).toHaveBeenCalledTimes(1)
    expect(post).not.toHaveBeenCalled()
  })

  it("na criação não há interruptor", () => {
    render(<AccountFormDialog open onOpenChange={vi.fn()} />)

    expect(within(document.body).queryByRole("switch", { name: "Conta ativa" })).not.toBeInTheDocument()
  })
})
