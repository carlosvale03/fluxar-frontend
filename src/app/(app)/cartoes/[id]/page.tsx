"use client"

import { useEffect, useState } from "react"
import { useParams, useRouter } from "next/navigation"
import { ArrowLeft, CreditCard as CardIcon, Calendar, FileText, Edit, Wallet } from "lucide-react"
import { toast } from "sonner"

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
import { CreditCardFormDialog } from "@/components/cards/credit-card-form-dialog"

export default function CardDetailsPage() {
  const params = useParams()
  const router = useRouter()
  const id = params.id as string
  
  const [card, setCard] = useState<CreditCard | null>(null)
  const [account, setAccount] = useState<Account | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [isEditOpen, setIsEditOpen] = useState(false)

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

  // Helper for dynamic styles based on card color
  const getGradientStyle = (color: string | undefined | null) => {
      const c = color || "#000000"
      return {
          background: `linear-gradient(135deg, ${c}15 0%, transparent 100%)`,
          borderColor: `${c}30`
      }
  }

  if (isLoading) {
    return (
        <div className="container mx-auto py-10 px-4 max-w-5xl space-y-8">
            <Skeleton className="h-10 w-48" />
            <div className="grid gap-6 md:grid-cols-2">
                <Skeleton className="h-64 rounded-xl" />
                <Skeleton className="h-64 rounded-xl" />
            </div>
        </div>
    )
  }

  if (!card) return null

  return (
    <div className="container mx-auto py-10 px-4 max-w-5xl animate-in fade-in duration-500">
      <div className="flex items-center justify-between mb-8">
        <div className="flex items-center gap-4">
            <Button variant="ghost" size="icon" onClick={() => router.push("/cartoes")}>
                <ArrowLeft className="h-4 w-4" />
            </Button>
            <div>
                 <h1 className="text-2xl font-bold tracking-tight">{card.name}</h1>
                 {account && (
                    <div className="flex items-center gap-2 text-sm text-muted-foreground mt-1">
                        <Wallet className="h-3 w-3" />
                         Vinculado a: <span className="font-medium text-foreground">{account.name}</span>
                    </div>
                 )}
            </div>
        </div>
        <Button variant="outline" onClick={() => setIsEditOpen(true)}>
            <Edit className="mr-2 h-4 w-4" /> Editar Cartão
        </Button>
      </div>

      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3 mb-8">
          {/* Main Info Card */}
          <Card 
            className="col-span-full md:col-span-1 shadow-sm border"
            style={getGradientStyle(card.color)}
          >
              <CardHeader>
                  <CardTitle className="flex items-center gap-2" style={{ color: card.color || undefined }}>
                      <CardIcon className="h-5 w-5" /> Visão Geral
                  </CardTitle>
              </CardHeader>
              <CardContent className="space-y-6">
                  <div>
                      <p className="text-sm text-muted-foreground font-medium">Limite Total</p>
                      <p className="text-3xl font-bold tracking-tight">{formatCurrency(card.limit)}</p>
                  </div>
                  
                  <div className="grid grid-cols-2 gap-4">
                      <div className="bg-background/60 p-3 rounded-lg border border-border/50 backdrop-blur-sm">
                          <p className="text-xs text-muted-foreground mb-1">Fechamento</p>
                          <p className="font-medium flex items-center gap-2">
                              <Calendar className="h-4 w-4 opacity-70" /> Dia {card.closing_day}
                          </p>
                      </div>
                      <div className="bg-background/60 p-3 rounded-lg border border-border/50 backdrop-blur-sm">
                          <p className="text-xs text-muted-foreground mb-1">Vencimento</p>
                          <p className="font-medium flex items-center gap-2">
                              <Calendar className="h-4 w-4 opacity-70" /> Dia {card.due_day}
                          </p>
                      </div>
                  </div>
              </CardContent>
          </Card>

          {/* Current Invoice Info (Mocked or Real) */}
          <Card className="shadow-sm border-l-4" style={{ borderLeftColor: card.color || undefined }}>
              <CardHeader className="pb-2">
                  <CardTitle className="text-base font-medium flex justify-between items-center">
                      Fatura Atual
                      {/* Using plain badge color for readability, or use card color with low opacity */}
                      <Badge variant="outline" className="font-normal" style={{ borderColor: card.color ? `${card.color}60` : undefined, color: card.color || undefined }}>
                          Aberta
                      </Badge>
                  </CardTitle>
              </CardHeader>
              <CardContent>
                  <div className="text-2xl font-bold mb-1">{formatCurrency(card.current_invoice_total || 0)}</div>
                  <p className="text-xs text-muted-foreground">
                      Vence em {card.due_day}/{new Date().getMonth() + 1}
                  </p>
                  <Separator className="my-4" />
                  <div className="space-y-1">
                      <div className="flex justify-between text-sm">
                          <span className="text-muted-foreground">Disponível</span>
                          <span className="font-medium">{formatCurrency((card.limit || 0) - (card.current_invoice_total || 0))}</span>
                      </div>
                      <div className="h-1.5 w-full bg-secondary rounded-full overflow-hidden mt-2">
                           <div 
                              className="h-full rounded-full" 
                              style={{ 
                                  width: `${Math.min(( (card.current_invoice_total || 0) / card.limit) * 100, 100)}%`,
                                  backgroundColor: card.color || "currentColor"
                              }} 
                            />
                      </div>
                  </div>
              </CardContent>
          </Card>
      </div>

      <Separator className="my-8" />

      {/* Transactions Section Placeholder */}
      <div className="space-y-4">
          <div className="flex items-center justify-between">
              <h2 className="text-xl font-semibold flex items-center gap-2">
                  <FileText className="h-5 w-5" /> Transações Recentes
              </h2>
              <Button variant="outline" size="sm" disabled>Ver todas</Button>
          </div>
          
          <div className="rounded-md border border-dashed p-8 text-center bg-muted/20">
              <p className="text-muted-foreground text-sm">
                  O módulo de transações será implementado em breve.
              </p>
          </div>
      </div>
      
      <CreditCardFormDialog 
        open={isEditOpen} 
        onOpenChange={setIsEditOpen} 
        card={card} 
        onSuccess={fetchCard} 
      />
    </div>
  )
}
