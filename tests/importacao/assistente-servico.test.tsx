import { beforeEach, describe, expect, it, vi } from "vitest"

import { api } from "@/services/apiClient"
import { analisarArquivo, importarArquivo, TEMPO_MAXIMO_ARQUIVOS_MS } from "@/services/import-export"
import { AccountType } from "@/types/accounts"
import type { PlanoDeImportacao, ResultadoDaImportacao } from "@/types/importacao"

// IMPCOMP-13 e IMPCOMP-45 (AD-055): a análise e a importação mandam o arquivo
// e o plano em JSON no multipart, com o tempo de 120 s dos arquivos.

vi.mock("@/services/apiClient", async (importOriginal) => ({
  ...(await importOriginal<typeof import("@/services/apiClient")>()),
  api: { get: vi.fn(), post: vi.fn() },
}))

const post = vi.mocked(api.post)

function enviado(n = 0): { url: string; dados: FormData; config: { timeout?: number } } {
  const [url, dados, config] = post.mock.calls[n]
  return { url, dados: dados as FormData, config: config as { timeout?: number } }
}

describe("Serviço da importação completa", () => {
  beforeEach(() => vi.clearAllMocks())

  it("a análise sem plano manda só o arquivo para /import/analise/", async () => {
    post.mockResolvedValue({ data: { plano: {}, linhas: [], resumo: {} } })
    const arquivo = new File(["x"], "mobills.xlsx")

    await analisarArquivo(arquivo)

    const { url, dados, config } = enviado()
    expect(url).toBe("/import/analise/")
    expect(dados.get("file")).toBe(arquivo)
    expect(dados.has("plano")).toBe(false)
    expect(config.timeout).toBe(TEMPO_MAXIMO_ARQUIVOS_MS)
  })

  it("a análise com plano manda o plano em JSON, sem os campos que só a análise devolve", async () => {
    post.mockResolvedValue({ data: { plano: {}, linhas: [], resumo: {} } })
    const plano: PlanoDeImportacao = {
      modelo: "MOBILLS",
      abas: [
        {
          nome: "Despesas",
          papel: "IGNORAR",
          motivo: "Contida na aba Receitas e Despesas",
          cabecalho: ["Data", "Valor"],
        },
      ],
      contas: {
        Nubank: {
          acao: "vincular",
          id: "conta-1",
          arquivo: { quantidade: 3, soma: "-10.00", primeira_data: null, ultima_data: null },
        },
      },
      linhas: { "Receitas e Despesas:4": { data: "01/02/2026" } },
    }

    await analisarArquivo(new File(["x"], "mobills.xlsx"), plano)

    expect(JSON.parse(enviado().dados.get("plano") as string)).toEqual({
      abas: [{ nome: "Despesas", papel: "IGNORAR" }],
      contas: { Nubank: { acao: "vincular", id: "conta-1" } },
      linhas: { "Receitas e Despesas:4": { data: "01/02/2026" } },
    })
  })

  it("a importação manda o plano final para /import/ e devolve o resumo", async () => {
    const resultado: ResultadoDaImportacao = {
      total: 66,
      imported: 66,
      ignored: 0,
      rejected: 0,
      suggested: 0,
      batch_id: "lote",
      rejected_rows: [],
      excluded: 0,
      accounts_created: [{ id: "nova", name: "Carteira" }],
      by_sheet: { Transferências: { imported: 9, ignored: 0, rejected: 0 } },
      summary_rows: 2,
    }
    post.mockResolvedValue({ data: resultado })
    const plano: PlanoDeImportacao = {
      contas: {
        Carteira: { acao: "criar", nome: "Carteira", tipo: AccountType.WALLET, saldo_atual: "1234.56" },
      },
    }

    await expect(importarArquivo(new File(["x"], "mobills.xlsx"), plano)).resolves.toEqual(resultado)

    const { url, dados, config } = enviado()
    expect(url).toBe("/import/")
    expect(JSON.parse(dados.get("plano") as string)).toEqual(plano)
    expect(config.timeout).toBe(TEMPO_MAXIMO_ARQUIVOS_MS)
  })
})
