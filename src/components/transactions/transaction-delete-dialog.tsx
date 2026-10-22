import { useState } from "react"
import { Trash2, AlertTriangle } from "lucide-react"
import { toast } from "sonner"

import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { api, mensagemDeErro } from "@/services/apiClient"
import { Transaction } from "@/types/transactions"
import { usePlan } from "@/hooks/use-plan"
import { AvisoCompacto } from "@/components/planos/recurso-bloqueado"

interface TransactionDeleteDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  onSuccess: () => void
  transaction: Transaction | null
}

export function TransactionDeleteDialog({ 
  open, 
  onOpenChange, 
  onSuccess, 
  transaction 
}: TransactionDeleteDialogProps) {
  const [isLoading, setIsLoading] = useState(false)
  const [deleteScope, setDeleteScope] = useState<"SINGLE" | "ALL">("SINGLE")

  // PERM-19: excluir a série inteira depende de `transacoes_recorrentes`; a
  // ocorrência sozinha continua podendo ser excluída
  const { podeUsar } = usePlan()
  const serieLiberada = podeUsar("transacoes_recorrentes") === true
  const isRecurring = !!transaction?.recurring_source && serieLiberada
  // FATURA-20: excluir uma parcela exclui a compra inteira no cartão
  const isCardInstallment =
    (transaction?.type === "CREDIT_CARD" || transaction?.type === "CREDIT_CARD_EXPENSE") &&
    (!!transaction?.is_installment || (transaction?.installment_total || 0) > 1)

  const handleDelete = async () => {
    if (!transaction) return

    setIsLoading(true)
    try {
      if (isRecurring && deleteScope === "ALL") {
          await api.delete(`/transactions/bulk-delete/?recurring_source=${transaction.recurring_source}`)
          toast.success("Série recorrente excluída.")
      } else {
          await api.delete(`/transactions/${transaction.id}/`)
          toast.success("Lançamento excluído.")
      }
      onSuccess()
      onOpenChange(false)
    } catch (error) {
      console.error("Failed to delete transaction", error)
      // FATURA-19: a recusa da compra em fatura paga vem no detail
      toast.error(mensagemDeErro(error, "Não foi possível excluir o lançamento. Tente de novo."))
    } finally {
      setIsLoading(false)
    }
  }

  const excluiASerie = isRecurring && deleteScope === "ALL"

  return (
    <Dialog open={open} onOpenChange={(valor) => !isLoading && onOpenChange(valor)}>
      <DialogContent className="sm:max-w-[440px]">
        <DialogHeader>
          <DialogTitle>
            {transaction?.description ? `Excluir "${transaction.description}"?` : "Excluir lançamento?"}
          </DialogTitle>
          <DialogDescription>
            {excluiASerie
              ? "Todos os lançamentos passados e futuros desta recorrência serão excluídos. Isso não pode ser desfeito."
              : "O lançamento sai do Diário de Bordo e dos saldos. Isso não pode ser desfeito."}
          </DialogDescription>
        </DialogHeader>

        {isCardInstallment && (
            <div role="note" className="flex items-start gap-2 rounded-sm border border-l-[3px] border-border border-l-warn bg-card px-3 py-2 text-sm">
                <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0 text-warn" aria-hidden="true" />
                <span>Todas as parcelas desta compra serão excluídas.</span>
            </div>
        )}

        {!!transaction?.recurring_source && !serieLiberada && <AvisoCompacto />}

        {isRecurring && (
             <fieldset className="space-y-2">
                 <legend className="mb-2 text-sm font-medium">O que excluir</legend>
                 <label htmlFor="r1" className="flex cursor-pointer items-center gap-2 rounded-md border border-border px-3 py-2 text-sm transition-colors duration-fast hover:bg-elevated has-[:checked]:border-border-strong has-[:checked]:bg-elevated">
                    <input
                        type="radio"
                        id="r1"
                        name="deleteScope"
                        value="SINGLE"
                        checked={deleteScope === "SINGLE"}
                        onChange={() => setDeleteScope("SINGLE")}
                        className="h-4 w-4 accent-gold"
                    />
                    Só este lançamento
                 </label>
                 <label htmlFor="r2" className="flex cursor-pointer items-center gap-2 rounded-md border border-border px-3 py-2 text-sm transition-colors duration-fast hover:bg-elevated has-[:checked]:border-border-strong has-[:checked]:bg-elevated">
                    <input
                        type="radio"
                        id="r2"
                        name="deleteScope"
                        value="ALL"
                        checked={deleteScope === "ALL"}
                        onChange={() => setDeleteScope("ALL")}
                        className="h-4 w-4 accent-gold"
                    />
                    Toda a série recorrente
                 </label>
             </fieldset>
        )}

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={isLoading}>
            Cancelar
          </Button>
          <Button variant="destructive" onClick={handleDelete} loading={isLoading}>
            <Trash2 aria-hidden="true" />
            {excluiASerie ? "Excluir série" : "Excluir lançamento"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
