"use client"

import { useEffect, useState } from "react"
import { ArrowDownCircle, ArrowUpCircle, CalendarIcon, Filter, Layers, Link2, Lock, Shapes, Tag as TagIcon, Wallet, X } from "lucide-react"
import { format } from "date-fns"
import { ptBR } from "date-fns/locale"
import { cn } from "@/lib/utils"

import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Calendar } from "@/components/ui/calendar"
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetFooter,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet"
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover"
import { Label } from "@/components/ui/label"
import { 
    Select, 
    SelectContent, 
    SelectItem, 
    SelectTrigger, 
    SelectValue 
} from "@/components/ui/select"
import { Separator } from "@/components/ui/separator"
import { Checkbox } from "@/components/ui/checkbox"

import { api } from "@/services/apiClient"
import { Category, ExpenseClass } from "@/types/categories"
import { COR_SEM_CLASSE, ROTULO_SEM_CLASSE, VALOR_SEM_CLASSE } from "@/lib/classes"
import { Account, AccountTypeLabels } from "@/types/accounts"
import { LucideIcon } from "@/components/ui/icon-picker"
import { TagSelector } from "@/components/tags/TagSelector"
import { usePlan } from "@/hooks/use-plan"
import { MENSAGEM_RECURSO_BLOQUEADO } from "@/components/planos/recurso-bloqueado"
import { tratarErro } from "@/lib/erros"

interface TransactionFiltersProps {
  onApplyFilters: (filters: FilterState) => void
  currentFilters: FilterState
}

export interface FilterState {
  startDate: Date | undefined
  endDate: Date | undefined
  type: string
  // CONTRATO-10: várias categorias; a API inclui as subcategorias de cada uma
  categoryIds: string[]
  accountId: string
  tagIds?: string[]
  // CLASSE-34 e CLASSE-35: classes de despesa e `sem_classe`, enviadas como
  // classId repetido
  classIds?: string[]
  // VINCULO-30 e VINCULO-33: só as principais e as dependentes (linked=true)
  linked?: boolean
}

