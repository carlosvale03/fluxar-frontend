import { AxiosError, type AxiosResponse, type InternalAxiosRequestConfig } from "axios"
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest"

// SESSAO-10: vários 401 ao mesmo tempo, na mesma aba ou em abas diferentes,
// geram uma única renovação, e cada requisição é refeita uma única vez com o
// token novo. SESSAO-11: a renovação recusada com 401 encerra a sessão.
// SESSAO-14: o fim da sessão é avisado às outras abas.

type Mensagem = { tipo: string; token?: string; em?: number }

// BroadcastChannel de mentira: guarda o que a aba envia e simula o que chega
// das outras abas
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

// Web Locks de mentira: um lock por nome, em fila, como no navegador
function criarLocks() {
  const filas = new Map<string, Promise<unknown>>()
  const pedidos: string[] = []
  return {
    pedidos,
    request(nome: string, callback: () => Promise<unknown>) {
      pedidos.push(nome)
      const anterior = filas.get(nome) ?? Promise.resolve()
      const atual = anterior.then(() => callback())
      filas.set(nome, atual.catch(() => undefined))
      return atual
    },
  }
}

function canal() {
  const encontrado = CanalFalso.instancias.find((c) => c.name === "fluxar-sessao")
  if (!encontrado) throw new Error("canal fluxar-sessao não foi aberto")
  return encontrado
}

async function carregar() {
  vi.resetModules()
  const axios = (await import("axios")).default
  const apiClient = await import("@/services/apiClient")
  const entreAbas = await import("@/lib/sessao-entre-abas")
  return { axios, ...apiClient, ...entreAbas }
}

// Responde 200 ao token aceito e 401 aos outros, guardando cada requisição
function servidor(api: { defaults: { adapter?: unknown } }, tokenAceito: string | null) {
  const enviadas: InternalAxiosRequestConfig[] = []
  api.defaults.adapter = async (config: InternalAxiosRequestConfig) => {
    enviadas.push(config)
    const status = config.headers.get("Authorization") === `Bearer ${tokenAceito}` ? 200 : 401
    const response: AxiosResponse = { data: { ok: true }, status, statusText: "", headers: {}, config }
    if (status === 200) return response
    throw new AxiosError("erro", AxiosError.ERR_BAD_REQUEST, config, null, response)
  }
  return enviadas
}

function erroHttp(status: number) {
  const response = { data: {}, status, statusText: "", headers: {}, config: {} } as AxiosResponse
  return new AxiosError("erro", AxiosError.ERR_BAD_REQUEST, undefined, null, response)
}

const autorizacoes = (enviadas: InternalAxiosRequestConfig[]) =>
  enviadas.map((config) => config.headers.get("Authorization"))

