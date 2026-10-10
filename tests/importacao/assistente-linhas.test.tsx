import { render, screen, waitFor, within } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import { beforeEach, describe, expect, it, vi } from "vitest"

import { AssistenteDePlanilha } from "@/components/importacao/AssistenteDePlanilha"
import { api } from "@/services/apiClient"
import type { AnaliseDeImportacao, PlanoDeImportacao } from "@/types/importacao"

import { analiseMobills, linha, resumo } from "./dados-do-assistente"

// IMPCOMP-41: a tabela paginada com os filtros Todas, Rejeitadas, Repetidas e
// Excluídas e a busca. IMPCOMP-42: corrigir, excluir ou restaurar uma linha
// vai no plano, e a linha reanalisada aparece.

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
vi.mock("@/contexts/auth-context", () => ({ useAuth: () => ({ user: null, isLoading: false }) }))

const get = vi.mocked(api.get)
const post = vi.mocked(api.post)

const REJEITADA = "Receitas e Despesas:3"
const VALIDA = "Receitas e Despesas:2"

function ultimoPlanoEnviado(): PlanoDeImportacao {
  const chamadas = post.mock.calls
  return JSON.parse((chamadas[chamadas.length - 1][1] as FormData).get("plano") as string)
}

function chavesNaTabela(): string[] {
  return screen.getAllByTestId(/^linha-/).map((linha) => linha.getAttribute("data-testid")!.replace("linha-", ""))
}

function comLinhas(analise: AnaliseDeImportacao, trocas: Parameters<typeof linha>[1][]): AnaliseDeImportacao {
  return { ...analise, linhas: analise.linhas.map((atual, i) => (trocas[i] ? { ...atual, ...trocas[i] } : atual)) }
}

async function abrirLinhas() {
  const usuario = userEvent.setup({ applyAccept: false })
  render(<AssistenteDePlanilha open onOpenChange={vi.fn()} />)
  await usuario.upload(screen.getByLabelText("Arquivo da planilha"), new File(["x"], "mobills.xlsx"))
  await screen.findByRole("region", { name: "Resumo da análise" })
  await usuario.click(screen.getByRole("button", { name: "Linhas" }))
  return usuario
}

