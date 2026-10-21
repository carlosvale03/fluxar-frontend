"use client"

import { useState, useEffect, useRef } from "react"
import { Calendar as CalendarIcon, ImagePlus, Camera, PiggyBank } from "lucide-react"
import { useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import * as z from "zod"
import { format } from "date-fns"
import { ptBR } from "date-fns/locale"

import { 
  Dialog, 
  DialogContent, 
  DialogHeader, 
  DialogTitle, 
  DialogDescription,
  DialogFooter,
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
import { Textarea } from "@/components/ui/textarea"
import { Calendar } from "@/components/ui/calendar"
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { cn } from "@/lib/utils"
import { formatarMoeda, maiorQueZero } from "@/lib/dinheiro"
import { lerData, paraApi } from "@/lib/datas"
import { MoneyInput } from "@/components/ui/money-input"
import { Goal } from "@/types/goals"
import { Account, AccountType } from "@/types/accounts"
import { goalsService } from "@/services/goals"
import { accountsService } from "@/services/accounts"
import { BANKS } from "@/data/banks"
import { toast } from "sonner"
import { tratarErro } from "@/lib/erros"
import { usePlan } from "@/hooks/use-plan"

const goalSchema = z.object({
  name: z.string().min(1, "Nome é obrigatório"),
  description: z.string().optional(),
  // CONTRATO-17 e CONTRATO-19: o MoneyInput lê o valor por AD-009 e entrega
  // o texto decimal ("1500.00") que vai à API
  target_amount: z.string().refine(maiorQueZero, {
    message: "Valor deve ser maior que zero",
  }),
  target_date: z.date().optional().nullable(),
  image: z.any().optional(),
  account: z.string().optional().nullable(),
  // Campos para novo cofrinho
  cofrinho_name: z.string().optional(),
  institution: z.string().optional(),
  color: z.string().optional(),
})

type GoalFormValues = z.infer<typeof goalSchema>

interface GoalFormProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  onSuccess: () => void
  initialData?: Goal | null
}

export function GoalForm({ open, onOpenChange, onSuccess, initialData }: GoalFormProps) {
  const [isLoading, setIsLoading] = useState(false)
  // PERM-20: criar ou excluir muda o uso dos limites do /auth/me
  const { atualizarUso } = usePlan()
  const [imagePreview, setImagePreview] = useState<string | null>(null)
  const [cofrinhoType, setCofrinhoType] = useState<"new" | "existing">("new")
  const [piggyBanks, setPiggyBanks] = useState<Account[]>([])
  const fileInputRef = useRef<HTMLInputElement>(null)

  const form = useForm<GoalFormValues>({
    resolver: zodResolver(goalSchema),
    defaultValues: {
      name: "",
      description: "",
      target_amount: "",
      target_date: null,
      image: null,
      account: null,
      cofrinho_name: "",
      institution: "other",
      color: "#10b981",
    },
  })

  const selectedInstitution = form.watch("institution")
  const goalName = form.watch("name")

  // Auto-fill cofrinho name if empty
  useEffect(() => {
    if (goalName && !form.getValues("cofrinho_name")) {
      form.setValue("cofrinho_name", `Cofrinho: ${goalName}`)
    }
  }, [goalName, form])

  // Update color when institution changes
  useEffect(() => {
    if (selectedInstitution) {
      const bank = BANKS.find(b => b.value === selectedInstitution)
      if (bank) {
        form.setValue("color", bank.color)
      }
    }
  }, [selectedInstitution, form])

  useEffect(() => {
    if (open) {
      fetchPiggyBanks()
    }
  }, [open])

  useEffect(() => {
    if (initialData) {
      form.reset({
        name: initialData.name,
        description: initialData.description || "",
        target_amount: initialData.target_amount,
        // CONTRATO-24: a data-alvo não tem hora; lida no dia gravado
        target_date: initialData.target_date ? lerData(initialData.target_date) : null,
        image: initialData.image || null,
        account: initialData.account || null,
      })
      setImagePreview(initialData.image || null)
      if (initialData.account) setCofrinhoType("existing")
    } else {
      form.reset({
        name: "",
        description: "",
        target_amount: "",
        target_date: null,
        image: null,
        account: null,
        cofrinho_name: "",
        institution: "other",
        color: "#10b981",
      })
      setImagePreview(null)
      setCofrinhoType("new")
    }
  }, [initialData, form, open])

  const fetchPiggyBanks = async () => {
    try {
      const accounts = await accountsService.getAccounts()
      const filtered = accounts.filter((acc: Account) => acc.type === AccountType.PIGGY_BANK && acc.is_active)
      setPiggyBanks(filtered)
    } catch (error) {
      // CONTRATO-33: nenhuma falha silenciosa
      tratarErro(error, { mensagemPadrao: "Erro ao carregar os cofrinhos.", tentarDeNovo: fetchPiggyBanks })
    }
  }

  const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      form.setValue('image', file);
      const reader = new FileReader();
      reader.onloadend = () => {
        setImagePreview(reader.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  const onSubmit = async (values: GoalFormValues) => {
    try {
      setIsLoading(true)
      const data: any = {
        ...values,
        target_amount: values.target_amount,
        // CONTRATO-25: enviada como AAAA-MM-DD, sem hora
        target_date: values.target_date ? paraApi(values.target_date) : undefined,
      }

      // Se for cofrinho existente, limpa os campos de novo cofrinho
      if (cofrinhoType === "existing") {
        delete data.cofrinho_name
        delete data.institution
        delete data.color
      } else {
        delete data.account
      }

      if (initialData) {
        await goalsService.updateGoal(initialData.id, data)
        toast.success("Meta atualizada.")
      } else {
        await goalsService.createGoal(data)
        toast.success("Meta criada.")
        void atualizarUso()
      }

      onSuccess()
      onOpenChange(false)
    } catch (error) {
      // CONTRATO-30: o erro de cada campo vai para o campo
      tratarErro(error, {
        form,
        campos: ["name", "description", "target_amount", "target_date", "account", "cofrinho_name", "institution", "color", "image"],
        mensagemPadrao: "Erro ao salvar meta.",
      })
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="gap-0 p-0 sm:max-w-[520px]">
        <DialogHeader className="space-y-1 border-b border-border p-6">
          <DialogTitle>{initialData ? "Editar meta" : "Nova meta"}</DialogTitle>
          <DialogDescription>Defina o valor, o prazo e o cofrinho onde o dinheiro fica.</DialogDescription>
        </DialogHeader>

        <div className="custom-scrollbar max-h-[65vh] overflow-y-auto px-6 py-6">
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-8">
              {/* Seção 1: o objetivo */}
              <section className="space-y-4">
                <h3 className="label text-muted-foreground">Informações básicas</h3>

                <FormField
                  control={form.control}
                  name="name"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Nome da meta</FormLabel>
                      <FormControl>
                        <Input placeholder="Ex.: Viagem de férias 2026" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <div className="grid grid-cols-2 gap-4">
                  <FormField
                    control={form.control}
                    name="target_amount"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Valor alvo</FormLabel>
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

                  <FormField
                    control={form.control}
                    name="target_date"
                    render={({ field }) => (
                      <FormItem className="flex flex-col">
                        <FormLabel>Prazo</FormLabel>
                        <Popover>
                          <PopoverTrigger asChild>
                            <FormControl>
                              <Button
                                variant="outline"
                                className={cn(
                                  "w-full justify-between border-border-input px-3 font-normal",
                                  !field.value && "text-muted-foreground"
                                )}
                              >
                                {field.value ? (
                                  <span className="value-m">{format(field.value, "MM/yyyy", { locale: ptBR })}</span>
                                ) : (
                                  <span>Opcional</span>
                                )}
                                <CalendarIcon className="text-muted-foreground" aria-hidden="true" />
                              </Button>
                            </FormControl>
                          </PopoverTrigger>
                          <PopoverContent className="w-auto p-0" align="end">
                            <Calendar
                              mode="single"
                              selected={field.value || undefined}
                              onSelect={field.onChange}
                              disabled={(date) => date < new Date()}
                              initialFocus
                            />
                          </PopoverContent>
                        </Popover>
                      </FormItem>
                    )}
                  />
                </div>
              </section>

              {/* Seção 2: o cofrinho */}
              <section className="space-y-4">
                <h3 className="label text-muted-foreground">Cofrinho</h3>

                {!initialData ? (
                  <Tabs value={cofrinhoType} onValueChange={(val) => setCofrinhoType(val as "new" | "existing")} className="w-full">
                    <TabsList className="mb-4 grid w-full grid-cols-2">
                      <TabsTrigger value="new">Novo cofrinho</TabsTrigger>
                      <TabsTrigger value="existing">Usar existente</TabsTrigger>
                    </TabsList>

                    <TabsContent value="new" className="space-y-4">
                      <FormField
                        control={form.control}
                        name="cofrinho_name"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Nome do cofrinho</FormLabel>
                            <FormControl>
                              <Input placeholder="Ex.: Cofrinho viagem" {...field} />
                            </FormControl>
                          </FormItem>
                        )}
                      />

                      <div className="grid grid-cols-2 gap-4">
                        <FormField
                          control={form.control}
                          name="institution"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>Instituição</FormLabel>
                              <Select onValueChange={field.onChange} defaultValue={field.value}>
                                <FormControl>
                                  <SelectTrigger>
                                    <SelectValue placeholder="Selecione..." />
                                  </SelectTrigger>
                                </FormControl>
                                <SelectContent className="max-h-[200px]">
                                  <SelectItem value="other">Outro</SelectItem>
                                  {BANKS.map((bank) => (
                                    <SelectItem key={bank.value} value={bank.value}>
                                      {bank.label}
                                    </SelectItem>
                                  ))}
                                </SelectContent>
                              </Select>
                            </FormItem>
                          )}
                        />

                        <FormField
                          control={form.control}
                          name="color"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>Cor</FormLabel>
                              <FormControl>
                                <div className="flex gap-2">
                                  {/* A cor do cofrinho é dado do usuário */}
                                  <div
                                    className="relative h-9 w-9 shrink-0 rounded-md border border-border-input"
                                    style={{ backgroundColor: field.value }}
                                  >
                                    <Input
                                      type="color"
                                      {...field}
                                      aria-label="Escolher a cor"
                                      className="absolute inset-0 h-full w-full cursor-pointer opacity-0"
                                    />
                                  </div>
                                  <Input {...field} className="flex-1 font-mono uppercase" maxLength={7} placeholder="#000000" />
                                </div>
                              </FormControl>
                            </FormItem>
                          )}
                        />
                      </div>
                    </TabsContent>

                    <TabsContent value="existing">
                      <FormField
                        control={form.control}
                        name="account"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Cofrinhos disponíveis</FormLabel>
                            <Select onValueChange={field.onChange} value={field.value || ""}>
                              <FormControl>
                                <SelectTrigger className="h-auto min-h-9 py-2">
                                  <SelectValue placeholder="Selecione um cofrinho..." />
                                </SelectTrigger>
                              </FormControl>
                              <SelectContent>
                                {piggyBanks.length > 0 ? (
                                  piggyBanks.map((bank) => (
                                    <SelectItem key={bank.id} value={bank.id} className="py-2">
                                      <div className="flex items-center gap-3">
                                        {/* A cor do cofrinho é dado do usuário */}
                                        <span
                                          aria-hidden="true"
                                          className="h-3 w-3 shrink-0 rounded-full"
                                          style={{ backgroundColor: bank.color }}
                                        />
                                        <div className="flex flex-col">
                                          <span className="text-sm font-medium">{bank.name}</span>
                                          <span className="text-xs text-muted-foreground">Saldo real: {formatarMoeda(bank.balance)}</span>
                                        </div>
                                      </div>
                                    </SelectItem>
                                  ))
                                ) : (
                                  <div className="p-4 text-center text-sm text-muted-foreground">Nenhum cofrinho encontrado</div>
                                )}
                              </SelectContent>
                            </Select>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                    </TabsContent>
                  </Tabs>
                ) : (
                  <div className="flex items-center gap-3 rounded-md border border-border bg-elevated p-4">
                    <PiggyBank className="h-4 w-4 text-muted-foreground" aria-hidden="true" />
                    <div>
                      <p className="label text-muted-foreground">Conta vinculada</p>
                      <p className="text-sm font-medium">{piggyBanks.find(b => b.id === initialData.account)?.name || "Cofrinho vinculado"}</p>
                    </div>
                  </div>
                )}
              </section>

              {/* Seção 3: personalização */}
              <section className="space-y-4">
                <h3 className="label text-muted-foreground">Personalização</h3>

                <div className="space-y-2">
                  <p className="text-sm font-medium" id="capa-da-meta">Capa da meta</p>
                  <button
                    type="button"
                    aria-labelledby="capa-da-meta"
                    aria-describedby="capa-da-meta-ajuda"
                    className={cn(
                      "relative flex h-32 w-full cursor-pointer flex-col items-center justify-center overflow-hidden rounded-lg border border-dashed transition-colors duration-fast ease-az-out focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
                      imagePreview ? "border-border" : "border-border-strong hover:bg-elevated"
                    )}
                    onClick={() => fileInputRef.current?.click()}
                  >
                    {imagePreview ? (
                      <img src={imagePreview} alt="Prévia da capa" className="absolute inset-0 h-full w-full object-cover" />
                    ) : (
                      <span className="flex flex-col items-center gap-2 text-muted-foreground">
                        <ImagePlus className="h-5 w-5" aria-hidden="true" />
                        <span className="text-sm">Escolher imagem</span>
                      </span>
                    )}
                  </button>
                  <p id="capa-da-meta-ajuda" className="flex items-center gap-1.5 text-xs text-muted-foreground">
                    {imagePreview && <Camera className="h-3.5 w-3.5" aria-hidden="true" />}
                    {imagePreview ? "Clique na imagem para trocar." : "Opcional. Aparece no topo do card da meta."}
                  </p>
                  <input type="file" ref={fileInputRef} className="hidden" accept="image/*" onChange={handleImageChange} />
                </div>

                <FormField
                  control={form.control}
                  name="description"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Notas</FormLabel>
                      <FormControl>
                        <Textarea
                          placeholder="O que esta meta significa para você"
                          className="h-24 resize-none"
                          {...field}
                        />
                      </FormControl>
                    </FormItem>
                  )}
                />
              </section>

              <DialogFooter>
                <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
                  Cancelar
                </Button>
                <Button type="submit" loading={isLoading}>
                  {initialData ? "Atualizar objetivo" : "Criar meta"}
                </Button>
              </DialogFooter>
            </form>
          </Form>
        </div>
      </DialogContent>
    </Dialog>
  )
}
