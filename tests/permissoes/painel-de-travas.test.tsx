import { render, screen, within } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import { AxiosError, type AxiosResponse } from "axios"
import { beforeEach, describe, expect, it, vi } from "vitest"

import AdminSettingsPage from "@/app/(admin)/admin/configuracoes/page"
import AdminGuard from "@/components/auth/admin-guard"
import { Header } from "@/components/layout/header"
import type { User } from "@/contexts/auth-context"
import { api } from "@/services/apiClient"
import type { ConfiguracaoDosPlanos } from "@/services/admin"
import type { TravaDoCatalogo } from "@/types/planos"

import { LIMITES, RECURSOS, usuario } from "./acesso"

// PERM-10: o painel mostra cada trava com o valor dos três planos. PERM-11:
// mudar um recurso ou um limite envia a mudança. PERM-12: o erro de `limit`
// aparece no campo. PERM-24: a chave da liberação para testes. PERM-03: quem
// não tem o papel ADMIN não vê os links do painel e é levado ao dashboard.

const { push } = vi.hoisted(() => ({ push: vi.fn() }))
const auth = vi.hoisted(() => ({ user: null as User | null }))

vi.mock("next/navigation", () => ({
  useRouter: () => ({ push, replace: vi.fn() }),
  usePathname: () => "/dashboard",
}))
vi.mock("@/hooks/use-auth", () => ({
  useAuth: () => ({ user: auth.user, isAuthenticated: !!auth.user, isLoading: false, erroDeConexao: false }),
}))
vi.mock("@/contexts/auth-context", () => ({
  useAuth: () => ({ user: auth.user, isAuthenticated: !!auth.user, isLoading: false, erroDeConexao: false }),
}))
vi.mock("sonner", () => ({ toast: { success: vi.fn(), error: vi.fn(), warning: vi.fn(), promise: vi.fn() } }))
vi.mock("@/services/apiClient", async (importOriginal) => ({
  ...(await importOriginal<typeof import("@/services/apiClient")>()),
  api: { get: vi.fn(), post: vi.fn(), patch: vi.fn() },
}))

const get = vi.mocked(api.get)
const patch = vi.mocked(api.patch)

const nome = (chave: string) => `Nome de ${chave}`

// Catálogo completo: exportacao_pdf fechado no Comum; limite_contas = 2 no Comum
function configuracao(trocas: Partial<Record<string, TravaDoCatalogo["values"]>> = {}, testing_unlock = true) {
  const catalog: TravaDoCatalogo[] = [
    ...RECURSOS.map((key) => ({
      key,
      type: "feature" as const,
      name: nome(key),
      description: `Descrição de ${key}`,
      values: trocas[key] ?? {
        COMMON: key !== "exportacao_pdf",
        PREMIUM: true,
        PREMIUM_PLUS: true,
      },
    })),
    ...LIMITES.map((key) => ({
      key,
      type: "limit" as const,
      name: nome(key),
      description: `Descrição de ${key}`,
      values: trocas[key] ?? {
        COMMON: { limit: key === "limite_contas" ? 2 : null },
        PREMIUM: { limit: null },
        PREMIUM_PLUS: { limit: null },
      },
    })),
  ]
  return { testing_unlock, catalog } satisfies ConfiguracaoDosPlanos
}

function erro400(data: unknown) {
  const response = { data, status: 400, statusText: "", headers: {}, config: {} } as AxiosResponse
  return new AxiosError("erro", AxiosError.ERR_BAD_REQUEST, undefined, null, response)
}

async function abrirPlanos() {
  render(<AdminSettingsPage />)
  await userEvent.click(screen.getByRole("button", { name: /Planos e travas/ }))
  return screen.findByRole("table")
}

