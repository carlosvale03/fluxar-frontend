"use client"

import { useState, useEffect, useMemo, Fragment } from "react"
import { Category } from "@/types/categories"
import { getCategories, deleteCategory } from "@/services/categories"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Separator } from "@/components/ui/separator"
import { PlusCircle, Pencil, Trash2, Search, Wallet, Sparkles, Tag } from "lucide-react"
import { CategoryForm } from "@/components/categories/CategoryForm"
import { LucideIcon } from "@/components/ui/icon-picker"
import { cn } from "@/lib/utils"
import { ScrollArea } from "@/components/ui/scroll-area"
import { MoreVertical, ChevronDown, ChevronRight, CornerDownRight } from "lucide-react"
import {
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuItem,
} from "@/components/ui/dropdown-menu"
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

  const CategoryMobileList = ({ data }: { data: Category[] }) => {
    if (data.length === 0) {
        return (
            <div className="flex flex-col items-center justify-center py-20 text-center opacity-40">
                <Tag className="h-12 w-12 mb-4" />
                <p className="text-xs font-black uppercase tracking-widest">Nenhuma categoria encontrada</p>
            </div>
        )
    }

    return (
        <div className="sm:hidden space-y-0 bg-background rounded-none border-y border-border/40 overflow-hidden -mx-4">
            {data.map((category, index) => (
                <div key={category.id} className={cn(
                    "group animate-in fade-in slide-in-from-left-2 duration-500",
                    index !== 0 && "border-t-[8px] border-muted/20"
                )}>
                    {/* Parent Row */}
                    <div className="flex items-center gap-4 p-5 bg-card hover:bg-muted/30 transition-colors active:bg-muted/50">
                        <div 
                            className="w-12 h-12 rounded-2xl flex items-center justify-center text-white shrink-0 shadow-lg ring-4 ring-black/5 dark:ring-white/5"
                            style={{ 
                                backgroundColor: category.color,
                                boxShadow: `0 8px 16px -4px ${category.color}40`
                            }}
                        >
                            <LucideIcon name={category.icon || "Tag"} className="h-6 w-6" />
                        </div>
                        
                        <div className="flex-1 min-w-0">
                            <h3 className="font-black text-base text-foreground tracking-tight">{category.name}</h3>
                            {category.subcategories && category.subcategories.length > 0 && (
                                <div className="flex items-center gap-1.5 mt-1">
                                    <div className="w-1 h-1 rounded-full bg-primary" />
                                    <p className="text-[9px] font-black uppercase tracking-[0.2em] text-primary/70">
                                        {category.subcategories.length} subcategorias
                                    </p>
                                </div>
                            )}
                        </div>

                        <div className="flex items-center gap-1">
                            <Button 
                                variant="ghost" 
                                size="icon" 
                                className="h-11 w-11 rounded-full bg-muted/20 text-muted-foreground/60 active:scale-90 transition-all"
                                onClick={() => setCreatingSubcategoryFor(category)}
                            >
                                <PlusCircle className="h-5.5 w-5.5" />
                            </Button>
                            
                            <DropdownMenu>
                                <DropdownMenuTrigger asChild>
                                    <Button variant="ghost" size="icon" className="h-11 w-11 rounded-full text-muted-foreground/40">
                                        <MoreVertical className="h-5.5 w-5.5" />
                                    </Button>
                                </DropdownMenuTrigger>
                                <DropdownMenuContent align="end" className="rounded-[24px] min-w-[180px] border-border/40 shadow-2xl p-2">
                                    <DropdownMenuItem onClick={() => setEditingCategory(category)} className="rounded-xl flex items-center gap-3 py-3 font-bold transition-all focus:bg-primary/10 focus:text-primary">
                                        <Pencil className="h-4 w-4" />
                                        <span>Editar Categoria</span>
                                    </DropdownMenuItem>
                                    <DropdownMenuItem onClick={() => setDeletingCategory(category)} className="rounded-xl flex items-center gap-3 py-3 font-bold text-destructive focus:bg-destructive/10 transition-all">
                                        <Trash2 className="h-4 w-4" />
                                        <span>Excluir Categoria</span>
                                    </DropdownMenuItem>
                                </DropdownMenuContent>
                            </DropdownMenu>
                        </div>
                    </div>

                    {/* Subcategories Container */}
                    <div className="bg-muted/5 divide-y divide-border/5">
                        {category.subcategories?.map((child) => (
                            <div key={child.id} className="flex items-center gap-3 py-4 pl-10 pr-5 hover:bg-muted/10 transition-colors active:bg-muted/20">
                                <div className="flex items-center shrink-0">
                                    <CornerDownRight className="h-4 w-4 text-muted-foreground/20 mr-3" />
                                    <div 
                                        className="w-3.5 h-3.5 rounded-full ring-4 ring-white/5 shadow-inner"
                                        style={{ backgroundColor: child.color }}
                                    />
                                </div>
                                
                                <span className="flex-1 text-sm font-bold text-foreground/60 tracking-tight truncate">{child.name}</span>
                                
                                <DropdownMenu>
                                    <DropdownMenuTrigger asChild>
                                        <Button variant="ghost" size="icon" className="h-9 w-9 rounded-full text-muted-foreground/30">
                                            <MoreVertical className="h-4 w-4" />
                                        </Button>
                                    </DropdownMenuTrigger>
                                    <DropdownMenuContent align="end" className="rounded-[20px] min-w-[150px] border-border/40 shadow-xl p-1.5">
                                        <DropdownMenuItem onClick={() => setEditingCategory(child)} className="rounded-lg flex items-center gap-2.5 py-2.5 font-bold text-xs">
                                            <Pencil className="h-3.5 w-3.5" />
                                            <span>Editar</span>
                                        </DropdownMenuItem>
                                        <DropdownMenuItem onClick={() => setDeletingCategory(child)} className="rounded-lg flex items-center gap-2.5 py-2.5 font-bold text-xs text-destructive focus:bg-destructive/10">
                                            <Trash2 className="h-3.5 w-3.5" />
                                            <span>Excluir</span>
                                        </DropdownMenuItem>
                                    </DropdownMenuContent>
                                </DropdownMenu>
                            </div>
                        ))}
                    </div>
                </div>
            ))}
        </div>
    )
  }

  const CategoryTable = ({ data }: { data: Category[] }) => {
    return (
    <div className="hidden sm:block sm:rounded-[32px] rounded-none border border-border/40 max-sm:border-x-0 bg-card overflow-hidden shadow-xl animate-in fade-in slide-in-from-bottom-4 duration-700 max-sm:-mx-4">
      <Table>
        <TableHeader className="bg-muted/60 dark:bg-zinc-800/50 backdrop-blur-sm">
          <TableRow className="hover:bg-transparent border-b border-border/80">
            <TableHead className="w-[100px] text-foreground/80 font-black uppercase tracking-[0.2em] text-[10px] pl-6">Ícone</TableHead>
            <TableHead className="text-foreground/80 font-black uppercase tracking-[0.2em] text-[10px]">Nome</TableHead>
            <TableHead className="text-foreground/80 font-black uppercase tracking-[0.2em] text-[10px]">Cor</TableHead>
            <TableHead className="text-right text-foreground/80 font-black uppercase tracking-[0.2em] text-[10px] pr-6">Ações</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {data.length === 0 ? (
            <TableRow>
              <TableCell colSpan={4} className="h-32 text-center text-muted-foreground font-medium italic">
                Nenhuma categoria encontrada.
              </TableCell>
            </TableRow>
          ) : (
            data.map((parent) => {
              const hasSubs = parent.subcategories && parent.subcategories.length > 0
              return (
              <Fragment key={parent.id}>
                <TableRow key={parent.id} className={cn(
                    "group transition-all duration-300",
                    hasSubs ? "border-0" : "border-b border-border/40",
                    "hover:bg-primary/[0.02]"
                )}>
                    <TableCell className="pl-6 py-5">
                        <div 
                            className="w-11 h-11 rounded-xl flex items-center justify-center text-white shadow-lg ring-1 ring-white/10 transition-transform group-hover:scale-110 duration-500"
                            style={{ backgroundColor: parent.color }}
                        >
                            <LucideIcon name={getCategoryIcon(parent)} className="h-5 w-5" />
                        </div>
                    </TableCell>
                    <TableCell>
                        <div className="flex items-center gap-3">
                            <span className="font-black text-foreground/90 tracking-tight text-base">{parent.name}</span>
                            {parent.is_default && (
                                <Badge className="rounded-full px-2.5 py-0.5 text-[9px] font-black uppercase tracking-wider bg-primary/10 text-primary border border-primary/20 hover:bg-primary/20 transition-colors">
                                    Padrão
                                </Badge>
                            )}
                            <span className="text-[10px] font-black uppercase tracking-widest text-muted-foreground/30 ml-auto sm:ml-2">
                                {parent.subcategories?.length || 0} / 5
                            </span>
                        </div>
                    </TableCell>
                    <TableCell>
                        <div className="flex items-center gap-2">
                            <div 
                                className="w-5 h-5 rounded-lg border border-border/40 shadow-inner" 
                                style={{ backgroundColor: parent.color }} 
                            />
                        </div>
                    </TableCell>
                    <TableCell className="text-right pr-6">
                        <div className="flex justify-end gap-1.5 transition-all duration-300 sm:opacity-0 group-hover:opacity-100">
                            {!parent.is_default ? (
                                <>
                                    <Button 
                                        variant="ghost" 
                                        size="icon" 
                                        className="h-9 w-9 rounded-xl text-primary hover:bg-primary/10 transition-all active:scale-90" 
                                        onClick={() => setCreatingSubcategoryFor(parent)} 
                                        title="Nova Subcategoria"
                                    >
                                        <PlusCircle className="h-4.5 w-4.5" />
                                    </Button>
                                    <Button 
                                        variant="ghost" 
                                        size="icon" 
                                        className="h-9 w-9 rounded-xl hover:bg-muted text-foreground/60 hover:text-foreground transition-all active:scale-90" 
                                        onClick={() => setEditingCategory(parent)}
                                    >
                                        <Pencil className="h-4 w-4" />
                                    </Button>
                                    <Button 
                                        variant="ghost" 
                                        size="icon" 
                                        className="h-9 w-9 rounded-xl text-destructive/60 hover:text-destructive hover:bg-destructive/10 transition-all active:scale-90" 
                                        onClick={() => setDeletingCategory(parent)}
                                    >
                                        <Trash2 className="h-4 w-4" />
                                    </Button>
                                </>
                            ) : (
                                <Button 
                                    variant="ghost" 
                                    size="icon" 
                                    className="h-9 w-9 rounded-xl text-primary hover:bg-primary/10 transition-all active:scale-90" 
                                    onClick={() => setCreatingSubcategoryFor(parent)} 
                                    title="Nova Subcategoria"
                                >
                                    <PlusCircle className="h-4.5 w-4.5" />
                                </Button>
                            )}
                        </div>
                    </TableCell>
                </TableRow>
                
                {/* Subcategories Rendering */}
                {parent.subcategories?.map((child, index) => {
                    const isLast = index === (parent.subcategories?.length || 0) - 1
                    return (
                        <TableRow 
                            key={child.id} 
                            className={cn(
                                "group transition-all duration-300",
                                isLast ? "border-b border-border/40" : "border-0",
                                "hover:bg-primary/[0.01]"
                            )}
                        >
                            <TableCell className="py-2.5 pl-6">
                                <div className="flex h-full items-center relative pl-8">
                                    {/* Tree Connector L-Shape */}
                                    <div className="absolute left-6 -top-4 w-[2px] bg-border/40 group-hover:bg-primary/20 transition-colors" 
                                         style={{ height: isLast ? '24px' : 'calc(100% + 16px)' }} 
                                    />
                                    <div className="absolute left-6 top-2 w-4 border-b-2 border-border/40 rounded-bl-xl h-0 group-hover:border-primary/20 transition-colors" />
                                    
                                    <div 
                                        className="relative z-10 w-8 h-8 rounded-lg flex items-center justify-center text-white shadow-md ring-1 ring-white/5 opacity-90 transition-transform group-hover:scale-105 duration-300"
                                        style={{ backgroundColor: child.color }}
                                    >
                                        <LucideIcon name={getCategoryIcon(child)} className="h-4 w-4" />
                                    </div>
                                </div>
                            </TableCell>
                            <TableCell>
                                <span className="text-sm font-bold text-muted-foreground group-hover:text-foreground/80 transition-colors">
                                    {child.name}
                                </span>
                            </TableCell>
                            <TableCell>
                                <div className="flex items-center gap-2 opacity-50 group-hover:opacity-100 transition-opacity">
                                    <div 
                                        className="w-4 h-4 rounded shadow-sm ring-1 ring-border/20" 
                                        style={{ backgroundColor: child.color }} 
                                    />
                                </div>
                            </TableCell>
                            <TableCell className="text-right pr-6">
                                {!child.is_default && (
                                    <div className="flex justify-end gap-1 opacity-0 group-hover:opacity-100 transition-all duration-300">
                                        <Button 
                                            variant="ghost" 
                                            size="icon" 
                                            className="h-8 w-8 rounded-lg hover:bg-muted text-foreground/40 hover:text-foreground transition-all" 
                                            onClick={() => setEditingCategory(child)}
                                        >
                                            <Pencil className="h-3.5 w-3.5" />
                                        </Button>
                                        <Button 
                                            variant="ghost" 
                                            size="icon" 
                                            className="h-8 w-8 rounded-lg text-destructive/40 hover:text-destructive hover:bg-destructive/10 transition-all" 
                                            onClick={() => setDeletingCategory(child)}
                                        >
                                            <Trash2 className="h-3.5 w-3.5" />
                                        </Button>
                                    </div>
                                )}
                            </TableCell>
                        </TableRow>
                    )
                })}
              </Fragment>
              )
            })
          )}
        </TableBody>
      </Table>
    </div>
    )
  }

  return (
    <div className="container mx-auto py-10 px-4 max-w-7xl animate-in fade-in duration-500">
      {/* Premium Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 mb-8">
        <div className="flex items-center gap-5">
            <div className="w-14 h-14 rounded-2xl bg-primary/10 flex items-center justify-center shadow-sm ring-1 ring-black/5 dark:ring-white/10 shrink-0">
                <Tag className="h-8 w-8 text-primary" />
            </div>
            <div>
                 <h1 className="text-3xl font-black tracking-tight text-foreground/90">Categorias</h1>
                 <p className="text-muted-foreground mt-1.5 font-medium flex items-center gap-2">
                   Organização Financeira
                   <span className="w-1 h-1 rounded-full bg-muted-foreground/30" />
                   <span className="text-primary/80 font-bold">{categories.length} Itens</span>
                 </p>
            </div>
        </div>

        <Dialog open={isCreateOpen} onOpenChange={setIsCreateOpen}>
            <DialogTrigger asChild>
                <Button className="rounded-full px-6 h-12 font-bold shadow-lg shadow-primary/20 transition-all hover:scale-105 active:scale-95">
                    <PlusCircle className="mr-2 h-5 w-5" />
                    Nova Categoria
                </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-[480px] rounded-[32px] border-none shadow-2xl p-0 overflow-hidden">
              <ScrollArea className="max-h-[85vh]">
                <div className="p-8">
                  <DialogHeader className="mb-6">
                    <DialogTitle className="text-3xl font-black tracking-tight">Nova Categoria</DialogTitle>
                    <DialogDescription className="text-xs font-medium text-muted-foreground/70">
                      Crie uma nova categoria personalizada para organizar seus fluxos.
                    </DialogDescription>
                  </DialogHeader>
                  <CategoryForm 
                    onSuccess={() => {
                        setIsCreateOpen(false)
                        refreshCategories()
                    }}
                    onCancel={() => setIsCreateOpen(false)}
                  />
                </div>
              </ScrollArea>
            </DialogContent>
          </Dialog>
        </div>

        <div className="flex flex-col sm:flex-row items-center justify-between gap-6 mb-8 bg-card/30 backdrop-blur-sm p-4 rounded-[32px] border border-border/40">
          <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full sm:w-auto">
             <TabsList className="grid w-full sm:w-[320px] grid-cols-2 p-1 bg-muted/20 rounded-full h-11 border border-border/20">
                <TabsTrigger 
                    value="expenses" 
                    className="rounded-full text-xs font-black uppercase tracking-wider transition-all data-[state=active]:bg-background data-[state=active]:text-primary data-[state=active]:shadow-sm"
                >
                    Despesas
                </TabsTrigger>
                <TabsTrigger 
                    value="incomes" 
                    className="rounded-full text-xs font-black uppercase tracking-wider transition-all data-[state=active]:bg-background data-[state=active]:text-primary data-[state=active]:shadow-sm"
                >
                    Receitas
                </TabsTrigger>
            </TabsList>
          </Tabs>

          <div className="relative w-full sm:max-w-xs group">
            <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground group-focus-within:text-primary transition-colors" />
            <Input
              placeholder="Buscar categoria..."
              className="pl-10 h-11 rounded-2xl bg-muted/20 border-border/10 focus-visible:ring-primary/20 focus-visible:border-primary/40 transition-all"
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
            
            <TabsContent value="expenses" className="mt-0 space-y-4">
              <CategoryTable data={expenseCategories} />
              <CategoryMobileList data={expenseCategories} />
            </TabsContent>
            <TabsContent value="incomes" className="mt-0 space-y-4">
              <CategoryTable data={incomeCategories} />
              <CategoryMobileList data={incomeCategories} />
            </TabsContent>
          </Tabs>
        )}

        {/* Subcategory Creation Dialog */}
        <Dialog open={!!creatingSubcategoryFor} onOpenChange={(open) => !open && setCreatingSubcategoryFor(null)}>
            <DialogContent className="sm:max-w-[480px] rounded-[32px] border-none shadow-2xl p-0 overflow-hidden">
              <ScrollArea className="max-h-[85vh]">
                <div className="p-8">
                  <DialogHeader className="mb-6">
                    <DialogTitle className="text-3xl font-black tracking-tight">Nova Subcategoria</DialogTitle>
                    <DialogDescription className="text-xs font-medium text-muted-foreground/70">
                      Criando uma subcategoria para <strong className="text-primary font-black uppercase tracking-widest text-[9px] bg-primary/5 px-2 py-1 rounded-full ml-1">{creatingSubcategoryFor?.name}</strong>.
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
                </div>
              </ScrollArea>
            </DialogContent>
        </Dialog>


        {/* Edit Dialog */}
        <Dialog open={!!editingCategory} onOpenChange={(open) => !open && setEditingCategory(null)}>
            <DialogContent className="sm:max-w-[480px] rounded-[32px] border-none shadow-2xl p-0 overflow-hidden">
              <ScrollArea className="max-h-[85vh]">
                <div className="p-8">
                  <DialogHeader className="mb-6">
                    <DialogTitle className="text-3xl font-black tracking-tight">Editar Categoria</DialogTitle>
                    <DialogDescription className="text-xs font-medium text-muted-foreground/70">
                      Altere os detalhes da categoria selecionada para manter sua organização.
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
                </div>
              </ScrollArea>
            </DialogContent>
        </Dialog>

        {/* Delete Alert */}
        <AlertDialog open={!!deletingCategory} onOpenChange={(open) => !open && setDeletingCategory(null)}>
            <AlertDialogContent className="rounded-[32px] border-none shadow-2xl p-8">
                <AlertDialogHeader>
                    <div className="w-14 h-14 rounded-2xl bg-destructive/10 flex items-center justify-center text-destructive mb-4 shadow-sm ring-1 ring-destructive/20">
                        <Trash2 className="h-7 w-7" />
                    </div>
                    <AlertDialogTitle className="text-2xl font-black tracking-tight text-foreground/90 leading-tight">Excluir Categoria?</AlertDialogTitle>
                    <AlertDialogDescription className="text-sm font-medium leading-relaxed pt-2">
                        Esta ação não pode ser desfeita. Isso excluirá permanentemente a categoria <strong className="text-destructive font-black underline decoration-2 underline-offset-4">&quot;{deletingCategory?.name}&quot;</strong> e todas as suas vinculações.
                    </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter className="pt-6">
                    <AlertDialogCancel className="rounded-full h-11 px-6 font-bold">Cancelar</AlertDialogCancel>
                    <AlertDialogAction onClick={handleDelete} className="bg-destructive text-destructive-foreground hover:bg-destructive/90 rounded-full h-11 px-6 font-bold transition-all hover:scale-105 active:scale-95">
                        Confirmar Exclusão
                    </AlertDialogAction>
                </AlertDialogFooter>
            </AlertDialogContent>
        </AlertDialog>
        
    </div>
  )
}
