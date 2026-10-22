"use client"

import { useState, useEffect } from "react"
import { Tag as TagType } from "@/types/categories"
import { getTags, deleteTag, getTagInsights } from "@/services/tags"
import { usePlan } from "@/hooks/use-plan"
import { RecursoBloqueado } from "@/components/planos/recurso-bloqueado"
import { AvisoDeLimite } from "@/components/planos/aviso-de-limite"
import { Button } from "@/components/ui/button"
import { PlusCircle, Pencil, Trash2, Tag as TagIcon, Search, BarChart3, Info, ChevronLeft, ChevronRight, TrendingUp, TrendingDown, Calendar, Loader2, BookOpen } from "lucide-react"
import { Input } from "@/components/ui/input"
import { TagForm } from "@/components/tags/TagForm"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Badge } from "@/components/ui/badge"
import { CabecalhoDePagina } from "@/components/layout/cabecalho-de-pagina"
import { ConfirmacaoDestrutiva } from "@/components/ui/confirmacao-destrutiva"
import { cn, formatCurrency } from "@/lib/utils"
import { formatarMoedaDoEixo, paraCentavos } from "@/lib/dinheiro"
import {
  COR_DE_ENTRADA,
  COR_DE_SAIDA,
  CURSOR_DO_TOOLTIP,
  PROPS_DA_GRADE,
  PROPS_DO_EIXO,
} from "@/lib/graficos"
import { percentualDaMedia, SEM_HISTORICO } from "@/lib/comparacoes"
import {
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  AreaChart,
  Area
} from "recharts"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"
import { toast } from "sonner"
import { tratarErro } from "@/lib/erros"
import { Skeleton } from "@/components/ui/skeleton"

// Texto expansível dos exemplos de marcadores
function ExpandableText({ text }: { text: string }) {
    const [isExpanded, setIsExpanded] = useState(false);
    const maxLength = 80;
    const shouldTruncate = text.length > maxLength;

    return (
        <div className="space-y-1">
            <p className="text-sm text-fg-secondary">
                {isExpanded ? text : (shouldTruncate ? `${text.slice(0, maxLength)}...` : text)}
            </p>
            {shouldTruncate && (
                <button
                    type="button"
                    aria-expanded={isExpanded}
                    onClick={() => setIsExpanded(!isExpanded)}
                    className="cursor-pointer text-xs font-semibold text-gold-line underline-offset-4 hover:underline"
                >
                    {isExpanded ? "Mostrar menos" : "Mostrar mais"}
                </button>
            )}
        </div>
    );
}

// Exemplos do guia: as cores são sugestões de cor de marcador, como as pré-definidas do formulário
const EXEMPLOS_DE_TAGS = [
    {
        name: "Renda Extra / Freelance",
        desc: "Identifique ganhos além do salário fixo para medir quanto rendem os projetos paralelos.",
        color: "#10b981",
        tag: "Entrada"
    },
    {
        name: "Reembolsável",
        desc: "Para gastos de trabalho ou compras para terceiros que serão devolvidos à sua conta. Ajuda a cobrar e conferir cada devolução.",
        color: "#3b82f6",
        tag: "Mista"
    },
    {
        name: "Renda Passiva / Dividendos",
        desc: "Marque juros, proventos e aluguéis recebidos para acompanhar quanto eles somam mês a mês.",
        color: "#059669",
        tag: "Entrada"
    },
    {
        name: "Assinaturas / SaaS",
        desc: "Identifique pagamentos recorrentes de serviços e softwares para avaliar quais ainda valem a pena manter nos gastos do mês.",
        color: "#a855f7",
        tag: "Recorrente"
    },
    {
        name: "Viagem / Férias",
        desc: "Agrupe todos os custos de um evento sem misturar com as saídas recorrentes, para ver o total depois da viagem.",
        color: "#f97316",
        tag: "Sazonal"
    },
    {
        name: "Emergência / Saúde",
        desc: "Marque gastos inesperados para ver com que frequência eles acontecem e ajustar a sua reserva.",
        color: "#ef4444",
        tag: "Alerta"
    }
]

