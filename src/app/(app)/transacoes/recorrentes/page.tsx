"use client"

import { useEffect, useState } from "react"
import { Edit, Plus, Repeat } from "lucide-react"

import { Button } from "@/components/ui/button"
import { Skeleton } from "@/components/ui/skeleton"
import { Card } from "@/components/ui/card"
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from "@/components/ui/table"
import { Badge } from "@/components/ui/badge"
import { Valor } from "@/components/ui/valor"
import { CabecalhoDePagina } from "@/components/layout/cabecalho-de-pagina"

import { api } from "@/services/apiClient"
import { Transaction } from "@/types/transactions"
import { TransactionFormDialog } from "@/components/transactions/transaction-form-dialog"
import { Paginacao } from "@/components/ui/paginacao"
import { lerData } from "@/lib/datas"
import { tratarErro } from "@/lib/erros"

export default function RecurringTransactionsPage() {
  const [transactions, setTransactions] = useState<Transaction[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [isCreateOpen, setIsCreateOpen] = useState(false)
  const [selectedTransaction, setSelectedTransaction] = useState<Transaction | null>(null)
  // CONTRATO-05: a lista é paginada, com total e controles
  const [page, setPage] = useState(1)
  const [total, setTotal] = useState(0)
  const [totalPages, setTotalPages] = useState(1)

  const fetchTransactions = async () => {
    try {
      setIsLoading(true)
      // CONTRATO-15: só as transações que pertencem a uma série recorrente
      const response = await api.get("/transactions/", { params: { is_recurring: "true", page } })
      setTransactions(response.data.results)
      setTotal(response.data.count)
      setTotalPages(response.data.total_pages)
    } catch (error) {
      tratarErro(error, { mensagemPadrao: "Erro ao carregar as transações recorrentes.", tentarDeNovo: fetchTransactions })
    } finally {
      setIsLoading(false)
    }
  }

  useEffect(() => {
    fetchTransactions()
  }, [page])

  const handleEdit = (transaction: Transaction) => {
      setSelectedTransaction(transaction)
      setIsCreateOpen(true)
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
    <div className="mx-auto w-full max-w-[1240px] px-4 py-6 md:px-6 md:py-8">
      <CabecalhoDePagina
        titulo="Recorrentes"
        apoio="Lançamentos que se repetem"
        acoes={
          <Button onClick={() => { setSelectedTransaction(null); setIsCreateOpen(true) }}>
            <Plus aria-hidden="true" /> Nova Recorrência
          </Button>
        }
      />

      <Card className="overflow-hidden">
            <Table>
                <TableHeader>
                    <TableRow className="hover:bg-transparent">
                        <TableHead>Descrição</TableHead>
                        <TableHead className="hidden sm:table-cell">Frequência</TableHead>
                        <TableHead>Próxima data</TableHead>
                        <TableHead className="text-right">Valor</TableHead>
                        <TableHead className="w-px"><span className="sr-only">Ações</span></TableHead>
                    </TableRow>
                </TableHeader>
                <TableBody>
                    {isLoading ? (
                        Array.from({ length: 5 }).map((_, i) => (
                            <TableRow key={i} className="hover:bg-transparent">
                                <TableCell><Skeleton className="h-4 w-32" /></TableCell>
                                <TableCell className="hidden sm:table-cell"><Skeleton className="h-5 w-20 rounded-full" /></TableCell>
                                <TableCell><Skeleton className="h-4 w-20" /></TableCell>
                                <TableCell><Skeleton className="ml-auto h-4 w-24" /></TableCell>
                                <TableCell><Skeleton className="h-8 w-8" /></TableCell>
                            </TableRow>
                        ))
                    ) : transactions.length === 0 ? (
                        <TableRow className="hover:bg-transparent">
                            <TableCell colSpan={5} className="py-16">
                                <div className="flex flex-col items-center justify-center gap-2 text-center">
                                    <Repeat className="h-6 w-6 text-muted-foreground" aria-hidden="true" />
                                    <p className="text-sm text-fg-secondary">Nenhuma transação recorrente encontrada.</p>
                                </div>
                            </TableCell>
                        </TableRow>
                    ) : (
                        transactions.map((t) => (
                            <TableRow key={t.id}>
                                <TableCell>
                                    <div className="flex flex-col gap-1">
                                        <span className="text-sm font-medium">{t.description}</span>
                                        {/* No celular, a frequência fica sob a descrição */}
                                        <span className="text-xs text-muted-foreground sm:hidden">{getFrequencyLabel(t.frequency)}</span>
                                    </div>
                                </TableCell>
                                <TableCell className="hidden sm:table-cell">
                                    <Badge variant="secondary">
                                        {getFrequencyLabel(t.frequency)}
                                    </Badge>
                                </TableCell>
                                <TableCell className="font-mono text-sm text-muted-foreground">
                                    {/* CONTRATO-24: data sem hora, no dia gravado */}
                                    {lerData(t.date).toLocaleDateString('pt-BR')}
                                </TableCell>
                                <TableCell className="text-right">
                                    <Valor valor={t.amount} direcao={t.type === 'EXPENSE' ? "saida" : "entrada"} />
                                </TableCell>
                                <TableCell className="pr-2">
                                    <Button variant="ghost" size="sm" onClick={() => handleEdit(t)} aria-label={`Editar ${t.description}`}>
                                        <Edit aria-hidden="true" />
                                        <span className="hidden sm:inline">Editar</span>
                                    </Button>
                                </TableCell>
                            </TableRow>
                        ))
                    )}
                </TableBody>
            </Table>
          <Paginacao
              pagina={page}
              totalDePaginas={totalPages}
              total={total}
              rotulo="transações"
              carregando={isLoading}
              onMudarPagina={setPage}
          />
      </Card>

      <TransactionFormDialog
        open={isCreateOpen}
        onOpenChange={setIsCreateOpen}
        onSuccess={fetchTransactions}
        // O formulário trabalha com um tipo por vez; a recorrência nova começa como despesa
        type="EXPENSE"
        initialData={selectedTransaction}
      />
    </div>
  )
}
