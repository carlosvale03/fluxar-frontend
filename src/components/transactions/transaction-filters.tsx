"use client"

import { useEffect, useState } from "react"
import { ArrowDownCircle, ArrowUpCircle, CalendarIcon, Filter, Layers, Tag as TagIcon, Wallet, X } from "lucide-react"
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

import { api } from "@/services/apiClient"
import { Category } from "@/types/categories"
import { Account } from "@/types/accounts"
import { LucideIcon } from "@/components/ui/icon-picker"
import { TagSelector } from "@/components/tags/TagSelector"

interface TransactionFiltersProps {
  onApplyFilters: (filters: FilterState) => void
  currentFilters: FilterState
}

export interface FilterState {
  startDate: Date | undefined
  endDate: Date | undefined
  type: string
  categoryId: string
  accountId: string
  tagIds?: string[]
}

export function TransactionFilters({ onApplyFilters, currentFilters }: TransactionFiltersProps) {
  const [isOpen, setIsOpen] = useState(false)
  
  // Local state for the filter form (not applied yet)
  const [startDate, setStartDate] = useState<Date | undefined>(currentFilters.startDate)
  const [endDate, setEndDate] = useState<Date | undefined>(currentFilters.endDate)
  const [type, setType] = useState<string>(currentFilters.type)
  const [categoryId, setCategoryId] = useState<string>(currentFilters.categoryId)
  const [accountId, setAccountId] = useState<string>(currentFilters.accountId)
  const [tagIds, setTagIds] = useState<string[]>(currentFilters.tagIds || [])

  // Dependencies
  const [categories, setCategories] = useState<Category[]>([])
  const [accounts, setAccounts] = useState<Account[]>([])

  useEffect(() => {
    if (isOpen) {
        // Sync with current applied filters when opening
        setStartDate(currentFilters.startDate)
        setEndDate(currentFilters.endDate)
        setType(currentFilters.type)
        setCategoryId(currentFilters.categoryId)
        setAccountId(currentFilters.accountId)
        setTagIds(currentFilters.tagIds || [])

        fetchDependencies()
    }
  }, [isOpen, currentFilters])

  const fetchDependencies = async () => {
    try {
        const [catRes, accRes] = await Promise.all([
            api.get("/categories/"),
            api.get("/accounts/")
        ])
        
        let rawCats: Category[] = catRes.data.results || catRes.data || []
        
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
        setAccounts(accRes.data.results || accRes.data || [])
    } catch (error) {
        console.error("Failed to fetch filter dependencies", error)
    }
  }

  const handleApply = () => {
      onApplyFilters({
          startDate,
          endDate,
          type,
          categoryId,
          accountId,
          tagIds
      })
      setIsOpen(false)
  }

  const handleClear = () => {
      setStartDate(undefined)
      setEndDate(undefined)
      setType("ALL")
      setCategoryId("ALL")
      setAccountId("ALL")
      setTagIds([])
  }

  const activeFilterCount = [
      startDate || endDate,
      type !== "ALL",
      categoryId !== "ALL",
      accountId !== "ALL",
      tagIds.length > 0
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
                    <SelectContent className="rounded-2xl shadow-xl max-h-[300px]">
                        <SelectItem value="ALL" className="rounded-xl font-bold">Todas as contas</SelectItem>
                        {accounts.map((acc: Account) => (
                            <SelectItem key={acc.id} value={acc.id} className="rounded-xl">
                                <div className="flex items-center gap-2.5">
                                    <div 
                                        className="w-3 h-3 rounded-full border border-black/5 shrink-0" 
                                        style={{ backgroundColor: acc.color || "#ccc" }} 
                                    />
                                    <span className="font-bold">{acc.name}</span>
                                </div>
                            </SelectItem>
                        ))}
                    </SelectContent>
                </Select>
            </div>

            {/* Category Filter */}
            <div className="space-y-3">
                <div className="flex items-center gap-2 mb-1">
                   <Layers className="h-3.5 w-3.5 text-primary opacity-70" />
                   <Label className="text-[10px] font-black uppercase tracking-widest opacity-50">Categoria</Label>
                </div>
                <Select value={categoryId} onValueChange={setCategoryId}>
                    <SelectTrigger className="h-12 rounded-[24px] border-border/40 bg-muted/20 focus:ring-primary/20 font-bold text-xs">
                        <SelectValue placeholder="Todas as categorias" />
                    </SelectTrigger>
                    <SelectContent className="rounded-2xl shadow-xl max-h-[300px]">
                        <SelectItem value="ALL" className="rounded-xl font-bold">Todas as categorias</SelectItem>
                        {categories.map((cat: Category) => (
                            <SelectItem key={cat.id} value={cat.id} className="rounded-xl">
                                <div className="flex items-center gap-2">
                                    <div 
                                        className="w-7 h-7 rounded-lg flex items-center justify-center shrink-0"
                                        style={{ backgroundColor: `${cat.color}15`, color: cat.color }}
                                    >
                                        <LucideIcon name={cat.icon} className="h-4 w-4" />
                                    </div>
                                    <span className={cn(
                                        "font-bold",
                                        cat.name.startsWith("↳") ? "text-muted-foreground ml-1 font-medium" : ""
                                    )}>
                                        {cat.name}
                                    </span>
                                </div>
                            </SelectItem>
                        ))}
                    </SelectContent>
                </Select>
            </div>

            {/* Tags Filter */}
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
