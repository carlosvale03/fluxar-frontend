import { render, screen, within } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import { beforeEach, describe, expect, it, vi } from "vitest"

import ImportExportPage from "@/app/(app)/importar/page"
import TransactionsPage from "@/app/(app)/transacoes/page"
import type { User } from "@/contexts/auth-context"
import { api } from "@/services/apiClient"
import { paramsDaExportacao } from "@/services/import-export"

import { usuario } from "../permissoes/acesso"

// CLASSE-33: a lista abre com o classId e o período da URL. CLASSE-34 e
// CLASSE-35: o filtro escolhe várias classes e "Sem classe", enviadas como
// classId repetido. CLASSE-39: a exportação envia as mesmas classes.

process.env.TZ = "America/Sao_Paulo"

const url = vi.hoisted(() => ({ parametros: new URLSearchParams() }))
const auth = vi.hoisted(() => ({ user: null as User | null }))
const estadoDoAuth = () => ({ user: auth.user, isLoading: false })

vi.mock("@/contexts/auth-context", () => ({ useAuth: () => estadoDoAuth() }))
vi.mock("@/hooks/use-auth", () => ({ useAuth: () => estadoDoAuth() }))
vi.mock("@/services/apiClient", async (importOriginal) => ({
  ...(await importOriginal<typeof import("@/services/apiClient")>()),
  api: { get: vi.fn(), post: vi.fn(), patch: vi.fn() },
}))
vi.mock("sonner", () => ({ toast: Object.assign(vi.fn(), { success: vi.fn(), error: vi.fn(), info: vi.fn() }) }))
vi.mock("next/navigation", () => ({
  useSearchParams: () => url.parametros,
  useRouter: () => ({ push: vi.fn(), replace: vi.fn() }),
  usePathname: () => "/transacoes",
}))

const get = vi.mocked(api.get)

const CLASSES = [
  { id: "ess", name: "Essencial", color: "#16A34A", is_default: true, categories_count: 4 },
  { id: "dis", name: "Dispensável", color: "#F97316", is_default: true, categories_count: 5 },
]

const PAGINA = {
  count: 1,
  total_pages: 1,
  current_page: 1,
  next: null,
  previous: null,
  results: [
    { id: "t1", description: "Padaria", amount: "10.00", date: "2026-09-10", type: "EXPENSE", status: "COMPLETED", account: "c1", account_name: "Banco", tags: [] },
  ],
  day_totals: {},
}

function servidor(endereco: string) {
  if (endereco.startsWith("/transactions/")) return Promise.resolve({ data: PAGINA })
  if (endereco === "/expense-classes/") return Promise.resolve({ data: CLASSES })
  if (endereco.startsWith("/export/")) return Promise.resolve({ data: new Blob(["x"]) })
  return Promise.resolve({ data: [] })
}

const ultimaBusca = () =>
  new URL(String(get.mock.calls.filter(([e]) => String(e).startsWith("/transactions/")).at(-1)![0]), "http://x").searchParams

async function escolherClasses(nomes: string[]) {
  await userEvent.click(screen.getByRole("button", { name: /refinar seleção/i }))
  const painel = await screen.findByRole("dialog")
  for (const nome of nomes) {
    await userEvent.click(await within(painel).findByRole("checkbox", { name: `Classe ${nome}` }))
  }
  await userEvent.click(within(painel).getByRole("button", { name: /aplicar filtros/i }))
}

beforeEach(() => {
  vi.clearAllMocks()
  url.parametros = new URLSearchParams()
  auth.user = usuario()
  get.mockImplementation(servidor as typeof api.get)
  URL.createObjectURL = vi.fn(() => "blob:x")
  URL.revokeObjectURL = vi.fn()
})

describe("Filtro de classe na lista de transações", () => {
  it("abrir /transacoes?classId=<id>&startDate=&endDate= já filtra pela classe e pelo período", async () => {
    url.parametros = new URLSearchParams("classId=ess&startDate=2026-09-01&endDate=2026-09-30")
    render(<TransactionsPage />)
    await screen.findAllByText("Padaria")

    const busca = ultimaBusca()
    expect(busca.getAll("classId")).toEqual(["ess"])
    expect(busca.get("startDate")).toBe("2026-09-01")
    expect(busca.get("endDate")).toBe("2026-09-30")
  })

  it("o clique em 'Sem classe' chega à API como classId=sem_classe", async () => {
    url.parametros = new URLSearchParams("classId=sem_classe&startDate=2026-09-01&endDate=2026-09-30")
    render(<TransactionsPage />)
    await screen.findAllByText("Padaria")

    expect(ultimaBusca().getAll("classId")).toEqual(["sem_classe"])
  })

  it("escolher duas classes e 'Sem classe' envia três classId", async () => {
    render(<TransactionsPage />)
    await screen.findAllByText("Padaria")
    expect(ultimaBusca().getAll("classId")).toEqual([])

    await escolherClasses(["Essencial", "Dispensável", "Sem classe"])

    await vi.waitFor(() => expect(ultimaBusca().getAll("classId")).toEqual(["ess", "dis", "sem_classe"]))
    expect(ultimaBusca().get("page")).toBe("1")
  })
})

describe("Filtro de classe na exportação", () => {
  it("a exportação em XLS e em PDF envia as classes escolhidas", async () => {
    render(<ImportExportPage />)
    await userEvent.click(screen.getByRole("button", { name: /Exportar/ }))
    await escolherClasses(["Dispensável", "Sem classe"])

    await userEvent.click(screen.getByRole("button", { name: "Gerar XLS" }))
    await userEvent.click(screen.getByRole("button", { name: "Gerar PDF" }))

    const exportacoes = get.mock.calls.filter(([e]) => String(e).startsWith("/export/transactions/"))
    expect(exportacoes.map(([e]) => e)).toEqual(["/export/transactions/xls/", "/export/transactions/pdf/"])
    for (const [, config] of exportacoes) {
      const params = (config as { params: URLSearchParams }).params
      expect(params.getAll("classId")).toEqual(["dis", "sem_classe"])
    }
  })

  it("paramsDaExportacao repete classId e não envia nada sem classes", () => {
    const base = { startDate: undefined, endDate: undefined, type: "ALL", categoryIds: [], accountId: "ALL" }

    expect(paramsDaExportacao({ ...base, classIds: ["ess", "sem_classe"] }).getAll("classId")).toEqual(["ess", "sem_classe"])
    expect(paramsDaExportacao(base).has("classId")).toBe(false)
  })
})
