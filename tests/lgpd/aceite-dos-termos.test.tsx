import { render, screen, waitFor } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import axios, { AxiosError, type AxiosResponse, type InternalAxiosRequestConfig } from "axios"
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest"

import AceiteDosTermosPage from "@/app/termos/aceite/page"
import AuthGuard from "@/components/auth/auth-guard"
import { AuthProvider } from "@/contexts/auth-context"
import { CHAVE_DA_VOLTA_DOS_TERMOS, api, definirTokenDeAcesso } from "@/services/apiClient"

// LGPD-28: sem o aceite da versão vigente, a interface mostra o que mudou e
// pede o aceite antes das outras telas.
// LGPD-29: o 403 terms_acceptance_required do backend leva à tela de aceite.

const { push, replace, auth } = vi.hoisted(() => ({
  push: vi.fn(),
  replace: vi.fn(),
  auth: { atual: null as null | Record<string, unknown> },
}))

vi.mock("next/navigation", () => ({
  useRouter: () => ({ push, replace }),
}))

// A tela de aceite usa o useAuth do hook; o AuthProvider real é usado no teste do guard
vi.mock("@/hooks/use-auth", async (importOriginal) => {
  const original = await importOriginal<typeof import("@/hooks/use-auth")>()
  return { useAuth: () => auth.atual ?? original.useAuth() }
})

vi.mock("@/lib/sessao-entre-abas", () => ({
  renovarSessao: () => Promise.resolve(),
  aoFimDaSessao: () => () => {},
  anunciarFimDaSessao: () => {},
}))

vi.mock("next-themes", () => ({ useTheme: () => ({ setTheme: vi.fn() }) }))
vi.mock("sonner", () => ({ toast: Object.assign(vi.fn(), { success: vi.fn(), error: vi.fn() }) }))

const adapterOriginal = api.defaults.adapter
const locationOriginal = window.location

const TERMOS = {
  version: "2.0",
  effective_date: "2026-10-09",
  changes: [
    "A política lista as finalidades do uso dos dados e os serviços que os tratam.",
    "Você pode excluir a sua conta pelo app, com 30 dias para desistir.",
  ],
  services: [],
}

// Responde cada rota conforme a tabela e guarda as requisições
function servidor(rotas: Record<string, (config: InternalAxiosRequestConfig) => [number, unknown]>) {
  const enviadas: { method?: string; url?: string; data?: unknown }[] = []
  api.defaults.adapter = async (config: InternalAxiosRequestConfig) => {
    enviadas.push({ method: config.method, url: config.url, data: config.data })
    const [status, data] = rotas[config.url ?? ""]?.(config) ?? [404, {}]
    const response: AxiosResponse = { data, status, statusText: "", headers: {}, config }
    if (status < 400) return response
    throw new AxiosError("erro", AxiosError.ERR_BAD_REQUEST, config, null, response)
  }
  return enviadas
}

function usuario(aceita: string | null) {
  return {
    id: "1",
    name: "Ana",
    email: "ana@x.com",
    role: "USER",
    terms: { accepted_version: aceita, current_version: "2.0" },
  }
}

