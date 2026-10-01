import axios, { AxiosError, type AxiosResponse, type InternalAxiosRequestConfig } from "axios"
import { afterEach, describe, expect, it, vi } from "vitest"

import { api, definirTokenDeAcesso, limparTokensAntigos, obterTokenDeAcesso } from "@/services/apiClient"

// SESSAO-02: o token de acesso fica só na memória da aba, sem localStorage,
// sessionStorage ou cookie legível. SESSAO-06: os tokens antigos do
// localStorage são apagados.

const adapterOriginal = api.defaults.adapter

// Responde cada requisição com o próximo status da lista e guarda a config enviada
function responder(...statuses: number[]) {
  const enviadas: InternalAxiosRequestConfig[] = []
  api.defaults.adapter = async (config: InternalAxiosRequestConfig) => {
    enviadas.push(config)
    const status = statuses[Math.min(enviadas.length - 1, statuses.length - 1)]
    const response: AxiosResponse = { data: {}, status, statusText: "", headers: {}, config }
    if (status >= 200 && status < 300) return response
    throw new AxiosError("erro", AxiosError.ERR_BAD_REQUEST, config, null, response)
  }
  return enviadas
}

function authorizationDe(config: InternalAxiosRequestConfig) {
  return config.headers.get("Authorization")
}

function assertNadaGuardadoNoNavegador() {
  expect(localStorage.length).toBe(0)
  expect(sessionStorage.length).toBe(0)
  expect(document.cookie).toBe("")
}

describe("token de acesso em memória", () => {
  afterEach(() => {
    api.defaults.adapter = adapterOriginal
    definirTokenDeAcesso(null)
    localStorage.clear()
    sessionStorage.clear()
    vi.restoreAllMocks()
  })

  it("envia o token da memória no Authorization das rotas privadas", async () => {
    const enviadas = responder(200, 200)

    definirTokenDeAcesso("acesso-1")
    await api.get("/accounts/")
    definirTokenDeAcesso(null)
    await api.get("/accounts/")

    expect(obterTokenDeAcesso()).toBeNull()
    expect(authorizationDe(enviadas[0])).toBe("Bearer acesso-1")
    expect(authorizationDe(enviadas[1])).toBeFalsy()
  })

  it("não grava o token em localStorage, sessionStorage nem cookie, nem depois de renovar", async () => {
    const enviadas = responder(401, 200)
    vi.spyOn(axios, "post").mockResolvedValue({ data: { access: "acesso-novo" } })

    definirTokenDeAcesso("acesso-vencido")
    await api.get("/accounts/")

    expect(obterTokenDeAcesso()).toBe("acesso-novo")
    expect(authorizationDe(enviadas[1])).toBe("Bearer acesso-novo")
    expect(api.defaults.headers.common["Authorization"]).toBeUndefined()
    assertNadaGuardadoNoNavegador()
  })

  it("ignora o token antigo que sobrou no localStorage", async () => {
    localStorage.setItem("fluxar.token", "token-antigo")
    const enviadas = responder(200)

    await api.get("/accounts/")

    expect(authorizationDe(enviadas[0])).toBeFalsy()
  })

  it.each(["/auth/refresh/", "/auth/logout/"])("%s nunca leva Authorization", async (rota) => {
    const enviadas = responder(204)
    definirTokenDeAcesso("acesso-1")

    await api.post(rota)

    expect(authorizationDe(enviadas[0])).toBeFalsy()
  })

  it("limparTokensAntigos apaga fluxar.token e fluxar.refresh_token do localStorage", () => {
    localStorage.setItem("fluxar.token", "token-antigo")
    localStorage.setItem("fluxar.refresh_token", "refresh-antigo")
    localStorage.setItem("fluxar-tema", "escuro")

    limparTokensAntigos()

    expect(localStorage.getItem("fluxar.token")).toBeNull()
    expect(localStorage.getItem("fluxar.refresh_token")).toBeNull()
    expect(localStorage.getItem("fluxar-tema")).toBe("escuro")
  })
})
