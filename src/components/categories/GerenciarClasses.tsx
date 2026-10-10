"use client"

import { useEffect, useState } from "react"
import { useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import * as z from "zod"
import { Layers, Loader2, Lock, Pencil, Plus, Sparkles, Trash2, X } from "lucide-react"
import { toast } from "sonner"

import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import { ScrollArea } from "@/components/ui/scroll-area"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog"
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form"
import { ExpenseClass } from "@/types/categories"
import {
  createExpenseClass,
  deleteExpenseClass,
  getExpenseClasses,
  updateExpenseClass,
} from "@/services/expense-classes"
import { tratarErro } from "@/lib/erros"
import { cn } from "@/lib/utils"

// CLASSE-05: o limite vale em todos os planos, contando as duas padrão
export const LIMITE_DE_CLASSES = 5

// CLASSE-03: sugestões fixas, oferecidas enquanto o usuário não as criou
export const SUGESTOES_DE_CLASSE = [
  { name: "Dívidas", color: "#DC2626" },
  { name: "Impostos e taxas", color: "#7C3AED" },
  { name: "Profissional", color: "#2563EB" },
] as const

const CORES_DE_CLASSE = [
  "#16A34A",
  "#F97316",
  "#DC2626",
  "#7C3AED",
  "#2563EB",
  "#0EA5E9",
  "#DB2777",
  "#CA8A04",
  "#0D9488",
  "#64748B",
]

// CLASSE-07: o nome é único sem diferença de maiúsculas e acentos
export function normalizarNomeDaClasse(nome: string): string {
  return nome.normalize("NFD").replace(/[̀-ͯ]/g, "").trim().replace(/\s+/g, " ").toLowerCase()
}

export function sugestoesPendentes(classes: ExpenseClass[]) {
  const criadas = new Set(classes.map((c) => normalizarNomeDaClasse(c.name)))
  return SUGESTOES_DE_CLASSE.filter((s) => !criadas.has(normalizarNomeDaClasse(s.name)))
}

// CLASSE-09: quantas categorias usam a classe, antes de excluir
export function textoDaContagem(quantidade: number): string {
  if (quantidade === 0) return "Nenhuma categoria usa esta classe."
  if (quantidade === 1) return "1 categoria usa esta classe."
  return `${quantidade} categorias usam esta classe.`
}

const esquema = z.object({
  name: z
    .string()
    .trim()
    .min(1, "Informe o nome da classe.")
    .max(30, "Use no máximo 30 caracteres."),
  color: z.string().regex(/^#[0-9A-Fa-f]{6}$/, "Informe a cor no formato #RRGGBB."),
})

type ValoresDaClasse = z.infer<typeof esquema>

interface GerenciarClassesProps {
  // Chamado depois de criar, editar ou excluir, para a tela reler as
  // categorias e as classes
  onAlterar?: () => void
}

export function GerenciarClasses({ onAlterar }: GerenciarClassesProps) {
  const [aberto, setAberto] = useState(false)
  const [classes, setClasses] = useState<ExpenseClass[]>([])
  const [carregando, setCarregando] = useState(false)
  const [editando, setEditando] = useState<ExpenseClass | null>(null)
  const [excluindo, setExcluindo] = useState<ExpenseClass | null>(null)
  const [salvando, setSalvando] = useState(false)

  const corLivre = (lista: ExpenseClass[]) =>
    CORES_DE_CLASSE.find((cor) => !lista.some((c) => c.color.toUpperCase() === cor)) ?? CORES_DE_CLASSE[0]

  const form = useForm<ValoresDaClasse>({
    resolver: zodResolver(esquema),
    defaultValues: { name: "", color: CORES_DE_CLASSE[2] },
  })

  const carregar = async () => {
    setCarregando(true)
    try {
      const lista = await getExpenseClasses()
      setClasses(lista)
      return lista
    } catch (error) {
      tratarErro(error, { mensagemPadrao: "Erro ao carregar as classes.", tentarDeNovo: carregar })
      return null
    } finally {
      setCarregando(false)
    }
  }

  const limparFormulario = (lista: ExpenseClass[] = classes) => {
    setEditando(null)
    form.reset({ name: "", color: corLivre(lista) })
  }

  useEffect(() => {
    if (!aberto) return
    void carregar().then((lista) => {
      if (lista) limparFormulario(lista)
    })
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [aberto])

  const depoisDeAlterar = async () => {
    const lista = await carregar()
    limparFormulario(lista ?? classes)
    onAlterar?.()
  }

  const noLimite = classes.length >= LIMITE_DE_CLASSES
  const sugestoes = noLimite ? [] : sugestoesPendentes(classes)

  const comecarEdicao = (classe: ExpenseClass) => {
    setEditando(classe)
    form.reset({ name: classe.name, color: classe.color.toUpperCase() })
  }

  async function salvar(valores: ValoresDaClasse) {
    setSalvando(true)
    try {
      if (editando) {
        // CLASSE-08: a classe padrão só troca a cor
        await updateExpenseClass(
          editando.id,
          editando.is_default ? { color: valores.color } : { name: valores.name, color: valores.color },
        )
        toast.success("Classe atualizada!")
      } else {
        await createExpenseClass({ name: valores.name, color: valores.color })
        toast.success("Classe criada!")
      }
      await depoisDeAlterar()
    } catch (error) {
      // CLASSE-06 e CLASSE-07 no campo do nome; o limite (detail) no Sonner
      tratarErro(error, { form, campos: ["name", "color"], mensagemPadrao: "Erro ao salvar a classe." })
    } finally {
      setSalvando(false)
    }
  }

  // CLASSE-03 e CLASSE-04: a sugestão cria a classe com o nome e a cor dela
  const criarSugestao = async (sugestao: (typeof SUGESTOES_DE_CLASSE)[number]) => {
    setSalvando(true)
    try {
      await createExpenseClass({ name: sugestao.name, color: sugestao.color })
      toast.success(`Classe ${sugestao.name} criada!`)
      await depoisDeAlterar()
    } catch (error) {
      tratarErro(error, { mensagemPadrao: "Erro ao criar a classe." })
    } finally {
      setSalvando(false)
    }
  }

  // CLASSE-09: só exclui depois da confirmação
  const confirmarExclusao = async () => {
    const classe = excluindo
    if (!classe) return
    try {
      await deleteExpenseClass(classe.id)
      toast.success("Classe excluída!")
      await depoisDeAlterar()
    } catch (error) {
      tratarErro(error, { mensagemPadrao: "Erro ao excluir a classe." })
    } finally {
      setExcluindo(null)
    }
  }

  const nomeTravado = !!editando?.is_default

  return (
    <>
      <Dialog open={aberto} onOpenChange={setAberto}>
        <DialogTrigger asChild>
          <Button
            variant="outline"
            className="rounded-full px-6 h-12 font-bold border-primary/20 text-primary hover:bg-primary/5 transition-all hover:scale-105 active:scale-95"
          >
            <Layers className="mr-2 h-5 w-5" />
            Gerenciar classes
          </Button>
        </DialogTrigger>
        <DialogContent className="sm:max-w-[520px] rounded-[32px] border-none shadow-2xl p-0 overflow-hidden">
          <ScrollArea className="max-h-[85vh]">
            <div className="p-8 space-y-8">
              <DialogHeader>
                <DialogTitle className="text-3xl font-black tracking-tight">Gerenciar classes</DialogTitle>
                <DialogDescription className="text-xs font-medium text-muted-foreground/70">
                  As classes mostram quanto das despesas vai para cada tipo de gasto. São até {LIMITE_DE_CLASSES}{" "}
                  classes, contando Essencial e Dispensável.
                </DialogDescription>
              </DialogHeader>

              {/* Lista das classes */}
              <div className="space-y-3">
                <div className="flex items-center gap-2">
                  <div className="w-1.5 h-4 bg-primary rounded-full" />
                  <h3 className="text-[10px] font-black uppercase tracking-[0.2em] text-muted-foreground/50">
                    Suas classes
                  </h3>
                  <span className="ml-auto text-[10px] font-black uppercase tracking-widest text-muted-foreground/40">
                    {classes.length} / {LIMITE_DE_CLASSES}
                  </span>
                </div>
                <ul className="rounded-[24px] border border-border/40 bg-muted/5 divide-y divide-border/20 overflow-hidden">
                  {carregando && classes.length === 0 ? (
                    <li className="flex items-center justify-center p-6">
                      <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
                    </li>
                  ) : (
                    classes.map((classe) => (
                      <li key={classe.id} className="flex items-center gap-3 px-4 py-3">
                        <span
                          className="w-4 h-4 rounded-full shrink-0 ring-4 ring-black/5 dark:ring-white/5"
                          style={{ backgroundColor: classe.color }}
                        />
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2">
                            <span className="font-black text-sm tracking-tight truncate">{classe.name}</span>
                            {classe.is_default && (
                              <Badge className="rounded-full px-2 py-0 text-[9px] font-black uppercase tracking-wider bg-primary/10 text-primary border border-primary/20 hover:bg-primary/10">
                                <Lock className="h-2.5 w-2.5 mr-1" />
                                Padrão
                              </Badge>
                            )}
                          </div>
                          <p className="text-[10px] font-bold text-muted-foreground/60">
                            {classe.categories_count === 1 ? "1 categoria" : `${classe.categories_count} categorias`}
                          </p>
                        </div>
                        <Button
                          type="button"
                          variant="ghost"
                          size="icon"
                          className="h-9 w-9 rounded-xl text-foreground/60 hover:text-foreground"
                          aria-label={classe.is_default ? `Mudar a cor de ${classe.name}` : `Editar ${classe.name}`}
                          title={classe.is_default ? "Mudar a cor" : "Editar"}
                          onClick={() => comecarEdicao(classe)}
                        >
                          <Pencil className="h-4 w-4" />
                        </Button>
                        {!classe.is_default && (
                          <Button
                            type="button"
                            variant="ghost"
                            size="icon"
                            className="h-9 w-9 rounded-xl text-destructive/60 hover:text-destructive hover:bg-destructive/10"
                            aria-label={`Excluir ${classe.name}`}
                            title="Excluir"
                            onClick={() => setExcluindo(classe)}
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        )}
                      </li>
                    ))
                  )}
                </ul>
              </div>

              {/* CLASSE-03: sugestões ainda não criadas */}
              {sugestoes.length > 0 && (
                <div className="space-y-3">
                  <div className="flex items-center gap-2">
                    <div className="w-1.5 h-4 bg-primary rounded-full" />
                    <h3 className="text-[10px] font-black uppercase tracking-[0.2em] text-muted-foreground/50">
                      Sugestões
                    </h3>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    {sugestoes.map((sugestao) => (
                      <Button
                        key={sugestao.name}
                        type="button"
                        variant="outline"
                        disabled={salvando}
                        aria-label={`Criar ${sugestao.name}`}
                        className="rounded-full h-9 px-4 text-xs font-bold border-border/40 hover:bg-muted/30"
                        onClick={() => criarSugestao(sugestao)}
                      >
                        <span className="w-2.5 h-2.5 rounded-full mr-2" style={{ backgroundColor: sugestao.color }} />
                        {sugestao.name}
                        <Plus className="ml-1.5 h-3.5 w-3.5 opacity-60" />
                      </Button>
                    ))}
                  </div>
                </div>
              )}

              {/* Criação e edição */}
              <Form {...form}>
                <form onSubmit={form.handleSubmit(salvar)} className="space-y-5">
                  <div className="flex items-center gap-2">
                    <div className="w-1.5 h-4 bg-primary rounded-full" />
                    <h3 className="text-[10px] font-black uppercase tracking-[0.2em] text-muted-foreground/50">
                      {editando ? `Editando ${editando.name}` : "Nova classe"}
                    </h3>
                    {editando && (
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        className="ml-auto h-7 rounded-full text-[10px] font-black uppercase tracking-widest"
                        onClick={() => limparFormulario()}
                      >
                        <X className="h-3 w-3 mr-1" />
                        Cancelar edição
                      </Button>
                    )}
                  </div>

                  {!editando && noLimite ? (
                    <p className="text-xs font-bold text-muted-foreground p-4 rounded-[20px] bg-muted/10 border border-border/40">
                      Limite de {LIMITE_DE_CLASSES} classes atingido. Exclua uma classe criada por você para criar outra.
                    </p>
                  ) : (
                    <div className="space-y-5 p-5 bg-muted/5 rounded-[24px] border border-border/40">
                      <FormField
                        control={form.control}
                        name="name"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel className="text-[10px] font-black uppercase tracking-widest text-muted-foreground/60 pl-1">
                              Nome da classe
                            </FormLabel>
                            <FormControl>
                              <Input
                                placeholder="Ex: Dívidas"
                                maxLength={30}
                                disabled={nomeTravado}
                                className="bg-card border-border/40 h-11 rounded-xl focus-visible:ring-primary/20 font-medium placeholder:text-muted-foreground/30"
                                {...field}
                              />
                            </FormControl>
                            {nomeTravado && (
                              <p className="text-[10px] font-medium text-muted-foreground pl-1">
                                As classes padrão não podem ser renomeadas; só a cor muda.
                              </p>
                            )}
                            <FormMessage />
                          </FormItem>
                        )}
                      />

                      <FormField
                        control={form.control}
                        name="color"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel className="text-[10px] font-black uppercase tracking-widest text-muted-foreground/60 pl-1">
                              Cor
                            </FormLabel>
                            <FormControl>
                              <div className="flex flex-wrap gap-3">
                                {CORES_DE_CLASSE.map((cor) => {
                                  const escolhida = field.value?.toUpperCase() === cor
                                  return (
                                    <button
                                      key={cor}
                                      type="button"
                                      aria-label={`Cor ${cor}`}
                                      aria-pressed={escolhida}
                                      className={cn(
                                        "w-9 h-9 rounded-xl transition-all duration-300 flex items-center justify-center",
                                        escolhida ? "scale-110 shadow-lg" : "opacity-80 hover:opacity-100 hover:scale-110",
                                      )}
                                      style={{
                                        backgroundColor: cor,
                                        outline: escolhida ? `2px solid ${cor}40` : "none",
                                        outlineOffset: "3px",
                                      }}
                                      onClick={() => field.onChange(cor)}
                                    >
                                      {escolhida && <div className="w-1.5 h-1.5 rounded-full bg-white/70" />}
                                    </button>
                                  )
                                })}
                              </div>
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />

                      <div className="flex justify-end">
                        <Button
                          type="submit"
                          disabled={salvando}
                          className="rounded-full h-11 px-8 font-bold shadow-lg shadow-primary/20 transition-all hover:scale-105 active:scale-95"
                        >
                          {salvando ? (
                            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                          ) : (
                            <Sparkles className="mr-2 h-4 w-4" />
                          )}
                          {editando ? "Salvar classe" : "Criar classe"}
                        </Button>
                      </div>
                    </div>
                  )}
                </form>
              </Form>
            </div>
          </ScrollArea>
        </DialogContent>
      </Dialog>

      {/* CLASSE-09: a contagem antes da exclusão */}
      <AlertDialog open={!!excluindo} onOpenChange={(open) => !open && setExcluindo(null)}>
        <AlertDialogContent className="rounded-[32px] border-none shadow-2xl p-8">
          <AlertDialogHeader>
            <div className="w-14 h-14 rounded-2xl bg-destructive/10 flex items-center justify-center text-destructive mb-4 shadow-sm ring-1 ring-destructive/20">
              <Trash2 className="h-7 w-7" />
            </div>
            <AlertDialogTitle className="text-2xl font-black tracking-tight text-foreground/90 leading-tight">
              Excluir a classe {excluindo?.name}?
            </AlertDialogTitle>
            <AlertDialogDescription className="text-sm font-medium leading-relaxed pt-2">
              {textoDaContagem(excluindo?.categories_count ?? 0)}
              {(excluindo?.categories_count ?? 0) > 0 &&
                " Elas passam a seguir a classe da categoria-mãe ou ficam sem classe."}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter className="pt-6">
            <AlertDialogCancel className="rounded-full h-11 px-6 font-bold">Cancelar</AlertDialogCancel>
            <AlertDialogAction
              onClick={confirmarExclusao}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90 rounded-full h-11 px-6 font-bold"
            >
              Excluir classe
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  )
}
