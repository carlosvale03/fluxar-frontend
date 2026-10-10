"use client"

import { useState } from "react"
import { Pencil, RotateCcw, Search, Trash2 } from "lucide-react"

import { nomeComparavel } from "@/components/importacao/plano"
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

const ESTADOS: Record<EstadoDaLinha, { rotulo: string; cor: string }> = {
  VALIDA: { rotulo: "Válida", cor: "bg-emerald-500/10 text-emerald-600 border-emerald-500/20" },
  REJEITADA: { rotulo: "Rejeitada", cor: "bg-rose-500/10 text-rose-600 border-rose-500/20" },
  REPETIDA: { rotulo: "Repetida", cor: "bg-blue-500/10 text-blue-600 border-blue-500/20" },
  EXCLUIDA: { rotulo: "Excluída", cor: "bg-muted text-muted-foreground border-border/60" },
}

const TIPOS: Record<string, string> = { INCOME: "Receita", EXPENSE: "Despesa", TRANSFER: "Transferência" }
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
// backend aceita na correção (dd/mm/aaaa, "45,00", "Despesa", "Pendente")
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
// como null. O valor de uma receita ou despesa vai com o tipo, para o sinal
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
        <div role="group" aria-label="Filtro das linhas" className="flex flex-wrap gap-1 p-1 rounded-2xl bg-muted/20 border border-border/40">
          {FILTROS.map(({ valor, rotulo }) => (
            <button
              key={valor}
              type="button"
              aria-pressed={filtro === valor}
              onClick={() => trocarFiltro(valor)}
              className={cn(
                "px-3 h-8 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all",
                filtro === valor ? "bg-background shadow-sm text-foreground" : "text-muted-foreground hover:text-foreground",
              )}
            >
              {rotulo}
            </button>
          ))}
        </div>
        <div className="relative md:w-64">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
          <Input
            aria-label="Buscar nas linhas"
            placeholder="Buscar descrição, conta, categoria..."
            value={busca}
            onChange={(e) => {
              setBusca(e.target.value)
              setPagina(1)
            }}
            className="h-9 pl-9 rounded-xl text-xs font-medium"
          />
        </div>
      </div>

      <div className="rounded-3xl border border-border/40 overflow-hidden">
        <Table className="text-xs">
          <TableHeader>
            <TableRow className="bg-muted/20 hover:bg-muted/20">
              {["Aba", "Linha", "Data", "Descrição", "Conta", "Tipo", "Categoria", "Valor", "Situação", "Estado", ""].map((titulo, i) => (
                <TableHead key={i} className="h-9 text-[9px] font-black uppercase tracking-widest whitespace-nowrap">
                  {titulo}
                </TableHead>
              ))}
            </TableRow>
          </TableHeader>
          <TableBody>
            {daPagina.length === 0 && (
              <TableRow>
                <TableCell colSpan={11} className="py-8 text-center text-muted-foreground font-medium">
                  Nenhuma linha neste filtro.
                </TableCell>
              </TableRow>
            )}
            {daPagina.map((linha) => {
              const estado = ESTADOS[linha.estado]
              const emEdicao = editando?.chave === linha.chave
              const transferencia = linha.tipo === "TRANSFER" || !!linha.destino
              return [
                <TableRow key={linha.chave} data-testid={`linha-${linha.chave}`} className={cn(linha.estado === "EXCLUIDA" && "opacity-60")}>
                  <TableCell className="whitespace-nowrap font-medium">{linha.aba}</TableCell>
                  <TableCell className="tabular-nums">{linha.numero}</TableCell>
                  <TableCell className="whitespace-nowrap tabular-nums">{dataDaLinha(linha.data)}</TableCell>
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
                  <TableCell className="whitespace-nowrap tabular-nums font-bold text-right">{valorDaLinha(linha)}</TableCell>
                  <TableCell className="whitespace-nowrap">{situacaoDaLinha(linha.situacao)}</TableCell>
                  <TableCell className="min-w-[120px]">
                    <span className={cn("inline-flex px-2 py-0.5 rounded-full border text-[9px] font-black uppercase tracking-widest", estado.cor)}>
                      {estado.rotulo}
                    </span>
                    {linha.motivo && <p className="text-[10px] font-medium text-rose-600 mt-1">{linha.motivo}</p>}
                  </TableCell>
                  <TableCell className="whitespace-nowrap text-right">
                    {linha.estado === "EXCLUIDA" ? (
                      <Button variant="ghost" size="icon" className="h-8 w-8 rounded-xl" aria-label={`Restaurar linha ${linha.chave}`} onClick={() => restaurar(linha.chave)}>
                        <RotateCcw className="h-3.5 w-3.5" />
                      </Button>
                    ) : (
                      <>
                        <Button variant="ghost" size="icon" className="h-8 w-8 rounded-xl" aria-label={`Editar linha ${linha.chave}`} onClick={() => editar(linha)}>
                          <Pencil className="h-3.5 w-3.5" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8 rounded-xl text-rose-600 hover:text-rose-600"
                          aria-label={`Excluir linha ${linha.chave}`}
                          onClick={() => excluir(linha.chave)}
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </Button>
                      </>
                    )}
                  </TableCell>
                </TableRow>,
                emEdicao && editando && (
                  <TableRow key={`${linha.chave}-edicao`} className="bg-muted/10 hover:bg-muted/10">
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
                              <Label className="text-[9px] font-bold uppercase text-muted-foreground/60 pl-1">{rotulo}</Label>
                              <Input
                                aria-label={`${rotulo} da linha`}
                                value={editando.rascunho[campo]}
                                onChange={(e) =>
                                  setEditando({ ...editando, rascunho: { ...editando.rascunho, [campo]: e.target.value } })
                                }
                                className="h-9 rounded-xl text-xs font-bold"
                              />
                            </div>
                          ))}
                        </div>
                        <div className="flex justify-end gap-2">
                          <Button type="button" variant="outline" className="rounded-full h-9 text-[10px] font-black uppercase" onClick={() => setEditando(null)}>
                            Cancelar
                          </Button>
                          <Button type="submit" className="rounded-full h-9 text-[10px] font-black uppercase">
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
