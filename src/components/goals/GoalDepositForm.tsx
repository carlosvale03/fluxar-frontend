"use client"

import { useState, useEffect } from "react"
import { ArrowRight } from "lucide-react"
import { useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import * as z from "zod"

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
import { MoneyInput } from "@/components/ui/money-input"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { Cofrinho, Goal, GoalDepositData, SALDO_LIVRE } from "@/types/goals"
import { Account } from "@/types/accounts"
import { goalsService } from "@/services/goals"
import { accountsService } from "@/services/accounts"
import { toast } from "sonner"
import { formatCurrency } from "@/lib/utils"
import { formatarMoeda, maiorQueZero } from "@/lib/dinheiro"
import { hojeNaApi } from "@/lib/datas"
import { tratarErro } from "@/lib/erros"

const depositSchema = z.object({
  // CONTRATO-17 e CONTRATO-19: o MoneyInput lê o valor por AD-009 e entrega
  // o texto decimal ("1500.00") que vai à API
  amount: z.string().refine(maiorQueZero, {
    message: "O valor precisa ser maior que zero.",
  }),
  account_from: z.string().min(1, "Escolha a conta de origem."),
})

type DepositFormValues = z.infer<typeof depositSchema>

interface GoalDepositFormProps {
  goal: Goal | null
  // META-13: o cofrinho da meta, com o saldo livre
  cofrinho?: Cofrinho | null
  open: boolean
  onOpenChange: (open: boolean) => void
  onSuccess: () => void
}

export function GoalDepositForm({ goal, cofrinho, open, onOpenChange, onSuccess }: GoalDepositFormProps) {
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
      // META-13 e SALDO-17: o próprio cofrinho não é origem; o dinheiro dele
      // entra pelo saldo livre
      setAccounts(data.filter((acc: Account) => acc.id !== goal?.account && acc.is_active !== false))
    } catch (error) {
      // CONTRATO-33: nenhuma falha silenciosa
      tratarErro(error, { mensagemPadrao: "Não foi possível carregar as contas. Tente de novo.", tentarDeNovo: fetchAccounts })
    }
  }

  const onSubmit = async (values: DepositFormValues) => {
    if (!goal) return

    try {
      setIsLoading(true)
      // CONTRATO-25: a data do aporte vai sem hora, no calendário do usuário
      const dados: GoalDepositData = { amount: values.amount, date: hojeNaApi() }
      if (values.account_from === SALDO_LIVRE) {
        // META-13: do saldo livre do cofrinho, sem transferência
        dados.from_free_balance = true
      } else {
        dados.account_from = values.account_from
      }
      await goalsService.deposit(goal.id, dados)

      toast.success("Aporte registrado.")
      onSuccess()
      onOpenChange(false)
    } catch (error) {
      // CONTRATO-30: o erro de cada campo vai para o campo
      tratarErro(error, {
        form,
        campos: { amount: "amount", account_from: "account_from", account_id: "account_from" },
        mensagemPadrao: "Não foi possível registrar o aporte. Tente de novo.",
      })
    } finally {
      setIsLoading(false)
    }
  }

  const origem = form.watch("account_from")

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="gap-0 p-0 sm:max-w-[440px]">
        <DialogHeader className="space-y-1 border-b border-border p-6">
          <DialogTitle>Guardar dinheiro</DialogTitle>
          <DialogDescription>
            Aporte no destino <span className="font-medium text-foreground">{goal?.name}</span>.
          </DialogDescription>
        </DialogHeader>

        <div className="custom-scrollbar max-h-[70vh] overflow-y-auto px-6 py-6">
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
              <FormField
                control={form.control}
                name="account_from"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Conta de origem</FormLabel>
                    <Select onValueChange={field.onChange} defaultValue={field.value}>
                      <FormControl>
                        <SelectTrigger className="h-auto min-h-9 py-2">
                          <SelectValue placeholder="Escolha de onde vem o dinheiro" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectItem value={SALDO_LIVRE}>
                          {cofrinho
                            ? `Saldo livre do lastro (${formatarMoeda(cofrinho.free_balance)})`
                            : "Saldo livre do lastro"}
                        </SelectItem>
                        {accounts.map((account) => (
                          <SelectItem key={account.id} value={account.id}>
                            <div className="flex flex-col">
                              <span className="font-medium">{account.name}</span>
                              <span className="text-xs text-muted-foreground">Saldo: {formatCurrency(account.balance)}</span>
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
                    <FormLabel>Valor do aporte</FormLabel>
                    <FormControl>
                      <MoneyInput
                        name={field.name}
                        ref={field.ref}
                        value={field.value}
                        onValueChange={(valor) => field.onChange(valor ?? "")}
                        onBlur={field.onBlur}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <div className="space-y-3 rounded-md border border-border bg-elevated p-4">
                <p className="label text-muted-foreground">Resumo do movimento</p>
                <div className="flex items-center justify-between gap-3">
                  <div className="min-w-0 flex-1">
                    <p className="text-xs text-muted-foreground">Origem</p>
                    <p className="truncate text-sm font-medium">
                      {origem === SALDO_LIVRE ? "Saldo livre" : accounts.find((a) => a.id === origem)?.name || "Conta"}
                    </p>
                  </div>
                  <ArrowRight className="h-4 w-4 shrink-0 text-muted-foreground" aria-hidden="true" />
                  <div className="min-w-0 flex-1 text-right">
                    <p className="text-xs text-muted-foreground">Destino</p>
                    <p className="truncate text-sm font-medium">{goal?.name}</p>
                  </div>
                </div>
                <p className="text-xs text-muted-foreground">
                  {origem === SALDO_LIVRE
                    ? "O valor sai do saldo livre do lastro, sem transferência."
                    : "O valor vai para o lastro como uma transferência entre contas."}
                </p>
              </div>

              <DialogFooter>
                <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
                  Cancelar
                </Button>
                <Button type="submit" loading={isLoading}>
                  Registrar aporte
                </Button>
              </DialogFooter>
            </form>
          </Form>
        </div>
      </DialogContent>
    </Dialog>
  )
}
