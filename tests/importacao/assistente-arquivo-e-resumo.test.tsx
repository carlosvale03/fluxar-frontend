import { render, screen } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import { toast } from "sonner"
import { beforeEach, describe, expect, it, vi } from "vitest"

import { AssistenteDePlanilha } from "@/components/importacao/AssistenteDePlanilha"
import { FORMATO_NAO_SUPORTADO } from "@/components/transactions/import-dialog"
import { api } from "@/services/apiClient"

import { analiseMobills } from "./dados-do-assistente"

// IMPCOMP-43: escolher o arquivo pede a análise na hora, sem botão de
// avançar. IMPCOMP-37: o resumo fixo no topo com as contagens e os totais.

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

async function escolher(nome = "mobills.xlsx") {
  const usuario = userEvent.setup({ applyAccept: false })
  render(<AssistenteDePlanilha open onOpenChange={vi.fn()} />)
  const arquivo = new File(["conteudo"], nome)
  await usuario.upload(screen.getByLabelText("Arquivo da planilha"), arquivo)
  return { usuario, arquivo }
}

describe("Assistente de planilha: arquivo e resumo", () => {
  beforeEach(() => {
    vi.clearAllMocks()
    get.mockResolvedValue({ data: [] })
  })

  it("escolher o arquivo pede a análise na hora, sem botão de avançar", async () => {
    post.mockResolvedValue({ data: analiseMobills() })

    const { arquivo } = await escolher()

    expect(post).toHaveBeenCalledTimes(1)
    const [url, dados] = post.mock.calls[0]
    expect(url).toBe("/import/analise/")
    expect((dados as FormData).get("file")).toBe(arquivo)
    expect((dados as FormData).has("plano")).toBe(false)
    expect(await screen.findByRole("region", { name: "Resumo da análise" })).toBeInTheDocument()
    expect(screen.queryByRole("button", { name: /próximo|avançar/i })).not.toBeInTheDocument()
    for (const aba of ["Abas e colunas", "Contas", "Linhas"]) {
      expect(screen.getByRole("button", { name: aba })).toBeInTheDocument()
    }
  })

  it("o resumo mostra válidas, rejeitadas, repetidas, excluídas, contas novas e os totais por tipo", async () => {
    post.mockResolvedValue({ data: analiseMobills() })

    await escolher()

    await screen.findByRole("region", { name: "Resumo da análise" })
    expect(screen.getByTestId("resumo-Válidas")).toHaveTextContent(/^64Válidas$/)
    expect(screen.getByTestId("resumo-Rejeitadas")).toHaveTextContent(/^1Rejeitadas$/)
    expect(screen.getByTestId("resumo-Repetidas")).toHaveTextContent(/^2Repetidas$/)
    expect(screen.getByTestId("resumo-Excluídas")).toHaveTextContent(/^0Excluídas$/)
    expect(screen.getByTestId("resumo-Contas novas")).toHaveTextContent(/^1Contas novas$/)
    expect(screen.getByTestId("resumo-Receitas")).toHaveTextContent(/^Receitas \(20\)R\$\s8\.500,00$/)
    expect(screen.getByTestId("resumo-Despesas")).toHaveTextContent(/^Despesas \(37\)R\$\s4\.321,09$/)
    expect(screen.getByTestId("resumo-Transferências")).toHaveTextContent(/^Transferências \(9\)R\$\s1\.500,50$/)
  })

  it("um 400 da análise aparece pelo tratarErro e o assistente continua no arquivo", async () => {
    post.mockRejectedValue({ response: { status: 400, data: { file: ["O arquivo passa do limite de 10.000 linhas."] } } })

    await escolher()

    expect(toast.error).toHaveBeenCalledWith("O arquivo passa do limite de 10.000 linhas.")
    expect(screen.queryByRole("region", { name: "Resumo da análise" })).not.toBeInTheDocument()
    expect(screen.getByLabelText("Arquivo da planilha")).toBeEnabled()
  })

  it("um arquivo fora de .csv e .xlsx é recusado sem chamar a análise", async () => {
    await escolher("extrato.xls")

    expect(toast.error).toHaveBeenCalledWith(FORMATO_NAO_SUPORTADO)
    expect(post).not.toHaveBeenCalled()
  })
})
