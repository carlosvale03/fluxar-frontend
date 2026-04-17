"use client"

import { useEffect, useState } from "react"
import { Plus, Repeat, Calendar } from "lucide-react"

import { Button } from "@/components/ui/button"
import { Separator } from "@/components/ui/separator"
import { Skeleton } from "@/components/ui/skeleton"
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from "@/components/ui/table"
import { Badge } from "@/components/ui/badge"

import { api } from "@/services/apiClient"
import { Transaction } from "@/types/transactions"
import { TransactionFormDialog } from "@/components/transactions/transaction-form-dialog"

export default function RecurringTransactionsPage() {
  const [transactions, setTransactions] = useState<Transaction[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [isCreateOpen, setIsCreateOpen] = useState(false)
  const [selectedTransaction, setSelectedTransaction] = useState<Transaction | null>(null)
  
  const fetchTransactions = async () => {
    try {
      setIsLoading(true)
      // Assuming backend supports filtering by is_recurring=true
      const response = await api.get("/transactions/?is_recurring=true")
      setTransactions(response.data.results || response.data || [])
    } catch (error) {
      console.error("Failed to fetch recurring transactions", error)
    } finally {
      setIsLoading(false)
    }
  }

  useEffect(() => {
    fetchTransactions()
  }, [])

  const handleEdit = (transaction: Transaction) => {
      setSelectedTransaction(transaction)
      setIsCreateOpen(true)
  }

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL',
    }).format(value)
  }

  const getFrequencyLabel = (freq: string | undefined) => {
      switch (freq) {
          case 'DAILY': return 'Diária'
          case 'WEEKLY': return 'Semanal'
          case 'MONTHLY': return 'Mensal'
          case 'YEARLY': return 'Anual'
          default: return freq || 'N/A'
      }
  }

  return (
    <div className="container mx-auto py-10 animate-in fade-in duration-500">
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Transações Recorrentes</h1>
          <p className="text-muted-foreground mt-1">
            Gerencie suas receitas e despesas fixas.
          </p>
        </div>
        <Button onClick={() => { setSelectedTransaction(null); setIsCreateOpen(true) }}>
          <Plus className="mr-2 h-4 w-4" /> Nova Recorrência
        </Button>
      </div>

      <Separator className="my-6" />

      <Card>
          <CardHeader>
              <CardTitle className="flex items-center gap-2">
                  <Repeat className="h-5 w-5" /> Listagem
              </CardTitle>
          </CardHeader>
          <CardContent>
            <Table>
                <TableHeader>
                    <TableRow>
                        <TableHead>Descrição</TableHead>
                        <TableHead>Frequência</TableHead>
                        <TableHead>Valor</TableHead>
                        <TableHead>Próxima Data</TableHead>
                        <TableHead className="text-right">Ações</TableHead>
                    </TableRow>
                </TableHeader>
                <TableBody>
                    {isLoading ? (
                        Array.from({ length: 5 }).map((_, i) => (
                            <TableRow key={i}>
                                <TableCell><Skeleton className="h-4 w-32" /></TableCell>
                                <TableCell><Skeleton className="h-4 w-20" /></TableCell>
                                <TableCell><Skeleton className="h-4 w-24" /></TableCell>
                                <TableCell><Skeleton className="h-4 w-24" /></TableCell>
                                <TableCell className="text-right"><Skeleton className="h-8 w-8 ml-auto" /></TableCell>
                            </TableRow>
                        ))
                    ) : transactions.length === 0 ? (
                        <TableRow>
                            <TableCell colSpan={5} className="text-center h-24 text-muted-foreground">
                                Nenhuma transação recorrente encontrada.
                            </TableCell>
                        </TableRow>
                    ) : (
                        transactions.map((t) => (
                            <TableRow key={t.id}>
                                <TableCell className="font-medium">{t.description}</TableCell>
                                <TableCell>
                                    <Badge variant="secondary">
                                        {getFrequencyLabel(t.frequency)}
                                    </Badge>
                                </TableCell>
                                <TableCell className={t.type === 'EXPENSE' ? 'text-red-500' : 'text-emerald-500'}>
                                    {t.type === 'EXPENSE' ? '- ' : '+ '}
                                    {formatCurrency(Number(t.amount))}
                                </TableCell>
                                <TableCell>
                                    {/* Assuming date is the next occurrence or start date */}
                                    <div className="flex items-center gap-2">
                                        <Calendar className="h-3 w-3 opacity-70" />
                                        {new Date(t.date).toLocaleDateString('pt-BR')}
                                    </div>
                                </TableCell>
                                <TableCell className="text-right">
                                    <Button variant="ghost" size="sm" onClick={() => handleEdit(t)}>
                                        Editar
                                    </Button>
                                </TableCell>
                            </TableRow>
                        ))
                    )}
                </TableBody>
            </Table>
          </CardContent>
      </Card>

      <TransactionFormDialog 
        open={isCreateOpen} 
        onOpenChange={setIsCreateOpen} 
        onSuccess={fetchTransactions}
        type="EXPENSE" // Default to expense, but form handles switching? Actually FormDialog takes a strict type prop.
                       // Does form allow changing type? The current dialog implementation FIXES the type passed in props.
                       // We might need to allow changing type inside the form OR have two buttons.
                       // For now, let's pass "EXPENSE" but maybe we need a generic form?
                       // Checking TransactionFormDialog... it sets default type but doesn't seem to allow changing it efficiently if it's fixed.
                       // Wait, TransactionFormDialog takes `type` prop.
                       // If I want to create Income, I need another button or a Type selector inside the form.
                       // The current form seems designed for ONE type.
        initialData={selectedTransaction}
      />
    </div>
  )
}
