"use client"

import { useEffect, useState } from "react"
import { format } from "date-fns"
import { FileText, CheckCircle2, AlertCircle, Clock } from "lucide-react"
import { toast } from "sonner"

import { Button } from "@/components/ui/button"
import { Card } from "@/components/ui/card"
import { Badge, type BadgeProps } from "@/components/ui/badge"
import { Skeleton } from "@/components/ui/skeleton"
import { Valor } from "@/components/ui/valor"
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
import { lerData, nomeDoMes } from "@/lib/datas"
import { formatarMoeda, paraCentavos } from "@/lib/dinheiro"

interface InvoiceListProps {
  cardId: string
  onPayInvoice: (invoice: Invoice) => void
  onUnpayInvoice?: (invoice: Invoice) => void
}

// A cor do status fica no texto da pílula e sempre vem com a palavra e o ícone
const STATUS: Record<string, { label: string; variant: BadgeProps["variant"]; icon: typeof FileText }> = {
  PAID: { label: "Paga", variant: "success", icon: CheckCircle2 },
  CLOSED: { label: "Fechada", variant: "info", icon: FileText },
  OPEN: { label: "Aberta", variant: "warning", icon: Clock },
  OVERDUE: { label: "Vencida", variant: "destructive", icon: AlertCircle },
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
      setInvoices(response.data)
    } catch (error) {
      console.error("Failed to fetch invoices", error)
      toast.error("Não foi possível carregar as faturas. Recarregue a página.")
    } finally {
      setIsLoading(false)
    }
  }

  const getStatusConfig = (status: string) =>
    STATUS[status] ?? { label: status, variant: "secondary" as const, icon: FileText }

  return (
    <Card className="overflow-hidden">
        <Table>
          <TableHeader>
            <TableRow className="hover:bg-transparent">
              <TableHead className="pl-5">Período</TableHead>
              <TableHead>Vencimento</TableHead>
              <TableHead>Status</TableHead>
              <TableHead className="text-right">Total</TableHead>
              <TableHead className="pr-5 text-right">Ações</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading ? (
               Array.from({ length: 3 }).map((_, i) => (
                  <TableRow key={i}>
                      <TableCell className="pl-5"><Skeleton className="h-4 w-24" /></TableCell>
                      <TableCell><Skeleton className="h-4 w-20" /></TableCell>
                      <TableCell><Skeleton className="h-5 w-16 rounded-full" /></TableCell>
                      <TableCell className="text-right"><Skeleton className="ml-auto h-4 w-20" /></TableCell>
                      <TableCell className="pr-5 text-right"><Skeleton className="ml-auto h-8 w-24" /></TableCell>
                  </TableRow>
               ))
            ) : invoices.length === 0 ? (
                <TableRow className="hover:bg-transparent">
                    <TableCell colSpan={5} className="h-32 text-center text-muted-foreground">
                        <div className="flex flex-col items-center gap-2">
                            <FileText className="h-6 w-6" aria-hidden="true" />
                            <p>Nenhuma fatura neste cartão. A primeira aparece com a primeira compra.</p>
                        </div>
                    </TableCell>
                </TableRow>
            ) : (
                invoices.map((invoice) => {
                    const { label, variant, icon: Icon } = getStatusConfig(invoice.status)
                    const isPayable = invoice.status === 'CLOSED' || invoice.status === 'OVERDUE' || (invoice.status === 'OPEN' && paraCentavos(invoice.total_amount) > 0)

                    return (
                        <TableRow key={invoice.id}>
                            <TableCell className="pl-5">
                                <div className="flex flex-col">
                                    <span className="text-sm capitalize">
                                        {nomeDoMes(invoice.month)}
                                    </span>
                                    <span className="font-mono text-xs text-muted-foreground">{invoice.year}</span>
                                </div>
                            </TableCell>
                            <TableCell className="font-mono text-sm text-muted-foreground">
                                {format(lerData(invoice.due_date), "dd/MM/yyyy")}
                            </TableCell>
                            <TableCell>
                                <Badge variant={variant}>
                                    <Icon className="h-3 w-3" aria-hidden="true" />
                                    {label}
                                </Badge>
                            </TableCell>
                            <TableCell className="text-right">
                                <Valor valor={invoice.total_amount} direcao="neutro" />
                                {/* FATURA-27: valor, conta e data do pagamento */}
                                {invoice.status === 'PAID' && invoice.payment && (
                                    <p className="mt-1 text-xs text-muted-foreground">
                                        Pago {formatarMoeda(invoice.payment.amount)} em {format(lerData(invoice.payment.date), "dd/MM/yyyy")} · {invoice.payment.account_name}
                                    </p>
                                )}
                            </TableCell>
                            <TableCell className="pr-5 text-right">
                                <div className="flex justify-end gap-1">
                                    {isPayable && (
                                        <Button
                                            size="sm"
                                            variant="outline"
                                            onClick={() => onPayInvoice(invoice)}
                                        >
                                            Pagar fatura
                                        </Button>
                                    )}
                                    {invoice.status === 'PAID' && (
                                         <Button
                                            size="sm"
                                            variant="ghost"
                                            className="hover:text-outflow"
                                            onClick={() => onUnpayInvoice?.(invoice)}
                                        >
                                            Estornar
                                        </Button>
                                    )}
                                    <Button
                                        size="sm"
                                        variant="ghost"
                                        onClick={() => {
                                            setSelectedInvoice(invoice)
                                            setIsDetailsOpen(true)
                                        }}
                                    >
                                        Ver detalhes
                                    </Button>
                                </div>
                            </TableCell>
                        </TableRow>
                    )
                })
            )}
          </TableBody>
        </Table>

      <InvoiceDetailsDialog
        open={isDetailsOpen}
        onOpenChange={setIsDetailsOpen}
        invoice={selectedInvoice}
      />
    </Card>
  )
}
