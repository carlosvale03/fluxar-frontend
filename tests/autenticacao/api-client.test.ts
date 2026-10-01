import axios, { AxiosError, type AxiosResponse, type InternalAxiosRequestConfig } from "axios"
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest"

import { aoSessaoEncerrada, api, definirTokenDeAcesso, mensagemDeErro, obterTokenDeAcesso } from "@/services/apiClient"

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
    // O token de acesso fica na memória da aba (SESSAO-02)
    definirTokenDeAcesso("token-antigo")
    Object.defineProperty(window, "location", {
      configurable: true,
      value: { href: "http://localhost/auth/register", pathname: "/auth/register" },
    })
  })

  afterEach(() => {
    api.defaults.adapter = adapterOriginal
    delete api.defaults.headers.common["Authorization"]
    definirTokenDeAcesso(null)
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
    expect(obterTokenDeAcesso()).toBe("token-antigo")
  })

  it("um 401 de rota privada com a renovação recusada encerra a sessão", async () => {
    responder(401, { detail: "Token inválido" })
    const recusa = { data: {}, status: 401, statusText: "", headers: {}, config: {} } as AxiosResponse
    const renovacao = vi
      .spyOn(axios, "post")
      .mockRejectedValue(new AxiosError("recusada", AxiosError.ERR_BAD_REQUEST, undefined, null, recusa))
    // O AuthProvider escuta este aviso e leva ao login (SESSAO-11)
    const fim = vi.fn()
    const cancelar = aoSessaoEncerrada(fim)

    await api.get("/auth/me/").catch(() => undefined)
    cancelar()

    expect(renovacao).toHaveBeenCalledTimes(1)
    expect(fim).toHaveBeenCalledTimes(1)
    expect(obterTokenDeAcesso()).toBeNull()
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
