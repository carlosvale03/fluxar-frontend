"use client"

import { useState, useEffect, useMemo, Fragment } from "react"
import { Category, ExpenseClass } from "@/types/categories"
import { getCategories, deleteCategory } from "@/services/categories"
import { getExpenseClasses } from "@/services/expense-classes"
import { COR_SEM_CLASSE, ROTULO_SEM_CLASSE } from "@/lib/classes"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { PlusCircle, Pencil, Trash2, Search, Tag } from "lucide-react"
import { CategoryForm } from "@/components/categories/CategoryForm"
import { GerenciarClasses } from "@/components/categories/GerenciarClasses"
import { usePlan } from "@/hooks/use-plan"
import { AvisoDeLimite } from "@/components/planos/aviso-de-limite"
import { LucideIcon } from "@/components/ui/icon-picker"
import { cn } from "@/lib/utils"
import { ScrollArea } from "@/components/ui/scroll-area"
import { MoreVertical, CornerDownRight } from "lucide-react"
import { CabecalhoDePagina } from "@/components/layout/cabecalho-de-pagina"
import { ConfirmacaoDestrutiva } from "@/components/ui/confirmacao-destrutiva"
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
import { toast } from "sonner"
import { tratarErro } from "@/lib/erros"
import { Badge } from "@/components/ui/badge"
import { Skeleton } from "@/components/ui/skeleton"

// CLASSE-19: a classe efetiva com a cor dela, e "(herdada)" quando vem da mãe.
// A cor da classe é dado do usuário: fica no texto e no ponto, como numa pílula.
function ClasseDaCategoria({ categoria }: { categoria: Category }) {
  const classe = categoria.effective_class
  const cor = classe?.color ?? COR_SEM_CLASSE
  const texto = classe ? `${classe.name}${categoria.class_inherited ? " (herdada)" : ""}` : ROTULO_SEM_CLASSE
  return (
    <span
      className="inline-flex items-center gap-1.5 whitespace-nowrap rounded-full border border-border-strong px-2 py-0.5 text-xs font-medium"
      style={{ color: cor }}
    >
      <span aria-hidden="true" className="h-2 w-2 shrink-0 rounded-full" style={{ backgroundColor: cor }} />
      {texto}
    </span>
  )
}

// Ícone da categoria: a cor escolhida pelo usuário fica no traço do ícone
function IconeDaCategoria({ cor, icone, pequeno = false }: { cor: string; icone: string; pequeno?: boolean }) {
  return (
    <span
      aria-hidden="true"
      className={cn(
        "flex shrink-0 items-center justify-center rounded-md border border-border bg-elevated",
        pequeno ? "h-7 w-7" : "h-9 w-9",
      )}
      style={{ color: cor }}
    >
      <LucideIcon name={icone} className={pequeno ? "h-3.5 w-3.5" : "h-4 w-4"} />
    </span>
  )
}

// AZ-34: estado vazio com título, uma linha e uma ação; com busca, a ação limpa a busca
function SemCategorias({
  buscando,
  saidas,
  onLimparBusca,
  onCriar,
  criacaoBloqueada,
}: {
  buscando: boolean
  saidas: boolean
  onLimparBusca: () => void
  onCriar: () => void
  criacaoBloqueada: boolean
}) {
  return (
    <div className="flex flex-col items-center justify-center gap-3 px-4 py-16 text-center">
      {buscando ? (
        <Search className="h-6 w-6 text-muted-foreground" aria-hidden="true" />
      ) : (
        <Tag className="h-6 w-6 text-muted-foreground" aria-hidden="true" />
      )}
      <h2 className="display-s text-foreground">
        {buscando ? "Nenhuma categoria com este nome" : `Nenhuma categoria de ${saidas ? "saída" : "entrada"}`}
      </h2>
      <p className="max-w-xs text-sm text-muted-foreground">
        {buscando
          ? "Confira a grafia ou limpe a busca para ver todas as categorias."
          : `Crie uma categoria para organizar as ${saidas ? "saídas" : "entradas"}.`}
      </p>
      {buscando ? (
        <Button variant="outline" onClick={onLimparBusca}>
          Limpar busca
        </Button>
      ) : (
        <Button variant="outline" disabled={criacaoBloqueada} onClick={onCriar}>
          Criar categoria
        </Button>
      )}
    </div>
  )
}

