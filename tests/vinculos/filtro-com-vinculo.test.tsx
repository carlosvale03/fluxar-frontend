import { render, screen, within } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import { beforeEach, describe, expect, it, vi } from "vitest"

import ImportExportPage from "@/app/(app)/importar/page"
import TransactionsPage from "@/app/(app)/transacoes/page"
import type { User } from "@/contexts/auth-context"
import { api } from "@/services/apiClient"
import { paramsDaExportacao } from "@/services/import-export"

import { usuario } from "../permissoes/acesso"
import { CINEMA, TRANSPORTE_DO_CINEMA } from "./dados"

// VINCULO-30: "Com vínculo" envia linked=true na lista. VINCULO-33: a
// exportação envia o mesmo filtro. VINCULO-31: a lista lê principalId da URL.
// VINCULO-20: com o recurso travado, o filtro aparece travado.

process.env.TZ = "America/Sao_Paulo"

const url = vi.hoisted(() => ({ parametros: new URLSearchParams() }))
const auth = vi.hoisted(() => ({ user: null as User | null }))
const estadoDoAuth = () => ({ user: auth.user, isLoading: false })

vi.mock("@/contexts/auth-context", () => ({ useAuth: () => estadoDoAuth() }))
vi.mock("@/hooks/use-auth", () => ({ useAuth: () => estadoDoAuth() }))
vi.mock("@/services/apiClient", async (importOriginal) => ({
  ...(await importOriginal<typeof import("@/services/apiClient")>()),
  api: { get: vi.fn(), post: vi.fn(), patch: vi.fn(), delete: vi.fn() },
}))
vi.mock("sonner", () => ({ toast: Object.assign(vi.fn(), { success: vi.fn(), error: vi.fn(), info: vi.fn() }) }))
vi.mock("next/navigation", () => ({
  useSearchParams: () => url.parametros,
  useRouter: () => ({ push: vi.fn(), replace: vi.fn() }),
  usePathname: () => "/transacoes",
}))

const get = vi.mocked(api.get)

const PAGINA = { count: 2, total_pages: 1, results: [CINEMA, TRANSPORTE_DO_CINEMA], day_totals: {} }

function servidor(endereco: string) {
  if (endereco.startsWith("/transactions/")) return Promise.resolve({ data: PAGINA })
  if (endereco.startsWith("/export/")) return Promise.resolve({ data: new Blob(["x"]) })
  return Promise.resolve({ data: [] })
}

const ultimaBusca = () =>
  new URL(String(get.mock.calls.filter(([e]) => String(e).startsWith("/transactions/")).at(-1)![0]), "http://x").searchParams

async function abrirFiltros() {
  await userEvent.click(screen.getByRole("button", { name: /refinar seleção/i }))
  return screen.findByRole("dialog")
}

beforeEach(() => {
  vi.clearAllMocks()
  url.parametros = new URLSearchParams()
  auth.user = usuario()
  get.mockImplementation(servidor as typeof api.get)
  URL.createObjectURL = vi.fn(() => "blob:x")
  URL.revokeObjectURL = vi.fn()
})

describe("Filtro com vínculo", { timeout: 15000 }, () => {
  it("marcar \"Com vínculo\" envia linked=true na lista, já na página 1", async () => {
    render(<TransactionsPage />)
    await screen.findAllByText("Cinema")
    expect(ultimaBusca().has("linked")).toBe(false)

    const painel = await abrirFiltros()
    await userEvent.click(within(painel).getByRole("checkbox", { name: "Com vínculo" }))
    await userEvent.click(within(painel).getByRole("button", { name: /aplicar filtros/i }))

    await vi.waitFor(() => expect(ultimaBusca().get("linked")).toBe("true"))
    expect(ultimaBusca().get("page")).toBe("1")

    // Limpar tira o filtro
    const denovo = await abrirFiltros()
    expect(within(denovo).getByRole("checkbox", { name: "Com vínculo" })).toBeChecked()
    await userEvent.click(within(denovo).getByRole("button", { name: /limpar todos os filtros/i }))
    await userEvent.click(within(denovo).getByRole("button", { name: /aplicar filtros/i }))
    await vi.waitFor(() => expect(ultimaBusca().has("linked")).toBe(false))
  })

  it("a exportação em XLS e em PDF envia linked=true", async () => {
    render(<ImportExportPage />)
    await userEvent.click(screen.getByRole("button", { name: /Exportar/ }))
    const painel = await abrirFiltros()
    await userEvent.click(within(painel).getByRole("checkbox", { name: "Com vínculo" }))
    await userEvent.click(within(painel).getByRole("button", { name: /aplicar filtros/i }))

    await userEvent.click(screen.getByRole("button", { name: "Gerar XLS" }))
    await userEvent.click(screen.getByRole("button", { name: "Gerar PDF" }))

    const exportacoes = get.mock.calls.filter(([e]) => String(e).startsWith("/export/transactions/"))
    expect(exportacoes.map(([e]) => e)).toEqual(["/export/transactions/xls/", "/export/transactions/pdf/"])
    for (const [, config] of exportacoes) {
      expect((config as { params: URLSearchParams }).params.get("linked")).toBe("true")
    }

    const base = { startDate: undefined, endDate: undefined, type: "ALL", categoryIds: [], accountId: "ALL" }
    expect(paramsDaExportacao(base).has("linked")).toBe(false)
    expect(paramsDaExportacao({ ...base, linked: false }).has("linked")).toBe(false)
  })

  it("/transacoes?principalId=<id> envia o filtro da principal", async () => {
    url.parametros = new URLSearchParams("principalId=t-cinema")
    render(<TransactionsPage />)
    await screen.findAllByText("Uber até o cinema")

    const busca = ultimaBusca()
    expect(busca.get("principalId")).toBe("t-cinema")
    expect(busca.has("linked")).toBe(false)
  })

  it("com o recurso travado, o filtro aparece travado e não envia linked", async () => {
    auth.user = usuario({ fechados: ["vinculos"] })
    render(<TransactionsPage />)
    await screen.findAllByText("Cinema")

    const painel = await abrirFiltros()
    const opcao = within(painel).getByRole("checkbox", { name: "Com vínculo" })
    expect(opcao).toBeDisabled()
    expect(within(painel).getByLabelText("Travado pelo plano")).toBeInTheDocument()
    await userEvent.click(opcao)
    expect(opcao).not.toBeChecked()
    await userEvent.click(within(painel).getByRole("button", { name: /aplicar filtros/i }))

    await vi.waitFor(() => expect(screen.queryByRole("dialog")).not.toBeInTheDocument())
    expect(ultimaBusca().has("linked")).toBe(false)
  })
})
