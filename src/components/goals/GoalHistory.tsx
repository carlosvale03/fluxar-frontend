"use client"

import { useState, useEffect } from "react"
import { ArrowDownCircle, ArrowUpCircle } from "lucide-react"
import { format } from "date-fns"
import { ptBR } from "date-fns/locale"
import { lerData } from "@/lib/datas"

import { 
  Dialog, 
  DialogContent, 
  DialogHeader, 
  DialogTitle, 
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Skeleton } from "@/components/ui/skeleton"
import { Paginacao } from "@/components/ui/paginacao"
import { Valor } from "@/components/ui/valor"
import { Goal, GoalTransaction } from "@/types/goals"
import { goalsService } from "@/services/goals"
import { tratarErro } from "@/lib/erros"

interface GoalHistoryProps {
  goal: Goal | null
  open: boolean
  onOpenChange: (open: boolean) => void
}

export function GoalHistory({ goal, open, onOpenChange }: GoalHistoryProps) {
  const [isLoading, setIsLoading] = useState(false)
  const [history, setHistory] = useState<GoalTransaction[]>([])
  // META-32: página atual, total de páginas e de registros (CONTRATO-05)
  const [pagina, setPagina] = useState(1)
  const [totalDePaginas, setTotalDePaginas] = useState(1)
  const [total, setTotal] = useState(0)

  useEffect(() => {
    if (open && goal) {
      fetchHistory(1)
    }
  }, [open, goal])

  const fetchHistory = async (numero = pagina) => {
    if (!goal) return
    try {
      setIsLoading(true)
      const data = await goalsService.getHistory(goal.id, numero)
      setHistory(data.results)
      setPagina(data.current_page)
      setTotalDePaginas(data.total_pages)
      setTotal(data.count)
    } catch (error) {
      // CONTRATO-33: nenhuma falha silenciosa
      tratarErro(error, { mensagemPadrao: "Não foi possível carregar o histórico. Tente de novo.", tentarDeNovo: () => fetchHistory(numero) })
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="gap-0 p-0 sm:max-w-[460px]">
        <DialogHeader className="space-y-1 border-b border-border p-6">
          <DialogTitle>Histórico de aportes</DialogTitle>
          <DialogDescription>
            Aportes e resgates do destino <span className="font-medium text-foreground">{goal?.name}</span>.
          </DialogDescription>
        </DialogHeader>

        <div className="custom-scrollbar max-h-[70vh] overflow-y-auto px-6 py-4">
          {isLoading ? (
            // AZ-34: o esqueleto tem a forma das linhas do histórico
            <ul className="divide-y divide-border" aria-busy="true" aria-label="Carregando histórico">
              {[1, 2, 3, 4].map((i) => (
                <li key={i} className="flex items-center justify-between gap-3 py-3">
                  <div className="flex items-center gap-3">
                    <Skeleton className="h-4 w-4 rounded-full" />
                    <div className="space-y-1.5">
                      <Skeleton className="h-4 w-20" />
                      <Skeleton className="h-3 w-28" />
                    </div>
                  </div>
                  <div className="space-y-1.5">
                    <Skeleton className="ml-auto h-4 w-20" />
                    <Skeleton className="ml-auto h-3 w-16" />
                  </div>
                </li>
              ))}
            </ul>
          ) : history.length === 0 ? (
            <div className="flex min-h-[200px] flex-col items-center justify-center gap-1 text-center">
              <p className="font-medium">Nenhum aporte ainda</p>
              <p className="text-sm text-muted-foreground">Os aportes e resgates deste destino aparecem aqui.</p>
            </div>
          ) : (
            <ul className="divide-y divide-border">
              {history.map((transaction) => {
                const isWithdrawal = transaction.type === 'WITHDRAWAL'
                return (
                  <li key={transaction.id} className="flex items-center justify-between gap-3 py-3">
                    <div className="flex min-w-0 items-center gap-3">
                      {isWithdrawal ? (
                        <ArrowUpCircle className="h-4 w-4 shrink-0 text-outflow" aria-hidden="true" />
                      ) : (
                        <ArrowDownCircle className="h-4 w-4 shrink-0 text-inflow" aria-hidden="true" />
                      )}
                      <div className="min-w-0">
                        <p className="text-sm font-medium">
                          {transaction.is_correction ? "Correção" : isWithdrawal ? "Resgate" : "Aporte"}
                        </p>
                        {transaction.description && (
                          <p className="line-clamp-1 text-xs text-fg-secondary">{transaction.description}</p>
                        )}
                        <p className="value-m text-xs text-muted-foreground">
                          {/* CONTRATO-24: data sem hora, no dia gravado */}
                          {format(lerData(transaction.date), "dd 'de' MMM, yyyy", { locale: ptBR })}
                        </p>
                      </div>
                    </div>
                    <div className="shrink-0 space-y-0.5 text-right">
                      <Valor valor={transaction.amount} direcao={isWithdrawal ? "saida" : "entrada"} />
                      <p className="text-xs text-muted-foreground">{transaction.account_name}</p>
                    </div>
                  </li>
                )
              })}
            </ul>
          )}

          {total > 0 && (
            <Paginacao
              pagina={pagina}
              totalDePaginas={totalDePaginas}
              total={total}
              rotulo="registros"
              carregando={isLoading}
              onMudarPagina={(numero) => fetchHistory(numero)}
            />
          )}
        </div>

        <DialogFooter className="border-t border-border p-4">
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Fechar histórico
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
