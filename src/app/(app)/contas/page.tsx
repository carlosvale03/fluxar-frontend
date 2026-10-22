"use client"

import { useCallback, useEffect, useRef, useState } from "react"
import { Plus, Search, SlidersHorizontal, Check, Wallet } from "lucide-react"
import { toast } from "sonner"

import { Button } from "@/components/ui/button"
import { Skeleton } from "@/components/ui/skeleton"
import { Badge } from "@/components/ui/badge"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { ConfirmacaoDestrutiva } from "@/components/ui/confirmacao-destrutiva"
import {
    Sheet,
    SheetContent,
    SheetDescription,
    SheetHeader,
    SheetTitle,
    SheetTrigger,
    SheetFooter,
} from "@/components/ui/sheet"
import { CabecalhoDePagina } from "@/components/layout/cabecalho-de-pagina"
import { AccountCard } from "@/components/accounts/account-card"
import { AccountFormDialog } from "@/components/accounts/account-form-dialog"
import { BalanceAdjustmentDialog } from "@/components/accounts/balance-adjustment-dialog"
import { api, mensagemDeErro } from "@/services/apiClient"
import { accountsService, StatusDaConta } from "@/services/accounts"
import { tratarErro } from "@/lib/erros"
import { Account, AccountType } from "@/types/accounts"
import { usePlan } from "@/hooks/use-plan"
import { AvisoDeLimite } from "@/components/planos/aviso-de-limite"
import { cn } from "@/lib/utils"
import { lerValorDigitado, paraCentavos } from "@/lib/dinheiro"

const quickFilterOptions = [
    { label: "Todas", value: "ALL" },
    { label: "Conta Corrente", value: AccountType.CHECKING },
    { label: "Carteira", value: AccountType.WALLET },
    { label: "Poupança", value: AccountType.SAVINGS },
    { label: "Investimentos", value: AccountType.INVESTMENT },
    { label: "Cofrinhos", value: AccountType.PIGGY_BANK },
]

// Filtro ligado: contorno e texto em ouro de linha, com o ícone de marcado
// (a cor nunca é a única informação)
const classeDoFiltro = (ativo: boolean) =>
    cn(
        "transition-colors duration-fast",
        ativo ? "border-gold-line bg-elevated text-foreground" : "text-fg-secondary"
    )

