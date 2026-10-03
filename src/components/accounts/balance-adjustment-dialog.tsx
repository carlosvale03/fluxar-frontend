"use client"

import { useState, useEffect } from "react"
import { Loader2, RefreshCcw, DollarSign, AlertCircle, CheckCircle2 } from "lucide-react"
import { toast } from "sonner"

import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { api, mensagemDeErro } from "@/services/apiClient"
import { Account } from "@/types/accounts"
import { MoneyInput } from "@/components/ui/money-input"
import { cn } from "@/lib/utils"
import { deCentavos, paraCentavos, formatarMoeda } from "@/lib/dinheiro"

interface BalanceAdjustmentDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  account: Account | undefined
  onSuccess: () => void
}

export function BalanceAdjustmentDialog({ open, onOpenChange, account, onSuccess }: BalanceAdjustmentDialogProps) {
  const [newBalance, setNewBalance] = useState<string>("")
  const [isLoading, setIsLoading] = useState(false)

  useEffect(() => {
    if (open && account) {
      // A API manda o saldo como texto decimal ("1000.10")
      setNewBalance(String(account.balance))
    }
  }, [open, account])

  const handleConfirm = async () => {
    if (!account) return

    if (difference === 0) {
      onOpenChange(false)
      return
    }

    setIsLoading(true)
    try {
      // O backend calcula a diferença em decimal (SALDO-41). O MoneyInput
      // entrega o texto decimal; a conta é em centavos (CONTRATO-17).
      const new_balance = deCentavos(paraCentavos(newBalance))
      await api.post(`/accounts/${account.id}/adjust-balance/`, { new_balance })

      toast.success("Saldo reajustado com sucesso!", {
        icon: <CheckCircle2 className="h-4 w-4 text-emerald-500" />
      })

      onSuccess()
      onOpenChange(false)
    } catch (error) {
      toast.error(mensagemDeErro(error, "Erro ao processar o reajuste de saldo."))
    } finally {
      setIsLoading(false)
    }
  }

  // Diferença prevista em centavos inteiros, só para exibir e bloquear o envio
  const difference = (paraCentavos(newBalance) - paraCentavos(account?.balance)) / 100

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[440px] p-0 overflow-hidden border-none shadow-2xl rounded-[32px] bg-background">
        <div className="h-2 w-full bg-primary/40" />
        <div className="p-8">
          <DialogHeader className="mb-8">
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 rounded-2xl bg-primary/10 flex items-center justify-center shadow-sm">
                <RefreshCcw className="h-6 w-6 text-primary" />
              </div>
              <div className="flex flex-col">
                <DialogTitle className="text-2xl font-black tracking-tight">Reajustar Saldo</DialogTitle>
                <DialogDescription className="font-medium text-xs">
                  Ajuste o saldo da conta <strong>{account?.name}</strong>.
                </DialogDescription>
              </div>
            </div>
          </DialogHeader>

          <div className="space-y-6">
            <div className="p-4 rounded-2xl bg-muted/30 border border-border/40 flex flex-col gap-1">
                <span className="text-[10px] font-black uppercase tracking-widest text-muted-foreground opacity-60">Saldo Atual</span>
                <span className="text-xl font-black tabular-nums">{formatarMoeda(account?.balance || 0)}</span>
            </div>

            <div className="space-y-3">
              <Label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground pl-1">Novo Saldo Disponível</Label>
              <div className="relative group">
                <MoneyInput 
                  value={newBalance}
                  onValueChange={(valor) => setNewBalance(valor ?? "")}
                  className="h-14 pl-12 bg-muted/5 border-border/40 rounded-2xl focus-visible:ring-primary/20 transition-all font-black tracking-tight text-xl"
                  autoFocus
                />
              </div>
            </div>

            {difference !== 0 && (
                <div className={cn(
                    "p-4 rounded-2xl border animate-in fade-in slide-in-from-top-2 duration-500",
                    difference > 0 ? "bg-emerald-500/5 border-emerald-500/20" : "bg-rose-500/5 border-rose-500/20"
                )}>
                    <div className="flex items-start gap-3">
                        <AlertCircle className={cn("h-4 w-4 mt-0.5 shrink-0", difference > 0 ? "text-emerald-500" : "text-rose-500")} />
                        <div className="flex flex-col gap-0.5">
                            <span className="text-[10px] font-black uppercase tracking-widest opacity-70">Movimentação Prevista</span>
                            <p className="text-xs font-bold leading-relaxed">
                                Será gerada uma <span className={difference > 0 ? "text-emerald-600" : "text-rose-600"}>{difference > 0 ? "Receita" : "Despesa"}</span> no valor de <strong>{formatarMoeda(Math.abs(difference))}</strong> para ajustar o saldo.
                            </p>
                        </div>
                    </div>
                </div>
            )}
          </div>

          <DialogFooter className="mt-10 flex gap-2">
            <Button 
                variant="ghost" 
                onClick={() => onOpenChange(false)} 
                className="flex-1 rounded-full h-12 font-bold"
                disabled={isLoading}
            >
              Cancelar
            </Button>
            <Button 
                onClick={handleConfirm} 
                className="flex-1 rounded-full h-12 font-black uppercase tracking-widest shadow-lg shadow-primary/20"
                disabled={isLoading || difference === 0}
            >
              {isLoading ? <Loader2 className="h-5 w-5 animate-spin" /> : "Confirmar Reajuste"}
            </Button>
          </DialogFooter>
        </div>
      </DialogContent>
    </Dialog>
  )
}
