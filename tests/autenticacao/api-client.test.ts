import axios, { AxiosError, type AxiosResponse, type InternalAxiosRequestConfig } from "axios"
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest"

import { api, mensagemDeErro } from "@/services/apiClient"

// AUTH-41: as rotas públicas de autenticação saem sem token e um 401 delas
// não renova a sessão nem redireciona para o login. AUTH-36: a mensagem do 429.

const ROTAS_PUBLICAS = [
  "/auth/register/",
  "/auth/login/",
  "/auth/verify-email/?token=abc",
  "/auth/resend-verification/",
  "/auth/forgot-password/",
  "/auth/reset-password/",
]

const adapterOriginal = api.defaults.adapter
const locationOriginal = window.location

// Responde toda requisição com o status dado e guarda a config enviada
function responder(status: number, data: unknown = {}) {
  const enviadas: InternalAxiosRequestConfig[] = []
  api.defaults.adapter = async (config: InternalAxiosRequestConfig) => {
    enviadas.push(config)
    const response: AxiosResponse = { data, status, statusText: "", headers: {}, config }
    if (status >= 200 && status < 300) return response
    throw new AxiosError("erro", AxiosError.ERR_BAD_REQUEST, config, null, response)
  }
  return enviadas
}

function authorizationDe(config: InternalAxiosRequestConfig) {
  return config.headers.get("Authorization")
}

describe("apiClient nas rotas públicas", () => {
  beforeEach(() => {
    localStorage.setItem("fluxar.token", "token-antigo")
    localStorage.setItem("fluxar.refresh_token", "refresh-antigo")
    Object.defineProperty(window, "location", {
      configurable: true,
      value: { href: "http://localhost/auth/register", pathname: "/auth/register" },
    })
  })

  afterEach(() => {
    api.defaults.adapter = adapterOriginal
    delete api.defaults.headers.common["Authorization"]
    localStorage.clear()
    Object.defineProperty(window, "location", { configurable: true, value: locationOriginal })
    vi.restoreAllMocks()
  })

  it.each(ROTAS_PUBLICAS)("envia %s sem Authorization mesmo com token salvo", async (rota) => {
    const enviadas = responder(200)
    // Depois de uma renovação, o token também fica nos cabeçalhos padrão
    api.defaults.headers.common["Authorization"] = "Bearer token-antigo"

    await api.post(rota, {})

    expect(enviadas).toHaveLength(1)
    expect(authorizationDe(enviadas[0])).toBeFalsy()
  })

  it("mantém o token em /auth/me/", async () => {
    const enviadas = responder(200)

    await api.get("/auth/me/")

    expect(authorizationDe(enviadas[0])).toBe("Bearer token-antigo")
  })

  it("um 401 de rota pública não renova a sessão nem redireciona", async () => {
    responder(401, { detail: "Token inválido" })
    const renovacao = vi.spyOn(axios, "post").mockRejectedValue(new Error("sem rede"))

    const erro = await api.post("/auth/login/", {}).catch((e: unknown) => e)

    expect((erro as AxiosError).response?.status).toBe(401)
    expect(renovacao).not.toHaveBeenCalled()
    expect(window.location.href).toBe("http://localhost/auth/register")
    expect(localStorage.getItem("fluxar.token")).toBe("token-antigo")
  })

  it("um 401 de rota privada sem refresh continua redirecionando para o login", async () => {
    localStorage.removeItem("fluxar.refresh_token")
    responder(401, { detail: "Token inválido" })

    await api.get("/auth/me/").catch(() => undefined)

    expect(window.location.href).toBe("/auth/login")
    expect(localStorage.getItem("fluxar.token")).toBeNull()
  })
})

describe("mensagemDeErro", () => {
  afterEach(() => {
    api.defaults.adapter = adapterOriginal
  })

  it("devolve o detail do 429", async () => {
    responder(429, { detail: "Muitas tentativas. Tente novamente em 3 minutos." })

    const erro = await api.post("/auth/forgot-password/", {}).catch((e: unknown) => e)

    expect(mensagemDeErro(erro)).toBe("Muitas tentativas. Tente novamente em 3 minutos.")
  })

  it("usa o texto de reserva quando não há detail em texto", async () => {
    responder(400, { email: ["Informe um endereço de email válido."] })

    const erro = await api.post("/auth/register/", {}).catch((e: unknown) => e)

    expect(mensagemDeErro(erro, "Tente de novo.")).toBe("Tente de novo.")
    expect(mensagemDeErro(new Error("rede"), "Sem conexão.")).toBe("Sem conexão.")
  })
})
