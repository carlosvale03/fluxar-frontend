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
import { useRouter } from "next/navigation"

const registerSchema = z.object({
  name: z.string().min(3, "Nome deve ter pelo menos 3 caracteres"),
  email: z.string().email("E-mail inválido"),
  password: z.string().min(6, "Senha deve ter pelo menos 6 caracteres"),
  confirmPassword: z.string().min(1, "Confirmação de senha é obrigatória"),
}).refine((data) => data.password === data.confirmPassword, {
  message: "Senhas não conferem",
  path: ["confirmPassword"],
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
      // Removing confirmPassword before sending to API if needed, usually backend ignores extra fields or we clean it
      const { confirmPassword, ...payload } = data
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
      <Card className="w-full max-w-md">
        <CardHeader>
          <CardTitle className="text-2xl font-bold">Crie sua conta</CardTitle>
          <CardDescription>
            Comece a controlar suas finanças hoje mesmo.
          </CardDescription>
        </CardHeader>
        <form onSubmit={handleSubmit(onSubmit)}>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <label className="text-sm font-medium leading-none" htmlFor="name">Nome Completo</label>
              <Input 
                 id="name" 
                 type="text" 
                 placeholder="Seu Nome" 
                 {...register("name")}
                 className={errors.name ? "border-red-500" : ""}
              />
              {errors.name && <span className="text-xs text-red-500">{errors.name.message}</span>}
            </div>
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
              <label className="text-sm font-medium leading-none" htmlFor="password">Senha</label>
              <Input 
                id="password" 
                type="password" 
                placeholder="******" 
                {...register("password")}
                className={errors.password ? "border-red-500" : ""}
              />
              {errors.password && <span className="text-xs text-red-500">{errors.password.message}</span>}
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium leading-none" htmlFor="confirmPassword">Confirmar Senha</label>
              <Input 
                id="confirmPassword" 
                type="password" 
                placeholder="******" 
                {...register("confirmPassword")}
                className={errors.confirmPassword ? "border-red-500" : ""}
              />
              {errors.confirmPassword && <span className="text-xs text-red-500">{errors.confirmPassword.message}</span>}
            </div>
          </CardContent>
          <CardFooter className="flex flex-col gap-4">
            <Button type="submit" className="w-full" loading={isLoading} disabled={isLoading}>
              Cadastrar
            </Button>
            <div className="text-center text-sm text-muted-foreground">
              Já tem uma conta? <Link href="/auth/login" className="text-primary hover:underline">Entre aqui</Link>
            </div>
          </CardFooter>
        </form>
      </Card>
    </div>
  )
}
