"use client"

import { useState } from "react"
import { format } from "date-fns"
import { ArrowRight } from "lucide-react"
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
import { quantidadeDeTransacoes, resumoDoDesconto } from "@/lib/salario"
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
      tratarErro(erro, { mensagemPadrao: "Não foi possível desfazer a divisão. Tente de novo." })
    } finally {
      setDesfazendo(false)
    }
  }

  const transacoes = divisao?.transactions ?? []
  // SALARIO-70: as saídas descontadas voltam a valer para a próxima divisão
  const desconto = divisao ? resumoDoDesconto(divisao.outflows) : null

  return (
    <AlertDialog open={divisao !== null} onOpenChange={(aberto) => !desfazendo && onOpenChange(aberto)}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Desfazer a divisão?</AlertDialogTitle>
          <AlertDialogDescription>
            {/* SALARIO-73: a divisão só com saídas descontadas não criou transação */}
            {transacoes.length === 0
              ? "Esta divisão não criou lançamentos."
              : transacoes.length === 1
                ? "Este lançamento será removido, e o saldo da conta e o valor do destino voltam ao que eram antes da divisão."
                : `Estes ${quantidadeDeTransacoes(transacoes.length)} serão removidos, e os saldos das contas e os valores dos destinos voltam ao que eram antes da divisão.`}
          </AlertDialogDescription>
        </AlertDialogHeader>

        {transacoes.length > 0 && (
          <ul className="max-h-64 divide-y divide-border overflow-y-auto rounded-md border border-border" aria-label="Lançamentos que serão removidos">
            {transacoes.map((transacao) => (
              <li
                key={transacao.transfer_id ?? transacao.part_name}
                className="flex items-start justify-between gap-3 p-3"
              >
                <div className="min-w-0">
                  <p className="text-sm font-medium">
                    {transacao.kind === "GOAL_DEPOSIT" ? "Aporte" : "Transferência"}: {transacao.part_name}
                  </p>
                  <p className="flex flex-wrap items-center gap-1 text-xs text-muted-foreground">
                    <span>{transacao.origin_account.name}</span>
                    <ArrowRight aria-hidden="true" className="h-3 w-3" />
                    <span>{transacao.destination_name}</span>
                    <span aria-hidden="true" className="mx-1">·</span>
                    <span className="font-mono tabular-nums">{format(lerData(transacao.date), "dd/MM/yyyy")}</span>
                  </p>
                </div>
                <p className="value-m">{formatarMoeda(transacao.amount)}</p>
              </li>
            ))}
          </ul>
        )}

        {desconto && (
          <p className="text-sm text-muted-foreground tabular-nums">
            {desconto}.{" "}
            {divisao?.outflows?.length === 1
              ? "Ela volta a ficar disponível para a próxima divisão."
              : "Elas voltam a ficar disponíveis para a próxima divisão."}
          </p>
        )}

        <AlertDialogFooter>
          <AlertDialogCancel disabled={desfazendo}>Cancelar</AlertDialogCancel>
          <Button variant="destructive" onClick={confirmar} loading={desfazendo}>
            Desfazer divisão
          </Button>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  )
}
