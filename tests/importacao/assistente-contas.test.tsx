import { render, screen, waitFor, within } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import { beforeEach, describe, expect, it, vi } from "vitest"

import { AssistenteDePlanilha } from "@/components/importacao/AssistenteDePlanilha"
import type { User } from "@/contexts/auth-context"
import { api } from "@/services/apiClient"
import type { PlanoDeImportacao } from "@/types/importacao"

import { usuario as usuarioDoPlano } from "../permissoes/acesso"
import { analiseMobills, CONTAS_ATIVAS } from "./dados-do-assistente"

// IMPCOMP-39: cada conta do arquivo vinculada a uma conta ativa ou criada com
// nome, tipo, instituição e saldo atual. IMPCOMP-40: no limite de contas,
// nenhuma conta a mais vai para criar e o aviso aparece. IMPCOMP-44: mudar a
// ação de uma conta pede uma nova análise.

const auth = vi.hoisted(() => ({ user: null as User | null }))

vi.mock("@/contexts/auth-context", () => ({ useAuth: () => ({ user: auth.user, isLoading: false }) }))
vi.mock("@/services/apiClient", async (importOriginal) => ({
  ...(await importOriginal<typeof import("@/services/apiClient")>()),
  api: { get: vi.fn(), post: vi.fn() },
}))
vi.mock("sonner", () => ({ toast: Object.assign(vi.fn(), { success: vi.fn(), error: vi.fn(), info: vi.fn() }) }))
vi.mock("next/navigation", () => ({
  useRouter: () => ({ push: vi.fn(), replace: vi.fn() }),
  usePathname: () => "/importar",
  useSearchParams: () => new URLSearchParams(),
}))

// O Select do Radix usa APIs que o jsdom não tem
Element.prototype.hasPointerCapture ??= () => false
Element.prototype.releasePointerCapture ??= () => {}
Element.prototype.scrollIntoView ??= () => {}

const get = vi.mocked(api.get)
const post = vi.mocked(api.post)

function ultimoPlanoEnviado(): PlanoDeImportacao {
  const chamadas = post.mock.calls
  return JSON.parse((chamadas[chamadas.length - 1][1] as FormData).get("plano") as string)
}

async function abrirContas() {
  const usuario = userEvent.setup({ applyAccept: false })
  render(<AssistenteDePlanilha open onOpenChange={vi.fn()} />)
  await usuario.upload(screen.getByLabelText("Arquivo da planilha"), new File(["x"], "mobills.xlsx"))
  await screen.findByRole("region", { name: "Resumo da análise" })
  await usuario.click(screen.getByRole("button", { name: "Contas" }))
  return usuario
}

const conta = (nome: string) => within(screen.getByRole("region", { name: `Conta ${nome}` }))

