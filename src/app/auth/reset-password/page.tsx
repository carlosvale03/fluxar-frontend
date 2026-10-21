"use client"

import { useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import { z } from "zod"
import { Button } from "@/components/ui/button"
import { AuthShell } from "@/components/auth/auth-shell"
import Link from "next/link"
import { useState, Suspense } from "react"
import { toast } from "sonner"
import { api, mensagemDeErro } from "@/services/apiClient"
import { useRouter, useSearchParams } from "next/navigation"
import { AlertCircle, Loader2, KeyRound, AlertTriangle } from "lucide-react"
import { PasswordInput } from "@/components/ui/password-input"

const resetSchema = z.object({
  newPassword: z.string()
    .min(1, "A nova senha é obrigatória")
    .min(8, "A nova senha deve ter pelo menos 8 caracteres")
    .refine((val) => !/^\d+$/.test(val), {
      message: "A senha não pode ser puramente numérica",
    }),
  confirmPassword: z.string().min(1, "A confirmação de senha é obrigatória"),
}).refine((data) => data.newPassword === data.confirmPassword, {
  message: "As senhas não conferem",
  path: ["confirmPassword"],
})

type ResetForm = z.infer<typeof resetSchema>

// Campo do backend -> campo do formulário (AUTH-22)
const CAMPOS_DO_BACKEND: Record<string, keyof ResetForm> = {
  new_password: "newPassword",
  new_password_confirm: "confirmPassword",
}

function ResetPasswordContent() {
  const [isLoading, setIsLoading] = useState(false)
  const [linkInvalido, setLinkInvalido] = useState<string | null>(null)
  const router = useRouter()
  const searchParams = useSearchParams()
  const token = searchParams.get("token")
  
  const { register, handleSubmit, setError, formState: { errors } } = useForm<ResetForm>({
    resolver: zodResolver(resetSchema),
  })

  const onSubmit = async (data: ResetForm) => {
    if (!token) {
        toast.error("Token inválido ou ausente.")
        return
    }

    try {
      setIsLoading(true)
      // Os campos que o backend espera (AUTH-23)
      const response = await api.post("/auth/reset-password/", {
        token,
        new_password: data.newPassword,
        new_password_confirm: data.confirmPassword,
      })
      toast.success(response.data.message)
      router.push("/auth/login")
    } catch (error) {
      console.error(error)
      const backendErrors = (error as { response?: { data?: Record<string, unknown> } }).response?.data

      // Link vencido ou já usado: mostra a mensagem e oferece pedir outro (AUTH-21)
      if (backendErrors?.code === "invalid_link") {
        setLinkInvalido(mensagemDeErro(error))
        return
      }

      let temErroDeCampo = false
      for (const [chave, campo] of Object.entries(CAMPOS_DO_BACKEND)) {
        const mensagens = backendErrors?.[chave]
        if (mensagens) {
          setError(campo, { message: Array.isArray(mensagens) ? mensagens.join(" ") : String(mensagens) })
          temErroDeCampo = true
        }
      }

      if (!temErroDeCampo) {
        toast.error(mensagemDeErro(error, "Erro ao redefinir senha. O link pode ter expirado."))
      }
    } finally {
      setIsLoading(false)
    }
  }

  if (!token || linkInvalido) {
    return (
      <AuthShell title="Link Inválido" description="O link de recuperação parece estar incompleto ou expirado.">
        <div className="flex flex-col items-center space-y-5 py-2">
          <div className="flex h-12 w-12 items-center justify-center rounded-full border border-border-strong text-outflow">
            <AlertTriangle className="h-6 w-6" aria-hidden="true" />
          </div>
          <p className="text-center text-sm leading-relaxed text-muted-foreground">
            {linkInvalido ?? "Por questões de segurança, links de recuperação expiram em 1 hora. Solicite um novo link para continuar."}
          </p>
          <Button asChild variant="outline" className="w-full max-md:h-11">
            <Link href="/auth/forgot-password">Solicitar Novo Link</Link>
          </Button>
        </div>
      </AuthShell>
    )
  }

  return (
    <AuthShell
      title="Nova Senha"
      description="Escolha uma senha forte para proteger sua conta no Azimute."
    >
      <form onSubmit={handleSubmit(onSubmit)} className="space-y-5">
        <div className="space-y-1.5">
          <label className="text-sm font-medium text-fg-secondary" htmlFor="newPassword">
            Nova Senha de Acesso
          </label>
          <PasswordInput
            id="newPassword"
            autoComplete="new-password"
            placeholder="Digite sua nova senha"
            aria-invalid={errors.newPassword ? true : undefined}
            {...register("newPassword")}
          />
          {errors.newPassword && (
            <p className="flex items-center gap-1.5 text-xs text-outflow">
              <AlertCircle className="h-3.5 w-3.5 shrink-0" aria-hidden="true" />
              {errors.newPassword.message}
            </p>
          )}
        </div>

        <div className="space-y-1.5">
          <label className="text-sm font-medium text-fg-secondary" htmlFor="confirmPassword">
            Confirmar Nova Senha
          </label>
          <PasswordInput
            id="confirmPassword"
            autoComplete="new-password"
            placeholder="Repita a nova senha"
            aria-invalid={errors.confirmPassword ? true : undefined}
            {...register("confirmPassword")}
          />
          {errors.confirmPassword && (
            <p className="flex items-center gap-1.5 text-xs text-outflow">
              <AlertCircle className="h-3.5 w-3.5 shrink-0" aria-hidden="true" />
              {errors.confirmPassword.message}
            </p>
          )}
        </div>

        <Button
          type="submit"
          className="w-full max-md:h-11"
          loading={isLoading}
          disabled={isLoading}
        >
          Atualizar Senha
          <KeyRound className="h-4 w-4" aria-hidden="true" />
        </Button>
      </form>
    </AuthShell>
  )
}

export default function ResetPasswordPage() {
  return (
    <Suspense fallback={
      <div className="flex min-h-screen items-center justify-center bg-background">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" aria-hidden="true" />
      </div>
    }>
      <ResetPasswordContent />
    </Suspense>
  )
}
