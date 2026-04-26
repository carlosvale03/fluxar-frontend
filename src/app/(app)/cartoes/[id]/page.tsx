"use client"

import { useEffect, useState } from "react"
import { useParams, useRouter } from "next/navigation"
import { ArrowLeft, CreditCard as CardIcon, Calendar, FileText, Edit, Wallet } from "lucide-react"
import { toast } from "sonner"
import { cn } from "@/lib/utils"

import { Button } from "@/components/ui/button"
import { Separator } from "@/components/ui/separator"
import { Skeleton } from "@/components/ui/skeleton"
import { Badge } from "@/components/ui/badge"
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"

import { api } from "@/services/apiClient"
import { CreditCard } from "@/types/cards"
import { Account } from "@/types/accounts"
import { InvoiceList } from "@/components/cards/invoice-list"
import { InvoicePaymentDialog } from "@/components/transactions/invoice-payment-dialog"
import { Invoice } from "@/types/cards"
import { CreditCardFormDialog } from "@/components/cards/credit-card-form-dialog"

export default function CardDetailsPage() {
  const params = useParams()
  const router = useRouter()
  const id = params.id as string
  
  const [card, setCard] = useState<CreditCard | null>(null)
  const [account, setAccount] = useState<Account | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [isEditOpen, setIsEditOpen] = useState(false)
  
  // Payment Dialog State
  const [isPaymentOpen, setIsPaymentOpen] = useState(false)
  const [selectedInvoice, setSelectedInvoice] = useState<Invoice | undefined>(undefined)

  const fetchCard = async () => {
    try {
      setIsLoading(true)
      const response = await api.get(`/credit-cards/${id}/`)
      const cardData = response.data
      setCard(cardData)

      if (cardData.account_id) {
          try {
              const accResponse = await api.get(`/accounts/${cardData.account_id}/`)
              setAccount(accResponse.data)
          } catch (err) {
              console.error("Erro ao buscar conta vinculada", err)
          }
      }
    } catch (error) {
      toast.error("Erro ao carregar detalhes do cartão.")
      router.push("/cartoes")
    } finally {
      setIsLoading(false)
    }
  }

  useEffect(() => {
    if (id) fetchCard()
  }, [id, router])

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL',
    }).format(value)
  }

  const getGradientStyle = (color: string | undefined | null) => {
      const c = color || "#000000"
      return {
          background: `linear-gradient(135deg, ${c}15 0%, transparent 100%)`,
          borderColor: `${c}30`
      }
  }
  
  const handlePayInvoice = (invoice: Invoice) => {
      setSelectedInvoice(invoice)
      setIsPaymentOpen(true)
  }

  const handleUnpayInvoice = async (invoice: Invoice) => {
      try {
          await api.post(`/invoices/${invoice.id}/unpay/`)
          toast.success("Pagamento desfeito com sucesso!")
          // Reload to refresh logic
           // Ideally update local state, but invoice logic affects many transactions.
          window.location.reload()
      } catch (error) {
          console.error("Failed to unpay invoice", error)
          toast.error("Erro ao desfazer pagamento.")
      }
  }
  if (isLoading) {
    return (
        <div className="container mx-auto py-10 px-4 max-w-5xl space-y-8 animate-in fade-in duration-500">
            <div className="flex items-center gap-4 mb-8">
                <Skeleton className="h-10 w-10 rounded-full" />
                <div className="space-y-2">
                    <Skeleton className="h-8 w-48" />
                    <Skeleton className="h-4 w-32" />
                </div>
            </div>
            
            <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
                <Skeleton className="h-64 rounded-[32px] md:col-span-1 lg:col-span-1" />
                <Skeleton className="h-64 rounded-2xl md:col-span-1 lg:col-span-1" />
                <Skeleton className="h-64 rounded-2xl md:col-span-1 lg:col-span-1" />
            </div>
            
            <Skeleton className="h-96 rounded-[32px] w-full mt-8" />
        </div>
    )
  }

  if (!card) return null

  const getProgressColor = (percentage: number) => {
    if (percentage < 60) return "bg-green-500"
    if (percentage < 85) return "bg-yellow-500"
    return "bg-red-500"
  }

  const limit = Number(card.limit) || 0
  const available = card.available_limit !== undefined ? Number(card.available_limit) : (limit - Number(card.current_invoice_total || 0))
  const usedAmount = limit - available
  const usagePercentage = limit > 0 ? Math.min((usedAmount / limit) * 100, 100) : 0
  const progressColor = getProgressColor(usagePercentage)

  return (
    <div className="container mx-auto py-10 px-4 max-w-5xl animate-in fade-in duration-700">
      {/* Premium Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 mb-8">
        <div className="flex items-center gap-5">
            <Button 
                variant="ghost" 
                size="icon" 
                onClick={() => router.push("/cartoes")}
                className="h-11 w-11 rounded-full bg-background/50 border border-border/40 shadow-sm hover:bg-primary/10 hover:text-primary transition-all active:scale-90"
            >
                <ArrowLeft className="h-5 w-5" />
            </Button>
            <div>
                 <div className="flex items-center gap-3">
                    <h1 className="text-3xl font-bold tracking-tight">{card.name}</h1>
                    <Badge className="bg-primary/10 text-primary border-primary/20 rounded-full px-3 py-1 text-[10px] font-bold uppercase tracking-wider">
                        Cartão de Crédito
                    </Badge>
                 </div>
                 {account && (
                    <div className="flex items-center gap-1.5 text-sm text-muted-foreground mt-1.5 font-medium">
                        <div className="w-5 h-5 rounded-md bg-muted flex items-center justify-center">
                            <Wallet className="h-3 w-3" />
                        </div>
                         Vinculado a: <span className="text-foreground">{account.name}</span>
                    </div>
                 )}
            </div>
        </div>
        
        <div className="flex items-center gap-2">
            <Button 
                variant="outline" 
                onClick={() => setIsEditOpen(true)}
                className="rounded-full shadow-sm hover:shadow-md transition-all border-border/60"
            >
                <Edit className="mr-2 h-4 w-4" /> Editar Cartão
            </Button>
        </div>
      </div>

      {/* Informativo Banner */}
      <div className="mb-8 p-4 rounded-3xl bg-primary/5 border border-primary/10 text-primary/80 animate-in slide-in-from-bottom-2 duration-700 flex items-start gap-4">
          <div className="w-10 h-10 rounded-2xl bg-primary/10 flex items-center justify-center shrink-0">
            <CardIcon className="h-5 w-5 text-primary" />
          </div>
          <div className="flex flex-col gap-1">
            <h4 className="font-bold text-sm text-primary">Informações do Ciclo</h4>
            <p className="text-xs leading-relaxed max-w-2xl">
              Este cartão possui fechamento no dia <strong>{card.closing_day}</strong> e vencimento no dia <strong>{card.due_day}</strong>. 
              Gastos realizados após o fechamento serão lançados na fatura do mês seguinte.
            </p>
          </div>
      </div>

      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3 mb-10">
          {/* Main Info Card */}
          <Card 
            className="col-span-full md:col-span-1 lg:col-span-1 shadow-xl shadow-black/5 border-border/40 rounded-[32px] overflow-hidden"
            style={getGradientStyle(card.color)}
          >
              <CardHeader className="pb-2">
                  <div className="flex items-center justify-between">
                      <CardTitle className="text-sm font-black uppercase tracking-[0.2em] text-foreground/70">
                          Visão Geral
                      </CardTitle>
                      <div 
                        className="w-10 h-10 rounded-xl flex items-center justify-center shadow-sm ring-1 ring-black/5 dark:ring-white/10"
                        style={{ backgroundColor: `${card.color}20`, color: card.color || undefined }}
                      >
                          <CardIcon className="h-5 w-5" />
                      </div>
                  </div>
              </CardHeader>
              <CardContent className="space-y-6 pt-4">
                  <div>
                      <p className="text-xs text-muted-foreground font-black uppercase tracking-widest mb-1">Limite Total</p>
                      <p className="text-4xl font-black tracking-tighter">{formatCurrency(card.limit)}</p>
                  </div>
                  
                  <div className="grid grid-cols-2 gap-3">
                      <div className="bg-background/40 p-3 rounded-2xl border border-border/40 backdrop-blur-md">
                          <p className="text-[10px] text-muted-foreground font-bold uppercase tracking-tight mb-1">Fechamento</p>
                          <p className="font-black flex items-center gap-2 text-sm">
                              <Calendar className="h-3.5 w-3.5 opacity-70" /> Dia {card.closing_day}
                          </p>
                      </div>
                      <div className="bg-background/40 p-3 rounded-2xl border border-border/40 backdrop-blur-md">
                          <p className="text-[10px] text-muted-foreground font-bold uppercase tracking-tight mb-1">Vencimento</p>
                          <p className="font-black flex items-center gap-2 text-sm">
                              <Calendar className="h-3.5 w-3.5 opacity-70" /> Dia {card.due_day}
                          </p>
                      </div>
                  </div>
              </CardContent>
          </Card>

          {/* Current Invoice Info */}
          <Card className="shadow-xl shadow-black/5 border-border/40 rounded-[32px] md:col-span-1 lg:col-span-2 relative group overflow-hidden">
              <div 
                className={cn("absolute top-0 left-0 w-full h-1.5 opacity-60", progressColor)} 
              />
              
              <CardHeader className="pb-2">
                  <div className="flex items-center justify-between">
                        <CardTitle className="text-sm font-black uppercase tracking-[0.2em] text-foreground/70 flex items-center gap-2">
                            Fatura Atual
                        </CardTitle>
                        <Badge 
                            variant="outline" 
                            className="bg-yellow-500/10 text-yellow-600 border-yellow-200 dark:border-yellow-900/50 rounded-full px-2.5 py-0.5 text-[9px] font-black uppercase tracking-wider"
                        >
                            Aberta
                        </Badge>
                  </div>
              </CardHeader>
              <CardContent className="pt-4">
                  <div className="flex flex-col md:flex-row md:items-end justify-between gap-6">
                      <div className="space-y-1">
                          <p className="text-xs text-muted-foreground font-black uppercase tracking-widest mb-1">Valor Parcial</p>
                          <div className="text-4xl font-black tracking-tighter">{formatCurrency(card.current_invoice_total || 0)}</div>
                          <p className="text-[10px] text-muted-foreground font-bold uppercase tracking-widest flex items-center gap-1 mt-2">
                              <Calendar className="h-3 w-3" /> Vence em {card.due_day}/{new Date().getMonth() + 1}
                          </p>
                      </div>

                      <div className="flex-1 w-full max-w-md space-y-4">
                          <div className="space-y-1.5">
                              <div className="flex justify-between items-end">
                                  <span className="text-[10px] text-muted-foreground font-black uppercase tracking-widest">Limite Disponível</span>
                                  <span className="text-sm font-black tabular-nums">{formatCurrency(available)}</span>
                              </div>
                              <div className="h-3 w-full bg-muted/50 rounded-full overflow-hidden border border-border/20 p-0.5">
                                   <div 
                                      className={cn("h-full rounded-full transition-all duration-1000", progressColor)} 
                                      style={{ width: `${usagePercentage}%` }} 
                                    />
                              </div>
                              <div className="flex justify-between text-[9px] font-black uppercase tracking-widest opacity-60">
                                  <span>0%</span>
                                  <span>{usagePercentage.toFixed(0)}% utilizado</span>
                                  <span>100%</span>
                              </div>
                          </div>
                      </div>
                  </div>
              </CardContent>
          </Card>
      </div>

      {/* Invoices List Section */}
      <div className="mt-12 space-y-6">
          <div className="flex items-center gap-3 pl-2">
              <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center shadow-sm">
                  <FileText className="h-4 w-4 text-primary" />
              </div>
              <h2 className="text-xl font-bold tracking-tight">Histórico de Faturas</h2>
          </div>
          <InvoiceList cardId={id} onPayInvoice={handlePayInvoice} onUnpayInvoice={handleUnpayInvoice} />
      </div>
      
      <CreditCardFormDialog 
        open={isEditOpen} 
        onOpenChange={setIsEditOpen} 
        card={card} 
        onSuccess={fetchCard} 
      />
      
      <InvoicePaymentDialog 
        open={isPaymentOpen}
        onOpenChange={setIsPaymentOpen}
        invoiceId={selectedInvoice?.id}
        initialAmount={selectedInvoice?.total_amount}
        onSuccess={() => {
            fetchCard()
            window.location.reload() 
        }}
      />
    </div>
  )
}
