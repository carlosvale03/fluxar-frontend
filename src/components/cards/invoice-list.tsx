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

interface InvoiceListProps {
  cardId: string
  onPayInvoice: (invoice: Invoice) => void
  onUnpayInvoice?: (invoice: Invoice) => void
}

export function InvoiceList({ cardId, onPayInvoice, onUnpayInvoice }: InvoiceListProps) {
  const [invoices, setInvoices] = useState<Invoice[]>([])
  const [isLoading, setIsLoading] = useState(true)

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
              return { label: "Paga", color: "bg-emerald-500/10 text-emerald-500 border-emerald-500/20", icon: CheckCircle2 }
          case "CLOSED":
              return { label: "Fechada", color: "bg-blue-500/10 text-blue-500 border-blue-500/20", icon: FileText }
          case "OPEN":
              return { label: "Aberta", color: "bg-yellow-500/10 text-yellow-500 border-yellow-500/20", icon: Clock }
          case "OVERDUE":
              return { label: "Vencida", color: "bg-red-500/10 text-red-500 border-red-500/20", icon: AlertCircle }
          default:
              return { label: status, color: "bg-gray-500/10 text-gray-500", icon: FileText }
      }
  }

  const getMonthName = (month: number) => {
      const date = new Date()
      date.setMonth(month - 1)
      return format(date, "MMMM", { locale: ptBR })
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-lg flex items-center gap-2">
            <FileText className="h-5 w-5" />
            Faturas
        </CardTitle>
      </CardHeader>
      <CardContent>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Mês/Ano</TableHead>
              <TableHead>Vencimento</TableHead>
              <TableHead>Status</TableHead>
              <TableHead className="text-right">Total</TableHead>
              <TableHead className="text-right">Ações</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading ? (
               Array.from({ length: 3 }).map((_, i) => (
                  <TableRow key={i}>
                      <TableCell><Skeleton className="h-4 w-20" /></TableCell>
                      <TableCell><Skeleton className="h-4 w-24" /></TableCell>
                      <TableCell><Skeleton className="h-4 w-16" /></TableCell>
                      <TableCell className="text-right"><Skeleton className="h-4 w-20 ml-auto" /></TableCell>
                      <TableCell className="text-right"><Skeleton className="h-8 w-20 ml-auto" /></TableCell>
                  </TableRow>
               ))
            ) : invoices.length === 0 ? (
                <TableRow>
                    <TableCell colSpan={5} className="text-center text-muted-foreground h-24">
                        Nenhuma fatura encontrada.
                    </TableCell>
                </TableRow>
            ) : (
                invoices.map((invoice) => {
                    const { label, color, icon: Icon } = getStatusConfig(invoice.status)
                    const isPayable = invoice.status === 'CLOSED' || invoice.status === 'OVERDUE' || (invoice.status === 'OPEN' && invoice.total_amount > 0)
                    
                    return (
                        <TableRow key={invoice.id}>
                            <TableCell className="capitalize font-medium">
                                {getMonthName(invoice.month)} / {invoice.year}
                            </TableCell>
                            <TableCell>
                                {format(parseISO(invoice.due_date), "dd/MM/yyyy")}
                            </TableCell>
                            <TableCell>
                                <Badge variant="outline" className={`font-normal flex w-fit items-center gap-1 ${color}`}>
                                    <Icon className="h-3 w-3" />
                                    {label}
                                </Badge>
                            </TableCell>
                            <TableCell className="text-right font-medium">
                                {formatCurrency(Number(invoice.total_amount))}
                            </TableCell>
                            <TableCell className="text-right">
                                {isPayable && (
                                    <Button size="sm" variant="outline" onClick={() => onPayInvoice(invoice)}>
                                        Pagar
                                    </Button>
                                )}
                                {invoice.status === 'PAID' && (
                                     <Button 
                                        size="sm" 
                                        variant="outline" 
                                        className="text-red-500 hover:text-red-600 hover:bg-red-500/10 border-red-200"
                                        onClick={() => onUnpayInvoice?.(invoice)}
                                    >
                                        Desfazer
                                    </Button>
                                )}
                            </TableCell>
                        </TableRow>
                    )
                })
            )}
          </TableBody>
        </Table>
      </CardContent>
    </Card>
  )
}
