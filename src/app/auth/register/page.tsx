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
import { api } from "@/services/apiClient"
import { useRouter } from "next/navigation"
import { cn } from "@/lib/utils"
import { motion } from "framer-motion"
import { AlertCircle, UserPlus } from "lucide-react"

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
}).refine((data) => data.password === data.confirmPassword, {
  message: "As senhas não conferem",
  path: ["confirmPassword"],
}).refine((data) => !data.password.toLowerCase().includes(data.email.split('@')[0].toLowerCase()), {
  message: "A senha não pode ser muito parecida com o e-mail",
  path: ["password"],
})

type RegisterForm = z.infer<typeof registerSchema>

const itemVariants = {
  hidden: { opacity: 0, y: 10 },
  show: { opacity: 1, y: 0 }
}

export default function RegisterPage() {
  const [isLoading, setIsLoading] = useState(false)
  const router = useRouter()
  
  const { register, handleSubmit, setError, formState: { errors } } = useForm<RegisterForm>({
    resolver: zodResolver(registerSchema),
  })

  const onSubmit = async (data: RegisterForm) => {
    try {
      setIsLoading(true)
      
      const payload = {
        name: data.name,
        email: data.email,
        password: data.password,
        password_confirm: data.confirmPassword
      }
      
      await api.post("/auth/register/", payload)
      toast.success("Cadastro realizado! Verifique seu e-mail para confirmar a conta.")
      router.push("/auth/login")
    } catch (error: any) {
      console.error(error)
      const backendErrors = error.response?.data
      
      if (backendErrors?.email) {
        setError("email", { message: "Este e-mail já está em uso por outra conta." })
        toast.error("E-mail já cadastrado.")
      } else {
        const msg = backendErrors?.detail || "Erro ao realizar cadastro. Tente novamente mais tarde."
        setError("root", { message: msg })
        toast.error(msg)
      }
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <AuthShell 
      title="Crie sua conta" 
      description="Comece a controlar suas finanças hoje mesmo com a inteligência do Fluxar."
    >
      <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
        <motion.div 
          variants={{
            show: { transition: { staggerChildren: 0.08, delayChildren: 0.2 } }
          }}
          initial="hidden"
          animate="show"
          className="space-y-4"
        >
          {errors.root && (
            <motion.div 
              variants={itemVariants}
              className="flex items-center gap-3 p-4 text-sm font-bold text-destructive bg-destructive/10 rounded-2xl border border-destructive/20"
            >
              <AlertCircle className="h-4 w-4 shrink-0" />
              <p>{errors.root.message}</p>
            </motion.div>
          )}

          <motion.div variants={itemVariants} className="space-y-1.5">
            <label className="text-[10px] font-black uppercase tracking-[0.2em] text-muted-foreground ml-1" htmlFor="name">
              Nome Completo
            </label>
            <Input 
               id="name" 
               placeholder="Informe seu nome completo" 
               {...register("name")}
               className={cn(
                 "h-11 rounded-2xl bg-muted/5 border-border/40 transition-all focus:bg-background focus:ring-4 focus:ring-primary/10",
                 errors.name ? "border-destructive ring-destructive/20 focus-visible:ring-destructive" : "hover:border-primary/30 focus-visible:ring-primary/20"
               )}
            />
            {errors.name && <p className="text-[10px] font-bold text-destructive uppercase ml-1 mt-1 tracking-wider">{errors.name.message}</p>}
          </motion.div>
          
          <motion.div variants={itemVariants} className="space-y-1.5">
            <label className="text-[10px] font-black uppercase tracking-[0.2em] text-muted-foreground ml-1" htmlFor="email">
              Melhor E-mail
            </label>
            <Input 
               id="email" 
               type="email" 
               placeholder="seu@email.com" 
               {...register("email")}
               className={cn(
                 "h-11 rounded-2xl bg-muted/5 border-border/40 transition-all focus:bg-background focus:ring-4 focus:ring-primary/10",
                 errors.email ? "border-destructive ring-destructive/20 focus-visible:ring-destructive" : "hover:border-primary/30 focus-visible:ring-primary/20"
               )}
            />
            {errors.email && <p className="text-[10px] font-bold text-destructive uppercase ml-1 mt-1 tracking-wider">{errors.email.message}</p>}
          </motion.div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <motion.div variants={itemVariants} className="space-y-1.5">
              <label className="text-[10px] font-black uppercase tracking-[0.2em] text-muted-foreground ml-1" htmlFor="password">
                Senha
              </label>
              <PasswordInput 
                id="password" 
                placeholder="******" 
                {...register("password")}
                className={cn(
                  "h-11 rounded-2xl bg-muted/5 border-border/40 transition-all focus:bg-background focus:ring-4 focus:ring-primary/10",
                  errors.password ? "border-destructive ring-destructive/20 focus-visible:ring-destructive" : "hover:border-primary/30 focus-visible:ring-primary/20"
                )}
              />
              {errors.password && <p className="text-[10px] font-bold text-destructive uppercase ml-1 mt-1 tracking-wider leading-tight">{errors.password.message}</p>}
            </motion.div>

            <motion.div variants={itemVariants} className="space-y-1.5">
              <label className="text-[10px] font-black uppercase tracking-[0.2em] text-muted-foreground ml-1" htmlFor="confirmPassword">
                Confirmar
              </label>
              <PasswordInput 
                id="confirmPassword" 
                placeholder="******" 
                {...register("confirmPassword")}
                className={cn(
                  "h-11 rounded-2xl bg-muted/5 border-border/40 transition-all focus:bg-background focus:ring-4 focus:ring-primary/10",
                  errors.confirmPassword ? "border-destructive ring-destructive/20 focus-visible:ring-destructive" : "hover:border-primary/30 focus-visible:ring-primary/20"
                )}
              />
              {errors.confirmPassword && <p className="text-[10px] font-bold text-destructive uppercase ml-1 mt-1 tracking-wider leading-tight">{errors.confirmPassword.message}</p>}
            </motion.div>
          </div>

          <motion.div variants={itemVariants} className="pt-4">
            <Button 
              type="submit" 
              className="w-full h-14 rounded-full text-base font-black uppercase tracking-widest shadow-xl shadow-primary/20 transition-all hover:scale-[1.02] active:scale-[0.98] group" 
              loading={isLoading} 
              disabled={isLoading}
            >
              <span className="flex items-center gap-2">
                Criar Minha Conta
                <UserPlus className="h-4 w-4 transition-transform group-hover:scale-110" />
              </span>
            </Button>
          </motion.div>

          <motion.div variants={itemVariants} className="text-center pt-2">
            <p className="text-sm text-muted-foreground font-medium">
              Já tem uma conta?{" "}
              <Link href="/auth/login" className="text-primary font-black hover:underline underline-offset-4 decoration-2">
                Entre aqui
              </Link>
            </p>
          </motion.div>
        </motion.div>
      </form>
    </AuthShell>
  )
}

