"use client"

import { useState, useEffect } from "react"
import { Tag as TagType } from "@/types/categories"
import { getTags, deleteTag } from "@/services/tags"
import { Button } from "@/components/ui/button"
import { PlusCircle, Pencil, Trash2, Tag as TagIcon, Search, BarChart3, Sparkles, Filter, Info, ChevronLeft, ChevronRight } from "lucide-react"
import { Input } from "@/components/ui/input"
import { TagForm } from "@/components/tags/TagForm"
import { ScrollArea } from "@/components/ui/scroll-area"
import { cn } from "@/lib/utils"
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

export default function TagsPage() {
  const [tags, setTags] = useState<TagType[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [isCreateOpen, setIsCreateOpen] = useState(false)
  const [editingTag, setEditingTag] = useState<TagType | undefined>(undefined)
  const [deletingTag, setDeletingTag] = useState<TagType | null>(null)
  const { toast } = useToast()
  const [searchTerm, setSearchTerm] = useState("")
  
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
      <div className="mb-12 p-5 rounded-[32px] bg-primary/5 border border-primary/10 flex items-start gap-4 animate-in slide-in-from-bottom-4 duration-1000">
          <div className="w-12 h-12 rounded-2xl bg-primary/10 flex items-center justify-center shrink-0 border border-primary/20">
              <Info className="h-6 w-6 text-primary" />
          </div>
          <div className="space-y-1">
              <h4 className="font-black text-sm text-primary tracking-tight uppercase">Dica de Organização</h4>
              <p className="text-xs text-primary/70 leading-relaxed max-w-4xl">
                  As tags são universais e podem ser aplicadas em qualquer transação, independentemente da categoria ou conta. 
                  Diferencie seus fluxos sazonais (ex: Viagem Verão 2024) ou específicos (ex: Reembolsável) para relatórios mais profundos.
              </p>
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
                    Personalize sua experiência criando marcadores exclusivos para seu controle financeiro.
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
                    <Button variant="ghost" size="icon" className="h-8 w-8 rounded-xl hover:bg-primary/10 text-muted-foreground/40 hover:text-primary transition-all">
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
        
    </div>
  )
}
