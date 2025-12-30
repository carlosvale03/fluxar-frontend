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
      // For security, usually we show success even if email not found, 
      // but showing error generic if API fails
      toast.error("Ocorreu um erro ao processar sua solicitação.")
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <div className="flex min-h-[calc(100vh-8rem)] items-center justify-center p-4">
      <Card className="w-full max-w-md">
        <CardHeader>
          <CardTitle className="text-2xl font-bold">Recuperar Senha</CardTitle>
          <CardDescription>
            {success 
              ? "Verifique seu e-mail para continuar."
              : "Digite seu e-mail para redefinir sua senha."
            }
          </CardDescription>
        </CardHeader>
        
        {success ? (
          <CardContent className="space-y-4">
            <p className="text-sm text-muted-foreground">
              Enviamos um link de recuperação para o e-mail informado. Por favor, verifique sua caixa de entrada e spam.
            </p>
          </CardContent>
        ) : (
          <form onSubmit={handleSubmit(onSubmit)}>
            <CardContent className="space-y-4">
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
            </CardContent>
            <CardFooter className="flex flex-col gap-4">
              <Button type="submit" className="w-full" loading={isLoading} disabled={isLoading}>
                Enviar Link
              </Button>
            </CardFooter>
          </form>
        )}
        
        <CardFooter className="justify-center border-t pt-4 mt-2">
           <Link href="/auth/login" className="text-sm text-muted-foreground hover:text-primary transition-colors">
              Voltar para Login
           </Link>
        </CardFooter>
      </Card>
    </div>
  )
}
