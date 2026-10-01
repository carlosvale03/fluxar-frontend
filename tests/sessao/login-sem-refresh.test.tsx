import { render, screen } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import axios, { AxiosError, type AxiosResponse, type InternalAxiosRequestConfig } from "axios"
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest"

import LoginPage from "@/app/auth/login/page"
import VerifyEmailPage from "@/app/auth/verify-email/page"
import { AuthProvider, type User } from "@/contexts/auth-context"
import { api, definirTokenDeAcesso, obterTokenDeAcesso } from "@/services/apiClient"

// SESSAO-01: o login e a verificação entregam o token de acesso no corpo e o
// de renovação só no cookie httpOnly. SESSAO-02: a interface mantém o token
// de acesso só na memória da aba, sem gravá-lo em localStorage,
// sessionStorage ou cookie legível por JavaScript.

const { push } = vi.hoisted(() => ({ push: vi.fn() }))

vi.mock("next/navigation", () => ({
  useRouter: () => ({ push, replace: vi.fn() }),
  useSearchParams: () => new URLSearchParams("token=link-do-email"),
}))

vi.mock("sonner", () => ({ toast: { success: vi.fn(), error: vi.fn() } }))

class CanalFalso {
  constructor(public name: string) {}
  postMessage() {}
  addEventListener() {}
  removeEventListener() {}
  close() {}
}
vi.stubGlobal("BroadcastChannel", CanalFalso)

const USUARIO = { id: "1", name: "Ana", email: "ana@x.com", role: "USER" } as User

// Login, verificação e /auth/me/ como o backend responde agora: só o access no corpo
function servidor() {
  const enviadas: { url?: string; authorization: unknown }[] = []
  api.defaults.adapter = async (config: InternalAxiosRequestConfig) => {
    enviadas.push({ url: config.url, authorization: config.headers.get("Authorization") })
    const rotas: Record<string, [number, unknown]> = {
      "/auth/login/": [200, { access: "acesso-do-login", user: USUARIO }],
      "/auth/verify-email/?token=link-do-email": [200, { message: "E-mail verificado.", access: "acesso-da-verificacao" }],
      "/auth/me/": [200, USUARIO],
    }
    const [status, data] = rotas[config.url ?? ""] ?? [404, {}]
    const response: AxiosResponse = { data, status, statusText: "", headers: {}, config }
    if (status < 400) return response
    throw new AxiosError("erro", AxiosError.ERR_BAD_REQUEST, config, null, response)
  }
  return enviadas
}

// Tudo o que um script da página consegue ler
function legivelPorScript() {
  const guardado = (armazenamento: Storage) =>
    Array.from({ length: armazenamento.length }, (_, i) => {
      const chave = armazenamento.key(i) ?? ""
      return `${chave}=${armazenamento.getItem(chave)}`
    })
  return [...guardado(localStorage), ...guardado(sessionStorage), document.cookie].join(";")
}

describe("login e verificação sem guardar token no navegador", () => {
  beforeEach(() => {
    push.mockReset()
    localStorage.clear()
    sessionStorage.clear()
    definirTokenDeAcesso(null)
    // Sem cookie de renovação: a página abre sem sessão
    const resposta = { data: {}, status: 401, statusText: "", headers: {}, config: {} } as AxiosResponse
    vi.spyOn(axios, "post").mockRejectedValue(new AxiosError("erro", AxiosError.ERR_BAD_REQUEST, undefined, null, resposta))
  })

  afterEach(() => {
    vi.restoreAllMocks()
  })

  it("o login guarda o token de acesso só na memória e vai ao dashboard", async () => {
    servidor()
    render(
      <AuthProvider>
        <LoginPage />
      </AuthProvider>,
    )

    await userEvent.type(screen.getByLabelText("Endereço de E-mail"), "ana@x.com")
    await userEvent.type(screen.getByLabelText("Senha de Acesso"), "cofre-forte-2026")
    await userEvent.click(screen.getByRole("button", { name: /entrar no sistema/i }))

    await vi.waitFor(() => expect(push).toHaveBeenCalledWith("/dashboard"))
    expect(obterTokenDeAcesso()).toBe("acesso-do-login")
    expect(legivelPorScript()).not.toContain("acesso-do-login")
    expect(legivelPorScript()).not.toMatch(/fluxar\.(token|refresh_token)/)
  })

  it("a verificação guarda o token de acesso só na memória, carrega o usuário e vai ao dashboard", async () => {
    const enviadas = servidor()
    render(
      <AuthProvider>
        <VerifyEmailPage />
      </AuthProvider>,
    )

    await userEvent.click(await screen.findByRole("button", { name: /acessar minha conta/i }))

    await vi.waitFor(() => expect(push).toHaveBeenCalledWith("/dashboard"))
    expect(obterTokenDeAcesso()).toBe("acesso-da-verificacao")
    expect(enviadas).toContainEqual({ url: "/auth/me/", authorization: "Bearer acesso-da-verificacao" })
    expect(legivelPorScript()).not.toContain("acesso-da-verificacao")
    expect(legivelPorScript()).not.toMatch(/fluxar\.(token|refresh_token)/)
  })
})
