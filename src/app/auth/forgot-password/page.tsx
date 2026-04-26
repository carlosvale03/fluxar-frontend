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
import { api } from "@/services/apiClient"
import { cn } from "@/lib/utils"
import { ChevronLeft, Mail, CheckCircle2, ArrowRight } from "lucide-react"
import { motion, AnimatePresence } from "framer-motion"

const forgotSchema = z.object({
  email: z.string().email("Por favor, informe um e-mail válido"),
})

type ForgotForm = z.infer<typeof forgotSchema>

const itemVariants = {
  hidden: { opacity: 0, y: 10 },
  show: { opacity: 1, y: 0 }
}

export default function ForgotPasswordPage() {
  const [isLoading, setIsLoading] = useState(false)
  const [success, setSuccess] = useState(false)
  
  const { register, handleSubmit, formState: { errors } } = useForm<ForgotForm>({
    resolver: zodResolver(forgotSchema),
  })

  const onSubmit = async (data: ForgotForm) => {
    try {
      setIsLoading(true)
      await api.post("/auth/forgot-password/", data)
      setSuccess(true)
      toast.success("E-mail de recuperação enviado!")
    } catch (error) {
      console.error(error)
      toast.error("Ocorreu um erro. Tente novamente mais tarde.")
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <AuthShell 
      title="Recuperar Senha" 
      description={success 
        ? "Quase lá! Instruções enviadas para o seu e-mail."
        : "Não se preocupe, acontece. Informe seu e-mail e enviaremos um link para você criar uma nova senha."
      }
    >
      <AnimatePresence mode="wait">
        {success ? (
          <motion.div 
            key="success"
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            className="space-y-6 text-center py-4"
          >
            <div className="flex justify-center">
              <div className="w-20 h-20 rounded-[28px] bg-emerald-500/10 flex items-center justify-center text-emerald-500 shadow-inner relative overflow-hidden">
                <CheckCircle2 className="h-10 w-10 relative z-10" />
                <motion.div 
                  initial={{ scale: 0, opacity: 0.5 }}
                  animate={{ scale: 2, opacity: 0 }}
                  transition={{ repeat: Infinity, duration: 2 }}
                  className="absolute inset-0 bg-emerald-500/20 rounded-full"
                />
              </div>
            </div>
            
            <div className="space-y-3 px-4">
              <h3 className="text-lg font-black tracking-tight">Verifique sua Caixa de Entrada</h3>
              <p className="text-sm text-muted-foreground leading-relaxed">
                Enviamos um link de recuperação com validade de 1 hora. Se não encontrar, verifique sua pasta de **Spam**.
              </p>
            </div>

            <Button asChild variant="outline" className="h-12 rounded-2xl w-full border-border/60 hover:bg-muted font-bold">
              <Link href="/auth/login">Voltar para o Login</Link>
            </Button>
          </motion.div>
        ) : (
          <form key="form" onSubmit={handleSubmit(onSubmit)} className="space-y-6">
            <motion.div
              variants={{
                show: { transition: { staggerChildren: 0.1, delayChildren: 0.2 } }
              }}
              initial="hidden"
              animate="show"
              className="space-y-5"
            >
              <motion.div variants={itemVariants} className="space-y-2">
                <label className="text-[10px] font-black uppercase tracking-[0.2em] text-muted-foreground ml-1" htmlFor="email">
                  Seu E-mail Cadastrado
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
                  <Mail className="absolute right-4 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground opacity-40 group-focus-within:opacity-100 transition-opacity" />
                </div>
                {errors.email && (
                  <p className="text-[10px] font-bold text-destructive uppercase ml-1 mt-1 tracking-wider">
                    {errors.email.message}
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
                    Enviar Link de Recuperação
                    <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-1" />
                  </span>
                </Button>
              </motion.div>

              <motion.div variants={itemVariants} className="text-center">
                <Link href="/auth/login" className="inline-flex items-center gap-2 text-xs font-black uppercase tracking-widest text-muted-foreground hover:text-primary transition-all group">
                  <ChevronLeft className="h-3 w-3 transition-transform group-hover:-translate-x-1" />
                  Voltar para o Início
                </Link>
              </motion.div>
            </motion.div>
          </form>
        )}
      </AnimatePresence>
    </AuthShell>
  )
}

