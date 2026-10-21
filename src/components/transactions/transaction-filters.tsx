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
        <Button variant="outline" className="relative shrink-0 px-3 md:px-4">
            <Filter aria-hidden="true" />
            <span className="sr-only md:not-sr-only">Refinar seleção</span>
            {activeFilterCount > 0 && (
                <Badge className="absolute -right-1.5 -top-1.5 h-5 min-w-5 justify-center px-1 md:static">
                    {activeFilterCount}
                </Badge>
            )}
        </Button>
      </SheetTrigger>
      <SheetContent className="w-full overflow-y-auto sm:max-w-md">
        <SheetHeader className="border-b border-border pb-4">
          <SheetTitle className="display-m">Filtrar transações</SheetTitle>
          <SheetDescription>
            Escolha o que aparece na lista. Os filtros ativos ficam visíveis acima dela.
          </SheetDescription>
        </SheetHeader>

        <div className="grid gap-6 py-6">

            {/* Period Filter */}
            <fieldset className="space-y-2">
                <legend className="mb-2 flex items-center gap-2 text-sm font-medium">
                   <CalendarIcon className="h-4 w-4 text-muted-foreground" aria-hidden="true" />
                   Período
                </legend>
                <div className="grid grid-cols-2 gap-3">
                    <Popover>
                        <PopoverTrigger asChild>
                            <Button variant="outline" aria-label={startDate ? `Início: ${format(startDate, "dd/MM/yyyy")}` : "Escolher o início"} className={cn("w-full justify-start font-mono font-normal", !startDate && "text-muted-foreground")}>
                                {startDate ? format(startDate, "dd/MM/yyyy") : "Início"}
                            </Button>
                        </PopoverTrigger>
                        <PopoverContent className="w-auto p-0" align="start">
                            <Calendar mode="single" selected={startDate} onSelect={setStartDate} initialFocus locale={ptBR} />
                        </PopoverContent>
                    </Popover>
                    <Popover>
                        <PopoverTrigger asChild>
                            <Button variant="outline" aria-label={endDate ? `Fim: ${format(endDate, "dd/MM/yyyy")}` : "Escolher o fim"} className={cn("w-full justify-start font-mono font-normal", !endDate && "text-muted-foreground")}>
                                {endDate ? format(endDate, "dd/MM/yyyy") : "Fim"}
                            </Button>
                        </PopoverTrigger>
                        <PopoverContent className="w-auto p-0" align="start">
                            <Calendar mode="single" selected={endDate} onSelect={setEndDate} initialFocus locale={ptBR} />
                        </PopoverContent>
                    </Popover>
                </div>
            </fieldset>

            {/* Type Filter */}
            <div className="space-y-2">
                <Label htmlFor="filtro-tipo" className="flex items-center gap-2">
                   <Layers className="h-4 w-4 text-muted-foreground" aria-hidden="true" />
                   Tipo de lançamento
                </Label>
                <Select value={type} onValueChange={setType}>
                    <SelectTrigger id="filtro-tipo">
                        <SelectValue placeholder="Todos os tipos" />
                    </SelectTrigger>
                    <SelectContent>
                        <SelectItem value="ALL">Todas as movimentações</SelectItem>
                        <SelectItem value="INCOME">
                           <div className="flex items-center gap-2">
                              <ArrowUpCircle className="h-4 w-4 text-inflow" aria-hidden="true" /> Receitas
                           </div>
                        </SelectItem>
                        <SelectItem value="EXPENSE">
                           <div className="flex items-center gap-2">
                              <ArrowDownCircle className="h-4 w-4 text-outflow" aria-hidden="true" /> Despesas
                           </div>
                        </SelectItem>
                    </SelectContent>
                </Select>
            </div>

            {/* Account Filter */}
            <div className="space-y-2">
                <Label htmlFor="filtro-conta" className="flex items-center gap-2">
                   <Wallet className="h-4 w-4 text-muted-foreground" aria-hidden="true" />
                   Conta
                </Label>
                <Select value={accountId} onValueChange={setAccountId}>
                    <SelectTrigger id="filtro-conta">
                        <SelectValue placeholder="Todas as contas" />
                    </SelectTrigger>
                    <SelectContent className="max-h-[400px]">
                        <SelectItem value="ALL">
                            Todas as contas
                        </SelectItem>

                        {["WALLET", "CHECKING", "SAVINGS", "PIGGY_BANK", "INVESTMENT"].map((type, typeIndex) => {
                            const groupAccounts = accounts.filter(acc => acc.is_active && acc.type === type);
                            if (groupAccounts.length === 0) return null;

                            return (
                                <div key={type}>
                                    {typeIndex > 0 && <Separator className="my-1" />}
                                    <div className="label px-2 py-1.5 text-muted-foreground">
                                        {AccountTypeLabels[type as keyof typeof AccountTypeLabels]}
                                    </div>
                                    {groupAccounts.map((acc: Account) => (
                                        <SelectItem key={acc.id} value={acc.id}>
                                            <div className="flex items-center gap-2">
                                                {/* Cor da conta: dado do usuário */}
                                                <span className="h-2.5 w-2.5 shrink-0 rounded-full" style={{ backgroundColor: acc.color }} aria-hidden="true" />
                                                <span>{acc.name}</span>
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
            <fieldset className="space-y-2">
                <legend className="mb-2 flex items-center gap-2 text-sm font-medium">
                   <Layers className="h-4 w-4 text-muted-foreground" aria-hidden="true" />
                   Categoria
                </legend>
                {/* CONTRATO-10: seleção de várias categorias */}
                <div className="max-h-[300px] space-y-0.5 overflow-y-auto rounded-md border border-border p-1">
                    {categories.map((cat: Category) => {
                        const marcada = categoryIds.includes(String(cat.id))
                        const sub = cat.name.startsWith("↳")
                        return (
                            <label
                                key={cat.id}
                                className={cn(
                                    "flex cursor-pointer items-center gap-2 rounded-sm px-2 py-1.5 text-sm transition-colors duration-fast hover:bg-elevated",
                                    marcada && "bg-elevated",
                                    sub && "pl-6"
                                )}
                            >
                                <Checkbox
                                    checked={marcada}
                                    onCheckedChange={(valor) => alternarCategoria(String(cat.id), valor === true)}
                                    aria-label={cat.name.replace("↳ ", "")}
                                />
                                {/* Cor e ícone da categoria: dados do usuário */}
                                <LucideIcon name={cat.icon} className="h-4 w-4 shrink-0" style={{ color: cat.color }} aria-hidden="true" />
                                <span className={cn(sub && "text-muted-foreground")}>
                                    {cat.name.replace("↳ ", "")}
                                </span>
                            </label>
                        )
                    })}
                </div>
            </fieldset>

            {/* CLASSE-34 e CLASSE-35: várias classes e "Sem classe"; só despesas e compras no cartão */}
            <fieldset className="space-y-2">
                <legend className="mb-2 flex items-center gap-2 text-sm font-medium">
                   <Shapes className="h-4 w-4 text-muted-foreground" aria-hidden="true" />
                   Classe da despesa
                </legend>
                <div className="space-y-0.5 rounded-md border border-border p-1">
                    {opcoesDeClasse.map((classe) => {
                        const marcada = classIds.includes(classe.id)
                        return (
                            <label
                                key={classe.id}
                                className={cn(
                                    "flex cursor-pointer items-center gap-2 rounded-sm px-2 py-1.5 text-sm transition-colors duration-fast hover:bg-elevated",
                                    marcada && "bg-elevated"
                                )}
                            >
                                <Checkbox
                                    checked={marcada}
                                    onCheckedChange={(valor) => alternarClasse(classe.id, valor === true)}
                                    aria-label={`Classe ${classe.nome}`}
                                />
                                <span className="h-2.5 w-2.5 shrink-0 rounded-full" style={{ backgroundColor: classe.cor }} aria-hidden="true" />
                                <span>{classe.nome}</span>
                            </label>
                        )
                    })}
                </div>
            </fieldset>

            {/* VINCULO-30: só as transações com vínculo; travado pelo plano (VINCULO-20) */}
            <fieldset className="space-y-2">
                <legend className="mb-2 flex items-center gap-2 text-sm font-medium">
                   <Link2 className="h-4 w-4 text-muted-foreground" aria-hidden="true" />
                   Vínculo
                </legend>
                <label
                    className={cn(
                        "flex items-center gap-2 rounded-md border border-border px-3 py-2 text-sm transition-colors duration-fast",
                        vinculosLiberados ? "cursor-pointer hover:bg-elevated" : "cursor-not-allowed opacity-70",
                        vinculosLiberados && linked && "bg-elevated"
                    )}
                    title={vinculosLiberados ? undefined : MENSAGEM_RECURSO_BLOQUEADO}
                >
                    <Checkbox
                        checked={vinculosLiberados && linked}
                        disabled={!vinculosLiberados}
                        onCheckedChange={(valor) => setLinked(valor === true)}
                        aria-label="Com vínculo"
                    />
                    <span>Com vínculo</span>
                    {!vinculosLiberados && (
                        <Lock className="ml-auto h-4 w-4 text-warn" aria-label="Travado pelo plano" />
                    )}
                </label>
            </fieldset>

            {/* Tags Filter: só com `tags` aberto (PERM-19) */}
            {tagsLiberadas && (
            <div className="space-y-2">
                <div className="flex items-center gap-2 text-sm font-medium">
                   <TagIcon className="h-4 w-4 text-muted-foreground" aria-hidden="true" />
                   Tags
                </div>
                <TagSelector
                   selectedTagIds={tagIds}
                   onChange={setTagIds}
                />
            </div>
            )}

        </div>

        <SheetFooter className="flex-col gap-2 border-t border-border pt-4 sm:flex-col">
            <Button className="w-full" onClick={handleApply}>
                Aplicar filtros
            </Button>
            <Button variant="ghost" className="w-full" onClick={handleClear}>
                Limpar todos os filtros
            </Button>
        </SheetFooter>
      </SheetContent>
    </Sheet>
  )
}

export interface ChipDeFiltro {
  chave: string
  // O valor do filtro em texto: "Despesas", "Conta: Nubank"
  rotulo: string
  remover: () => void
}

interface FiltrosAtivosProps {
  chips: ChipDeFiltro[]
  onLimpar: () => void
  className?: string
}

// AZ-24 (DESIGN.md §5, Pílulas): os filtros ativos ficam à vista, cada um com
// "×" para remover, e "Limpar filtros" no fim da lista
export function FiltrosAtivos({ chips, onLimpar, className }: FiltrosAtivosProps) {
  if (chips.length === 0) return null

  return (
    <div className={cn("flex flex-wrap items-center gap-2", className)}>
      <span className="sr-only">Filtros ativos:</span>
      <ul className="contents">
        {chips.map((chip) => (
          <li key={chip.chave} className="inline-flex items-center gap-1 rounded-full border border-border-strong py-0.5 pl-3 pr-1 text-sm text-fg-secondary">
            {chip.rotulo}
            <button
              type="button"
              onClick={chip.remover}
              aria-label={`Remover o filtro ${chip.rotulo}`}
              className="inline-flex h-6 w-6 cursor-pointer items-center justify-center rounded-full text-muted-foreground transition-colors duration-fast hover:bg-elevated hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
            >
              <X className="h-3.5 w-3.5" aria-hidden="true" />
            </button>
          </li>
        ))}
      </ul>
      <Button variant="link" size="sm" className="h-7 px-1" onClick={onLimpar}>
        Limpar filtros
      </Button>
    </div>
  )
}
