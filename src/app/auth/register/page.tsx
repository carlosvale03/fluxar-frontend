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
    .min(1, "Informe o nome completo.")
    .min(3, "Use pelo menos 3 caracteres no nome."),
  email: z.string()
    .min(1, "Informe o e-mail.")
    .email("Informe um e-mail válido, como nome@exemplo.com."),
  password: z.string()
    .min(1, "Informe a senha.")
    .min(8, "Use pelo menos 8 caracteres na senha.")
    .refine((val) => !/^\d+$/.test(val), {
      message: "A senha não pode ter só números.",
    }),
  confirmPassword: z.string().min(1, "Repita a senha para confirmar."),
  termsAccepted: z.boolean().refine(val => val === true, {
    message: "Aceite os termos para criar a conta.",
  }),
  // LGPD-33: opcional e desmarcado; o cadastro não depende dele
  productImprovementConsent: z.boolean(),
}).refine((data) => data.password === data.confirmPassword, {
  message: "As senhas não conferem. Digite a mesma senha nos dois campos.",
  path: ["confirmPassword"],
}).refine((data) => !data.password.toLowerCase().includes(data.email.split('@')[0].toLowerCase()), {
  message: "A senha não pode ser parecida com o e-mail.",
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
        const msg = mensagemDeErro(error, "Não foi possível criar a conta. Tente de novo em alguns minutos.")
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
      description="Cadastre-se para organizar contas, cartões e lançamentos."
    >
      <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
        {errors.root && (
          <div role="alert" className="flex items-start gap-3 rounded-r-md border border-border border-l-[3px] border-l-outflow bg-card p-3 text-sm text-foreground">
            <AlertCircle className="mt-0.5 h-4 w-4 shrink-0 text-outflow" aria-hidden="true" />
            <p>{errors.root.message}</p>
          </div>
        )}

        <div className="space-y-1.5">
          <label className={ROTULO} htmlFor="name">
            Nome completo
          </label>
          <Input
            id="name"
            autoComplete="name"
            placeholder="Ex.: Ana Souza"
            aria-invalid={errors.name ? true : undefined}
            aria-describedby={errors.name ? "name-erro" : undefined}
            {...register("name")}
          />
          {errors.name && <ErroDoCampo id="name-erro" mensagem={errors.name.message} />}
        </div>

        <div className="space-y-1.5">
          <label className={ROTULO} htmlFor="email">
            E-mail
          </label>
          <Input
            id="email"
            type="email"
            autoComplete="email"
            placeholder="nome@exemplo.com"
            aria-invalid={errors.email ? true : undefined}
            aria-describedby={errors.email ? "email-erro" : undefined}
            {...register("email")}
          />
          {errors.email && <ErroDoCampo id="email-erro" mensagem={errors.email.message} />}
        </div>

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <div className="space-y-1.5">
            <label className={ROTULO} htmlFor="password">
              Senha
            </label>
            <PasswordInput
              id="password"
              autoComplete="new-password"
              aria-invalid={errors.password ? true : undefined}
              aria-describedby={errors.password ? "password-erro" : undefined}
              {...register("password")}
            />
            {errors.password && <ErroDoCampo id="password-erro" mensagem={errors.password.message} />}
          </div>

          <div className="space-y-1.5">
            <label className={ROTULO} htmlFor="confirmPassword">
              Confirmar senha
            </label>
            <PasswordInput
              id="confirmPassword"
              autoComplete="new-password"
              aria-invalid={errors.confirmPassword ? true : undefined}
              aria-describedby={errors.confirmPassword ? "confirmPassword-erro" : undefined}
              {...register("confirmPassword")}
            />
            {errors.confirmPassword && <ErroDoCampo id="confirmPassword-erro" mensagem={errors.confirmPassword.message} />}
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
                  aria-invalid={errors.termsAccepted ? true : undefined}
                  aria-describedby={errors.termsAccepted ? "termsAccepted-erro" : undefined}
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
          {errors.termsAccepted && <ErroDoCampo id="termsAccepted-erro" mensagem={errors.termsAccepted.message} />}

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
          Criar conta
          <UserPlus className="h-4 w-4" aria-hidden="true" />
        </Button>

        <p className="text-center text-sm text-muted-foreground">
          Já tem uma conta?{" "}
          <Link href="/auth/login" className="rounded-sm font-medium text-gold-line underline-offset-4 hover:underline">
            Entrar
          </Link>
        </p>
      </form>
    </AuthShell>
  )
}

const ROTULO = "text-sm font-medium text-fg-secondary"

function ErroDoCampo({ id, mensagem }: { id: string; mensagem?: string }) {
  return (
    <p id={id} role="alert" className="flex items-start gap-1.5 text-xs leading-snug text-outflow">
      <AlertCircle className="mt-px h-3.5 w-3.5 shrink-0" aria-hidden="true" />
      {mensagem}
    </p>
  )
}
