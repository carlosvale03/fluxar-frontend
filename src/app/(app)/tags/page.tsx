"use client"

import { useState, useEffect } from "react"
import { Tag as TagType } from "@/types/categories"
import { getTags, deleteTag, getTagInsights } from "@/services/tags"
import { Button } from "@/components/ui/button"
import { PlusCircle, Pencil, Trash2, Tag as TagIcon, Search, BarChart3, Sparkles, Filter, Info, ChevronLeft, ChevronRight, TrendingUp, TrendingDown, Calendar } from "lucide-react"
import { Input } from "@/components/ui/input"
import { TagForm } from "@/components/tags/TagForm"
import { ScrollArea } from "@/components/ui/scroll-area"
import { cn, formatCurrency } from "@/lib/utils"
import { 
  LineChart, 
  Line, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  ResponsiveContainer,
  AreaChart,
  Area
} from "recharts"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog"
import { useToast } from "@/components/ui/use-toast"
import { Skeleton } from "@/components/ui/skeleton"

// Componente de Texto Expansível para os exemplos de Tags (Regra #4)
function ExpandableText({ text }: { text: string }) {
    const [isExpanded, setIsExpanded] = useState(false);
    const maxLength = 80;
    const shouldTruncate = text.length > maxLength;

    return (
        <div className="space-y-1.5">
            <p className="text-[11px] text-muted-foreground leading-relaxed transition-all duration-300">
                {isExpanded ? text : (shouldTruncate ? `${text.slice(0, maxLength)}...` : text)}
            </p>
            {shouldTruncate && (
                <button 
                    onClick={() => setIsExpanded(!isExpanded)}
                    className="text-[9px] font-black uppercase tracking-widest text-primary hover:text-primary/70 transition-colors flex items-center gap-1 group"
                >
                    {isExpanded ? "Mostrar menos" : "Mostrar mais"}
                    <Sparkles className={cn("h-2.5 w-2.5 transition-transform", isExpanded ? "rotate-180" : "")} />
                </button>
            )}
        </div>
    );
}

