"use client"

import { useState, useEffect } from "react"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog"
import Link from "next/link"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Skeleton } from "@/components/ui/skeleton"
import { Search, PieChart as PieIcon, Plus, Tag as TagIcon } from "lucide-react"
import { getCategories } from "@/services/categories"
import { getTags } from "@/services/tags"
import { Category, Tag } from "@/types/categories"
import { createFocusedMonitor } from "@/services/focused-monitors"
import { cn } from "@/lib/utils"
import { toast } from "sonner"
import { tratarErro } from "@/lib/erros"
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
            tratarErro(error, { mensagemPadrao: "Não foi possível carregar as categorias e os marcadores.", tentarDeNovo: loadData })
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
            toast.success("Item adicionado ao monitor.")
            onOpenChange(false)
            onSuccess?.()
        } catch (error: any) {
            const msg = error.response?.data?.detail || "Não foi possível adicionar o item. Tente de novo."
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
            <DialogContent className="gap-0 overflow-hidden p-0 sm:max-w-[450px]">
                <DialogHeader className="p-6 pb-3">
                    <DialogTitle>Adicionar ao monitor</DialogTitle>
                    <DialogDescription>Escolha uma categoria ou um marcador para monitorar.</DialogDescription>
                </DialogHeader>

                <div className="px-6 pb-4">
                    <div className="relative">
                        <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" aria-hidden="true" />
                        <Input
                            aria-label="Buscar categoria ou marcador"
                            placeholder="Buscar categoria ou marcador"
                            className="pl-10"
                            value={search}
                            onChange={(e) => setSearch(e.target.value)}
                        />
                    </div>
                </div>

                <div className="max-h-[350px] space-y-6 overflow-y-auto px-2 pb-6">
                    {isLoading ? (
                        // AZ-34: skeleton com a forma das linhas da lista
                        <div className="space-y-2 px-6" aria-busy="true">
                            <span className="sr-only" role="status">Carregando categorias e marcadores.</span>
                            {[1, 2, 3, 4, 5].map((i) => (
                                <div key={i} className="flex items-center gap-3 p-2.5">
                                    <Skeleton className="h-8 w-8 shrink-0" />
                                    <Skeleton className="h-4 w-40" />
                                </div>
                            ))}
                        </div>
                    ) : (
                        <>
                            {filteredCategories.length > 0 && (
                                <div className="space-y-2 px-4">
                                    <h3 className="label flex items-center gap-2 px-2 text-muted-foreground">
                                        <PieIcon className="h-3.5 w-3.5" aria-hidden="true" /> Categorias
                                    </h3>
                                    <div className="grid grid-cols-1 gap-1">
                                        {filteredCategories.map(cat => (
                                            <button
                                                key={cat.id}
                                                type="button"
                                                disabled={isSaving}
                                                onClick={() => handleSelect('category', cat.id)}
                                                className={cn(
                                                    "group flex items-center justify-between rounded-md p-2.5 text-left transition-colors duration-fast hover:bg-elevated focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring disabled:opacity-45",
                                                    cat.parent && "ml-4 rounded-l-none border-l-2 border-border"
                                                )}
                                            >
                                                <div className="flex items-center gap-3">
                                                    {/* A cor é da categoria (dado do usuário): fica no ícone */}
                                                    <span
                                                        aria-hidden="true"
                                                        className="flex h-8 w-8 shrink-0 items-center justify-center rounded-md bg-elevated"
                                                        style={{ color: cat.color || 'var(--az-serie-2)' }}
                                                    >
                                                        <LucideIcon name={cat.icon || 'PieChart'} className="h-4 w-4" />
                                                    </span>
                                                    <div className="flex flex-col">
                                                        <span className="text-sm font-medium">{cat.name}</span>
                                                        {cat.parent_name && (
                                                            <span className="text-xs text-muted-foreground">Em {cat.parent_name}</span>
                                                        )}
                                                    </div>
                                                </div>
                                                <Plus className="h-4 w-4 text-muted-foreground" aria-hidden="true" />
                                            </button>
                                        ))}
                                    </div>
                                </div>
                            )}

                            {filteredTags.length > 0 && (
                                <div className="space-y-2 px-4">
                                    <h3 className="label flex items-center gap-2 px-2 text-muted-foreground">
                                        <TagIcon className="h-3.5 w-3.5" aria-hidden="true" /> Marcadores
                                    </h3>
                                    <div className="grid grid-cols-1 gap-1">
                                        {filteredTags.map(tag => (
                                            <button
                                                key={tag.id}
                                                type="button"
                                                disabled={isSaving}
                                                onClick={() => handleSelect('tag', tag.id)}
                                                className="group flex items-center justify-between rounded-md p-2.5 text-left transition-colors duration-fast hover:bg-elevated focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring disabled:opacity-45"
                                            >
                                                <div className="flex items-center gap-3">
                                                    <span
                                                        aria-hidden="true"
                                                        className="flex h-8 w-8 shrink-0 items-center justify-center rounded-md bg-elevated"
                                                        style={{ color: tag.color || 'var(--az-serie-3)' }}
                                                    >
                                                        <TagIcon className="h-4 w-4" />
                                                    </span>
                                                    <span className="text-sm font-medium">{tag.name}</span>
                                                </div>
                                                <Plus className="h-4 w-4 text-muted-foreground" aria-hidden="true" />
                                            </button>
                                        ))}
                                    </div>
                                </div>
                            )}

                            {filteredCategories.length === 0 && filteredTags.length === 0 && (
                                // AZ-34: título, uma linha e uma ação
                                <div className="flex flex-col items-center gap-3 px-6 py-12 text-center">
                                    {search ? (
                                        <>
                                            <div className="space-y-1">
                                                <p className="text-sm font-medium">Nenhum item com esta busca.</p>
                                                <p className="text-sm text-muted-foreground">Confira a grafia ou busque outro nome.</p>
                                            </div>
                                            <Button variant="outline" size="sm" onClick={() => setSearch("")}>
                                                Limpar busca
                                            </Button>
                                        </>
                                    ) : (
                                        <>
                                            <div className="space-y-1">
                                                <p className="text-sm font-medium">Nenhuma categoria de saída ou marcador.</p>
                                                <p className="text-sm text-muted-foreground">Crie uma categoria de saída para monitorar o gasto dela.</p>
                                            </div>
                                            <Button variant="outline" size="sm" asChild>
                                                <Link href="/categorias">Ver categorias</Link>
                                            </Button>
                                        </>
                                    )}
                                </div>
                            )}
                        </>
                    )}
                </div>
            </DialogContent>
        </Dialog>
    )
}
