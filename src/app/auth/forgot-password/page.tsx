"use client"

import { useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import { z } from "zod"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { AuthShell } from "@/components/auth/auth-shell"
import Link from "next/link"
import { useState } from "react"
import { toast } from "sonner"
import { api, mensagemDeErro } from "@/services/apiClient"
import { AlertCircle, ChevronLeft, CheckCircle2, ArrowRight } from "lucide-react"

const forgotSchema = z.object({
  email: z.string().email("Por favor, informe um e-mail válido"),
})

type ForgotForm = z.infer<typeof forgotSchema>

export default function ForgotPasswordPage() {
  const [isLoading, setIsLoading] = useState(false)
  const [success, setSuccess] = useState(false)
  const [mensagem, setMensagem] = useState("")

  const { register, handleSubmit, formState: { errors } } = useForm<ForgotForm>({
    resolver: zodResolver(forgotSchema),
  })

  const onSubmit = async (data: ForgotForm) => {
    try {
      setIsLoading(true)
      // A resposta é neutra: não diz se o e-mail está cadastrado (AUTH-18)
      const response = await api.post("/auth/forgot-password/", data)
      setMensagem(response.data.message)
      setSuccess(true)
      toast.success(response.data.message)
    } catch (error) {
      console.error(error)
      toast.error(mensagemDeErro(error, "Ocorreu um erro. Tente novamente mais tarde."))
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <AuthShell
      title="Recuperar Senha"
      description={success
        ? "Pedido recebido. Confira a mensagem abaixo."
        : "Informe seu e-mail e enviaremos um link para você criar uma nova senha."
      }
    >
      {success ? (
        <div className="space-y-5 py-2 text-center">
          <div className="flex justify-center">
            <div className="flex h-12 w-12 items-center justify-center rounded-full border border-border-strong text-inflow">
              <CheckCircle2 className="h-6 w-6" aria-hidden="true" />
            </div>
          </div>

          <div className="space-y-2">
            <h2 className="display-s">Verifique sua caixa de entrada</h2>
            <p className="text-sm leading-relaxed text-muted-foreground">{mensagem}</p>
            <p className="text-sm leading-relaxed text-muted-foreground">
              O link vale por 1 hora. Se não encontrar, verifique sua pasta de <strong className="font-semibold text-foreground">spam</strong>.
            </p>
          </div>

          <Button asChild variant="outline" className="w-full max-md:h-11">
            <Link href="/auth/login">Voltar para o Login</Link>
          </Button>
        </div>
      ) : (
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-5">
          <div className="space-y-1.5">
            <label className="text-sm font-medium text-fg-secondary" htmlFor="email">
              Seu E-mail Cadastrado
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

          <Button
            type="submit"
            className="w-full max-md:h-11"
            loading={isLoading}
            disabled={isLoading}
          >
            Enviar Link de Recuperação
            <ArrowRight className="h-4 w-4" aria-hidden="true" />
          </Button>

          <div className="text-center">
            <Link
              href="/auth/login"
              className="inline-flex items-center gap-1 rounded-sm text-sm text-muted-foreground transition-colors duration-fast ease-az-out hover:text-foreground"
            >
              <ChevronLeft className="h-4 w-4" aria-hidden="true" />
              Voltar para o Início
            </Link>
          </div>
        </form>
      )}
    </AuthShell>
  )
}
