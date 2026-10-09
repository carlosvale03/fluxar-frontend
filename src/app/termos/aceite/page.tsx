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
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
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
      tratarErro(error, { mensagemPadrao: "Não foi possível registrar o aceite." })
      // Outra versão passou a valer enquanto a tela estava aberta
      carregar()
    } finally {
      setAceitando(false)
    }
  }

  if (isLoading || !isAuthenticated) {
    return (
      <div className="flex min-h-[60vh] w-full items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    )
  }

  return (
    <div className="container mx-auto py-10 px-4 max-w-2xl space-y-8 animate-in fade-in duration-500">
      <Card className="rounded-[32px] border-border/60 shadow-sm bg-card overflow-hidden">
        <CardHeader className="p-8 pb-4">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 rounded-2xl bg-primary/5 flex items-center justify-center shadow-sm ring-1 ring-black/5 dark:ring-white/10">
              <FileText className="h-5 w-5 text-primary" />
            </div>
            <div>
              <CardTitle className="text-xl font-bold tracking-tight">Os termos mudaram</CardTitle>
              <CardDescription>
                {termos
                  ? `Versão ${termos.version}, em vigor desde ${format(lerData(termos.effective_date), "d 'de' MMMM 'de' yyyy", { locale: ptBR })}.`
                  : "Carregando a versão nova..."}
              </CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent className="px-8 py-4 space-y-4">
          <p className="text-sm text-muted-foreground">
            Para continuar usando o Fluxar, aceite a versão nova dos Termos de Uso e da Política de Privacidade. O que mudou:
          </p>
          {termos && (
            <ul className="text-sm space-y-2 list-disc list-inside">
              {termos.changes.map((mudanca) => (
                <li key={mudanca}>{mudanca}</li>
              ))}
            </ul>
          )}
          <Link href="/termos" target="_blank" className="text-sm text-primary font-bold hover:underline underline-offset-4">
            Ler os termos e a política completos
          </Link>
        </CardContent>
        <CardFooter className="px-8 pb-8 pt-2 flex flex-col sm:flex-row gap-3">
          <Button
            type="button"
            onClick={aceitar}
            loading={aceitando}
            disabled={!termos || aceitando}
            className="w-full sm:w-auto rounded-full h-11 font-bold"
          >
            Aceitar e continuar
          </Button>
          <Button type="button" variant="ghost" onClick={logout} className="w-full sm:w-auto rounded-full h-11">
            Sair
          </Button>
        </CardFooter>
      </Card>

      <p className="text-sm text-muted-foreground text-center">
        Se não quiser aceitar, você pode baixar os seus dados e excluir a sua conta.
      </p>
      <ExcluirConta />
    </div>
  )
}
