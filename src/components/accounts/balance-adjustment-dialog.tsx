"use client"

import { useState, useEffect } from "react"
import { Info } from "lucide-react"
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
import { Label } from "@/components/ui/label"
import { Valor } from "@/components/ui/valor"
import { api, mensagemDeErro } from "@/services/apiClient"
import { Account } from "@/types/accounts"
import { MoneyInput } from "@/components/ui/money-input"
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
      setNewBalance(account.balance)
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

      toast.success("Saldo reajustado.")

      onSuccess()
      onOpenChange(false)
    } catch (error) {
      toast.error(mensagemDeErro(error, "Não foi possível reajustar o saldo. Tente de novo."))
    } finally {
      setIsLoading(false)
    }
  }

  // Diferença prevista em centavos inteiros, só para exibir e bloquear o envio
  const difference = paraCentavos(newBalance) - paraCentavos(account?.balance)

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[440px]">
          <DialogHeader>
            <DialogTitle>Reajustar saldo</DialogTitle>
            <DialogDescription>
              Ajuste o saldo da conta <strong className="font-semibold text-foreground">{account?.name}</strong>.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-5">
            <div className="flex flex-col gap-1 rounded-md border border-border p-4">
                <span className="label text-muted-foreground">Saldo atual</span>
                <Valor valor={account?.balance} direcao={paraCentavos(account?.balance) < 0 ? "saida" : "neutro"} tamanho="l" />
            </div>

            <div className="space-y-2">
              <Label htmlFor="novo-saldo">Novo saldo disponível</Label>
              <MoneyInput
                id="novo-saldo"
                value={newBalance}
                onValueChange={(valor) => setNewBalance(valor ?? "")}
                // CONTRATO-20: o novo saldo pode ser negativo
                permitirNegativo
                autoFocus
              />
            </div>

            {difference !== 0 && (
                <div className="flex items-start gap-3 rounded-r-md border border-border border-l-[3px] border-l-info p-4">
                    <Info className="mt-0.5 h-4 w-4 shrink-0 text-info" aria-hidden="true" />
                    <div className="flex flex-col gap-1">
                        <span className="label text-muted-foreground">Movimentação prevista</span>
                        <p className="text-sm">
                            Será registrada uma{" "}
                            <span className={difference > 0 ? "text-inflow" : "text-outflow"}>{difference > 0 ? "entrada" : "saída"}</span>{" "}
                            de <strong className="value-m font-medium">{formatarMoeda(deCentavos(Math.abs(difference)))}</strong> para ajustar o saldo.
                        </p>
                    </div>
                </div>
            )}
          </div>

          <DialogFooter>
            <Button
                variant="outline"
                onClick={() => onOpenChange(false)}
                disabled={isLoading}
            >
              Cancelar
            </Button>
            <Button
                onClick={handleConfirm}
                loading={isLoading}
                disabled={difference === 0}
            >
              Confirmar reajuste
            </Button>
          </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
