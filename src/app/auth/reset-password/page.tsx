"use client"

import { useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import { z } from "zod"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import Link from "next/link"
import { useState, Suspense } from "react"
import { toast } from "sonner"
import { api } from "@/services/apiClient"
import { useRouter, useSearchParams } from "next/navigation"
import { Loader2 } from "lucide-react"

const resetSchema = z.object({
  newPassword: z.string().min(6, "A nova senha deve ter pelo menos 6 caracteres"),
  confirmPassword: z.string().min(1, "Confirmação é obrigatória"),
}).refine((data) => data.newPassword === data.confirmPassword, {
  message: "Senhas não conferem",
  path: ["confirmPassword"],
})

type ResetForm = z.infer<typeof resetSchema>

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
        <Card className="w-full max-w-md bg-destructive/10 border-destructive/20">
            <CardHeader><CardTitle className="text-destructive">Link Inválido</CardTitle></CardHeader>
            <CardContent>O link de recuperação parece estar incompleto.</CardContent>
            <CardFooter><Link href="/auth/login"><Button variant="outline">Voltar</Button></Link></CardFooter>
        </Card>
      )
  }

  return (
    <Card className="w-full max-w-md">
        <CardHeader>
          <CardTitle className="text-2xl font-bold">Nova Senha</CardTitle>
          <CardDescription>
            Defina sua nova senha de acesso.
          </CardDescription>
        </CardHeader>
        <form onSubmit={handleSubmit(onSubmit)}>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <label className="text-sm font-medium leading-none" htmlFor="newPassword">Nova Senha</label>
              <Input 
                 id="newPassword" 
                 type="password" 
                 placeholder="******" 
                 {...register("newPassword")}
                 className={errors.newPassword ? "border-red-500" : ""}
              />
              {errors.newPassword && <span className="text-xs text-red-500">{errors.newPassword.message}</span>}
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium leading-none" htmlFor="confirmPassword">Confirmar Nova Senha</label>
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
              Redefinir Senha
            </Button>
          </CardFooter>
        </form>
      </Card>
  )
}

export default function ResetPasswordPage() {
    return (
        <div className="flex min-h-[calc(100vh-8rem)] items-center justify-center p-4">
             <Suspense fallback={<Loader2 className="h-8 w-8 animate-spin" />}>
                 <ResetPasswordContent />
             </Suspense>
        </div>
    )
}
