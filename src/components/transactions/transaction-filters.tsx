"use client"

import { useEffect, useState } from "react"
import { CalendarIcon, Filter, X } from "lucide-react"
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
  SheetClose
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
import { TransactionType } from "@/types/transactions"

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
}

export function TransactionFilters({ onApplyFilters, currentFilters }: TransactionFiltersProps) {
  const [isOpen, setIsOpen] = useState(false)
  
  // Local state for the filter form (not applied yet)
  const [startDate, setStartDate] = useState<Date | undefined>(currentFilters.startDate)
  const [endDate, setEndDate] = useState<Date | undefined>(currentFilters.endDate)
  const [type, setType] = useState<string>(currentFilters.type)
  const [categoryId, setCategoryId] = useState<string>(currentFilters.categoryId)
  const [accountId, setAccountId] = useState<string>(currentFilters.accountId)

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

        fetchDependencies()
    }
  }, [isOpen, currentFilters])

  const fetchDependencies = async () => {
    try {
        const [catRes, accRes] = await Promise.all([
            api.get("/categories/"),
            api.get("/accounts/")
        ])
        setCategories(catRes.data.results || catRes.data || [])
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
          accountId
      })
      setIsOpen(false)
  }

  const handleClear = () => {
      setStartDate(undefined)
      setEndDate(undefined)
      setType("ALL")
      setCategoryId("ALL")
      setAccountId("ALL")
  }

  const activeFilterCount = [
      startDate || endDate,
      type !== "ALL",
      categoryId !== "ALL",
      accountId !== "ALL"
  ].filter(Boolean).length

  return (
    <Sheet open={isOpen} onOpenChange={setIsOpen}>
      <SheetTrigger asChild>
        <Button variant="outline" size="sm" className="h-10 relative">
            <Filter className="mr-2 h-4 w-4" /> 
            Filtros Avançados
            {activeFilterCount > 0 && (
                <Badge variant="secondary" className="ml-2 h-5 w-5 p-0 flex items-center justify-center rounded-full bg-primary text-primary-foreground text-[10px]">
                    {activeFilterCount}
                </Badge>
            )}
        </Button>
      </SheetTrigger>
      <SheetContent className="w-full sm:max-w-md overflow-y-auto">
        <SheetHeader>
          <SheetTitle>Filtrar Transações</SheetTitle>
          <SheetDescription>
            Refine sua busca por período, categoria e conta.
          </SheetDescription>
        </SheetHeader>
        
        <div className="grid gap-6 py-6">
            
            {/* Period Filter */}
            <div className="space-y-2">
                <Label>Período</Label>
                <div className="grid grid-cols-2 gap-2">
                    <Popover>
                        <PopoverTrigger asChild>
                            <Button variant="outline" className={cn("w-full justify-start text-left font-normal text-xs px-2", !startDate && "text-muted-foreground")}>
                                <CalendarIcon className="mr-2 h-4 w-4" />
                                {startDate ? format(startDate, "dd/MM/yyyy") : "Início"}
                            </Button>
                        </PopoverTrigger>
                        <PopoverContent className="w-auto p-0" align="start">
                            <Calendar mode="single" selected={startDate} onSelect={setStartDate} initialFocus />
                        </PopoverContent>
                    </Popover>
                    <Popover>
                        <PopoverTrigger asChild>
                            <Button variant="outline" className={cn("w-full justify-start text-left font-normal text-xs px-2", !endDate && "text-muted-foreground")}>
                                <CalendarIcon className="mr-2 h-4 w-4" />
                                {endDate ? format(endDate, "dd/MM/yyyy") : "Fim"}
                            </Button>
                        </PopoverTrigger>
                        <PopoverContent className="w-auto p-0" align="start">
                            <Calendar mode="single" selected={endDate} onSelect={setEndDate} initialFocus />
                        </PopoverContent>
                    </Popover>
                </div>
            </div>

            <Separator />

            {/* Type Filter */}
            <div className="space-y-2">
                <Label>Tipo de Transação</Label>
                <Select value={type} onValueChange={setType}>
                    <SelectTrigger>
                        <SelectValue placeholder="Todos" />
                    </SelectTrigger>
                    <SelectContent>
                        <SelectItem value="ALL">Todas</SelectItem>
                        <SelectItem value="INCOME">Receitas</SelectItem>
                        <SelectItem value="EXPENSE">Despesas</SelectItem>
                        <SelectItem value="TRANSFER">Transferências</SelectItem>
                    </SelectContent>
                </Select>
            </div>

            {/* Category Filter */}
            <div className="space-y-2">
                <Label>Categoria</Label>
                <Select value={categoryId} onValueChange={setCategoryId}>
                    <SelectTrigger>
                        <SelectValue placeholder="Todas as categorias" />
                    </SelectTrigger>
                    <SelectContent>
                        <SelectItem value="ALL">Todas</SelectItem>
                        {categories.map((cat) => (
                            <SelectItem key={cat.id} value={cat.id}>{cat.name}</SelectItem>
                        ))}
                    </SelectContent>
                </Select>
            </div>

            {/* Account Filter */}
            <div className="space-y-2">
                <Label>Conta</Label>
                <Select value={accountId} onValueChange={setAccountId}>
                    <SelectTrigger>
                        <SelectValue placeholder="Todas as contas" />
                    </SelectTrigger>
                    <SelectContent>
                        <SelectItem value="ALL">Todas</SelectItem>
                        {accounts.map((acc) => (
                            <SelectItem key={acc.id} value={acc.id}>{acc.name}</SelectItem>
                        ))}
                    </SelectContent>
                </Select>
            </div>

        </div>

        <SheetFooter className="flex-col sm:flex-col gap-2">
            <Button className="w-full" onClick={handleApply}>Aplicar Filtros</Button>
            <Button variant="outline" className="w-full" onClick={handleClear}>Limpar Filtros</Button>
        </SheetFooter>
      </SheetContent>
    </Sheet>
  )
}
