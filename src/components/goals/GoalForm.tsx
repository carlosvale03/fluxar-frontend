"use client"

import { useState, useEffect, useRef } from "react"
import { Target, Calendar as CalendarIcon, Loader2, ImagePlus, Camera, X, PiggyBank, Plus, Search, Check } from "lucide-react"
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
import { Goal } from "@/types/goals"
import { Account, AccountType } from "@/types/accounts"
import { goalsService } from "@/services/goals"
import { accountsService } from "@/services/accounts"
import { BANKS } from "@/data/banks"
import { toast } from "sonner"

const parseAmount = (val: string) => {
  if (val.includes(',')) {
    return Number(val.replace(/\./g, '').replace(',', '.'));
  }
  return Number(val);
};

const goalSchema = z.object({
  name: z.string().min(1, "Nome é obrigatório"),
  description: z.string().optional(),
  target_amount: z.string().refine((val) => {
    const num = parseAmount(val);
    return !isNaN(num) && num > 0;
  }, {
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
        target_amount: initialData.target_amount.toString(),
        target_date: initialData.target_date ? new Date(initialData.target_date) : null,
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
      console.error("Failed to fetch piggy banks", error)
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
        target_amount: parseAmount(values.target_amount),
        target_date: values.target_date ? format(values.target_date, "yyyy-MM-dd") : undefined,
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
        toast.success("Meta atualizada com sucesso!")
      } else {
        await goalsService.createGoal(data)
        toast.success("Meta criada com sucesso!")
      }

      onSuccess()
      onOpenChange(false)
    } catch (error) {
      console.error("Failed to save goal", error)
      toast.error("Erro ao salvar meta.")
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[500px] rounded-[40px] border-border/40 bg-card/95 backdrop-blur-3xl p-0 shadow-2xl overflow-hidden">
        <DialogHeader className="p-8 pb-4 relative">
          <div className="absolute top-0 right-0 p-8 opacity-5">
            <Target className="w-32 h-32 rotate-12" />
          </div>
          <div className="w-14 h-14 rounded-2xl bg-primary/10 text-primary flex items-center justify-center mb-6 ring-1 ring-primary/20 shadow-inner">
            <Target className="h-7 w-7" />
          </div>
          <DialogTitle className="text-3xl font-black uppercase tracking-tighter leading-none text-foreground">
            {initialData ? "Refinar Objetivo" : "Novo Objetivo"}
          </DialogTitle>
          <DialogDescription className="text-sm font-medium mt-2 text-foreground/80">
            Cada centavo guardado é um passo mais perto do seu sonho.
          </DialogDescription>
        </DialogHeader>

        <div className="max-h-[65vh] overflow-y-auto custom-scrollbar px-8 py-2 pb-8">
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-8">
              {/* Seção 1: O Objetivo */}
              <div className="space-y-6">
                <div className="flex items-center gap-2 mb-2">
                  <div className="w-1 h-4 bg-primary rounded-full" />
                  <h3 className="text-[10px] font-black uppercase tracking-[0.2em] text-foreground/70">Informações Básicas</h3>
                </div>
                
                <FormField
                  control={form.control}
                  name="name"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="text-[10px] font-bold uppercase tracking-widest text-foreground/80 ml-1">Nome da Meta</FormLabel>
                      <FormControl>
                        <Input 
                          placeholder="Ex: Viagem de Férias 2026" 
                          {...field} 
                          className="rounded-[20px] border-border/40 bg-muted/20 h-12 focus:bg-background/80 focus:ring-primary/20 transition-all font-bold"
                        />
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
                        <FormLabel className="text-[10px] font-bold uppercase tracking-widest text-foreground/80 ml-1">Valor Alvo (R$)</FormLabel>
                        <FormControl>
                          <div className="relative group">
                            <Input 
                              placeholder="0,00" 
                              {...field} 
                              className="rounded-[20px] border-border/40 bg-muted/20 h-12 pl-10 focus:bg-background/80 transition-all font-black text-primary placeholder:text-foreground/50"
                            />
                            <span className="absolute left-4 top-1/2 -translate-y-1/2 text-primary font-bold text-xs">R$</span>
                          </div>
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
                        <FormLabel className="text-[10px] font-bold uppercase tracking-widest text-foreground/80 ml-1">Até Quando?</FormLabel>
                        <Popover>
                          <PopoverTrigger asChild>
                            <FormControl>
                              <Button
                                variant={"outline"}
                                className={cn(
                                  "w-full h-12 font-bold rounded-[20px] border-border/40 bg-muted/20 hover:bg-muted/30 transition-all text-left px-4",
                                  !field.value && "text-muted-foreground"
                                )}
                              >
                                {field.value ? (
                                  format(field.value, "MM/yyyy", { locale: ptBR })
                                ) : (
                                  <span className="text-xs text-foreground/70">Opcional</span>
                                )}
                                <CalendarIcon className="ml-auto h-4 w-4 text-foreground/60" />
                              </Button>
                            </FormControl>
                          </PopoverTrigger>
                          <PopoverContent className="w-auto p-0 rounded-[32px] border-border/40 shadow-2xl bg-card/95 backdrop-blur-xl" align="end">
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
              </div>

              {/* Seção 2: O Cofrinho (A parte nova) */}
              <div className="space-y-6 pt-2">
                <div className="flex items-center gap-2 mb-4">
                  <div className="w-1 h-4 bg-emerald-500 rounded-full" />
                  <h3 className="text-[10px] font-black uppercase tracking-[0.2em] text-emerald-600 font-bold">Gestão do Cofrinho</h3>
                </div>

                {!initialData ? (
                  <Tabs value={cofrinhoType} onValueChange={(val) => setCofrinhoType(val as any)} className="w-full">
                    <TabsList className="grid grid-cols-2 rounded-[20px] bg-muted/30 h-11 p-1 mb-6">
                      <TabsTrigger value="new" className="rounded-[16px] text-[10px] font-black uppercase tracking-wider data-[state=active]:bg-background data-[state=active]:shadow-sm">
                        Novo Cofrinho
                      </TabsTrigger>
                      <TabsTrigger value="existing" className="rounded-[16px] text-[10px] font-black uppercase tracking-wider data-[state=active]:bg-background data-[state=active]:shadow-sm">
                        Usar Existente
                      </TabsTrigger>
                    </TabsList>

                    <TabsContent value="new" className="space-y-4 animate-in fade-in slide-in-from-bottom-2 duration-300">
                      <FormField
                        control={form.control}
                        name="cofrinho_name"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel className="text-[10px] font-bold uppercase tracking-widest text-foreground/80 ml-1">Nome do Cofrinho</FormLabel>
                            <FormControl>
                              <Input 
                                placeholder="Ex: Cofrinho Viagem" 
                                {...field} 
                                className="rounded-[20px] border-border/40 bg-muted/20 h-12 focus:bg-background/80 font-bold"
                              />
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
                              <FormLabel className="text-[10px] font-bold uppercase tracking-widest text-foreground/80 ml-1">Instituição</FormLabel>
                              <Select onValueChange={field.onChange} defaultValue={field.value}>
                                <FormControl>
                                  <SelectTrigger className="rounded-[20px] border-border/40 bg-muted/20 h-12 font-bold">
                                    <SelectValue placeholder="Selecione..." />
                                  </SelectTrigger>
                                </FormControl>
                                <SelectContent className="rounded-[24px] border-border/40 bg-card/95 backdrop-blur-xl max-h-[200px]">
                                  <SelectItem value="other" className="rounded-xl">Outro</SelectItem>
                                  {BANKS.map((bank) => (
                                    <SelectItem key={bank.value} value={bank.value} className="rounded-xl">
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
                              <FormLabel className="text-[10px] font-bold uppercase tracking-widest text-foreground/80 ml-1">Cor</FormLabel>
                              <FormControl>
                                <div className="flex gap-2 h-12">
                                  <div 
                                    className="relative w-12 h-12 rounded-[20px] border border-border/40 shadow-inner transition-colors duration-300"
                                    style={{ backgroundColor: field.value }}
                                  >
                                    <Input 
                                      type="color" 
                                      {...field} 
                                      className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                                    />
                                  </div>
                                  <Input 
                                    {...field} 
                                    className="rounded-[20px] border-border/40 bg-muted/20 flex-1 font-mono uppercase text-[10.5px] font-black"
                                    maxLength={7}
                                    placeholder="#000000"
                                  />
                                </div>
                              </FormControl>
                            </FormItem>
                          )}
                        />
                      </div>
                    </TabsContent>

                    <TabsContent value="existing" className="animate-in fade-in slide-in-from-bottom-2 duration-300">
                      <FormField
                        control={form.control}
                        name="account"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel className="text-[10px] font-bold uppercase tracking-widest text-foreground/80 ml-1">Cofrinhos Disponíveis</FormLabel>
                            <Select onValueChange={field.onChange} value={field.value || ""}>
                              <FormControl>
                                <SelectTrigger className="rounded-[20px] border-border/40 bg-muted/20 h-14 font-bold">
                                  <SelectValue placeholder="Selecione um cofrinho..." />
                                </SelectTrigger>
                              </FormControl>
                            <SelectContent className="rounded-[24px] border-border/40 bg-card/95 backdrop-blur-xl">
                              {piggyBanks.length > 0 ? (
                                piggyBanks.map((bank) => (
                                  <SelectItem 
                                    key={bank.id} 
                                    value={bank.id} 
                                    className="rounded-xl py-3 px-4 focus:bg-primary focus:text-primary-foreground group"
                                  >
                                    <div className="flex items-center gap-3">
                                      <div 
                                        className="w-3 h-3 rounded-full flex-shrink-0" 
                                        style={{ backgroundColor: bank.color }} 
                                      />
                                      <div className="flex flex-col">
                                        <span className="font-black text-xs group-focus:text-primary-foreground transition-colors">{bank.name}</span>
                                        <span className="text-[8px] font-bold uppercase opacity-70 group-focus:text-primary-foreground/80 transition-colors">Saldo real: {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(bank.balance)}</span>
                                      </div>
                                    </div>
                                  </SelectItem>
                                ))
                              ) : (
                                <div className="p-4 text-center text-xs opacity-50 font-bold italic text-foreground">Nenhum cofrinho encontrado</div>
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
                  <div className="p-5 rounded-[24px] bg-muted/20 border border-border/40 flex items-center gap-4">
                    <div className="w-10 h-10 rounded-xl bg-emerald-500/10 text-emerald-600 flex items-center justify-center">
                      <PiggyBank className="w-5 h-5" />
                    </div>
                    <div>
                      <p className="text-[10px] font-black uppercase tracking-widest text-foreground/70">Conta Vinculada</p>
                      <p className="text-sm font-black text-foreground">{piggyBanks.find(b => b.id === initialData.account)?.name || "Cofrinho vinculado"}</p>
                    </div>
                  </div>
                )}
              </div>

              {/* Seção 3: Outros Detalhes */}
              <div className="space-y-6 pt-2">
                <div className="flex items-center gap-2 mb-2">
                  <div className="w-1 h-4 bg-amber-500 rounded-full" />
                  <h3 className="text-[10px] font-black uppercase tracking-[0.2em] text-amber-600 font-bold">Personalização</h3>
                </div>

                <div className="space-y-4">
                  <FormLabel className="text-[10px] font-bold uppercase tracking-widest text-foreground/80 ml-1">Capa da Meta (Inspiracional)</FormLabel>
                  <div 
                    className={cn(
                      "relative group h-40 rounded-[32px] border-2 border-dashed transition-all duration-500 flex flex-col items-center justify-center overflow-hidden cursor-pointer",
                      imagePreview 
                        ? "border-transparent text-white" 
                        : "border-border/40 bg-muted/10 hover:bg-muted/20 hover:border-primary/40 text-foreground"
                    )}
                    onClick={() => fileInputRef.current?.click()}
                  >
                    {imagePreview ? (
                      <>
                        <img 
                          src={imagePreview} 
                          alt="Preview" 
                          className="absolute inset-0 w-full h-full object-cover transition-transform duration-700 group-hover:scale-110"
                        />
                        <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center backdrop-blur-md">
                          <div className="flex flex-col items-center gap-2">
                            <Camera className="h-8 w-8 animate-in zoom-in duration-300" />
                            <span className="text-[10px] font-black uppercase tracking-widest">Alterar Foto</span>
                          </div>
                        </div>
                      </>
                    ) : (
                      <div className="text-center space-y-2 px-6">
                        <div className="w-12 h-12 rounded-2xl bg-primary/20 text-primary flex items-center justify-center mx-auto mb-2 group-hover:rotate-12 transition-transform duration-500">
                          <ImagePlus className="h-6 w-6" />
                        </div>
                        <p className="text-[10px] font-black uppercase tracking-widest text-foreground/80">Moodboard Visual</p>
                      </div>
                    )}
                    <input type="file" ref={fileInputRef} className="hidden" accept="image/*" onChange={handleImageChange} />
                  </div>
                </div>

                <FormField
                  control={form.control}
                  name="description"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="text-[10px] font-bold uppercase tracking-widest text-foreground/80 ml-1">Notas e Sonhos</FormLabel>
                      <FormControl>
                        <Textarea 
                          placeholder="Detalhe o que esta meta significa para você..." 
                          className="resize-none rounded-[24px] border-border/40 bg-muted/20 focus:bg-background/80 h-28 transition-all font-medium" 
                          {...field} 
                        />
                      </FormControl>
                    </FormItem>
                  )}
                />
              </div>

              {/* Botão de Submit */}
              <div className="pt-4">
                <Button 
                  type="submit" 
                  className="w-full rounded-[24px] font-black uppercase tracking-[0.2em] text-xs h-16 shadow-xl shadow-primary/20 bg-primary hover:bg-primary/90 hover:scale-[1.02] active:scale-[0.98] transition-all border-0"
                  disabled={isLoading}
                >
                  {isLoading ? (
                    <div className="flex items-center gap-3">
                      <Loader2 className="h-5 w-5 animate-spin" />
                      <span className="animate-pulse">Criando Sonho...</span>
                    </div>
                  ) : (
                    <div className="flex items-center gap-2">
                      <Plus className="w-5 h-5 mr-1" />
                      {initialData ? "Atualizar Objetivo" : "Ativar Meta Agora"}
                    </div>
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
