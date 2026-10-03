import { readdirSync, readFileSync, statSync } from "node:fs"
import path from "node:path"

import { render, screen } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import { AxiosError } from "axios"
import { toast } from "sonner"
import { beforeEach, describe, expect, it, vi } from "vitest"

import ReportsPage from "@/app/(app)/relatorios/page"
import { BudgetForm } from "@/components/budgets/BudgetForm"
import { TransactionFormDialog } from "@/components/transactions/transaction-form-dialog"
import { Dialog, DialogContent } from "@/components/ui/dialog"
import { api } from "@/services/apiClient"
import * as orcamentos from "@/services/budgets"
import * as relatorios from "@/services/reports"
import { Budget } from "@/types/budgets"
import { Transaction } from "@/types/transactions"

// CONTRATO-30: o erro de validação aparece no campo do formulário.
// CONTRATO-31: o que não é de campo vai ao Sonner. CONTRATO-33: rede, 5xx ou
// tempo esgotado mostram "Tentar de novo", e nenhum catch fica só no console.

process.env.TZ = "America/Sao_Paulo"

vi.mock("@/services/apiClient", async (importOriginal) => ({
  ...(await importOriginal<typeof import("@/services/apiClient")>()),
  api: { get: vi.fn(), post: vi.fn(), put: vi.fn(), patch: vi.fn() },
}))

vi.mock("@/services/budgets", () => ({ createBudget: vi.fn(), updateBudget: vi.fn() }))
vi.mock("@/services/categories", () => ({
  getCategories: vi.fn().mockResolvedValue([
    { id: "cat-1", name: "Mercado", type: "EXPENSE", color: "#f00", icon: "Tag", subcategories: [] },
  ]),
}))
vi.mock("@/services/reports", () => ({
  getSimpleCharts: vi.fn(),
  getAdvancedCharts: vi.fn(),
  getMonthlyComparison: vi.fn(),
  getDashboardSummary: vi.fn(),
  getTagDistribution: vi.fn(),
}))
vi.mock("@/contexts/auth-context", () => ({ useAuth: () => ({ user: { plan: "PREMIUM_PLUS" } }) }))
vi.mock("next/navigation", () => ({
  useRouter: () => ({ push: vi.fn(), replace: vi.fn() }),
  usePathname: () => "/",
  useSearchParams: () => new URLSearchParams(),
}))
vi.mock("sonner", () => ({ toast: Object.assign(vi.fn(), { success: vi.fn(), error: vi.fn(), info: vi.fn() }) }))

function erro400(dados: unknown) {
  return { response: { status: 400, data: dados } }
}

function arquivos(pasta: string): string[] {
  return readdirSync(pasta).flatMap((nome) => {
    const caminho = path.join(pasta, nome)
    return statSync(caminho).isDirectory() ? arquivos(caminho) : [caminho]
  })
}

// Corpos dos catch de um arquivo, sem comentários
function corposDosCatch(texto: string): string[] {
  const corpos: string[] = []
  const inicio = /catch\s*(\([^)]*\))?\s*\{/g
  let achado: RegExpExecArray | null
  while ((achado = inicio.exec(texto))) {
    let profundidade = 1
    let fim = achado.index + achado[0].length
    while (profundidade && fim < texto.length) {
      if (texto[fim] === "{") profundidade++
      else if (texto[fim] === "}") profundidade--
      fim++
    }
    corpos.push(texto.slice(achado.index + achado[0].length, fim - 1).replace(/\/\/[^\n]*/g, ""))
  }
  return corpos
}

