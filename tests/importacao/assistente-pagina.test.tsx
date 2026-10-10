import { render, screen } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import { beforeEach, describe, expect, it, vi } from "vitest"

import ImportExportPage from "@/app/(app)/importar/page"
import type { User } from "@/contexts/auth-context"
import { api } from "@/services/apiClient"

import { usuario as usuarioDoPlano } from "../permissoes/acesso"

// IMPCOMP-43: o card de planilha abre o assistente, que pede a análise ao
// escolher o arquivo. O OFX continua no diálogo atual, e o guia de formatos
// fala da detecção automática.

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
const post = vi.mocked(api.post)

describe("Página de importação", { timeout: 20_000 }, () => {
  beforeEach(() => {
    vi.clearAllMocks()
    auth.user = usuarioDoPlano()
    get.mockResolvedValue({ data: [] })
  })

  it("o card de planilha abre o assistente, que analisa ao escolher o arquivo", async () => {
    const usuario = userEvent.setup({ applyAccept: false })
    post.mockReturnValue(new Promise(() => {}))
    render(<ImportExportPage />)

    expect(screen.queryByRole("button", { name: "Mapear Colunas e Importar" })).not.toBeInTheDocument()
    await usuario.click(screen.getByRole("button", { name: "Importar Planilha" }))

    const dialogo = await screen.findByRole("dialog")
    expect(dialogo).toHaveTextContent("Importar planilha")
    expect(screen.queryByRole("button", { name: /próximo passo/i })).not.toBeInTheDocument()
    await usuario.upload(screen.getByLabelText("Arquivo da planilha"), new File(["x"], "mobills.xlsx"))
    expect(post).toHaveBeenCalledWith("/import/analise/", expect.any(FormData), expect.anything())
  })

  it("o OFX continua abrindo o diálogo atual", async () => {
    const usuario = userEvent.setup()
    render(<ImportExportPage />)

    await usuario.click(screen.getByRole("button", { name: "Configurar Importação OFX" }))

    const dialogo = await screen.findByRole("dialog")
    expect(dialogo).toHaveTextContent("Importar OFX")
    expect(screen.getByLabelText("Arquivo (.ofx)")).toHaveAttribute("accept", ".ofx")
    expect(screen.queryByLabelText("Arquivo da planilha")).not.toBeInTheDocument()
  })

  it("o guia de formatos fala da detecção automática, sem o mapeamento manual", async () => {
    const usuario = userEvent.setup()
    render(<ImportExportPage />)

    await usuario.click(screen.getByText("Guia de Formatos"))
    await usuario.click(await screen.findByRole("button", { name: "Planilhas (CSV/XLSX)" }))

    expect(screen.getByText(/as colunas e as contas são reconhecidas automaticamente/i)).toBeInTheDocument()
    expect(screen.queryByText(/você poderá mapear/i)).not.toBeInTheDocument()
  })
})
