import axios from "axios"

import { serverStatusManager } from "./serverStatus"

const SHOULD_SHOW_WAKEUP = process.env.NEXT_PUBLIC_SHOW_WAKEUP_MESSAGE === "true"

export const api = axios.create({
  baseURL: process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000/api",
  headers: {
    "Content-Type": "application/json",
  },
})

// Rotas públicas de autenticação: saem sem token, e um 401 delas não renova a
// sessão nem redireciona para o login (AUTH-41)
export const ROTAS_PUBLICAS = [
  "/auth/register/",
  "/auth/login/",
  "/auth/verify-email/",
  "/auth/resend-verification/",
  "/auth/forgot-password/",
  "/auth/reset-password/",
]

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
  const token = localStorage.getItem("fluxar.token")
  
  if (ehRotaPublica(config.url)) {
    // Remove também o token que a renovação deixa nos cabeçalhos padrão
    config.headers.delete("Authorization")
  } else if (token) {
    config.headers.Authorization = `Bearer ${token}`
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

// Queue to hold requests while refreshing token
let isRefreshing = false
let failedQueue: any[] = []

const processQueue = (error: any, token: string | null = null) => {
    failedQueue.forEach(prom => {
        if (error) {
            prom.reject(error)
        } else {
            prom.resolve(token)
        }
    })
    
    failedQueue = []
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
        if (isRefreshing) {
            return new Promise(function(resolve, reject) {
                failedQueue.push({resolve, reject})
            }).then(token => {
                originalRequest.headers['Authorization'] = 'Bearer ' + token
                return api(originalRequest)
            }).catch(err => {
                return Promise.reject(err)
            })
        }

        originalRequest._retry = true
        isRefreshing = true

        const refreshToken = localStorage.getItem("fluxar.refresh_token")

        if (refreshToken) {
            try {
                 const response = await axios.post(
                     `${process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000/api"}/auth/refresh/`, 
                     { refresh: refreshToken }
                 )

                 const { access } = response.data
                 
                 localStorage.setItem("fluxar.token", access)
                 api.defaults.headers.common['Authorization'] = 'Bearer ' + access
                 originalRequest.headers['Authorization'] = 'Bearer ' + access
                 
                 processQueue(null, access)
                 return api(originalRequest)
            } catch (err) {
                 processQueue(err, null)
                 // Logout user if refresh fails
                 localStorage.removeItem("fluxar.token")
                 localStorage.removeItem("fluxar.refresh_token")
                 if (typeof window !== "undefined") {
                     window.location.href = "/auth/login"
                 }
                 return Promise.reject(err)
            } finally {
                isRefreshing = false
            }
        } else {
             localStorage.removeItem("fluxar.token")
             if (typeof window !== "undefined") {
                 window.location.href = "/auth/login"
             }
        }
    }
    return Promise.reject(error)
  }
)