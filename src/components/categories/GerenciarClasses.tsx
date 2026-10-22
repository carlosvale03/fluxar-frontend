"use client"

import { useEffect, useState } from "react"
import { useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import * as z from "zod"
import { Layers, Loader2, Lock, Pencil, Plus, Trash2, X } from "lucide-react"
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
import { ConfirmacaoDestrutiva } from "@/components/ui/confirmacao-destrutiva"
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
      tratarErro(error, { mensagemPadrao: "Não foi possível carregar as classes.", tentarDeNovo: carregar })
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
        toast.success("Classe atualizada.")
      } else {
        await createExpenseClass({ name: valores.name, color: valores.color })
        toast.success("Classe criada.")
      }
      await depoisDeAlterar()
    } catch (error) {
      // CLASSE-06 e CLASSE-07 no campo do nome; o limite (detail) no Sonner
      tratarErro(error, { form, campos: ["name", "color"], mensagemPadrao: "Não foi possível salvar a classe. Tente de novo." })
    } finally {
      setSalvando(false)
    }
  }

  // CLASSE-03 e CLASSE-04: a sugestão cria a classe com o nome e a cor dela
  const criarSugestao = async (sugestao: (typeof SUGESTOES_DE_CLASSE)[number]) => {
    setSalvando(true)
    try {
      await createExpenseClass({ name: sugestao.name, color: sugestao.color })
      toast.success(`Classe ${sugestao.name} criada.`)
      await depoisDeAlterar()
    } catch (error) {
      tratarErro(error, { mensagemPadrao: "Não foi possível criar a classe. Tente de novo." })
    } finally {
      setSalvando(false)
    }
  }

  // CLASSE-09: só exclui depois da confirmação; se falhar, a confirmação fica aberta
  const confirmarExclusao = async () => {
    const classe = excluindo
    if (!classe) return
    try {
      await deleteExpenseClass(classe.id)
    } catch (error) {
      tratarErro(error, { mensagemPadrao: "Não foi possível excluir a classe. Tente de novo." })
      throw error
    }
    toast.success("Classe excluída.")
    await depoisDeAlterar()
  }

  const nomeTravado = !!editando?.is_default

  return (
    <>
      <Dialog open={aberto} onOpenChange={setAberto}>
        <DialogTrigger asChild>
          <Button variant="outline">
            <Layers aria-hidden="true" />
            Gerenciar classes
          </Button>
        </DialogTrigger>
        <DialogContent className="overflow-hidden p-0 sm:max-w-[520px]">
          <ScrollArea className="max-h-[85vh]">
            <div className="space-y-6 p-6">
              <DialogHeader>
                <DialogTitle>Gerenciar classes</DialogTitle>
                <DialogDescription>
                  As classes mostram quanto das saídas vai para cada tipo de gasto. São até {LIMITE_DE_CLASSES}{" "}
                  classes, contando Essencial e Dispensável.
                </DialogDescription>
              </DialogHeader>

              {/* Lista das classes */}
              <section className="space-y-2">
                <div className="flex items-center gap-2">
                  <h3 className="label text-muted-foreground">Suas classes</h3>
                  <span className="label ml-auto tabular-nums text-muted-foreground">
                    {classes.length} / {LIMITE_DE_CLASSES}
                  </span>
                </div>
                <ul className="divide-y divide-border overflow-hidden rounded-lg border border-border bg-card">
                  {carregando && classes.length === 0 ? (
                    <li className="flex items-center justify-center p-6">
                      <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" aria-label="Carregando classes" />
                    </li>
                  ) : (
                    classes.map((classe) => (
                      <li key={classe.id} className="flex items-center gap-3 px-4 py-2.5">
                        <span
                          aria-hidden="true"
                          className="h-3 w-3 shrink-0 rounded-full"
                          style={{ backgroundColor: classe.color }}
                        />
                        <div className="min-w-0 flex-1">
                          <div className="flex items-center gap-2">
                            <span className="truncate text-sm font-semibold">{classe.name}</span>
                            {classe.is_default && (
                              <Badge variant="secondary">
                                <Lock className="h-3 w-3" aria-hidden="true" />
                                Padrão
                              </Badge>
                            )}
                          </div>
                          <p className="text-xs text-muted-foreground">
                            {classe.categories_count === 1 ? "1 categoria" : `${classe.categories_count} categorias`}
                          </p>
                        </div>
                        <Button
                          type="button"
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8"
                          aria-label={classe.is_default ? `Mudar a cor de ${classe.name}` : `Editar ${classe.name}`}
                          title={classe.is_default ? "Mudar a cor" : "Editar"}
                          onClick={() => comecarEdicao(classe)}
                        >
                          <Pencil aria-hidden="true" />
                        </Button>
                        {!classe.is_default && (
                          <Button
                            type="button"
                            variant="ghost"
                            size="icon"
                            className="h-8 w-8 text-outflow hover:bg-outflow/10 hover:text-outflow"
                            aria-label={`Excluir ${classe.name}`}
                            title="Excluir"
                            onClick={() => setExcluindo(classe)}
                          >
                            <Trash2 aria-hidden="true" />
                          </Button>
                        )}
                      </li>
                    ))
                  )}
                </ul>
              </section>

              {/* CLASSE-03: sugestões ainda não criadas */}
              {sugestoes.length > 0 && (
                <section className="space-y-2">
                  <h3 className="label text-muted-foreground">Sugestões</h3>
                  <div className="flex flex-wrap gap-2">
                    {sugestoes.map((sugestao) => (
                      <Button
                        key={sugestao.name}
                        type="button"
                        variant="outline"
                        size="sm"
                        disabled={salvando}
                        aria-label={`Criar ${sugestao.name}`}
                        onClick={() => criarSugestao(sugestao)}
                      >
                        <span aria-hidden="true" className="h-2.5 w-2.5 rounded-full" style={{ backgroundColor: sugestao.color }} />
                        {sugestao.name}
                        <Plus aria-hidden="true" />
                      </Button>
                    ))}
                  </div>
                </section>
              )}

              {/* Criação e edição */}
              <Form {...form}>
                <form onSubmit={form.handleSubmit(salvar)} className="space-y-3">
                  <div className="flex items-center gap-2">
                    <h3 className="label text-muted-foreground">
                      {editando ? `Editando ${editando.name}` : "Nova classe"}
                    </h3>
                    {editando && (
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        className="ml-auto"
                        onClick={() => limparFormulario()}
                      >
                        <X aria-hidden="true" />
                        Cancelar edição
                      </Button>
                    )}
                  </div>

                  {!editando && noLimite ? (
                    <p className="rounded-lg border border-border bg-card p-4 text-sm text-fg-secondary">
                      Limite de {LIMITE_DE_CLASSES} classes atingido. Exclua uma classe criada por você para criar outra.
                    </p>
                  ) : (
                    <div className="space-y-4 rounded-lg border border-border bg-card p-4">
                      <FormField
                        control={form.control}
                        name="name"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Nome da classe</FormLabel>
                            <FormControl>
                              <Input placeholder="Ex.: Dívidas" maxLength={30} disabled={nomeTravado} {...field} />
                            </FormControl>
                            {nomeTravado && (
                              <p className="text-xs text-muted-foreground">
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
                            <FormLabel>Cor</FormLabel>
                            <FormControl>
                              <div role="group" aria-label="Cor da classe" className="flex flex-wrap gap-2">
                                {CORES_DE_CLASSE.map((cor) => {
                                  const escolhida = field.value?.toUpperCase() === cor
                                  return (
                                    <button
                                      key={cor}
                                      type="button"
                                      aria-label={`Cor ${cor}`}
                                      aria-pressed={escolhida}
                                      className={cn(
                                        "h-8 w-8 cursor-pointer rounded-md transition-[opacity,box-shadow] duration-fast ease-az-out focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background",
                                        escolhida
                                          ? "ring-2 ring-ring ring-offset-2 ring-offset-background"
                                          : "opacity-80 hover:opacity-100",
                                      )}
                                      style={{ backgroundColor: cor }}
                                      onClick={() => field.onChange(cor)}
                                    />
                                  )
                                })}
                              </div>
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />

                      <div className="flex justify-end">
                        <Button type="submit" loading={salvando}>
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

      {/* CLASSE-09: a contagem antes da exclusão, na confirmação padrão (AZ-15) */}
      <ConfirmacaoDestrutiva
        aberta={!!excluindo}
        onAbertaChange={(aberta) => !aberta && setExcluindo(null)}
        titulo={`Excluir a classe ${excluindo?.name ?? ""}?`}
        descricao={
          <>
            {textoDaContagem(excluindo?.categories_count ?? 0)}
            {(excluindo?.categories_count ?? 0) > 0 &&
              " Elas passam a seguir a classe da categoria-mãe ou ficam sem classe."}
          </>
        }
        rotuloConfirmar="Excluir classe"
        onConfirmar={confirmarExclusao}
      />
    </>
  )
}
