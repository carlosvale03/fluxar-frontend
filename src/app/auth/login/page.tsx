"use client"

import { useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import { z } from "zod"
import { useAuth } from "@/hooks/use-auth"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { PasswordInput } from "@/components/ui/password-input"
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import Link from "next/link"
import { useState } from "react"
import { toast } from "sonner"
import { api } from "@/services/apiClient"
import { AlertCircle } from "lucide-react"
import { cn } from "@/lib/utils"

const loginSchema = z.object({
  email: z.string()
    .min(1, "O e-mail é obrigatório")
    .email("Informe um e-mail válido"),
  password: z.string()
    .min(1, "A senha é obrigatória"),
})

type LoginForm = z.infer<typeof loginSchema>

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
      toast.success("Login realizado com sucesso!")
    } catch (error: any) {
      const msg = error.response?.data?.detail || "Erro ao realizar login. Verifique suas credenciais."
      setError("root", { message: msg })
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <div className="flex min-h-[calc(100vh-8rem)] items-center justify-center p-4">
      <Card className="w-full max-w-md rounded-[32px] border-border/60 shadow-xl overflow-hidden animate-in fade-in zoom-in duration-500">
        <CardHeader className="pt-8 px-8">
          <CardTitle className="text-3xl font-bold tracking-tight">Acesse sua conta</CardTitle>
          <CardDescription className="text-base">
            Entre com seus dados para continuar no Fluxar.
          </CardDescription>
        </CardHeader>
        <form onSubmit={handleSubmit(onSubmit)}>
          <CardContent className="space-y-4 px-8">
            
            {errors.root && (
                <div className="flex items-center gap-2 p-3 text-sm font-medium text-destructive bg-destructive/10 rounded-2xl border border-destructive/20 animate-in shake duration-300">
                    <AlertCircle className="h-4 w-4" />
                    <p>{errors.root.message}</p>
                </div>
            )}

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
              <div className="flex items-center justify-between ml-1">
                <label className="text-xs font-black uppercase tracking-widest text-muted-foreground" htmlFor="password">Senha</label>
                <Link href="/auth/forgot-password" className="text-[10px] font-black uppercase tracking-widest text-primary hover:underline underline-offset-4">
                  Esqueceu a senha?
                </Link>
              </div>
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
          </CardContent>
          <CardFooter className="flex flex-col gap-6 p-8">
            <Button type="submit" className="w-full h-12 rounded-full text-base font-bold shadow-lg shadow-primary/20 transition-all hover:scale-[1.02] active:scale-[0.98]" loading={isLoading} disabled={isLoading}>
              Entrar
            </Button>
            <div className="text-center text-sm text-muted-foreground">
              Não tem uma conta? <Link href="/auth/register" className="text-primary font-bold hover:underline">Cadastre-se</Link>
            </div>
          </CardFooter>
        </form>
      </Card>
    </div>
  )
}