export default function TagsPage() {
  const [tags, setTags] = useState<TagType[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [isCreateOpen, setIsCreateOpen] = useState(false)
  const [editingTag, setEditingTag] = useState<TagType | undefined>(undefined)
  const [deletingTag, setDeletingTag] = useState<TagType | null>(null)
  const { toast } = useToast()
  const [searchTerm, setSearchTerm] = useState("")
  const [isHelpOpen, setIsHelpOpen] = useState(false)
  
  // Insights State
  const [selectedInsightsTag, setSelectedInsightsTag] = useState<TagType | null>(null)
  const [isInsightsModalOpen, setIsInsightsModalOpen] = useState(false)
  const [insightsData, setInsightsData] = useState<any>(null)
  const [isLoadingInsights, setIsLoadingInsights] = useState(false)
  const [insightsMonths, setInsightsMonths] = useState(6)
  
  // Pagination State
  const [currentPage, setCurrentPage] = useState(1)
  const ITEMS_PER_PAGE = 12

  const filteredTags = tags.filter(tag => 
    tag.name.toLowerCase().includes(searchTerm.toLowerCase())
  )

  // Reset page when searching
  useEffect(() => {
    setCurrentPage(1)
  }, [searchTerm])

  // Pagination Logic
  const totalPages = Math.ceil(filteredTags.length / ITEMS_PER_PAGE)
  const paginatedTags = filteredTags.slice((currentPage - 1) * ITEMS_PER_PAGE, currentPage * ITEMS_PER_PAGE)
  const hasMultiplePages = totalPages > 1

  useEffect(() => {
    const fetchTags = async () => {
      try {
        const data = await getTags()
        setTags(data)
      } catch (error) {
        console.error(error)
        toast({
          title: "Erro ao carregar tags",
          variant: "destructive",
        })
      } finally {
        setIsLoading(false)
      }
    }
    fetchTags()
  }, [toast])

  const refreshTags = async () => {
      try {
        const data = await getTags()
        setTags(data)
      } catch (error) {
        console.error(error)
      }
  }

  const handleDelete = async () => {
    if (!deletingTag) return

    try {
      await deleteTag(deletingTag.id)
      toast({ title: "Tag excluída com sucesso" })
      refreshTags()
    } catch (error) {
       console.error(error)
       toast({
        title: "Erro ao excluir tag",
        description: "Tente novamente.",
        variant: "destructive",
       })
    } finally {
      setDeletingTag(null)
    }
  }

  const handleOpenInsights = async (tag: TagType, months: number = 6) => {
    setSelectedInsightsTag(tag)
    setIsInsightsModalOpen(true)
    setIsLoadingInsights(true)
    setInsightsMonths(months)
    
    try {
      const data = await getTagInsights(tag.id, months)
      setInsightsData(data)
    } catch (error) {
      console.error(error)
      toast({
        title: "Erro ao carregar insights",
        description: "Não foi possível obter os dados da tag no momento.",
        variant: "destructive",
      })
      if (!insightsData) setIsInsightsModalOpen(false)
    } finally {
      setIsLoadingInsights(false)
    }
  }

  return (
    <div className="container mx-auto py-10 px-4 max-w-7xl animate-in fade-in duration-500">
      {/* Premium Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 mb-10">
        <div className="flex items-center gap-5">
           <div className="w-16 h-16 rounded-[22px] bg-primary flex items-center justify-center shadow-2xl shadow-primary/20 ring-4 ring-primary/10">
              <TagIcon className="h-8 w-8 text-white animate-pulse" />
           </div>
           <div>
              <h1 className="text-4xl font-black tracking-tight text-foreground">Tags</h1>
              <div className="flex items-center gap-2 mt-1">
                <span className="text-[10px] font-black uppercase tracking-[0.2em] text-primary bg-primary/10 px-2 py-0.5 rounded-full">Organização Personalizada</span>
                <span className="text-[10px] font-black uppercase tracking-[0.2em] text-muted-foreground/40">•</span>
                <span className="text-[10px] font-medium text-muted-foreground">{tags.length} Itens cadatrados</span>
              </div>
           </div>
        </div>

        <Dialog open={isCreateOpen} onOpenChange={setIsCreateOpen}>
            <DialogTrigger asChild>
                <Button className="h-14 px-8 rounded-full bg-primary text-primary-foreground shadow-xl shadow-primary/20 hover:shadow-2xl hover:scale-105 active:scale-95 transition-all group overflow-hidden relative">
                    <div className="absolute inset-0 bg-gradient-to-r from-white/0 via-white/10 to-white/0 -translate-x-full group-hover:animate-shimmer" />
                    <PlusCircle className="mr-2 h-5 w-5" />
                    <span className="font-black uppercase tracking-widest text-sm">Nova Tag Premium</span>
                </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-[500px] rounded-[32px] border-none shadow-2xl p-0 overflow-hidden">
                <ScrollArea className="max-h-[85vh]">
                    <div className="p-8">
                        <DialogHeader className="mb-6">
                            <DialogTitle className="text-3xl font-black tracking-tight">Nova Tag</DialogTitle>
                            <DialogDescription className="text-xs font-medium text-muted-foreground/70">
                                Crie tags personalizadas para organizar suas transações com máxima precisão.
                            </DialogDescription>
                        </DialogHeader>
                        <TagForm 
                            onSuccess={() => {
                                setIsCreateOpen(false)
                                refreshTags()
                            }}
                            onCancel={() => setIsCreateOpen(false)}
                        />
                    </div>
                </ScrollArea>
            </DialogContent>
        </Dialog>
      </div>

      {/* Filter/Search Premium Bar */}
      <div className="flex flex-col sm:flex-row items-center justify-between gap-6 mb-12 bg-card/40 backdrop-blur-md p-4 rounded-[32px] border border-border/40 shadow-sm">
           <div className="relative w-full sm:max-w-md group">
                <Search className="absolute left-4 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground/40 group-focus-within:text-primary transition-colors" />
                <Input
                    placeholder="Filtrar por nome da tag..."
                    className="pl-11 h-12 bg-muted/20 border-transparent rounded-2xl focus-visible:ring-primary/20 focus-visible:border-primary/30 transition-all font-medium"
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                />
           </div>
      </div>

      {/* Banner de Ajuda Premium (Regra #4) */}
      <div className="mb-12 p-5 sm:p-6 rounded-[32px] bg-primary/5 border border-primary/10 flex flex-col sm:flex-row items-start gap-4 sm:gap-6 animate-in slide-in-from-bottom-4 duration-1000">
          <div className="w-12 h-12 rounded-2xl bg-primary/10 flex items-center justify-center shrink-0 border border-primary/20 hidden sm:flex">
              <Info className="h-6 w-6 text-primary" />
          </div>
          <div className="space-y-4 flex-1 w-full">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                  <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center shrink-0 border border-primary/20 sm:hidden">
                          <Info className="h-5 w-5 text-primary" />
                      </div>
                      <h4 className="font-black text-sm text-primary tracking-tight uppercase">Dica de Organização</h4>
                  </div>
                  <Button 
                    variant="ghost" 
                    size="sm" 
                    onClick={() => setIsHelpOpen(true)}
                    className="h-11 sm:h-9 w-full sm:w-auto rounded-full bg-primary/10 hover:bg-primary/20 text-primary text-[10px] font-black uppercase tracking-widest px-6 sm:px-4 transition-all shadow-md sm:shadow-none border border-primary/5"
                  >
                    <Sparkles className="h-3 w-3 mr-2" />
                    Exemplos de Uso
                  </Button>
              </div>
              <div className="max-w-4xl">
                  <ExpandableText text="As tags são ferramentas universais e poderosas que podem ser aplicadas em qualquer transação, independentemente da categoria ou conta. Elas permitem que você diferencie fluxos sazonais, projetos específicos ou gastos que requerem acompanhamento especial, proporcionando relatórios muito mais profundos e uma visão granular da sua saúde financeira real." />
              </div>
          </div>
      </div>

      {isLoading ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
          {[1, 2, 3, 4, 5, 6, 7, 8].map((i) => (
            <Skeleton key={i} className="h-28 w-full rounded-[32px] bg-muted/20" />
          ))}
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 pb-12">
          {filteredTags.length === 0 && (
              <div className="col-span-full flex flex-col items-center justify-center py-24 text-center border-2 border-dashed border-border/40 rounded-[40px] bg-muted/5 group hover:border-primary/20 transition-colors">
                  <div className="w-20 h-20 rounded-[28px] bg-muted/20 flex items-center justify-center mb-6 ring-8 ring-muted/5 group-hover:scale-110 transition-transform duration-500">
                    <TagIcon className="h-10 w-10 opacity-20" />
                  </div>
                  <h3 className="text-xl font-black tracking-tight text-foreground/70">Nenhuma tag encontrada</h3>
                  <p className="max-w-xs mx-auto mt-2 mb-8 text-sm text-muted-foreground/60 leading-relaxed">
                    Personalize sua experincia criando marcadores exclusivos para seu controle financeiro.
                  </p>
                  <Button 
                    variant="outline" 
                    onClick={() => setIsCreateOpen(true)}
                    className="rounded-full h-12 px-8 border-primary/20 hover:bg-primary/5 hover:border-primary/40 font-bold transition-all"
                  >
                    Criar Minha Primeira Tag
                  </Button>
              </div>
          )}

          {paginatedTags.map((tag) => (
            <div 
                key={tag.id} 
                className="group relative flex items-center gap-5 p-5 rounded-[32px] border border-border/40 bg-card shadow-sm hover:shadow-xl hover:border-primary/30 hover:-translate-y-1 transition-all duration-500 cursor-default overflow-hidden animate-in fade-in slide-in-from-bottom-2"
            >
                 {/* Bg Decorative Accent */}
                 <div 
                    className="absolute top-0 right-0 w-24 h-24 blur-[60px] opacity-10 -translate-y-1/2 translate-x-1/2 rounded-full"
                    style={{ backgroundColor: tag.color }}
                 />
                 
                 <div 
                    className="w-12 h-12 rounded-xl flex items-center justify-center shrink-0 shadow-lg ring-1 ring-black/5 dark:ring-white/10 transition-transform group-hover:scale-110 duration-500"
                    style={{ 
                        backgroundColor: tag.color,
                        boxShadow: `0 8px 16px -4px ${tag.color}60`
                    }}
                 >
                    <TagIcon className="h-6 w-6 text-white/90" />
                 </div>
                 
                 <div className="flex flex-col justify-center min-w-0 flex-1">
                    <span className="font-bold text-base text-foreground group-hover:text-primary transition-colors truncate">{tag.name}</span>
                    <div className="flex items-center gap-1.5 mt-0.5">
                        <div className="w-1 h-1 rounded-full opacity-40" style={{ backgroundColor: tag.color }} />
                        <span className="text-[9px] font-black uppercase tracking-widest text-muted-foreground/40">{tag.color}</span>
                    </div>
                 </div>
                 
                 {/* FAB Interno (Regra #5) */}
                 <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-all duration-300 absolute top-3 right-3 p-1.5 rounded-2xl bg-background/90 backdrop-blur-md shadow-2xl border border-border/60 translate-y-2 group-hover:translate-y-0">
                    <Button 
                        variant="ghost" 
                        size="icon" 
                        className="h-8 w-8 rounded-xl hover:bg-primary/10 text-primary transition-all"
                        onClick={(e) => {
                            e.stopPropagation();
                            handleOpenInsights(tag);
                        }}
                    >
                        <BarChart3 className="h-4 w-4" />
                    </Button>
                    <Button variant="ghost" size="icon" className="h-8 w-8 rounded-xl hover:bg-primary/10 text-primary transition-all" onClick={() => setEditingTag(tag)}>
                        <Pencil className="h-4 w-4" />
                    </Button>
                    <Button variant="ghost" size="icon" className="h-8 w-8 rounded-xl hover:bg-destructive/10 text-destructive/40 hover:text-destructive transition-all" onClick={() => setDeletingTag(tag)}>
                        <Trash2 className="h-4 w-4" />
                    </Button>
                 </div>
            </div>
          ))}
        </div>
      )}

      {/* Premium Pagination Controls */}
      {hasMultiplePages && (
        <div className="flex flex-col sm:flex-row items-center justify-between gap-6 py-10 border-t border-border/10">
            <p className="text-[10px] font-black uppercase tracking-[0.2em] text-muted-foreground/40">
                Mostrando <span className="text-foreground">{Math.min(filteredTags.length, (currentPage - 1) * ITEMS_PER_PAGE + 1)}</span> a <span className="text-foreground">{Math.min(filteredTags.length, currentPage * ITEMS_PER_PAGE)}</span> de <span className="text-foreground">{filteredTags.length}</span> tags
            </p>

            <div className="flex items-center gap-2">
                <Button
                    variant="ghost"
                    size="icon"
                    className="h-10 w-10 rounded-full border border-border/20 text-muted-foreground disabled:opacity-20 hover:bg-primary/5 hover:text-primary transition-all"
                    onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))}
                    disabled={currentPage === 1}
                >
                    <ChevronLeft className="h-5 w-5" />
                </Button>

                <div className="flex items-center gap-1.5 px-2">
                    {Array.from({ length: totalPages }, (_, i) => i + 1).map((page) => {
                        // Logic for displaying limited page numbers could go here (ellipsis)
                        // For now simple list as tags probably won't have 100s of pages
                        const isActive = currentPage === page
                        return (
                            <button
                                key={page}
                                onClick={() => setCurrentPage(page)}
                                className={cn(
                                    "h-10 min-w-[40px] px-2 rounded-full text-[10px] font-black transition-all duration-300",
                                    isActive 
                                        ? "bg-primary text-primary-foreground shadow-lg shadow-primary/20 scale-110" 
                                        : "text-muted-foreground/60 hover:bg-muted hover:text-foreground"
                                )}
                            >
                                {page.toString().padStart(2, '0')}
                            </button>
                        )
                    })}
                </div>

                <Button
                    variant="ghost"
                    size="icon"
                    className="h-10 w-10 rounded-full border border-border/20 text-muted-foreground disabled:opacity-20 hover:bg-primary/5 hover:text-primary transition-all"
                    onClick={() => setCurrentPage(prev => Math.min(totalPages, prev + 1))}
                    disabled={currentPage === totalPages}
                >
                    <ChevronRight className="h-5 w-5" />
                </Button>
            </div>
        </div>
      )}

      {/* Edit Dialog */}
      <Dialog open={!!editingTag} onOpenChange={(open) => !open && setEditingTag(undefined)}>
          <DialogContent className="sm:max-w-[500px] rounded-[32px] border-none shadow-2xl p-0 overflow-hidden">
            <ScrollArea className="max-h-[85vh]">
                <div className="p-8">
                    <DialogHeader className="mb-6">
                        <DialogTitle className="text-3xl font-black tracking-tight">Editar Tag</DialogTitle>
                        <DialogDescription className="text-xs font-medium text-muted-foreground/70">
                            Ajuste os detalhes visuais ou o nome para manter sua organização sempre impecável.
                        </DialogDescription>
                    </DialogHeader>
                    {editingTag && (
                        <TagForm 
                            tag={editingTag}
                            onSuccess={() => {
                                setEditingTag(undefined)
                                refreshTags()
                            }}
                            onCancel={() => setEditingTag(undefined)}
                        />
                    )}
                </div>
            </ScrollArea>
          </DialogContent>
      </Dialog>

      {/* Delete Alert */}
      <AlertDialog open={!!deletingTag} onOpenChange={(open) => !open && setDeletingTag(null)}>
          <AlertDialogContent className="rounded-[32px] border-none shadow-2xl p-8 max-w-md">
              <AlertDialogHeader className="space-y-4">
                  <div className="w-16 h-16 rounded-[22px] bg-destructive/10 flex items-center justify-center mb-2">
                      <Trash2 className="h-8 w-8 text-destructive" />
                  </div>
                  <AlertDialogTitle className="text-2xl font-black tracking-tight uppercase">Excluir Tag?</AlertDialogTitle>
                  <AlertDialogDescription className="text-sm font-medium leading-relaxed">
                      Esta ação é irreversível. Todas as transações marcadas com <strong className="text-foreground tracking-tight underline decoration-destructive/30 underline-offset-4">{deletingTag?.name}</strong> não perderão os dados, mas a etiqueta será removida de todo o histórico.
                  </AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter className="mt-8 gap-3">
                  <AlertDialogCancel className="h-12 px-6 rounded-full border-border font-bold hover:bg-muted mb-0">Cancelar Operação</AlertDialogCancel>
                  <AlertDialogAction onClick={handleDelete} className="h-12 px-8 rounded-full bg-destructive text-destructive-foreground hover:bg-destructive/90 shadow-lg shadow-destructive/20 font-black uppercase tracking-widest text-xs">
                      Confirmar Exclusão
                  </AlertDialogAction>
              </AlertDialogFooter>
          </AlertDialogContent>
      </AlertDialog>
      {/* Help Modal with Examples */}
      <Dialog open={isHelpOpen} onOpenChange={setIsHelpOpen}>
          <DialogContent className="sm:max-w-[700px] rounded-[32px] border-none shadow-2xl p-0 overflow-hidden bg-background">
              <ScrollArea className="max-h-[90vh]">
                  <div className="p-8">
                      <DialogTitle className="sr-only">Guia de Tags Premium</DialogTitle>
                      <DialogDescription className="sr-only">Exemplos e sugestões de uso de tags.</DialogDescription>
                      <DialogHeader className="mb-8">
                          <div className="flex items-center gap-4 mb-2">
                              <div className="w-12 h-12 rounded-2xl bg-primary/10 flex items-center justify-center shrink-0">
                                  <Sparkles className="h-6 w-6 text-primary" />
                              </div>
                              <div>
                                  <DialogTitle className="text-3xl font-black tracking-tight uppercase">Guia de Tags Premium</DialogTitle>
                                  <DialogDescription className="text-xs font-medium text-muted-foreground/70">
                                      Inspire-se com estas sugestões para elevar o nível da sua organização financeira.
                                  </DialogDescription>
                              </div>
                          </div>
                      </DialogHeader>

                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                          {[
                              { 
                                  name: "Renda Extra / Freelance", 
                                  desc: "Identifique ganhos extras além do seu salário fixo para medir a produtividade real dos seus projetos paralelos e side hustles.",
                                  color: "#10b981",
                                  tag: "RECEITA"
                              },
                              { 
                                  name: "Reembolsável", 
                                  desc: "Para gastos de trabalho ou compras para terceiros que serão devolvidos à sua conta futuramente. Essencial para não perder dinheiro de vista.",
                                  color: "#3b82f6",
                                  tag: "MISTA"
                              },
                              { 
                                  name: "Renda Passiva / Dividendos", 
                                  desc: "Marque juros, proventos e aluguéis recebidos para visualizar sua liberdade financeira crescendo mês após mês de forma consistente.",
                                  color: "#059669",
                                  tag: "RECEITA"
                              },
                              { 
                                  name: "Assinaturas / SaaS", 
                                  desc: "Identifique pagamentos recorrentes de serviços e softwares para avaliar quais ainda valem a pena manter no seu orçamento mensal.",
                                  color: "#a855f7",
                                  tag: "RECORRENTE"
                              },
                              { 
                                  name: "Viagem / Férias", 
                                  desc: "Agrupe todos os custos de um evento específico sem misturar com as despesas recorrentes. Perfeito para análise pós-viagem.",
                                  color: "#f97316",
                                  tag: "SAZONAL"
                              },
                              { 
                                  name: "Emergência / Saúde", 
                                  desc: "Marque gastos inesperados e imprevistos críticos para analisar a frequência desses eventos e ajustar sua reserva de oportunidade.",
                                  color: "#ef4444",
                                  tag: "ALERTA"
                              }
                          ].map((example, idx) => (
                              <div key={idx} className="p-5 rounded-3xl bg-muted/30 border border-border/40 hover:border-primary/20 hover:bg-muted/50 transition-all group">
                                  <div className="flex items-center gap-4 mb-3">
                                      <div 
                                          className="w-10 h-10 rounded-xl flex items-center justify-center shrink-0 shadow-lg ring-1 ring-black/5 dark:ring-white/10"
                                          style={{ backgroundColor: example.color }}
                                      >
                                          <TagIcon className="h-5 w-5 text-white/90" />
                                      </div>
                                      <div className="min-w-0">
                                          <div className="flex items-center gap-2 mb-0.5">
                                              <span className="font-bold text-sm truncate">{example.name}</span>
                                              <span 
                                                className="text-[8px] font-black uppercase tracking-wider px-2 py-0.5 rounded-full border"
                                                style={{ 
                                                    backgroundColor: `${example.color}15`, 
                                                    color: example.color,
                                                    borderColor: `${example.color}30`
                                                }}
                                              >
                                                {example.tag}
                                              </span>
                                          </div>
                                      </div>
                                  </div>
                                  <ExpandableText text={example.desc} />
                              </div>
                          ))}
                      </div>

                      <div className="mt-8 p-4 rounded-2xl bg-primary/5 border border-primary/10 flex items-center gap-3">
                          <Sparkles className="h-4 w-4 text-primary shrink-0" />
                          <p className="text-[10px] font-medium text-primary/80">
                              <strong>Dica Pro:</strong> Você pode aplicar múltiplas tags em uma única transação para uma análise ainda mais granular.
                          </p>
                      </div>

                      <Button 
                        onClick={() => setIsHelpOpen(false)}
                        className="w-full h-12 mt-8 rounded-full bg-foreground text-background font-bold hover:opacity-90 transition-all uppercase tracking-widest text-xs"
                      >
                        Entendi, vamos organizar!
                      </Button>
                  </div>
              </ScrollArea>
          </DialogContent>
      </Dialog>

      {/* Tag Insights Modal */}
      <Dialog open={isInsightsModalOpen} onOpenChange={setIsInsightsModalOpen}>
          <DialogContent className="sm:max-w-[650px] rounded-[40px] border-none shadow-3xl p-0 overflow-hidden bg-background/95 backdrop-blur-xl">
              <ScrollArea className="max-h-[90vh]">
                  <div className="p-8">
                               <DialogTitle className="sr-only">{insightsData?.tag_name || "Insights da Tag"}</DialogTitle>
                               <DialogDescription className="sr-only">Análise detalhada de movimentação financeira por etiqueta nos últimos meses.</DialogDescription>
                               <DialogHeader className="mb-10">
                                  <div className="flex items-center gap-5">
                                      <div 
                                          className={cn(
                                              "w-16 h-16 rounded-[24px] flex items-center justify-center shrink-0 shadow-2xl transition-transform duration-700",
                                              insightsData?.color || "bg-primary"
                                          )}
                                          style={insightsData ? { 
                                              backgroundColor: insightsData.color,
                                              boxShadow: `0 20px 40px -12px ${insightsData.color}40`
                                          } : {}}
                                      >
                                          {isLoadingInsights ? <div className="h-8 w-8 rounded-full border-2 border-white/20 border-t-white animate-spin" /> : <BarChart3 className="h-8 w-8 text-white" />}
                                      </div>
                                      <div className="flex-1 min-w-0">
                                          <div className="flex items-center gap-3">
                                              <DialogTitle className="text-3xl font-black tracking-tight truncate">
                                                {isLoadingInsights ? "Carregando..." : insightsData?.tag_name || "Insights da Tag"}
                                              </DialogTitle>
                                              {insightsData && <span className="text-[10px] font-black uppercase tracking-widest text-primary bg-primary/10 px-3 py-1 rounded-full border border-primary/20">Insights Ativos</span>}
                                          </div>
                                          <DialogDescription className="text-xs font-medium text-muted-foreground/70 mt-1 flex items-center gap-2">
                                              <Calendar className="h-3 w-3" />
                                              {isLoadingInsights ? "Aguarde enquanto analisamos os dados..." : "Visão consolidada dos últimos 6 meses de fluxo financeiro."}
                                          </DialogDescription>
                                      </div>
                                  </div>
                               </DialogHeader>

                               {isLoadingInsights ? (
                                   <div className="py-20 flex flex-col items-center justify-center space-y-6">
                                       <div className="relative">
                                         <div className="w-20 h-20 rounded-[28px] border-4 border-primary/10 border-t-primary animate-spin" />
                                         <BarChart3 className="absolute inset-0 m-auto h-8 w-8 text-primary/40 animate-pulse" />
                                       </div>
                                       <p className="text-xs font-black uppercase tracking-[0.2em] text-muted-foreground/60">Analisando dados da tag...</p>
                                   </div>
                               ) : insightsData && (
                                   <div className="animate-in fade-in slide-in-from-bottom-4 duration-700">

                               {/* Focused Monitor Replica */}
                               <div className="mb-10">
                                   <h4 className="text-[10px] font-black uppercase tracking-[0.2em] text-muted-foreground/50 mb-4 px-1">Monitor de Foco da Tag</h4>
                                   <div className={cn(
                                       "p-6 rounded-[32px] border relative overflow-hidden transition-all duration-500",
                                       insightsData.focus_monitor.status === 'success' && "bg-emerald-500/5 border-emerald-500/20",
                                       insightsData.focus_monitor.status === 'warning' && "bg-amber-500/5 border-amber-500/20",
                                       insightsData.focus_monitor.status === 'error' && "bg-rose-500/5 border-rose-500/20"
                                   )}>
                                       {/* Background Glow */}
                                       <div className={cn(
                                           "absolute -top-24 -right-24 w-48 h-48 blur-[80px] opacity-20 rounded-full",
                                           insightsData.focus_monitor.status === 'success' && "bg-emerald-500",
                                           insightsData.focus_monitor.status === 'warning' && "bg-amber-500",
                                           insightsData.focus_monitor.status === 'error' && "bg-rose-500"
                                       )} />

                                       <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-6 relative z-10">
                                           <div className="space-y-1">
                                               <p className="text-[10px] font-black uppercase tracking-widest text-muted-foreground/60">Gasto Líquido do Mês</p>
                                               <h3 className="text-3xl font-black tracking-tight">{formatCurrency(insightsData.focus_monitor.current_month)}</h3>
                                           </div>
                                           
                                           <div className="flex items-center gap-4">
                                               <div className="text-right">
                                                   <p className="text-[10px] font-black uppercase tracking-widest text-muted-foreground/60">Média ({insightsMonths} meses)</p>
                                                   <p className="text-sm font-bold opacity-80">{formatCurrency(insightsData.focus_monitor.average_month)}</p>
                                               </div>
                                               
                                               <div className={cn(
                                                   "w-12 h-12 rounded-2xl flex items-center justify-center shadow-lg",
                                                   insightsData.focus_monitor.status === 'success' && "bg-emerald-500 text-white shadow-emerald-500/20",
                                                   insightsData.focus_monitor.status === 'warning' && "bg-amber-500 text-white shadow-amber-500/20",
                                                   insightsData.focus_monitor.status === 'error' && "bg-rose-500 text-white shadow-rose-500/20"
                                               )}>
                                                   {insightsData.focus_monitor.status === 'success' && <TrendingDown className="h-6 w-6" />}
                                                   {insightsData.focus_monitor.status === 'warning' && <TrendingUp className="h-6 w-6" />}
                                                   {insightsData.focus_monitor.status === 'error' && <TrendingUp className="h-6 w-6" />}
                                               </div>
                                           </div>
                                       </div>

                                       <div className="mt-6 flex items-center gap-2">
                                           <div className="flex-1 h-1.5 bg-muted/20 rounded-full overflow-hidden">
                                               <div 
                                                   className={cn(
                                                       "h-full rounded-full transition-all duration-1000",
                                                       insightsData.focus_monitor.status === 'success' && "bg-emerald-500",
                                                       insightsData.focus_monitor.status === 'warning' && "bg-amber-500",
                                                       insightsData.focus_monitor.status === 'error' && "bg-rose-500"
                                                   )} 
                                                   style={{ 
                                                       width: `${Math.min(100, (insightsData.focus_monitor.current_month / (insightsData.focus_monitor.average_month || 1)) * 100)}%` 
                                                   }}
                                               />
                                           </div>
                                           <span className={cn(
                                               "text-[10px] font-black",
                                               insightsData.focus_monitor.status === 'success' && "text-emerald-600",
                                               insightsData.focus_monitor.status === 'warning' && "text-amber-600",
                                               insightsData.focus_monitor.status === 'error' && "text-rose-600"
                                           )}>
                                               {Math.round((insightsData.focus_monitor.current_month / (insightsData.focus_monitor.average_month || 1)) * 100)}%
                                           </span>
                                       </div>
                                   </div>
                               </div>

                               {/* Historical Chart */}
                               <div className="bg-card/30 rounded-[32px] p-6 border border-border/40">
                                   <div className="flex flex-col sm:flex-row items-center justify-between mb-8 gap-4">
                                       <h4 className="text-[10px] font-black uppercase tracking-[0.2em] text-muted-foreground/50">Histórico de Movimentação</h4>
                                       <div className="flex flex-wrap items-center gap-4">
                                           {/* Period Selector */}
                                           <div className="flex bg-muted/20 p-1 rounded-xl border border-border/10 mr-2">
                                               {[3, 6, 12].map((m) => (
                                                   <button
                                                       key={m}
                                                       onClick={() => selectedInsightsTag && handleOpenInsights(selectedInsightsTag, m)}
                                                       disabled={isLoadingInsights}
                                                       className={cn(
                                                           "px-3 py-1 rounded-lg text-[9px] font-black uppercase tracking-widest transition-all",
                                                           insightsMonths === m 
                                                               ? "bg-background text-primary shadow-sm" 
                                                               : "text-muted-foreground hover:text-foreground"
                                                       )}
                                                   >
                                                       {m}m
                                                   </button>
                                               ))}
                                           </div>
                                           <div className="flex items-center gap-4 border-l border-border/10 pl-4">
                                               <div className="flex items-center gap-1.5">
                                                   <div className="w-2 h-2 rounded-full bg-emerald-500" />
                                                   <span className="text-[9px] font-bold text-muted-foreground">RECEITAS</span>
                                               </div>
                                               <div className="flex items-center gap-1.5">
                                                   <div className="w-2 h-2 rounded-full bg-rose-500" />
                                                   <span className="text-[9px] font-bold text-muted-foreground">DESPESAS</span>
                                               </div>
                                           </div>
                                       </div>
                                   </div>
                                   
                                   <div className="h-[240px] w-full mt-4">
                                       {isInsightsModalOpen && insightsData && (
                                           <ResponsiveContainer width="100%" height="100%">
                                               <AreaChart data={insightsData.history_chart} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                                                   <defs>
                                                       <linearGradient id="colorIncome" x1="0" y1="0" x2="0" y2="1">
                                                           <stop offset="5%" stopColor="#10b981" stopOpacity={0.1}/>
                                                           <stop offset="95%" stopColor="#10b981" stopOpacity={0}/>
                                                       </linearGradient>
                                                       <linearGradient id="colorExpense" x1="0" y1="0" x2="0" y2="1">
                                                           <stop offset="5%" stopColor="#f43f5e" stopOpacity={0.1}/>
                                                           <stop offset="95%" stopColor="#f43f5e" stopOpacity={0}/>
                                                       </linearGradient>
                                                   </defs>
                                                   <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="rgba(0,0,0,0.05)" />
                                                   <XAxis 
                                                       dataKey="month" 
                                                       axisLine={false} 
                                                       tickLine={false} 
                                                       tick={{ fontSize: 9, fontWeight: 700, fill: '#94a3b8' }} 
                                                   />
                                                   <YAxis 
                                                       axisLine={false} 
                                                       tickLine={false} 
                                                       tick={{ fontSize: 9, fontWeight: 700, fill: '#94a3b8' }}
                                                       tickFormatter={(val) => `R$${val}`}
                                                   />
                                                   <Tooltip 
                                                       contentStyle={{ 
                                                           borderRadius: '16px', 
                                                           border: 'none', 
                                                           boxShadow: '0 10px 15px -3px rgba(0,0,0,0.1)',
                                                           fontSize: '11px',
                                                           fontWeight: '700'
                                                       }}
                                                       formatter={(value: any) => formatCurrency(value)}
                                                   />
                                                   <Area 
                                                       type="monotone" 
                                                       dataKey="income" 
                                                       stroke="#10b981" 
                                                       strokeWidth={3}
                                                       fillOpacity={1} 
                                                       fill="url(#colorIncome)" 
                                                       animationDuration={1500}
                                                   />
                                                   <Area 
                                                       type="monotone" 
                                                       dataKey="expense" 
                                                       stroke="#f43f5e" 
                                                       strokeWidth={3}
                                                       fillOpacity={1} 
                                                       fill="url(#colorExpense)" 
                                                       animationDuration={1500}
                                                   />
                                               </AreaChart>
                                           </ResponsiveContainer>
                                       )}
                                   </div>
                               </div>

                               <Button 
                                 onClick={() => setIsInsightsModalOpen(false)}
                                 className="w-full h-14 mt-10 rounded-full bg-foreground text-background font-black uppercase tracking-[0.2em] text-xs hover:opacity-90 active:scale-95 transition-all shadow-xl"
                               >
                                 Fechar Insights
                               </Button>
                           </div>
                       )}
                   </div>
               </ScrollArea>
           </DialogContent>
       </Dialog>

     </div>

   )
}
