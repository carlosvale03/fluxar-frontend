import { readdirSync, readFileSync, statSync } from "node:fs"
import path from "node:path"

import { render, screen } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import { AxiosError } from "axios"
import { toast } from "sonner"
import { beforeEach, describe, expect, it, vi } from "vitest"

import AdminSettingsPage from "@/app/(admin)/admin/configuracoes/page"
import BudgetsPage from "@/app/(app)/orcamentos/page"
import TagsPage from "@/app/(app)/tags/page"
import { TagSelector } from "@/components/tags/TagSelector"
import { api } from "@/services/apiClient"

// CONTRATO-01: coleções vêm completas, como array. CONTRATO-02 e
// CONTRATO-05: os logs do admin vêm paginados, com total e controles.

vi.mock("@/services/apiClient", async (importOriginal) => ({
  ...(await importOriginal<typeof import("@/services/apiClient")>()),
  api: { get: vi.fn(), post: vi.fn(), delete: vi.fn() },
}))

vi.mock("sonner", () => ({ toast: { success: vi.fn(), error: vi.fn(), warning: vi.fn() } }))

// PERM-18: o acesso do /auth/me com tudo liberado e sem limite
vi.mock("@/hooks/use-plan", () => ({
  usePlan: () => ({ podeUsar: () => true, limite: () => ({ limit: null, used: 0 }), limiteAtingido: () => false }),
}))

const get = vi.mocked(api.get)

const TAGS = Array.from({ length: 15 }, (_, i) => ({
  id: `tag-${i + 1}`,
  name: `Tag ${String(i + 1).padStart(2, "0")}`,
  color: "#6366f1",
}))

const hoje = new Date()
const ORCAMENTOS = Array.from({ length: 12 }, (_, i) => ({
  id: `orc-${i + 1}`,
  category: `cat-${i + 1}`,
  category_detail: { id: `cat-${i + 1}`, name: `Categoria ${String(i + 1).padStart(2, "0")}`, color: "#10b981", icon: "Tag", type: "EXPENSE" },
  amount_limit: "500.00",
  month: hoje.getMonth() + 1,
  year: hoje.getFullYear(),
  total_spent: "100.00",
  percentage_used: 20,
  status: "SAFE",
}))

function log(n: number) {
  return {
    id: `log-${n}`,
    action: "CHANGE_PLAN",
    description: `Ação ${n}`,
    admin_id: "a1",
    admin_email: "a***@x.com",
    user_id: "u1",
    user_email: "u***@x.com",
    before: "COMMON",
    after: "PREMIUM",
    timestamp: "2026-10-01T12:00:00Z",
  }
}

function paginaDeLogs(pagina: number) {
  const inicio = (pagina - 1) * 20
  return {
    count: 25,
    total_pages: 2,
    current_page: pagina,
    next: pagina === 1 ? "/api/admin/logs/?page=2" : null,
    previous: pagina === 2 ? "/api/admin/logs/?page=1" : null,
    results: Array.from({ length: Math.min(20, 25 - inicio) }, (_, i) => log(inicio + i + 1)),
  }
}

function respostas(url: string, config?: { params?: { page?: number } }) {
  if (url === "/admin/logs/") return Promise.resolve({ data: paginaDeLogs(config?.params?.page ?? 1) })
  const dados: Record<string, unknown> = {
    "/tags/": TAGS,
    "/budgets/": ORCAMENTOS,
    "/admin/stats/": {
      total_users: 1,
      users_by_plan: { COMMON: 1, PREMIUM: 0, PREMIUM_PLUS: 0 },
      paid_users_percentage: "0.0",
      recent_users: [],
      health: { api: "ok", database: { status: "ok", latency_ms: 1, version: "16.4" } },
      version: "1",
    },
    "/admin/settings/": {},
  }
  return Promise.resolve({ data: dados[url] ?? [] })
}

function arquivos(pasta: string): string[] {
  return readdirSync(pasta).flatMap((nome) => {
    const caminho = path.join(pasta, nome)
    return statSync(caminho).isDirectory() ? arquivos(caminho) : [caminho]
  })
}

describe("Coleções completas e listas do admin", () => {
  beforeEach(() => {
    get.mockReset()
    get.mockImplementation(respostas as typeof api.get)
    vi.mocked(toast.error).mockReset()
  })

  it("a tela de tags mostra as 15 tags", async () => {
    render(<TagsPage />)

    expect(await screen.findByText("Tag 01")).toBeInTheDocument()
    // A tela mostra 12 por página, do total de 15
    const rodape = screen.getByText((_, el) => el?.textContent?.replace(/\s+/g, " ").trim() === "Mostrando 1 a 12 de 15 tags")
    expect(rodape).toBeInTheDocument()
    await userEvent.click(screen.getByRole("button", { name: "02" }))
    for (const nome of ["Tag 13", "Tag 14", "Tag 15"]) expect(screen.getByText(nome)).toBeInTheDocument()
  })

  it("o seletor de tags conhece as 15 tags", async () => {
    render(<TagSelector selectedTagIds={TAGS.map((t) => t.id)} onChange={vi.fn()} />)

    for (const tag of TAGS) expect(await screen.findByText(tag.name)).toBeInTheDocument()
  })

  it("a tela de orçamentos mostra os 12 orçamentos", async () => {
    render(<BudgetsPage />)

    expect(await screen.findByText("12 orçamentos definidos")).toBeInTheDocument()
    for (const orcamento of ORCAMENTOS) expect(screen.getAllByText(orcamento.category_detail.name).length).toBeGreaterThan(0)
  })

  it("a lista de logs do admin mostra o total e os controles de página", async () => {
    render(<AdminSettingsPage />)
    await userEvent.click(screen.getByText("Logs"))

    expect(await screen.findByText("Ação 1")).toBeInTheDocument()
    // No selo do cabeçalho e no rodapé com os controles
    expect(screen.getAllByText("25 registros")).toHaveLength(2)
    expect(screen.getByText("1 de 2")).toBeInTheDocument()

    await userEvent.click(screen.getByRole("button", { name: /próx/i }))

    expect(await screen.findByText("Ação 25")).toBeInTheDocument()
    expect(screen.queryByText("Ação 1")).not.toBeInTheDocument()
    expect(screen.getByText("2 de 2")).toBeInTheDocument()
    expect(get).toHaveBeenCalledWith("/admin/logs/", { params: { page: 2 } })
  })

  it('erro ao carregar as tags mostra o aviso com "Tentar de novo", que busca de novo', async () => {
    get.mockImplementation(((url: string) =>
      url === "/tags/"
        ? Promise.reject(new AxiosError("Network Error", AxiosError.ERR_NETWORK))
        : respostas(url)) as typeof api.get)
    render(<TagsPage />)

    await vi.waitFor(() => expect(toast.error).toHaveBeenCalled())
    const [mensagem, opcoes] = vi.mocked(toast.error).mock.calls[0] as [string, { action: { label: string; onClick: () => void } }]
    expect(mensagem).toBe("Não foi possível falar com o servidor.")
    expect(opcoes.action.label).toBe("Tentar de novo")

    get.mockImplementation(respostas as typeof api.get)
    opcoes.action.onClick()
    expect(await screen.findByText("Tag 01")).toBeInTheDocument()
  })

  it("nenhum arquivo de src lê `results ||`", () => {
    const fontes = arquivos(path.resolve(__dirname, "../../src")).filter((f) => /\.tsx?$/.test(f))
    const comResultsOu = fontes.filter((f) => /results \|\|/.test(readFileSync(f, "utf-8")))

    expect(comResultsOu).toEqual([])
  })
})
