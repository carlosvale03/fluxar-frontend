"use client"

import { Landmark, Link2, Plus } from "lucide-react"

import { nomeComparavel, tipoSugerido } from "@/components/importacao/plano"
import { AvisoDeLimite } from "@/components/planos/aviso-de-limite"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { MoneyInput } from "@/components/ui/money-input"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { BANKS } from "@/data/banks"
import { usePlan } from "@/hooks/use-plan"
import { formatarMoeda } from "@/lib/dinheiro"
import { cn } from "@/lib/utils"
import { type Account, AccountType, AccountTypeLabels } from "@/types/accounts"
import type { AcaoDaConta, ContaACriar, ContaNoArquivo, PlanoDeImportacao } from "@/types/importacao"

// O Select do Radix não aceita valor vazio
const NENHUMA = "__nenhuma__"

// Campos de uma conta do plano que podem voltar com erro do backend
// (IMPCOMP-24 e IMPCOMP-28)
export const CAMPOS_DA_CONTA = ["id", "nome", "tipo", "saldo_atual", "institution", "color"] as const

// Caminho do erro de um campo da conta, como o tratarErro monta
export function campoDoErroDaConta(nome: string, campo: string): string {
  return `plano.contas.${nome}.${campo}`
}

function dataCurta(iso: string | null): string {
  if (!iso) return ""
  const [ano, mes, dia] = iso.split("-")
  return `${dia}/${mes}/${ano}`
}

function descricaoDoArquivo(arquivo: ContaNoArquivo | undefined): string {
  if (!arquivo) return ""
  const linhas = arquivo.quantidade === 1 ? "1 linha" : `${arquivo.quantidade} linhas`
  const periodo =
    arquivo.primeira_data && arquivo.ultima_data
      ? ` · ${dataCurta(arquivo.primeira_data)} a ${dataCurta(arquivo.ultima_data)}`
      : ""
  return `${linhas} · ${formatarMoeda(arquivo.soma)}${periodo}`
}

interface RevisaoDeContasProps {
  plano: PlanoDeImportacao
  contasAtivas: Account[]
  erros?: Record<string, string>
  onAlterar: (plano: PlanoDeImportacao, opcoes?: { reanalisar?: boolean }) => void
}

