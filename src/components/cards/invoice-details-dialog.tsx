"use client"

import { useEffect, useState } from "react"
import { format } from "date-fns"
import { ptBR } from "date-fns/locale"
import { ShoppingBag } from "lucide-react"

import {
  Dialog,
  DialogContent,
  DialogDescription,
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
import { lerData, nomeDoMes } from "@/lib/datas"
import { Valor } from "@/components/ui/valor"
import { tratarErro } from "@/lib/erros"

interface Transaction {
  id: string
  description: string
  amount: number
  date: string
  purchase_date?: string | null
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
      // FATURA-44: todas as compras da fatura, sem paginação
      const response = await api.get(`/invoices/${invoice.id}/transactions/`)
      setTransactions(response.data)
    } catch (error) {
      // CONTRATO-33: nenhuma falha silenciosa
      tratarErro(error, { mensagemPadrao: "Não foi possível carregar as compras da fatura.", tentarDeNovo: fetchTransactions })
    } finally {
      setIsLoading(false)
    }
  }


  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl gap-0 overflow-hidden p-0">
        <DialogHeader className="border-b border-border p-6 pr-12">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
            <div>
              <DialogTitle>Detalhes da fatura</DialogTitle>
              <DialogDescription className="mt-1 capitalize">
                {invoice ? `${nomeDoMes(invoice.month)} ${invoice.year}` : ""}
              </DialogDescription>
            </div>
            {invoice && (
              <div className="sm:text-right">
                <p className="label mb-1 text-muted-foreground">Total da fatura</p>
                <Valor valor={invoice.total_amount} direcao="neutro" tamanho="l" />
              </div>
            )}
          </div>
        </DialogHeader>

        <ScrollArea className="h-[400px]">
          {isLoading ? (
            <div className="space-y-3 p-6" aria-busy="true" aria-label="Carregando as compras da fatura">
              {Array.from({ length: 4 }).map((_, i) => (
                <div key={i} className="flex items-center justify-between">
                  <div className="space-y-2">
                    <Skeleton className="h-4 w-32" />
                    <Skeleton className="h-3 w-20" />
                  </div>
                  <Skeleton className="h-4 w-24" />
                </div>
              ))}
            </div>
          ) : transactions.length === 0 ? (
            <div className="flex h-64 flex-col items-center justify-center gap-3 text-muted-foreground">
              <ShoppingBag className="h-6 w-6" aria-hidden="true" />
              <p>Nenhum lançamento nesta fatura.</p>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow className="hover:bg-transparent">
                  <TableHead className="pl-6">Data</TableHead>
                  <TableHead>Descrição</TableHead>
                  <TableHead className="pr-6 text-right">Valor</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {transactions.map((tx) => (
                  <TableRow key={tx.id}>
                    <TableCell className="whitespace-nowrap pl-6 font-mono text-xs text-muted-foreground">
                      {/* FATURA-16: data da compra; compras antigas só têm a data gravada */}
                      {format(lerData(tx.purchase_date || tx.date), "dd 'de' MMMM", { locale: ptBR })}
                    </TableCell>
                    <TableCell>
                      <div className="flex flex-wrap items-center gap-2">
                        <span className="text-sm">{tx.description}</span>
                        {tx.is_installment && (
                          <Badge variant="secondary">
                            {tx.installment_number}/{tx.installment_total}
                          </Badge>
                        )}
                      </div>
                      {tx.category_detail && (
                        <span className="mt-0.5 flex items-center gap-1.5 text-xs text-muted-foreground">
                          {/* A cor da categoria é dado do usuário (P-08) */}
                          <span aria-hidden="true" className="h-2 w-2 rounded-full" style={{ backgroundColor: tx.category_detail.color }} />
                          {tx.category_detail.name}
                        </span>
                      )}
                    </TableCell>
                    <TableCell className="pr-6 text-right">
                      <Valor valor={tx.amount} direcao="neutro" />
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </ScrollArea>

        <div className="flex justify-end border-t border-border p-4">
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Fechar
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  )
}
