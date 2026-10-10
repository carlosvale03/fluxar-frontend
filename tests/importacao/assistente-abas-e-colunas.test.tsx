import { render, screen, waitFor, within } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import { beforeEach, describe, expect, it, vi } from "vitest"

import { AssistenteDePlanilha } from "@/components/importacao/AssistenteDePlanilha"
import { api } from "@/services/apiClient"
import type { PlanoDeImportacao } from "@/types/importacao"

import { analiseMobills, CONTIDA } from "./dados-do-assistente"

// IMPCOMP-38: o papel e as colunas de cada aba já preenchidos, com os
// cabeçalhos reais como opções, o selo do Mobills e o motivo das ignoradas.
// IMPCOMP-44: mudar o papel ou as colunas pede uma nova análise com o plano
// editado.

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

// O Select do Radix usa APIs que o jsdom não tem
Element.prototype.hasPointerCapture ??= () => false
Element.prototype.releasePointerCapture ??= () => {}
Element.prototype.scrollIntoView ??= () => {}

const get = vi.mocked(api.get)
const post = vi.mocked(api.post)

function planoEnviado(n: number): PlanoDeImportacao {
  return JSON.parse((post.mock.calls[n][1] as FormData).get("plano") as string)
}

async function abrirRevisao() {
  const usuario = userEvent.setup({ applyAccept: false })
  render(<AssistenteDePlanilha open onOpenChange={vi.fn()} />)
  await usuario.upload(screen.getByLabelText("Arquivo da planilha"), new File(["x"], "mobills.xlsx"))
  await screen.findByRole("region", { name: "Resumo da análise" })
  return usuario
}

async function escolherOpcao(usuario: ReturnType<typeof userEvent.setup>, campo: string, opcao: string) {
  await usuario.click(screen.getByRole("combobox", { name: campo }))
  await usuario.click(await screen.findByRole("option", { name: opcao }))
}

// Os Selects do Radix são lentos sob a carga da suíte inteira
describe("Assistente de planilha: abas e colunas", { timeout: 20_000 }, () => {
  beforeEach(() => {
    vi.clearAllMocks()
    get.mockResolvedValue({ data: [] })
    post.mockResolvedValue({ data: analiseMobills() })
  })

  it("os selects vêm preenchidos com o plano detectado e os cabeçalhos reais como opções", async () => {
    const usuario = await abrirRevisao()

    expect(screen.getByRole("combobox", { name: "Papel da aba Receitas e Despesas" })).toHaveTextContent("Receitas e despesas")
    expect(screen.getByRole("combobox", { name: "Papel da aba Transferências" })).toHaveTextContent("Transferências")
    expect(screen.getByRole("combobox", { name: "Papel da aba Despesas" })).toHaveTextContent("Ignorar")
    expect(screen.getByRole("combobox", { name: "Data da aba Receitas e Despesas" })).toHaveTextContent("Data")
    expect(screen.getByRole("combobox", { name: "Situação da aba Receitas e Despesas" })).toHaveTextContent("Situação")
    expect(screen.getByRole("combobox", { name: "Entrada da aba Receitas e Despesas" })).toHaveTextContent("Nenhuma")
    expect(screen.getByRole("combobox", { name: "Conta de origem da aba Transferências" })).toHaveTextContent("Conta origem")
    // A aba ignorada não mostra colunas
    expect(screen.queryByRole("combobox", { name: "Data da aba Despesas" })).not.toBeInTheDocument()

    await usuario.click(screen.getByRole("combobox", { name: "Conta de destino da aba Transferências" }))
    const opcoes = (await screen.findAllByRole("option")).map((opcao) => opcao.textContent)
    expect(opcoes).toEqual(["Nenhuma", "Data", "Conta origem", "Conta destino", "Valor", "Tags"])
  })

  it("mostra o selo do Mobills e o motivo das abas ignoradas", async () => {
    await abrirRevisao()

    expect(screen.getByText("Modelo Mobills reconhecido")).toBeInTheDocument()
    expect(within(screen.getByRole("region", { name: "Aba Despesas" })).getByText(CONTIDA)).toBeInTheDocument()
    expect(within(screen.getByRole("region", { name: "Aba Receitas" })).getByText(CONTIDA)).toBeInTheDocument()
    expect(within(screen.getByRole("region", { name: "Aba Receitas e Despesas" })).queryByText(/Contida/)).not.toBeInTheDocument()
  })

  it("sem o modelo do Mobills, o selo não aparece", async () => {
    const analise = analiseMobills()
    post.mockResolvedValue({ data: { ...analise, plano: { ...analise.plano, modelo: null } } })

    await abrirRevisao()

    expect(screen.queryByText("Modelo Mobills reconhecido")).not.toBeInTheDocument()
  })

  it("trocar o papel de uma aba pede nova análise com o plano editado", async () => {
    const usuario = await abrirRevisao()

    await escolherOpcao(usuario, "Papel da aba Despesas", "Receitas e despesas")

    expect(screen.getByRole("combobox", { name: "Papel da aba Despesas" })).toHaveTextContent("Receitas e despesas")
    await waitFor(() => expect(post).toHaveBeenCalledTimes(2))
    expect(post.mock.calls[1][0]).toBe("/import/analise/")
    const plano = planoEnviado(1)
    expect(plano.abas?.map(({ nome, papel }) => [nome, papel])).toEqual([
      ["Receitas e Despesas", "RECEITAS_DESPESAS"],
      ["Despesas", "RECEITAS_DESPESAS"],
      ["Receitas", "IGNORAR"],
      ["Transferências", "TRANSFERENCIAS"],
    ])
    // A aba ignorada sem colunas deixa a detecção preencher
    expect(plano.abas?.[1]).toEqual({ nome: "Despesas", papel: "RECEITAS_DESPESAS" })
    expect(plano.contas?.Nubank).toEqual({ acao: "vincular", id: "conta-nubank" })
  })

  it("trocar as colunas manda as colunas editadas na nova análise", async () => {
    const usuario = await abrirRevisao()

    await escolherOpcao(usuario, "Categoria da aba Receitas e Despesas", "Nenhuma")
    await escolherOpcao(usuario, "Tipo da aba Receitas e Despesas", "Subcategoria")

    // Mudanças seguidas podem virar uma análise só; a última leva as duas
    await waitFor(() =>
      expect(post.mock.calls.length > 1 && planoEnviado(post.mock.calls.length - 1).abas?.[0].colunas).toMatchObject({
        category_column: null,
        type_column: "Subcategoria",
        date_column: "Data",
      }),
    )
    // A resposta não desfaz a edição feita na tela
    await waitFor(() => expect(screen.queryByText(/Analisando de novo/)).not.toBeInTheDocument())
    expect(screen.getByRole("combobox", { name: "Categoria da aba Receitas e Despesas" })).toHaveTextContent("Nenhuma")
    expect(screen.getByRole("combobox", { name: "Tipo da aba Receitas e Despesas" })).toHaveTextContent("Subcategoria")
  })
})