const ACOES_DA_LINHA =
  "flex justify-end gap-1 transition-opacity duration-fast ease-az-out sm:opacity-0 sm:group-hover:opacity-100 sm:group-focus-within:opacity-100"

export default function CategoriesPage() {
  const [categories, setCategories] = useState<Category[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [searchQuery, setSearchQuery] = useState("")
  const [activeTab, setActiveTab] = useState("expenses")
  const [isCreateOpen, setIsCreateOpen] = useState(false)
  const [editingCategory, setEditingCategory] = useState<Category | null>(null)
  const [deletingCategory, setDeletingCategory] = useState<Category | null>(null)
  const [creatingSubcategoryFor, setCreatingSubcategoryFor] = useState<Category | null>(null)
  // CLASSE-17: as classes do usuário para o formulário das despesas
  const [classes, setClasses] = useState<ExpenseClass[]>([])

  // PERM-20: limites de categorias principais e de subcategorias por
  // categoria-pai; o uso das subcategorias é contado aqui (só as ativas)
  const { limite, limiteAtingido, atualizarUso } = usePlan()
  const limiteDeSubcategorias = limite("limite_subcategorias")?.limit ?? null
  const subcategoriasAtivas = (parent: Category) =>
    (categories.find((c) => c.id === parent.id) ?? parent).subcategories?.filter((s) => s.is_active !== false).length ?? 0
  const subcategoriasNoLimite = (parent: Category) => limiteAtingido("limite_subcategorias", subcategoriasAtivas(parent))

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

  const fetchClasses = async () => {
    try {
      const data = await getExpenseClasses()
      setClasses(Array.isArray(data) ? data : [])
    } catch (error) {
      tratarErro(error, { mensagemPadrao: "Não foi possível carregar as classes.", tentarDeNovo: fetchClasses })
    }
  }

  useEffect(() => {
    fetchCategories()
    fetchClasses()
  }, [])

  const fetchCategories = async () => {
    try {
      setIsLoading(true)
      const data = await getCategories()
      setCategories(data)
    } catch (error) {
      console.error(error)
      tratarErro(error, { mensagemPadrao: "Não foi possível carregar as categorias.", tentarDeNovo: fetchCategories })
    } finally {
      setIsLoading(false)
    }
  }

  const refreshCategories = async () => {
    try {
      const data = await getCategories()
      setCategories(data)
    } catch (error) {
      tratarErro(error, { mensagemPadrao: "Não foi possível carregar as categorias.", tentarDeNovo: refreshCategories })
    }
  }

  // A confirmação padrão fica aberta se a exclusão falhar
  const handleDelete = async () => {
    if (!deletingCategory) return

    try {
      await deleteCategory(deletingCategory.id)
      toast.success("Categoria excluída.")
      // PERM-20: o item excluído sai do uso dos limites do /auth/me
      void atualizarUso()
      refreshCategories()
    } catch (error) {
      console.error(error)
      tratarErro(error, { mensagemPadrao: "Não foi possível excluir a categoria. Confira se há lançamentos ligados a ela e tente de novo." })
      throw error
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

  // Celular: lista de dois níveis, com as subcategorias recuadas sob a mãe
  const semCategorias = (
    <SemCategorias
      buscando={searchQuery.trim() !== ""}
      saidas={activeTab === "expenses"}
      onLimparBusca={() => setSearchQuery("")}
      onCriar={() => setIsCreateOpen(true)}
      criacaoBloqueada={limiteAtingido("limite_categorias")}
    />
  )

  const CategoryMobileList = ({ data, mostrarClasse = false }: { data: Category[]; mostrarClasse?: boolean }) => {
    if (data.length === 0) {
        return (
            <div className="rounded-lg border border-border bg-card sm:hidden">
                {semCategorias}
            </div>
        )
    }

    return (
        <ul className="divide-y divide-border overflow-hidden rounded-lg border border-border bg-card sm:hidden">
            {data.map((category) => (
                <li key={category.id}>
                    <div className="flex items-center gap-3 p-4">
                        <IconeDaCategoria cor={category.color} icone={category.icon || "Tag"} />

                        <div className="min-w-0 flex-1">
                            <p className="truncate text-sm font-semibold text-foreground">{category.name}</p>
                            {mostrarClasse && (
                                <div className="mt-1">
                                    <ClasseDaCategoria categoria={category} />
                                </div>
                            )}
                            {category.subcategories && category.subcategories.length > 0 && (
                                <p className="mt-1 text-xs text-muted-foreground">
                                    {category.subcategories.length} subcategorias
                                </p>
                            )}
                        </div>

                        <div className="flex items-center">
                            <Button
                                variant="ghost"
                                size="icon"
                                className="h-11 w-11"
                                aria-label={`Nova subcategoria em ${category.name}`}
                                onClick={() => setCreatingSubcategoryFor(category)}
                            >
                                <PlusCircle aria-hidden="true" />
                            </Button>

                            <DropdownMenu>
                                <DropdownMenuTrigger asChild>
                                    <Button variant="ghost" size="icon" className="h-11 w-11" aria-label={`Ações de ${category.name}`}>
                                        <MoreVertical aria-hidden="true" />
                                    </Button>
                                </DropdownMenuTrigger>
                                <DropdownMenuContent align="end" className="min-w-[180px]">
                                    <DropdownMenuItem onClick={() => setEditingCategory(category)} className="gap-2">
                                        <Pencil className="h-4 w-4" aria-hidden="true" />
                                        <span>Editar categoria</span>
                                    </DropdownMenuItem>
                                    <DropdownMenuItem onClick={() => setDeletingCategory(category)} className="gap-2 text-outflow focus:text-outflow">
                                        <Trash2 className="h-4 w-4" aria-hidden="true" />
                                        <span>Excluir categoria</span>
                                    </DropdownMenuItem>
                                </DropdownMenuContent>
                            </DropdownMenu>
                        </div>
                    </div>

                    {category.subcategories && category.subcategories.length > 0 && (
                        <ul className="divide-y divide-border border-t border-border">
                            {category.subcategories.map((child) => (
                                <li key={child.id} className="flex items-center gap-3 py-3 pl-8 pr-4">
                                    <CornerDownRight className="h-4 w-4 shrink-0 text-muted-foreground" aria-hidden="true" />
                                    <span
                                        aria-hidden="true"
                                        className="h-2.5 w-2.5 shrink-0 rounded-full"
                                        style={{ backgroundColor: child.color }}
                                    />

                                    <div className="flex min-w-0 flex-1 flex-col items-start gap-1">
                                        <span className="max-w-full truncate text-sm text-fg-secondary">{child.name}</span>
                                        {mostrarClasse && <ClasseDaCategoria categoria={child} />}
                                    </div>

                                    <DropdownMenu>
                                        <DropdownMenuTrigger asChild>
                                            <Button variant="ghost" size="icon" className="h-11 w-11" aria-label={`Ações de ${child.name}`}>
                                                <MoreVertical aria-hidden="true" />
                                            </Button>
                                        </DropdownMenuTrigger>
                                        <DropdownMenuContent align="end" className="min-w-[150px]">
                                            <DropdownMenuItem onClick={() => setEditingCategory(child)} className="gap-2">
                                                <Pencil className="h-4 w-4" aria-hidden="true" />
                                                <span>Editar</span>
                                            </DropdownMenuItem>
                                            <DropdownMenuItem onClick={() => setDeletingCategory(child)} className="gap-2 text-outflow focus:text-outflow">
                                                <Trash2 className="h-4 w-4" aria-hidden="true" />
                                                <span>Excluir</span>
                                            </DropdownMenuItem>
                                        </DropdownMenuContent>
                                    </DropdownMenu>
                                </li>
                            ))}
                        </ul>
                    )}
                </li>
            ))}
        </ul>
    )
  }

  // Desktop: tabela com a árvore (mãe e subcategorias recuadas com o conector)
  const CategoryTable = ({ data, mostrarClasse = false }: { data: Category[]; mostrarClasse?: boolean }) => {
    return (
    <div className="hidden overflow-hidden rounded-lg border border-border bg-card sm:block">
      <Table>
        <TableHeader>
          <TableRow className="hover:bg-transparent">
            <TableHead className="label text-muted-foreground">Categoria</TableHead>
            {mostrarClasse && (
              <TableHead className="label text-muted-foreground">Classe</TableHead>
            )}
            <TableHead className="label text-muted-foreground">Subcategorias</TableHead>
            <TableHead className="label text-right text-muted-foreground">Ações</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {data.length === 0 ? (
            <TableRow className="hover:bg-transparent">
              <TableCell colSpan={mostrarClasse ? 4 : 3}>
                {semCategorias}
              </TableCell>
            </TableRow>
          ) : (
            data.map((parent) => {
              return (
              <Fragment key={parent.id}>
                <TableRow className="group">
                    <TableCell>
                        <div className="flex items-center gap-3">
                            <IconeDaCategoria cor={parent.color} icone={getCategoryIcon(parent)} />
                            <span className="font-semibold text-foreground">{parent.name}</span>
                            {parent.is_default && <Badge variant="secondary">Padrão</Badge>}
                        </div>
                    </TableCell>
                    {mostrarClasse && (
                        <TableCell>
                            <ClasseDaCategoria categoria={parent} />
                        </TableCell>
                    )}
                    <TableCell>
                        <span className="font-mono text-xs tabular-nums text-muted-foreground">
                            {subcategoriasAtivas(parent)}{limiteDeSubcategorias !== null && ` / ${limiteDeSubcategorias}`}
                        </span>
                    </TableCell>
                    <TableCell className="text-right">
                        <div className={ACOES_DA_LINHA}>
                            <Button
                                variant="ghost"
                                size="icon"
                                className="h-8 w-8"
                                onClick={() => setCreatingSubcategoryFor(parent)}
                                disabled={subcategoriasNoLimite(parent)}
                                aria-label={`Nova subcategoria em ${parent.name}`}
                                title="Nova subcategoria"
                            >
                                <PlusCircle aria-hidden="true" />
                            </Button>
                            {!parent.is_default && (
                                <>
                                    <Button
                                        variant="ghost"
                                        size="icon"
                                        className="h-8 w-8"
                                        aria-label={`Editar ${parent.name}`}
                                        title="Editar"
                                        onClick={() => setEditingCategory(parent)}
                                    >
                                        <Pencil aria-hidden="true" />
                                    </Button>
                                    <Button
                                        variant="ghost"
                                        size="icon"
                                        className="h-8 w-8 text-outflow hover:bg-outflow/10 hover:text-outflow"
                                        aria-label={`Excluir ${parent.name}`}
                                        title="Excluir"
                                        onClick={() => setDeletingCategory(parent)}
                                    >
                                        <Trash2 aria-hidden="true" />
                                    </Button>
                                </>
                            )}
                        </div>
                    </TableCell>
                </TableRow>

                {/* Subcategorias, recuadas sob a mãe */}
                {parent.subcategories?.map((child) => (
                    <TableRow key={child.id} className="group">
                        <TableCell className="py-2">
                            <div className="flex items-center gap-3 pl-4">
                                <CornerDownRight className="h-4 w-4 shrink-0 text-muted-foreground" aria-hidden="true" />
                                <IconeDaCategoria cor={child.color} icone={getCategoryIcon(child)} pequeno />
                                <span className="text-sm text-fg-secondary">{child.name}</span>
                            </div>
                        </TableCell>
                        {mostrarClasse && (
                            <TableCell className="py-2">
                                <ClasseDaCategoria categoria={child} />
                            </TableCell>
                        )}
                        <TableCell className="py-2" />
                        <TableCell className="py-2 text-right">
                            {!child.is_default && (
                                <div className={ACOES_DA_LINHA}>
                                    <Button
                                        variant="ghost"
                                        size="icon"
                                        className="h-8 w-8"
                                        aria-label={`Editar ${child.name}`}
                                        title="Editar"
                                        onClick={() => setEditingCategory(child)}
                                    >
                                        <Pencil aria-hidden="true" />
                                    </Button>
                                    <Button
                                        variant="ghost"
                                        size="icon"
                                        className="h-8 w-8 text-outflow hover:bg-outflow/10 hover:text-outflow"
                                        aria-label={`Excluir ${child.name}`}
                                        title="Excluir"
                                        onClick={() => setDeletingCategory(child)}
                                    >
                                        <Trash2 aria-hidden="true" />
                                    </Button>
                                </div>
                            )}
                        </TableCell>
                    </TableRow>
                ))}
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
    <div className="mx-auto w-full max-w-[1240px] space-y-6 px-4 py-8 md:px-6">
      <CabecalhoDePagina
        titulo="Categorias"
        apoio="Categorias e classes"
        className="pb-0"
        acoes={
          <>
            {/* CLASSE-03 a CLASSE-09: classes de saída, ao lado de Criar categoria */}
            <GerenciarClasses
              onAlterar={() => {
                refreshCategories()
                fetchClasses()
              }}
            />

            <Dialog open={isCreateOpen} onOpenChange={setIsCreateOpen}>
              <DialogTrigger asChild>
                <Button disabled={limiteAtingido("limite_categorias")}>
                  <PlusCircle aria-hidden="true" />
                  Criar categoria
                </Button>
              </DialogTrigger>
              <DialogContent className="overflow-hidden p-0 sm:max-w-[480px]">
                <ScrollArea className="max-h-[85vh]">
                  <div className="p-6">
                    <DialogHeader className="mb-6">
                      <DialogTitle>Nova categoria</DialogTitle>
                      <DialogDescription>
                        Crie uma categoria para organizar entradas ou saídas.
                      </DialogDescription>
                    </DialogHeader>
                    <CategoryForm
                      classes={classes}
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
          </>
        }
      />

      {/* PERM-20: uso e limite de categorias principais do plano */}
      <AvisoDeLimite chave="limite_categorias" rotulo="categorias" />

      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full sm:w-auto">
          <TabsList className="grid w-full grid-cols-2 sm:w-[280px]">
            <TabsTrigger value="expenses">Saídas</TabsTrigger>
            <TabsTrigger value="incomes">Entradas</TabsTrigger>
          </TabsList>
        </Tabs>

        <div className="relative w-full sm:max-w-xs">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" aria-hidden="true" />
          <Input
            aria-label="Buscar categoria"
            placeholder="Ex.: Mercado"
            className="pl-9"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
        </div>
      </div>

      {isLoading ? (
        <div className="space-y-3">
          <Skeleton className="h-10 w-full" />
          <Skeleton className="h-[400px] w-full" />
        </div>
      ) : (
        <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
          <TabsContent value="expenses" className="mt-0">
            <CategoryTable data={expenseCategories} mostrarClasse />
            <CategoryMobileList data={expenseCategories} mostrarClasse />
          </TabsContent>
          <TabsContent value="incomes" className="mt-0">
            <CategoryTable data={incomeCategories} />
            <CategoryMobileList data={incomeCategories} />
          </TabsContent>
        </Tabs>
      )}

      {/* Nova subcategoria */}
      <Dialog open={!!creatingSubcategoryFor} onOpenChange={(open) => !open && setCreatingSubcategoryFor(null)}>
        <DialogContent className="overflow-hidden p-0 sm:max-w-[480px]">
          <ScrollArea className="max-h-[85vh]">
            <div className="p-6">
              <DialogHeader className="mb-6">
                <DialogTitle>Nova subcategoria</DialogTitle>
                <DialogDescription>
                  Subcategoria de <strong className="font-semibold text-foreground">{creatingSubcategoryFor?.name}</strong>.
                </DialogDescription>
              </DialogHeader>
              {creatingSubcategoryFor && (
                <CategoryForm
                  parentCategory={creatingSubcategoryFor}
                  classes={classes}
                  currentSubcategoryCount={subcategoriasAtivas(creatingSubcategoryFor)}
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

      {/* Edição */}
      <Dialog open={!!editingCategory} onOpenChange={(open) => !open && setEditingCategory(null)}>
        <DialogContent className="overflow-hidden p-0 sm:max-w-[480px]">
          <ScrollArea className="max-h-[85vh]">
            <div className="p-6">
              <DialogHeader className="mb-6">
                <DialogTitle>Editar categoria</DialogTitle>
                <DialogDescription>
                  Altere o nome, a classe ou a identidade visual da categoria.
                </DialogDescription>
              </DialogHeader>
              {editingCategory && (
                <CategoryForm
                  category={editingCategory}
                  categoriaMae={categories.find((c) => c.id === editingCategory.parent)}
                  classes={classes}
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

      {/* Exclusão: confirmação padrão (AZ-15) */}
      <ConfirmacaoDestrutiva
        aberta={!!deletingCategory}
        onAbertaChange={(aberta) => !aberta && setDeletingCategory(null)}
        titulo={`Excluir a categoria ${deletingCategory?.name ?? ""}?`}
        descricao={
          <>
            A categoria <strong className="font-semibold text-foreground">{deletingCategory?.name}</strong> e as
            vinculações dela serão excluídas. Isso não pode ser desfeito.
          </>
        }
        rotuloConfirmar="Excluir categoria"
        onConfirmar={handleDelete}
      />
    </div>
  )
}