// IMPCOMP-39, IMPCOMP-40 e IMPCOMP-44: cada conta do arquivo vinculada a uma
// conta ativa ou criada com nome, tipo, instituição e saldo atual; as contas
// a criar contam no limite do plano
export function RevisaoDeContas({ plano, contasAtivas, erros = {}, onAlterar }: RevisaoDeContasProps) {
  const { limite, limiteAtingido } = usePlan()
  const contas = Object.entries(plano.contas ?? {})

  const aCriar = contas.filter(([, acao]) => acao.acao === "criar").length
  const usoAtual = limite("limite_contas")?.used ?? contasAtivas.length
  const usado = usoAtual + aCriar
  const noLimite = limiteAtingido("limite_contas", usado)

  const trocarConta = (nome: string, nova: AcaoDaConta, reanalisar: boolean) => {
    onAlterar({ ...plano, contas: { ...(plano.contas ?? {}), [nome]: nova } }, { reanalisar })
  }

  const vincular = (nome: string, acao: AcaoDaConta) => {
    const mesmoNome = contasAtivas.find((conta) => nomeComparavel(conta.name) === nomeComparavel(nome))
    const escolhida = mesmoNome ?? contasAtivas[0]
    if (!escolhida) return
    trocarConta(nome, { acao: "vincular", id: escolhida.id, arquivo: acao.arquivo }, true)
  }

  const criar = (nome: string, acao: AcaoDaConta) => {
    // IMPCOMP-40: no limite, nenhuma conta a mais vai para criar
    if (noLimite) return
    trocarConta(
      nome,
      { acao: "criar", nome, tipo: tipoSugerido(nome), saldo_atual: "0.00", institution: null, color: null, arquivo: acao.arquivo },
      true,
    )
  }

  // Nome, tipo, instituição e saldo não mudam a interpretação das linhas
  const editar = (nome: string, acao: ContaACriar, campos: Partial<ContaACriar>) => {
    trocarConta(nome, { ...acao, ...campos }, false)
  }

  if (contas.length === 0) {
    return <p className="text-xs font-medium text-muted-foreground py-6 text-center">Nenhuma conta encontrada nas abas usadas.</p>
  }

  return (
    <div className="space-y-3">
      <AvisoDeLimite chave="limite_contas" rotulo="contas" usado={usado} />

      {contas.map(([nome, acao]) => {
        const erro = (campo: string) => erros[campoDoErroDaConta(nome, campo)]
        return (
          <section
            key={nome}
            aria-label={`Conta ${nome}`}
            className="p-4 rounded-3xl bg-muted/5 border border-border/40 space-y-3"
          >
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div className="min-w-0">
                <div className="flex items-center gap-2">
                  <Landmark className="h-4 w-4 text-primary shrink-0" />
                  <h4 className="text-sm font-black truncate">{nome}</h4>
                </div>
                <p className="text-[10px] font-medium text-muted-foreground mt-1 tabular-nums">{descricaoDoArquivo(acao.arquivo)}</p>
              </div>
              <div role="group" aria-label={`Ação da conta ${nome}`} className="grid grid-cols-2 gap-1 p-1 rounded-2xl bg-muted/20 border border-border/40 shrink-0">
                <button
                  type="button"
                  aria-pressed={acao.acao === "vincular"}
                  disabled={contasAtivas.length === 0}
                  onClick={() => acao.acao !== "vincular" && vincular(nome, acao)}
                  className={cn(
                    "flex items-center justify-center gap-1.5 px-3 h-8 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all disabled:opacity-40 disabled:cursor-not-allowed",
                    acao.acao === "vincular" ? "bg-background shadow-sm text-foreground" : "text-muted-foreground",
                  )}
                >
                  <Link2 className="h-3.5 w-3.5" /> Vincular
                </button>
                <button
                  type="button"
                  aria-pressed={acao.acao === "criar"}
                  disabled={acao.acao !== "criar" && noLimite}
                  onClick={() => acao.acao !== "criar" && criar(nome, acao)}
                  className={cn(
                    "flex items-center justify-center gap-1.5 px-3 h-8 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all disabled:opacity-40 disabled:cursor-not-allowed",
                    acao.acao === "criar" ? "bg-background shadow-sm text-foreground" : "text-muted-foreground",
                  )}
                >
                  <Plus className="h-3.5 w-3.5" /> Criar
                </button>
              </div>
            </div>

            {acao.acao === "vincular" && (
              <div className="space-y-1">
                <Label className="text-[9px] font-bold uppercase text-muted-foreground/60 pl-1">Conta no Fluxar</Label>
                <Select value={acao.id} onValueChange={(id) => trocarConta(nome, { ...acao, id }, true)}>
                  <SelectTrigger aria-label={`Conta do Fluxar para ${nome}`} className="h-10 rounded-xl border-border/40 font-bold text-xs">
                    <SelectValue placeholder="Escolha a conta" />
                  </SelectTrigger>
                  <SelectContent className="rounded-xl">
                    {contasAtivas.map((conta) => (
                      <SelectItem key={conta.id} value={conta.id} className="rounded-lg font-bold text-xs">
                        {conta.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                {erro("id") && <p className="text-[10px] font-bold text-rose-600 pl-1">{erro("id")}</p>}
              </div>
            )}

            {acao.acao === "criar" && (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="space-y-1">
                  <Label className="text-[9px] font-bold uppercase text-muted-foreground/60 pl-1">Nome</Label>
                  <Input
                    aria-label={`Nome da nova conta ${nome}`}
                    value={acao.nome}
                    maxLength={100}
                    onChange={(e) => editar(nome, acao, { nome: e.target.value })}
                    className="h-10 rounded-xl font-bold text-xs"
                  />
                  {erro("nome") && <p className="text-[10px] font-bold text-rose-600 pl-1">{erro("nome")}</p>}
                </div>
                <div className="space-y-1">
                  <Label className="text-[9px] font-bold uppercase text-muted-foreground/60 pl-1">Tipo</Label>
                  <Select value={acao.tipo} onValueChange={(tipo) => editar(nome, acao, { tipo: tipo as AccountType })}>
                    <SelectTrigger aria-label={`Tipo da nova conta ${nome}`} className="h-10 rounded-xl border-border/40 font-bold text-xs">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent className="rounded-xl">
                      {Object.values(AccountType).map((tipo) => (
                        <SelectItem key={tipo} value={tipo} className="rounded-lg font-bold text-xs">
                          {AccountTypeLabels[tipo]}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  {erro("tipo") && <p className="text-[10px] font-bold text-rose-600 pl-1">{erro("tipo")}</p>}
                </div>
                <div className="space-y-1">
                  <Label className="text-[9px] font-bold uppercase text-muted-foreground/60 pl-1">Instituição</Label>
                  <Select
                    value={acao.institution || NENHUMA}
                    onValueChange={(valor) => {
                      const banco = BANKS.find((b) => b.value === valor)
                      editar(nome, acao, { institution: banco ? banco.value : null, color: banco ? banco.color : null })
                    }}
                  >
                    <SelectTrigger aria-label={`Instituição da nova conta ${nome}`} className="h-10 rounded-xl border-border/40 font-bold text-xs">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent className="rounded-xl">
                      <SelectItem value={NENHUMA} className="rounded-lg text-xs text-muted-foreground">
                        Nenhuma
                      </SelectItem>
                      {BANKS.map((banco) => (
                        <SelectItem key={banco.value} value={banco.value} className="rounded-lg font-bold text-xs">
                          {banco.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  {erro("institution") && <p className="text-[10px] font-bold text-rose-600 pl-1">{erro("institution")}</p>}
                </div>
                <div className="space-y-1">
                  <Label className="text-[9px] font-bold uppercase text-muted-foreground/60 pl-1">Saldo atual</Label>
                  <MoneyInput
                    aria-label={`Saldo atual da nova conta ${nome}`}
                    value={acao.saldo_atual}
                    permitirNegativo
                    // Enquanto o texto não é um valor, fica o último valor lido
                    onValueChange={(valor) => valor !== null && editar(nome, acao, { saldo_atual: valor })}
                    className="h-10 rounded-xl font-bold text-xs"
                  />
                  {erro("saldo_atual") && <p className="text-[10px] font-bold text-rose-600 pl-1">{erro("saldo_atual")}</p>}
                </div>
              </div>
            )}
          </section>
        )
      })}
    </div>
  )
}
