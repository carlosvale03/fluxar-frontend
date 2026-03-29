"use client"

import { useState, useEffect } from "react"
import { 
  Coins, 
  ArrowRight, 
  PiggyBank, 
  Loader2,
  AlertCircle,
  CheckCircle2
} from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { 
  Select, 
  SelectContent, 
  SelectItem, 
  SelectTrigger, 
  SelectValue 
} from "@/components/ui/select"
import { Goal } from "@/types/goals"
import { api } from "@/services/apiClient"
import { toast } from "sonner"
import { goalsService } from "@/services/goals"

interface SpareChangeBankProps {
  goals: Goal[]
  onSuccess: () => void
}

interface RoundUpItem {
  id: string
  description: string
  amount: number
  roundUp: number
  account: string
  accountName: string
}

export function SpareChangeBank({ goals, onSuccess }: SpareChangeBankProps) {
  const [items, setItems] = useState<RoundUpItem[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [selectedGoalId, setSelectedGoalId] = useState<string>("")
  const [isDepositing, setIsDepositing] = useState(false)

  const fetchTransactions = async () => {
    try {
      setIsLoading(true)
      // Fetch recent transactions to calculate round-ups
      const response = await api.get<any>("/transactions/")
      const transactions = Array.isArray(response.data) ? response.data : response.data.results || []
      
      const roundUps: RoundUpItem[] = transactions
        .filter((t: any) => t.type === 'EXPENSE')
        .map((t: any) => {
          const amount = Math.abs(t.amount)
          const ceil = Math.ceil(amount)
          const diff = ceil - amount
          
          // Only include if difference is > 0 and < 4 (as per user request)
          if (diff > 0 && diff < 4) {
            return {
              id: t.id,
              description: t.description,
              amount: t.amount,
              roundUp: diff,
              account: t.account,
              accountName: t.account_name || "Conta Principal"
            }
          }
          return null
        })
        .filter(Boolean)

      setItems(roundUps)
    } catch (error) {
      console.error("Failed to fetch transactions for round-up", error)
    } finally {
      setIsLoading(false)
    }
  }

  useEffect(() => {
    fetchTransactions()
  }, [])

  const totalRoundUp = items.reduce((acc, item) => acc + item.roundUp, 0)
  
  const handleDeposit = async () => {
    if (!selectedGoalId || totalRoundUp <= 0) return

    try {
      setIsDepositing(true)
      
      // Group by account to handle multiple deposits if necessary
      // For simplicity in this V1, we'll use the most common account or the first one
      const mainAccount = items[0]?.account

      await goalsService.deposit(selectedGoalId, {
        amount: Number(totalRoundUp.toFixed(2)),
        account_from: mainAccount,
        description: `Troco de ${items.length} transações (Arredondamento Automático)`
      })

      toast.success("Trocos investidos com sucesso!")
      setItems([])
      onSuccess()
    } catch (error) {
      toast.error("Erro ao investir trocos.")
    } finally {
      setIsDepositing(false)
    }
  }

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL',
    }).format(value)
  }

  if (isLoading) return null
  if (items.length === 0) return null

  return (
    <Card className="border-primary/20 bg-primary/5 md:rounded-[32px] overflow-hidden border-2 mb-8">
      <CardHeader className="pb-2">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-primary text-white flex items-center justify-center shadow-lg shadow-primary/20">
              <Coins className="h-5 w-5" />
            </div>
            <div>
              <CardTitle className="text-lg font-black uppercase tracking-tight">Cofrinho de Trocos</CardTitle>
              <p className="text-[10px] font-medium text-muted-foreground uppercase tracking-widest">Premium Plus spare change</p>
            </div>
          </div>
          <div className="text-right">
            <p className="text-2xl font-black text-primary">{formatCurrency(totalRoundUp)}</p>
            <p className="text-[10px] font-bold opacity-60">ACUMULADO</p>
          </div>
        </div>
      </CardHeader>
      <CardContent className="pt-4">
        <div className="flex flex-col md:flex-row gap-4 items-end">
          <div className="flex-1 space-y-2 w-full">
            <label className="text-[10px] font-black uppercase tracking-widest opacity-60">Investir na meta:</label>
            <Select value={selectedGoalId} onValueChange={setSelectedGoalId}>
              <SelectTrigger className="rounded-xl border-primary/20 bg-background/50 h-11">
                <SelectValue placeholder="Selecione uma meta" />
              </SelectTrigger>
              <SelectContent className="rounded-xl">
                {goals.map((goal) => (
                  <SelectItem key={goal.id} value={goal.id} className="rounded-lg">
                    {goal.name} ({Math.round(goal.progress_percentage || 0)}%)
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          
          <Button 
            className="rounded-xl font-black uppercase tracking-widest text-[10px] h-11 px-8 shadow-lg shadow-primary/20 w-full md:w-auto"
            disabled={!selectedGoalId || isDepositing}
            onClick={handleDeposit}
          >
            {isDepositing ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <>
                <PiggyBank className="mr-2 h-4 w-4" /> Investir Trocos
              </>
            )}
          </Button>
        </div>
        
        <div className="mt-4 p-3 rounded-2xl bg-background/40 flex items-center gap-3">
           <div className="w-6 h-6 rounded-full bg-emerald-500/10 text-emerald-500 flex items-center justify-center">
             <CheckCircle2 className="h-3.5 w-3.5" />
           </div>
           <p className="text-[10px] font-medium text-muted-foreground italic">
             Detectamos <strong>{items.length}</strong> transações que podem ser arredondadas para poupar <strong>{formatCurrency(totalRoundUp)}</strong>.
           </p>
        </div>
      </CardContent>
    </Card>
  )
}
