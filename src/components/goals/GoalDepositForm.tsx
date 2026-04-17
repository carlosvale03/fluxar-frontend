"use client"

import { useState, useEffect } from "react"
import { PiggyBank, Loader2, Target, ArrowRight } from "lucide-react"
import { useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import * as z from "zod"
import { format } from "date-fns"

import { 
  Dialog, 
  DialogContent, 
  DialogHeader, 
  DialogTitle, 
  DialogDescription,
  DialogFooter
} from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form"
import { Input } from "@/components/ui/input"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { Goal } from "@/types/goals"
import { Account } from "@/types/accounts"
import { goalsService } from "@/services/goals"
import { accountsService } from "@/services/accounts"
import { toast } from "sonner"
import { formatCurrency } from "@/lib/utils"

const parseAmount = (val: string) => {
  if (val.includes(',')) {
    return Number(val.replace(/\./g, '').replace(',', '.'));
  }
  return Number(val);
};

const depositSchema = z.object({
  amount: z.string().refine((val) => {
    const num = parseAmount(val);
    return !isNaN(num) && num > 0;
  }, {
    message: "O valor deve ser maior que zero",
  }),
  account_from: z.string().min(1, "Selecione a conta de origem"),
})

type DepositFormValues = z.infer<typeof depositSchema>

interface GoalDepositFormProps {
  goal: Goal | null
  open: boolean
  onOpenChange: (open: boolean) => void
  onSuccess: () => void
}

export function GoalDepositForm({ goal, open, onOpenChange, onSuccess }: GoalDepositFormProps) {
  const [isLoading, setIsLoading] = useState(false)
  const [accounts, setAccounts] = useState<Account[]>([])

  const form = useForm<DepositFormValues>({
    resolver: zodResolver(depositSchema),
    defaultValues: {
      amount: "",
      account_from: "",
    },
  })

  useEffect(() => {
    if (open) {
      fetchAccounts()
      form.reset()
    }
  }, [open, form])

  const fetchAccounts = async () => {
    try {
      const data = await accountsService.getAccounts()
      setAccounts(data)
    } catch (error) {
      console.error("Failed to fetch accounts", error)
    }
  }

  const onSubmit = async (values: DepositFormValues) => {
    if (!goal) return

    try {
      setIsLoading(true)
      await goalsService.deposit(goal.id, {
        amount: parseAmount(values.amount),
        account_from: values.account_from,
        datetime: new Date().toISOString(),
      })

      toast.success("Aporte realizado com sucesso!")
      onSuccess()
      onOpenChange(false)
    } catch (error) {
      console.error("Failed to deposit", error)
      toast.error("Erro ao realizar aporte.")
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[425px] rounded-[32px] border-border/40 bg-card/95 backdrop-blur-xl p-0 overflow-hidden">
        <DialogHeader className="p-6 pb-2">
          <div className="w-12 h-12 rounded-2xl bg-emerald-500/10 text-emerald-500 flex items-center justify-center mb-4 transition-transform hover:scale-110">
            <PiggyBank className="h-6 w-6" />
          </div>
          <DialogTitle className="text-2xl font-black uppercase tracking-tight">
            Guardar Dinheiro
          </DialogTitle>
          <DialogDescription className="text-sm font-medium">
            Adicione um aporte à sua meta **{goal?.name}**.
          </DialogDescription>
        </DialogHeader>

        <div className="max-h-[70vh] overflow-y-auto pr-1 custom-scrollbar space-y-6 px-6 py-4">
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
              <FormField
                control={form.control}
                name="account_from"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="text-[10px] font-black uppercase tracking-widest opacity-40">Conta de Origem</FormLabel>
                    <Select onValueChange={field.onChange} defaultValue={field.value}>
                      <FormControl>
                        <SelectTrigger className="rounded-2xl border-border/40 bg-muted/20 h-12 focus:ring-primary/20 transition-all">
                          <SelectValue placeholder="Selecione de onde virá o dinheiro" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent className="rounded-2xl border-border/40 bg-card/95 backdrop-blur-xl">
                        {accounts.map((account) => (
                          <SelectItem key={account.id} value={account.id} className="rounded-xl">
                            <div className="flex flex-col">
                              <span className="font-bold">{account.name}</span>
                              <span className="text-[10px] opacity-40">Saldo: {formatCurrency(account.balance)}</span>
                            </div>
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="amount"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="text-[10px] font-black uppercase tracking-widest opacity-40">Valor do Aporte (R$)</FormLabel>
                    <FormControl>
                      <div className="relative group">
                        <Input 
                          placeholder="0,00" 
                          {...field} 
                          className="rounded-2xl border-border/40 bg-muted/20 px-12 focus:bg-background h-14 text-xl font-black text-emerald-600 transition-all"
                        />
                        <span className="absolute left-4 top-1/2 -translate-y-1/2 text-emerald-500 font-bold">R$</span>
                      </div>
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <div className="p-4 rounded-[24px] bg-muted/30 border border-border/40 space-y-3">
                <p className="text-[10px] font-black uppercase tracking-widest opacity-40 text-center">Resumo do Movimento</p>
                <div className="flex items-center justify-between">
                  <div className="text-center flex-1">
                    <p className="text-[9px] font-bold uppercase opacity-30">Origem</p>
                    <p className="text-xs font-black truncate max-w-[100px] mx-auto">
                      {accounts.find(a => a.id === form.watch('account_from'))?.name || "Conta"}
                    </p>
                  </div>
                  <ArrowRight className="h-4 w-4 text-primary opacity-20" />
                  <div className="text-center flex-1">
                    <p className="text-[9px] font-bold uppercase opacity-30">Destino (Cofrinho)</p>
                    <p className="text-xs font-black truncate max-w-[100px] mx-auto">{goal?.name}</p>
                  </div>
                </div>
                <p className="text-[9px] text-center opacity-40 font-medium">
                  Este valor será movido como uma **transferência** interna.
                </p>
              </div>

              <div className="pt-2">
                <Button 
                  type="submit" 
                  className="w-full rounded-2xl font-black uppercase tracking-widest text-xs h-12 shadow-lg shadow-emerald-500/20 bg-emerald-500 hover:bg-emerald-600 border-0"
                  disabled={isLoading}
                >
                  {isLoading ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Processando...
                    </>
                  ) : (
                    "Confirmar Aporte"
                  )}
                </Button>
              </div>
            </form>
          </Form>
        </div>
      </DialogContent>
    </Dialog>
  )
}
