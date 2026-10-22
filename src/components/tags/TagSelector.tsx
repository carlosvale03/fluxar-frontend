"use client"

import { useState, useEffect } from "react"
import { Tag } from "@/types/categories"
import { getTags, createTag } from "@/services/tags"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import { Check, Plus, Tag as TagIcon, X, Search, Loader2 } from "lucide-react"
import { cn } from "@/lib/utils"
import { tratarErro } from "@/lib/erros"
import { usePlan } from "@/hooks/use-plan"

interface TagSelectorProps {
  selectedTagIds: string[]
  onChange: (tagIds: string[]) => void
}

export function TagSelector({ selectedTagIds, onChange }: TagSelectorProps) {
  const [availableTags, setAvailableTags] = useState<Tag[]>([])
  const [searchTerm, setSearchTerm] = useState("")
  const [isLoading, setIsLoading] = useState(true)
  const [isCreating, setIsCreating] = useState(false)
  // PERM-20: criar ou excluir muda o uso dos limites do /auth/me
  const { atualizarUso } = usePlan()
  const [isOpen, setIsOpen] = useState(false)

  const fetchTags = async () => {
    try {
      setIsLoading(true)
      const data = await getTags()
      setAvailableTags(data)
    } catch (error) {
      tratarErro(error, { mensagemPadrao: "Não foi possível carregar os marcadores.", tentarDeNovo: fetchTags })
    } finally {
      setIsLoading(false)
    }
  }

  useEffect(() => {
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
      void atualizarUso()
      onChange([...selectedTagIds, newTag.id])
      setSearchTerm("")
    } catch (error) {
      // CONTRATO-33: nenhuma falha silenciosa
      tratarErro(error, { mensagemPadrao: "Não foi possível criar o marcador. Tente de novo." })
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
        <div className="border-b border-border p-2">
          <div className="relative">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" aria-hidden="true" />
            <Input
              aria-label="Buscar ou criar marcador"
              placeholder="Buscar ou criar"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-9"
              autoFocus
            />
          </div>
        </div>
        <div className="flex max-h-[250px] flex-col gap-0.5 overflow-y-auto p-1">
          {isLoading ? (
            <div className="flex items-center justify-center py-8">
              <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" aria-label="Carregando marcadores" />
            </div>
          ) : filteredTags.length > 0 ? (
            filteredTags.map(tag => {
              const isSelected = selectedTagIds.includes(tag.id)
              return (
                <button
                  key={tag.id}
                  type="button"
                  aria-pressed={isSelected}
                  onClick={() => toggleTag(tag.id)}
                  className={cn(
                    "flex w-full cursor-pointer items-center justify-between rounded-sm px-3 py-2 text-sm transition-colors duration-fast hover:bg-elevated focus-visible:bg-elevated focus-visible:outline-none",
                    isSelected && "bg-elevated font-medium"
                  )}
                >
                  <div className="flex min-w-0 items-center gap-2">
                     {/* Cor do marcador: dado do usuário */}
                     <span aria-hidden="true" className="h-2.5 w-2.5 shrink-0 rounded-full" style={{ backgroundColor: tag.color }} />
                     <span className="truncate">{tag.name}</span>
                  </div>
                  {isSelected && <Check className="h-4 w-4 shrink-0 text-gold-line" aria-hidden="true" />}
                </button>
              )
            })
          ) : searchTerm ? (
             <button
                type="button"
                onClick={handleCreateTag}
                disabled={isCreating}
                className="flex w-full cursor-pointer items-center gap-2 rounded-sm px-3 py-2 text-left text-sm transition-colors duration-fast hover:bg-elevated focus-visible:bg-elevated focus-visible:outline-none disabled:opacity-45"
             >
                {isCreating ? <Loader2 className="h-4 w-4 shrink-0 animate-spin" aria-hidden="true" /> : <Plus className="h-4 w-4 shrink-0 text-muted-foreground" aria-hidden="true" />}
                <span className="truncate">Criar o marcador &ldquo;{searchTerm}&rdquo;</span>
             </button>
          ) : (
             <div className="flex flex-col items-center gap-2 px-3 py-8 text-center text-sm text-muted-foreground">
               <TagIcon className="h-5 w-5" aria-hidden="true" />
               <p>Nenhum marcador ainda. Digite um nome para criar o primeiro.</p>
             </div>
          )}
        </div>
      </>
    )
  }

  return (
    <div className="space-y-4">
      <div className="flex min-h-[44px] flex-wrap items-center gap-2 rounded-md border border-dashed border-border-strong p-1.5">
        {selectedTags.length > 0 ? (
          <div className="flex flex-wrap items-center gap-2">
            {selectedTags.map(tag => (
              <span
                key={tag.id}
                className="inline-flex items-center gap-1.5 rounded-full border border-border-strong py-0.5 pl-2.5 pr-1 text-sm text-fg-secondary"
              >
                {/* Cor da tag: dado do usuário */}
                <span aria-hidden="true" className="h-2 w-2 shrink-0 rounded-full" style={{ backgroundColor: tag.color }} />
                {tag.name}
                <button
                  type="button"
                  aria-label={`Remover o marcador ${tag.name}`}
                  onClick={(e) => { e.stopPropagation(); removeTag(tag.id); }}
                  className="inline-flex h-6 w-6 cursor-pointer items-center justify-center rounded-full text-muted-foreground transition-colors duration-fast hover:bg-elevated hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                >
                  <X className="h-3.5 w-3.5" aria-hidden="true" />
                </button>
              </span>
            ))}

            <Popover open={isOpen} onOpenChange={setIsOpen}>
              <PopoverTrigger asChild>
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  aria-label="Adicionar marcadores"
                  className="h-8 w-8"
                >
                  <Plus aria-hidden="true" />
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-[280px] p-0" align="start">
                <TagListContent />
              </PopoverContent>
            </Popover>
          </div>
        ) : (
          <Popover open={isOpen} onOpenChange={setIsOpen}>
            <PopoverTrigger asChild>
              <button
                type="button"
                className="flex w-full cursor-pointer items-center gap-2 rounded-sm px-2 py-1.5 text-left text-sm text-muted-foreground transition-colors duration-fast hover:bg-elevated hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
              >
                <Plus className="h-4 w-4" aria-hidden="true" />
                <span>Adicionar marcadores</span>
              </button>
            </PopoverTrigger>
            <PopoverContent className="w-[280px] p-0" align="start">
               <TagListContent />
            </PopoverContent>
          </Popover>
        )}
      </div>
    </div>
  )
}
