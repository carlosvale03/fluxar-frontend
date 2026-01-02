"use client"

import {
  createContext,
  useContext,
  useEffect,
  useState,
  ReactNode,
} from "react"
import { api } from "@/services/apiClient"
import { useRouter } from "next/navigation"

export interface UserPreferences {
  currency: string
  theme: "light" | "dark" | "system"
  language: string
  notifications: {
    email?: boolean
    push?: boolean
    marketing?: boolean
  }
}

export interface User {
  id: string
  name: string
  email: string
  plan: "common" | "premium" | "premium_plus"
  emailVerified: boolean
  cpf: string | null
  phone_number: string | null
  avatar_url: string | null
  date_of_birth: string | null
  monthly_income: number | null
  preferences: UserPreferences
  created_at: string
}

interface AuthContextType {
  user: User | null
  isAuthenticated: boolean
  isLoading: boolean
  login: (token: string, refreshToken?: string, user?: User) => Promise<void>
  logout: () => void
  refreshUser: () => Promise<void>
}

const AuthContext = createContext<AuthContextType>({} as AuthContextType)

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const router = useRouter()

  const refreshUser = async () => {
    try {
      // Assuming GET /auth/me returns the user data
      const response = await api.get("/auth/me/")
      setUser(response.data)
    } catch {
      logout()
    } finally {
      setIsLoading(false)
    }
  }

  useEffect(() => {
    const token = localStorage.getItem("fluxar.token")
    if (token) {
      refreshUser()
    } else {
      setIsLoading(false)
    }
  }, [])

  const login = async (token: string, refreshToken?: string, newUser?: User) => {
    localStorage.setItem("fluxar.token", token)
    if (refreshToken) {
        localStorage.setItem("fluxar.refresh_token", refreshToken)
    }
    
    if (newUser) {
      setUser(newUser)
    } else {
      try {
        await refreshUser()
      } catch (error) {
        console.error("Failed to fetch user on login", error)
        // If fetch fails, we might want to logout or handle it. 
        // For now, let's assume it works or the interceptor handles 401.
      }
    }
    
    router.push("/dashboard")
  }

  const logout = () => {
    localStorage.removeItem("fluxar.token")
    localStorage.removeItem("fluxar.refresh_token")
    setUser(null)
    router.push("/auth/login")
  }

  return (
    <AuthContext.Provider
      value={{
        user,
        isAuthenticated: !!user,
        isLoading,
        login,
        logout,
        refreshUser,
      }}
    >
      {children}
    </AuthContext.Provider>
  )
}

export const useAuth = () => useContext(AuthContext)
