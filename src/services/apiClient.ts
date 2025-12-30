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

// Intercept responses to handle auth errors
api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      if (typeof window !== "undefined") {
        // Only redirect logic here if not managing state via context to avoid circular dependency
        // Ideally the context catches this via event listener or just checks isAuthenticated
      }
    }
    return Promise.reject(error)
  }
)