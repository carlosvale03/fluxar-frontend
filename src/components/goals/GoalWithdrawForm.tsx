"use client"

import { useState, useEffect, useMemo } from "react"
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
  DialogFooter,
} from "@/components/ui/dialog"
import { Badge } from "@/components/ui/badge"
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
import { Cofrinho, Goal, GoalWithdrawData, SALDO_LIVRE } from "@/types/goals"
import { Account } from "@/types/accounts"
import { goalsService } from "@/services/goals"
import { accountsService } from "@/services/accounts"
import { toast } from "sonner"
import { formatCurrency } from "@/lib/utils"
import { formatarMoeda, maiorQueZero, paraCentavos } from "@/lib/dinheiro"
import { hojeNaApi } from "@/lib/datas"
import { tratarErro } from "@/lib/erros"

// CONTRATO-16: o saldo da meta chega como texto; a comparação é em centavos
const withdrawSchema = (maxAmount: string) => z.object({
  amount: z.string()
    .refine((val) => {
      // CONTRATO-17 e CONTRATO-19: o MoneyInput lê o valor por AD-009 e
      // entrega o texto decimal ("1500.00") que vai à API
      return maiorQueZero(val);
    }, {
      message: "O valor precisa ser maior que zero.",
    })
    .refine((val) => paraCentavos(val) <= paraCentavos(maxAmount), {
      message: `O resgate vai até ${formatarMoeda(maxAmount)}, o valor guardado neste destino.`,
    }),
  account_to: z.string().min(1, "Escolha a conta que recebe o valor."),
})

type WithdrawFormValues = {
  amount: string;
  account_to: string;
}

interface GoalWithdrawFormProps {
  goal: Goal | null
  // META-18: o cofrinho da meta, com o saldo dele
  cofrinho?: Cofrinho | null
  open: boolean
  onOpenChange: (open: boolean) => void
  onSuccess: () => void
}

export function GoalWithdrawForm({ goal, cofrinho, open, onOpenChange, onSuccess }: GoalWithdrawFormProps) {
  const [isLoading, setIsLoading] = useState(false)
  const [accounts, setAccounts] = useState<Account[]>([])

  const currentSchema = useMemo(() => withdrawSchema(goal?.current_amount || "0.00"), [goal?.current_amount])

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
      const filtered = data.filter((acc: Account) => acc.id !== goal?.account && acc.is_active !== false)
      setAccounts(filtered)
    } catch (error) {
      // CONTRATO-33: nenhuma falha silenciosa
      tratarErro(error, { mensagemPadrao: "Não foi possível carregar as contas. Tente de novo.", tentarDeNovo: fetchAccounts })
    }
  }

  const handleWithdrawAll = () => {
    if (goal?.current_amount) {
      form.setValue('amount', goal.current_amount)
      form.trigger('amount')
    }
  }

  const onSubmit = async (values: WithdrawFormValues) => {
    if (!goal) return

    try {
      setIsLoading(true)
      // CONTRATO-25: a data do resgate vai sem hora, no calendário do usuário
      const dados: GoalWithdrawData = { amount: values.amount, date: hojeNaApi() }
      if (values.account_to === SALDO_LIVRE) {
        // META-16: para o saldo livre do cofrinho, sem transferência
        dados.to_free_balance = true
      } else {
        dados.account_to = values.account_to
      }
      await goalsService.withdraw(goal.id, dados)

      toast.success("Resgate registrado.")
      onSuccess()
      onOpenChange(false)
    } catch (error) {
      // CONTRATO-30: o erro de cada campo vai para o campo
      tratarErro(error, {
        form,
        campos: ["amount", "account_to"],
        mensagemPadrao: "Não foi possível registrar o resgate. Tente de novo.",
      })
    } finally {
      setIsLoading(false)
    }
  }

  const destino = form.watch("account_to")

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="gap-0 p-0 sm:max-w-[460px]">
        <DialogHeader className="space-y-1 border-b border-border p-6">
          <DialogTitle>Resgatar dinheiro</DialogTitle>
          <DialogDescription>
            Retire um valor do destino <span className="font-medium text-foreground">{goal?.name}</span>.
          </DialogDescription>
        </DialogHeader>

        <div className="custom-scrollbar max-h-[75vh] overflow-y-auto px-6 py-6">
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
              <FormField
                control={form.control}
                name="account_to"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Conta que recebe</FormLabel>
                    <Select onValueChange={field.onChange} defaultValue={field.value}>
                      <FormControl>
                        <SelectTrigger className="h-auto min-h-9 py-2">
                          <SelectValue placeholder="Escolha para onde vai o dinheiro" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectItem value={SALDO_LIVRE}>Saldo livre do cofrinho</SelectItem>
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
                    <div className="flex items-end justify-between gap-3">
                      <FormLabel>Valor do resgate</FormLabel>
                      <Button type="button" variant="link" className="h-auto p-0" onClick={handleWithdrawAll}>
                        Resgatar tudo
                      </Button>
                    </div>
                    <FormControl>
                      <MoneyInput
                        name={field.name}
                        ref={field.ref}
                        value={field.value}
                        onValueChange={(valor) => field.onChange(valor ?? "")}
                        onBlur={field.onBlur}
                      />
                    </FormControl>
                    {/* META-17 e META-18: o resgate vai até o valor da meta e, para outra conta, até o saldo do cofrinho */}
                    <div className="flex flex-wrap gap-2">
                      <Badge variant="secondary">{`No destino: ${formatarMoeda(goal?.current_amount || "0.00")}`}</Badge>
                      {cofrinho && <Badge variant="secondary">{`No cofrinho: ${formatarMoeda(cofrinho.balance)}`}</Badge>}
                    </div>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <div className="space-y-3 rounded-md border border-border bg-elevated p-4">
                <p className="label text-muted-foreground">Resumo do movimento</p>
                <div className="flex items-center justify-between gap-3">
                  <div className="min-w-0 flex-1">
                    <p className="text-xs text-muted-foreground">Origem</p>
                    <p className="truncate text-sm font-medium">{goal?.name}</p>
                  </div>
                  <ArrowRight className="h-4 w-4 shrink-0 text-muted-foreground" aria-hidden="true" />
                  <div className="min-w-0 flex-1 text-right">
                    <p className="text-xs text-muted-foreground">Conta que recebe</p>
                    <p className="truncate text-sm font-medium">
                      {destino === SALDO_LIVRE ? "Saldo livre" : accounts.find((a) => a.id === destino)?.name || "Escolha a conta"}
                    </p>
                  </div>
                </div>
              </div>

              <DialogFooter>
                <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
                  Cancelar
                </Button>
                <Button type="submit" loading={isLoading}>
                  Registrar resgate
                </Button>
              </DialogFooter>
            </form>
          </Form>
        </div>
      </DialogContent>
    </Dialog>
  )
}