export function TransactionFilters({ onApplyFilters, currentFilters }: TransactionFiltersProps) {
  // PERM-19: o filtro por tags some com `tags` fechado
  const { podeUsar } = usePlan()
  const tagsLiberadas = podeUsar("tags") === true
  // VINCULO-20: o filtro "Com vínculo" fica travado com `vinculos` fechado
  const vinculosLiberados = podeUsar("vinculos") === true
  const [isOpen, setIsOpen] = useState(false)
  
  // Local state for the filter form (not applied yet)
  const [startDate, setStartDate] = useState<Date | undefined>(currentFilters.startDate)
  const [endDate, setEndDate] = useState<Date | undefined>(currentFilters.endDate)
  const [type, setType] = useState<string>(currentFilters.type)
  const [categoryIds, setCategoryIds] = useState<string[]>(currentFilters.categoryIds)
  const [accountId, setAccountId] = useState<string>(currentFilters.accountId)
  const [tagIds, setTagIds] = useState<string[]>(currentFilters.tagIds || [])
  const [classIds, setClassIds] = useState<string[]>(currentFilters.classIds || [])
  const [linked, setLinked] = useState<boolean>(currentFilters.linked ?? false)

  // Dependencies
  const [categories, setCategories] = useState<Category[]>([])
  const [accounts, setAccounts] = useState<Account[]>([])
  const [classes, setClasses] = useState<ExpenseClass[]>([])

  // As classes vêm à parte: uma falha aqui não tira os outros filtros
  const fetchClasses = async () => {
    try {
        const resposta = await api.get("/expense-classes/")
        setClasses(Array.isArray(resposta?.data) ? resposta.data : [])
    } catch (error) {
        tratarErro(error, { mensagemPadrao: "Erro ao carregar as classes.", tentarDeNovo: fetchClasses })
    }
  }

  useEffect(() => {
    if (isOpen) {
        // Sync with current applied filters when opening
        setStartDate(currentFilters.startDate)
        setEndDate(currentFilters.endDate)
        setType(currentFilters.type)
        setCategoryIds(currentFilters.categoryIds)
        setAccountId(currentFilters.accountId)
        setTagIds(currentFilters.tagIds || [])
        setClassIds(currentFilters.classIds || [])
        setLinked(currentFilters.linked ?? false)

        fetchDependencies()
        fetchClasses()
    }
  }, [isOpen, currentFilters])

  const fetchDependencies = async () => {
    try {
        const [catRes, accRes] = await Promise.all([
            api.get("/categories/"),
            api.get("/accounts/")
        ])
        
        let rawCats: Category[] = catRes.data
        
        // Organizar hierarquicamente (Flattened)
        const organized: Category[] = []
        rawCats.filter(c => !c.parent).forEach(parent => {
            organized.push(parent)
            if (parent.subcategories) {
                parent.subcategories.forEach(child => {
                    organized.push({
                        ...child,
                        name: `↳ ${child.name}`
                    })
                })
            }
        })

        setCategories(organized)
        setAccounts(accRes.data)
    } catch (error) {
        // CONTRATO-33: nenhuma falha silenciosa
        tratarErro(error, { mensagemPadrao: "Erro ao carregar os filtros.", tentarDeNovo: fetchDependencies })
    }
  }

  const handleApply = () => {
      onApplyFilters({
          startDate,
          endDate,
          type,
          categoryIds,
          accountId,
          tagIds,
          classIds,
          linked: vinculosLiberados && linked
      })
      setIsOpen(false)
  }

  const alternarCategoria = (id: string, marcada: boolean) => {
      setCategoryIds(prev => marcada ? [...prev, id] : prev.filter(c => c !== id))
  }

  const alternarClasse = (id: string, marcada: boolean) => {
      setClassIds(prev => marcada ? [...prev, id] : prev.filter(c => c !== id))
  }

  // CLASSE-35: "Sem classe" é sempre uma opção, em cinza
  const opcoesDeClasse = [
      ...classes.map(c => ({ id: c.id, nome: c.name, cor: c.color })),
      { id: VALOR_SEM_CLASSE, nome: ROTULO_SEM_CLASSE, cor: COR_SEM_CLASSE },
  ]

  const handleClear = () => {
      setStartDate(undefined)
      setEndDate(undefined)
      setType("ALL")
      setCategoryIds([])
      setAccountId("ALL")
      setTagIds([])
      setClassIds([])
      setLinked(false)
  }

  const activeFilterCount = [
      startDate || endDate,
      type !== "ALL",
      categoryIds.length > 0,
      accountId !== "ALL",
      tagIds.length > 0,
      classIds.length > 0,
      linked
  ].filter(Boolean).length

  return (
    <Sheet open={isOpen} onOpenChange={setIsOpen}>
      <SheetTrigger asChild>
        <Button 
          variant="outline" 
          size="sm" 
          className="h-10 relative md:rounded-[32px] font-black uppercase tracking-widest text-[10px] px-3 md:px-6 border-primary/20 hover:bg-primary/5 text-primary transition-all flex items-center justify-center shrink-0"
        >
            <Filter className="md:mr-2 h-4 w-4" /> 
            <span className="hidden md:inline">Refinar Seleção</span>
            {activeFilterCount > 0 && (
                <Badge className={cn(
                    "h-5 w-5 p-0 flex items-center justify-center rounded-full bg-primary text-primary-foreground text-[10px] animate-in zoom-in duration-300",
                    "md:ml-2 absolute -top-1.5 -right-1.5 md:static md:top-0 md:right-0"
                )}>
                    {activeFilterCount}
                </Badge>
            )}
        </Button>
      </SheetTrigger>
      <SheetContent className="w-full sm:max-w-md overflow-y-auto border-l border-border/40 bg-background/95 backdrop-blur-xl">
        <SheetHeader className="pb-6 border-b border-border/40">
          <div className="w-12 h-12 rounded-[20px] bg-primary/10 flex items-center justify-center mb-4">
             <Filter className="h-6 w-6 text-primary" />
          </div>
          <SheetTitle className="text-2xl font-black uppercase tracking-tight">Filtros de Exportação</SheetTitle>
          <SheetDescription className="font-medium">
            Personalize exatamente quais dados serão exportados para o arquivo final.
          </SheetDescription>
        </SheetHeader>
        
        <div className="grid gap-8 py-8">
            
            {/* Period Filter */}
            <div className="space-y-3">
                <div className="flex items-center gap-2 mb-1">
                   <CalendarIcon className="h-3.5 w-3.5 text-primary opacity-70" />
                   <Label className="text-[10px] font-black uppercase tracking-widest opacity-50">Período de Competência</Label>
                </div>
                <div className="grid grid-cols-2 gap-3">
                    <Popover>
                        <PopoverTrigger asChild>
                            <Button variant="outline" className={cn("h-12 w-full justify-start text-left font-bold text-xs px-4 rounded-[24px] border-border/40 bg-muted/20 hover:bg-muted/30 transition-all", !startDate && "text-muted-foreground")}>
                                {startDate ? format(startDate, "dd/MM/yyyy") : "Início"}
                            </Button>
                        </PopoverTrigger>
                        <PopoverContent className="w-auto p-0 rounded-3xl overflow-hidden shadow-2xl border-border/40" align="start">
                            <Calendar mode="single" selected={startDate} onSelect={setStartDate} initialFocus locale={ptBR} />
                        </PopoverContent>
                    </Popover>
                    <Popover>
                        <PopoverTrigger asChild>
                            <Button variant="outline" className={cn("h-12 w-full justify-start text-left font-bold text-xs px-4 rounded-[24px] border-border/40 bg-muted/20 hover:bg-muted/30 transition-all", !endDate && "text-muted-foreground")}>
                                {endDate ? format(endDate, "dd/MM/yyyy") : "Fim"}
                            </Button>
                        </PopoverTrigger>
                        <PopoverContent className="w-auto p-0 rounded-3xl overflow-hidden shadow-2xl border-border/40" align="start">
                            <Calendar mode="single" selected={endDate} onSelect={setEndDate} initialFocus locale={ptBR} />
                        </PopoverContent>
                    </Popover>
                </div>
            </div>

            {/* Type Filter */}
            <div className="space-y-3">
                <div className="flex items-center gap-2 mb-1">
                   <Layers className="h-3.5 w-3.5 text-primary opacity-70" />
                   <Label className="text-[10px] font-black uppercase tracking-widest opacity-50">Tipo de Lançamento</Label>
                </div>
                <Select value={type} onValueChange={setType}>
                    <SelectTrigger className="h-12 rounded-[24px] border-border/40 bg-muted/20 focus:ring-primary/20 font-bold text-xs">
                        <SelectValue placeholder="Todos os tipos" />
                    </SelectTrigger>
                    <SelectContent className="rounded-2xl shadow-xl">
                        <SelectItem value="ALL" className="rounded-xl font-bold">Todas as movimentações</SelectItem>
                        <SelectItem value="INCOME" className="rounded-xl font-bold">
                           <div className="flex items-center gap-2">
                              <ArrowUpCircle className="h-4 w-4 text-emerald-500" /> Receitas
                           </div>
                        </SelectItem>
                        <SelectItem value="EXPENSE" className="rounded-xl font-bold">
                           <div className="flex items-center gap-2">
                              <ArrowDownCircle className="h-4 w-4 text-rose-500" /> Despesas
                           </div>
                        </SelectItem>
                    </SelectContent>
                </Select>
            </div>

            {/* Account Filter */}
            <div className="space-y-3">
                <div className="flex items-center gap-2 mb-1">
                   <Wallet className="h-3.5 w-3.5 text-primary opacity-70" />
                   <Label className="text-[10px] font-black uppercase tracking-widest opacity-50">Conta / Origem</Label>
                </div>
                <Select value={accountId} onValueChange={setAccountId}>
                    <SelectTrigger className="h-12 rounded-[24px] border-border/40 bg-muted/20 focus:ring-primary/20 font-bold text-xs">
                        <SelectValue placeholder="Todas as contas" />
                    </SelectTrigger>
                    <SelectContent className="rounded-[32px] shadow-2xl border-border/40 p-2 bg-background/95 backdrop-blur-xl max-h-[400px]">
                        <SelectItem value="ALL" className="rounded-2xl font-black uppercase tracking-widest text-[10px] mb-2 py-3">
                            Todas as contas
                        </SelectItem>
                        
                        {["WALLET", "CHECKING", "SAVINGS", "PIGGY_BANK", "INVESTMENT"].map((type, typeIndex) => {
                            const groupAccounts = accounts.filter(acc => acc.is_active && acc.type === type);
                            if (groupAccounts.length === 0) return null;

                            return (
                                <div key={type}>
                                    {typeIndex > 0 && (
                                        <div className="px-2 my-2">
                                            <Separator className="bg-muted/20" />
                                        </div>
                                    )}
                                    <div className="px-3 py-1 mb-1">
                                        <span className="text-[10px] font-black uppercase tracking-[0.2em] text-primary/40">
                                            {AccountTypeLabels[type as keyof typeof AccountTypeLabels]}
                                        </span>
                                    </div>
                                    {groupAccounts.map((acc: Account) => (
                                        <SelectItem 
                                            key={acc.id} 
                                            value={acc.id} 
                                            className="group rounded-2xl transition-all duration-300 cursor-pointer mb-1 hover:bg-muted/30 py-3"
                                        >
                                            <div className="flex items-center gap-3">
                                                <div 
                                                    className="w-8 h-8 rounded-lg flex items-center justify-center shrink-0 shadow-sm ring-1 ring-black/5 transition-all"
                                                    style={{ 
                                                        backgroundColor: `${acc.color}15`, 
                                                        color: acc.color 
                                                    }}
                                                >
                                                    <Wallet className="h-4 w-4" />
                                                </div>
                                                <span className="font-bold text-sm tracking-tight">{acc.name}</span>
                                            </div>
                                        </SelectItem>
                                    ))}
                                </div>
                            );
                        })}
                    </SelectContent>
                </Select>
            </div>

            {/* Category Filter */}
            <div className="space-y-3">
                <div className="flex items-center gap-2 mb-1">
                   <Layers className="h-3.5 w-3.5 text-primary opacity-70" />
                   <Label className="text-[10px] font-black uppercase tracking-widest opacity-50">Categoria</Label>
                </div>
                {/* CONTRATO-10: seleção de várias categorias */}
                <div className="max-h-[300px] overflow-y-auto rounded-[24px] border border-border/40 bg-muted/20 p-2 space-y-1">
                    {categories.map((cat: Category) => {
                        const marcada = categoryIds.includes(String(cat.id))
                        return (
                            <label
                                key={cat.id}
                                className={cn(
                                    "flex items-center gap-2 rounded-xl px-2 py-1.5 cursor-pointer transition-colors hover:bg-muted/40",
                                    marcada && "bg-primary/5"
                                )}
                            >
                                <Checkbox
                                    checked={marcada}
                                    onCheckedChange={(valor) => alternarCategoria(String(cat.id), valor === true)}
                                    aria-label={cat.name.replace("↳ ", "")}
                                />
                                <div 
                                    className="w-7 h-7 rounded-lg flex items-center justify-center shrink-0"
                                    style={{ backgroundColor: `${cat.color}15`, color: cat.color }}
                                >
                                    <LucideIcon name={cat.icon} className="h-4 w-4" />
                                </div>
                                <span className={cn(
                                    "font-bold text-xs",
                                    cat.name.startsWith("↳") ? "text-muted-foreground ml-1 font-medium" : ""
                                )}>
                                    {cat.name}
                                </span>
                            </label>
                        )
                    })}
                </div>
            </div>

            {/* CLASSE-34 e CLASSE-35: várias classes e "Sem classe"; só despesas e compras no cartão */}
            <div className="space-y-3">
                <div className="flex items-center gap-2 mb-1">
                   <Shapes className="h-3.5 w-3.5 text-primary opacity-70" />
                   <Label className="text-[10px] font-black uppercase tracking-widest opacity-50">Classe da Despesa</Label>
                </div>
                <div className="rounded-[24px] border border-border/40 bg-muted/20 p-2 space-y-1">
                    {opcoesDeClasse.map((classe) => {
                        const marcada = classIds.includes(classe.id)
                        return (
                            <label
                                key={classe.id}
                                className={cn(
                                    "flex items-center gap-2 rounded-xl px-2 py-1.5 cursor-pointer transition-colors hover:bg-muted/40",
                                    marcada && "bg-primary/5"
                                )}
                            >
                                <Checkbox
                                    checked={marcada}
                                    onCheckedChange={(valor) => alternarClasse(classe.id, valor === true)}
                                    aria-label={`Classe ${classe.nome}`}
                                />
                                <span className="w-2.5 h-2.5 rounded-full shrink-0" style={{ backgroundColor: classe.cor }} />
                                <span className="font-bold text-xs">{classe.nome}</span>
                            </label>
                        )
                    })}
                </div>
            </div>

            {/* VINCULO-30: só as transações com vínculo; travado pelo plano (VINCULO-20) */}
            <div className="space-y-3">
                <div className="flex items-center gap-2 mb-1">
                   <Link2 className="h-3.5 w-3.5 text-primary opacity-70" />
                   <Label className="text-[10px] font-black uppercase tracking-widest opacity-50">Vínculo</Label>
                </div>
                <label
                    className={cn(
                        "flex items-center gap-2 rounded-[24px] border border-border/40 bg-muted/20 px-4 py-3 transition-colors",
                        vinculosLiberados ? "cursor-pointer hover:bg-muted/40" : "cursor-not-allowed opacity-70",
                        vinculosLiberados && linked && "bg-primary/5"
                    )}
                    title={vinculosLiberados ? undefined : MENSAGEM_RECURSO_BLOQUEADO}
                >
                    <Checkbox
                        checked={vinculosLiberados && linked}
                        disabled={!vinculosLiberados}
                        onCheckedChange={(valor) => setLinked(valor === true)}
                        aria-label="Com vínculo"
                    />
                    <span className="font-bold text-xs">Com vínculo</span>
                    {!vinculosLiberados && (
                        <Lock className="ml-auto h-3.5 w-3.5 text-amber-600" aria-label="Travado pelo plano" />
                    )}
                </label>
            </div>

            {/* Tags Filter: só com `tags` aberto (PERM-19) */}
            {tagsLiberadas && (
            <div className="space-y-3">
                <div className="flex items-center gap-2 mb-1">
                   <TagIcon className="h-3.5 w-3.5 text-primary opacity-70" />
                   <Label className="text-[10px] font-black uppercase tracking-widest opacity-50">Etiquetas (Tags)</Label>
                </div>
                <TagSelector
                   selectedTagIds={tagIds}
                   onChange={setTagIds}
                />
            </div>
            )}

        </div>

        <SheetFooter className="flex-col sm:flex-col gap-3 pt-6 border-t border-border/40">
            <Button className="w-full h-12 rounded-[24px] font-black uppercase tracking-widest text-xs shadow-lg shadow-primary/20" onClick={handleApply}>
                Aplicar Filtros
            </Button>
            <Button variant="ghost" className="w-full h-10 rounded-xl font-black uppercase tracking-widest text-[10px] opacity-60 hover:opacity-100" onClick={handleClear}>
                Limpar Todos os Filtros
            </Button>
        </SheetFooter>
      </SheetContent>
    </Sheet>
  )
}
