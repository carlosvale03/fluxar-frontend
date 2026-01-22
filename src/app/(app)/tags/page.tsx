"use client"

import { useState, useEffect } from "react"
import { Tag } from "@/types/categories"
import { getTags, deleteTag } from "@/services/tags"
import { Button } from "@/components/ui/button"
import { Separator } from "@/components/ui/separator"
import { PlusCircle, Pencil, Trash2, Tag as TagIcon, Search, BarChart3 } from "lucide-react"
import { Input } from "@/components/ui/input"
import { TagForm } from "@/components/tags/TagForm"
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

export default function TagsPage() {
  const [tags, setTags] = useState<Tag[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [isCreateOpen, setIsCreateOpen] = useState(false)
  const [editingTag, setEditingTag] = useState<Tag | undefined>(undefined)
  const [deletingTag, setDeletingTag] = useState<Tag | null>(null)
  const { toast } = useToast()

  /* New state for filtering */
  const [searchTerm, setSearchTerm] = useState("")

  /* Filter logic */
  const filteredTags = tags.filter(tag => 
    tag.name.toLowerCase().includes(searchTerm.toLowerCase())
  )

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
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-8">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Tags</h1>
          <p className="text-muted-foreground mt-1">
            Crie tags para organizar suas transações de forma personalizada.
          </p>
        </div>
          <Dialog open={isCreateOpen} onOpenChange={setIsCreateOpen}>
            <DialogTrigger asChild>
              <Button className="rounded-full shadow-sm hover:shadow-md transition-shadow">
                <PlusCircle className="mr-2 h-4 w-4" />
                Nova Tag
              </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-[500px]">
              <DialogHeader>
                <DialogTitle>Nova Tag</DialogTitle>
                <DialogDescription>
                  Crie tags para organizar suas transações de forma customizada.
                </DialogDescription>
              </DialogHeader>
              <TagForm 
                onSuccess={() => {
                  setIsCreateOpen(false)
                  refreshTags()
                }}
                onCancel={() => setIsCreateOpen(false)}
              />
            </DialogContent>
          </Dialog>
        </div>

        <div className="flex items-center justify-between gap-4 py-2">
           <div className="relative w-full max-w-sm">
            <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Buscar tags..."
              className="pl-9"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
           </div>
           <div className="text-sm text-muted-foreground hidden md:block">
                {filteredTags.length} tags encontradas
           </div>
        </div>

        <Separator className="my-6 opacity-0" />

        <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-4 gap-4">
          {filteredTags.length === 0 && !isLoading && (
              <div className="col-span-full flex flex-col items-center justify-center py-16 text-center text-muted-foreground border-2 border-dashed border-muted rounded-xl bg-muted/5">
                  <div className="w-12 h-12 rounded-full bg-muted flex items-center justify-center mb-4">
                    <TagIcon className="h-6 w-6 opacity-50" />
                  </div>
                  <h3 className="text-lg font-medium">Nenhuma tag encontrada</h3>
                  <p className="max-w-xs mx-auto mt-1 mb-4">
                    Não encontramos nenhuma tag com este nome. Que tal criar uma nova?
                  </p>
                  <Button variant="outline" onClick={() => setIsCreateOpen(true)}>
                    Criar Tag
                  </Button>
              </div>
          )}

          {filteredTags.map((tag) => (
            <div 
                key={tag.id} 
                className="group relative flex items-center gap-4 p-4 rounded-xl border border-border bg-card shadow-sm hover:shadow-md hover:border-primary/20 transition-all cursor-default"
            >
                 <div 
                    className="w-10 h-10 rounded-full shadow-sm ring-1 ring-black/5 dark:ring-white/10 flex items-center justify-center shrink-0"
                    style={{ backgroundColor: tag.color }}
                 >
                    <TagIcon className="h-5 w-5 text-white/90" />
                 </div>
                 
                 <div className="flex flex-col justify-center min-w-0 flex-1 h-10 relative">
                    <span className="font-medium text-base truncate leading-none">{tag.name}</span>
                 </div>
                 
                 <div className="flex gap-1 opacity-100 sm:opacity-0 group-hover:opacity-100 transition-opacity absolute right-2 bg-background/80 backdrop-blur-sm rounded-lg p-1 shadow-sm border border-border/50">
                    <Button variant="ghost" size="icon" className="h-8 w-8 text-muted-foreground hover:text-primary" disabled title="Relatórios (Em breve)">
                        <BarChart3 className="h-4 w-4" />
                    </Button>
                    <Separator orientation="vertical" className="h-6" />
                    <Button variant="ghost" size="icon" className="h-8 w-8 text-muted-foreground hover:text-primary" onClick={() => setEditingTag(tag)}>
                        <Pencil className="h-4 w-4" />
                    </Button>
                    <Button variant="ghost" size="icon" className="h-8 w-8 text-muted-foreground hover:text-destructive" onClick={() => setDeletingTag(tag)}>
                        <Trash2 className="h-4 w-4" />
                    </Button>
                 </div>
            </div>
          ))}
        </div>

        {/* Edit Dialog */}
        <Dialog open={!!editingTag} onOpenChange={(open) => !open && setEditingTag(undefined)}>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Editar Tag</DialogTitle>
                <DialogDescription>
                    Faça alterações na sua tag aqui. Clique em salvar quando terminar.
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
            </DialogContent>
        </Dialog>

        {/* Delete Alert */}
        <AlertDialog open={!!deletingTag} onOpenChange={(open) => !open && setDeletingTag(null)}>
            <AlertDialogContent>
                <AlertDialogHeader>
                    <AlertDialogTitle>Excluir Tag?</AlertDialogTitle>
                    <AlertDialogDescription>
                        Esta ação não pode ser desfeita.
                    </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                    <AlertDialogCancel>Cancelar</AlertDialogCancel>
                    <AlertDialogAction onClick={handleDelete} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
                        Excluir
                    </AlertDialogAction>
                </AlertDialogFooter>
            </AlertDialogContent>
        </AlertDialog>
        
    </div>
  )
}
