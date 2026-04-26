"use client"

import { useEffect, useState } from "react"
import { format, parseISO } from "date-fns"
import { ptBR } from "date-fns/locale"
import { FileText, Calendar, CreditCard, ShoppingBag, ArrowRight } from "lucide-react"

import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import { Badge } from "@/components/ui/badge"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Skeleton } from "@/components/ui/skeleton"
import { api } from "@/services/apiClient"
import { Invoice } from "@/types/cards"

interface Transaction {
  id: string
  description: string
  amount: number
  date: string
  category_detail?: {
    name: string
    color: string
  }
  status: string
  is_installment: boolean
  installment_number?: number
  installment_total?: number
}

interface InvoiceDetailsDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  invoice: Invoice | null
}

export function InvoiceDetailsDialog({ open, onOpenChange, invoice }: InvoiceDetailsDialogProps) {
  const [transactions, setTransactions] = useState<Transaction[]>([])
  const [isLoading, setIsLoading] = useState(false)

  useEffect(() => {
    if (open && invoice) {
      fetchTransactions()
    }
  }, [open, invoice])

  const fetchTransactions = async () => {
    if (!invoice) return
    setIsLoading(true)
    try {
      const response = await api.get(`/transactions/?invoice=${invoice.id}`)
      const data = response.data.results || response.data
      setTransactions(data)
    } catch (error) {
      console.error("Erro ao buscar transações da fatura", error)
    } finally {
      setIsLoading(false)
    }
  }

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL',
    }).format(value)
  }

  const getMonthName = (month: number) => {
    const date = new Date()
    date.setMonth(month - 1)
    return format(date, "MMMM", { locale: ptBR })
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl rounded-[32px] p-0 overflow-hidden border-none shadow-2xl">
        <DialogHeader className="p-8 pb-4 bg-muted/30">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 rounded-2xl bg-primary/10 flex items-center justify-center shrink-0 shadow-sm ring-1 ring-black/5 dark:ring-white/10">
                <FileText className="h-6 w-6 text-primary" />
              </div>
              <div>
                <DialogTitle className="text-xl font-black tracking-tight">
                  Detalhes da Fatura
                </DialogTitle>
                <p className="text-xs text-muted-foreground font-bold uppercase tracking-widest mt-1">
                  {invoice ? `${getMonthName(invoice.month)} ${invoice.year}` : ""}
                </p>
              </div>
            </div>
            {invoice && (
              <div className="text-right">
                <p className="text-[10px] text-muted-foreground font-black uppercase tracking-widest mb-1">Total da Fatura</p>
                <p className="text-2xl font-black tracking-tighter text-primary">
                  {formatCurrency(Number(invoice.total_amount))}
                </p>
              </div>
            )}
          </div>
        </DialogHeader>

        <div className="p-8 pt-4">
          <ScrollArea className="h-[400px] pr-4">
            {isLoading ? (
              <div className="space-y-4">
                {Array.from({ length: 4 }).map((_, i) => (
                  <div key={i} className="flex items-center justify-between p-4 rounded-2xl border border-border/40">
                    <div className="flex items-center gap-4">
                      <Skeleton className="h-10 w-10 rounded-xl" />
                      <div className="space-y-2">
                        <Skeleton className="h-4 w-32" />
                        <Skeleton className="h-3 w-20" />
                      </div>
                    </div>
                    <Skeleton className="h-4 w-24" />
                  </div>
                ))}
              </div>
            ) : transactions.length === 0 ? (
              <div className="flex flex-col items-center justify-center h-64 text-muted-foreground gap-4">
                <div className="w-16 h-16 rounded-full bg-muted flex items-center justify-center opacity-20">
                    <ShoppingBag className="h-8 w-8" />
                </div>
                <p className="font-medium">Nenhuma transação encontrada nesta fatura.</p>
              </div>
            ) : (
              <div className="space-y-3">
                {transactions.map((tx) => (
                  <div 
                    key={tx.id} 
                    className="flex items-center justify-between p-4 rounded-2xl border border-border/40 hover:bg-muted/30 transition-all group"
                  >
                    <div className="flex items-center gap-4">
                      <div className="w-10 h-10 rounded-xl bg-background border border-border/40 flex items-center justify-center shadow-sm group-hover:scale-110 transition-transform">
                        <ShoppingBag className="h-5 w-5 text-muted-foreground" />
                      </div>
                      <div>
                        <div className="flex items-center gap-2">
                            <span className="font-bold text-sm text-foreground">{tx.description}</span>
                            {tx.is_installment && (
                                <Badge variant="outline" className="text-[9px] px-1.5 h-4 font-black uppercase border-primary/20 text-primary bg-primary/5">
                                    {tx.installment_number}/{tx.installment_total}
                                </Badge>
                            )}
                        </div>
                        <div className="flex items-center gap-2 text-[10px] text-muted-foreground font-medium mt-1">
                          <Calendar className="h-3 w-3" />
                          {format(parseISO(tx.date), "dd 'de' MMMM", { locale: ptBR })}
                          {tx.category_detail && (
                             <>
                                <span className="opacity-30">•</span>
                                <span 
                                    className="flex items-center gap-1"
                                    style={{ color: tx.category_detail.color }}
                                >
                                    {tx.category_detail.name}
                                </span>
                             </>
                          )}
                        </div>
                      </div>
                    </div>
                    <div className="text-right">
                      <span className="font-black text-sm tabular-nums">
                        {formatCurrency(Number(tx.amount))}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </ScrollArea>
        </div>

        <div className="p-8 pt-0 flex justify-end">
          <Button 
            variant="outline" 
            onClick={() => onOpenChange(false)}
            className="rounded-full px-8 font-bold"
          >
            Fechar
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  )
}
