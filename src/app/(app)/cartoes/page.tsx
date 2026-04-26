"use client"

import { useEffect, useState } from "react"
import { Plus, CreditCard, AlertCircle } from "lucide-react"
import { toast } from "sonner"

import { Button } from "@/components/ui/button"
import { Separator } from "@/components/ui/separator"
import { Skeleton } from "@/components/ui/skeleton"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { CreditCardItem } from "@/components/cards/credit-card-item"
import { CreditCardFormDialog } from "@/components/cards/credit-card-form-dialog"
import { api } from "@/services/apiClient"
import { CreditCard as ICreditCard } from "@/types/cards"
import { usePlan } from "@/hooks/use-plan"

const CARD_LIMITS = {
    common: 1,
    premium: 3,
    premium_plus: 10
}

export default function CardsPage() {
  const [cards, setCards] = useState<ICreditCard[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [selectedCard, setSelectedCard] = useState<ICreditCard | undefined>(undefined)
  const [isFormOpen, setIsFormOpen] = useState(false)
  const [deleteId, setDeleteId] = useState<string | null>(null)
  
  const { plan, isPremium, isPremiumPlus } = usePlan()
  
  const limitByPlan = isPremiumPlus ? CARD_LIMITS.premium_plus : (isPremium ? CARD_LIMITS.premium : CARD_LIMITS.common)
  const hasReachedLimit = cards.length >= limitByPlan

  const fetchCards = async () => {
    try {
      setIsLoading(true)
      const response = await api.get("/credit-cards/")
      const data = Array.isArray(response.data) ? response.data : response.data.results
      setCards(data || [])
    } catch (error) {
      toast.error("Erro ao carregar cartões.")
    } finally {
      setIsLoading(false)
    }
  }

  useEffect(() => {
    fetchCards()
  }, [])

  const handleEdit = (card: ICreditCard) => {
    setSelectedCard(card)
    setIsFormOpen(true)
  }

  const handleDeleteClick = (card: ICreditCard) => {
    setDeleteId(card.id)
  }

  const confirmDelete = async () => {
    if (!deleteId) return
    try {
      await api.delete(`/credit-cards/${deleteId}/`)
      toast.success("Cartão excluído com sucesso.")
      setDeleteId(null)
      fetchCards()
    } catch (error) {
      toast.error("Erro ao excluir cartão.")
    }
  }

  const handleFormSuccess = () => {
    fetchCards()
    setIsFormOpen(false)
    setSelectedCard(undefined)
  }

  const handleCreateClick = () => {
      setSelectedCard(undefined)
      setIsFormOpen(true)
  }

  return (
    <div className="container mx-auto py-12 px-6 max-w-7xl animate-in fade-in slide-in-from-bottom-4 duration-1000">
      {/* Header Premium */}
      <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-6 mb-12">
        <div className="space-y-1">
           <h1 className="text-4xl font-black tracking-tight text-foreground flex items-center gap-3">
             <div className="w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center shadow-sm ring-1 ring-black/5 dark:ring-white/10 shrink-0">
               <CreditCard className="h-6 w-6 text-primary" />
             </div>
             Meus Cartões
           </h1>
           <p className="text-muted-foreground text-sm font-medium pl-1">
             Gerencie seus limites, acompanhe faturas e organize seus gastos.
           </p>
        </div>
        
        <Button 
            onClick={handleCreateClick} 
            disabled={isLoading || hasReachedLimit}
            className="rounded-full px-6 h-12 font-bold shadow-lg shadow-primary/20 transition-all hover:scale-105 active:scale-95"
        >
            <Plus className="mr-2 h-5 w-5" /> Novo Cartão
        </Button>
      </div>

      {/* Banner de Aviso de Limite */}
      {!isLoading && hasReachedLimit && (
        <div className="mb-10 p-5 rounded-[32px] bg-amber-500/5 border border-amber-500/10 text-amber-600 dark:text-amber-500/80 animate-in slide-in-from-bottom-2 duration-700 flex items-start gap-4">
            <div className="w-10 h-10 rounded-2xl bg-amber-500/10 flex items-center justify-center shrink-0">
                <AlertCircle className="h-5 w-5" />
            </div>
            <div>
                <h4 className="font-bold text-sm">Limite de Cartões Atingido</h4>
                <p className="text-xs leading-relaxed opacity-80 mt-1 max-w-2xl">
                    Seu plano atual ({plan}) permite até {limitByPlan} cartões ativos. Para adicionar novos cartões, considere fazer o upgrade do seu plano ou remover um cartão existente.
                </p>
            </div>
        </div>
      )}

      {isLoading ? (
        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
            {[1, 2, 3].map((i) => (
                <div key={i} className="aspect-[1.586] w-full">
                    <Skeleton className="h-full w-full rounded-[32px]" />
                </div>
            ))}
        </div>
      ) : cards.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-24 text-center rounded-[40px] border-2 border-dashed border-border/60 bg-muted/20 backdrop-blur-sm">
              <div className="w-20 h-20 rounded-[28px] bg-background shadow-xl border border-border/40 flex items-center justify-center mb-6">
                <CreditCard className="h-10 w-10 text-primary opacity-40" />
              </div>
              <h3 className="text-xl font-black uppercase tracking-widest text-foreground/80">Nenhum cartão encontrado</h3>
              <p className="text-sm text-muted-foreground max-w-md mt-4 mb-8 leading-relaxed font-medium">
                  Cadastre seus cartões de crédito para centralizar o acompanhamento de faturas, limites e datas de fechamento em um só lugar.
              </p>
              <Button onClick={handleCreateClick} variant="outline" className="rounded-full px-8 h-12 font-bold border-2 hover:bg-primary/5 hover:border-primary/20 transition-all">
                Começar agora
              </Button>
          </div>
      ) : (
        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
            {cards.map((card) => (
                <CreditCardItem 
                    key={card.id} 
                    card={card} 
                    onEdit={handleEdit} 
                    onDelete={handleDeleteClick} 
                />
            ))}
        </div>
      )}

      {/* Card Form Dialog */}
      <CreditCardFormDialog
        open={isFormOpen}
        onOpenChange={(val) => {
            setIsFormOpen(val)
            if (!val) setSelectedCard(undefined)
        }}
        card={selectedCard}
        onSuccess={handleFormSuccess}
      />

      {/* Delete Confirmation Dialog */}
      <Dialog open={!!deleteId} onOpenChange={(open) => !open && setDeleteId(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Excluir Cartão</DialogTitle>
            <DialogDescription>
              Tem certeza que deseja excluir este cartão? O histórico de faturas poderá ser perdido.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
             <Button variant="outline" onClick={() => setDeleteId(null)}>Cancelar</Button>
             <Button variant="destructive" onClick={confirmDelete}>Confirmar Exclusão</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
