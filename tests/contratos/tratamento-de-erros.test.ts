import { AxiosError, CanceledError, type AxiosResponse } from "axios"
import { toast } from "sonner"
import { beforeEach, describe, expect, it, vi } from "vitest"

import { tratarErro } from "@/lib/erros"
import { api } from "@/services/apiClient"
import { importExportService } from "@/services/import-export"

// CONTRATO-30, CONTRATO-31, CONTRATO-33 e CONTRATO-34 (AD-042): erro de campo
// no campo, detail no Sonner, rede/5xx/tempo esgotado com "Tentar de novo".

vi.mock("sonner", () => ({ toast: { success: vi.fn(), error: vi.fn() } }))

const erro = vi.mocked(toast.error)

function erroHttp(status: number, data: unknown) {
  const response = { data, status, statusText: "", headers: {}, config: {} } as AxiosResponse
  return new AxiosError("erro", AxiosError.ERR_BAD_REQUEST, undefined, null, response)
}

describe("tratarErro", () => {
  beforeEach(() => {
    erro.mockReset()
  })

  it("erro 400 por campo vai para cada campo do formulário; o que sobra vai para o Sonner", () => {
    const form = { setError: vi.fn() }

    tratarErro(
      erroHttp(400, {
        name: ["Este campo é obrigatório."],
        amount: ["O valor deve ser maior que zero."],
        account_id: ["Conta inválida."],
        non_field_errors: ["Período fechado."],
      }),
      { form, campos: ["name", "amount"] },
    )

    expect(form.setError.mock.calls).toEqual([
      ["name", { type: "server", message: "Este campo é obrigatório." }],
      ["amount", { type: "server", message: "O valor deve ser maior que zero." }],
    ])
    expect(erro).toHaveBeenCalledTimes(1)
    expect(erro).toHaveBeenCalledWith("Conta inválida. Período fechado.")
  })

  it("leva o erro da API para o campo com outro nome no formulário, inclusive aninhado", () => {
    const form = { setError: vi.fn() }

    tratarErro(
      erroHttp(400, {
        category: ["Já existe um orçamento para esta categoria neste mês."],
        preferences: { theme: ['"roxo" não é um escolha válida.'] },
      }),
      { form, campos: { category: "category_id", "preferences.theme": "theme" } },
    )

    expect(form.setError.mock.calls).toEqual([
      ["category_id", { type: "server", message: "Já existe um orçamento para esta categoria neste mês." }],
      ["theme", { type: "server", message: '"roxo" não é um escolha válida.' }],
    ])
    expect(erro).not.toHaveBeenCalled()
  })

  it("mostra o detail no Sonner, inclusive o do 403", () => {
    tratarErro(erroHttp(404, { detail: "Não encontrado.", code: "not_found" }))
    tratarErro(erroHttp(403, { detail: "Recurso disponível no plano Premium.", code: "permission_denied" }))

    expect(erro.mock.calls).toEqual([["Não encontrado."], ["Recurso disponível no plano Premium."]])
  })

  it("403 por campo vai para o campo do formulário, sem toast (ADMIN-18)", () => {
    const form = { setError: vi.fn() }

    tratarErro(erroHttp(403, { admin_password: ["Senha do administrador incorreta."] }), {
      form,
      campos: ["admin_password"],
    })

    expect(form.setError.mock.calls).toEqual([
      ["admin_password", { type: "server", message: "Senha do administrador incorreta." }],
    ])
    expect(erro).not.toHaveBeenCalled()
  })

  it("403 com detail e erros de campo juntos mostra o detail no Sonner", () => {
    const form = { setError: vi.fn() }

    tratarErro(
      erroHttp(403, { detail: "Você não tem permissão.", admin_password: ["Senha do administrador incorreta."] }),
      { form, campos: ["admin_password"] },
    )

    expect(form.setError).not.toHaveBeenCalled()
    expect(erro.mock.calls).toEqual([["Você não tem permissão."]])
  })

  it.each([
    ["erro de rede", () => new AxiosError("Network Error", AxiosError.ERR_NETWORK)],
    ["503", () => erroHttp(503, { detail: "Service Unavailable" })],
    ["tempo esgotado", () => new AxiosError("timeout of 30000ms exceeded", AxiosError.ECONNABORTED)],
  ])('%s mostra "Não foi possível falar com o servidor." com "Tentar de novo"', (_nome, criar) => {
    const tentarDeNovo = vi.fn()

    tratarErro(criar(), { tentarDeNovo })

    expect(erro).toHaveBeenCalledTimes(1)
    const [mensagem, opcoes] = erro.mock.calls[0] as [string, { action: { label: string; onClick: () => void } }]
    expect(mensagem).toBe("Não foi possível falar com o servidor.")
    expect(opcoes.action.label).toBe("Tentar de novo")
    expect(tentarDeNovo).not.toHaveBeenCalled()
    opcoes.action.onClick()
    expect(tentarDeNovo).toHaveBeenCalledTimes(1)
  })

  it("uma requisição cancelada não mostra erro (CONTRATO-07)", () => {
    tratarErro(new CanceledError())

    expect(erro).not.toHaveBeenCalled()
  })

  it("400 sem campo nem detail mostra a mensagem padrão", () => {
    tratarErro(erroHttp(400, {}), { mensagemPadrao: "Erro ao salvar a tag." })

    expect(erro).toHaveBeenCalledWith("Erro ao salvar a tag.")
  })
})

describe("Tempo máximo das requisições (CONTRATO-34)", () => {
  it("as requisições comuns têm 30 segundos", () => {
    expect(api.defaults.timeout).toBe(30_000)
  })

  it("importação e exportação usam 120 segundos", async () => {
    const post = vi.spyOn(api, "post").mockResolvedValue({ data: {} })
    const get = vi.spyOn(api, "get").mockResolvedValue({ data: new Blob() })
    const arquivo = new File(["x"], "extrato.ofx")
    const mapa = { date_column: "data", description_column: "descricao", amount_column: "valor" }

    await importExportService.importOFX(arquivo, "conta-1")
    await importExportService.preflightSpreadsheet(arquivo, mapa, "INCOME_EXPENSE")
    await importExportService.importSpreadsheet(arquivo, "conta-1", mapa)
    const filtros = { startDate: undefined, endDate: undefined, type: "ALL", categoryIds: [], accountId: "ALL" }
    await importExportService.exportTransactionsPDF(filtros)
    await importExportService.exportTransactionsXLS(filtros)

    const tempos = [...post.mock.calls, ...get.mock.calls].map((chamada) => (chamada.at(-1) as { timeout?: number }).timeout)
    expect(tempos).toEqual([120_000, 120_000, 120_000, 120_000, 120_000])
    post.mockRestore()
    get.mockRestore()
  })
})