describe("Assistente de planilha: contas", { timeout: 20_000 }, () => {
  beforeEach(() => {
    vi.clearAllMocks()
    auth.user = usuarioDoPlano()
    get.mockResolvedValue({ data: CONTAS_ATIVAS })
    post.mockResolvedValue({ data: analiseMobills() })
  })

  it("a conta com nome igual vem vinculada e as outras vêm para criar com o tipo sugerido", async () => {
    await abrirContas()

    expect(conta("Nubank").getByRole("button", { name: "Vincular" })).toHaveAttribute("aria-pressed", "true")
    expect(await conta("Nubank").findByRole("combobox", { name: "Conta do Fluxar para Nubank" })).toHaveTextContent("Nubank")
    expect(conta("Nubank").getByText("30 linhas · -R$ 1.200,00 · 02/01/2026 a 30/03/2026")).toBeInTheDocument()

    expect(conta("XC - Carteira").getByRole("button", { name: "Criar" })).toHaveAttribute("aria-pressed", "true")
    expect(conta("XC - Carteira").getByRole("textbox", { name: "Nome da nova conta XC - Carteira" })).toHaveValue("XC - Carteira")
    expect(conta("XC - Carteira").getByRole("combobox", { name: "Tipo da nova conta XC - Carteira" })).toHaveTextContent("Carteira")
    expect(conta("XC - Carteira").getByRole("combobox", { name: "Instituição da nova conta XC - Carteira" })).toHaveTextContent("Nenhuma")
    expect(conta("XC - Carteira").getByText("12 linhas · R$ 350,50 · 05/01/2026 a 28/02/2026")).toBeInTheDocument()
  })

  it("criar com saldo atual de R$ 1.234,56 e instituição manda saldo_atual \"1234.56\" no plano", async () => {
    const usuario = await abrirContas()

    const saldo = conta("XC - Carteira").getByRole("textbox", { name: "Saldo atual da nova conta XC - Carteira" })
    await usuario.clear(saldo)
    await usuario.type(saldo, "1.234,56")
    await usuario.click(conta("XC - Carteira").getByRole("combobox", { name: "Instituição da nova conta XC - Carteira" }))
    await usuario.click(await screen.findByRole("option", { name: "Nubank" }))
    // Nome, tipo e saldo não pedem análise; trocar a ação de uma conta pede
    expect(post).toHaveBeenCalledTimes(1)
    await usuario.click(conta("Nubank").getByRole("button", { name: "Criar" }))

    await waitFor(() => expect(post).toHaveBeenCalledTimes(2))
    expect(ultimoPlanoEnviado().contas).toEqual({
      Nubank: { acao: "criar", nome: "Nubank", tipo: "CHECKING", saldo_atual: "0.00", institution: null, color: null },
      "XC - Carteira": {
        acao: "criar",
        nome: "XC - Carteira",
        tipo: "WALLET",
        saldo_atual: "1234.56",
        institution: "nubank",
        color: "#820AD1",
      },
    })
  })

  it("trocar para vincular pede nova análise com a conta escolhida", async () => {
    const usuario = await abrirContas()

    await usuario.click(conta("XC - Carteira").getByRole("button", { name: "Vincular" }))
    await usuario.click(conta("XC - Carteira").getByRole("combobox", { name: "Conta do Fluxar para XC - Carteira" }))
    await usuario.click(await screen.findByRole("option", { name: "Itaú" }))

    await waitFor(() =>
      expect(post.mock.calls.length > 1 && ultimoPlanoEnviado().contas?.["XC - Carteira"]).toEqual({
        acao: "vincular",
        id: "conta-itau",
      }),
    )
  })

  it("no limite de contas, marcar mais uma para criar fica impedido e o aviso aparece", async () => {
    // 2 contas em uso + 1 a criar no arquivo = 3 de 3
    auth.user = usuarioDoPlano({ limites: { limite_contas: { limit: 3, used: 2 } } })
    const usuario = await abrirContas()

    expect(screen.getByRole("note")).toHaveTextContent("Você atingiu o limite do seu plano.")
    expect(screen.getByRole("note")).toHaveTextContent("3 de 3 contas do seu plano.")
    const criar = conta("Nubank").getByRole("button", { name: "Criar" })
    expect(criar).toBeDisabled()
    await usuario.click(criar)
    expect(conta("Nubank").getByRole("button", { name: "Vincular" })).toHaveAttribute("aria-pressed", "true")
    expect(post).toHaveBeenCalledTimes(1)
  })

  it("abaixo do limite, o uso conta as contas a criar e marcar mais uma fica liberado", async () => {
    auth.user = usuarioDoPlano({ limites: { limite_contas: { limit: 5, used: 2 } } })
    const usuario = await abrirContas()

    expect(screen.getByText("3 de 5 contas do seu plano")).toBeInTheDocument()
    await usuario.click(conta("Nubank").getByRole("button", { name: "Criar" }))
    expect(screen.getByText("4 de 5 contas do seu plano")).toBeInTheDocument()
  })

  it("o erro do backend num campo da conta aparece na conta", async () => {
    const usuario = await abrirContas()
    post.mockRejectedValueOnce({
      response: { status: 400, data: { plano: { contas: { Nubank: { id: ["Conta não encontrada."] } } } } },
    })

    await usuario.click(conta("XC - Carteira").getByRole("button", { name: "Vincular" }))

    expect(await conta("Nubank").findByText("Conta não encontrada.")).toBeInTheDocument()
  })
})
