"use client"

import { useEffect, useState } from "react"
import { Plus, Wallet, AlertCircle, Filter, Search, SlidersHorizontal, Check } from "lucide-react"
import { toast } from "sonner"

import { Button } from "@/components/ui/button"
import { Separator } from "@/components/ui/separator"
import { Skeleton } from "@/components/ui/skeleton"
import { Badge } from "@/components/ui/badge"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import {
    Sheet,
    SheetContent,
    SheetDescription,
    SheetHeader,
    SheetTitle,
    SheetTrigger,
    SheetFooter,
} from "@/components/ui/sheet"
import { AccountCard } from "@/components/accounts/account-card"
import { AccountFormDialog } from "@/components/accounts/account-form-dialog"
import { api } from "@/services/apiClient"
import { Account, AccountType } from "@/types/accounts"
import { usePlan } from "@/hooks/use-plan"
import { cn } from "@/lib/utils"

const PLAN_LIMITS = {
    common: 2,
    premium: 5,
    premium_plus: 20
}

const quickFilterOptions = [
    { label: "Todas", value: "ALL" },
    { label: "Conta Corrente", value: AccountType.CHECKING },
    { label: "Carteira", value: AccountType.WALLET },
    { label: "Poupança", value: AccountType.SAVINGS },
    { label: "Investimentos", value: AccountType.INVESTMENT },
    { label: "Cofrinhos", value: AccountType.PIGGY_BANK },
]

