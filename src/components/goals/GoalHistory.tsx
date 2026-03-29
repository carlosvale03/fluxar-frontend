"use client"

import { useState, useEffect } from "react"
import { History, Loader2, ArrowDownCircle, ArrowUpCircle } from "lucide-react"
import { format } from "date-fns"
import { ptBR } from "date-fns/locale"
import { cn } from "@/lib/utils"

import { 
  Dialog, 
  DialogContent, 
  DialogHeader, 
  DialogTitle, 
  DialogDescription
} from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Goal, GoalTransaction } from "@/types/goals"
import { goalsService } from "@/services/goals"
import { formatCurrency } from "@/lib/utils"

interface GoalHistoryProps {
  goal: Goal | null
  open: boolean
  onOpenChange: (open: boolean) => void
}

export function GoalHistory({ goal, open, onOpenChange }: GoalHistoryProps) {
  const [isLoading, setIsLoading] = useState(false)
  const [history, setHistory] = useState<GoalTransaction[]>([])

  useEffect(() => {
    if (open && goal) {
      fetchHistory()
    }
  }, [open, goal])

  const fetchHistory = async () => {
    if (!goal) return
    try {
      setIsLoading(true)
      const data = await goalsService.getHistory(goal.id)
      setHistory(data)
    } catch (error) {
      console.error("Failed to fetch history", error)
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[425px] rounded-[32px] border-border/40 bg-card/95 backdrop-blur-xl p-0 overflow-hidden">
        <DialogHeader className="p-6 pb-2">
          <div className="w-12 h-12 rounded-2xl bg-primary/10 text-primary flex items-center justify-center mb-4 transition-transform hover:scale-110">
            <History className="h-6 w-6" />
          </div>
          <DialogTitle className="text-2xl font-black uppercase tracking-tight">
            Histórico de Aportes
          </DialogTitle>
          <DialogDescription className="text-sm font-medium">
            Confira as movimentações realizadas para <strong>{goal?.name}</strong>.
          </DialogDescription>
        </DialogHeader>

        <div className="max-h-[70vh] overflow-y-auto pr-1 custom-scrollbar px-6 py-4">
          {isLoading ? (
            <div className="flex flex-col items-center justify-center min-h-[200px] space-y-4">
              <Loader2 className="h-8 w-8 animate-spin text-primary" />
              <p className="text-xs font-black uppercase tracking-widest opacity-40">Carregando histórico...</p>
            </div>
          ) : history.length === 0 ? (
            <div className="flex flex-col items-center justify-center min-h-[200px] text-center space-y-2">
              <p className="font-bold text-muted-foreground">Nenhum aporte realizado.</p>
              <p className="text-xs text-muted-foreground/60">Os valores guardados aparecerão aqui.</p>
            </div>
          ) : (
            <div className="space-y-4 pr-1">
              {history.map((transaction) => {
                const isWithdrawal = transaction.type === 'WITHDRAWAL';
                return (
                  <div 
                    key={transaction.id} 
                    className="flex items-center justify-between p-4 rounded-2xl bg-muted/30 border border-border/40 hover:bg-muted/50 transition-colors"
                  >
                    <div className="flex items-center gap-3">
                      <div className={cn(
                        "w-10 h-10 rounded-xl flex items-center justify-center transition-transform group-hover:scale-110",
                        isWithdrawal ? "bg-red-500/10 text-red-500" : "bg-emerald-500/10 text-emerald-500"
                      )}>
                        {isWithdrawal ? <ArrowUpCircle className="h-5 w-5" /> : <ArrowDownCircle className="h-5 w-5" />}
                      </div>
                      <div className="space-y-0.5">
                        <p className="text-sm font-bold">{isWithdrawal ? "Resgate" : "Aporte"}</p>
                        {transaction.description && (
                          <p className="text-[10px] font-bold text-muted-foreground/80 -mt-1 line-clamp-1 max-w-[150px]">
                            {transaction.description}
                          </p>
                        )}
                        <p className="text-[10px] font-medium text-muted-foreground">
                          {format(new Date(transaction.datetime), "dd 'de' MMM, yyyy", { locale: ptBR })}
                        </p>
                      </div>
                    </div>
                    <div className="text-right space-y-0.5">
                      <p className={cn(
                        "text-sm font-black",
                        isWithdrawal ? "text-red-500" : "text-emerald-500"
                      )}>
                        {isWithdrawal ? "-" : "+"}{formatCurrency(transaction.amount)}
                      </p>
                      <p className="text-[10px] font-black uppercase tracking-widest opacity-40">
                          {transaction.account_name}
                      </p>
                    </div>
                  </div>
                );
              })}
            </div>
          )}

          <div className="pt-4 border-t border-border/10 mt-6">
            <Button 
              variant="outline"
              className="w-full rounded-2xl font-black uppercase tracking-widest text-xs h-12"
              onClick={() => onOpenChange(false)}
            >
              Fechar Histórico
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}
