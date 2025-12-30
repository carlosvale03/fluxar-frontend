"use client"

import { useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import { z } from "zod"
import { useAuth } from "@/hooks/use-auth"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import Link from "next/link"
import { useState } from "react"
import { toast } from "sonner"
import { api } from "@/services/apiClient"
import { AlertCircle } from "lucide-react"

const loginSchema = z.object({
  email: z.string().email("E-mail inválido"),
  password: z.string().min(1, "Senha é obrigatória"),
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
      // If the backend returns the user object, pass it. Otherwise, pass undefined.
      // We explicitly await login now as it might fetch the user.
      await login(response.data.access, response.data.user)
      toast.success("Login realizado com sucesso!")
    } catch (error: any) {
      const msg = error.response?.data?.detail || "Erro ao realizar login. Verifique suas credenciais."
      // Set root error for inline display
      setError("root", {
          message: msg
      })
      // Also toast for visibility (optional, but requested inline primarily)
      // toast.error(msg) 
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <div className="flex min-h-[calc(100vh-8rem)] items-center justify-center p-4">
      <Card className="w-full max-w-md">
        <CardHeader>
          <CardTitle className="text-2xl font-bold">Acesse sua conta</CardTitle>
          <CardDescription>
            Entre com seus dados para continuar.
          </CardDescription>
        </CardHeader>
        <form onSubmit={handleSubmit(onSubmit)}>
          <CardContent className="space-y-4">
            
            {errors.root && (
                <div className="flex items-center gap-2 p-3 text-sm text-destructive bg-destructive/10 rounded-md border border-destructive/20">
                    <AlertCircle className="h-4 w-4" />
                    <p>{errors.root.message}</p>
                </div>
            )}

            <div className="space-y-2">
              <label className="text-sm font-medium leading-none" htmlFor="email">E-mail</label>
              <Input 
                 id="email" 
                 type="email" 
                 placeholder="seu@email.com" 
                 {...register("email")}
                 className={errors.email ? "border-red-500" : ""}
              />
              {errors.email && <span className="text-xs text-red-500">{errors.email.message}</span>}
            </div>
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <label className="text-sm font-medium leading-none" htmlFor="password">Senha</label>
                <Link href="/auth/forgot-password" className="text-xs text-primary hover:underline">
                  Esqueceu a senha?
                </Link>
              </div>
              <Input 
                id="password" 
                type="password" 
                placeholder="******" 
                {...register("password")}
                className={errors.password ? "border-red-500" : ""}
              />
              {errors.password && <span className="text-xs text-red-500">{errors.password.message}</span>}
            </div>
          </CardContent>
          <CardFooter className="flex flex-col gap-4">
            <Button type="submit" className="w-full" loading={isLoading} disabled={isLoading}>
              Entrar
            </Button>
            <div className="text-center text-sm text-muted-foreground">
              Não tem uma conta? <Link href="/auth/register" className="text-primary hover:underline">Cadastre-se</Link>
            </div>
          </CardFooter>
        </form>
      </Card>
    </div>
  )
}
