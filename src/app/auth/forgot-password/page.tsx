"use client"

import { useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import { z } from "zod"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import Link from "next/link"
import { useState } from "react"
import { toast } from "sonner"
import { api } from "@/services/apiClient"
import { cn } from "@/lib/utils"
import { ChevronLeft, Mail } from "lucide-react"

const forgotSchema = z.object({
  email: z.string().email("E-mail inválido"),
})

type ForgotForm = z.infer<typeof forgotSchema>

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
      toast.success("Solicitação enviada.")
    } catch (error) {
      console.error(error)
      toast.error("Ocorreu um erro ao processar sua solicitação.")
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <div className="flex min-h-[calc(100vh-8rem)] items-center justify-center p-4">
      <Card className="w-full max-w-md rounded-[32px] border-border/60 shadow-xl overflow-hidden animate-in fade-in zoom-in duration-500">
        <CardHeader className="pt-8 px-8">
          <CardTitle className="text-3xl font-bold tracking-tight">Recuperar Senha</CardTitle>
          <CardDescription className="text-base">
            {success 
              ? "Verifique seu e-mail para continuar o processo."
              : "Digite seu e-mail cadastrado para redefinir sua senha."
            }
          </CardDescription>
        </CardHeader>
        
        {success ? (
          <CardContent className="space-y-6 px-8 py-6">
            <div className="flex flex-col items-center justify-center space-y-4 text-center">
              <div className="w-16 h-16 rounded-3xl bg-primary/10 flex items-center justify-center text-primary animate-bounce">
                <Mail className="h-8 w-8" />
              </div>
              <p className="text-sm text-muted-foreground leading-relaxed">
                Enviamos um link de recuperação para o e-mail informado. <br />
                Por favor, verifique sua caixa de entrada e spam.
              </p>
            </div>
          </CardContent>
        ) : (
          <form onSubmit={handleSubmit(onSubmit)}>
            <CardContent className="space-y-4 px-8">
              <div className="space-y-2">
                <label className="text-xs font-black uppercase tracking-widest text-muted-foreground ml-1" htmlFor="email">E-mail</label>
                <Input 
                   id="email" 
                   type="email" 
                   placeholder="seu@email.com" 
                   {...register("email")}
                   className={cn(
                     "rounded-2xl transition-all duration-300",
                     errors.email ? "border-destructive ring-destructive/20 focus-visible:ring-destructive" : "focus-visible:ring-primary/20"
                   )}
                />
                {errors.email && <p className="text-[10px] font-bold text-destructive uppercase ml-1 animate-in slide-in-from-left-1">{errors.email.message}</p>}
              </div>
            </CardContent>
            <CardFooter className="flex flex-col gap-4 p-8">
              <Button type="submit" className="w-full h-12 rounded-full text-base font-bold shadow-lg shadow-primary/20 transition-all hover:scale-[1.02] active:scale-[0.98]" loading={isLoading} disabled={isLoading}>
                Enviar Link
              </Button>
            </CardFooter>
          </form>
        )}
        
        <CardFooter className="justify-center border-t border-border/40 bg-muted/30 py-4 px-8">
           <Link href="/auth/login" className="flex items-center gap-2 text-xs font-black uppercase tracking-widest text-muted-foreground hover:text-primary transition-colors group">
              <ChevronLeft className="h-3 w-3 transition-transform group-hover:-translate-x-1" />
              Voltar para Login
           </Link>
        </CardFooter>
      </Card>
    </div>
  )
}
