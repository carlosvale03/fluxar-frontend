"use client"

import { useState, useEffect } from "react"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Search, PieChart as PieIcon, Hash, Plus, Loader2, Tag as TagIcon } from "lucide-react"
import { getCategories } from "@/services/categories"
import { getTags } from "@/services/tags"
import { Category, Tag } from "@/types/categories"
import { createFocusedMonitor } from "@/services/focused-monitors"
import { cn } from "@/lib/utils"
import { toast } from "sonner"
import { LucideIcon } from "@/components/ui/icon-picker"

interface FocusSelectionModalProps {
    open: boolean
    onOpenChange: (open: boolean) => void
    onSuccess?: () => void
}

export function FocusSelectionModal({ open, onOpenChange, onSuccess }: FocusSelectionModalProps) {
    const [search, setSearch] = useState("")
    const [categories, setCategories] = useState<Category[]>([])
    const [tags, setTags] = useState<Tag[]>([])
    const [isLoading, setIsLoading] = useState(false)
    const [isSaving, setIsSaving] = useState(false)

    useEffect(() => {
        if (open) {
            loadData()
        }
    }, [open])

    async function loadData() {
        setIsLoading(true)
        try {
            const [cats, tgs] = await Promise.all([getCategories(), getTags()])
            setCategories(cats)
            setTags(tgs)
        } catch (error) {
            console.error("Erro ao carregar categorias/tags:", error)
        } finally {
            setIsLoading(false)
        }
    }

    async function handleSelect(type: 'category' | 'tag', id: string) {
        setIsSaving(true)
        try {
            await createFocusedMonitor({
                category: type === 'category' ? id : undefined,
                tag: type === 'tag' ? id : undefined
            })
            toast.success("Item adicionado ao monitor!")
            onOpenChange(false)
            onSuccess?.()
        } catch (error: any) {
            const msg = error.response?.data?.detail || "Erro ao adicionar item."
            toast.error(msg)
        } finally {
            setIsSaving(false)
        }
    }

    // Flatten categories to include subcategories and filter by EXPENSE
    const allCategories: Category[] = []
    const flatten = (cats: Category[]) => {
        cats.forEach(cat => {
            if (cat.type === 'EXPENSE') {
                allCategories.push(cat)
            }
            if (cat.subcategories && cat.subcategories.length > 0) {
                flatten(cat.subcategories)
            }
        })
    }
    flatten(categories)

    const filteredCategories = allCategories.filter(c => 
        c.name.toLowerCase().includes(search.toLowerCase())
    )

    const filteredTags = tags.filter(t => 
        t.name.toLowerCase().includes(search.toLowerCase())
    )

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="sm:max-w-[450px] p-0 overflow-hidden rounded-[32px] border-none shadow-2xl">
                <DialogHeader className="p-6 pb-2">
                    <DialogTitle className="text-xl font-black">Adicionar ao Monitor</DialogTitle>
                    <DialogDescription>Selecione uma categoria ou tag para monitorar</DialogDescription>
                </DialogHeader>

                <div className="px-6 pb-4">
                    <div className="relative">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                        <Input 
                            placeholder="Buscar categoria ou tag..." 
                            className="pl-10 h-11 rounded-xl bg-muted/30 border-none focus-visible:ring-1 focus-visible:ring-primary/30"
                            value={search}
                            onChange={(e) => setSearch(e.target.value)}
                        />
                    </div>
                </div>

                <div className="max-h-[350px] overflow-y-auto px-2 pb-6 space-y-6">
                    {isLoading ? (
                        <div className="flex flex-col items-center justify-center py-12 text-muted-foreground">
                            <Loader2 className="h-8 w-8 animate-spin mb-4 text-primary/40" />
                            <span className="text-sm font-bold uppercase tracking-widest">Carregando itens...</span>
                        </div>
                    ) : (
                        <>
                            {filteredCategories.length > 0 && (
                                <div className="space-y-2 px-4">
                                    <h4 className="text-[10px] font-black uppercase tracking-widest text-muted-foreground/60 px-2 flex items-center gap-2">
                                        <PieIcon className="h-3 w-3" /> Categorias
                                    </h4>
                                    <div className="grid grid-cols-1 gap-1">
                                        {filteredCategories.map(cat => (
                                            <button
                                                key={cat.id}
                                                disabled={isSaving}
                                                onClick={() => handleSelect('category', cat.id)}
                                                className={cn(
                                                    "flex items-center justify-between p-3 rounded-2xl hover:bg-primary/5 transition-all text-left group border border-transparent hover:border-primary/10",
                                                    cat.parent && "ml-4 border-l-2 border-muted/20 rounded-l-none"
                                                )}
                                            >
                                                <div className="flex items-center gap-3">
                                                    <div 
                                                        className="w-8 h-8 rounded-lg flex items-center justify-center text-white shrink-0"
                                                        style={{ backgroundColor: cat.color || '#3b82f6' }}
                                                    >
                                                        <LucideIcon name={cat.icon || 'PieChart'} className="h-4 w-4" />
                                                    </div>
                                                    <div className="flex flex-col">
                                                        <span className="text-sm font-bold">{cat.name}</span>
                                                        {cat.parent_name && (
                                                            <span className="text-[10px] font-bold text-muted-foreground/60 uppercase">Em {cat.parent_name}</span>
                                                        )}
                                                    </div>
                                                </div>
                                                <Plus className="h-4 w-4 text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity" />
                                            </button>
                                        ))}
                                    </div>
                                </div>
                            )}

                            {filteredTags.length > 0 && (
                                <div className="space-y-2 px-4">
                                    <h4 className="text-[10px] font-black uppercase tracking-widest text-muted-foreground/60 px-2 flex items-center gap-2">
                                        <TagIcon className="h-3 w-3" /> Tags
                                    </h4>
                                    <div className="grid grid-cols-1 gap-1">
                                        {filteredTags.map(tag => (
                                            <button
                                                key={tag.id}
                                                disabled={isSaving}
                                                onClick={() => handleSelect('tag', tag.id)}
                                                className="flex items-center justify-between p-3 rounded-2xl hover:bg-purple-500/5 transition-all text-left group border border-transparent hover:border-purple-500/10"
                                            >
                                                <div className="flex items-center gap-3">
                                                    <div 
                                                        className="w-8 h-8 rounded-lg flex items-center justify-center"
                                                        style={{ backgroundColor: `${tag.color}20` || '#8b5cf620', color: tag.color || '#8b5cf6' }}
                                                    >
                                                        <TagIcon className="h-4 w-4" />
                                                    </div>
                                                    <span className="text-sm font-bold">{tag.name}</span>
                                                </div>
                                                <Plus className="h-4 w-4 text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity" />
                                            </button>
                                        ))}
                                    </div>
                                </div>
                            )}

                            {filteredCategories.length === 0 && filteredTags.length === 0 && (
                                <div className="text-center py-12 space-y-2">
                                    <p className="text-sm font-bold text-muted-foreground">Nenhum item encontrado.</p>
                                    <p className="text-[10px] font-black uppercase tracking-widest text-muted-foreground/40">Tente uma busca diferente</p>
                                </div>
                            )}
                        </>
                    )}
                </div>
            </DialogContent>
        </Dialog>
    )
}
