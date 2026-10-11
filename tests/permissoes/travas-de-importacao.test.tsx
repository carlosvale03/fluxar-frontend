import { readFileSync } from "node:fs"
import path from "node:path"

import { render, screen } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import { beforeEach, describe, expect, it, vi } from "vitest"

import ImportExportPage from "@/app/(app)/importar/page"
import type { User } from "@/contexts/auth-context"
import { api } from "@/services/apiClient"
import type { ChaveDeRecurso } from "@/types/planos"

import { usuario } from "./acesso"

// PERM-19 e PERM-26: importacao_ofx, importacao_planilha, exportacao_pdf e
// exportacao_xlsx fechados mostram o aviso no lugar do botão, sem chamar a
// rota; a tela não decide mais pelo nome do plano.

const auth = vi.hoisted(() => ({ user: null as User | null }))
const estadoDoAuth = () => ({ user: auth.user, isLoading: false })

vi.mock("@/contexts/auth-context", () => ({ useAuth: () => estadoDoAuth() }))
vi.mock("@/hooks/use-auth", () => ({ useAuth: () => estadoDoAuth() }))
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
const AVISO = "Este recurso não está disponível no seu plano."

function comAcesso(fechados: ChaveDeRecurso[] = []) {
  // Plano Premium Plus com as travas fechadas: o nome do plano não libera nada
  auth.user = usuario({ fechados, plan: "PREMIUM_PLUS" })
}

beforeEach(() => {
  vi.clearAllMocks()
  get.mockResolvedValue({ data: [] })
  URL.createObjectURL = vi.fn(() => "blob:x")
  URL.revokeObjectURL = vi.fn()
})

const abrirExportacao = () => userEvent.click(screen.getByRole("button", { name: /Exportar/ }))

describe("Importação e exportação", () => {
  it("importacao_ofx fechado: o botão do OFX dá lugar ao aviso", () => {
    comAcesso(["importacao_ofx"])
    render(<ImportExportPage />)

    expect(screen.queryByRole("button", { name: "Configurar Importação OFX" })).not.toBeInTheDocument()
    expect(screen.getByRole("button", { name: "Importar Planilha" })).toBeInTheDocument()
    expect(screen.getAllByText(AVISO)).toHaveLength(1)
  })

  it("importacao_planilha fechado: o botão da planilha dá lugar ao aviso", () => {
    comAcesso(["importacao_planilha"])
    render(<ImportExportPage />)

    expect(screen.queryByRole("button", { name: "Importar Planilha" })).not.toBeInTheDocument()
    expect(screen.getByRole("button", { name: "Configurar Importação OFX" })).toBeInTheDocument()
    expect(screen.getAllByText(AVISO)).toHaveLength(1)
  })

  it("exportacao_pdf fechado: o PDF mostra o aviso e o XLS exporta normalmente", async () => {
    comAcesso(["exportacao_pdf"])
    get.mockResolvedValue({ data: new Blob(["x"]) })
    render(<ImportExportPage />)
    await abrirExportacao()

    expect(screen.queryByRole("button", { name: "Gerar PDF" })).not.toBeInTheDocument()
    expect(screen.getAllByText(AVISO)).toHaveLength(1)
    await userEvent.click(screen.getByRole("button", { name: "Gerar XLS" }))

    const urls = get.mock.calls.map(([url]) => url)
    expect(urls).toContain("/export/transactions/xls/")
    expect(urls).not.toContain("/export/transactions/pdf/")
  })

  it("exportacao_xlsx fechado: o XLS mostra o aviso e o PDF exporta normalmente", async () => {
    comAcesso(["exportacao_xlsx"])
    get.mockResolvedValue({ data: new Blob(["x"]) })
    render(<ImportExportPage />)
    await abrirExportacao()

    expect(screen.queryByRole("button", { name: "Gerar XLS" })).not.toBeInTheDocument()
    expect(screen.getAllByText(AVISO)).toHaveLength(1)
    await userEvent.click(screen.getByRole("button", { name: "Gerar PDF" }))

    const urls = get.mock.calls.map(([url]) => url)
    expect(urls).toContain("/export/transactions/pdf/")
    expect(urls).not.toContain("/export/transactions/xls/")
  })

  it("um usuário Comum com tudo liberado vê os quatro botões, sem aviso", async () => {
    auth.user = usuario({ plan: "COMMON" })
    render(<ImportExportPage />)

    expect(screen.getByRole("button", { name: "Configurar Importação OFX" })).toBeInTheDocument()
    expect(screen.getByRole("button", { name: "Importar Planilha" })).toBeInTheDocument()
    await abrirExportacao()
    expect(screen.getByRole("button", { name: "Gerar PDF" })).toBeInTheDocument()
    expect(screen.getByRole("button", { name: "Gerar XLS" })).toBeInTheDocument()
    expect(screen.queryByText(AVISO)).not.toBeInTheDocument()
  })

  it("a tela não compara o nome de nenhum plano", () => {
    const fonte = readFileSync(path.resolve(__dirname, "../../src/app/(app)/importar/page.tsx"), "utf-8")
    expect(fonte).not.toMatch(/PREMIUM|COMMON|\.plan\b/)
  })
})
