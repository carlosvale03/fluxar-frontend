import { act, render } from "@testing-library/react"
import { AxiosError, type AxiosResponse, type InternalAxiosRequestConfig } from "axios"
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest"

import MaintenancePage from "@/app/manutencao/page"
import { aoSessaoEncerrada, api, definirTokenDeAcesso, obterTokenDeAcesso } from "@/services/apiClient"

// SESSAO-21: na manutenção, quem não é administrador vai para a página de
// manutenção sem perder a sessão. SESSAO-22: quando a manutenção é
// desligada, a página volta sozinha, em até 30 segundos, à página em que o
// usuário estava.

const { replace } = vi.hoisted(() => ({ replace: vi.fn() }))

vi.mock("next/navigation", () => ({
  useRouter: () => ({ push: vi.fn(), replace }),
}))

class CanalFalso {
  constructor(public name: string) {}
  postMessage() {}
  addEventListener() {}
  removeEventListener() {}
  close() {}
}
vi.stubGlobal("BroadcastChannel", CanalFalso)

const CHAVE = "fluxar.voltar_da_manutencao"

describe("redirecionamento para a manutenção no apiClient", () => {
  const locationOriginal = window.location

  function estarEm(pathname: string, search = "") {
    Object.defineProperty(window, "location", {
      configurable: true,
      value: { href: `http://localhost${pathname}${search}`, pathname, search },
    })
  }

  // Toda requisição recebe o 503 de manutenção do backend
  function servidorEmManutencao() {
    api.defaults.adapter = async (config: InternalAxiosRequestConfig) => {
      const response: AxiosResponse = {
        data: { detail: "O sistema está em manutenção.", code: "maintenance_mode" },
        status: 503,
        statusText: "",
        headers: {},
        config,
      }
      throw new AxiosError("erro", AxiosError.ERR_BAD_RESPONSE, config, null, response)
    }
  }

  beforeEach(() => {
    sessionStorage.clear()
    definirTokenDeAcesso("acesso-1")
    servidorEmManutencao()
  })

  afterEach(() => {
    Object.defineProperty(window, "location", { configurable: true, value: locationOriginal })
  })

  it("guarda a página atual, vai para /manutencao e não encerra a sessão", async () => {
    estarEm("/transacoes", "?mes=3")
    const fim = vi.fn()
    const cancelar = aoSessaoEncerrada(fim)

    const erro = (await api.get("/transactions/").catch((e: unknown) => e)) as AxiosError

    expect(erro.response?.status).toBe(503)
    expect(window.location.href).toBe("/manutencao")
    expect(sessionStorage.getItem(CHAVE)).toBe("/transacoes?mes=3")
    expect(fim).not.toHaveBeenCalled()
    expect(obterTokenDeAcesso()).toBe("acesso-1")
    cancelar()
  })

  it("já na página de manutenção, não redireciona nem troca a página guardada", async () => {
    estarEm("/manutencao")
    sessionStorage.setItem(CHAVE, "/transacoes?mes=3")

    await api.get("/transactions/").catch(() => undefined)

    expect(window.location.href).toBe("http://localhost/manutencao")
    expect(sessionStorage.getItem(CHAVE)).toBe("/transacoes?mes=3")
  })
})

describe("volta da página de manutenção", () => {
  // O /health/ responde com o estado da manutenção, na ordem dada; o último se repete
  function servidorDeSaude(...estados: boolean[]) {
    const consultas: string[] = []
    api.defaults.adapter = async (config: InternalAxiosRequestConfig) => {
      consultas.push(config.url ?? "")
      const maintenance = estados[Math.min(consultas.length - 1, estados.length - 1)]
      const response: AxiosResponse = { data: { status: "ok", maintenance }, status: 200, statusText: "", headers: {}, config }
      return response
    }
    return consultas
  }

  beforeEach(() => {
    vi.useFakeTimers()
    replace.mockReset()
    sessionStorage.clear()
  })

  afterEach(() => {
    vi.useRealTimers()
  })

  it("consulta o /health/ a cada 30 segundos e, com maintenance false, volta à página guardada", async () => {
    sessionStorage.setItem(CHAVE, "/transacoes?mes=3")
    const consultas = servidorDeSaude(true, false)

    render(<MaintenancePage />)
    await act(() => vi.advanceTimersByTimeAsync(0))
    expect(consultas).toEqual(["/health/"])
    expect(replace).not.toHaveBeenCalled()

    await act(() => vi.advanceTimersByTimeAsync(29_000))
    expect(consultas).toHaveLength(1)
    expect(replace).not.toHaveBeenCalled()

    await act(() => vi.advanceTimersByTimeAsync(1_000))
    expect(consultas).toEqual(["/health/", "/health/"])
    expect(replace).toHaveBeenCalledWith("/transacoes?mes=3")
    expect(sessionStorage.getItem(CHAVE)).toBeNull()
  })

  it("sem página guardada, volta ao dashboard", async () => {
    servidorDeSaude(false)

    render(<MaintenancePage />)
    await act(() => vi.advanceTimersByTimeAsync(0))

    expect(replace).toHaveBeenCalledWith("/dashboard")
  })
})