// Situação do mês contra a média: cor, ícone e texto andam juntos
const SITUACAO_DO_MONITOR = {
    success: { texto: "text-inflow", barra: "bg-inflow", listra: "border-l-inflow", Icone: TrendingDown },
    warning: { texto: "text-warn", barra: "bg-warn", listra: "border-l-warn", Icone: TrendingUp },
    error: { texto: "text-outflow", barra: "bg-outflow", listra: "border-l-outflow", Icone: TrendingUp },
} as const

// PERM-19: com `tags` fechado, a tela mostra o aviso do plano e /tags/ não é chamado
export default function TagsPage() {
  return (
    <RecursoBloqueado chave="tags" titulo="Marcadores" className="container mx-auto my-10 max-w-3xl">
      <TelaDeTags />
    </RecursoBloqueado>
  )
}

function TelaDeTags() {
  // PERM-19: a análise por tag só aparece com analise_por_tag aberto, e
  // /reports/charts/tag-insights/ não é chamado com a trava fechada
  const { podeUsar, limiteAtingido, atualizarUso } = usePlan()
  const analisePorTag = podeUsar("analise_por_tag") === true
  // PERM-20: no limite de tags do plano, a criação fica desabilitada
  const tagsNoLimite = limiteAtingido("limite_tags")
  const [tags, setTags] = useState<TagType[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [isCreateOpen, setIsCreateOpen] = useState(false)
  const [editingTag, setEditingTag] = useState<TagType | undefined>(undefined)
  const [deletingTag, setDeletingTag] = useState<TagType | null>(null)
  const [searchTerm, setSearchTerm] = useState("")
  const [isHelpOpen, setIsHelpOpen] = useState(false)

  // Insights State
  const [selectedInsightsTag, setSelectedInsightsTag] = useState<TagType | null>(null)
  const [isInsightsModalOpen, setIsInsightsModalOpen] = useState(false)
  const [insightsData, setInsightsData] = useState<any>(null)
  const [isLoadingInsights, setIsLoadingInsights] = useState(false)
  const [insightsMonths, setInsightsMonths] = useState(6)

  // Pagination State
  const [currentPage, setCurrentPage] = useState(1)
  const ITEMS_PER_PAGE = 12

  const filteredTags = tags.filter(tag =>
    tag.name.toLowerCase().includes(searchTerm.toLowerCase())
  )

  // Reset page when searching
  useEffect(() => {
    setCurrentPage(1)
  }, [searchTerm])

  // Pagination Logic
  const totalPages = Math.ceil(filteredTags.length / ITEMS_PER_PAGE)
  const paginatedTags = filteredTags.slice((currentPage - 1) * ITEMS_PER_PAGE, currentPage * ITEMS_PER_PAGE)
  const hasMultiplePages = totalPages > 1

  const fetchTags = async () => {
    try {
      setIsLoading(true)
      const data = await getTags()
      setTags(data)
    } catch (error) {
      // CONTRATO-33: a carga que falha pode ser repetida pelo aviso
      tratarErro(error, { mensagemPadrao: "Não foi possível carregar os marcadores.", tentarDeNovo: fetchTags })
    } finally {
      setIsLoading(false)
    }
  }

  useEffect(() => {
    fetchTags()
  }, [])

  const refreshTags = async () => {
      try {
        const data = await getTags()
        setTags(data)
      } catch (error) {
        tratarErro(error, { mensagemPadrao: "Não foi possível carregar os marcadores.", tentarDeNovo: refreshTags })
      }
  }

  // A confirmação padrão fica aberta se a exclusão falhar
  const handleDelete = async () => {
    if (!deletingTag) return

    try {
      await deleteTag(deletingTag.id)
      toast.success("Marcador excluído.")
      // PERM-20: o item excluído sai do uso dos limites do /auth/me
      void atualizarUso()
      refreshTags()
    } catch (error) {
       console.error(error)
       tratarErro(error, { mensagemPadrao: "Não foi possível excluir o marcador. Tente de novo." })
       throw error
    }
  }

  const handleOpenInsights = async (tag: TagType, months: number = 6) => {
    setSelectedInsightsTag(tag)
    setIsInsightsModalOpen(true)
    setIsLoadingInsights(true)
    setInsightsMonths(months)

    try {
      const data = await getTagInsights(tag.id, months)
      setInsightsData(data)
    } catch (error) {
      console.error(error)
      tratarErro(error, { mensagemPadrao: "Não foi possível carregar a análise do marcador. Tente de novo." })
      if (!insightsData) setIsInsightsModalOpen(false)
    } finally {
      setIsLoadingInsights(false)
    }
  }

  const situacao = insightsData
    ? SITUACAO_DO_MONITOR[insightsData.focus_monitor.status as keyof typeof SITUACAO_DO_MONITOR] ?? null
    : null
  // REL-23: média zero não vira porcentagem
  const percentualDoMes = insightsData
    ? percentualDaMedia(insightsData.focus_monitor.current_month, insightsData.focus_monitor.average_month)
    : null

  return (
    <div className="mx-auto w-full max-w-[1240px] space-y-6 px-4 py-8 md:px-6">
      <CabecalhoDePagina
        titulo="Marcadores"
        apoio="Tags"
        className="pb-0"
        acoes={
          <Dialog open={isCreateOpen} onOpenChange={setIsCreateOpen}>
            <DialogTrigger asChild>
              <Button disabled={tagsNoLimite}>
                <PlusCircle aria-hidden="true" />
                Criar marcador
              </Button>
            </DialogTrigger>
            <DialogContent className="overflow-hidden p-0 sm:max-w-[500px]">
              <ScrollArea className="max-h-[85vh]">
                <div className="p-6">
                  <DialogHeader className="mb-6">
                    <DialogTitle>Novo marcador</DialogTitle>
                    <DialogDescription>
                      Crie um marcador para identificar lançamentos de qualquer categoria ou conta.
                    </DialogDescription>
                  </DialogHeader>
                  <TagForm
                    onSuccess={() => {
                      setIsCreateOpen(false)
                      refreshTags()
                    }}
                    onCancel={() => setIsCreateOpen(false)}
                  />
                </div>
              </ScrollArea>
            </DialogContent>
          </Dialog>
        }
      />

      {/* PERM-20: uso e limite de marcadores do plano */}
      <AvisoDeLimite chave="limite_tags" rotulo="marcadores" />

      {/* Busca e guia de exemplos */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="relative w-full sm:max-w-md">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" aria-hidden="true" />
          <Input
            aria-label="Filtrar por nome do marcador"
            placeholder="Ex.: Viagem"
            className="pl-9"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>
        <Button variant="outline" onClick={() => setIsHelpOpen(true)}>
          <BookOpen aria-hidden="true" />
          Exemplos de uso
        </Button>
      </div>

      {/* Explicação permanente do que é um marcador */}
      <div className="flex items-start gap-3 rounded-r-lg border border-border border-l-[3px] border-l-info bg-card p-4">
        <Info className="mt-0.5 h-4 w-4 shrink-0 text-info" aria-hidden="true" />
        <p className="text-sm text-fg-secondary">
          Marcadores identificam lançamentos de qualquer categoria ou conta, como uma viagem, um projeto ou um gasto que
          você quer acompanhar de perto. Um lançamento pode ter vários marcadores.
        </p>
      </div>

      {isLoading ? (
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
          {[1, 2, 3, 4, 5, 6, 7, 8].map((i) => (
            <Skeleton key={i} className="h-[72px] w-full rounded-lg" />
          ))}
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
          {filteredTags.length === 0 && (tags.length > 0 ? (
              <div className="col-span-full flex flex-col items-center justify-center gap-3 rounded-lg border border-dashed border-border-strong bg-card px-4 py-16 text-center">
                  <Search className="h-6 w-6 text-muted-foreground" aria-hidden="true" />
                  <h2 className="display-s text-foreground">Nenhum marcador com este nome</h2>
                  <p className="max-w-xs text-sm text-muted-foreground">
                    Confira a grafia ou limpe a busca para ver todos os marcadores.
                  </p>
                  <Button variant="outline" onClick={() => setSearchTerm("")}>
                    Limpar busca
                  </Button>
              </div>
          ) : (
              <div className="col-span-full flex flex-col items-center justify-center gap-3 rounded-lg border border-dashed border-border-strong bg-card px-4 py-16 text-center">
                  <TagIcon className="h-6 w-6 text-muted-foreground" aria-hidden="true" />
                  <h2 className="display-s text-foreground">Nenhum marcador criado</h2>
                  <p className="max-w-xs text-sm text-muted-foreground">
                    Crie marcadores para ver juntos os lançamentos de uma viagem, um projeto ou um hábito.
                  </p>
                  <Button
                    variant="outline"
                    disabled={tagsNoLimite}
                    onClick={() => setIsCreateOpen(true)}
                  >
                    Criar primeiro marcador
                  </Button>
              </div>
          ))}

          {paginatedTags.map((tag) => (
            <div
                key={tag.id}
                className="group flex items-center gap-3 rounded-lg border border-border bg-card p-4"
            >
                 <span
                    aria-hidden="true"
                    className="flex h-9 w-9 shrink-0 items-center justify-center rounded-md border border-border bg-elevated"
                    style={{ color: tag.color }}
                 >
                    <TagIcon className="h-4 w-4" />
                 </span>

                 <div className="flex min-w-0 flex-1 flex-col justify-center">
                    <span className="truncate text-sm font-semibold text-foreground">{tag.name}</span>
                    <span className="font-mono text-xs uppercase text-muted-foreground">{tag.color}</span>
                 </div>

                 {/* Ações do marcador: visíveis no foco do teclado, não só no hover */}
                 <div className="flex shrink-0 gap-0.5 transition-opacity duration-fast ease-az-out sm:opacity-0 sm:group-hover:opacity-100 sm:group-focus-within:opacity-100">
                    {analisePorTag && (
                    <Button
                        variant="ghost"
                        size="icon"
                        aria-label={`Ver a análise do marcador ${tag.name}`}
                        title="Análise"
                        className="h-8 w-8"
                        onClick={(e) => {
                            e.stopPropagation();
                            handleOpenInsights(tag);
                        }}
                    >
                        <BarChart3 aria-hidden="true" />
                    </Button>
                    )}
                    <Button
                        variant="ghost"
                        size="icon"
                        aria-label={`Editar o marcador ${tag.name}`}
                        title="Editar"
                        className="h-8 w-8"
                        onClick={() => setEditingTag(tag)}
                    >
                        <Pencil aria-hidden="true" />
                    </Button>
                    <Button
                        variant="ghost"
                        size="icon"
                        aria-label={`Excluir o marcador ${tag.name}`}
                        title="Excluir"
                        className="h-8 w-8 text-outflow hover:bg-outflow/10 hover:text-outflow"
                        onClick={() => setDeletingTag(tag)}
                    >
                        <Trash2 aria-hidden="true" />
                    </Button>
                 </div>
            </div>
          ))}
        </div>
      )}

      {/* Paginação */}
      {hasMultiplePages && (
        <nav aria-label="Páginas de marcadores" className="flex flex-col items-center justify-between gap-4 border-t border-border pt-6 sm:flex-row">
            <p className="text-xs text-muted-foreground">
                Mostrando <span className="font-mono tabular-nums text-foreground">{Math.min(filteredTags.length, (currentPage - 1) * ITEMS_PER_PAGE + 1)}</span> a <span className="font-mono tabular-nums text-foreground">{Math.min(filteredTags.length, currentPage * ITEMS_PER_PAGE)}</span> de <span className="font-mono tabular-nums text-foreground">{filteredTags.length}</span> marcadores
            </p>

            <div className="flex items-center gap-1">
                <Button
                    variant="ghost"
                    size="icon"
                    aria-label="Página anterior"
                    onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))}
                    disabled={currentPage === 1}
                >
                    <ChevronLeft aria-hidden="true" />
                </Button>

                {Array.from({ length: totalPages }, (_, i) => i + 1).map((page) => {
                    const isActive = currentPage === page
                    return (
                        <button
                            key={page}
                            type="button"
                            aria-current={isActive ? "page" : undefined}
                            onClick={() => setCurrentPage(page)}
                            className={cn(
                                "h-9 min-w-9 cursor-pointer rounded-md px-2 font-mono text-xs tabular-nums transition-colors duration-fast ease-az-out focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
                                isActive
                                    ? "border border-border-strong bg-elevated text-foreground"
                                    : "text-muted-foreground hover:bg-elevated hover:text-foreground"
                            )}
                        >
                            {page.toString().padStart(2, '0')}
                        </button>
                    )
                })}

                <Button
                    variant="ghost"
                    size="icon"
                    aria-label="Próxima página"
                    onClick={() => setCurrentPage(prev => Math.min(totalPages, prev + 1))}
                    disabled={currentPage === totalPages}
                >
                    <ChevronRight aria-hidden="true" />
                </Button>
            </div>
        </nav>
      )}

      {/* Edição */}
      <Dialog open={!!editingTag} onOpenChange={(open) => !open && setEditingTag(undefined)}>
          <DialogContent className="overflow-hidden p-0 sm:max-w-[500px]">
            <ScrollArea className="max-h-[85vh]">
                <div className="p-6">
                    <DialogHeader className="mb-6">
                        <DialogTitle>Editar marcador</DialogTitle>
                        <DialogDescription>
                            Altere o nome ou a cor do marcador. Os lançamentos marcados com ele mudam junto.
                        </DialogDescription>
                    </DialogHeader>
                    {editingTag && (
                        <TagForm
                            tag={editingTag}
                            onSuccess={() => {
                                setEditingTag(undefined)
                                refreshTags()
                            }}
                            onCancel={() => setEditingTag(undefined)}
                        />
                    )}
                </div>
            </ScrollArea>
          </DialogContent>
      </Dialog>

      {/* Exclusão: confirmação padrão (AZ-15) */}
      <ConfirmacaoDestrutiva
        aberta={!!deletingTag}
        onAbertaChange={(aberta) => !aberta && setDeletingTag(null)}
        titulo={`Excluir o marcador ${deletingTag?.name ?? ""}?`}
        descricao={
          <>
            O marcador <strong className="font-semibold text-foreground">{deletingTag?.name}</strong> sai de todos os
            lançamentos marcados com ele; os lançamentos continuam. Isso não pode ser desfeito.
          </>
        }
        rotuloConfirmar="Excluir marcador"
        onConfirmar={handleDelete}
      />

      {/* Guia com exemplos de uso */}
      <Dialog open={isHelpOpen} onOpenChange={setIsHelpOpen}>
          <DialogContent className="overflow-hidden p-0 sm:max-w-[700px]">
              <ScrollArea className="max-h-[90vh]">
                  <div className="space-y-6 p-6">
                      <DialogHeader>
                          <DialogTitle>Exemplos de marcadores</DialogTitle>
                          <DialogDescription>
                              Sugestões de marcadores para identificar lançamentos e ver esses gastos juntos.
                          </DialogDescription>
                      </DialogHeader>

                      <ul className="grid grid-cols-1 gap-3 md:grid-cols-2">
                          {EXEMPLOS_DE_TAGS.map((example) => (
                              <li key={example.name} className="space-y-2 rounded-lg border border-border bg-card p-4">
                                  <div className="flex items-center gap-2">
                                      <span aria-hidden="true" className="h-2.5 w-2.5 shrink-0 rounded-full" style={{ backgroundColor: example.color }} />
                                      <span className="truncate text-sm font-semibold">{example.name}</span>
                                      <Badge variant="secondary" className="ml-auto">{example.tag}</Badge>
                                  </div>
                                  <ExpandableText text={example.desc} />
                              </li>
                          ))}
                      </ul>

                      <p className="flex items-center gap-2 text-sm text-fg-secondary">
                          <Info className="h-4 w-4 shrink-0 text-info" aria-hidden="true" />
                          Um lançamento pode ter vários marcadores ao mesmo tempo.
                      </p>

                      <div className="flex justify-end">
                          <Button variant="outline" onClick={() => setIsHelpOpen(false)}>
                            Fechar
                          </Button>
                      </div>
                  </div>
              </ScrollArea>
          </DialogContent>
      </Dialog>

      {/* Análise do marcador */}
      <Dialog open={isInsightsModalOpen} onOpenChange={setIsInsightsModalOpen}>
          <DialogContent className="overflow-hidden p-0 sm:max-w-[650px]">
              <ScrollArea className="max-h-[90vh]">
                  <div className="space-y-6 p-6">
                      <DialogHeader>
                          <div className="flex items-center gap-3">
                              {insightsData && !isLoadingInsights && (
                                  <span aria-hidden="true" className="h-3 w-3 shrink-0 rounded-full" style={{ backgroundColor: insightsData.color }} />
                              )}
                              <DialogTitle className="truncate">
                                {isLoadingInsights ? "Carregando..." : insightsData?.tag_name || "Análise do marcador"}
                              </DialogTitle>
                          </div>
                          <DialogDescription className="flex items-center gap-2">
                              <Calendar className="h-4 w-4" aria-hidden="true" />
                              {isLoadingInsights
                                ? "Analisando os lançamentos do marcador."
                                : `Entradas e saídas dos últimos ${insightsMonths} meses.`}
                          </DialogDescription>
                      </DialogHeader>

                      {isLoadingInsights ? (
                          <div className="flex flex-col items-center justify-center gap-3 py-16">
                              <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" aria-hidden="true" />
                              <p className="text-sm text-muted-foreground">Analisando os dados do marcador.</p>
                          </div>
                      ) : insightsData && (
                          <div className="space-y-6">

                              {/* Monitor de foco: o mês contra a média */}
                              <section className="space-y-2">
                                  <h3 className="label text-muted-foreground">Monitor de foco do marcador</h3>
                                  <div className={cn(
                                      "space-y-4 rounded-r-lg border border-border border-l-[3px] bg-card p-4",
                                      situacao?.listra ?? "border-l-border-strong"
                                  )}>
                                      <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-end">
                                          <div className="space-y-1">
                                              <p className="label text-muted-foreground">Gasto líquido do mês</p>
                                              <p className="value-l text-foreground">{formatCurrency(insightsData.focus_monitor.current_month)}</p>
                                          </div>

                                          <div className="flex items-center gap-3">
                                              <div className="text-right">
                                                  <p className="label text-muted-foreground">Média ({insightsMonths} meses)</p>
                                                  <p className="value-m text-fg-secondary">{formatCurrency(insightsData.focus_monitor.average_month)}</p>
                                              </div>
                                              {situacao && <situacao.Icone className={cn("h-5 w-5", situacao.texto)} aria-hidden="true" />}
                                          </div>
                                      </div>

                                      <div className="flex items-center gap-3">
                                          <div className="h-1.5 flex-1 overflow-hidden rounded-full bg-elevated">
                                              <div
                                                  className={cn(
                                                      "h-full w-full origin-left rounded-full transition-transform duration-base ease-az-out",
                                                      situacao?.barra ?? "bg-fg-secondary"
                                                  )}
                                                  style={{ transform: `scaleX(${Math.min(100, percentualDoMes ?? 0) / 100})` }}
                                              />
                                          </div>
                                          <span className={cn("font-mono text-xs tabular-nums", situacao?.texto ?? "text-muted-foreground")}>
                                              {percentualDoMes === null ? SEM_HISTORICO : `${Math.round(percentualDoMes)}%`}
                                          </span>
                                      </div>
                                  </div>
                              </section>

                              {/* Histórico */}
                              <section className="space-y-4 rounded-lg border border-border bg-card p-4">
                                  <div className="flex flex-col items-start justify-between gap-3 sm:flex-row sm:items-center">
                                      <h3 className="label text-muted-foreground">Histórico de movimentação · por mês</h3>
                                      <div className="flex flex-wrap items-center gap-3">
                                          <div className="inline-flex items-center rounded-lg bg-muted p-1" role="group" aria-label="Período da análise">
                                              {[3, 6, 12].map((m) => (
                                                  <button
                                                      key={m}
                                                      type="button"
                                                      aria-pressed={insightsMonths === m}
                                                      aria-label={`${m} meses`}
                                                      onClick={() => selectedInsightsTag && handleOpenInsights(selectedInsightsTag, m)}
                                                      disabled={isLoadingInsights}
                                                      className={cn(
                                                          "cursor-pointer rounded-sm px-3 py-1 font-mono text-xs transition-colors duration-fast ease-az-out focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring disabled:opacity-45",
                                                          insightsMonths === m
                                                              ? "bg-card text-foreground shadow-[inset_0_-2px_0_var(--az-gold)]"
                                                              : "text-muted-foreground hover:text-foreground"
                                                      )}
                                                  >
                                                      {m}m
                                                  </button>
                                              ))}
                                          </div>
                                          <div className="flex items-center gap-3">
                                              <span className="flex items-center gap-1.5">
                                                  <span aria-hidden="true" className="h-2 w-2 rounded-full bg-inflow" />
                                                  <span className="label text-muted-foreground">Entradas</span>
                                              </span>
                                              <span className="flex items-center gap-1.5">
                                                  <span aria-hidden="true" className="h-2 w-2 rounded-full bg-outflow" />
                                                  <span className="label text-muted-foreground">Saídas</span>
                                              </span>
                                          </div>
                                      </div>
                                  </div>

                                  <div
                                      className="h-[240px] w-full"
                                      role="img"
                                      aria-label={`Entradas e saídas do marcador ${insightsData.tag_name ?? ""} por mês, nos últimos ${insightsMonths} meses`}
                                  >
                                      {isInsightsModalOpen && insightsData && (
                                          <ResponsiveContainer width="100%" height="100%">
                                              <AreaChart data={insightsData.history_chart.map((h: { income: string; expense: string }) => ({ ...h, income: paraCentavos(h.income) / 100, expense: paraCentavos(h.expense) / 100 }))} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                                                  <defs>
                                                      <linearGradient id="colorIncome" x1="0" y1="0" x2="0" y2="1">
                                                          <stop offset="5%" stopColor={COR_DE_ENTRADA} stopOpacity={0.15}/>
                                                          <stop offset="95%" stopColor={COR_DE_ENTRADA} stopOpacity={0}/>
                                                      </linearGradient>
                                                      <linearGradient id="colorExpense" x1="0" y1="0" x2="0" y2="1">
                                                          <stop offset="5%" stopColor={COR_DE_SAIDA} stopOpacity={0.15}/>
                                                          <stop offset="95%" stopColor={COR_DE_SAIDA} stopOpacity={0}/>
                                                      </linearGradient>
                                                  </defs>
                                                  <CartesianGrid {...PROPS_DA_GRADE} />
                                                  <XAxis dataKey="month" {...PROPS_DO_EIXO} />
                                                  <YAxis {...PROPS_DO_EIXO} tickFormatter={formatarMoedaDoEixo} />
                                                  <Tooltip
                                                      cursor={CURSOR_DO_TOOLTIP}
                                                      contentStyle={{
                                                          background: "var(--az-elevated)",
                                                          border: "1px solid var(--az-border-strong)",
                                                          borderRadius: "8px",
                                                          fontFamily: "var(--font-plex-mono)",
                                                          fontSize: "12px",
                                                      }}
                                                      labelStyle={{ color: "var(--az-text-secondary)" }}
                                                      formatter={(value: any) => formatCurrency(value)}
                                                  />
                                                  <Area
                                                      type="monotone"
                                                      dataKey="income"
                                                      name="Entradas"
                                                      stroke={COR_DE_ENTRADA}
                                                      strokeWidth={2}
                                                      fillOpacity={1}
                                                      fill="url(#colorIncome)"
                                                  />
                                                  <Area
                                                      type="monotone"
                                                      dataKey="expense"
                                                      name="Saídas"
                                                      stroke={COR_DE_SAIDA}
                                                      strokeWidth={2}
                                                      fillOpacity={1}
                                                      fill="url(#colorExpense)"
                                                  />
                                              </AreaChart>
                                          </ResponsiveContainer>
                                      )}
                                  </div>
                              </section>

                              <div className="flex justify-end">
                                  <Button variant="outline" onClick={() => setIsInsightsModalOpen(false)}>
                                    Fechar análise
                                  </Button>
                              </div>
                          </div>
                      )}
                  </div>
              </ScrollArea>
          </DialogContent>
      </Dialog>
    </div>
  )
}
