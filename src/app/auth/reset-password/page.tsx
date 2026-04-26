"use client"

import { useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import { z } from "zod"
import { Button } from "@/components/ui/button"
import { AuthShell } from "@/components/auth/auth-shell"
import Link from "next/link"
import { useState, Suspense } from "react"
import { toast } from "sonner"
import { api } from "@/services/apiClient"
import { useRouter, useSearchParams } from "next/navigation"
import { Loader2, KeyRound, AlertTriangle } from "lucide-react"
import { PasswordInput } from "@/components/ui/password-input"
import { cn } from "@/lib/utils"
import { motion } from "framer-motion"

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

const itemVariants = {
  hidden: { opacity: 0, y: 10 },
  show: { opacity: 1, y: 0 }
}

function ResetPasswordContent() {
  const [isLoading, setIsLoading] = useState(false)
  const router = useRouter()
  const searchParams = useSearchParams()
  const token = searchParams.get("token")
  
  const { register, handleSubmit, formState: { errors } } = useForm<ResetForm>({
    resolver: zodResolver(resetSchema),
  })

  const onSubmit = async (data: ResetForm) => {
    if (!token) {
        toast.error("Token inválido ou ausente.")
        return
    }

    try {
      setIsLoading(true)
      await api.post("/auth/reset-password/", { token, password: data.newPassword })
      toast.success("Senha redefinida com sucesso! Faça login com a nova senha.")
      router.push("/auth/login")
    } catch (error) {
      console.error(error)
      toast.error("Erro ao redefinir senha. O link pode ter expirado.")
    } finally {
      setIsLoading(false)
    }
  }

  if (!token) {
      return (
        <AuthShell title="Link Inválido" description="O link de recuperação parece estar incompleto ou expirado.">
           <div className="flex flex-col items-center space-y-6 py-4">
              <div className="w-16 h-16 rounded-[24px] bg-destructive/10 flex items-center justify-center text-destructive">
                <AlertTriangle className="h-8 w-8" />
              </div>
              <p className="text-sm text-center text-muted-foreground leading-relaxed font-medium">
                Por questões de segurança, links de recuperação expiram em 1 hora. Solicite um novo link para continuar.
              </p>
              <Button asChild variant="outline" className="w-full h-12 rounded-2xl border-border/60 hover:bg-muted font-bold transition-all">
                <Link href="/auth/forgot-password">Solicitar Novo Link</Link>
              </Button>
           </div>
        </AuthShell>
      )
  }

  return (
    <AuthShell 
      title="Nova Senha" 
      description="Escolha uma senha forte para proteger sua conta no Fluxar."
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
          <motion.div variants={itemVariants} className="space-y-2">
            <label className="text-[10px] font-black uppercase tracking-[0.2em] text-muted-foreground ml-1" htmlFor="newPassword">
              Nova Senha de Acesso
            </label>
            <PasswordInput 
               id="newPassword" 
               placeholder="Digite sua nova senha" 
               {...register("newPassword")}
               className={cn(
                 "h-12 rounded-2xl bg-muted/5 border-border/40 transition-all duration-300 focus:bg-background focus:ring-4 focus:ring-primary/10",
                 errors.newPassword ? "border-destructive ring-destructive/20 focus-visible:ring-destructive" : "hover:border-primary/30 focus-visible:ring-primary/20"
               )}
            />
            {errors.newPassword && (
              <p className="text-[10px] font-bold text-destructive uppercase ml-1 mt-1 tracking-wider">
                {errors.newPassword.message}
              </p>
            )}
          </motion.div>

          <motion.div variants={itemVariants} className="space-y-2">
            <label className="text-[10px] font-black uppercase tracking-[0.2em] text-muted-foreground ml-1" htmlFor="confirmPassword">
              Confirmar Nova Senha
            </label>
            <PasswordInput 
              id="confirmPassword" 
              placeholder="Repita a nova senha" 
              {...register("confirmPassword")}
              className={cn(
                "h-12 rounded-2xl bg-muted/5 border-border/40 transition-all duration-300 focus:bg-background focus:ring-4 focus:ring-primary/10",
                errors.confirmPassword ? "border-destructive ring-destructive/20 focus-visible:ring-destructive" : "hover:border-primary/30 focus-visible:ring-primary/20"
              )}
            />
            {errors.confirmPassword && (
              <p className="text-[10px] font-bold text-destructive uppercase ml-1 mt-1 tracking-wider">
                {errors.confirmPassword.message}
              </p>
            )}
          </motion.div>

          <motion.div variants={itemVariants} className="pt-2">
            <Button 
              type="submit" 
              className="w-full h-14 rounded-full text-base font-black uppercase tracking-widest shadow-xl shadow-primary/20 transition-all hover:scale-[1.02] active:scale-[0.98] group" 
              loading={isLoading} 
              disabled={isLoading}
            >
              <span className="flex items-center gap-2">
                Atualizar Senha
                <KeyRound className="h-4 w-4 transition-transform group-hover:rotate-12" />
              </span>
            </Button>
          </motion.div>
        </motion.div>
      </form>
    </AuthShell>
  )
}

export default function ResetPasswordPage() {
    return (
       <Suspense fallback={
         <div className="flex min-h-screen items-center justify-center bg-background">
            <Loader2 className="h-8 w-8 animate-spin text-primary" />
         </div>
       }>
           <ResetPasswordContent />
       </Suspense>
    )
}

