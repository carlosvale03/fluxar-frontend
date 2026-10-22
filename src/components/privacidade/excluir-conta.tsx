"use client"

import { useState } from "react"
import { useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import { z } from "zod"
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
import { Label } from "@/components/ui/label"
import { PasswordInput } from "@/components/ui/password-input"
import { dataDaExclusao } from "@/lib/datas"
import { tratarErro } from "@/lib/erros"
import { cn } from "@/lib/utils"
import { privacidadeService, salvarArquivo } from "@/services/privacidade"

const confirmacaoSchema = z.object({
  password: z.string().min(1, "Informe a sua senha atual."),
})
type Confirmacao = z.infer<typeof confirmacaoSchema>

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
      salvarArquivo(blob, "meus_dados_azimute.xlsx")
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
        description: "Até lá, você pode desistir entrando de novo no Azimute.",
        duration: 15_000,
      })
      // As sessões já foram encerradas no backend (LGPD-05)
      await logout()
    } catch (error) {
      // LGPD-04: a senha errada aparece no campo
      tratarErro(error, {
        form: { setError },
        campos: ["password"],
        mensagemPadrao: "Não foi possível pedir a exclusão da conta. Tente de novo.",
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
    <Card>
      <CardHeader className="p-5 pb-4">
        <div className="flex items-center gap-3">
          <Trash2 className="h-5 w-5 shrink-0 text-outflow" aria-hidden="true" />
          <div>
            <CardTitle role="heading" aria-level={2}>Excluir minha conta</CardTitle>
            <CardDescription>
              A conta é desativada na hora e apagada de vez depois de 30 dias. Até lá, você pode desistir entrando de novo.
            </CardDescription>
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-4 px-5 pb-5 pt-0">
        <p className="text-sm text-muted-foreground">
          Antes de excluir, baixe os seus dados financeiros (lançamentos, contas, cartões, destinos e rotas) em uma planilha.
        </p>
        {/* A destrutiva fica separada da outra ação (DESIGN.md §5, Botões) */}
        <div className="flex flex-col gap-3 sm:flex-row sm:justify-between">
          <Button
            type="button"
            variant="outline"
            onClick={baixarDados}
            loading={baixando}
            disabled={baixando}
          >
            <Download aria-hidden="true" /> Baixar meus dados (XLSX)
          </Button>
          <Button
            type="button"
            variant="destructive"
            onClick={() => setAberto(true)}
          >
            Excluir minha conta
          </Button>
        </div>
      </CardContent>

      <Dialog open={aberto} onOpenChange={aoMudarAbertura}>
        <DialogContent className="sm:max-w-md">
          <form onSubmit={handleSubmit(confirmar)} className="space-y-6">
            <DialogHeader>
              <DialogTitle>Confirmar a exclusão da conta</DialogTitle>
              <DialogDescription>
                Todas as suas sessões serão encerradas. Depois de 30 dias, a conta e todos os dados serão apagados
                definitivamente.
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-2">
              <Label htmlFor="senha-da-exclusao">Senha atual</Label>
              <PasswordInput
                id="senha-da-exclusao"
                autoComplete="current-password"
                {...register("password")}
                                aria-invalid={errors.password ? true : undefined}
                aria-describedby={errors.password ? "senha-da-exclusao-erro" : undefined}
                className={cn(errors.password && "border-outflow")}
              />
              {errors.password && (
                <p id="senha-da-exclusao-erro" role="alert" className="text-xs text-outflow">{errors.password.message}</p>
              )}
            </div>
            <DialogFooter className="gap-2">
              <Button type="button" variant="outline" onClick={() => aoMudarAbertura(false)}>
                Voltar
              </Button>
              <Button type="submit" variant="destructive" loading={enviando} disabled={enviando}>
                Confirmar exclusão
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </Card>
  )
}
