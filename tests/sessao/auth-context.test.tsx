import { render, screen } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import axios, { AxiosError, type AxiosResponse, type InternalAxiosRequestConfig } from "axios"
import { afterEach, beforeEach, describe, expect, it, vi, type MockInstance } from "vitest"

import AuthGuard from "@/components/auth/auth-guard"
import { AuthProvider, useAuth, type User } from "@/contexts/auth-context"
import { api, definirTokenDeAcesso, obterTokenDeAcesso } from "@/services/apiClient"

// SESSAO-03: com o cookie de renovação válido, a página carregada renova a
// sessão antes de carregar os dados, sem pedir login. SESSAO-06: os tokens
// antigos do localStorage são apagados. SESSAO-11: a renovação recusada com
// 401 encerra a sessão e, numa página protegida, leva ao login. SESSAO-12:
// rede, tempo esgotado ou 5xx na renovação ou no /auth/me/ mantêm a sessão e
// mostram o aviso com "Tentar de novo". SESSAO-14: o fim da sessão limpa o
// token e o layout do dashboard.

const { push } = vi.hoisted(() => ({ push: vi.fn() }))

vi.mock("next/navigation", () => ({
  useRouter: () => ({ push, replace: vi.fn() }),
}))

// O canal entre abas guarda as mensagens enviadas, para conferir o aviso às outras abas
const mensagensDoCanal: unknown[] = []
class CanalFalso {
  constructor(public name: string) {}
  postMessage(mensagem: unknown) {
    mensagensDoCanal.push(mensagem)
  }
  addEventListener() {}
  removeEventListener() {}
  close() {}
}
vi.stubGlobal("BroadcastChannel", CanalFalso)

const USUARIO = { id: "1", name: "Ana", email: "ana@x.com", role: "USER" } as User

type Resposta = [number, unknown] | (() => AxiosError)

function erroHttp(status: number) {
  const response = { data: {}, status, statusText: "", headers: {}, config: {} } as AxiosResponse
  return new AxiosError("erro", AxiosError.ERR_BAD_REQUEST, undefined, null, response)
}

const erroDeRede = () => new AxiosError("Network Error", AxiosError.ERR_NETWORK)
const tempoEsgotado = () => new AxiosError("timeout of 30000ms exceeded", AxiosError.ECONNABORTED)

// Responde cada rota da api conforme a tabela, guardando o Authorization enviado
function servidor(rotas: Record<string, (config: InternalAxiosRequestConfig) => Resposta>) {
  const enviadas: { url?: string; authorization: unknown }[] = []
  api.defaults.adapter = async (config: InternalAxiosRequestConfig) => {
    enviadas.push({ url: config.url, authorization: config.headers.get("Authorization") })
    const resposta = rotas[config.url ?? ""]?.(config) ?? [404, {}]
    if (typeof resposta === "function") {
      const erro = resposta()
      erro.config = config
      throw erro
    }
    const [status, data] = resposta
    const response: AxiosResponse = { data, status, statusText: "", headers: {}, config }
    if (status < 400) return response
    throw new AxiosError("erro", AxiosError.ERR_BAD_REQUEST, config, null, response)
  }
  return enviadas
}

// O /auth/me/ só aceita o token entregue pela renovação
const meAceitando =
  (token: string) =>
  (config: InternalAxiosRequestConfig): Resposta =>
    config.headers.get("Authorization") === `Bearer ${token}` ? [200, USUARIO] : [401, {}]

function Painel() {
  const { user } = useAuth()
  return <p>Olá, {user?.name}</p>
}

function PaginaPublica() {
  const { isLoading, user } = useAuth()
  return <p>{isLoading ? "carregando" : `pronto: ${user?.name ?? "visitante"}`}</p>
}

const renderProtegida = () =>
  render(
    <AuthProvider>
      <AuthGuard>
        <Painel />
      </AuthGuard>
    </AuthProvider>,
  )

