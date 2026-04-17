import axios from "axios"

export const api = axios.create({
  baseURL: process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000/api",
  headers: {
    "Content-Type": "application/json",
  },
})

// Intercept requests to add types
api.interceptors.request.use((config) => {
  const token = localStorage.getItem("fluxar.token")
  
  if (token) {
    config.headers.Authorization = `Bearer ${token}`
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

// Intercept responses to handle auth errors
api.interceptors.response.use(
  (response) => response,
  async (error) => {
    const originalRequest = error.config

    if (error.response?.status === 401 && !originalRequest._retry) {
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