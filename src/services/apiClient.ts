import axios from "axios"

import { renovarSessao } from "@/lib/sessao-entre-abas"

import { serverStatusManager } from "./serverStatus"

const SHOULD_SHOW_WAKEUP = process.env.NEXT_PUBLIC_SHOW_WAKEUP_MESSAGE === "true"

// Toda requisição tem tempo máximo (AD-024)
export const TEMPO_MAXIMO_MS = 30_000

export const api = axios.create({
  // Mesma origem da página; o Next.js faz o rewrite para o backend (AD-036)
  baseURL: "/api",
  timeout: TEMPO_MAXIMO_MS,
  headers: {
    "Content-Type": "application/json",
  },
})

// Rotas públicas de autenticação: saem sem token, e um 401 delas não renova a
// sessão nem redireciona para o login (AUTH-41). A renovação e o logout usam
// só o cookie de renovação.
export const ROTAS_PUBLICAS = [
  "/auth/register/",
  "/auth/login/",
  "/auth/verify-email/",
  "/auth/resend-verification/",
  "/auth/forgot-password/",
  "/auth/reset-password/",
  "/auth/refresh/",
  "/auth/logout/",
]

// O token de acesso fica só na memória da aba (SESSAO-02)
let tokenDeAcesso: string | null = null

export const definirTokenDeAcesso = (token: string | null) => {
  tokenDeAcesso = token
}

export const obterTokenDeAcesso = () => tokenDeAcesso

// Apaga os tokens que as versões antigas guardavam no localStorage (SESSAO-06)
export const limparTokensAntigos = () => {
  localStorage.removeItem("fluxar.token")
  localStorage.removeItem("fluxar.refresh_token")
}

const ehRotaPublica = (url?: string) => {
  const caminho = (url ?? "").split("?")[0]
  return ROTAS_PUBLICAS.some((rota) => caminho.endsWith(rota))
}

// Mensagem do backend para exibir na tela, inclusive a do 429 (AUTH-36)
export const mensagemDeErro = (
  error: unknown,
  fallback = "Não foi possível concluir. Tente novamente.",
) => {
  const detail = (error as { response?: { data?: { detail?: unknown } } } | null)?.response?.data?.detail
  return typeof detail === "string" ? detail : fallback
}

// Intercept requests to add tokens and monitor status
api.interceptors.request.use((config) => {
  if (ehRotaPublica(config.url)) {
    config.headers.delete("Authorization")
  } else if (tokenDeAcesso) {
    config.headers.Authorization = `Bearer ${tokenDeAcesso}`
  }

  // Monitoramento de Wake-up
  if (SHOULD_SHOW_WAKEUP) {
      const requestId = Math.random().toString(36).substring(7)
      // @ts-ignore
      config._requestId = requestId
      serverStatusManager.startRequest(requestId)
  }
  
  return config
})

// Avisados quando a renovação é recusada com 401; o AuthProvider encerra a
// sessão e leva ao login (SESSAO-11)
const ouvintesDaSessaoEncerrada = new Set<() => void>()

export const aoSessaoEncerrada = (ouvinte: () => void) => {
  ouvintesDaSessaoEncerrada.add(ouvinte)
  return () => {
    ouvintesDaSessaoEncerrada.delete(ouvinte)
  }
}

// Intercept responses to handle auth errors and monitor status
api.interceptors.response.use(
  (response) => {
    // @ts-ignore
    const requestId = response.config?._requestId
    if (requestId) serverStatusManager.endRequest(requestId)
    return response
  },
  async (error) => {
    // @ts-ignore
    const requestId = error.config?._requestId
    if (requestId) serverStatusManager.endRequest(requestId)

    const originalRequest = error.config

    if (error.response?.status === 503) {
        // Se for 503, assumimos que é manutenção ou sobrecarga.
        // Se tiver o código 'maintenance_mode' ou o texto sugerir manutenção, redirecionamos.
        const isMaintenance = error.response?.data?.code === 'maintenance_mode' || 
                             (error.response?.data?.detail && error.response?.data?.detail.toLowerCase().includes('manutenção')) ||
                             (!error.response?.data && error.response?.status === 503); // Caso de erro genérico 503 sem corpo JSON

        if (isMaintenance) {
            if (typeof window !== "undefined" && window.location.pathname !== "/manutencao") {
                window.location.href = "/manutencao"
            }
        }
        return Promise.reject(error)
    }

    if (error.response?.status === 401 && !originalRequest._retry && !ehRotaPublica(originalRequest?.url)) {
        // Uma renovação só para as requisições e abas, e uma nova tentativa
        // por requisição (SESSAO-10); o interceptor de envio põe o token novo
        originalRequest._retry = true
        try {
            await renovarSessao()
        } catch (erroDaRenovacao) {
            // Só a recusa encerra a sessão; rede, tempo esgotado e 5xx não (SESSAO-12)
            if (axios.isAxiosError(erroDaRenovacao) && erroDaRenovacao.response?.status === 401) {
                definirTokenDeAcesso(null)
                ouvintesDaSessaoEncerrada.forEach((ouvinte) => ouvinte())
            }
            return Promise.reject(erroDaRenovacao)
        }
        return api(originalRequest)
    }
    return Promise.reject(error)
  }
)