describe("início da sessão no AuthProvider", () => {
  let renovacao: MockInstance<typeof axios.post>

  beforeEach(() => {
    push.mockReset()
    mensagensDoCanal.length = 0
    localStorage.clear()
    definirTokenDeAcesso(null)
    renovacao = vi.spyOn(axios, "post")
  })

  afterEach(() => {
    vi.restoreAllMocks()
  })

  it("com o cookie válido, renova antes do /auth/me/ e carrega o usuário sem ir ao login", async () => {
    localStorage.setItem("fluxar.token", "antigo")
    localStorage.setItem("fluxar.refresh_token", "antigo")
    renovacao.mockResolvedValue({ data: { access: "acesso-1" } })
    const enviadas = servidor({ "/auth/me/": meAceitando("acesso-1") })

    renderProtegida()

    expect(await screen.findByText("Olá, Ana")).toBeInTheDocument()
    expect(renovacao).toHaveBeenCalledTimes(1)
    expect(renovacao.mock.calls[0][0]).toBe("/api/auth/refresh/")
    expect(enviadas).toEqual([{ url: "/auth/me/", authorization: "Bearer acesso-1" }])
    expect(push).not.toHaveBeenCalled()
    expect(localStorage.getItem("fluxar.token")).toBeNull()
    expect(localStorage.getItem("fluxar.refresh_token")).toBeNull()
  })

  const FALHAS: [string, { renovacao?: () => AxiosError; me?: () => AxiosError }][] = [
    ["erro de rede na renovação", { renovacao: erroDeRede }],
    ["tempo esgotado na renovação", { renovacao: tempoEsgotado }],
    ["502 na renovação", { renovacao: () => erroHttp(502) }],
    ["502 no /auth/me/", { me: () => erroHttp(502) }],
    ["erro de rede no /auth/me/", { me: erroDeRede }],
  ]

  it.each(FALHAS)("com %s mostra o aviso, não desloga e \"Tentar de novo\" carrega o usuário", async (_, falha) => {
    localStorage.setItem("dashboard_layout_config", "{}")
    if (falha.renovacao) renovacao.mockRejectedValueOnce(falha.renovacao())
    renovacao.mockResolvedValue({ data: { access: "acesso-1" } })
    let meFalhou = false
    servidor({
      "/auth/me/": (config) => {
        if (falha.me && !meFalhou) {
          meFalhou = true
          return falha.me
        }
        return meAceitando("acesso-1")(config)
      },
    })

    renderProtegida()

    expect(await screen.findByText("Não conseguimos falar com o servidor.")).toBeInTheDocument()
    expect(screen.getByText(/Sua sessão continua aberta/)).toBeInTheDocument()
    expect(screen.queryByText("Olá, Ana")).not.toBeInTheDocument()
    expect(push).not.toHaveBeenCalled()
    expect(localStorage.getItem("dashboard_layout_config")).toBe("{}")
    if (falha.me) expect(obterTokenDeAcesso()).toBe("acesso-1")

    await userEvent.click(screen.getByRole("button", { name: "Tentar de novo" }))

    expect(await screen.findByText("Olá, Ana")).toBeInTheDocument()
    expect(screen.queryByText("Não conseguimos falar com o servidor.")).not.toBeInTheDocument()
    expect(push).not.toHaveBeenCalled()
  })

  it("com a renovação recusada com 401, a página protegida leva ao login, sem aviso", async () => {
    renovacao.mockRejectedValue(erroHttp(401))
    const enviadas = servidor({ "/auth/me/": meAceitando("acesso-1") })

    renderProtegida()

    await vi.waitFor(() => expect(push).toHaveBeenCalledWith("/auth/login"))
    expect(screen.queryByText("Não conseguimos falar com o servidor.")).not.toBeInTheDocument()
    expect(screen.queryByText(/Olá/)).not.toBeInTheDocument()
    expect(enviadas).toEqual([])
  })

  it("com a renovação recusada com 401, a página pública não redireciona", async () => {
    renovacao.mockRejectedValue(erroHttp(401))
    servidor({})

    render(
      <AuthProvider>
        <PaginaPublica />
      </AuthProvider>,
    )

    expect(await screen.findByText("pronto: visitante")).toBeInTheDocument()
    expect(push).not.toHaveBeenCalled()
    expect(screen.queryByText("Não conseguimos falar com o servidor.")).not.toBeInTheDocument()
  })

  it("renovação recusada durante o uso encerra a sessão uma vez só: token, layout e ida ao login", async () => {
    localStorage.setItem("dashboard_layout_config", "{}")
    renovacao.mockResolvedValueOnce({ data: { access: "acesso-1" } })
    servidor({ "/auth/me/": meAceitando("acesso-1"), "/accounts/": () => [401, {}], "/goals/": () => [401, {}] })
    renderProtegida()
    expect(await screen.findByText("Olá, Ana")).toBeInTheDocument()

    renovacao.mockRejectedValue(erroHttp(401))
    await Promise.all([api.get("/accounts/").catch(() => undefined), api.get("/goals/").catch(() => undefined)])

    await vi.waitFor(() => expect(screen.queryByText("Olá, Ana")).not.toBeInTheDocument())
    expect(obterTokenDeAcesso()).toBeNull()
    expect(localStorage.getItem("dashboard_layout_config")).toBeNull()
    expect(push).toHaveBeenCalledTimes(1)
    expect(push).toHaveBeenCalledWith("/auth/login")
    // SESSAO-14: as outras abas são avisadas uma vez só, mesmo com duas recusas
    expect(mensagensDoCanal.filter((m) => (m as { tipo?: string }).tipo === "fim")).toHaveLength(1)
  })
})