describe("Painel: planos e travas", () => {
  beforeEach(() => {
    auth.user = usuario({ role: "ADMIN" })
    get.mockReset()
    patch.mockReset()
    get.mockImplementation(((url: string) => {
      if (url === "/admin/plans/") return Promise.resolve({ data: configuracao() })
      if (url === "/admin/logs/") return Promise.resolve({ data: { count: 0, total_pages: 1, results: [] } })
      return Promise.resolve({ data: {} })
    }) as typeof api.get)
  })

  it("mostra as 24 travas, com nome, descrição e o valor de cada plano", async () => {
    const tabela = await abrirPlanos()

    for (const chave of [...RECURSOS, ...LIMITES]) {
      expect(within(tabela).getByText(nome(chave))).toBeInTheDocument()
      expect(within(tabela).getByText(`Descrição de ${chave}`)).toBeInTheDocument()
    }
    expect(within(tabela).getAllByRole("switch")).toHaveLength(18 * 3)
    expect(within(tabela).getAllByRole("spinbutton")).toHaveLength(6 * 3)

    expect(screen.getByRole("switch", { name: "Nome de exportacao_pdf no Comum" })).not.toBeChecked()
    expect(screen.getByRole("switch", { name: "Nome de exportacao_pdf no Premium" })).toBeChecked()
    expect(screen.getByRole("spinbutton", { name: "Limite de Nome de limite_contas no Comum" })).toHaveValue(2)
    expect(screen.getByRole("checkbox", { name: "Sem limite de Nome de limite_contas no Comum" })).not.toBeChecked()
    expect(screen.getByRole("checkbox", { name: "Sem limite de Nome de limite_contas no Premium" })).toBeChecked()
    expect(screen.getByRole("spinbutton", { name: "Limite de Nome de limite_contas no Premium" })).toBeDisabled()
  })

  it("ligar ou desligar um recurso envia {key, plan, enabled} e mostra o valor devolvido", async () => {
    patch.mockResolvedValue({
      data: configuracao({ metas: { COMMON: false, PREMIUM: true, PREMIUM_PLUS: true } }),
    })
    await abrirPlanos()

    await userEvent.click(screen.getByRole("switch", { name: "Nome de metas no Comum" }))

    expect(patch).toHaveBeenCalledWith("/admin/plans/", { key: "metas", plan: "COMMON", enabled: false })
    expect(await screen.findByRole("switch", { name: "Nome de metas no Comum" })).not.toBeChecked()
  })

  it("mudar um limite envia {key, plan, limit}, e \"sem limite\" envia limit null", async () => {
    patch.mockResolvedValueOnce({
      data: configuracao({
        limite_contas: { COMMON: { limit: 5 }, PREMIUM: { limit: null }, PREMIUM_PLUS: { limit: null } },
      }),
    })
    await abrirPlanos()

    const campo = screen.getByRole("spinbutton", { name: "Limite de Nome de limite_contas no Comum" })
    await userEvent.clear(campo)
    await userEvent.type(campo, "5{Enter}")

    expect(patch).toHaveBeenCalledWith("/admin/plans/", { key: "limite_contas", plan: "COMMON", limit: 5 })
    expect(await screen.findByRole("spinbutton", { name: "Limite de Nome de limite_contas no Comum" })).toHaveValue(5)

    patch.mockResolvedValueOnce({ data: configuracao() })
    await userEvent.click(screen.getByRole("checkbox", { name: "Sem limite de Nome de limite_contas no Comum" }))
    expect(patch).toHaveBeenLastCalledWith("/admin/plans/", { key: "limite_contas", plan: "COMMON", limit: null })
  })

  it("um limite recusado mostra o erro de `limit` no próprio campo", async () => {
    patch.mockRejectedValue(erro400({ limit: ["Informe um número inteiro maior ou igual a zero."] }))
    await abrirPlanos()

    const campo = screen.getByRole("spinbutton", { name: "Limite de Nome de limite_tags no Premium" })
    await userEvent.click(screen.getByRole("checkbox", { name: "Sem limite de Nome de limite_tags no Premium" }))
    await userEvent.type(campo, "2.5{Enter}")

    expect(patch).toHaveBeenCalledWith("/admin/plans/", { key: "limite_tags", plan: "PREMIUM", limit: 2.5 })
    const celula = campo.closest("td") as HTMLElement
    expect(await within(celula).findByText("Informe um número inteiro maior ou igual a zero.")).toBeInTheDocument()
  })

  it("a chave da liberação para testes, junto da manutenção, envia {testing_unlock}", async () => {
    patch.mockResolvedValue({ data: configuracao({}, false) })
    render(<AdminSettingsPage />)

    const chave = await screen.findByRole("switch", { name: "Liberação para testes" })
    await vi.waitFor(() => expect(chave).toBeChecked())
    expect(screen.getByText("Modo de Manutenção")).toBeInTheDocument()
    await userEvent.click(chave)

    expect(patch).toHaveBeenCalledWith("/admin/plans/", { testing_unlock: false })
    await vi.waitFor(() => expect(chave).not.toBeChecked())
  })
})

describe("Painel só para o papel ADMIN (PERM-03)", () => {
  beforeEach(() => {
    push.mockReset()
  })

  it("sem o papel ADMIN, a página do painel leva ao dashboard sem mostrar o conteúdo", async () => {
    auth.user = usuario({ role: "USER", is_admin: false })
    render(
      <AdminGuard>
        <p>conteúdo do painel</p>
      </AdminGuard>,
    )

    await vi.waitFor(() => expect(push).toHaveBeenCalledWith("/dashboard"))
    expect(screen.queryByText("conteúdo do painel")).not.toBeInTheDocument()
  })

  it("com o papel ADMIN, a página do painel aparece", () => {
    auth.user = usuario({ role: "ADMIN", is_admin: true })
    render(
      <AdminGuard>
        <p>conteúdo do painel</p>
      </AdminGuard>,
    )

    expect(screen.getByText("conteúdo do painel")).toBeInTheDocument()
    expect(push).not.toHaveBeenCalled()
  })

  it.each([
    ["USER", false],
    ["ADMIN", true],
  ] as const)("no header, o link do painel aparece só para o papel ADMIN (%s)", async (role, temLink) => {
    auth.user = usuario({ role, is_admin: temLink })
    render(<Header />)

    await userEvent.click(screen.getByRole("button", { name: "A" }))
    expect(await screen.findByRole("menuitem", { name: /Meu Perfil/ })).toBeInTheDocument()
    const links = screen.queryAllByRole("menuitem", { name: /Painel Admin/ })
    expect(links).toHaveLength(temLink ? 1 : 0)
    if (temLink) expect(links[0]).toHaveAttribute("href", "/admin/dashboard")
  })
})
