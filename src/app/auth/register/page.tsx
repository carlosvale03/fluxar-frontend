"use client"

import { useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import { z } from "zod"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { PasswordInput } from "@/components/ui/password-input"
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import Link from "next/link"
import { useState } from "react"
import { toast } from "sonner"
import { api } from "@/services/apiClient"
import { useRouter } from "next/navigation"
import { cn } from "@/lib/utils"

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

export default function RegisterPage() {
  const [isLoading, setIsLoading] = useState(false)
  const router = useRouter()
  
  const { register, handleSubmit, formState: { errors } } = useForm<RegisterForm>({
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
      const msg = error.response?.data?.email 
        ? "Este e-mail já está em uso." 
        : (error.response?.data?.detail || "Erro ao realizar cadastro.")
      toast.error(msg)
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <div className="flex min-h-[calc(100vh-8rem)] items-center justify-center p-4">
      <Card className="w-full max-w-md rounded-[32px] border-border/60 shadow-xl overflow-hidden animate-in fade-in zoom-in duration-500">
        <CardHeader className="pt-8 px-8">
          <CardTitle className="text-3xl font-bold tracking-tight">Crie sua conta</CardTitle>
          <CardDescription className="text-base">
            Comece a controlar suas finanças hoje mesmo com o Fluxar.
          </CardDescription>
        </CardHeader>
        <form onSubmit={handleSubmit(onSubmit)}>
          <CardContent className="space-y-4 px-8">
            <div className="space-y-2">
              <label className="text-xs font-black uppercase tracking-widest text-muted-foreground ml-1" htmlFor="name">Nome Completo</label>
              <Input 
                 id="name" 
                 type="text" 
                 placeholder="Seu Nome" 
                 {...register("name")}
                 className={cn(
                   "rounded-2xl transition-all duration-300",
                   errors.name ? "border-destructive ring-destructive/20 focus-visible:ring-destructive" : "focus-visible:ring-primary/20"
                 )}
              />
              {errors.name && <p className="text-[10px] font-bold text-destructive uppercase ml-1 animate-in slide-in-from-left-1">{errors.name.message}</p>}
            </div>
            
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

            <div className="space-y-2">
              <label className="text-xs font-black uppercase tracking-widest text-muted-foreground ml-1" htmlFor="password">Senha</label>
              <PasswordInput 
                id="password" 
                placeholder="******" 
                {...register("password")}
                className={cn(
                  "rounded-2xl transition-all duration-300",
                  errors.password ? "border-destructive ring-destructive/20 focus-visible:ring-destructive" : "focus-visible:ring-primary/20"
                )}
              />
              {errors.password && <p className="text-[10px] font-bold text-destructive uppercase ml-1 animate-in slide-in-from-left-1">{errors.password.message}</p>}
            </div>

            <div className="space-y-2">
              <label className="text-xs font-black uppercase tracking-widest text-muted-foreground ml-1" htmlFor="confirmPassword">Confirmar Senha</label>
              <PasswordInput 
                id="confirmPassword" 
                placeholder="******" 
                {...register("confirmPassword")}
                className={cn(
                  "rounded-2xl transition-all duration-300",
                  errors.confirmPassword ? "border-destructive ring-destructive/20 focus-visible:ring-destructive" : "focus-visible:ring-primary/20"
                )}
              />
              {errors.confirmPassword && <p className="text-[10px] font-bold text-destructive uppercase ml-1 animate-in slide-in-from-left-1">{errors.confirmPassword.message}</p>}
            </div>
          </CardContent>
          <CardFooter className="flex flex-col gap-6 p-8">
            <Button type="submit" className="w-full h-12 rounded-full text-base font-bold shadow-lg shadow-primary/20 transition-all hover:scale-[1.02] active:scale-[0.98]" loading={isLoading} disabled={isLoading}>
              Cadastrar
            </Button>
            <div className="text-center text-sm text-muted-foreground">
              Já tem uma conta? <Link href="/auth/login" className="text-primary font-bold hover:underline">Entre aqui</Link>
            </div>
          </CardFooter>
        </form>
      </Card>
    </div>
  )
}
