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

  function TagListContent() {
    return (
      <>
        <div className="p-3 border-b border-border/40 bg-muted/20">
          <div className="relative">
            <Search className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground/40" />
            <Input 
              placeholder="Buscar ou criar..." 
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10 h-10 text-xs rounded-2xl border-none bg-background shadow-inner focus-visible:ring-primary/20"
              autoFocus
            />
          </div>
        </div>
        <div className="max-h-[250px] overflow-y-auto p-2 gap-1 flex flex-col">
          {isLoading ? (
            <div className="flex items-center justify-center py-8">
              <Loader2 className="h-5 w-5 animate-spin text-primary" />
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
                    "group w-full flex items-center justify-between px-3 py-2.5 text-sm rounded-2xl transition-all cursor-pointer",
                    isSelected 
                      ? "bg-primary text-primary-foreground font-black shadow-lg shadow-primary/20" 
                      : "hover:bg-primary/5 hover:text-primary"
                  )}
                >
                  <div className="flex items-center gap-3">
                     <div 
                        className={cn(
                          "w-3 h-3 rounded-full ring-2 ring-black/5 transition-transform group-hover:scale-125",
                          isSelected && "ring-white/20"
                        )} 
                        style={{ backgroundColor: tag.color }} 
                      />
                     <span className="truncate uppercase tracking-tight font-bold text-[11px]">{tag.name}</span>
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
                className="w-full flex items-center gap-3 p-3 text-sm rounded-2xl hover:bg-primary/5 hover:text-primary transition-all text-left group cursor-pointer"
             >
                <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center shrink-0">
                  {isCreating ? <Loader2 className="h-5 w-5 animate-spin" /> : <Plus className="h-5 w-5 text-primary" />}
                </div>
                <div className="flex flex-col">
                  <span className="font-black text-[10px] uppercase tracking-widest text-muted-foreground group-hover:text-primary/70 transition-colors">Criar nova tag</span>
                  <span className="truncate text-sm font-bold tracking-tight">"{searchTerm}"</span>
                </div>
             </button>
          ) : (
             <div className="px-3 py-10 text-xs text-center text-muted-foreground/40 flex flex-col items-center gap-3">
               <div className="w-12 h-12 rounded-full bg-muted flex items-center justify-center opacity-50">
                <TagIcon className="h-6 w-6" />
               </div>
               <p className="font-bold uppercase tracking-widest text-[10px]">Nenhuma tag encontrada</p>
             </div>
          )}
        </div>
      </>
    )
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center gap-2 min-h-[44px] p-2.5 rounded-3xl border border-dashed border-border/40 hover:border-primary/30 transition-all bg-muted/5">
        {selectedTags.length > 0 ? (
          <div className="flex flex-wrap gap-3">
            {selectedTags.map(tag => (
              <Badge 
                key={tag.id}
                style={{ 
                  backgroundColor: `${tag.color}15`, 
                  color: tag.color, 
                  borderColor: `${tag.color}40`,
                  clipPath: "polygon(10px 0, 100% 0, 100% 100%, 10px 100%, 0 50%)"
                }}
                className="hover:scale-105 border-l-0 transition-all gap-2 pl-6 pr-2 py-1.5 rounded-r-xl shadow-sm animate-in zoom-in-95 duration-200 cursor-default h-9"
              >
                <span className="text-[10px] font-black uppercase tracking-widest">{tag.name}</span>
                <button 
                  type="button"
                  onClick={(e) => { e.stopPropagation(); removeTag(tag.id); }}
                  className="hover:bg-white/20 dark:hover:bg-black/20 rounded-full p-0.5 transition-colors"
                >
                  <X className="h-4 w-4" />
                </button>
              </Badge>
            ))}
            
            <Popover open={isOpen} onOpenChange={setIsOpen}>
              <PopoverTrigger asChild>
                <Button 
                  variant="ghost" 
                  size="icon" 
                  className="h-9 w-9 rounded-full hover:bg-primary/10 hover:text-primary transition-all bg-muted/10 border border-border/10"
                >
                  <Plus className="h-5 w-5" />
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-[280px] p-0 rounded-3xl shadow-2xl border-border/40 overflow-hidden" align="start">
                <TagListContent />
              </PopoverContent>
            </Popover>
          </div>
        ) : (
          <Popover open={isOpen} onOpenChange={setIsOpen}>
            <PopoverTrigger asChild>
              <button 
                type="button"
                className="flex items-center gap-3 px-4 py-2 w-full text-left text-muted-foreground/40 hover:text-primary/70 transition-all group cursor-pointer"
              >
                <div className="w-8 h-8 rounded-xl bg-muted-foreground/10 flex items-center justify-center group-hover:bg-primary/10 group-hover:text-primary transition-all border border-transparent group-hover:border-primary/20">
                  <Plus className="h-4 w-4" />
                </div>
                <span className="text-[11px] font-black uppercase tracking-[0.2em]">Adicionar etiquetas...</span>
              </button>
            </PopoverTrigger>
            <PopoverContent className="w-[280px] p-0 rounded-3xl shadow-2xl border-border/40 overflow-hidden" align="start">
               <TagListContent />
            </PopoverContent>
          </Popover>
        )}
      </div>
    </div>
  )
}
