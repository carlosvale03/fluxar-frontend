"use client"

import { useState } from "react"
import { Pencil, RotateCcw, Search, Trash2 } from "lucide-react"

import { nomeComparavel } from "@/components/importacao/plano"
import { Badge, type BadgeProps } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Paginacao } from "@/components/ui/paginacao"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { formatarMoeda } from "@/lib/dinheiro"
import { cn } from "@/lib/utils"
import type { CorrecaoDeLinha, EstadoDaLinha, LinhaAnalisada, PlanoDeImportacao } from "@/types/importacao"

export const LINHAS_POR_PAGINA = 20

type Filtro = "TODAS" | Exclude<EstadoDaLinha, "VALIDA">

const FILTROS: { valor: Filtro; rotulo: string }[] = [
  { valor: "TODAS", rotulo: "Todas" },
  { valor: "REJEITADA", rotulo: "Rejeitadas" },
  { valor: "REPETIDA", rotulo: "Repetidas" },
  { valor: "EXCLUIDA", rotulo: "Excluídas" },
]

// A pílula diz o estado em texto; a cor só reforça (DESIGN.md §5, Pílulas)
const ESTADOS: Record<EstadoDaLinha, { rotulo: string; variante: BadgeProps["variant"] }> = {
  VALIDA: { rotulo: "Válida", variante: "success" },
  REJEITADA: { rotulo: "Rejeitada", variante: "destructive" },
  REPETIDA: { rotulo: "Repetida", variante: "info" },
  EXCLUIDA: { rotulo: "Excluída", variante: "secondary" },
}

// O backend aceita "Entrada" e "Saída" na correção do tipo (além de receita e despesa)
const TIPOS: Record<string, string> = { INCOME: "Entrada", EXPENSE: "Saída", TRANSFER: "Transferência" }
const SITUACOES: Record<string, string> = { COMPLETED: "Efetivada", PENDING: "Pendente" }

const DATA_ISO = /^(\d{4})-(\d{2})-(\d{2})$/
const DECIMAL_DA_API = /^-?\d+\.\d{2}$/

// Linha interpretada: data ISO e valor decimal; a rejeitada traz o texto cru
// da célula, que aparece como veio
function dataDaLinha(data: string | null): string {
  const partes = DATA_ISO.exec(data ?? "")
  return partes ? `${partes[3]}/${partes[2]}/${partes[1]}` : (data ?? "")
}

function valorEhInterpretado(linha: LinhaAnalisada): boolean {
  return linha.estado !== "REJEITADA" && DECIMAL_DA_API.test(linha.valor ?? "")
}

function valorDaLinha(linha: LinhaAnalisada): string {
  if (!linha.valor) return ""
  return valorEhInterpretado(linha) ? formatarMoeda(linha.valor) : linha.valor
}

const tipoDaLinha = (tipo: string | null) => (tipo ? TIPOS[tipo] ?? tipo : "")
const situacaoDaLinha = (situacao: string | null) => (situacao ? SITUACOES[situacao] ?? situacao : "")

type CampoEditavel = "data" | "descricao" | "conta" | "destino" | "tipo" | "categoria" | "valor" | "situacao"

const CAMPOS_EDITAVEIS: { campo: CampoEditavel; rotulo: string }[] = [
  { campo: "data", rotulo: "Data" },
  { campo: "descricao", rotulo: "Descrição" },
  { campo: "conta", rotulo: "Conta" },
  { campo: "destino", rotulo: "Destino" },
  { campo: "tipo", rotulo: "Tipo" },
  { campo: "categoria", rotulo: "Categoria" },
  { campo: "valor", rotulo: "Valor" },
  { campo: "situacao", rotulo: "Situação" },
]

type Rascunho = Record<CampoEditavel, string>

// O que a tela mostra é o ponto de partida da edição, nos formatos que o
// backend aceita na correção (dd/mm/aaaa, "45,00", "Saída", "Pendente")
function rascunhoDaLinha(linha: LinhaAnalisada): Rascunho {
  return {
    data: dataDaLinha(linha.data),
    descricao: linha.descricao ?? "",
    conta: linha.conta ?? "",
    destino: linha.destino ?? "",
    tipo: tipoDaLinha(linha.tipo),
    categoria: linha.categoria ?? "",
    valor: valorEhInterpretado(linha) ? (linha.valor ?? "").replace(".", ",") : (linha.valor ?? ""),
    situacao: situacaoDaLinha(linha.situacao),
  }
}

// IMPCOMP-32: só os campos alterados vão na correção; um campo esvaziado vai
// como null. O valor de uma entrada ou saída vai com o tipo, para o sinal
// do valor corrigido não trocar o tipo da linha.
export function correcaoDoRascunho(linha: LinhaAnalisada, inicial: Rascunho, rascunho: Rascunho): CorrecaoDeLinha {
  const correcao: CorrecaoDeLinha = {}
  for (const { campo } of CAMPOS_EDITAVEIS) {
    const novo = rascunho[campo].trim()
    if (novo !== inicial[campo].trim()) correcao[campo] = novo || null
  }
  if ("valor" in correcao && !("tipo" in correcao) && (linha.tipo === "INCOME" || linha.tipo === "EXPENSE")) {
    correcao.tipo = TIPOS[linha.tipo]
  }
  return correcao
}

