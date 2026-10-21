"use client"

import { useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import { z } from "zod"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { PasswordInput } from "@/components/ui/password-input"
import { AuthShell } from "@/components/auth/auth-shell"
import Link from "next/link"
import { useState } from "react"
import { toast } from "sonner"
import { api, mensagemDeErro } from "@/services/apiClient"
import { useRouter } from "next/navigation"
import { AlertCircle, UserPlus } from "lucide-react"
import { Controller } from "react-hook-form"
import { Checkbox } from "@/components/ui/checkbox"
import { ResendVerification } from "@/components/auth/resend-verification"

const registerSchema = z.object({
  name: z.string()
    .min(1, "O nome completo é obrigatório")
    .min(3, "O nome deve ter pelo menos 3 caracteres"),
  email: z.string()
    .min(1, "O e-mail é obrigatório")
    .email("Informe um e-mail válido"),
  password: z.string()
    .min(1, "A senha é obrigatória")
    .min(8, "A senha deve ter pelo menos 8 caracteres")
    .refine((val) => !/^\d+$/.test(val), {
      message: "A senha não pode ser puramente numérica",
    }),
  confirmPassword: z.string().min(1, "A confirmação de senha é obrigatória"),
  termsAccepted: z.boolean().refine(val => val === true, {
    message: "Você deve aceitar os termos para continuar",
  }),
  // LGPD-33: opcional e desmarcado; o cadastro não depende dele
  productImprovementConsent: z.boolean(),
}).refine((data) => data.password === data.confirmPassword, {
  message: "As senhas não conferem",
  path: ["confirmPassword"],
}).refine((data) => !data.password.toLowerCase().includes(data.email.split('@')[0].toLowerCase()), {
  message: "A senha não pode ser muito parecida com o e-mail",
  path: ["password"],
})

type RegisterForm = z.infer<typeof registerSchema>

// Campo do backend -> campo do formulário, para cada erro aparecer no lugar certo (AUTH-07)
const CAMPOS_DO_BACKEND: Record<string, keyof RegisterForm> = {
  name: "name",
  email: "email",
  password: "password",
  password_confirm: "confirmPassword",
  terms_accepted: "termsAccepted",
  product_improvement_consent: "productImprovementConsent",
}

export default function RegisterPage() {
  const [isLoading, setIsLoading] = useState(false)
  const [envioFalhou, setEnvioFalhou] = useState<{ email: string; mensagem: string } | null>(null)
  const router = useRouter()
  
  const { register, handleSubmit, setError, control, formState: { errors } } = useForm<RegisterForm>({
    resolver: zodResolver(registerSchema),
    defaultValues: {
      termsAccepted: false,
      productImprovementConsent: false,
    }
  })

  const onSubmit = async (data: RegisterForm) => {
    try {
      setIsLoading(true)
      
      const payload = {
        name: data.name,
        email: data.email,
        password: data.password,
        password_confirm: data.confirmPassword,
        terms_accepted: data.termsAccepted,
        product_improvement_consent: data.productImprovementConsent,
      }
      
      const response = await api.post("/auth/register/", payload)
      // A conta foi criada, mas o e-mail não saiu: fica na tela com o reenvio (AUTH-26)
      if (response.data.email_sent === false) {
        setEnvioFalhou({ email: data.email, mensagem: response.data.message })
        return
      }
      toast.success(response.data.message)
      router.push("/auth/login")
    } catch (error) {
      console.error(error)
      const backendErrors = (error as { response?: { data?: Record<string, unknown> } }).response?.data
      let temErroDeCampo = false

      for (const [chave, campo] of Object.entries(CAMPOS_DO_BACKEND)) {
        const mensagens = backendErrors?.[chave]
        if (mensagens) {
          setError(campo, { message: Array.isArray(mensagens) ? mensagens.join(" ") : String(mensagens) })
          temErroDeCampo = true
        }
      }

      if (!temErroDeCampo) {
        const msg = mensagemDeErro(error, "Erro ao realizar cadastro. Tente novamente mais tarde.")
        setError("root", { message: msg })
        toast.error(msg)
      }
    } finally {
      setIsLoading(false)
    }
  }

  if (envioFalhou) {
    return (
      <AuthShell title="Conta criada" description="Falta só confirmar o seu e-mail.">
        <div className="flex flex-col items-center space-y-5 py-2">
          <div className="flex h-12 w-12 items-center justify-center rounded-full border border-border-strong text-warn">
            <AlertCircle className="h-6 w-6" aria-hidden="true" />
          </div>
          <p className="text-center text-sm leading-relaxed text-muted-foreground">
            {envioFalhou.mensagem}
          </p>
          <ResendVerification email={envioFalhou.email} />
          <Link href="/auth/login" className="rounded-sm text-sm font-medium text-gold-line underline-offset-4 hover:underline">
            Ir para o login
          </Link>
        </div>
      </AuthShell>
    )
  }

  return (
    <AuthShell
      title="Crie sua conta"
      description="Comece a controlar suas finanças hoje mesmo com a inteligência do Azimute."
    >
      <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
        {errors.root && (
          <div className="flex items-start gap-3 rounded-r-md border border-border border-l-[3px] border-l-outflow bg-card p-3 text-sm text-foreground">
            <AlertCircle className="mt-0.5 h-4 w-4 shrink-0 text-outflow" aria-hidden="true" />
            <p>{errors.root.message}</p>
          </div>
        )}

        <div className="space-y-1.5">
          <label className={ROTULO} htmlFor="name">
            Nome Completo
          </label>
          <Input
            id="name"
            autoComplete="name"
            placeholder="Informe seu nome completo"
            aria-invalid={errors.name ? true : undefined}
            {...register("name")}
          />
          {errors.name && <ErroDoCampo mensagem={errors.name.message} />}
        </div>

        <div className="space-y-1.5">
          <label className={ROTULO} htmlFor="email">
            Melhor E-mail
          </label>
          <Input
            id="email"
            type="email"
            autoComplete="email"
            placeholder="seu@email.com"
            aria-invalid={errors.email ? true : undefined}
            {...register("email")}
          />
          {errors.email && <ErroDoCampo mensagem={errors.email.message} />}
        </div>

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <div className="space-y-1.5">
            <label className={ROTULO} htmlFor="password">
              Senha
            </label>
            <PasswordInput
              id="password"
              autoComplete="new-password"
              placeholder="******"
              aria-invalid={errors.password ? true : undefined}
              {...register("password")}
            />
            {errors.password && <ErroDoCampo mensagem={errors.password.message} />}
          </div>

          <div className="space-y-1.5">
            <label className={ROTULO} htmlFor="confirmPassword">
              Confirmar
            </label>
            <PasswordInput
              id="confirmPassword"
              autoComplete="new-password"
              placeholder="******"
              aria-invalid={errors.confirmPassword ? true : undefined}
              {...register("confirmPassword")}
            />
            {errors.confirmPassword && <ErroDoCampo mensagem={errors.confirmPassword.message} />}
          </div>
        </div>

        <div className="flex flex-col gap-2 pt-1">
          <div className="flex items-start gap-3 rounded-md border border-border p-3">
            <Controller
              control={control}
              name="termsAccepted"
              render={({ field }) => (
                <Checkbox
                  id="termsAccepted"
                  checked={field.value}
                  onCheckedChange={field.onChange}
                  className="mt-0.5"
                />
              )}
            />
            <div className="flex-1 space-y-1">
              <label
                htmlFor="termsAccepted"
                className="block cursor-pointer text-sm leading-snug text-foreground"
              >
                Eu li e concordo com os <Link href="/termos" target="_blank" className="rounded-sm text-gold-line underline underline-offset-4">Termos de Uso e Política de Privacidade</Link>.
              </label>
              <p className="text-xs text-muted-foreground">
                A conexão com o Azimute é criptografada, e CPF, telefone, data de nascimento e renda ficam criptografados no banco.
              </p>
            </div>
          </div>
          {errors.termsAccepted && <ErroDoCampo mensagem={errors.termsAccepted.message} />}

          <div className="flex items-start gap-3 rounded-md border border-border p-3">
            <Controller
              control={control}
              name="productImprovementConsent"
              render={({ field }) => (
                <Checkbox
                  id="productImprovementConsent"
                  checked={field.value}
                  onCheckedChange={(marcado) => field.onChange(marcado === true)}
                  className="mt-0.5"
                />
              )}
            />
            <div className="flex-1 space-y-1">
              <label
                htmlFor="productImprovementConsent"
                className="block cursor-pointer text-sm leading-snug text-foreground"
              >
                Aceito que meus dados, anonimizados, sejam usados para melhorar o produto e treinar modelos de previsão e de categorização.
              </label>
              <p className="text-xs text-muted-foreground">
                Opcional. Você pode retirar o consentimento a qualquer momento nas configurações.
              </p>
            </div>
          </div>
        </div>

        <Button
          type="submit"
          className="w-full max-md:h-11"
          loading={isLoading}
          disabled={isLoading}
        >
          Criar Minha Conta
          <UserPlus className="h-4 w-4" aria-hidden="true" />
        </Button>

        <p className="text-center text-sm text-muted-foreground">
          Já tem uma conta?{" "}
          <Link href="/auth/login" className="rounded-sm font-medium text-gold-line underline-offset-4 hover:underline">
            Entre aqui
          </Link>
        </p>
      </form>
    </AuthShell>
  )
}

const ROTULO = "text-sm font-medium text-fg-secondary"

function ErroDoCampo({ mensagem }: { mensagem?: string }) {
  return (
    <p className="flex items-start gap-1.5 text-xs leading-snug text-outflow">
      <AlertCircle className="mt-px h-3.5 w-3.5 shrink-0" aria-hidden="true" />
      {mensagem}
    </p>
  )
}
