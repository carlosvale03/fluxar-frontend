import { render, screen } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import axios, { AxiosError, type AxiosResponse, type InternalAxiosRequestConfig } from "axios"
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest"

import AuthGuard from "@/components/auth/auth-guard"
import { AuthProvider, useAuth, type User } from "@/contexts/auth-context"
import { api, definirTokenDeAcesso, obterTokenDeAcesso } from "@/services/apiClient"

// SESSAO-13: sair chama o /auth/logout/, que revoga a sessão e apaga o cookie.
// SESSAO-14: o fim da sessão descarta o token de acesso, limpa o layout do
// dashboard e encerra a sessão nas outras abas, que levam ao login.

const { push } = vi.hoisted(() => ({ push: vi.fn() }))

vi.mock("next/navigation", () => ({
  useRouter: () => ({ push, replace: vi.fn() }),
}))

type Mensagem = { tipo: string }

// BroadcastChannel de mentira: guarda o que a aba envia e simula o que chega
// das outras abas. O canal é aberto uma vez só por módulo.
class CanalFalso {
  static instancias: CanalFalso[] = []
  enviadas: Mensagem[] = []
  private ouvintes = new Set<(evento: MessageEvent) => void>()

  constructor(public name: string) {
    CanalFalso.instancias.push(this)
  }

  postMessage(mensagem: Mensagem) {
    this.enviadas.push(mensagem)
  }

  addEventListener(tipo: string, ouvinte: (evento: MessageEvent) => void) {
    if (tipo === "message") this.ouvintes.add(ouvinte)
  }

  removeEventListener(tipo: string, ouvinte: (evento: MessageEvent) => void) {
    this.ouvintes.delete(ouvinte)
  }

  close() {}

  daOutraAba(mensagem: Mensagem) {
    this.ouvintes.forEach((ouvinte) => ouvinte({ data: mensagem } as MessageEvent))
  }
}
vi.stubGlobal("BroadcastChannel", CanalFalso)

function canal() {
  const encontrado = CanalFalso.instancias.find((c) => c.name === "fluxar-sessao")
  if (!encontrado) throw new Error("canal fluxar-sessao não foi aberto")
  return encontrado
}

const USUARIO = { id: "1", name: "Ana", email: "ana@x.com", role: "USER" } as User

// /auth/me/ aceita o token da renovação; /auth/logout/ responde conforme dado
function servidor(logout: () => AxiosResponse["status"] | AxiosError) {
  const enviadas: { method?: string; url?: string }[] = []
  api.defaults.adapter = async (config: InternalAxiosRequestConfig) => {
    enviadas.push({ method: config.method, url: config.url })
    let status = 404
    let data: unknown = {}
    if (config.url === "/auth/me/") {
      status = config.headers.get("Authorization") === "Bearer acesso-1" ? 200 : 401
      data = USUARIO
    } else if (config.url === "/auth/logout/") {
      const resultado = logout()
      if (resultado instanceof AxiosError) {
        resultado.config = config
        throw resultado
      }
      status = resultado
      data = ""
    }
    const response: AxiosResponse = { data, status, statusText: "", headers: {}, config }
    if (status < 400) return response
    throw new AxiosError("erro", AxiosError.ERR_BAD_REQUEST, config, null, response)
  }
  return enviadas
}

function Painel() {
  const { user, logout } = useAuth()
  return (
    <>
      <p>Olá, {user?.name}</p>
      <button onClick={logout}>Sair</button>
    </>
  )
}

async function entrar() {
  render(
    <AuthProvider>
      <AuthGuard>
        <Painel />
      </AuthGuard>
    </AuthProvider>,
  )
  expect(await screen.findByText("Olá, Ana")).toBeInTheDocument()
  expect(obterTokenDeAcesso()).toBe("acesso-1")
}

const chamadasDeLogout = (enviadas: { method?: string; url?: string }[]) =>
  enviadas.filter((r) => r.url === "/auth/logout/")

describe("logout em todas as abas", () => {
  beforeEach(() => {
    push.mockReset()
    localStorage.clear()
    localStorage.setItem("dashboard_layout_config", "{}")
    definirTokenDeAcesso(null)
    vi.spyOn(axios, "post").mockResolvedValue({ data: { access: "acesso-1" } })
    CanalFalso.instancias.forEach((c) => (c.enviadas = []))
  })

  afterEach(() => {
    vi.restoreAllMocks()
  })

  it("sair chama /auth/logout/, limpa o token e o layout, avisa as outras abas e vai ao login", async () => {
    const enviadas = servidor(() => 204)
    await entrar()

    await userEvent.click(screen.getByRole("button", { name: "Sair" }))

    await vi.waitFor(() => expect(push).toHaveBeenCalledWith("/auth/login"))
    expect(chamadasDeLogout(enviadas)).toEqual([{ method: "post", url: "/auth/logout/" }])
    expect(obterTokenDeAcesso()).toBeNull()
    expect(localStorage.getItem("dashboard_layout_config")).toBeNull()
    expect(canal().enviadas).toContainEqual({ tipo: "fim" })
    expect(screen.queryByText("Olá, Ana")).not.toBeInTheDocument()
  })

  it("sair encerra a sessão na aba mesmo com o /auth/logout/ sem resposta", async () => {
    servidor(() => new AxiosError("Network Error", AxiosError.ERR_NETWORK))
    await entrar()

    await userEvent.click(screen.getByRole("button", { name: "Sair" }))

    await vi.waitFor(() => expect(push).toHaveBeenCalledWith("/auth/login"))
    expect(obterTokenDeAcesso()).toBeNull()
    expect(localStorage.getItem("dashboard_layout_config")).toBeNull()
    expect(canal().enviadas).toContainEqual({ tipo: "fim" })
    expect(screen.queryByText("Olá, Ana")).not.toBeInTheDocument()
  })

  it("o aviso de outra aba encerra a sessão e leva ao login, sem chamar o backend nem reenviar o aviso", async () => {
    const enviadas = servidor(() => 204)
    await entrar()

    canal().daOutraAba({ tipo: "fim" })

    await vi.waitFor(() => expect(push).toHaveBeenCalledWith("/auth/login"))
    expect(obterTokenDeAcesso()).toBeNull()
    expect(localStorage.getItem("dashboard_layout_config")).toBeNull()
    expect(screen.queryByText("Olá, Ana")).not.toBeInTheDocument()
    expect(chamadasDeLogout(enviadas)).toEqual([])
    expect(canal().enviadas).not.toContainEqual({ tipo: "fim" })
  })
})
