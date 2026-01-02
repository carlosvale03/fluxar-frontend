"use client"

import { useEffect, useState } from "react"
import { Plus, Wallet, AlertCircle } from "lucide-react"
import { toast } from "sonner"

import { Button } from "@/components/ui/button"
import { Separator } from "@/components/ui/separator"
import { Skeleton } from "@/components/ui/skeleton"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { AccountCard } from "@/components/accounts/account-card"
import { AccountFormDialog } from "@/components/accounts/account-form-dialog"
import { api } from "@/services/apiClient"
import { Account } from "@/types/accounts"
import { usePlan } from "@/hooks/use-plan"

const PLAN_LIMITS = {
    common: 2,
    premium: 5,
    premium_plus: 20
}

export default function AccountsPage() {
  const [accounts, setAccounts] = useState<Account[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [selectedAccount, setSelectedAccount] = useState<Account | undefined>(undefined)
  const [isFormOpen, setIsFormOpen] = useState(false)
  const [deleteId, setDeleteId] = useState<string | null>(null)
  
  const { plan, isPremium, isPremiumPlus } = usePlan()
  
  // Resolve numeric limit based on plan string
  const limitByPlan = isPremiumPlus ? PLAN_LIMITS.premium_plus : (isPremium ? PLAN_LIMITS.premium : PLAN_LIMITS.common)
  const hasReachedLimit = accounts.length >= limitByPlan


  const fetchAccounts = async () => {
    try {
      setIsLoading(true)
      const response = await api.get("/accounts/")
      // Assuming response.data is the array or response.data.results
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

  return (
    <div className="container mx-auto py-10 px-4 max-w-7xl animate-in fade-in duration-500">
      <div className="flex flex-col md:flex-row items-center justify-between gap-4 mb-8">
        <div>
           <h1 className="text-3xl font-bold tracking-tight flex items-center gap-2">
             <Wallet className="h-8 w-8 text-primary" /> Minhas Contas
           </h1>
           <p className="text-muted-foreground mt-1">
             Gerencie suas contas bancárias e carteiras.
           </p>
        </div>
        <div className="flex items-center gap-2">
            {!isLoading && hasReachedLimit && (
                 <div className="flex items-center text-xs text-amber-600 bg-amber-50 px-3 py-2 rounded-md border border-amber-200 dark:bg-amber-900/20 dark:text-amber-400 dark:border-amber-900/50">
                     <AlertCircle className="h-3 w-3 mr-2" />
                     Limite de {limitByPlan} contas atingido
                 </div>
            )}
            <Button onClick={handleCreateClick} disabled={isLoading || hasReachedLimit}>
                <Plus className="mr-2 h-4 w-4" /> Nova Conta
            </Button>
        </div>
      </div>

      <Separator className="my-6" />

      {isLoading ? (
        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
            {[1, 2, 3].map((i) => (
                <div key={i} className="space-y-3">
                    <Skeleton className="h-[125px] w-full rounded-xl" />
                </div>
            ))}
        </div>
      ) : accounts.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-20 text-center border-2 border-dashed rounded-lg bg-muted/50">
              <Wallet className="h-12 w-12 text-muted-foreground opacity-50 mb-4" />
              <h3 className="text-lg font-medium">Nenhuma conta encontrada</h3>
              <p className="text-sm text-muted-foreground max-w-sm mt-2 mb-6">
                  Você ainda não cadastrou nenhuma conta. Comece criando uma para organizar suas finanças.
              </p>
              <Button onClick={handleCreateClick} variant="outline">Create First Account</Button>
          </div>
      ) : (
        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
            {accounts.map((acc) => (
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
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Excluir Conta</DialogTitle>
            <DialogDescription>
              Tem certeza que deseja excluir esta conta? Esta ação não pode ser desfeita e pode afetar o histórico de transações.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
             <Button variant="outline" onClick={() => setDeleteId(null)}>Cancelar</Button>
             <Button variant="destructive" onClick={confirmDelete}>Confirmar Exclusão</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
