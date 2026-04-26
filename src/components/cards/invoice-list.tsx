"use client"

import { useEffect, useState } from "react"
import { format, parseISO } from "date-fns"
import { ptBR } from "date-fns/locale"
import { FileText, CheckCircle2, AlertCircle, Clock } from "lucide-react"
import { toast } from "sonner"

import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Skeleton } from "@/components/ui/skeleton"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"

import { api } from "@/services/apiClient"
import { Invoice } from "@/types/cards"
import { InvoiceDetailsDialog } from "./invoice-details-dialog"
import { cn } from "@/lib/utils"

interface InvoiceListProps {
  cardId: string
  onPayInvoice: (invoice: Invoice) => void
  onUnpayInvoice?: (invoice: Invoice) => void
}

export function InvoiceList({ cardId, onPayInvoice, onUnpayInvoice }: InvoiceListProps) {
  const [invoices, setInvoices] = useState<Invoice[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [isDetailsOpen, setIsDetailsOpen] = useState(false)
  const [selectedInvoice, setSelectedInvoice] = useState<Invoice | null>(null)

  useEffect(() => {
    fetchInvoices()
  }, [cardId])

  const fetchInvoices = async () => {
    setIsLoading(true)
    try {
      const response = await api.get(`/credit-cards/${cardId}/invoices/`)
      // Backend returns a list of invoices
      setInvoices(response.data.results || response.data || [])
    } catch (error) {
      console.error("Failed to fetch invoices", error)
      toast.error("Erro ao carregar faturas.")
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

    const getStatusConfig = (status: string) => {
      switch (status) {
          case "PAID":
              return { 
                  label: "Paga", 
                  color: "bg-emerald-500/10 text-emerald-600 border-emerald-500/20", 
                  icon: CheckCircle2 
              }
          case "CLOSED":
              return { 
                  label: "Fechada", 
                  color: "bg-blue-500/10 text-blue-600 border-blue-500/20", 
                  icon: FileText 
              }
          case "OPEN":
              return { 
                  label: "Aberta", 
                  color: "bg-yellow-500/15 text-yellow-600 border-yellow-500/30", 
                  icon: Clock 
              }
          case "OVERDUE":
              return { 
                  label: "Vencida", 
                  color: "bg-red-500/10 text-red-600 border-red-500/20", 
                  icon: AlertCircle 
              }
          default:
              return { 
                  label: status, 
                  color: "bg-gray-500/10 text-gray-500", 
                  icon: FileText 
              }
      }
    }

  const getMonthName = (month: number) => {
      const date = new Date()
      date.setMonth(month - 1)
      return format(date, "MMMM", { locale: ptBR })
  }

  return (
    <Card className="border border-border/60 bg-card shadow-xl shadow-black/5 rounded-[32px] overflow-hidden">
      <CardHeader className="bg-muted/30 pb-4 border-b border-border/40">
        <CardTitle className="text-sm font-black uppercase tracking-widest flex items-center gap-2 text-foreground/70">
            <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center shrink-0 shadow-sm ring-1 ring-black/5 dark:ring-white/10">
                <FileText className="h-5 w-5 text-primary" />
            </div>
            <span>Detalhamento Histórico</span>
        </CardTitle>
      </CardHeader>
      <CardContent className="p-0">
        <Table>
          <TableHeader className="bg-muted/50 dark:bg-zinc-800/50 backdrop-blur-md">
            <TableRow className="hover:bg-transparent border-b border-border/60">
              <TableHead className="text-[10px] font-black uppercase tracking-[0.2em] text-foreground/80 pl-8 h-12">Período</TableHead>
              <TableHead className="text-[10px] font-black uppercase tracking-[0.2em] text-foreground/80 h-12">Vencimento</TableHead>
              <TableHead className="text-[10px] font-black uppercase tracking-[0.2em] text-foreground/80 h-12">Status</TableHead>
              <TableHead className="text-right text-[10px] font-black uppercase tracking-[0.2em] text-foreground/80 h-12">Total</TableHead>
              <TableHead className="text-right text-[10px] font-black uppercase tracking-[0.2em] text-foreground/80 pr-8 h-12">Ações</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading ? (
               Array.from({ length: 3 }).map((_, i) => (
                  <TableRow key={i} className="h-16 border-b border-border/40">
                      <TableCell className="pl-8"><Skeleton className="h-4 w-24" /></TableCell>
                      <TableCell><Skeleton className="h-4 w-20" /></TableCell>
                      <TableCell><Skeleton className="h-6 w-16 rounded-full" /></TableCell>
                      <TableCell className="text-right"><Skeleton className="h-4 w-20 ml-auto" /></TableCell>
                      <TableCell className="text-right pr-8"><Skeleton className="h-8 w-20 ml-auto rounded-full" /></TableCell>
                  </TableRow>
               ))
            ) : invoices.length === 0 ? (
                <TableRow>
                    <TableCell colSpan={5} className="text-center text-muted-foreground h-32">
                        <div className="flex flex-col items-center gap-2">
                            <FileText className="h-8 w-8 opacity-20" />
                            <p className="font-medium">Nenhuma fatura encontrada para este cartão.</p>
                        </div>
                    </TableCell>
                </TableRow>
            ) : (
                invoices.map((invoice) => {
                    const { label, color, icon: Icon } = getStatusConfig(invoice.status)
                    const isPayable = invoice.status === 'CLOSED' || invoice.status === 'OVERDUE' || (invoice.status === 'OPEN' && invoice.total_amount > 0)
                    
                    return (
                        <TableRow key={invoice.id} className="h-20 border-b border-border/40 hover:bg-muted/30 transition-all group">
                            <TableCell className="pl-8">
                                <div className="flex flex-col">
                                    <span className="capitalize font-black text-sm text-foreground">
                                        {getMonthName(invoice.month)}
                                    </span>
                                    <span className="text-[10px] text-muted-foreground font-bold uppercase tracking-widest">{invoice.year}</span>
                                </div>
                            </TableCell>
                            <TableCell className="text-sm font-medium text-muted-foreground">
                                <div className="flex items-center gap-2">
                                    <Clock className="h-3 w-3 opacity-50" />
                                    {format(parseISO(invoice.due_date), "dd/MM/yyyy")}
                                </div>
                            </TableCell>
                            <TableCell>
                                <Badge variant="outline" className={cn("rounded-full px-2.5 py-0.5 text-[9px] font-black uppercase tracking-wider border flex w-fit items-center gap-1.5 shadow-sm transition-transform duration-300 group-hover:scale-105", color)}>
                                    <Icon className="h-3 w-3" />
                                    {label}
                                </Badge>
                            </TableCell>
                            <TableCell className="text-right font-black tabular-nums text-base">
                                {formatCurrency(Number(invoice.total_amount))}
                            </TableCell>
                            <TableCell className="text-right pr-8">
                                {isPayable && (
                                    <Button 
                                        size="sm" 
                                        onClick={() => onPayInvoice(invoice)} 
                                        className="rounded-full font-black text-[11px] uppercase tracking-wider px-5 h-9 transition-all hover:scale-105 active:scale-95 shadow-lg shadow-primary/10 mr-2"
                                    >
                                        Pagar Fatura
                                    </Button>
                                )}
                                {invoice.status === 'PAID' && (
                                     <Button 
                                        size="sm" 
                                        variant="outline" 
                                        className="rounded-full h-9 px-5 font-black text-[11px] uppercase tracking-wider border-red-200 text-red-500 hover:text-red-600 hover:bg-red-500/10 hover:border-red-300 transition-all mr-2"
                                        onClick={() => onUnpayInvoice?.(invoice)}
                                    >
                                        Estornar
                                    </Button>
                                )}
                                <Button 
                                    size="sm" 
                                    variant="ghost" 
                                    className="rounded-full h-9 px-4 font-black text-[11px] uppercase tracking-wider text-muted-foreground hover:text-foreground transition-all"
                                    onClick={() => {
                                        setSelectedInvoice(invoice)
                                        setIsDetailsOpen(true)
                                    }}
                                >
                                    Ver Detalhes
                                </Button>
                            </TableCell>
                        </TableRow>
                    )
                })
            )}
          </TableBody>
        </Table>
      </CardContent>

      <InvoiceDetailsDialog 
        open={isDetailsOpen}
        onOpenChange={setIsDetailsOpen}
        invoice={selectedInvoice}
      />
    </Card>
  )
}
