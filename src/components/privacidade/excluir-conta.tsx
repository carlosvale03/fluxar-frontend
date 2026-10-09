"use client"

import { useState } from "react"
import { useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import { z } from "zod"
import { format } from "date-fns"
import { toast } from "sonner"
import { Download, Trash2 } from "lucide-react"

import { useAuth } from "@/hooks/use-auth"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { PasswordInput } from "@/components/ui/password-input"
import { tratarErro } from "@/lib/erros"
import { cn } from "@/lib/utils"
import { privacidadeService, salvarArquivo } from "@/services/privacidade"

const confirmacaoSchema = z.object({
  password: z.string().min(1, "Informe a sua senha atual"),
})
type Confirmacao = z.infer<typeof confirmacaoSchema>

// "2026-11-08T12:00:00-03:00" vira 08/11/2026 no fuso do usuário
export function dataDaExclusao(iso: string) {
  return format(new Date(iso), "dd/MM/yyyy")
}

// LGPD-01 a LGPD-05: o usuário baixa os dados, confirma com a senha e a
// sessão termina; a conta fica 30 dias desativada antes da exclusão definitiva
export function ExcluirConta() {
  const { logout } = useAuth()
  const [aberto, setAberto] = useState(false)
  const [baixando, setBaixando] = useState(false)
  const [enviando, setEnviando] = useState(false)

  const {
    register,
    handleSubmit,
    setError,
    reset,
    formState: { errors },
  } = useForm<Confirmacao>({ resolver: zodResolver(confirmacaoSchema) })

  const baixarDados = async () => {
    try {
      setBaixando(true)
      const blob = await privacidadeService.baixarMeusDados()
      salvarArquivo(blob, "meus_dados_fluxar.xlsx")
      toast.success("Download dos seus dados iniciado.")
    } catch (error) {
      tratarErro(error, { mensagemPadrao: "Não foi possível baixar os seus dados.", tentarDeNovo: baixarDados })
    } finally {
      setBaixando(false)
    }
  }

  const confirmar = async ({ password }: Confirmacao) => {
    try {
      setEnviando(true)
      const pedido = await privacidadeService.pedirExclusao(password)
      setAberto(false)
      toast.success(`A exclusão da sua conta está marcada para ${dataDaExclusao(pedido.deletion_scheduled_for)}.`, {
        description: "Até lá, você pode desistir entrando de novo no Fluxar.",
        duration: 15_000,
      })
      // As sessões já foram encerradas no backend (LGPD-05)
      await logout()
    } catch (error) {
      // LGPD-04: a senha errada aparece no campo
      tratarErro(error, {
        form: { setError },
        campos: ["password"],
        mensagemPadrao: "Não foi possível pedir a exclusão da conta.",
      })
    } finally {
      setEnviando(false)
    }
  }

  const aoMudarAbertura = (aberto: boolean) => {
    setAberto(aberto)
    if (!aberto) reset()
  }

  return (
    <Card className="rounded-[32px] border-destructive/30 shadow-sm bg-card overflow-hidden">
      <CardHeader className="p-8 pb-4">
        <div className="flex items-center gap-4">
          <div className="w-12 h-12 rounded-2xl bg-destructive/5 flex items-center justify-center shadow-sm ring-1 ring-black/5 dark:ring-white/10">
            <Trash2 className="h-5 w-5 text-destructive" />
          </div>
          <div>
            <CardTitle className="text-xl font-bold tracking-tight">Excluir minha conta</CardTitle>
            <CardDescription>
              A conta é desativada na hora e apagada de vez depois de 30 dias. Até lá, você pode desistir entrando de novo.
            </CardDescription>
          </div>
        </div>
      </CardHeader>
      <CardContent className="px-8 pb-8 pt-2 space-y-4">
        <p className="text-sm text-muted-foreground">
          Antes de excluir, baixe os seus dados financeiros (transações, contas, cartões, metas e orçamentos) em uma planilha.
        </p>
        <div className="flex flex-col sm:flex-row gap-3">
          <Button
            type="button"
            variant="outline"
            onClick={baixarDados}
            loading={baixando}
            disabled={baixando}
            className="rounded-full h-11 font-bold"
          >
            <Download className="mr-2 h-4 w-4" /> Baixar meus dados (XLSX)
          </Button>
          <Button
            type="button"
            variant="destructive"
            onClick={() => setAberto(true)}
            className="rounded-full h-11 font-bold"
          >
            Excluir minha conta
          </Button>
        </div>
      </CardContent>

      <Dialog open={aberto} onOpenChange={aoMudarAbertura}>
        <DialogContent className="sm:max-w-md rounded-[28px]">
          <form onSubmit={handleSubmit(confirmar)} className="space-y-6">
            <DialogHeader>
              <DialogTitle>Confirmar a exclusão da conta</DialogTitle>
              <DialogDescription>
                Todas as suas sessões serão encerradas. Depois de 30 dias, a conta e todos os dados serão apagados
                definitivamente.
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-2">
              <label
                htmlFor="senha-da-exclusao"
                className="text-[10px] font-black uppercase tracking-[0.2em] text-foreground/70 ml-1"
              >
                Senha atual
              </label>
              <PasswordInput
                id="senha-da-exclusao"
                {...register("password")}
                placeholder="Digite a sua senha"
                className={cn(
                  "rounded-2xl h-11",
                  errors.password ? "border-destructive focus-visible:ring-destructive/20" : "focus-visible:ring-primary/20",
                )}
              />
              {errors.password && (
                <p className="text-[10px] font-bold text-destructive uppercase ml-1">{errors.password.message}</p>
              )}
            </div>
            <DialogFooter className="gap-2">
              <Button type="button" variant="outline" className="rounded-full" onClick={() => aoMudarAbertura(false)}>
                Voltar
              </Button>
              <Button type="submit" variant="destructive" className="rounded-full font-bold" loading={enviando} disabled={enviando}>
                Confirmar exclusão
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </Card>
  )
}
