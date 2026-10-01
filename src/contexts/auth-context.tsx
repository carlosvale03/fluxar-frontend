"use client"

import {
  createContext,
  useContext,
  useEffect,
  useState,
  ReactNode,
} from "react"
import { useRouter } from "next/navigation"

import { renovarSessao } from "@/lib/sessao-entre-abas"
import {
  aoSessaoEncerrada,
  api,
  definirTokenDeAcesso,
  limparTokensAntigos,
} from "@/services/apiClient"

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
  plan: "COMMON" | "PREMIUM" | "PREMIUM_PLUS"
  role: "USER" | "ADMIN"
  emailVerified: boolean
  cpf: string | null
  phone_number: string | null
  avatar_url: string | null
  date_of_birth: string | null
  monthly_income: number | null
  preferences: UserPreferences
  is_active?: boolean
  created_at: string
}

interface AuthContextType {
  user: User | null
  isAuthenticated: boolean
  isLoading: boolean
  // O servidor não respondeu ao abrir a sessão: ela continua, e a tela oferece
  // tentar de novo (SESSAO-12)
  erroDeConexao: boolean
  tentarDeNovo: () => Promise<void>
  login: (token: string, refreshToken?: string, user?: User) => Promise<void>
  logout: () => void
  refreshUser: () => Promise<void>
}

const AuthContext = createContext<AuthContextType>({} as AuthContextType)

// Sem resposta, tempo esgotado ou 5xx: o servidor não respondeu, e a sessão
// não é dada como encerrada (SESSAO-12)
const ehFalhaDeConexao = (error: unknown) => {
  const status = (error as { response?: { status?: number } } | null)?.response?.status
  return status === undefined || status >= 500
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null)
  const [estado, setEstado] = useState<"carregando" | "pronto" | "erro">("carregando")
  const router = useRouter()

  const refreshUser = async () => {
    const response = await api.get("/auth/me/")
    setUser(response.data)
  }

  // Um 401 do /auth/me/ já passou pela renovação no apiClient
  const carregarUsuario = async () => {
    try {
      await refreshUser()
      setEstado("pronto")
    } catch (error) {
      setEstado(ehFalhaDeConexao(error) ? "erro" : "pronto")
    }
  }

  // A página carregada renova pelo cookie antes de pedir os dados (SESSAO-03);
  // a renovação recusada só deixa a sessão fechada, e o AuthGuard leva ao login
  const iniciarSessao = () =>
    renovarSessao().then(carregarUsuario, (error: unknown) => {
      setEstado(ehFalhaDeConexao(error) ? "erro" : "pronto")
    })

  const tentarDeNovo = async () => {
    setEstado("carregando")
    await iniciarSessao()
  }

  // Fim da sessão na aba (SESSAO-14). Pode chegar várias vezes seguidas, e
  // repetir não muda nada. Numa página protegida, o AuthGuard leva ao login.
  const encerrarSessaoLocal = () => {
    definirTokenDeAcesso(null)
    localStorage.removeItem("dashboard_layout_config")
    setUser(null)
    setEstado("pronto")
  }

  useEffect(() => {
    limparTokensAntigos()
    const cancelar = aoSessaoEncerrada(encerrarSessaoLocal)
    iniciarSessao()
    return cancelar
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
        isLoading: estado === "carregando",
        erroDeConexao: estado === "erro",
        tentarDeNovo,
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
