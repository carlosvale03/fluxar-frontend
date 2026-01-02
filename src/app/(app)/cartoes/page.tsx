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
    <div className="container mx-auto py-10 px-4 max-w-7xl animate-in fade-in duration-500">
      <div className="flex flex-col md:flex-row items-center justify-between gap-4 mb-8">
        <div>
           <h1 className="text-3xl font-bold tracking-tight flex items-center gap-2">
             <CreditCard className="h-8 w-8 text-primary" /> Meus Cartões
           </h1>
           <p className="text-muted-foreground mt-1">
             Gerencie seus limites e faturas.
           </p>
        </div>
        <div className="flex items-center gap-2">
            {!isLoading && hasReachedLimit && (
                 <div className="flex items-center text-xs text-amber-600 bg-amber-50 px-3 py-2 rounded-md border border-amber-200 dark:bg-amber-900/20 dark:text-amber-400 dark:border-amber-900/50">
                     <AlertCircle className="h-3 w-3 mr-2" />
                     Limite de {limitByPlan} cartões atingido
                 </div>
            )}
            <Button onClick={handleCreateClick} disabled={isLoading || hasReachedLimit}>
                <Plus className="mr-2 h-4 w-4" /> Novo Cartão
            </Button>
        </div>
      </div>

      <Separator className="my-6" />

      {isLoading ? (
        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
            {[1, 2].map((i) => (
                <div key={i} className="aspect-[1.586] w-full">
                    <Skeleton className="h-full w-full rounded-xl" />
                </div>
            ))}
        </div>
      ) : cards.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-20 text-center border-2 border-dashed rounded-lg bg-muted/50">
              <CreditCard className="h-12 w-12 text-muted-foreground opacity-50 mb-4" />
              <h3 className="text-lg font-medium">Nenhum cartão encontrado</h3>
              <p className="text-sm text-muted-foreground max-w-sm mt-2 mb-6">
                  Cadastre seus cartões de crédito para acompanhar faturas e limites em um só lugar.
              </p>
              <Button onClick={handleCreateClick} variant="outline">Adicionar Cartão</Button>
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
