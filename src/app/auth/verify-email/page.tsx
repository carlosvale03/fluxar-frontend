"use client"

import { useEffect, useRef, useState, Suspense } from "react"
import { useSearchParams } from "next/navigation"
import { api, mensagemDeErro } from "@/services/apiClient"
import { AuthShell } from "@/components/auth/auth-shell"
import { ResendVerification } from "@/components/auth/resend-verification"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Loader2, CheckCircle2, XCircle, ArrowRight } from "lucide-react"
import Link from "next/link"

import { useAuth } from "@/contexts/auth-context"

const LINK_INVALIDO = "Este link de verificação é inválido ou venceu. Peça um novo e-mail abaixo."

function VerifyEmailContent() {
  const searchParams = useSearchParams()
  const token = searchParams.get("token")
  const { login } = useAuth()
  const [status, setStatus] = useState<"loading" | "success" | "error">("loading")
  const [tokens, setTokens] = useState<{access: string} | null>(null)
  const [mensagemErro, setMensagemErro] = useState(LINK_INVALIDO)
  const [emailReenvio, setEmailReenvio] = useState("")
  // O link só pode ser usado uma vez: o StrictMode roda o efeito duas vezes em desenvolvimento
  const tokenVerificado = useRef<string | null>(null)

  useEffect(() => {
    if (!token) {
      setStatus("error")
      return
    }
    if (tokenVerificado.current === token) return
    tokenVerificado.current = token

    const verify = async () => {
      try {
        const response = await api.get(`/auth/verify-email/?token=${token}`)
        setTokens({ access: response.data.access })
        setStatus("success")
      } catch (error) {
        console.error(error)
        setMensagemErro(mensagemDeErro(error, LINK_INVALIDO))
        setStatus("error")
      }
    }

    verify()
  }, [token])

  const handleAccessAccount = async () => {
    if (tokens) {
      await login(tokens.access)
    }
  }

  return (
    <AuthShell
      title="Verificação de e-mail"
      description={status === "loading" ? "Confirmando o seu e-mail." : "Verificação concluída."}
    >
      <div className="flex flex-col items-center justify-center py-2">
        {status === "loading" && (
          <div className="flex flex-col items-center space-y-4" role="status">
            <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" aria-hidden="true" />
            <p className="label text-muted-foreground">Verificando</p>
          </div>
        )}

        {status === "success" && (
          <div className="flex w-full flex-col items-center space-y-5">
            <div className="flex h-12 w-12 items-center justify-center rounded-full border border-border-strong text-inflow">
              <CheckCircle2 className="h-6 w-6" aria-hidden="true" />
            </div>
            <div className="space-y-2 text-center">
              <h2 className="display-m">E-mail confirmado</h2>
              <p className="text-sm leading-relaxed text-muted-foreground">
                Sua conta no Azimute está <strong className="font-semibold text-foreground">ativa</strong>.
              </p>
            </div>
            <Button onClick={handleAccessAccount} className="w-full max-md:h-11">
              Entrar na conta
              <ArrowRight className="h-4 w-4" aria-hidden="true" />
            </Button>
          </div>
        )}

        {status === "error" && (
          <div className="flex w-full flex-col items-center space-y-5">
            <div className="flex h-12 w-12 items-center justify-center rounded-full border border-border-strong text-outflow">
              <XCircle className="h-6 w-6" aria-hidden="true" />
            </div>
            <div className="space-y-2 text-center">
              <h2 className="display-m">Não foi possível verificar</h2>
              <p className="text-sm leading-relaxed text-muted-foreground">{mensagemErro}</p>
            </div>
            {/* O link não diz de qual conta é: o reenvio pede o e-mail (AUTH-09) */}
            <div className="w-full space-y-1.5">
              <label className="text-sm font-medium text-fg-secondary" htmlFor="email-reenvio">
                Seu e-mail
              </label>
              <Input
                id="email-reenvio"
                type="email"
                autoComplete="email"
                placeholder="exemplo@email.com"
                value={emailReenvio}
                onChange={(event) => setEmailReenvio(event.target.value)}
              />
            </div>
            <ResendVerification email={emailReenvio.trim()} />
            <Button asChild variant="ghost" className="w-full max-md:h-11">
              <Link href="/auth/login">Voltar para o login</Link>
            </Button>
          </div>
        )}
      </div>
    </AuthShell>
  )
}

export default function VerifyEmailPage() {
  return (
    <Suspense fallback={
      <div className="flex min-h-screen items-center justify-center bg-background">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" aria-hidden="true" />
      </div>
    }>
      <VerifyEmailContent />
    </Suspense>
  )
}
