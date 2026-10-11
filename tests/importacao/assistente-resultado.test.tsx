import { render, screen, waitFor, within } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import { toast } from "sonner"
import { beforeEach, describe, expect, it, vi } from "vitest"

import { AssistenteDePlanilha } from "@/components/importacao/AssistenteDePlanilha"
import type { User } from "@/contexts/auth-context"
import { api } from "@/services/apiClient"
import type { PlanoDeImportacao, ResultadoDaImportacao } from "@/types/importacao"

import { usuario as usuarioDoPlano } from "../permissoes/acesso"
import { analiseMobills, CONTAS_ATIVAS } from "./dados-do-assistente"

// IMPCOMP-45: "Importar" manda o plano revisado numa requisição só.
// IMPCOMP-49: o resultado mostra os quatro totais, as contas criadas, os
// totais por aba e as rejeitadas com a aba, o número e o motivo; com contas
// criadas, o uso do plano é relido.

const auth = vi.hoisted(() => ({ user: null as User | null, refreshUser: vi.fn() }))

vi.mock("@/contexts/auth-context", () => ({
  useAuth: () => ({ user: auth.user, isLoading: false, refreshUser: auth.refreshUser }),
}))
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

const get = vi.mocked(api.get)
const post = vi.mocked(api.post)
const LOTE = "6f1c2a7e-3b4d-4c5e-9f60-718293a4b5c6"

function resultado(trocas: Partial<ResultadoDaImportacao> = {}): ResultadoDaImportacao {
  return {
    total: 68,
    imported: 64,
    ignored: 2,
    rejected: 2,
    suggested: 3,
    batch_id: LOTE,
    rejected_rows: [
      { line: 3, reason: "Data inválida", sheet: "Receitas e Despesas" },
      { line: 7, reason: "Valor inválido", sheet: "Transferências" },
    ],
    excluded: 1,
    accounts_created: [{ id: "nova-1", name: "XC - Carteira" }],
    by_sheet: {
      "Receitas e Despesas": { imported: 55, ignored: 2, rejected: 1 },
      Transferências: { imported: 9, ignored: 0, rejected: 1 },
    },
    summary_rows: 2,
    ...trocas,
  }
}

// A análise responde o Mobills; a importação, o resultado ou o erro
function responder(final: ResultadoDaImportacao | { erro: unknown }) {
  post.mockImplementation(((url: string) => {
    if (url !== "/import/") return Promise.resolve({ data: analiseMobills() })
    return "erro" in final ? Promise.reject(final.erro) : Promise.resolve({ data: final })
  }) as typeof api.post)
}

async function importar() {
  const usuario = userEvent.setup({ applyAccept: false })
  const onOpenChange = vi.fn()
  render(<AssistenteDePlanilha open onOpenChange={onOpenChange} />)
  await usuario.upload(screen.getByLabelText("Arquivo da planilha"), new File(["x"], "mobills.xlsx"))
  await screen.findByRole("region", { name: "Resumo da análise" })
  await usuario.click(screen.getByRole("button", { name: "Contas" }))
  const saldo = screen.getByRole("textbox", { name: "Saldo atual da nova conta XC - Carteira" })
  await usuario.clear(saldo)
  await usuario.type(saldo, "-250,10")
  await usuario.click(screen.getByRole("button", { name: "Importar" }))
  return { usuario, onOpenChange }
}

describe("Assistente de planilha: resultado", { timeout: 20_000 }, () => {
  beforeEach(() => {
    vi.clearAllMocks()
    auth.user = usuarioDoPlano()
    auth.refreshUser.mockResolvedValue(undefined)
    get.mockResolvedValue({ data: CONTAS_ATIVAS })
  })

  it("importar manda o plano revisado e o resultado mostra os totais, as contas criadas e os totais por aba", async () => {
    responder(resultado())

    await importar()

    expect(await screen.findByText("Importação concluída")).toBeInTheDocument()
    const chamada = post.mock.calls.find(([url]) => url === "/import/")!
    const plano: PlanoDeImportacao = JSON.parse((chamada[1] as FormData).get("plano") as string)
    expect(plano.contas?.["XC - Carteira"]).toMatchObject({ acao: "criar", saldo_atual: "-250.10" })
    expect(plano.contas?.Nubank).toEqual({ acao: "vincular", id: "conta-nubank" })

    expect(screen.getByText("Lidas", { selector: "p" }).parentElement).toHaveTextContent(/^Σ68Lidas$/)
    expect(screen.getByText("Gravadas", { selector: "p" }).parentElement).toHaveTextContent(/^64Gravadas$/)
    expect(screen.getByText("Ignoradas", { selector: "p" }).parentElement).toHaveTextContent(/^2Ignoradas$/)
    expect(screen.getByText("Rejeitadas", { selector: "p" }).parentElement).toHaveTextContent(/^2Rejeitadas$/)
    expect(within(screen.getByRole("region", { name: "Contas criadas" })).getByText("XC - Carteira")).toBeInTheDocument()

    const porAba = within(screen.getByRole("region", { name: "Totais por aba" }))
    expect(porAba.getAllByRole("row").map((linha) => linha.textContent)).toEqual([
      "AbaGravadasIgnoradasRejeitadas",
      "Receitas e Despesas5521",
      "Transferências901",
    ])
    expect(screen.getByRole("link", { name: "Revisar sugeridas" })).toHaveAttribute(
      "href",
      `/transacoes?import_batch=${LOTE}&suggested_category=true`,
    )
    expect(toast.success).toHaveBeenCalledWith("Importação concluída!")
  })

  it("as rejeitadas aparecem como \"<aba>, linha <n>: <motivo>\"", async () => {
    responder(resultado())

    await importar()

    const rejeitadas = within(await screen.findByRole("region", { name: "Linhas rejeitadas" }))
    expect(rejeitadas.getAllByRole("listitem").map((item) => item.textContent)).toEqual([
      "Receitas e Despesas, linha 3: Data inválida",
      "Transferências, linha 7: Valor inválido",
    ])
  })

  it("com contas criadas, o uso do plano é relido", async () => {
    responder(resultado())

    await importar()

    await screen.findByText("Importação concluída")
    await waitFor(() => expect(auth.refreshUser).toHaveBeenCalledTimes(1))
  })

  it("sem contas criadas, o uso do plano não é relido", async () => {
    responder(resultado({ accounts_created: [] }))

    await importar()

    await screen.findByText("Importação concluída")
    expect(screen.queryByRole("region", { name: "Contas criadas" })).not.toBeInTheDocument()
    expect(auth.refreshUser).not.toHaveBeenCalled()
  })

  it("o 403 do limite de contas aparece pelo tratarErro e a revisão continua", async () => {
    responder({
      erro: {
        response: {
          status: 403,
          data: { detail: "Você atingiu o limite do seu plano.", code: "plan_limit_reached", feature: "limite_contas", limit: 2 },
        },
      },
    })

    await importar()

    await waitFor(() => expect(toast.error).toHaveBeenCalled())
    expect(vi.mocked(toast.error).mock.calls[0][0]).toBe("Você atingiu o limite do seu plano.")
    expect(screen.queryByText("Importação concluída")).not.toBeInTheDocument()
    expect(screen.getByRole("region", { name: "Resumo da análise" })).toBeInTheDocument()
  })
})
