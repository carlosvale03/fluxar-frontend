"use client"

import { useState } from "react"
import { format } from "date-fns"
import { ArrowRight, Loader2, Undo2 } from "lucide-react"
import { toast } from "sonner"

import {
  AlertDialog,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog"
import { Button } from "@/components/ui/button"
import { lerData } from "@/lib/datas"
import { formatarMoeda } from "@/lib/dinheiro"
import { tratarErro } from "@/lib/erros"
import { quantidadeDeTransacoes } from "@/lib/salario"
import { salarioService } from "@/services/salario"
import type { DivisaoDoSalario } from "@/types/salario"

interface DesfazerDivisaoProps {
  // Divisão a desfazer; null fecha a confirmação
  divisao: DivisaoDoSalario | null
  onOpenChange: (open: boolean) => void
  onDesfeita: (divisao: DivisaoDoSalario) => void
}

// SALARIO-45: antes de desfazer, mostra as transações que serão removidas e
// pede confirmação; a recusa do backend (prazo, item mudado, já desfeita)
// vai ao Sonner (SALARIO-48, SALARIO-49, SALARIO-51)
export function DesfazerDivisao({ divisao, onOpenChange, onDesfeita }: DesfazerDivisaoProps) {
  const [desfazendo, setDesfazendo] = useState(false)

  const confirmar = async () => {
    if (!divisao) return
    setDesfazendo(true)
    try {
      const desfeita = await salarioService.desfazer(divisao.id)
      toast.success("Divisão desfeita. O salário voltou para a lista de salários a dividir.")
      onDesfeita(desfeita)
    } catch (erro) {
      tratarErro(erro, { mensagemPadrao: "Erro ao desfazer a divisão." })
    } finally {
      setDesfazendo(false)
    }
  }

  const transacoes = divisao?.transactions ?? []

  return (
    <AlertDialog open={divisao !== null} onOpenChange={(aberto) => !desfazendo && onOpenChange(aberto)}>
      <AlertDialogContent className="rounded-[32px] border-none shadow-2xl p-8">
        <AlertDialogHeader>
          <div className="w-14 h-14 rounded-2xl bg-destructive/10 flex items-center justify-center text-destructive mb-4 shadow-sm ring-1 ring-destructive/20">
            <Undo2 className="h-7 w-7" />
          </div>
          <AlertDialogTitle className="text-2xl font-black tracking-tight text-foreground/90 leading-tight">
            Desfazer a divisão?
          </AlertDialogTitle>
          <AlertDialogDescription className="text-sm font-medium leading-relaxed pt-2">
            {transacoes.length === 1
              ? "Esta transação será removida, e o saldo da conta e o valor da meta voltam ao que eram antes da divisão."
              : `Estas ${quantidadeDeTransacoes(transacoes.length)} serão removidas, e os saldos das contas e os valores das metas voltam ao que eram antes da divisão.`}
          </AlertDialogDescription>
        </AlertDialogHeader>

        <ul className="space-y-2 max-h-64 overflow-y-auto" aria-label="Transações que serão removidas">
          {transacoes.map((transacao) => (
            <li
              key={transacao.transfer_id ?? transacao.part_name}
              className="flex items-start justify-between gap-3 p-3 rounded-2xl border border-border/40 bg-muted/20"
            >
              <div className="min-w-0">
                <p className="font-bold text-sm">
                  {transacao.kind === "GOAL_DEPOSIT" ? "Aporte" : "Transferência"}: {transacao.part_name}
                </p>
                <p className="text-xs text-muted-foreground font-medium flex flex-wrap items-center gap-1">
                  <span>{transacao.origin_account.name}</span>
                  <ArrowRight className="h-3 w-3" />
                  <span>{transacao.destination_name}</span>
                  <span className="w-1 h-1 rounded-full bg-muted-foreground/30 mx-1" />
                  <span>{format(lerData(transacao.date), "dd/MM/yyyy")}</span>
                </p>
              </div>
              <p className="font-black text-sm whitespace-nowrap">{formatarMoeda(transacao.amount)}</p>
            </li>
          ))}
        </ul>

        <AlertDialogFooter className="pt-4">
          <AlertDialogCancel className="rounded-full h-11 px-6 font-bold" disabled={desfazendo}>
            Cancelar
          </AlertDialogCancel>
          <Button
            onClick={confirmar}
            disabled={desfazendo}
            className="bg-destructive text-destructive-foreground hover:bg-destructive/90 rounded-full h-11 px-6 font-bold"
          >
            {desfazendo && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            Desfazer divisão
          </Button>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  )
}
