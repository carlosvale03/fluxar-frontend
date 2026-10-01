import { AxiosError, type AxiosResponse, type InternalAxiosRequestConfig } from "axios"
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest"

// SESSAO-12: erro de rede, tempo esgotado ou 5xx, na requisição ou na
// renovação, não encerra a sessão. AD-024: toda requisição tem tempo máximo.

class CanalFalso {
  static instancias: CanalFalso[] = []
  enviadas: unknown[] = []
  constructor(public name: string) {
    CanalFalso.instancias.push(this)
  }
  postMessage(mensagem: unknown) {
    this.enviadas.push(mensagem)
  }
  addEventListener() {}
  removeEventListener() {}
  close() {}
}

async function carregar() {
  vi.resetModules()
  const axios = (await import("axios")).default
  const apiClient = await import("@/services/apiClient")
  return { axios, ...apiClient }
}

function erroHttp(status: number, data: unknown = {}) {
  const response = { data, status, statusText: "", headers: {}, config: {} } as AxiosResponse
  return new AxiosError("erro", AxiosError.ERR_BAD_REQUEST, undefined, null, response)
}

const FALHAS: [string, () => AxiosError][] = [
  ["502", () => erroHttp(502)],
  ["503 sem maintenance_mode", () => erroHttp(503, { detail: "Service Unavailable" })],
  ["tempo esgotado", () => new AxiosError("timeout of 30000ms exceeded", AxiosError.ECONNABORTED)],
  ["erro de rede", () => new AxiosError("Network Error", AxiosError.ERR_NETWORK)],
]

// Toda requisição pela api recebe o erro dado
function servidorFalhando(api: { defaults: { adapter?: unknown } }, criarErro: () => AxiosError) {
  const lancados: AxiosError[] = []
  api.defaults.adapter = async (config: InternalAxiosRequestConfig) => {
    const erro = criarErro()
    erro.config = config
    lancados.push(erro)
    throw erro
  }
  return lancados
}

// Rotas privadas respondem 401, para a interface tentar renovar
function servidorPedindoRenovacao(api: { defaults: { adapter?: unknown } }) {
  api.defaults.adapter = async (config: InternalAxiosRequestConfig) => {
    const response: AxiosResponse = { data: {}, status: 401, statusText: "", headers: {}, config }
    throw new AxiosError("erro", AxiosError.ERR_BAD_REQUEST, config, null, response)
  }
}

describe("rede e 5xx não encerram a sessão", () => {
  const locationOriginal = window.location

  beforeEach(() => {
    CanalFalso.instancias = []
    vi.stubGlobal("BroadcastChannel", CanalFalso)
    Object.defineProperty(window, "location", {
      configurable: true,
      value: { href: "http://localhost/dashboard", pathname: "/dashboard" },
    })
  })

  afterEach(() => {
    vi.unstubAllGlobals()
    vi.restoreAllMocks()
    Object.defineProperty(window, "location", { configurable: true, value: locationOriginal })
  })

  it.each(FALHAS)("%s na renovação rejeita a requisição e mantém a sessão", async (_, criarErro) => {
    const { axios, api, aoSessaoEncerrada, definirTokenDeAcesso, obterTokenDeAcesso } = await carregar()
    servidorPedindoRenovacao(api)
    const falha = criarErro()
    const renovacao = vi.spyOn(axios, "post").mockRejectedValue(falha)
    const fim = vi.fn()
    aoSessaoEncerrada(fim)
    definirTokenDeAcesso("vencido")

    const erro = await api.get("/accounts/").catch((e: unknown) => e)

    expect(renovacao).toHaveBeenCalledTimes(1)
    expect(erro).toBe(falha)
    expect(fim).not.toHaveBeenCalled()
    expect(obterTokenDeAcesso()).toBe("vencido")
    expect(CanalFalso.instancias.flatMap((canal) => canal.enviadas)).not.toContainEqual({ tipo: "fim" })
    expect(window.location.href).toBe("http://localhost/dashboard")
  })

  it.each(FALHAS)("%s numa requisição não renova nem encerra a sessão", async (_, criarErro) => {
    const { axios, api, aoSessaoEncerrada, definirTokenDeAcesso, obterTokenDeAcesso } = await carregar()
    const lancados = servidorFalhando(api, criarErro)
    const renovacao = vi.spyOn(axios, "post")
    const fim = vi.fn()
    aoSessaoEncerrada(fim)
    definirTokenDeAcesso("valido")

    const erro = await api.get("/accounts/").catch((e: unknown) => e)

    expect(lancados).toHaveLength(1)
    expect(erro).toBe(lancados[0])
    expect(renovacao).not.toHaveBeenCalled()
    expect(fim).not.toHaveBeenCalled()
    expect(obterTokenDeAcesso()).toBe("valido")
    expect(window.location.href).toBe("http://localhost/dashboard")
  })

  it("as requisições e a renovação têm tempo máximo de 30 segundos", async () => {
    const { axios, api, definirTokenDeAcesso } = await carregar()
    servidorPedindoRenovacao(api)
    const renovacao = vi.spyOn(axios, "post").mockRejectedValue(new AxiosError("Network Error", AxiosError.ERR_NETWORK))
    definirTokenDeAcesso("vencido")

    await api.get("/accounts/").catch(() => undefined)

    expect(api.defaults.timeout).toBe(30_000)
    expect(renovacao.mock.calls[0][0]).toBe("/api/auth/refresh/")
    expect(renovacao.mock.calls[0][2]).toMatchObject({ timeout: 30_000 })
  })
})
