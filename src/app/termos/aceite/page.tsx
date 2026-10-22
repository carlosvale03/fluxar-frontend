"use client"

import { useEffect, useState } from "react"
import Link from "next/link"
import { useRouter } from "next/navigation"
import { format } from "date-fns"
import { ptBR } from "date-fns/locale"
import { FileText, Loader2 } from "lucide-react"

import { useAuth } from "@/hooks/use-auth"
import { ExcluirConta } from "@/components/privacidade/excluir-conta"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardFooter, CardHeader } from "@/components/ui/card"
import { lerData } from "@/lib/datas"
import { tratarErro } from "@/lib/erros"
import { CHAVE_DA_VOLTA_DOS_TERMOS } from "@/services/apiClient"
import { termosService, type TermosVigentes } from "@/services/termos"

// LGPD-28 e LGPD-29: a versão nova dos termos precisa ser aceita antes das
// outras telas. Daqui o usuário também baixa os dados e pede a exclusão, que
// continuam liberados sem o aceite.
export default function AceiteDosTermosPage() {
  const { isAuthenticated, isLoading, refreshUser, logout } = useAuth()
  const router = useRouter()
  const [termos, setTermos] = useState<TermosVigentes | null>(null)
  const [aceitando, setAceitando] = useState(false)

  const carregar = () => {
    termosService.obter().then(setTermos, (error: unknown) => {
      tratarErro(error, { mensagemPadrao: "Não foi possível carregar os termos.", tentarDeNovo: carregar })
    })
  }

  useEffect(() => {
    carregar()
  }, [])

  // Sem sessão, não há o que aceitar: o aceite vem depois do login
  useEffect(() => {
    if (!isLoading && !isAuthenticated) router.push("/auth/login")
  }, [isLoading, isAuthenticated, router])

  const aceitar = async () => {
    if (!termos) return
    try {
      setAceitando(true)
      await termosService.aceitar(termos.version)
      await refreshUser()
      const volta = sessionStorage.getItem(CHAVE_DA_VOLTA_DOS_TERMOS)
      sessionStorage.removeItem(CHAVE_DA_VOLTA_DOS_TERMOS)
      router.replace(volta && volta !== "/termos/aceite" ? volta : "/dashboard")
    } catch (error) {
      tratarErro(error, { mensagemPadrao: "Não foi possível registrar o aceite. Tente de novo." })
      // Outra versão passou a valer enquanto a tela estava aberta
      carregar()
    } finally {
      setAceitando(false)
    }
  }

  if (isLoading || !isAuthenticated) {
    return (
      <div className="flex min-h-[60vh] w-full items-center justify-center">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" aria-hidden="true" />
      </div>
    )
  }

  return (
    <div className="container mx-auto max-w-2xl space-y-6 px-4 py-10">
      <Card>
        <CardHeader className="p-5 pb-4 sm:p-6 sm:pb-4">
          <div className="flex items-start gap-3">
            <FileText className="mt-1 h-5 w-5 shrink-0 text-muted-foreground" aria-hidden="true" />
            <div className="space-y-1">
              <h1 className="display-m">Os termos mudaram</h1>
              <CardDescription>
                {termos
                  ? `Versão ${termos.version}, em vigor desde ${format(lerData(termos.effective_date), "d 'de' MMMM 'de' yyyy", { locale: ptBR })}.`
                  : "Carregando a versão nova"}
              </CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent className="space-y-4 px-5 py-2 sm:px-6">
          <p className="text-sm text-fg-secondary">
            Para continuar usando o Azimute, aceite a versão nova dos Termos de Uso e da Política de Privacidade. O que mudou:
          </p>
          {termos && (
            <ul className="list-inside list-disc space-y-2 text-sm text-foreground">
              {termos.changes.map((mudanca) => (
                <li key={mudanca}>{mudanca}</li>
              ))}
            </ul>
          )}
          <Link href="/termos" target="_blank" className="inline-block rounded-sm text-sm font-medium text-gold-line underline-offset-4 hover:underline">
            Ler os termos e a política completos
          </Link>
        </CardContent>
        <CardFooter className="flex flex-col gap-3 px-5 pb-5 pt-4 sm:flex-row sm:px-6 sm:pb-6">
          <Button
            type="button"
            onClick={aceitar}
            loading={aceitando}
            disabled={!termos || aceitando}
            className="w-full max-md:h-11 sm:w-auto"
          >
            Aceitar e continuar
          </Button>
          <Button type="button" variant="ghost" onClick={logout} className="w-full max-md:h-11 sm:w-auto">
            Sair
          </Button>
        </CardFooter>
      </Card>

      <p className="text-center text-sm text-muted-foreground">
        Se não quiser aceitar, você pode baixar os seus dados e excluir a sua conta.
      </p>
      <ExcluirConta />
    </div>
  )
}
