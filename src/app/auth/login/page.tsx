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
import { api } from "@/services/apiClient"
import { AlertCircle, ArrowRight } from "lucide-react"
import { cn } from "@/lib/utils"
import { motion } from "framer-motion"

const loginSchema = z.object({
  email: z.string()
    .min(1, "O e-mail é obrigatório")
    .email("Informe um e-mail válido"),
  password: z.string()
    .min(1, "A senha é obrigatória"),
})

type LoginForm = z.infer<typeof loginSchema>

const itemVariants = {
  hidden: { opacity: 0, y: 10 },
  show: { opacity: 1, y: 0 }
}

export default function LoginPage() {
  const { login } = useAuth()
  const [isLoading, setIsLoading] = useState(false)
  
  const { register, handleSubmit, setError, formState: { errors } } = useForm<LoginForm>({
    resolver: zodResolver(loginSchema),
  })

  const onSubmit = async (data: LoginForm) => {
    try {
      setIsLoading(true)
      const response = await api.post("/auth/login/", data)
      await login(response.data.access, response.data.refresh, response.data.user)
      toast.success("Bem-vindo de volta ao Fluxar!")
    } catch (error: any) {
      const msg = error.response?.data?.detail || "E-mail ou senha incorretos. Tente novamente."
      setError("root", { message: msg })
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <AuthShell 
      title="Acesse sua conta" 
      description="Entre com seus dados para continuar sua jornada financeira no Fluxar."
    >
      <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
        <motion.div 
          variants={{
            show: { transition: { staggerChildren: 0.1, delayChildren: 0.2 } }
          }}
          initial="hidden"
          animate="show"
          className="space-y-5"
        >
          {errors.root && (
            <motion.div 
              variants={itemVariants}
              className="flex items-center gap-3 p-4 text-sm font-bold text-destructive bg-destructive/10 rounded-2xl border border-destructive/20"
            >
              <div className="w-8 h-8 rounded-xl bg-destructive/10 flex items-center justify-center shrink-0">
                <AlertCircle className="h-4 w-4" />
              </div>
              <p>{errors.root.message}</p>
            </motion.div>
          )}

          <motion.div variants={itemVariants} className="space-y-2">
            <label className="text-[10px] font-black uppercase tracking-[0.2em] text-muted-foreground ml-1" htmlFor="email">
              Endereço de E-mail
            </label>
            <div className="relative group">
              <Input 
                id="email" 
                type="email" 
                placeholder="exemplo@email.com" 
                {...register("email")}
                className={cn(
                  "h-12 rounded-2xl bg-muted/5 border-border/40 transition-all duration-300 focus:bg-background focus:ring-4 focus:ring-primary/10",
                  errors.email ? "border-destructive ring-destructive/20 focus-visible:ring-destructive" : "hover:border-primary/30 focus-visible:ring-primary/20"
                )}
              />
            </div>
            {errors.email && (
              <p className="text-[10px] font-bold text-destructive uppercase ml-1 mt-1 tracking-wider">
                {errors.email.message}
              </p>
            )}
          </motion.div>

          <motion.div variants={itemVariants} className="space-y-2">
            <div className="flex items-center justify-between ml-1">
              <label className="text-[10px] font-black uppercase tracking-[0.2em] text-muted-foreground" htmlFor="password">
                Senha de Acesso
              </label>
              <Link href="/auth/forgot-password" title="Recuperar senha" className="text-[9px] font-black uppercase tracking-widest text-primary hover:text-primary/70 transition-colors">
                Esqueceu a senha?
              </Link>
            </div>
            <PasswordInput 
              id="password" 
              placeholder="Digite sua senha" 
              {...register("password")}
              className={cn(
                "h-12 rounded-2xl bg-muted/5 border-border/40 transition-all duration-300 focus:bg-background focus:ring-4 focus:ring-primary/10",
                errors.password ? "border-destructive ring-destructive/20 focus-visible:ring-destructive" : "hover:border-primary/30 focus-visible:ring-primary/20"
              )}
            />
            {errors.password && (
              <p className="text-[10px] font-bold text-destructive uppercase ml-1 mt-1 tracking-wider">
                {errors.password.message}
              </p>
            )}
          </motion.div>

          <motion.div variants={itemVariants} className="pt-2">
            <Button 
              type="submit" 
              className="w-full h-14 rounded-full text-base font-black uppercase tracking-widest shadow-xl shadow-primary/20 transition-all hover:scale-[1.02] active:scale-[0.98] group overflow-hidden relative" 
              loading={isLoading} 
              disabled={isLoading}
            >
              <span className="relative z-10 flex items-center gap-2">
                Entrar no Sistema
                <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-1" />
              </span>
            </Button>
          </motion.div>

          <motion.div variants={itemVariants} className="text-center pt-2">
            <p className="text-sm text-muted-foreground font-medium">
              Ainda não tem conta?{" "}
              <Link href="/auth/register" className="text-primary font-black hover:underline underline-offset-4 decoration-2">
                Crie uma agora
              </Link>
            </p>
          </motion.div>
        </motion.div>
      </form>
    </AuthShell>
  )
}

