import { AxiosError, type AxiosResponse, type InternalAxiosRequestConfig } from "axios"
import { afterEach, describe, expect, it } from "vitest"

import { api, definirTokenDeAcesso } from "@/services/apiClient"

// LGPD-08: o cancelamento vale pelo token do login, sem sessão aberta

const adapterOriginal = api.defaults.adapter

function responder(status: number) {
  const enviadas: InternalAxiosRequestConfig[] = []
  api.defaults.adapter = async (config: InternalAxiosRequestConfig) => {
    enviadas.push(config)
    const response: AxiosResponse = { data: {}, status, statusText: "", headers: {}, config }
    if (status < 300) return response
    throw new AxiosError("erro", AxiosError.ERR_BAD_REQUEST, config, null, response)
  }
  return enviadas
}

describe("Rota de cancelamento da exclusão", () => {
  afterEach(() => {
    api.defaults.adapter = adapterOriginal
    definirTokenDeAcesso(null)
  })

  it("sai sem Authorization mesmo com um token antigo na memória", async () => {
    definirTokenDeAcesso("token-antigo")
    const enviadas = responder(200)

    await api.post("/auth/cancel-deletion/", { cancel_token: "x" })

    expect(enviadas).toHaveLength(1)
    expect(enviadas[0].headers.get("Authorization")).toBeFalsy()
  })
})
