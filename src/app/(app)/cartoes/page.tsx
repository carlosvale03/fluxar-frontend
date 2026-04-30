"use client"

import { useEffect, useState } from "react"
import { Plus, CreditCard, AlertCircle, Filter, X, RotateCcw, Trash2 } from "lucide-react"
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
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetFooter,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet"
import { Badge } from "@/components/ui/badge"
import { Checkbox } from "@/components/ui/checkbox"
import { Label } from "@/components/ui/label"
import { CreditCardItem } from "@/components/cards/credit-card-item"
import { CreditCardFormDialog } from "@/components/cards/credit-card-form-dialog"
import { api } from "@/services/apiClient"
import { CreditCard as ICreditCard } from "@/types/cards"
import { usePlan } from "@/hooks/use-plan"
import { cn } from "@/lib/utils"

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
  
  // Filter States
  const [isFilterSheetOpen, setIsFilterSheetOpen] = useState(false)
  const [selectedInstitutions, setSelectedInstitutions] = useState<string[]>([])
  
  const { plan, isPremium, isPremiumPlus } = usePlan()
  
  // Extract unique institutions from registered cards
  const availableInstitutions = Array.from(new Set(cards.map(c => c.institution).filter(Boolean))) as string[]

  const limitByPlan = isPremiumPlus ? CARD_LIMITS.premium_plus : (isPremium ? CARD_LIMITS.premium : CARD_LIMITS.common)
  const hasReachedLimit = cards.length >= limitByPlan

  const filteredCards = cards.filter(card => {
      const matchesInstitution = selectedInstitutions.length === 0 || (card.institution && selectedInstitutions.includes(card.institution))
      return matchesInstitution
  })

  const resetFilters = () => {
      setSelectedInstitutions([])
  }

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
        
        <div className="flex flex-wrap items-center gap-3">
            <Sheet open={isFilterSheetOpen} onOpenChange={setIsFilterSheetOpen}>
                <SheetTrigger asChild>
                    <Button 
                        variant="outline" 
                        className={cn(
                            "rounded-full px-6 h-12 font-bold border-border/60 transition-all",
                            selectedInstitutions.length > 0 && "border-primary/40 bg-primary/5 text-primary"
                        )}
                    >
                        <Filter className="mr-2 h-4 w-4" /> 
                        Filtros
                        {selectedInstitutions.length > 0 && (
                            <Badge className="ml-2 bg-primary text-primary-foreground rounded-full h-5 min-w-[20px] flex items-center justify-center p-0 text-[10px] font-black">
                                {selectedInstitutions.length}
                            </Badge>
                        )}
                    </Button>
                </SheetTrigger>
                <SheetContent className="sm:max-w-md rounded-l-[32px] border-none shadow-2xl p-0 overflow-hidden flex flex-col">
                    <div className="h-2 w-full bg-primary/40" />
                    <div className="p-8 flex-1 overflow-y-auto">
                        <SheetHeader className="mb-8">
                            <div className="flex items-center justify-between">
                                <div className="flex items-center gap-3">
                                    <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center">
                                        <Filter className="h-5 w-5 text-primary" />
                                    </div>
                                    <SheetTitle className="text-2xl font-black tracking-tight">Filtros</SheetTitle>
                                </div>
                            </div>
                            <SheetDescription className="font-medium text-xs">
                                Refine a visualização dos seus cartões de crédito.
                            </SheetDescription>
                        </SheetHeader>

                        <div className="space-y-8">
                            <div className="space-y-4">
                                <Label className="text-[10px] font-black uppercase tracking-[0.2em] text-muted-foreground flex items-center justify-between">
                                    Instituições
                                    {selectedInstitutions.length > 0 && (
                                        <button onClick={() => setSelectedInstitutions([])} className="text-primary hover:underline lowercase tracking-normal font-bold">Limpar</button>
                                    )}
                                </Label>
                                <div className="grid grid-cols-1 gap-2">
                                    {availableInstitutions.length > 0 ? availableInstitutions.map((inst) => (
                                        <div 
                                            key={inst} 
                                            className={cn(
                                                "flex items-center space-x-3 p-3 rounded-2xl border transition-all cursor-pointer group",
                                                selectedInstitutions.includes(inst) 
                                                    ? "bg-primary/5 border-primary/20" 
                                                    : "bg-muted/5 border-border/40 hover:bg-muted/10"
                                            )}
                                            onClick={() => {
                                                setSelectedInstitutions(prev => 
                                                    prev.includes(inst) ? prev.filter(i => i !== inst) : [...prev, inst]
                                                )
                                            }}
                                        >
                                            <Checkbox 
                                                id={`inst-${inst}`} 
                                                checked={selectedInstitutions.includes(inst)}
                                                className="rounded-md border-2 border-primary/20 data-[state=checked]:bg-primary data-[state=checked]:border-primary"
                                            />
                                            <Label 
                                                htmlFor={`inst-${inst}`} 
                                                className="flex-1 font-bold text-sm cursor-pointer capitalize"
                                            >
                                                {inst}
                                            </Label>
                                        </div>
                                    )) : (
                                        <p className="text-xs text-muted-foreground italic font-medium p-2">Nenhuma instituição encontrada.</p>
                                    )}
                                </div>
                            </div>
                        </div>
                    </div>

                    <SheetFooter className="p-8 bg-muted/20 border-t border-border/40">
                        <div className="flex w-full gap-3">
                            <Button 
                                variant="ghost" 
                                className="flex-1 rounded-full h-12 font-bold"
                                onClick={resetFilters}
                            >
                                <RotateCcw className="mr-2 h-4 w-4" /> Limpar
                            </Button>
                            <Button 
                                className="flex-1 rounded-full h-12 font-black uppercase tracking-widest shadow-lg shadow-primary/20"
                                onClick={() => setIsFilterSheetOpen(false)}
                            >
                                Ver Resultados
                            </Button>
                        </div>
                    </SheetFooter>
                </SheetContent>
            </Sheet>

            <Button 
                onClick={handleCreateClick} 
                disabled={isLoading || hasReachedLimit}
                className="rounded-full px-6 h-12 font-bold shadow-lg shadow-primary/20 transition-all hover:scale-105 active:scale-95"
            >
                <Plus className="mr-2 h-5 w-5" /> Novo Cartão
            </Button>
        </div>
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
      ) : filteredCards.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-24 text-center rounded-[40px] border-2 border-dashed border-border/60 bg-muted/20 backdrop-blur-sm">
              <div className="w-20 h-20 rounded-[28px] bg-background shadow-xl border border-border/40 flex items-center justify-center mb-6">
                <Filter className="h-10 w-10 text-primary opacity-40" />
              </div>
              <h3 className="text-xl font-black uppercase tracking-widest text-foreground/80">Nenhum cartão para estes filtros</h3>
              <p className="text-sm text-muted-foreground max-w-md mt-4 mb-8 leading-relaxed font-medium">
                  Não encontramos cartões que correspondam aos filtros selecionados. Tente ajustar os filtros ou limpe-os para ver todos os cartões.
              </p>
              <Button onClick={resetFilters} variant="outline" className="rounded-full px-8 h-12 font-bold border-2 hover:bg-primary/5 hover:border-primary/20 transition-all">
                Limpar Filtros
              </Button>
          </div>
      ) : (
        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
            {filteredCards.map((card) => (
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
        <DialogContent className="sm:max-w-md rounded-[32px] border-none shadow-2xl p-0 overflow-hidden">
          <div className="h-2 w-full bg-destructive/40" />
          <div className="p-8">
            <DialogHeader className="mb-6">
                <div className="flex items-center gap-4">
                    <div className="w-12 h-12 rounded-2xl bg-destructive/10 flex items-center justify-center shadow-sm">
                        <Trash2 className="h-6 w-6 text-destructive" />
                    </div>
                    <div className="flex flex-col text-left">
                        <DialogTitle className="text-2xl font-black tracking-tight">Excluir Cartão</DialogTitle>
                        <DialogDescription className="font-medium text-xs">
                            Esta ação não pode ser desfeita.
                        </DialogDescription>
                    </div>
                </div>
            </DialogHeader>
            
            <p className="text-sm text-muted-foreground leading-relaxed font-medium mb-8">
                Tem certeza que deseja excluir este cartão? O histórico de faturas poderá ser perdido e todas as transações vinculadas ficarão sem cartão.
            </p>

            <DialogFooter className="flex gap-2">
                <Button variant="ghost" onClick={() => setDeleteId(null)} className="flex-1 rounded-full h-12 font-bold">Cancelar</Button>
                <Button variant="destructive" onClick={confirmDelete} className="flex-1 rounded-full h-12 font-black uppercase tracking-widest shadow-lg shadow-destructive/20">Confirmar Exclusão</Button>
            </DialogFooter>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  )
}
