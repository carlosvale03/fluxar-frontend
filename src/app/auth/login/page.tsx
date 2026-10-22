"use client"

import { useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import { z } from "zod"
import { useAuth } from "@/hooks/use-auth"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { PasswordInput } from "@/components/ui/password-input"
import { AuthShell } from "@/components/auth/auth-shell"
import Link from "next/link"
import { useState } from "react"
import { toast } from "sonner"
import { api, mensagemDeErro } from "@/services/apiClient"
import { ResendVerification } from "@/components/auth/resend-verification"
import { AlertCircle, ArrowRight, Clock } from "lucide-react"
import { tratarErro } from "@/lib/erros"
import { dataDaExclusao } from "@/lib/datas"

// LGPD-07: o login de conta com exclusão marcada traz a data e o token para cancelar
interface ExclusaoPendente {
  deletion_scheduled_for: string
  cancel_token: string
}

const loginSchema = z.object({
  email: z.string()
    .min(1, "O e-mail é obrigatório")
    .email("Informe um e-mail válido"),
  password: z.string()
    .min(1, "A senha é obrigatória"),
})

type LoginForm = z.infer<typeof loginSchema>

export default function LoginPage() {
  const { login } = useAuth()
  const [isLoading, setIsLoading] = useState(false)
  const [emailNaoVerificado, setEmailNaoVerificado] = useState<string | null>(null)
  const [exclusaoPendente, setExclusaoPendente] = useState<ExclusaoPendente | null>(null)
  const [cancelando, setCancelando] = useState(false)

  // LGPD-08: cancela a exclusão com o token do login, reativa a conta e entra
  const cancelarExclusao = async () => {
    if (!exclusaoPendente) return
    try {
      setCancelando(true)
      const response = await api.post("/auth/cancel-deletion/", { cancel_token: exclusaoPendente.cancel_token })
      await login(response.data.access)
      toast.success("A exclusão foi cancelada. Bem-vindo de volta ao Azimute.")
    } catch (error) {
      setExclusaoPendente(null)
      tratarErro(error, { mensagemPadrao: "Não foi possível cancelar a exclusão. Entre de novo." })
    } finally {
      setCancelando(false)
    }
  }

  const { register, handleSubmit, setError, formState: { errors } } = useForm<LoginForm>({
    resolver: zodResolver(loginSchema),
  })

  const onSubmit = async (data: LoginForm) => {
    try {
      setIsLoading(true)
      setEmailNaoVerificado(null)
      setExclusaoPendente(null)
      const response = await api.post("/auth/login/", data)
      await login(response.data.access, response.data.user)
      toast.success("Bem-vindo de volta ao Azimute.")
    } catch (error) {
      const msg = mensagemDeErro(error, "E-mail ou senha incorretos. Tente novamente.")
      setError("root", { message: msg })
      // Conta pendente com a senha certa: oferece o reenvio do link (AUTH-13)
      const dados = (error as { response?: { data?: ExclusaoPendente & { code?: unknown } } }).response?.data
      if (dados?.code === "email_not_verified") {
        setEmailNaoVerificado(data.email)
      }
      // Conta com exclusão marcada: mostra a data e oferece cancelar (LGPD-07)
      if (dados?.code === "deletion_pending" && dados.cancel_token) {
        setExclusaoPendente({
          deletion_scheduled_for: dados.deletion_scheduled_for,
          cancel_token: dados.cancel_token,
        })
      }
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <AuthShell
      title="Acesse sua conta"
      description="Entre com seus dados para continuar sua jornada financeira no Azimute."
    >
      <form onSubmit={handleSubmit(onSubmit)} className="space-y-5">
        {errors.root && (
          <div className="flex items-start gap-3 rounded-r-md border border-border border-l-[3px] border-l-outflow bg-card p-3 text-sm text-foreground">
            <AlertCircle className="mt-0.5 h-4 w-4 shrink-0 text-outflow" aria-hidden="true" />
            <p>{errors.root.message}</p>
          </div>
        )}

        {emailNaoVerificado && <ResendVerification email={emailNaoVerificado} />}

        {exclusaoPendente && (
          <div className="space-y-3 rounded-r-md border border-border border-l-[3px] border-l-warn bg-card p-4">
            <p className="flex items-start gap-2 text-sm text-foreground">
              <Clock className="mt-0.5 h-4 w-4 shrink-0 text-warn" aria-hidden="true" />
              <span>
                A exclusão definitiva desta conta está marcada para{" "}
                <strong className="font-semibold">{dataDaExclusao(exclusaoPendente.deletion_scheduled_for)}</strong>. Cancele a exclusão para
                voltar a usar o Azimute com todos os seus dados.
              </span>
            </p>
            <Button
              type="button"
              variant="outline"
              className="w-full"
              onClick={cancelarExclusao}
              loading={cancelando}
              disabled={cancelando}
            >
              Cancelar exclusão
            </Button>
          </div>
        )}

        <div className="space-y-1.5">
          <label className="text-sm font-medium text-fg-secondary" htmlFor="email">
            Endereço de E-mail
          </label>
          <Input
            id="email"
            type="email"
            autoComplete="email"
            placeholder="exemplo@email.com"
            aria-invalid={errors.email ? true : undefined}
            {...register("email")}
          />
          {errors.email && (
            <p className="flex items-center gap-1.5 text-xs text-outflow">
              <AlertCircle className="h-3.5 w-3.5 shrink-0" aria-hidden="true" />
              {errors.email.message}
            </p>
          )}
        </div>

        <div className="space-y-1.5">
          <div className="flex items-center justify-between gap-2">
            <label className="text-sm font-medium text-fg-secondary" htmlFor="password">
              Senha de Acesso
            </label>
            <Link
              href="/auth/forgot-password"
              title="Recuperar senha"
              className="rounded-sm text-xs text-gold-line underline-offset-4 hover:underline"
            >
              Esqueceu a senha?
            </Link>
          </div>
          <PasswordInput
            id="password"
            autoComplete="current-password"
            placeholder="Digite sua senha"
            aria-invalid={errors.password ? true : undefined}
            {...register("password")}
          />
          {errors.password && (
            <p className="flex items-center gap-1.5 text-xs text-outflow">
              <AlertCircle className="h-3.5 w-3.5 shrink-0" aria-hidden="true" />
              {errors.password.message}
            </p>
          )}
        </div>

        <Button
          type="submit"
          className="w-full max-md:h-11"
          loading={isLoading}
          disabled={isLoading}
        >
          Entrar no Sistema
          <ArrowRight className="h-4 w-4" aria-hidden="true" />
        </Button>

        <p className="text-center text-sm text-muted-foreground">
          Ainda não tem conta?{" "}
          <Link href="/auth/register" className="rounded-sm font-medium text-gold-line underline-offset-4 hover:underline">
            Crie uma agora
          </Link>
        </p>
      </form>
    </AuthShell>
  )
}
