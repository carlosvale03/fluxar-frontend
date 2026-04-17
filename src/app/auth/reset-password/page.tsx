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
import { PasswordInput } from "@/components/ui/password-input"
import { cn } from "@/lib/utils"

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
        <Card className="w-full max-w-md rounded-[32px] border-destructive/20 bg-destructive/5 shadow-xl animate-in fade-in zoom-in duration-500">
            <CardHeader className="pt-8 px-8"><CardTitle className="text-2xl font-bold text-destructive">Link Inválido</CardTitle></CardHeader>
            <CardContent className="px-8 pb-4 text-muted-foreground font-medium">O link de recuperação parece estar incompleto ou expirado.</CardContent>
            <CardFooter className="p-8 pt-0 pl-8"><Link href="/auth/login"><Button variant="outline" className="rounded-full">Voltar para Login</Button></Link></CardFooter>
        </Card>
      )
  }

  return (
    <Card className="w-full max-w-md rounded-[32px] border-border/60 shadow-xl overflow-hidden animate-in fade-in zoom-in duration-500">
        <CardHeader className="pt-8 px-8">
          <CardTitle className="text-3xl font-bold tracking-tight">Nova Senha</CardTitle>
          <CardDescription className="text-base">
            Defina sua nova senha de acesso ao Fluxar.
          </CardDescription>
        </CardHeader>
        <form onSubmit={handleSubmit(onSubmit)}>
          <CardContent className="space-y-4 px-8">
            <div className="space-y-2">
              <label className="text-xs font-black uppercase tracking-widest text-muted-foreground ml-1" htmlFor="newPassword">Nova Senha</label>
              <PasswordInput 
                 id="newPassword" 
                 placeholder="******" 
                 {...register("newPassword")}
                 className={cn(
                   "rounded-2xl transition-all duration-300",
                   errors.newPassword ? "border-destructive ring-destructive/20 focus-visible:ring-destructive" : "focus-visible:ring-primary/20"
                 )}
              />
              {errors.newPassword && <p className="text-[10px] font-bold text-destructive uppercase ml-1 animate-in slide-in-from-left-1">{errors.newPassword.message}</p>}
            </div>
            <div className="space-y-2">
              <label className="text-xs font-black uppercase tracking-widest text-muted-foreground ml-1" htmlFor="confirmPassword">Confirmar Nova Senha</label>
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
