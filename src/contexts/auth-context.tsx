"use client"

import {
  createContext,
  useContext,
  useEffect,
  useState,
  ReactNode,
  useRef,
} from "react"
import { useRouter } from "next/navigation"
import { useTheme } from "next-themes"

import { anunciarFimDaSessao, aoFimDaSessao, renovarSessao } from "@/lib/sessao-entre-abas"
import { registrarAcoesDePlano } from "@/lib/erros"
import type { Acesso, Plano } from "@/types/planos"
import {
  CHAVE_DA_VOLTA_DOS_TERMOS,
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
  plan: Plano
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
  // PERM-17: o que o plano libera para este usuário, informado pelo /auth/me
  access?: Acesso
  // LGPD-28: a versão dos termos aceita e a vigente
  terms?: { accepted_version: string | null; current_version: string }
  // LGPD-34: o consentimento para o uso de dados anonimizados
  product_improvement_consent?: boolean
}

// LGPD-28: sem o aceite da versão vigente, a tela de aceite vem antes das outras
export const PAGINA_DE_ACEITE = "/termos/aceite"

export function precisaAceitarOsTermos(user: User | null): boolean {
  return !!user?.terms && user.terms.accepted_version !== user.terms.current_version
}

// Páginas abertas sem o aceite: os próprios termos e a manutenção
const LIBERADAS_SEM_ACEITE = ["/termos", "/manutencao"]

interface AuthContextType {
  user: User | null
  isAuthenticated: boolean
  isLoading: boolean
  // O servidor não respondeu ao abrir a sessão: ela continua, e a tela oferece
  // tentar de novo (SESSAO-12)
  erroDeConexao: boolean
  // LGPD-28: o usuário ainda não aceitou a versão vigente dos termos
  precisaAceitarTermos: boolean
  tentarDeNovo: () => Promise<void>
  login: (token: string, user?: User) => Promise<void>
  logout: () => Promise<void>
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
  const fimAnunciado = useRef(false)
  const { setTheme } = useTheme()

  // CONTRATO-27: o tema salvo nas preferências vale ao carregar o usuário,
  // em qualquer página; é o único ponto que aplica o tema do usuário
  const temaDoUsuario = user?.preferences?.theme
  useEffect(() => {
    if (temaDoUsuario) setTheme(temaDoUsuario)
  }, [temaDoUsuario, setTheme])

  const refreshUser = async () => {
    const response = await api.get("/auth/me/")
    setUser(response.data)
  }

  // Um 401 do /auth/me/ já passou pela renovação no apiClient
  const carregarUsuario = async () => {
    try {
      await refreshUser()
      fimAnunciado.current = false
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
    // A renovação recusada nesta aba também encerra a sessão nas outras (SESSAO-14);
    // o aviso sai uma vez só por sessão, mesmo com várias recusas seguidas
    const cancelarRecusa = aoSessaoEncerrada(() => {
      encerrarSessaoLocal()
      if (!fimAnunciado.current) {
        fimAnunciado.current = true
        anunciarFimDaSessao()
      }
    })
    // O logout de outra aba já avisou o backend (SESSAO-14)
    const cancelarOutraAba = aoFimDaSessao(encerrarSessaoLocal)
    iniciarSessao()
    return () => {
      cancelarRecusa()
      cancelarOutraAba()
    }
  }, [])

  // PERM-11 e PERM-24: o acesso é relido quando a aba volta a ficar visível e
  // quando a API recusa algo pelo plano (tratarErro), para a tela refletir a
  // trava mudada no painel. Uma falha aqui não muda a sessão.
  const temUsuario = !!user
  useEffect(() => {
    if (!temUsuario) return
    const reler = () => {
      api.get("/auth/me/").then(
        (response) => setUser(response.data),
        () => undefined,
      )
    }
    const aoMudarVisibilidade = () => {
      if (document.visibilityState === "visible") reler()
    }
    document.addEventListener("visibilitychange", aoMudarVisibilidade)
    const cancelarAcoes = registrarAcoesDePlano({ reler, abrirPlanos: () => router.push("/planos") })
    return () => {
      document.removeEventListener("visibilitychange", aoMudarVisibilidade)
      cancelarAcoes()
    }
  }, [temUsuario, router])

  // LGPD-28: ao carregar o usuário sem o aceite da versão vigente, leva à
  // tela de aceite, guardando a página para voltar depois do aceite
  const precisaAceitarTermos = precisaAceitarOsTermos(user)
  useEffect(() => {
    if (!precisaAceitarTermos) return
    const caminho = window.location.pathname
    if (LIBERADAS_SEM_ACEITE.some((pagina) => caminho.startsWith(pagina))) return
    if (!caminho.startsWith("/auth")) {
      sessionStorage.setItem(CHAVE_DA_VOLTA_DOS_TERMOS, caminho + window.location.search)
    }
    router.replace(PAGINA_DE_ACEITE)
  }, [precisaAceitarTermos, router])

  // O token de renovação chega só no cookie httpOnly, e o de acesso fica na
  // memória da aba (SESSAO-01, SESSAO-02)
  const login = async (token: string, newUser?: User) => {
    definirTokenDeAcesso(token)
    fimAnunciado.current = false
    if (newUser) {
      setUser(newUser)
      setEstado("pronto")
    } else {
      await carregarUsuario()
    }

    router.push("/dashboard")
  }

  // Revoga a sessão no backend (SESSAO-13); sem resposta, a sessão termina na
  // aba do mesmo jeito, e as outras abas são avisadas (SESSAO-14)
  const logout = async () => {
    try {
      await api.post("/auth/logout/")
    } catch {
      // O fim local não depende da resposta
    }
    encerrarSessaoLocal()
    anunciarFimDaSessao()
    router.push("/auth/login")
  }

  return (
    <AuthContext.Provider
      value={{
        user,
        isAuthenticated: !!user,
        isLoading: estado === "carregando",
        erroDeConexao: estado === "erro",
        precisaAceitarTermos,
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
