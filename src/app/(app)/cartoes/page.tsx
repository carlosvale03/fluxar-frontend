"use client"

import { useEffect, useState } from "react"
import { Plus, CreditCard, Filter, X, RotateCcw, Trash2 } from "lucide-react"
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
import { AvisoDeLimite } from "@/components/planos/aviso-de-limite"
import { cn } from "@/lib/utils"
import { tratarErro } from "@/lib/erros"
import { AvisoDoPlano } from "@/components/planos/recurso-bloqueado"
import { InvoiceList } from "@/components/cards/invoice-list"
import { InvoicePaymentDialog } from "@/components/transactions/invoice-payment-dialog"
import { Invoice } from "@/types/cards"

// PERM-19 e PERM-22: com `cartoes` fechado, a tela mostra o aviso do plano no
// lugar dos cartões (sem "Novo cartão") e, abaixo, as faturas dos cartões que
// já existem, que continuam podendo ser pagas e estornadas
export default function CardsPage() {
  const { podeUsar } = usePlan()
  const cartoes = podeUsar("cartoes")
  if (cartoes === null) return null
  return cartoes ? <TelaDeCartoes /> : <FaturasComCartoesTravados />
}

// SPEC_DEVIATION: a spec lista /credit-cards/ entre as rotas da trava `cartoes`.
// Reason: PERM-22 exige pagar e estornar as faturas existentes; por isso a
// leitura dos cartões e das faturas segue liberada (decisão do design.md).
function FaturasComCartoesTravados() {
  const [cards, setCards] = useState<ICreditCard[]>([])
  const [faturaParaPagar, setFaturaParaPagar] = useState<Invoice | null>(null)
  // Recria as listas de faturas depois de pagar ou estornar
  const [versao, setVersao] = useState(0)

  const carregarCartoes = async () => {
    try {
      const response = await api.get("/credit-cards/")
      setCards(response.data || [])
    } catch (error) {
      tratarErro(error, { mensagemPadrao: "Erro ao carregar cartões.", tentarDeNovo: carregarCartoes })
    }
  }

  useEffect(() => {
    carregarCartoes()
  }, [])

  const estornar = async (invoice: Invoice) => {
    try {
      await api.post(`/invoices/${invoice.id}/unpay/`)
      toast.success("Pagamento desfeito com sucesso!")
      setVersao((v) => v + 1)
    } catch (error) {
      tratarErro(error, { mensagemPadrao: "Erro ao desfazer pagamento." })
    }
  }

  return (
    <div className="container mx-auto py-12 px-6 max-w-7xl space-y-12 animate-in fade-in duration-700">
      <AvisoDoPlano titulo="Cartões" />

      {cards.length > 0 && (
        <div className="space-y-8">
          <div className="space-y-1 pl-2">
            <h2 className="text-xl font-bold tracking-tight">Faturas dos seus cartões</h2>
            <p className="text-sm text-muted-foreground">
              Você continua podendo pagar e estornar as faturas dos cartões que já tem.
            </p>
          </div>
          {cards.map((card) => (
            <section key={`${card.id}-${versao}`} aria-label={`Faturas do ${card.name}`} className="space-y-3">
              <h3 className="font-black pl-2">{card.name}</h3>
              <InvoiceList cardId={card.id} onPayInvoice={setFaturaParaPagar} onUnpayInvoice={estornar} />
            </section>
          ))}
        </div>
      )}

      <InvoicePaymentDialog
        open={!!faturaParaPagar}
        onOpenChange={(aberto) => {
          if (!aberto) setFaturaParaPagar(null)
        }}
        invoiceId={faturaParaPagar?.id}
        initialAmount={faturaParaPagar?.total_amount}
        onSuccess={() => {
          setFaturaParaPagar(null)
          setVersao((v) => v + 1)
        }}
      />
    </div>
  )
}

function TelaDeCartoes() {
  const [cards, setCards] = useState<ICreditCard[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [selectedCard, setSelectedCard] = useState<ICreditCard | undefined>(undefined)
  const [isFormOpen, setIsFormOpen] = useState(false)
  const [deleteId, setDeleteId] = useState<string | null>(null)
  
  // Filter States
  const [isFilterSheetOpen, setIsFilterSheetOpen] = useState(false)
  const [selectedInstitutions, setSelectedInstitutions] = useState<string[]>([])
  
  const { limiteAtingido } = usePlan()
  
  // Extract unique institutions from registered cards
  const availableInstitutions = Array.from(new Set(cards.map(c => c.institution).filter(Boolean))) as string[]

  // PERM-18 e PERM-20: o limite e o uso vêm do acesso do /auth/me
  const hasReachedLimit = limiteAtingido("limite_cartoes")

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
      const data = response.data
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

      {/* PERM-20: uso e limite de cartões do plano */}
      <div className="mb-10">
        <AvisoDeLimite chave="limite_cartoes" rotulo="cartões" />
      </div>

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