describe("Aceite da versão nova dos termos", () => {
  beforeEach(() => {
    push.mockReset()
    replace.mockReset()
    auth.atual = null
    sessionStorage.clear()
  })

  afterEach(() => {
    api.defaults.adapter = adapterOriginal
    definirTokenDeAcesso(null)
    Object.defineProperty(window, "location", { configurable: true, value: locationOriginal })
    vi.restoreAllMocks()
  })

  it("um 403 terms_acceptance_required leva à tela de aceite, guardando a página atual", async () => {
    Object.defineProperty(window, "location", {
      configurable: true,
      value: { href: "http://localhost/transacoes", pathname: "/transacoes", search: "?page=2" },
    })
    servidor({
      "/accounts/": () => [
        403,
        { detail: "Aceite a versão nova dos termos.", code: "terms_acceptance_required", version: "2.0" },
      ],
    })

    await expect(api.get("/accounts/")).rejects.toBeInstanceOf(AxiosError)

    expect(window.location.href).toBe("/termos/aceite")
    expect(sessionStorage.getItem(CHAVE_DA_VOLTA_DOS_TERMOS)).toBe("/transacoes?page=2")
  })

  it("o 403 terms_acceptance_required não mostra toast de erro antes de ir à tela de aceite", async () => {
    const { toast } = await import("sonner")
    const { tratarErro } = await import("@/lib/erros")
    vi.mocked(toast.error).mockClear()
    const config = {} as InternalAxiosRequestConfig
    const resposta = {
      data: { detail: "Aceite a versão nova dos termos.", code: "terms_acceptance_required", version: "2.0" },
      status: 403,
      statusText: "",
      headers: {},
      config,
    } as AxiosResponse

    tratarErro(new AxiosError("erro", AxiosError.ERR_BAD_REQUEST, config, null, resposta))

    expect(toast.error).not.toHaveBeenCalled()
  })

  it("outro 403 não leva à tela de aceite", async () => {
    Object.defineProperty(window, "location", {
      configurable: true,
      value: { href: "http://localhost/transacoes", pathname: "/transacoes", search: "" },
    })
    servidor({ "/accounts/": () => [403, { detail: "Recurso do plano.", code: "plan_locked" }] })

    await expect(api.get("/accounts/")).rejects.toBeInstanceOf(AxiosError)

    expect(window.location.href).toBe("http://localhost/transacoes")
  })

  it("a tela mostra as mudanças e, ao aceitar, grava o aceite da versão e volta ao app", async () => {
    const refreshUser = vi.fn().mockResolvedValue(undefined)
    auth.atual = { isAuthenticated: true, isLoading: false, refreshUser, logout: vi.fn() }
    sessionStorage.setItem(CHAVE_DA_VOLTA_DOS_TERMOS, "/transacoes")
    const enviadas = servidor({
      "/terms/": () => [200, TERMOS],
      "/terms/accept/": () => [200, { accepted_version: "2.0", current_version: "2.0" }],
    })

    render(<AceiteDosTermosPage />)

    for (const mudanca of TERMOS.changes) {
      expect(await screen.findByText(mudanca)).toBeInTheDocument()
    }
    expect(screen.getByRole("button", { name: /baixar meus dados/i })).toBeInTheDocument()
    expect(screen.getByRole("button", { name: "Excluir minha conta" })).toBeInTheDocument()

    await userEvent.click(screen.getByRole("button", { name: "Aceitar e continuar" }))

    await waitFor(() => expect(replace).toHaveBeenCalledWith("/transacoes"))
    const aceite = enviadas.find((r) => r.url === "/terms/accept/")
    expect(aceite?.method).toBe("post")
    expect(JSON.parse(String(aceite?.data))).toEqual({ version: "2.0" })
    expect(refreshUser).toHaveBeenCalled()
  })

  it("ao carregar o usuário sem o aceite da versão vigente, a tela de aceite vem antes das outras", async () => {
    vi.spyOn(axios, "post").mockResolvedValue({ data: { access: "acesso-1" } })
    servidor({ "/auth/me/": () => [200, usuario("1.0")] })

    render(
      <AuthProvider>
        <AuthGuard>
          <p>Painel do app</p>
        </AuthGuard>
      </AuthProvider>,
    )

    await waitFor(() => expect(replace).toHaveBeenCalledWith("/termos/aceite"))
    expect(screen.queryByText("Painel do app")).not.toBeInTheDocument()
  })

  it("com a versão vigente aceita, as telas abrem normalmente", async () => {
    vi.spyOn(axios, "post").mockResolvedValue({ data: { access: "acesso-1" } })
    servidor({ "/auth/me/": () => [200, usuario("2.0")] })

    render(
      <AuthProvider>
        <AuthGuard>
          <p>Painel do app</p>
        </AuthGuard>
      </AuthProvider>,
    )

    expect(await screen.findByText("Painel do app")).toBeInTheDocument()
    expect(replace).not.toHaveBeenCalledWith("/termos/aceite")
  })
})
