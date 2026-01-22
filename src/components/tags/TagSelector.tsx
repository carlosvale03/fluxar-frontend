"use client"

import { useState, useEffect } from "react"
import { Tag } from "@/types/categories"
import { getTags, createTag } from "@/services/tags"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import { Check, Plus, Tag as TagIcon, X, Search, Loader2 } from "lucide-react"
import { cn } from "@/lib/utils"

interface TagSelectorProps {
  selectedTagIds: string[]
  onChange: (tagIds: string[]) => void
}

export function TagSelector({ selectedTagIds, onChange }: TagSelectorProps) {
  const [availableTags, setAvailableTags] = useState<Tag[]>([])
  const [searchTerm, setSearchTerm] = useState("")
  const [isLoading, setIsLoading] = useState(true)
  const [isCreating, setIsCreating] = useState(false)
  const [isOpen, setIsOpen] = useState(false)

  useEffect(() => {
    const fetchTags = async () => {
      try {
        const data = await getTags()
        setAvailableTags(data)
      } catch (error) {
        console.error("Erro ao carregar tags:", error)
      } finally {
        setIsLoading(false)
      }
    }
    fetchTags()
  }, [])

  const selectedTags = availableTags.filter(tag => selectedTagIds.includes(tag.id))
  
  const filteredTags = availableTags.filter(tag => 
    tag.name.toLowerCase().includes(searchTerm.toLowerCase())
  )

  const toggleTag = (tagId: string) => {
    if (selectedTagIds.includes(tagId)) {
      onChange(selectedTagIds.filter(id => id !== tagId))
    } else {
      onChange([...selectedTagIds, tagId])
    }
  }

  const handleCreateTag = async () => {
    if (!searchTerm.trim()) return
    
    setIsCreating(true)
    try {
      const newTag = await createTag({ 
        name: searchTerm.trim(), 
        color: "#6366f1" // Cor indigo padrão para novas tags
      })
      setAvailableTags(prev => [...prev, newTag])
      onChange([...selectedTagIds, newTag.id])
      setSearchTerm("")
    } catch (error) {
      console.error("Erro ao criar tag:", error)
    } finally {
      setIsCreating(false)
    }
  }

  const removeTag = (id: string) => {
    onChange(selectedTagIds.filter(tagId => tagId !== id))
  }

  return (
    <div className="space-y-2">
      <div className="flex flex-wrap items-center gap-2">
        {selectedTags.length > 0 && (
          <div className="flex flex-wrap gap-1.5">
            {selectedTags.map(tag => (
              <Badge 
                key={tag.id}
                style={{ backgroundColor: `${tag.color}20`, color: tag.color, borderColor: `${tag.color}40` }}
                className="hover:opacity-80 border-none transition-all gap-1.5 pl-2.5 pr-1 h-8 rounded-xl shadow-sm animate-in zoom-in-95 duration-200"
              >
                <span className="text-[11px] font-bold uppercase tracking-tight">{tag.name}</span>
                <button 
                  type="button"
                  onClick={(e) => { e.stopPropagation(); removeTag(tag.id); }}
                  className="hover:bg-black/10 dark:hover:bg-white/10 rounded-lg p-0.5 transition-colors"
                >
                  <X className="h-3 w-3" />
                </button>
              </Badge>
            ))}
          </div>
        )}

        <Popover open={isOpen} onOpenChange={setIsOpen}>
          <PopoverTrigger asChild>
            <Button 
              variant="outline" 
              size="sm" 
              className={cn(
                "h-8 rounded-xl border-dashed border-muted-foreground/30 hover:border-primary/50 hover:bg-primary/5 transition-all",
                selectedTags.length === 0 ? "px-4 w-full justify-start text-muted-foreground font-medium italic text-xs" : "px-3"
              )}
            >
              <Plus className={cn("h-3.5 w-3.5", selectedTags.length === 0 ? "mr-2" : "")} />
              {selectedTags.length === 0 ? "Adicionar etiquetas..." : ""}
            </Button>
          </PopoverTrigger>
          <PopoverContent className="w-[240px] p-0 rounded-2xl shadow-xl border-border/40" align="end">
            <div className="p-2 border-b border-border/40 bg-muted/20">
              <div className="relative">
                <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                <Input 
                  placeholder="Buscar ou criar..." 
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-9 h-9 text-xs rounded-xl border-border/60 bg-background"
                  autoFocus
                />
              </div>
            </div>
            <div className="max-h-[220px] overflow-y-auto p-1.5 gap-0.5 flex flex-col">
              {isLoading ? (
                <div className="flex items-center justify-center py-6">
                  <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
                </div>
              ) : filteredTags.length > 0 ? (
                filteredTags.map(tag => {
                  const isSelected = selectedTagIds.includes(tag.id)
                  return (
                    <button
                      key={tag.id}
                      type="button"
                      onClick={() => toggleTag(tag.id)}
                      className={cn(
                        "group w-full flex items-center justify-between px-3 py-2 text-sm rounded-xl transition-all",
                        isSelected ? "bg-primary/10 text-primary font-bold" : "hover:bg-muted"
                      )}
                    >
                      <div className="flex items-center gap-2.5">
                         <div className="w-2.5 h-2.5 rounded-full ring-1 ring-black/5" style={{ backgroundColor: tag.color }} />
                         <span className="truncate group-hover:translate-x-0.5 transition-transform">{tag.name}</span>
                      </div>
                      {isSelected && <Check className="h-4 w-4 shrink-0 animate-in zoom-in-50 duration-300" />}
                    </button>
                  )
                })
              ) : searchTerm ? (
                 <button
                    type="button"
                    onClick={handleCreateTag}
                    disabled={isCreating}
                    className="w-full flex items-center gap-2.5 px-3 py-3 text-sm rounded-xl hover:bg-primary/10 hover:text-primary transition-all text-left group"
                 >
                    <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center shrink-0">
                      {isCreating ? <Loader2 className="h-4 w-4 animate-spin" /> : <Plus className="h-4 w-4 text-primary" />}
                    </div>
                    <div className="flex flex-col">
                      <span className="font-bold text-xs uppercase tracking-tight">Criar nova tag</span>
                      <span className="truncate text-[10px] text-muted-foreground group-hover:text-primary/70 transition-colors uppercase">"{searchTerm}"</span>
                    </div>
                 </button>
              ) : (
                 <div className="px-3 py-8 text-xs text-center text-muted-foreground flex flex-col items-center gap-2">
                   <TagIcon className="h-4 w-4 opacity-20" />
                   Nenhuma tag disponível.
                 </div>
              )}
            </div>
          </PopoverContent>
        </Popover>
      </div>
    </div>
  )
}