describe("Assistente de planilha: linhas", { timeout: 20_000 }, () => {
  beforeEach(() => {
    vi.clearAllMocks()
    get.mockResolvedValue({ data: [] })
    post.mockResolvedValue({ data: analiseMobills() })
  })

  it("mostra as colunas da linha e o filtro Rejeitadas mostra só as rejeitadas, com o motivo", async () => {
    const usuario = await abrirLinhas()

    expect(chavesNaTabela()).toEqual([VALIDA, REJEITADA, "Receitas e Despesas:4", "Transferências:2"])
    const valida = within(screen.getByTestId(`linha-${VALIDA}`))
    for (const texto of ["Receitas e Despesas", "01/02/2026", "Lançamento 2", "Nubank", "Despesa", "Mercado", "Efetivada", "Válida"]) {
      expect(valida.getByText(texto)).toBeInTheDocument()
    }
    expect(valida.getByText(/R\$\s45,00/)).toBeInTheDocument()
    expect(within(screen.getByTestId("linha-Transferências:2")).getByText("Nubank → XC - Carteira")).toBeInTheDocument()

    await usuario.click(screen.getByRole("button", { name: "Rejeitadas" }))

    expect(screen.getByRole("button", { name: "Rejeitadas" })).toHaveAttribute("aria-pressed", "true")
    expect(chavesNaTabela()).toEqual([REJEITADA])
    const rejeitada = within(screen.getByTestId(`linha-${REJEITADA}`))
    expect(rejeitada.getByText("Data inválida")).toBeInTheDocument()
    expect(rejeitada.getByText("31/02/2026")).toBeInTheDocument()
    expect(rejeitada.getByText("-45,00")).toBeInTheDocument()

    await usuario.click(screen.getByRole("button", { name: "Repetidas" }))
    expect(chavesNaTabela()).toEqual(["Receitas e Despesas:4"])
    await usuario.click(screen.getByRole("button", { name: "Excluídas" }))
    expect(screen.getByText("Nenhuma linha neste filtro.")).toBeInTheDocument()
  })

  it("corrigir a data manda a correção no plano e mostra a linha reanalisada", async () => {
    const usuario = await abrirLinhas()
    const reanalisada = comLinhas(analiseMobills(), [
      undefined,
      { estado: "VALIDA", motivo: null, data: "2026-02-28", valor: "45.00", tipo: "EXPENSE", situacao: "COMPLETED" },
    ])
    post.mockResolvedValue({ data: { ...reanalisada, plano: { ...reanalisada.plano, linhas: { [REJEITADA]: { data: "28/02/2026" } } } } })

    await usuario.click(screen.getByRole("button", { name: `Editar linha ${REJEITADA}` }))
    const data = screen.getByRole("textbox", { name: "Data da linha" })
    expect(data).toHaveValue("31/02/2026")
    await usuario.clear(data)
    await usuario.type(data, "28/02/2026")
    await usuario.click(screen.getByRole("button", { name: "Salvar correção" }))

    await waitFor(() => expect(post).toHaveBeenCalledTimes(2))
    // Só o campo corrigido vai no plano
    expect(ultimoPlanoEnviado().linhas).toEqual({ [REJEITADA]: { data: "28/02/2026" } })
    const corrigida = within(screen.getByTestId(`linha-${REJEITADA}`))
    expect(await corrigida.findByText("Válida")).toBeInTheDocument()
    expect(corrigida.getByText("28/02/2026")).toBeInTheDocument()
    expect(corrigida.queryByText("Data inválida")).not.toBeInTheDocument()
  })

  it("corrigir o valor de uma despesa manda o valor com o tipo", async () => {
    const usuario = await abrirLinhas()

    await usuario.click(screen.getByRole("button", { name: `Editar linha ${VALIDA}` }))
    const valor = screen.getByRole("textbox", { name: "Valor da linha" })
    expect(valor).toHaveValue("45,00")
    await usuario.clear(valor)
    await usuario.type(valor, "50,00")
    await usuario.click(screen.getByRole("button", { name: "Salvar correção" }))

    await waitFor(() => expect(post).toHaveBeenCalledTimes(2))
    expect(ultimoPlanoEnviado().linhas).toEqual({ [VALIDA]: { valor: "50,00", tipo: "Despesa" } })
  })

  it("excluir manda excluir: true e restaurar tira a chave do plano", async () => {
    const usuario = await abrirLinhas()
    const excluida = comLinhas(analiseMobills(), [{ estado: "EXCLUIDA" }])
    post.mockResolvedValue({
      data: { ...excluida, plano: { ...excluida.plano, linhas: { [VALIDA]: { excluir: true } } }, resumo: resumo({ excluidas: 1 }) },
    })

    await usuario.click(screen.getByRole("button", { name: `Excluir linha ${VALIDA}` }))

    await waitFor(() => expect(post).toHaveBeenCalledTimes(2))
    expect(ultimoPlanoEnviado().linhas).toEqual({ [VALIDA]: { excluir: true } })
    expect(await within(screen.getByTestId(`linha-${VALIDA}`)).findByText("Excluída")).toBeInTheDocument()
    await usuario.click(screen.getByRole("button", { name: "Excluídas" }))
    expect(chavesNaTabela()).toEqual([VALIDA])

    post.mockResolvedValue({ data: analiseMobills() })
    await usuario.click(screen.getByRole("button", { name: `Restaurar linha ${VALIDA}` }))

    await waitFor(() => expect(post).toHaveBeenCalledTimes(3))
    expect(ultimoPlanoEnviado().linhas).toEqual({})
    await waitFor(() => expect(screen.getByText("Nenhuma linha neste filtro.")).toBeInTheDocument())
  })

  it("a tabela vai de 20 em 20 linhas e a busca filtra", async () => {
    const muitas = Array.from({ length: 45 }, (_, i) => linha(i + 2))
    post.mockResolvedValue({ data: { ...analiseMobills(), linhas: muitas } })
    const usuario = await abrirLinhas()

    expect(chavesNaTabela()).toHaveLength(20)
    expect(screen.getByText("45 linhas")).toBeInTheDocument()
    expect(screen.getByText("1 de 3")).toBeInTheDocument()
    await usuario.click(screen.getByRole("button", { name: /próx/i }))
    await usuario.click(screen.getByRole("button", { name: /próx/i }))
    expect(chavesNaTabela()).toEqual(muitas.slice(40).map(({ chave }) => chave))

    await usuario.type(screen.getByRole("textbox", { name: "Buscar nas linhas" }), "lancamento 17")

    expect(chavesNaTabela()).toEqual(["Receitas e Despesas:17"])
    expect(screen.getByText("1 de 1")).toBeInTheDocument()
  })
})