describe("Erros de campo e falhas silenciosas", () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it("orçamento duplicado mostra a mensagem do backend embaixo do campo de categoria", async () => {
    vi.mocked(orcamentos.updateBudget).mockRejectedValue(
      erro400({ category: ["Já existe um orçamento para esta categoria neste mês."] }),
    )
    const orcamento = {
      id: "orc-1",
      category: "cat-1",
      category_detail: { id: "cat-1", name: "Mercado" },
      amount_limit: "500.00",
      month: 10,
      year: 2026,
      total_spent: "0.00",
      percentage_used: 0,
      status: "OK",
    } as Budget
    render(
      <Dialog open>
        <DialogContent>
          <BudgetForm budget={orcamento} onSuccess={vi.fn()} onCancel={vi.fn()} />
        </DialogContent>
      </Dialog>,
    )

    await userEvent.click(screen.getByRole("button", { name: /salvar alterações/i }))

    const mensagem = await screen.findByText("Já existe um orçamento para esta categoria neste mês.")
    // A mensagem fica no item do formulário da categoria, junto do seu rótulo
    expect(mensagem.closest(".space-y-2")).toHaveTextContent(/categoria/i)
    expect(toast.error).not.toHaveBeenCalled()
  })

  it("o erro de campo da transação aparece no campo do valor, e o detail vai ao Sonner", async () => {
    vi.mocked(api.get).mockImplementation(((url: string) =>
      Promise.resolve({
        data: url.startsWith("/categories/")
          ? [{ id: "cat-1", name: "Mercado", type: "EXPENSE", color: "#f00", icon: "Tag", subcategories: [] }]
          : url === "/accounts/"
            ? [{ id: "conta-1", name: "Banco" }]
            : url.startsWith("/transactions/")
              ? { results: [] }
              : [],
      })) as typeof api.get)
    vi.mocked(api.put).mockRejectedValueOnce(erro400({ amount: ["Informe um valor maior que zero."] }))
    const transacao = {
      id: "t1",
      description: "Mercado do mês",
      amount: "10.00",
      date: "2026-10-01",
      type: "EXPENSE",
      category: "cat-1",
      account: "conta-1",
      tags: [],
    } as unknown as Transaction
    render(
      <TransactionFormDialog open onOpenChange={vi.fn()} type="EXPENSE" onSuccess={vi.fn()} initialData={transacao} />,
    )

    await userEvent.click(await screen.findByRole("button", { name: /salvar lançamento/i }))
    const mensagem = await screen.findByText("Informe um valor maior que zero.")
    expect(mensagem.closest(".space-y-2")).toHaveTextContent(/valor total/i)
    expect(toast.error).not.toHaveBeenCalled()

    vi.mocked(api.put).mockRejectedValueOnce({ response: { status: 403, data: { detail: "Sem permissão.", code: "permission_denied" } } })
    await userEvent.click(screen.getByRole("button", { name: /salvar lançamento/i }))
    await vi.waitFor(() => expect(toast.error).toHaveBeenCalledWith("Sem permissão."))
  })

  it('a falha ao carregar os relatórios mostra "Tentar de novo", que busca de novo', async () => {
    const semServidor = new AxiosError("Network Error", AxiosError.ERR_NETWORK)
    vi.mocked(relatorios.getSimpleCharts).mockRejectedValueOnce(semServidor).mockResolvedValue({
      income_vs_expense: [],
      expense_by_category: [],
      income_by_category: [],
    })
    vi.mocked(relatorios.getMonthlyComparison).mockResolvedValue([])
    vi.mocked(relatorios.getDashboardSummary).mockResolvedValue(null as never)
    vi.mocked(relatorios.getTagDistribution).mockResolvedValue({ expense_by_tag: [], income_by_tag: [] } as never)
    render(<ReportsPage />)

    await vi.waitFor(() =>
      expect(toast.error).toHaveBeenCalledWith("Não foi possível falar com o servidor.", {
        action: { label: "Tentar de novo", onClick: expect.any(Function) },
      }),
    )
    const aviso = vi.mocked(toast.error).mock.calls.find(([texto]) => texto === "Não foi possível falar com o servidor.")!
    const opcoes = aviso[1] as unknown as { action: { onClick: () => void } }
    opcoes.action.onClick()

    await vi.waitFor(() => expect(relatorios.getSimpleCharts).toHaveBeenCalledTimes(2))
  })

  it("nenhum catch em src fica só com console.error, e ninguém lê a chave error da API", () => {
    const raiz = path.resolve(__dirname, "../../src")
    // Catches vazios intencionais: o fim local da sessão não depende da
    // resposta (auth-context) e a página de manutenção só tenta de novo
    const vaziosPermitidos = [path.join("contexts", "auth-context.tsx"), path.join("app", "manutencao", "page.tsx")]
    const problemas: string[] = []
    for (const arquivo of arquivos(raiz).filter((a) => /\.(ts|tsx)$/.test(a))) {
      const texto = readFileSync(arquivo, "utf-8")
      const relativo = path.relative(raiz, arquivo)
      for (const corpo of corposDosCatch(texto)) {
        const semConsole = corpo.replace(/console\.\w+\([^;\n]*\)?;?/g, "").trim()
        if (semConsole) continue
        if (!corpo.trim() && vaziosPermitidos.includes(relativo)) continue
        problemas.push(`${relativo}: catch { ${corpo.trim()} }`)
      }
      if (/data\??\.error\b/.test(texto)) problemas.push(`${relativo}: lê .error da resposta`)
    }
    expect(problemas).toEqual([])
  })
})
