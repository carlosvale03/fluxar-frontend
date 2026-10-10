import { render, screen, within } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import { toast } from "sonner"
import { beforeEach, describe, expect, it, vi } from "vitest"

import SalarioPage from "@/app/(app)/salario/page"
import type { User } from "@/contexts/auth-context"
import { api } from "@/services/apiClient"

import { usuario } from "../permissoes/acesso"
import { CATEGORIAS_DE_RECEITA, CONTAS, METAS, MODELOS, PLANO_SALVO, divisao, recebimento, referencias, resposta, revisao } from "./dados"

// SALARIO-45: "Desfazer divisão" lista as transações que serão removidas e
// pede confirmação; confirmar chama o desfazer e atualiza os salários a
// dividir (SALARIO-47); a recusa do backend aparece no toast (SALARIO-49).

const auth = vi.hoisted(() => ({ user: null as User | null }))
const estadoDoAuth = () => ({ user: auth.user, isLoading: false, refreshUser: vi.fn() })

vi.mock("next/navigation", () => ({
  useRouter: () => ({ push: vi.fn(), replace: vi.fn() }),
  usePathname: () => "/salario",
  useSearchParams: () => new URLSearchParams(),
}))
vi.mock("@/hooks/use-auth", () => ({ useAuth: () => estadoDoAuth() }))
vi.mock("@/contexts/auth-context", () => ({ useAuth: () => estadoDoAuth() }))
vi.mock("sonner", () => ({ toast: Object.assign(vi.fn(), { success: vi.fn(), error: vi.fn() }) }))
vi.mock("@/services/apiClient", async (importOriginal) => ({
  ...(await importOriginal<typeof import("@/services/apiClient")>()),
  api: { get: vi.fn(), post: vi.fn(), put: vi.fn() },
}))

const get = vi.mocked(api.get)
const post = vi.mocked(api.post)

const DIVISAO = divisao({
  transactions: [
    ...divisao().transactions,
    {
      transfer_id: "tr-2",
      out_transaction_id: "t2-out",
      in_transaction_id: "t2-in",
      kind: "TRANSFER",
      part_name: "Reserva",
      origin_account: { id: "conta-salario", name: "Banco Azul" },
      destination_type: "ACCOUNT",
      destination_name: "Reserva",
      account: "conta-reserva",
      goal: null,
      amount: "300.00",
      date: "2026-10-10",
    },
  ],
})

let desfazer: () => Promise<unknown>

const chamadasDoDesfazer = () => post.mock.calls.filter(([url]) => url === "/salary/divisions/div-1/undo/")
const chamadasDosPendentes = () => get.mock.calls.filter(([url]) => url === "/salary/pending/")

// Gera a divisão pela revisão e abre a confirmação do desfazer
async function gerarEPedirParaDesfazer() {
  render(<SalarioPage />)
  await screen.findByRole("region", { name: "Plano de divisão" })
  await userEvent.click(await screen.findByRole("button", { name: /Dividir/ }))
  const janela = await screen.findByRole("dialog")
  await within(janela).findByRole("list", { name: "Transações que serão criadas" })
  await userEvent.click(within(janela).getByRole("checkbox", { name: "Confirmo que fiz essas transferências no banco" }))
  await userEvent.click(within(janela).getByRole("button", { name: /^Gerar/ }))
  await userEvent.click(await within(janela).findByRole("button", { name: "Desfazer divisão" }))
  return screen.findByRole("alertdialog")
}

beforeEach(() => {
  vi.clearAllMocks()
  auth.user = usuario()
  const dados: Record<string, unknown> = {
    "/salary/pending/": [recebimento()],
    "/salary/references/": referencias(),
    "/salary/plan/": PLANO_SALVO,
    "/salary/models/": MODELOS,
    "/accounts/": CONTAS,
    "/goals/": METAS,
    "/categories/": CATEGORIAS_DE_RECEITA,
  }
  get.mockImplementation(((url: string) => resposta(dados[url] ?? [])) as typeof api.get)
  desfazer = () => resposta({ ...DIVISAO, undone_at: "2026-10-10T13:00:00-03:00" })
  post.mockImplementation(((url: string) => {
    if (url === "/salary/divisions/preview/") return resposta(revisao())
    if (url === "/salary/divisions/") return resposta(DIVISAO)
    if (url === "/salary/divisions/div-1/undo/") return desfazer()
    return resposta({})
  }) as typeof api.post)
})

// A página inteira é pesada no jsdom quando a suíte roda em paralelo
describe("Desfazer a divisão pela tela", { timeout: 15000 }, () => {
  it("a confirmação lista as transações da divisão", async () => {
    const confirmacao = await gerarEPedirParaDesfazer()

    expect(within(confirmacao).getByRole("heading", { name: "Desfazer a divisão?" })).toBeInTheDocument()
    expect(confirmacao).toHaveTextContent("Estas 2 transações serão removidas")
    const itens = within(within(confirmacao).getByRole("list", { name: "Transações que serão removidas" })).getAllByRole("listitem")
    expect(itens).toHaveLength(2)
    expect(itens[0]).toHaveTextContent("Aporte: Guardar")
    expect(itens[0]).toHaveTextContent("Viagem")
    expect(itens[0]).toHaveTextContent("R$ 600,00")
    expect(itens[1]).toHaveTextContent("Transferência: Reserva")
    expect(itens[1]).toHaveTextContent("R$ 300,00")
    expect(itens[1]).toHaveTextContent("10/10/2026")
    expect(chamadasDoDesfazer()).toHaveLength(0)
  })

  it("confirmar chama o desfazer e atualiza a lista de salários a dividir", async () => {
    const confirmacao = await gerarEPedirParaDesfazer()
    // Depois da geração, a lista já foi relida uma vez
    await vi.waitFor(() => expect(chamadasDosPendentes()).toHaveLength(2))

    await userEvent.click(within(confirmacao).getByRole("button", { name: "Desfazer divisão" }))

    await vi.waitFor(() => expect(chamadasDoDesfazer()).toHaveLength(1))
    await vi.waitFor(() => expect(chamadasDosPendentes()).toHaveLength(3))
    await vi.waitFor(() => expect(screen.queryByRole("alertdialog")).not.toBeInTheDocument())
    await vi.waitFor(() => expect(screen.queryByRole("dialog")).not.toBeInTheDocument())
    expect(toast.success).toHaveBeenCalledWith("Divisão desfeita. O salário voltou para a lista de salários a dividir.")
  })

  it("o 400 do prazo aparece no toast, e a confirmação continua aberta", async () => {
    desfazer = () => Promise.reject({ response: { status: 400, data: { detail: "O prazo para desfazer esta divisão acabou." } } })
    const confirmacao = await gerarEPedirParaDesfazer()

    await userEvent.click(within(confirmacao).getByRole("button", { name: "Desfazer divisão" }))

    await vi.waitFor(() => expect(toast.error).toHaveBeenCalledWith("O prazo para desfazer esta divisão acabou."))
    expect(screen.getByRole("alertdialog")).toBeInTheDocument()
    expect(chamadasDosPendentes()).toHaveLength(2)
  })

  it("cancelar fecha a confirmação sem desfazer", async () => {
    const confirmacao = await gerarEPedirParaDesfazer()

    await userEvent.click(within(confirmacao).getByRole("button", { name: "Cancelar" }))

    await vi.waitFor(() => expect(screen.queryByRole("alertdialog")).not.toBeInTheDocument())
    expect(chamadasDoDesfazer()).toHaveLength(0)
  })
})