export default function AccountsPage() {
  const [accounts, setAccounts] = useState<Account[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [selectedAccount, setSelectedAccount] = useState<Account | undefined>(undefined)
  const [isFormOpen, setIsFormOpen] = useState(false)
  const [deleteId, setDeleteId] = useState<string | null>(null)
  
  // Filter States
  const [filterTypes, setFilterTypes] = useState<AccountType[]>([AccountType.CHECKING, AccountType.WALLET])
  const [isFilterSheetOpen, setIsFilterSheetOpen] = useState(false)
  const [statusFilter, setStatusFilter] = useState<"ACTIVE" | "INACTIVE" | "ALL">("ACTIVE")
  const [selectedBanks, setSelectedBanks] = useState<string[]>([])
  const [minBalance, setMinBalance] = useState("")
  const [maxBalance, setMaxBalance] = useState("")

  const { plan, isPremium, isPremiumPlus } = usePlan()
  
  // Extract unique institutions from registered accounts
  const availableBanks = Array.from(new Set(accounts.map(a => a.institution).filter(Boolean))) as string[]

  // Resolve numeric limit based on plan string
  const limitByPlan = isPremiumPlus ? PLAN_LIMITS.premium_plus : (isPremium ? PLAN_LIMITS.premium : PLAN_LIMITS.common)
  const hasReachedLimit = accounts.length >= limitByPlan

  const fetchAccounts = async () => {
    try {
      setIsLoading(true)
      const response = await api.get("/accounts/")
      const data = Array.isArray(response.data) ? response.data : response.data.results
      setAccounts(data || [])
    } catch (error) {
      toast.error("Erro ao carregar contas.")
    } finally {
      setIsLoading(false)
    }
  }

  useEffect(() => {
    fetchAccounts()
  }, [])

  const filteredAccounts = accounts.filter(acc => {
      const matchesType = filterTypes.length === 0 || filterTypes.includes(acc.type as AccountType)
      const matchesStatus = statusFilter === "ALL" || (statusFilter === "ACTIVE" ? acc.is_active : !acc.is_active)
      const matchesBank = selectedBanks.length === 0 || (acc.institution && selectedBanks.includes(acc.institution))
      
      const balance = acc.balance
      const matchesMin = minBalance === "" || balance >= parseFloat(minBalance)
      const matchesMax = maxBalance === "" || balance <= parseFloat(maxBalance)
      
      return matchesType && matchesStatus && matchesBank && matchesMin && matchesMax
  })

  const resetFilters = () => {
      setFilterTypes([AccountType.CHECKING, AccountType.WALLET])
      setStatusFilter("ACTIVE")
      setSelectedBanks([])
      setMinBalance("")
      setMaxBalance("")
      toast.info("Filtros resetados para o padrão.")
  }

  const toggleFilterType = (type: AccountType) => {
      setFilterTypes(prev => 
          prev.includes(type) ? prev.filter(t => t !== type) : [...prev, type]
      )
  }

  const toggleBank = (bank: string) => {
      setSelectedBanks(prev => 
          prev.includes(bank) ? prev.filter(b => b !== bank) : [...prev, bank]
      )
  }

  const handleEdit = (account: Account) => {
    setSelectedAccount(account)
    setIsFormOpen(true)
  }

  const handleDeleteClick = (account: Account) => {
    setDeleteId(account.id)
  }

  const confirmDelete = async () => {
    if (!deleteId) return
    try {
      await api.delete(`/accounts/${deleteId}/`)
      toast.success("Conta excluída com sucesso.")
      setDeleteId(null)
      fetchAccounts() // Refresh list
    } catch (error) {
      toast.error("Erro ao excluir conta. Verifique se há transações vinculadas.")
    }
  }

  const handleFormSuccess = () => {
    fetchAccounts()
    setIsFormOpen(false)
    setSelectedAccount(undefined)
  }

  const handleCreateClick = () => {
      setSelectedAccount(undefined)
      setIsFormOpen(true)
  }

  const activeFiltersCount = (filterTypes.length > 0 && (filterTypes.length !== 2 || !filterTypes.includes(AccountType.CHECKING) || !filterTypes.includes(AccountType.WALLET)) ? 1 : 0) + 
                             (statusFilter !== "ACTIVE" ? 1 : 0) + 
                             (selectedBanks.length) +
                             (minBalance !== "" ? 1 : 0) +
                             (maxBalance !== "" ? 1 : 0)

  return (
    <div className="container mx-auto py-10 px-4 max-w-7xl animate-in fade-in duration-700">
      {/* Premium Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 mb-8">
        <div className="flex items-center gap-5">
            <div className="w-14 h-14 rounded-2xl bg-primary/10 flex items-center justify-center shadow-sm ring-1 ring-black/5 dark:ring-white/10 shrink-0">
                <Wallet className="h-8 w-8 text-primary" />
            </div>
            <div>
                 <h1 className="text-3xl font-black tracking-tight text-foreground/90">Minhas Contas</h1>
                 <p className="text-muted-foreground mt-1.5 font-medium">
                   Gerencie suas contas bancárias, carteiras e saldos totais.
                 </p>
            </div>
        </div>
        
        <div className="flex flex-col sm:flex-row items-center gap-3">
             <Button 
                onClick={handleCreateClick} 
                disabled={isLoading || hasReachedLimit}
                className="w-full sm:w-auto rounded-full shadow-lg shadow-primary/20 hover:shadow-xl transition-all h-11 px-8 font-bold"
             >
                <Plus className="mr-2 h-5 w-5" /> Nova Conta
            </Button>
        </div>
      </div>

      {/* Premium Banner for Limits */}
      {!isLoading && hasReachedLimit && (
        <div className="mb-8 p-4 rounded-3xl bg-amber-500/5 border border-amber-500/20 text-amber-700 dark:text-amber-400 animate-in slide-in-from-top-2 duration-700 flex items-start gap-4">
            <div className="w-10 h-10 rounded-2xl bg-amber-500/10 flex items-center justify-center shrink-0">
                <AlertCircle className="h-5 w-5" />
            </div>
            <div className="flex flex-col gap-1">
                <h4 className="font-bold text-sm">Limite do Plano Atingido</h4>
                <p className="text-xs leading-relaxed max-w-2xl">
                    Seu plano atual permite até <strong>{limitByPlan}</strong> contas. Para adicionar mais, considere fazer um upgrade ou desativar contas que não utiliza mais.
                </p>
            </div>
        </div>
      )}

      {/* Filter System */}
      <div className="flex flex-col md:flex-row items-center justify-between gap-4 mb-8">
          <div className="hidden md:flex items-center gap-2 overflow-x-auto overflow-y-hidden py-2 w-fit max-w-full no-scrollbar">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setFilterTypes([])}
                className={cn(
                    "rounded-full px-5 h-9 font-bold text-[10px] uppercase tracking-wider transition-all whitespace-nowrap border-border/40",
                    filterTypes.length === 0 
                      ? "bg-primary/10 text-primary border-primary/40 shadow-[0_0_15px_rgba(var(--primary-rgb),0.1)]" 
                      : "text-muted-foreground hover:text-foreground"
                )}
              >
                  {filterTypes.length === 0 && <Check className="h-3 w-3 mr-2" />}
                  Todas
              </Button>
              {quickFilterOptions.filter(o => o.value !== "ALL").map((opt) => {
                  const isActive = filterTypes.includes(opt.value as AccountType)
                  return (
                    <Button
                        key={opt.value}
                        variant="outline"
                        size="sm"
                        onClick={() => toggleFilterType(opt.value as AccountType)}
                        className={cn(
                            "rounded-full px-5 h-9 font-bold text-[10px] uppercase tracking-wider transition-all whitespace-nowrap",
                            isActive 
                              ? "bg-primary/10 text-primary border-primary/40 shadow-[0_0_15px_rgba(var(--primary-rgb),0.1)]" 
                              : "text-muted-foreground hover:text-foreground border-border/40"
                        )}
                    >
                        {isActive && <Check className="h-3 w-3 mr-2 animate-in zoom-in duration-300" />}
                        {opt.label}
                    </Button>
                  )
              })}
          </div>

          <Sheet open={isFilterSheetOpen} onOpenChange={setIsFilterSheetOpen}>
              <SheetTrigger asChild>
                  <Button 
                    variant="outline" 
                    className="rounded-full h-10 px-6 font-bold flex items-center gap-2 border-primary/20 hover:bg-primary/5 transition-all w-full md:w-auto ml-auto"
                  >
                      <SlidersHorizontal className="h-4 w-4" />
                      Filtros Avançados
                      {activeFiltersCount > 0 && (
                          <Badge className="ml-1 bg-primary text-primary-foreground h-5 w-5 rounded-full p-0 flex items-center justify-center text-[10px]">
                              {activeFiltersCount}
                          </Badge>
                      )}
                  </Button>
              </SheetTrigger>
              <SheetContent side="right" className="w-full sm:max-w-md border-none shadow-2xl overflow-hidden p-0 flex flex-col rounded-none sm:rounded-l-[32px]">
                  <div className="h-2 w-full bg-primary" />
                  <div className="p-8 flex-1 overflow-y-auto">
                      <SheetHeader className="mb-8 sm:text-left">
                          <div className="w-12 h-12 rounded-2xl bg-primary/10 flex items-center justify-center mb-4 shadow-sm">
                              <Filter className="h-6 w-6 text-primary" />
                          </div>
                          <SheetTitle className="text-2xl font-black tracking-tight">Filtros Avançados</SheetTitle>
                          <SheetDescription className="font-medium">Refine sua busca por contas específicas.</SheetDescription>
                      </SheetHeader>

                      <div className="space-y-8">
                          {/* Account Type Filter (Mobile mostly, but useful for all) */}
                          <div className="space-y-3">
                               <Label className="text-[10px] font-black uppercase tracking-[0.2em] text-muted-foreground pl-1">
                                  Tipos de Conta
                              </Label>
                              <div className="grid grid-cols-2 gap-2">
                                  {quickFilterOptions.filter(o => o.value !== "ALL").map((opt) => {
                                      const isActive = filterTypes.includes(opt.value as AccountType)
                                      return (
                                          <Button
                                            key={opt.value}
                                            variant="ghost"
                                            size="sm"
                                            onClick={() => toggleFilterType(opt.value as AccountType)}
                                            className={cn(
                                                "rounded-xl h-12 font-bold text-[10px] uppercase tracking-tight transition-all justify-start px-4 border",
                                                isActive 
                                                    ? "bg-primary/10 text-primary border-primary/40 shadow-[0_0_15px_rgba(var(--primary-rgb),0.1)]" 
                                                    : "text-muted-foreground/60 hover:bg-muted/50 border-border/10"
                                            )}
                                          >
                                              <div className={cn(
                                                  "w-4 h-4 rounded-md mr-3 border flex items-center justify-center transition-all", 
                                                  isActive ? "bg-primary border-primary text-primary-foreground" : "bg-muted/20 border-border/40"
                                              )}>
                                                  {isActive && <Check className="h-2.5 w-2.5" />}
                                              </div>
                                              {opt.label}
                                          </Button>
                                      )
                                  })}
                              </div>
                          </div>

                          {/* Institution Filter (Multi-select Buttons) */}
                          <div className="space-y-4">
                              <div className="flex justify-between items-end pl-1">
                                  <Label className="text-[10px] font-black uppercase tracking-[0.2em] text-muted-foreground">
                                      Bancos e Instituições
                                  </Label>
                                  {selectedBanks.length > 0 && (
                                      <button 
                                        onClick={() => setSelectedBanks([])} 
                                        className="text-[9px] font-bold text-primary hover:underline uppercase tracking-tighter"
                                      >
                                          Limpar Seleção
                                      </button>
                                  )}
                              </div>
                              
                              {availableBanks.length > 0 ? (
                                  <div className="flex flex-wrap gap-2">
                                      {availableBanks.map((bank) => {
                                          const isActive = selectedBanks.includes(bank)
                                          return (
                                              <Button
                                                key={bank}
                                                variant="ghost"
                                                size="sm"
                                                onClick={() => toggleBank(bank)}
                                                className={cn(
                                                    "rounded-xl h-11 px-5 font-bold text-[10px] uppercase tracking-tight transition-all border",
                                                    isActive 
                                                        ? "bg-primary/10 text-primary border-primary/40 shadow-sm" 
                                                        : "bg-muted/20 text-muted-foreground/70 hover:bg-muted/40 border-border/10"
                                                )}
                                              >
                                                  {isActive && <Check className="h-3 w-3 mr-2" />}
                                                  {bank}
                                              </Button>
                                          )
                                      })}
                                  </div>
                              ) : (
                                  <div className="p-4 rounded-2xl bg-muted/20 border border-dashed border-border/60 text-center">
                                      <p className="text-[10px] text-muted-foreground font-medium italic">Nenhuma instituição cadastrada</p>
                                  </div>
                              )}
                          </div>

                          {/* Balance Range Filter */}
                          <div className="space-y-3">
                              <Label className="text-[10px] font-black uppercase tracking-[0.2em] text-muted-foreground pl-1">
                                  Faixa de Saldo (R$)
                              </Label>
                              <div className="grid grid-cols-2 gap-4">
                                  <div className="relative">
                                      <span className="absolute left-3 top-1/2 -translate-y-1/2 text-[9px] font-bold text-muted-foreground uppercase">Min</span>
                                      <Input 
                                        type="number"
                                        placeholder="0,00" 
                                        className="rounded-xl pl-12 h-12 bg-muted/20 border border-border/10 focus-visible:ring-primary/20 focus-visible:border-primary/40 font-medium text-xs transition-all"
                                        value={minBalance}
                                        onChange={(e) => setMinBalance(e.target.value)}
                                      />
                                  </div>
                                  <div className="relative">
                                      <span className="absolute left-3 top-1/2 -translate-y-1/2 text-[9px] font-bold text-muted-foreground uppercase">Max</span>
                                      <Input 
                                        type="number"
                                        placeholder="0,00" 
                                        className="rounded-xl pl-12 h-12 bg-muted/20 border border-border/10 focus-visible:ring-primary/20 focus-visible:border-primary/40 font-medium text-xs transition-all"
                                        value={maxBalance}
                                        onChange={(e) => setMaxBalance(e.target.value)}
                                      />
                                  </div>
                              </div>
                          </div>

                          {/* Status Filter */}
                          <div className="space-y-3">
                               <Label className="text-[10px] font-black uppercase tracking-[0.2em] text-muted-foreground pl-1">
                                  Status da Conta
                              </Label>
                              <div className="grid grid-cols-3 gap-2">
                                  {(["ACTIVE", "INACTIVE", "ALL"] as const).map((s) => (
                                      <Button
                                        key={s}
                                        variant="ghost"
                                        size="sm"
                                        onClick={() => setStatusFilter(s)}
                                        className={cn(
                                            "rounded-xl h-12 font-bold text-[10px] uppercase tracking-tight transition-all border",
                                            statusFilter === s 
                                                ? "bg-primary/10 text-primary border-primary/30" 
                                                : "bg-muted/20 text-muted-foreground/60 hover:bg-muted/40 border-transparent"
                                        )}
                                      >
                                          {s === "ACTIVE" ? "Ativas" : s === "INACTIVE" ? "Inativas" : "Todas"}
                                      </Button>
                                  ))}
                              </div>
                          </div>
                      </div>
                  </div>

                  <SheetFooter className="p-8 border-t border-border/40 bg-muted/10">
                      <div className="flex gap-3 w-full">
                          <Button variant="ghost" onClick={resetFilters} className="flex-1 rounded-full h-12 font-bold hover:bg-destructive/10 hover:text-destructive">
                              Resetar
                          </Button>
                          <Button onClick={() => setIsFilterSheetOpen(false)} className="flex-1 rounded-full h-12 font-bold shadow-lg shadow-primary/20">
                              Aplicar Filtros
                          </Button>
                      </div>
                  </SheetFooter>
              </SheetContent>
          </Sheet>
      </div>

      <Separator className="my-8 opacity-0" />

      {isLoading ? (
        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
            {[1, 2, 3].map((i) => (
                <Skeleton key={i} className="h-[200px] w-full rounded-[32px]" />
            ))}
        </div>
      ) : filteredAccounts.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-24 text-center border-2 border-dashed border-muted rounded-[32px] bg-muted/5 animate-in zoom-in-95 duration-500">
              <div className="w-20 h-20 rounded-full bg-muted flex items-center justify-center mb-6">
                <Search className="h-10 w-10 text-muted-foreground opacity-20" />
              </div>
              <h3 className="text-2xl font-bold text-foreground font-black">Nenhum resultado</h3>
              <p className="text-sm text-muted-foreground max-w-sm mt-2 mb-8 mx-auto leading-relaxed font-medium">
                  Não encontramos contas que correspondam aos filtros aplicados. Tente ajustar sua busca ou resetar os filtros.
              </p>
              <Button variant="outline" onClick={resetFilters} className="rounded-full px-12 h-12 font-bold">
                 Limpar Filtros
              </Button>
          </div>
      ) : (
        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3 pb-10">
            {filteredAccounts.map((acc) => (
                <AccountCard 
                    key={acc.id} 
                    account={acc} 
                    onEdit={handleEdit} 
                    onDelete={handleDeleteClick} 
                />
            ))}
        </div>
      )}

      {/* Account Form Dialog */}
      <AccountFormDialog 
        open={isFormOpen}
        onOpenChange={(val) => {
            setIsFormOpen(val)
            if (!val) setSelectedAccount(undefined)
        }}
        account={selectedAccount}
        onSuccess={handleFormSuccess}
      />

      {/* Delete Confirmation Dialog */}
      <Dialog open={!!deleteId} onOpenChange={(open) => !open && setDeleteId(null)}>
        <DialogContent className="rounded-[32px] sm:max-w-md border-none shadow-2xl overflow-hidden p-0">
           <div className="h-2 w-full bg-destructive" />
           <div className="p-8">
                <DialogHeader>
                    <div className="w-12 h-12 rounded-2xl bg-destructive/10 flex items-center justify-center mb-4">
                        <AlertCircle className="h-6 w-6 text-destructive" />
                    </div>
                    <DialogTitle className="text-2xl font-black">Excluir Conta?</DialogTitle>
                    <DialogDescription className="text-sm leading-relaxed pt-2">
                    Atenção: esta ação não pode ser desfeita. Transações vinculadas poderão ficar sem conta de origem se você confirmar.
                    </DialogDescription>
                </DialogHeader>
                <DialogFooter className="mt-8 flex gap-2">
                    <Button variant="ghost" onClick={() => setDeleteId(null)} className="flex-1 rounded-full h-11 font-bold">
                        Cancelar
                    </Button>
                    <Button variant="destructive" onClick={confirmDelete} className="flex-1 rounded-full h-11 font-bold shadow-lg shadow-destructive/20">
                        Sim, Excluir
                    </Button>
                </DialogFooter>
           </div>
        </DialogContent>
      </Dialog>
    </div>
  )
}
