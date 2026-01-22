"use client"

import { useState, useEffect, useMemo, Fragment } from "react"
import { Category } from "@/types/categories"
import { getCategories, deleteCategory } from "@/services/categories"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Separator } from "@/components/ui/separator"
import { PlusCircle, Pencil, Trash2, Search } from "lucide-react"
import { CategoryForm } from "@/components/categories/CategoryForm"
import { LucideIcon } from "@/components/ui/icon-picker"
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
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from "@/components/ui/tabs"
import { useToast } from "@/components/ui/use-toast"
import { Badge } from "@/components/ui/badge"
import { Skeleton } from "@/components/ui/skeleton"

export default function CategoriesPage() {
  const [categories, setCategories] = useState<Category[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [searchQuery, setSearchQuery] = useState("")
  const [activeTab, setActiveTab] = useState("expenses")
  const [isCreateOpen, setIsCreateOpen] = useState(false)
  const [editingCategory, setEditingCategory] = useState<Category | null>(null)
  const [deletingCategory, setDeletingCategory] = useState<Category | null>(null)
  const [creatingSubcategoryFor, setCreatingSubcategoryFor] = useState<Category | null>(null)
  const { toast } = useToast()

  const CATEGORY_ICON_MAP: Record<string, string> = {
    "moradia": "Home",
    "alimentação": "Utensils",
    "transporte": "Car",
    "saúde": "HeartPulse",
    "educação": "GraduationCap",
    "lazer": "Gamepad2",
    "salário": "Banknote",
    "outros": "Tag",
    "investimentos": "TrendingUp",
    "presentes": "Gift",
    "mercado": "ShoppingBasket",
    "restaurante": "Coffee",
    "assinaturas": "Tv",
    "internet": "Wifi",
    "telefone": "Smartphone",
    "luz": "Zap",
    "água": "Droplets",
  }

  const getCategoryIcon = (category: Category) => {
    if (category.icon && category.icon !== "Tag" && category.icon !== "circle" && category.icon !== "") {
      return category.icon
    }
    return CATEGORY_ICON_MAP[category.name.toLowerCase()] || "Tag"
  }

  useEffect(() => {
    fetchCategories()
  }, [])

  const fetchCategories = async () => {
    try {
      setIsLoading(true)
      const data = await getCategories()
      setCategories(data)
    } catch (error) {
      console.error(error)
      toast({
        title: "Erro ao carregar categorias",
        variant: "destructive",
      })
    } finally {
      setIsLoading(false)
    }
  }

  const refreshCategories = async () => {
    try {
      const data = await getCategories()
      setCategories(data)
    } catch (error) {
      console.error(error)
    }
  }

  const handleDelete = async () => {
    if (!deletingCategory) return

    try {
      await deleteCategory(deletingCategory.id)
      toast({ title: "Categoria excluída com sucesso" })
      refreshCategories()
    } catch (error) {
       console.error(error)
       toast({
        title: "Erro ao excluir categoria",
        description: "Verifique se existem transações vinculadas.",
        variant: "destructive",
       })
    } finally {
      setDeletingCategory(null)
    }
  }

  const filteredCategories = useMemo(() => {
    if (!searchQuery) return categories
    const lowerQ = searchQuery.toLowerCase()
    return categories.filter((cat) => {
       const parentMatches = cat.name.toLowerCase().includes(lowerQ)
       const childMatches = cat.subcategories?.some(sub => sub.name.toLowerCase().includes(lowerQ))
       return parentMatches || childMatches
    })
  }, [categories, searchQuery])

  const incomeCategories = filteredCategories.filter((cat) => cat.type === "INCOME")
  const expenseCategories = filteredCategories.filter((cat) => cat.type === "EXPENSE")

  // Recursive function or flat list with hierarchy logic
  const CategoryTable = ({ data }: { data: Category[] }) => {
    // API now returns nested structure, so 'data' are Roots.
    // No need to manual map children.

    return (
    <div className="rounded-md border bg-card">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead className="w-[80px]">Ícone</TableHead>
            <TableHead>Nome</TableHead>
            <TableHead>Cor</TableHead>
            <TableHead className="text-right">Ações</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {data.length === 0 ? (
            <TableRow>
              <TableCell colSpan={4} className="h-24 text-center text-muted-foreground">
                Nenhuma categoria encontrada.
              </TableCell>
            </TableRow>
          ) : (
            data.map((parent) => {
              const hasSubs = parent.subcategories && parent.subcategories.length > 0
              return (
              <Fragment key={parent.id}>
                <TableRow key={parent.id} className={`group hover:bg-primary/5 transition-colors ${hasSubs ? "border-0" : "border-b border-border"}`}>
                    <TableCell>
                    <div 
                        className="w-10 h-10 rounded-full flex items-center justify-center text-white shadow-sm ring-1 ring-white/10"
                        style={{ backgroundColor: parent.color }}
                    >
                        <LucideIcon name={getCategoryIcon(parent)} className="h-5 w-5" />
                    </div>
                    </TableCell>
                    <TableCell className="font-medium text-base">
                    <div className="flex items-center gap-2">
                        {parent.name}
                        {parent.is_default && <Badge variant="secondary" className="text-[10px] px-1 py-0 h-4 bg-muted/50">Padrão</Badge>}
                        <span className="text-xs text-muted-foreground/50 ml-2 font-light">
                            ({parent.subcategories?.length || 0}/5)
                        </span>
                    </div>
                    </TableCell>
                    <TableCell>
                    <div className="flex items-center gap-2 pl-2">
                        <div 
                        className="w-6 h-6 rounded-full border border-border/50 shadow-sm" 
                        style={{ backgroundColor: parent.color }} 
                        title={parent.color}
                        />
                    </div>
                    </TableCell>
                    <TableCell className="text-right">
                        <div className="flex justify-end gap-1 opacity-100 sm:opacity-0 group-hover:opacity-100 transition-opacity">
                            {!parent.is_default && (
                                <>
                                    <Button 
                                        variant="ghost" 
                                        size="icon" 
                                        className="h-8 w-8 text-primary hover:text-primary hover:bg-primary/10" 
                                        onClick={() => {
                                            setCreatingSubcategoryFor(parent)
                                        }} 
                                        title="Adicionar Subcategoria"
                                    >
                                        <PlusCircle className="h-4 w-4" />
                                    </Button>
                                    <Button variant="ghost" size="icon" className="h-8 w-8 hover:bg-muted" onClick={() => setEditingCategory(parent)}>
                                        <Pencil className="h-4 w-4" />
                                    </Button>
                                    <Button variant="ghost" size="icon" className="h-8 w-8 text-destructive hover:text-destructive hover:bg-destructive/10" onClick={() => setDeletingCategory(parent)}>
                                        <Trash2 className="h-4 w-4" />
                                    </Button>
                                </>
                            )}
                            {parent.is_default && (
                                <>
                                    <Button variant="ghost" size="icon" className="h-8 w-8 text-primary hover:text-primary hover:bg-primary/10" onClick={() => setCreatingSubcategoryFor(parent)} title="Adicionar Subcategoria">
                                        <PlusCircle className="h-4 w-4" />
                                    </Button>
                                    {/* <span className="text-xs text-muted-foreground italic pr-2 flex items-center">Sistema</span> */}
                                </>
                            )}
                        </div>
                    </TableCell>
                </TableRow>
                {/* Render Children */}
                {parent.subcategories?.map((child, index) => {
                    const isLast = index === (parent.subcategories?.length || 0) - 1
                    return (
                    <TableRow key={child.id} className={`group hover:bg-primary/5 transition-colors relative ${isLast ? "border-b border-border" : "border-0"}`}>
                        <TableCell className="py-2">
                             {/* Tree Connector L-Shape */}
                             <div className="flex h-full items-center relative pl-6">
                                {/* Vertical Line connecting to parent */}
                                <div className="absolute left-5 -top-1/2 bottom-1/2 w-px bg-border/80 group-hover:bg-primary/40 transition-colors h-[150%]" 
                                     style={{ display: index === 0 ? 'block' : 'block', top: '-50%', height: isLast ? '100%' : '150%'  }} 
                                />
                                
                                <div className="absolute left-[1.25rem] top-0 bottom-1/2 w-4 border-l border-b border-border/80 rounded-bl-xl h-full translate-y-[-50%] opacity-60" />
                                
                                <div 
                                    className="relative z-10 w-8 h-8 rounded-full flex items-center justify-center text-white opacity-90 shadow-sm ring-1 ring-border/70"
                                    style={{ backgroundColor: child.color }}
                                >
                                    <LucideIcon name={getCategoryIcon(child)} className="h-3.5 w-3.5" />
                                </div>
                             </div>
                        </TableCell>
                        <TableCell className="font-medium text-sm py-2">
                            <div className="flex items-center gap-2 text-muted-foreground group-hover:text-foreground transition-colors">
                                {child.name}
                            </div>
                        </TableCell>
                        <TableCell className="py-2">
                            <div className="flex items-center gap-2 pl-2 opacity-50 group-hover:opacity-100 transition-opacity">
                                <div 
                                className="w-5 h-5 rounded-full border border-border/50 shadow-sm" 
                                style={{ backgroundColor: child.color }} 
                                title={child.color}
                                />
                            </div>
                        </TableCell>
                        <TableCell className="text-right py-2">
                             {!child.is_default && (
                                <div className="flex justify-end gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                                    <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => setEditingCategory(child)}>
                                        <Pencil className="h-3 w-3" />
                                    </Button>
                                    <Button variant="ghost" size="icon" className="h-7 w-7 text-destructive hover:text-destructive hover:bg-destructive/10" onClick={() => setDeletingCategory(child)}>
                                        <Trash2 className="h-3 w-3" />
                                    </Button>
                                </div>
                            )}
                        </TableCell>
                    </TableRow>
                )})}
              </Fragment>
            )})
          )}
        </TableBody>
      </Table>
    </div>
  )
  }

  return (
    <div className="container mx-auto py-10 px-4 max-w-7xl animate-in fade-in duration-500">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-8">
        <div>
           <h1 className="text-3xl font-bold tracking-tight">Categorias</h1>
           <p className="text-muted-foreground mt-1">
             Gerencie suas categorias de receitas e despesas.
           </p>
        </div>
          <Dialog open={isCreateOpen} onOpenChange={setIsCreateOpen}>
            <DialogTrigger asChild>
              <Button className="w-full md:w-auto">
                <PlusCircle className="mr-2 h-4 w-4" />
                Nova Categoria
              </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-[425px]">
              <DialogHeader>
                <DialogTitle>Nova Categoria</DialogTitle>
                <DialogDescription>
                  Crie uma nova categoria personalizada.
                </DialogDescription>
              </DialogHeader>
              <CategoryForm 
                onSuccess={() => {
                  setIsCreateOpen(false)
                  refreshCategories()
                }}
                onCancel={() => setIsCreateOpen(false)}
              />
            </DialogContent>
          </Dialog>
        </div>

        <Separator className="my-6" />

        <div className="flex items-center justify-between gap-4 py-2">
          <div className="relative w-full max-w-sm">
            <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Buscar categoria..."
              className="pl-9"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
          </div>
        </div>

        {isLoading ? (
          <div className="space-y-4">
            <Skeleton className="h-10 w-40" />
            <Skeleton className="h-[400px] w-full" />
          </div>
        ) : (
          <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
            <div className="flex justify-center mb-8">
                 <TabsList className="grid w-full max-w-[400px] h-auto grid-cols-2 p-1.5 bg-muted/40 dark:bg-muted/20 backdrop-blur-sm border border-border/50 rounded-full">
                    <TabsTrigger 
                        value="expenses" 
                        className="rounded-full py-2.5 text-sm font-medium transition-all data-[state=active]:bg-primary data-[state=active]:text-primary-foreground data-[state=active]:shadow-md hover:text-foreground/80 h-full"
                    >
                        Despesas ({expenseCategories.length})
                    </TabsTrigger>
                    <TabsTrigger 
                        value="incomes" 
                        className="rounded-full py-2.5 text-sm font-medium transition-all data-[state=active]:bg-primary data-[state=active]:text-primary-foreground data-[state=active]:shadow-md hover:text-foreground/80 h-full"
                    >
                        Receitas ({incomeCategories.length})
                    </TabsTrigger>
                </TabsList>
            </div>
            
            <TabsContent value="expenses" className="mt-0 space-y-4">
              <CategoryTable data={expenseCategories} />
            </TabsContent>
            <TabsContent value="incomes" className="mt-0 space-y-4">
              <CategoryTable data={incomeCategories} />
            </TabsContent>
          </Tabs>
        )}

        {/* Subcategory Creation Dialog */}
        <Dialog open={!!creatingSubcategoryFor} onOpenChange={(open) => !open && setCreatingSubcategoryFor(null)}>
            <DialogContent className="sm:max-w-[425px]">
              <DialogHeader>
                <DialogTitle>Nova Subcategoria</DialogTitle>
                <DialogDescription>
                  Criando uma subcategoria para <strong>{creatingSubcategoryFor?.name}</strong>.
                </DialogDescription>
              </DialogHeader>
              {creatingSubcategoryFor && (
                  <CategoryForm 
                    parentCategory={creatingSubcategoryFor}
                    currentSubcategoryCount={categories.find(c => c.id === creatingSubcategoryFor.id)?.subcategories?.length || 0}
                    onSuccess={() => {
                        setCreatingSubcategoryFor(null)
                        refreshCategories()
                    }}
                    onCancel={() => setCreatingSubcategoryFor(null)}
                />
              )}
            </DialogContent>
        </Dialog>


        {/* Edit Dialog */}
        <Dialog open={!!editingCategory} onOpenChange={(open) => !open && setEditingCategory(null)}>
            <DialogContent className="sm:max-w-[425px]">
              <DialogHeader>
                <DialogTitle>Editar Categoria</DialogTitle>
                <DialogDescription>
                  Altere os detalhes da categoria selecionada.
                </DialogDescription>
              </DialogHeader>
              {editingCategory && (
                  <CategoryForm 
                    category={editingCategory}
                    onSuccess={() => {
                        setEditingCategory(null)
                        refreshCategories()
                    }}
                    onCancel={() => setEditingCategory(null)}
                />
              )}
            </DialogContent>
        </Dialog>

        {/* Delete Alert */}
        <AlertDialog open={!!deletingCategory} onOpenChange={(open) => !open && setDeletingCategory(null)}>
            <AlertDialogContent>
                <AlertDialogHeader>
                    <AlertDialogTitle className="text-destructive">Excluir Categoria?</AlertDialogTitle>
                    <AlertDialogDescription>
                        Esta ação não pode ser desfeita. Isso excluirá permanentemente a categoria &quot;{deletingCategory?.name}&quot;.
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