describe("renovação única entre requisições e abas", () => {
  let locks: ReturnType<typeof criarLocks>

  beforeEach(() => {
    CanalFalso.instancias = []
    vi.stubGlobal("BroadcastChannel", CanalFalso)
    locks = criarLocks()
    Object.defineProperty(navigator, "locks", { configurable: true, value: locks })
  })

  afterEach(() => {
    vi.unstubAllGlobals()
    vi.restoreAllMocks()
    Object.defineProperty(navigator, "locks", { configurable: true, value: undefined })
  })

  it("três 401 simultâneos geram uma renovação e três novas tentativas com o token novo", async () => {
    const { axios, api, definirTokenDeAcesso, obterTokenDeAcesso } = await carregar()
    const enviadas = servidor(api, "novo")
    const renovacao = vi.spyOn(axios, "post").mockResolvedValue({ data: { access: "novo" } })
    definirTokenDeAcesso("vencido")

    const respostas = await Promise.all([api.get("/accounts/"), api.get("/goals/"), api.get("/budgets/")])

    expect(respostas.map((r) => r.status)).toEqual([200, 200, 200])
    expect(renovacao).toHaveBeenCalledTimes(1)
    expect(renovacao.mock.calls[0][0]).toBe("/api/auth/refresh/")
    expect(locks.pedidos).toEqual(["fluxar-renovacao"])
    expect(enviadas).toHaveLength(6)
    expect(autorizacoes(enviadas.slice(3))).toEqual(["Bearer novo", "Bearer novo", "Bearer novo"])
    expect(obterTokenDeAcesso()).toBe("novo")
    expect(canal().enviadas).toEqual([{ tipo: "token", token: "novo", em: expect.any(Number) }])
  })

  it("usa o token que outra aba renovou enquanto segurava o lock, sem chamar /auth/refresh/", async () => {
    const { axios, api, definirTokenDeAcesso } = await carregar()
    const enviadas = servidor(api, "da-outra-aba")
    const renovacao = vi.spyOn(axios, "post").mockResolvedValue({ data: { access: "nao-usar" } })
    definirTokenDeAcesso("vencido")
    // A outra aba pega o lock primeiro e renova
    let liberarOutraAba!: () => void
    void locks.request("fluxar-renovacao", () => new Promise<void>((resolve) => { liberarOutraAba = resolve }))

    const pedido = api.get("/accounts/")
    await vi.waitFor(() => expect(locks.pedidos).toHaveLength(2))
    canal().daOutraAba({ tipo: "token", token: "da-outra-aba", em: Date.now() })
    liberarOutraAba()

    expect((await pedido).status).toBe(200)
    expect(renovacao).not.toHaveBeenCalled()
    expect(autorizacoes(enviadas)).toEqual(["Bearer vencido", "Bearer da-outra-aba"])
  })

  it("token de outra aba com mais de 10 segundos não serve, e a aba renova", async () => {
    const { axios, api, definirTokenDeAcesso, aoFimDaSessao } = await carregar()
    const enviadas = servidor(api, "novo")
    const renovacao = vi.spyOn(axios, "post").mockResolvedValue({ data: { access: "novo" } })
    definirTokenDeAcesso("vencido")
    // A aba já escuta o canal, como faz o AuthProvider
    aoFimDaSessao(() => undefined)
    canal().daOutraAba({ tipo: "token", token: "antigo-da-outra-aba", em: Date.now() - 11_000 })

    expect((await api.get("/accounts/")).status).toBe(200)
    expect(renovacao).toHaveBeenCalledTimes(1)
    expect(autorizacoes(enviadas)).toEqual(["Bearer vencido", "Bearer novo"])
  })

  it("sem Web Locks, a promessa única da aba faz uma renovação só", async () => {
    Object.defineProperty(navigator, "locks", { configurable: true, value: undefined })
    const { axios, api, definirTokenDeAcesso } = await carregar()
    servidor(api, "novo")
    const renovacao = vi.spyOn(axios, "post").mockResolvedValue({ data: { access: "novo" } })
    definirTokenDeAcesso("vencido")

    const respostas = await Promise.all([api.get("/accounts/"), api.get("/goals/")])

    expect(respostas.map((r) => r.status)).toEqual([200, 200])
    expect(renovacao).toHaveBeenCalledTimes(1)
  })

  it("renovação recusada com 401 dispara o fim da sessão e rejeita as requisições", async () => {
    const { axios, api, definirTokenDeAcesso, obterTokenDeAcesso, aoSessaoEncerrada } = await carregar()
    servidor(api, null)
    vi.spyOn(axios, "post").mockRejectedValue(erroHttp(401))
    const fim = vi.fn()
    aoSessaoEncerrada(fim)
    definirTokenDeAcesso("vencido")

    const erros = (await Promise.all([
      api.get("/accounts/").catch((e: unknown) => e),
      api.get("/goals/").catch((e: unknown) => e),
    ])) as AxiosError[]

    expect(erros.map((e) => e.response?.status)).toEqual([401, 401])
    expect(fim).toHaveBeenCalled()
    expect(obterTokenDeAcesso()).toBeNull()
  })

  it("requisição refeita que recebe 401 de novo não entra em laço", async () => {
    const { axios, api, definirTokenDeAcesso, aoSessaoEncerrada } = await carregar()
    const enviadas = servidor(api, null)
    const renovacao = vi.spyOn(axios, "post").mockResolvedValue({ data: { access: "novo" } })
    const fim = vi.fn()
    aoSessaoEncerrada(fim)
    definirTokenDeAcesso("vencido")

    const erro = (await api.get("/accounts/").catch((e: unknown) => e)) as AxiosError

    expect(erro.response?.status).toBe(401)
    expect(renovacao).toHaveBeenCalledTimes(1)
    expect(autorizacoes(enviadas)).toEqual(["Bearer vencido", "Bearer novo"])
    expect(fim).not.toHaveBeenCalled()
  })

  it("avisa o fim da sessão às outras abas e escuta o aviso delas", async () => {
    const { anunciarFimDaSessao, aoFimDaSessao } = await carregar()
    const fim = vi.fn()
    const cancelar = aoFimDaSessao(fim)

    anunciarFimDaSessao()
    expect(canal().enviadas).toEqual([{ tipo: "fim" }])

    canal().daOutraAba({ tipo: "fim" })
    expect(fim).toHaveBeenCalledTimes(1)

    cancelar()
    canal().daOutraAba({ tipo: "fim" })
    expect(fim).toHaveBeenCalledTimes(1)
  })
})
