"use client"

import { useState, useEffect, useMemo } from "react"
import { ExternalLink, Loader2, ArrowLeft } from "lucide-react"
import { useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import * as z from "zod"
import { 
  Dialog, 
  DialogContent, 
  DialogHeader, 
  DialogTitle, 
  DialogDescription,
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
import { Account, AccountType } from "@/types/accounts"
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

const withdrawSchema = (maxAmount: number) => z.object({
  amount: z.string()
    .refine((val) => {
      const num = parseAmount(val);
      return !isNaN(num) && num > 0;
    }, {
      message: "O valor deve ser maior que zero",
    })
    .refine((val) => parseAmount(val) <= maxAmount, {
      message: `O valor máximo para resgate nesta meta é ${new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(maxAmount)}`,
    }),
  account_to: z.string().min(1, "Selecione a conta de destino"),
})

type WithdrawFormValues = {
  amount: string;
  account_to: string;
}

interface GoalWithdrawFormProps {
  goal: Goal | null
  open: boolean
  onOpenChange: (open: boolean) => void
  onSuccess: () => void
}

export function GoalWithdrawForm({ goal, open, onOpenChange, onSuccess }: GoalWithdrawFormProps) {
  const [isLoading, setIsLoading] = useState(false)
  const [accounts, setAccounts] = useState<Account[]>([])

  const currentSchema = useMemo(() => withdrawSchema(goal?.current_amount || 0), [goal?.current_amount])

  const form = useForm<WithdrawFormValues>({
    resolver: zodResolver(currentSchema),
    defaultValues: {
      amount: "",
      account_to: "",
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
      // Filtramos para não mostrar o próprio cofrinho da meta como destino (opcional, mas evita confusão)
      const filtered = data.filter((acc: Account) => acc.id !== goal?.account)
      setAccounts(filtered)
    } catch (error) {
      console.error("Failed to fetch accounts", error)
    }
  }

  const handleWithdrawAll = () => {
    if (goal?.current_amount) {
      // Usar replace para garantir que o formato no input apareça com vírgula 
      // para consistência (e o parseAmount vai lidar com isso)
      form.setValue('amount', goal.current_amount.toString().replace('.', ','))
      form.trigger('amount')
    }
  }

  const onSubmit = async (values: WithdrawFormValues) => {
    if (!goal) return

    try {
      setIsLoading(true)
      await goalsService.withdraw(goal.id, {
        amount: parseAmount(values.amount),
        account_to: values.account_to,
        datetime: new Date().toISOString(),
      })

      toast.success("Resgate realizado com sucesso!")
      onSuccess()
      onOpenChange(false)
    } catch (error) {
      console.error("Failed to withdraw", error)
      toast.error("Erro ao realizar resgate.")
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[450px] rounded-[32px] md:rounded-[40px] border-border/40 bg-card/95 backdrop-blur-3xl p-0 overflow-hidden shadow-2xl animate-in fade-in zoom-in-95 duration-300">
        <DialogHeader className="p-8 pb-4 relative">
          <div className="w-14 h-14 rounded-2xl bg-orange-500/10 text-orange-500 flex items-center justify-center mb-6 transition-all duration-500 group-hover:scale-110 shadow-lg shadow-orange-500/5 ring-1 ring-orange-500/20">
            <ExternalLink className="h-7 w-7" />
          </div>
          <div className="space-y-1">
            <DialogTitle className="text-3xl font-black uppercase tracking-tighter leading-none">
              Resgatar <span className="text-orange-500">Dinheiro</span>
            </DialogTitle>
            <DialogDescription className="text-xs font-medium opacity-60 max-w-[85%] leading-relaxed uppercase tracking-widest italic">
              Retire um valor da sua meta <span className="text-foreground font-black">"{goal?.name}"</span>
            </DialogDescription>
          </div>
        </DialogHeader>

        <div className="max-h-[75vh] overflow-y-auto pr-1 custom-scrollbar px-8 pb-8 space-y-8">
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-8">
              <FormField
                control={form.control}
                name="account_to"
                render={({ field }) => (
                  <FormItem className="space-y-3">
                    <FormLabel className="text-[10px] font-black uppercase tracking-[0.2em] opacity-50 ml-1">Conta de Destino</FormLabel>
                    <Select onValueChange={field.onChange} defaultValue={field.value}>
                      <FormControl>
                        <SelectTrigger className="rounded-[20px] border-border/40 bg-muted/20 h-14 focus:ring-primary/20 transition-all font-bold text-sm px-5 hover:bg-muted/30">
                          <SelectValue placeholder="Para onde vai o dinheiro?" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent className="rounded-2xl border-border/40 bg-card/95 backdrop-blur-xl">
                        {accounts.map((account) => (
                          <SelectItem key={account.id} value={account.id} className="rounded-xl transition-colors focus:bg-primary focus:text-primary-foreground">
                            <div className="flex flex-col py-1">
                              <span className="font-bold">{account.name}</span>
                              <span className="text-[9px] opacity-50 uppercase font-black tracking-widest">Saldo: {formatCurrency(account.balance)}</span>
                            </div>
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <FormMessage className="text-[10px] font-bold" />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="amount"
                render={({ field }) => (
                  <FormItem className="space-y-3">
                    <div className="flex justify-between items-end px-1">
                        <FormLabel className="text-[10px] font-black uppercase tracking-[0.2em] opacity-50">Valor do Resgate</FormLabel>
                        <div className="flex flex-col items-end gap-1.5">
                            <span className="text-[9px] font-black uppercase px-2 py-0.5 rounded-full bg-muted/30 text-muted-foreground/60 border border-border/20">
                                Disponível: {formatCurrency(goal?.current_amount || 0)}
                            </span>
                            <Button 
                              type="button" 
                              variant="link" 
                              className="p-0 h-auto text-[10px] font-black uppercase text-orange-500 hover:text-orange-600 transition-colors"
                              onClick={handleWithdrawAll}
                            >
                                Resgatar Tudo
                            </Button>
                        </div>
                    </div>
                    <FormControl>
                      <div className="relative group">
                        <Input 
                          placeholder="0,00" 
                          {...field} 
                          className="rounded-[20px] border-border/40 bg-muted/20 px-14 focus:bg-background h-16 text-2xl font-black text-orange-600 transition-all shadow-inner group-hover:bg-muted/30 text-center"
                        />
                        <span className="absolute left-6 top-1/2 -translate-y-1/2 text-orange-500/40 font-black text-lg">R$</span>
                      </div>
                    </FormControl>
                    <FormMessage className="text-[10px] font-bold" />
                  </FormItem>
                )}
              />

              <div className="p-6 rounded-[28px] bg-muted/10 border border-border/40 space-y-4 relative overflow-hidden group/resumo shadow-inner">
                <div className="absolute inset-0 bg-gradient-to-br from-orange-500/[0.02] to-transparent opacity-0 group-hover/resumo:opacity-100 transition-opacity duration-500" />
                <p className="text-[9px] font-black uppercase tracking-[0.3em] opacity-30 text-center relative z-10">Fluxo da Operação</p>
                
                <div className="flex items-center justify-between gap-4 relative z-10 px-2">
                  <div className="flex-1 text-center min-w-0">
                    <p className="text-[8px] font-black uppercase opacity-20 mb-1">Origem</p>
                    <div className="p-3 rounded-xl bg-card border border-border/40 shadow-sm transition-transform group-hover/resumo:-translate-y-1 duration-500">
                        <p className="text-xs font-black truncate text-muted-foreground">{goal?.name}</p>
                    </div>
                  </div>
                  
                  <div className="flex flex-col items-center gap-1 opacity-20">
                    <div className="h-[1px] w-8 bg-foreground" />
                    <ArrowLeft className="h-4 w-4" />
                  </div>
                  
                  <div className="flex-1 text-center min-w-0">
                    <p className="text-[8px] font-black uppercase opacity-20 mb-1">Conta Destino</p>
                    <div className="p-3 rounded-xl bg-orange-500/5 border border-orange-500/10 shadow-sm transition-transform group-hover/resumo:-translate-y-1 duration-500">
                        <p className="text-xs font-black truncate text-orange-600">
                            {accounts.find(a => a.id === form.watch('account_to'))?.name || "Escolha..."}
                        </p>
                    </div>
                  </div>
                </div>
              </div>

              <div className="pt-2">
                <Button 
                  type="submit" 
                  className="w-full rounded-[24px] font-black uppercase tracking-[0.2em] text-[11px] h-14 shadow-xl shadow-orange-500/20 bg-orange-600 hover:bg-orange-700 hover:scale-[1.02] active:scale-[0.98] border-0 transition-all duration-300"
                  disabled={isLoading}
                >
                  {isLoading ? (
                    <>
                      <Loader2 className="mr-2 h-5 w-5 animate-spin" />
                      Processando...
                    </>
                  ) : (
                    "Confirmar Resgate"
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