function combina(linha: LinhaAnalisada, busca: string): boolean {
  if (!busca) return true
  return [linha.aba, linha.descricao, linha.conta, linha.destino, linha.categoria, linha.subcategoria, linha.motivo, linha.data, String(linha.numero)]
    .some((texto) => nomeComparavel(texto).includes(busca))
}

interface RevisaoDeLinhasProps {
  linhas: LinhaAnalisada[]
  plano: PlanoDeImportacao
  onAlterar: (plano: PlanoDeImportacao) => void
}

// IMPCOMP-41 e IMPCOMP-42: a tabela paginada das linhas com os filtros e a
// busca; corrigir, excluir ou restaurar uma linha vai no plano e pede a nova
// análise, que devolve a linha reanalisada
export function RevisaoDeLinhas({ linhas, plano, onAlterar }: RevisaoDeLinhasProps) {
  const [filtro, setFiltro] = useState<Filtro>("TODAS")
  const [busca, setBusca] = useState("")
  const [pagina, setPagina] = useState(1)
  const [editando, setEditando] = useState<{ chave: string; inicial: Rascunho; rascunho: Rascunho } | null>(null)

  const termo = nomeComparavel(busca)
  const filtradas = linhas.filter((linha) => (filtro === "TODAS" || linha.estado === filtro) && combina(linha, termo))
  const totalDePaginas = Math.max(1, Math.ceil(filtradas.length / LINHAS_POR_PAGINA))
  const paginaAtual = Math.min(pagina, totalDePaginas)
  const daPagina = filtradas.slice((paginaAtual - 1) * LINHAS_POR_PAGINA, paginaAtual * LINHAS_POR_PAGINA)

  const ajustesDoPlano = plano.linhas ?? {}

  const trocarFiltro = (novo: Filtro) => {
    setFiltro(novo)
    setPagina(1)
  }

  const excluir = (chave: string) => {
    onAlterar({ ...plano, linhas: { ...ajustesDoPlano, [chave]: { excluir: true } } })
  }

  // Restaurar tira a chave do plano: a linha volta a ser interpretada como
  // está no arquivo
  const restaurar = (chave: string) => {
    const restantes = { ...ajustesDoPlano }
    delete restantes[chave]
    onAlterar({ ...plano, linhas: restantes })
  }

  const editar = (linha: LinhaAnalisada) => {
    const inicial = rascunhoDaLinha(linha)
    setEditando({ chave: linha.chave, inicial, rascunho: inicial })
  }

  const salvar = (linha: LinhaAnalisada) => {
    if (!editando) return
    const correcao = correcaoDoRascunho(linha, editando.inicial, editando.rascunho)
    setEditando(null)
    if (Object.keys(correcao).length === 0) return
    const anterior = ajustesDoPlano[linha.chave]
    const base = anterior && !("excluir" in anterior) ? anterior : {}
    onAlterar({ ...plano, linhas: { ...ajustesDoPlano, [linha.chave]: { ...base, ...correcao } } })
  }

  return (
    <div className="space-y-3">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-3">
        <div role="group" aria-label="Filtro das linhas" className="flex flex-wrap gap-1 rounded-md border border-border p-1">
          {FILTROS.map(({ valor, rotulo }) => (
            <button
              key={valor}
              type="button"
              aria-pressed={filtro === valor}
              onClick={() => trocarFiltro(valor)}
              className={cn(
                "h-8 cursor-pointer rounded-sm px-3 text-sm font-medium transition-colors duration-fast ease-az-out focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
                filtro === valor
                  ? "bg-elevated text-foreground shadow-[inset_0_-2px_0_var(--az-gold)]"
                  : "text-muted-foreground hover:text-foreground",
              )}
            >
              {rotulo}
            </button>
          ))}
        </div>
        <div className="relative md:w-64">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" aria-hidden="true" />
          <Input
            aria-label="Buscar nas linhas"
            placeholder="Descrição, conta ou categoria"
            value={busca}
            onChange={(e) => {
              setBusca(e.target.value)
              setPagina(1)
            }}
            className="pl-9"
          />
        </div>
      </div>

      <div className="overflow-hidden rounded-lg border border-border">
        <Table>
          <TableHeader>
            <TableRow className="hover:bg-transparent">
              {["Aba", "Linha", "Data", "Descrição", "Conta", "Tipo", "Categoria", "Valor", "Situação", "Estado", ""].map((titulo, i) => (
                <TableHead key={i} className={cn("whitespace-nowrap", titulo === "Valor" && "text-right")}>
                  {titulo}
                </TableHead>
              ))}
            </TableRow>
          </TableHeader>
          <TableBody>
            {daPagina.length === 0 && (
              <TableRow>
                <TableCell colSpan={11} className="py-8 text-center text-muted-foreground">
                  <p>Nenhuma linha neste filtro.</p>
                  {(filtro !== "TODAS" || busca) && (
                    <Button
                      type="button"
                      variant="link"
                      size="sm"
                      onClick={() => {
                        trocarFiltro("TODAS")
                        setBusca("")
                      }}
                    >
                      Limpar filtros
                    </Button>
                  )}
                </TableCell>
              </TableRow>
            )}
            {daPagina.map((linha) => {
              const estado = ESTADOS[linha.estado]
              const emEdicao = editando?.chave === linha.chave
              const transferencia = linha.tipo === "TRANSFER" || !!linha.destino
              return [
                <TableRow key={linha.chave} data-testid={`linha-${linha.chave}`} className={cn(linha.estado === "EXCLUIDA" && "opacity-60")}>
                  <TableCell className="whitespace-nowrap">{linha.aba}</TableCell>
                  <TableCell className="font-mono tabular-nums text-muted-foreground">{linha.numero}</TableCell>
                  <TableCell className="whitespace-nowrap font-mono tabular-nums text-muted-foreground">{dataDaLinha(linha.data)}</TableCell>
                  <TableCell className="max-w-[180px] truncate">{linha.descricao}</TableCell>
                  <TableCell className="whitespace-nowrap">
                    {linha.conta}
                    {linha.destino ? ` → ${linha.destino}` : ""}
                  </TableCell>
                  <TableCell className="whitespace-nowrap">{tipoDaLinha(linha.tipo)}</TableCell>
                  <TableCell className="whitespace-nowrap">
                    {linha.categoria}
                    {linha.subcategoria ? ` / ${linha.subcategoria}` : ""}
                  </TableCell>
                  <TableCell className="value-m whitespace-nowrap text-right">{valorDaLinha(linha)}</TableCell>
                  <TableCell className="whitespace-nowrap">{situacaoDaLinha(linha.situacao)}</TableCell>
                  <TableCell className="min-w-[120px]">
                    <Badge variant={estado.variante}>{estado.rotulo}</Badge>
                    {linha.motivo && <p className="mt-1 text-xs text-outflow">{linha.motivo}</p>}
                  </TableCell>
                  <TableCell className="whitespace-nowrap text-right">
                    {linha.estado === "EXCLUIDA" ? (
                      <Button variant="ghost" size="icon" className="h-8 w-8" aria-label={`Restaurar linha ${linha.chave}`} onClick={() => restaurar(linha.chave)}>
                        <RotateCcw aria-hidden="true" />
                      </Button>
                    ) : (
                      <>
                        <Button variant="ghost" size="icon" className="h-8 w-8" aria-label={`Editar linha ${linha.chave}`} onClick={() => editar(linha)}>
                          <Pencil aria-hidden="true" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8 hover:text-outflow"
                          aria-label={`Excluir linha ${linha.chave}`}
                          onClick={() => excluir(linha.chave)}
                        >
                          <Trash2 aria-hidden="true" />
                        </Button>
                      </>
                    )}
                  </TableCell>
                </TableRow>,
                emEdicao && editando && (
                  <TableRow key={`${linha.chave}-edicao`} className="bg-elevated hover:bg-elevated">
                    <TableCell colSpan={11}>
                      <form
                        aria-label={`Correção da linha ${linha.chave}`}
                        className="space-y-3 py-1"
                        onSubmit={(e) => {
                          e.preventDefault()
                          salvar(linha)
                        }}
                      >
                        <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
                          {CAMPOS_EDITAVEIS.filter(({ campo }) => campo !== "destino" || transferencia).map(({ campo, rotulo }) => (
                            <div key={campo} className="space-y-1">
                              <Label className="text-xs font-normal text-muted-foreground">{rotulo}</Label>
                              <Input
                                aria-label={`${rotulo} da linha`}
                                value={editando.rascunho[campo]}
                                onChange={(e) =>
                                  setEditando({ ...editando, rascunho: { ...editando.rascunho, [campo]: e.target.value } })
                                }
                                className="h-9"
                              />
                            </div>
                          ))}
                        </div>
                        <div className="flex justify-end gap-2">
                          <Button type="button" variant="outline" size="sm" onClick={() => setEditando(null)}>
                            Cancelar
                          </Button>
                          <Button type="submit" size="sm">
                            Salvar correção
                          </Button>
                        </div>
                      </form>
                    </TableCell>
                  </TableRow>
                ),
              ]
            })}
          </TableBody>
        </Table>
        <Paginacao
          pagina={paginaAtual}
          totalDePaginas={totalDePaginas}
          total={filtradas.length}
          rotulo={filtradas.length === 1 ? "linha" : "linhas"}
          onMudarPagina={setPagina}
        />
      </div>
    </div>
  )
}
