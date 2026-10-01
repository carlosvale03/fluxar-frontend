"use client"

import { useEffect } from "react"
import { useRouter } from "next/navigation"
import { useAuth } from "@/contexts/auth-context"
import { Loader2 } from "lucide-react"
import { AvisoDeConexao } from "@/components/sessao/aviso-de-conexao"

export default function AdminGuard({ children }: { children: React.ReactNode }) {
  const { user, isAuthenticated, isLoading, erroDeConexao, tentarDeNovo } = useAuth()
  const router = useRouter()

  useEffect(() => {
    // Sem resposta do servidor, a sessão não é dada como encerrada (SESSAO-12)
    if (!isLoading && !erroDeConexao) {
        if (!isAuthenticated) {
            router.push("/auth/login")
        } else if (user?.role !== "ADMIN") {
            router.push("/dashboard")
        }
    }
  }, [isLoading, isAuthenticated, erroDeConexao, user, router])

  if (isLoading) {
    return (
      <div className="flex h-screen w-full items-center justify-center bg-background">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    )
  }

  if (erroDeConexao) {
    return <AvisoDeConexao onTentarDeNovo={tentarDeNovo} />
  }

  if (!isAuthenticated || user?.role !== "ADMIN") {
    return null
  }

  return <>{children}</>
}
