import { useState } from "react"
import { Loader2, Trash2, AlertTriangle } from "lucide-react"
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
import { Label } from "@/components/ui/label"
import { api } from "@/services/apiClient"
import { Transaction } from "@/types/transactions"

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

  const isRecurring = !!transaction?.recurring_source

  const handleDelete = async () => {
    if (!transaction) return

    setIsLoading(true)
    try {
      if (isRecurring && deleteScope === "ALL") {
          await api.delete(`/transactions/bulk-delete/?recurring_source=${transaction.recurring_source}`)
          toast.success("Série recorrente excluída com sucesso.")
      } else {
          await api.delete(`/transactions/${transaction.id}/`)
          toast.success("Transação excluída com sucesso.")
      }
      onSuccess()
      onOpenChange(false)
    } catch (error) {
      console.error("Failed to delete transaction", error)
      toast.error("Erro ao excluir transação.")
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>Excluir Transação</DialogTitle>
          <DialogDescription>
            Tem certeza que deseja excluir esta transação?
          </DialogDescription>
        </DialogHeader>

        {isRecurring && (
             <div className="py-4 space-y-3">
                 <Label>Opções de Exclusão</Label>
                 <div className="space-y-2">
                    <div className="flex items-center space-x-2">
                        <input 
                            type="radio" 
                            id="r1" 
                            name="deleteScope" 
                            value="SINGLE" 
                            checked={deleteScope === "SINGLE"}
                            onChange={() => setDeleteScope("SINGLE")}
                            className="accent-primary h-4 w-4"
                        />
                        <Label htmlFor="r1" className="cursor-pointer font-normal">Apenas esta transação</Label>
                    </div>
                    <div className="flex items-center space-x-2">
                         <input 
                            type="radio" 
                            id="r2" 
                            name="deleteScope" 
                            value="ALL" 
                            checked={deleteScope === "ALL"}
                            onChange={() => setDeleteScope("ALL")}
                            className="accent-primary h-4 w-4"
                        />
                        <Label htmlFor="r2" className="cursor-pointer font-normal text-red-600">Todas as recorrentes (série completa)</Label>
                    </div>
                 </div>
                 
                 <div className="mt-3 flex items-start gap-2 text-sm text-amber-600 bg-amber-50 p-2 rounded-md">
                    <AlertTriangle className="h-4 w-4 mt-0.5 shrink-0" />
                    <span>Ao apagar a série, todas as transações futuras e passadas vinculadas a esta recorrência serão removidas.</span>
                 </div>
             </div>
        )}

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={isLoading}>
            Cancelar
          </Button>
          <Button variant="destructive" onClick={handleDelete} disabled={isLoading}>
            {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            Excluir {deleteScope === "ALL" && isRecurring ? "Tudo" : ""}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