export default function AccountsPage() {
  const [accounts, setAccounts] = useState<Account[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [selectedAccount, setSelectedAccount] = useState<Account | undefined>(undefined)
  const [isFormOpen, setIsFormOpen] = useState(false)
  const [isAdjustmentOpen, setIsAdjustmentOpen] = useState(false)
  const [accountToDelete, setAccountToDelete] = useState<Account | null>(null)

  // Filter States
  const [filterTypes, setFilterTypes] = useState<AccountType[]>([AccountType.CHECKING, AccountType.WALLET])
  const [isFilterSheetOpen, setIsFilterSheetOpen] = useState(false)
  const [statusFilter, setStatusFilter] = useState<"ACTIVE" | "INACTIVE" | "ALL">("ACTIVE")
  const [selectedBanks, setSelectedBanks] = useState<string[]>([])
  const [minBalance, setMinBalance] = useState("")
  const [maxBalance, setMaxBalance] = useState("")

  const { limiteAtingido, atualizarUso } = usePlan()

  // Extract unique institutions from registered accounts
  const availableBanks = Array.from(new Set(accounts.map(a => a.institution).filter(Boolean))) as string[]

  // PERM-18 e PERM-20: o limite e o uso vêm do acesso do /auth/me
  const hasReachedLimit = limiteAtingido("limite_contas")

  // SALDO-53: "Ativas" usa a lista padrão; "Inativas" e "Todas" pedem ao
  // backend as contas inativas também
  const statusDaBusca: StatusDaConta | undefined =
    statusFilter === "INACTIVE" ? "inactive" : statusFilter === "ALL" ? "all" : undefined
  // Só a resposta da busca mais recente vale (o filtro pode mudar no meio)
  const ultimaBusca = useRef(0)

  const fetchAccounts = useCallback(async () => {
    const busca = ++ultimaBusca.current
    try {
      setIsLoading(true)
      const data = await accountsService.getAccounts(statusDaBusca)
      if (busca === ultimaBusca.current) setAccounts(data || [])
    } catch {
      if (busca === ultimaBusca.current) toast.error("Não foi possível carregar as contas. Recarregue a página.")
    } finally {
      if (busca === ultimaBusca.current) setIsLoading(false)
    }
  }, [statusDaBusca])

  useEffect(() => {
    fetchAccounts()
  }, [fetchAccounts])

  const filteredAccounts = accounts.filter(acc => {
      const matchesType = filterTypes.length === 0 || filterTypes.includes(acc.type as AccountType)
      const matchesStatus = statusFilter === "ALL" || (statusFilter === "ACTIVE" ? acc.is_active : !acc.is_active)
      const matchesBank = selectedBanks.length === 0 || (acc.institution && selectedBanks.includes(acc.institution))

      // CONTRATO-16: o saldo chega como texto; a comparação é feita em centavos
      const balance = paraCentavos(acc.balance)
      const minimo = lerValorDigitado(minBalance, { negativo: true })
      const maximo = lerValorDigitado(maxBalance, { negativo: true })
      const matchesMin = minimo === null || balance >= paraCentavos(minimo)
      const matchesMax = maximo === null || balance <= paraCentavos(maximo)

      return matchesType && matchesStatus && matchesBank && matchesMin && matchesMax
  })

  const resetFilters = () => {
      setFilterTypes([AccountType.CHECKING, AccountType.WALLET])
      setStatusFilter("ACTIVE")
      setSelectedBanks([])
      setMinBalance("")
      setMaxBalance("")
      toast.info("Filtros de volta ao padrão.")
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

  const handleAdjustment = (account: Account) => {
    setSelectedAccount(account)
    setIsAdjustmentOpen(true)
  }

  const handleDeleteClick = (account: Account) => {
    setAccountToDelete(account)
  }

  const confirmDelete = async () => {
    if (!accountToDelete) return
    try {
      await api.delete(`/accounts/${accountToDelete.id}/`)
    } catch (error) {
      // SALDO-32 e SALDO-33: o backend diz o que resolver antes de excluir;
      // a confirmação continua aberta
      toast.error(mensagemDeErro(error, "Não foi possível excluir a conta. Tente de novo."))
      throw error
    }
    toast.success("Conta excluída.")
    // PERM-20: o item excluído sai do uso dos limites do /auth/me
    void atualizarUso()
    fetchAccounts() // Refresh list
  }

  // SALDO-51 e SALDO-52: reativar volta a conta às listas e pode esbarrar no
  // limite de contas do plano
  const handleReactivate = async (account: Account) => {
    try {
      await accountsService.reactivateAccount(account.id)
      toast.success("Conta reativada.")
      void atualizarUso()
      fetchAccounts()
    } catch (error) {
      tratarErro(error, { mensagemPadrao: "Não foi possível reativar a conta. Tente de novo." })
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
    <div className="container mx-auto max-w-7xl px-4 py-8 md:px-6">
      <CabecalhoDePagina
        titulo="Contas"
        apoio="Saldos das contas e carteiras"
        acoes={
          <Button onClick={handleCreateClick} disabled={isLoading || hasReachedLimit}>
            <Plus aria-hidden="true" /> Nova conta
          </Button>
        }
      />

      {/* PERM-20: uso e limite de contas do plano */}
      <div className="mb-6">
        <AvisoDeLimite chave="limite_contas" rotulo="contas" />
      </div>

      {/* Filter System */}
      <div className="mb-6 flex flex-col items-stretch gap-3 md:flex-row md:items-center md:justify-between">
          <div className="hidden max-w-full flex-wrap items-center gap-2 md:flex" role="group" aria-label="Tipos de conta">
              <Button
                variant="outline"
                size="sm"
                aria-pressed={filterTypes.length === 0}
                onClick={() => setFilterTypes([])}
                className={cn("rounded-full", classeDoFiltro(filterTypes.length === 0))}
              >
                  {filterTypes.length === 0 && <Check aria-hidden="true" />}
                  Todas
              </Button>
              {quickFilterOptions.filter(o => o.value !== "ALL").map((opt) => {
                  const isActive = filterTypes.includes(opt.value as AccountType)
                  return (
                    <Button
                        key={opt.value}
                        variant="outline"
                        size="sm"
                        aria-pressed={isActive}
                        onClick={() => toggleFilterType(opt.value as AccountType)}
                        className={cn("rounded-full", classeDoFiltro(isActive))}
                    >
                        {isActive && <Check aria-hidden="true" />}
                        {opt.label}
                    </Button>
                  )
              })}
          </div>

          <Sheet open={isFilterSheetOpen} onOpenChange={setIsFilterSheetOpen}>
              <SheetTrigger asChild>
                  <Button variant="outline" className="w-full md:ml-auto md:w-auto">
                      <SlidersHorizontal aria-hidden="true" />
                      Filtros avançados
                      {activeFiltersCount > 0 && (
                          <Badge className="ml-1" aria-label={`${activeFiltersCount} ${activeFiltersCount === 1 ? "filtro ativo" : "filtros ativos"}`}>{activeFiltersCount}</Badge>
                      )}
                  </Button>
              </SheetTrigger>
              <SheetContent side="right" className="flex w-full flex-col overflow-hidden p-0 sm:max-w-md">
                  <div className="flex-1 overflow-y-auto p-6">
                      <SheetHeader className="mb-6 sm:text-left">
                          <SheetTitle>Filtros avançados</SheetTitle>
                          <SheetDescription>Filtre as contas por tipo, instituição, saldo e status.</SheetDescription>
                      </SheetHeader>

                      <div className="space-y-6">
                          {/* Account Type Filter (Mobile mostly, but useful for all) */}
                          <fieldset className="space-y-2">
                              <legend className="label mb-2 text-muted-foreground">Tipos de conta</legend>
                              <div className="grid grid-cols-2 gap-2">
                                  {quickFilterOptions.filter(o => o.value !== "ALL").map((opt) => {
                                      const isActive = filterTypes.includes(opt.value as AccountType)
                                      return (
                                          <Button
                                            key={opt.value}
                                            variant="outline"
                                            size="sm"
                                            aria-pressed={isActive}
                                            onClick={() => toggleFilterType(opt.value as AccountType)}
                                            className={cn("h-10 justify-start", classeDoFiltro(isActive))}
                                          >
                                              <span
                                                aria-hidden="true"
                                                className={cn(
                                                  "flex h-4 w-4 items-center justify-center rounded-sm border",
                                                  isActive ? "border-gold-line text-gold-line" : "border-border-strong"
                                                )}
                                              >
                                                  {isActive && <Check className="!size-3" />}
                                              </span>
                                              {opt.label}
                                          </Button>
                                      )
                                  })}
                              </div>
                          </fieldset>

                          {/* Institution Filter (Multi-select Buttons) */}
                          <fieldset className="space-y-2">
                              <div className="mb-2 flex items-end justify-between">
                                  <legend className="label text-muted-foreground">Bancos e instituições</legend>
                                  {selectedBanks.length > 0 && (
                                      <Button variant="link" size="sm" className="h-auto px-0" onClick={() => setSelectedBanks([])}>
                                          Limpar seleção
                                      </Button>
                                  )}
                              </div>

                              {availableBanks.length > 0 ? (
                                  <div className="flex flex-wrap gap-2">
                                      {availableBanks.map((bank) => {
                                          const isActive = selectedBanks.includes(bank)
                                          return (
                                              <Button
                                                key={bank}
                                                variant="outline"
                                                size="sm"
                                                aria-pressed={isActive}
                                                onClick={() => toggleBank(bank)}
                                                className={cn("rounded-full", classeDoFiltro(isActive))}
                                              >
                                                  {isActive && <Check aria-hidden="true" />}
                                                  {bank}
                                              </Button>
                                          )
                                      })}
                                  </div>
                              ) : (
                                  <p className="rounded-md border border-dashed border-border-strong p-4 text-center text-sm text-muted-foreground">
                                      Nenhuma instituição nas suas contas.
                                  </p>
                              )}
                          </fieldset>

                          {/* Balance Range Filter */}
                          <fieldset className="space-y-2">
                              <legend className="label mb-2 text-muted-foreground">Faixa de saldo (R$)</legend>
                              <div className="grid grid-cols-2 gap-3">
                                  <div className="space-y-1">
                                      <Label htmlFor="saldo-minimo" className="text-xs text-muted-foreground">Mínimo</Label>
                                      <Input
                                        id="saldo-minimo"
                                        type="number"
                                        inputMode="decimal"
                                        placeholder="0,00"
                                        className="font-mono"
                                        value={minBalance}
                                        onChange={(e) => setMinBalance(e.target.value)}
                                      />
                                  </div>
                                  <div className="space-y-1">
                                      <Label htmlFor="saldo-maximo" className="text-xs text-muted-foreground">Máximo</Label>
                                      <Input
                                        id="saldo-maximo"
                                        type="number"
                                        inputMode="decimal"
                                        placeholder="0,00"
                                        className="font-mono"
                                        value={maxBalance}
                                        onChange={(e) => setMaxBalance(e.target.value)}
                                      />
                                  </div>
                              </div>
                          </fieldset>

                          {/* Status Filter */}
                          <fieldset className="space-y-2">
                              <legend className="label mb-2 text-muted-foreground">Status da conta</legend>
                              <div className="grid grid-cols-3 gap-2">
                                  {(["ACTIVE", "INACTIVE", "ALL"] as const).map((s) => (
                                      <Button
                                        key={s}
                                        variant="outline"
                                        size="sm"
                                        aria-pressed={statusFilter === s}
                                        onClick={() => setStatusFilter(s)}
                                        className={cn("h-10", classeDoFiltro(statusFilter === s))}
                                      >
                                          {s === "ACTIVE" ? "Ativas" : s === "INACTIVE" ? "Inativas" : "Todas"}
                                      </Button>
                                  ))}
                              </div>
                          </fieldset>
                      </div>
                  </div>

                  <SheetFooter className="border-t border-border p-6">
                      <div className="flex w-full gap-2">
                          <Button variant="ghost" onClick={resetFilters} className="flex-1">
                              Voltar ao padrão
                          </Button>
                          <Button onClick={() => setIsFilterSheetOpen(false)} className="flex-1">
                              Aplicar filtros
                          </Button>
                      </div>
                  </SheetFooter>
              </SheetContent>
          </Sheet>
      </div>

      {isLoading ? (
        // AZ-34: o esqueleto tem a forma do card da conta (nome, saldo e rodapé)
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3" aria-busy="true" aria-label="Carregando contas">
            {[1, 2, 3].map((i) => (
                <div key={i} className="flex h-44 flex-col gap-4 rounded-lg border border-border p-5">
                    <div className="flex items-center gap-3">
                        <Skeleton className="h-10 w-10 rounded-md" />
                        <div className="flex flex-col gap-2">
                            <Skeleton className="h-4 w-32" />
                            <Skeleton className="h-3 w-20" />
                        </div>
                    </div>
                    <Skeleton className="h-6 w-36" />
                    <Skeleton className="mt-auto h-3 w-24" />
                </div>
            ))}
        </div>
      ) : accounts.length === 0 && statusFilter === "ACTIVE" ? (
          // AZ-34: sem conta nenhuma, o estado vazio leva ao cadastro
          <div className="flex flex-col items-center justify-center rounded-lg border border-dashed border-border-strong px-6 py-16 text-center">
              <Wallet className="mb-4 h-8 w-8 text-muted-foreground" aria-hidden="true" />
              <h2 className="display-s">Nenhuma conta cadastrada</h2>
              <p className="mx-auto mb-6 mt-2 max-w-sm text-sm text-muted-foreground">
                  Cadastre uma conta ou carteira para registrar lançamentos e acompanhar o saldo.
              </p>
              <Button onClick={handleCreateClick} disabled={hasReachedLimit}>
                  <Plus aria-hidden="true" /> Cadastrar conta
              </Button>
          </div>
      ) : filteredAccounts.length === 0 ? (
          <div className="flex flex-col items-center justify-center rounded-lg border border-dashed border-border-strong px-6 py-16 text-center">
              <Search className="mb-4 h-8 w-8 text-muted-foreground" aria-hidden="true" />
              <h2 className="display-s">Nenhum resultado</h2>
              <p className="mx-auto mb-6 mt-2 max-w-sm text-sm text-muted-foreground">
                  Nenhuma conta com estes filtros. Ajuste a busca ou volte ao padrão.
              </p>
              <Button variant="outline" onClick={resetFilters}>
                 Limpar filtros
              </Button>
          </div>
      ) : (
        <section aria-labelledby="lista-de-contas">
        {/* AZ-36: o título da lista mantém a hierarquia (h1 > h2 > h3 do card) */}
        <h2 id="lista-de-contas" className="sr-only">Suas contas</h2>
        <div className="grid gap-4 pb-10 md:grid-cols-2 lg:grid-cols-3">
            {filteredAccounts.map((acc) => (
                <AccountCard
                    key={acc.id}
                    account={acc}
                    onEdit={handleEdit}
                    onDelete={handleDeleteClick}
                    onAdjustment={handleAdjustment}
                    onReactivate={handleReactivate}
                />
            ))}
        </div>
        </section>
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
        onUpdated={fetchAccounts}
      />

      {/* Balance Adjustment Dialog */}
      <BalanceAdjustmentDialog
        open={isAdjustmentOpen}
        onOpenChange={(val) => {
            setIsAdjustmentOpen(val)
            if (!val) setSelectedAccount(undefined)
        }}
        account={selectedAccount}
        onSuccess={fetchAccounts}
      />

      {/* AZ-25: confirmação destrutiva com o impacto da exclusão */}
      <ConfirmacaoDestrutiva
        aberta={!!accountToDelete}
        onAbertaChange={(aberta) => !aberta && setAccountToDelete(null)}
        titulo={`Excluir a conta ${accountToDelete?.name ?? ""}?`}
        descricao={
          <>
            A conta sai das listas e dos totais, e os lançamentos ligados a ela podem ficar sem conta de origem.
            Só é possível excluir com o saldo zerado e sem lançamentos pendentes. Isso não pode ser desfeito;
            para só tirar a conta das listas, inative-a na edição.
          </>
        }
        rotuloConfirmar="Excluir conta"
        onConfirmar={confirmDelete}
      />
    </div>
  )
}
