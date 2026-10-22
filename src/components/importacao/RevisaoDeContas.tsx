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
    return <p className="py-6 text-center text-sm text-muted-foreground">Nenhuma conta encontrada nas abas usadas.</p>
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
            className="space-y-3 rounded-lg border border-border bg-card p-4"
          >
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div className="min-w-0">
                <div className="flex items-center gap-2">
                  <Landmark className="h-4 w-4 shrink-0 text-fg-secondary" aria-hidden="true" />
                  <h3 className="truncate text-sm font-semibold">{nome}</h3>
                </div>
                <p className="mt-1 font-mono text-xs tabular-nums text-muted-foreground">{descricaoDoArquivo(acao.arquivo)}</p>
              </div>
              <div role="group" aria-label={`Ação da conta ${nome}`} className="grid shrink-0 grid-cols-2 gap-1 rounded-md border border-border p-1">
                <button
                  type="button"
                  aria-pressed={acao.acao === "vincular"}
                  disabled={contasAtivas.length === 0}
                  onClick={() => acao.acao !== "vincular" && vincular(nome, acao)}
                  className={cn(
                    "flex h-8 cursor-pointer items-center justify-center gap-1.5 rounded-sm px-3 text-sm font-medium transition-colors duration-fast ease-az-out focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-45",
                    acao.acao === "vincular" ? "bg-elevated text-foreground shadow-[inset_0_-2px_0_var(--az-gold)]" : "text-muted-foreground hover:text-foreground",
                  )}
                >
                  <Link2 className="h-3.5 w-3.5" aria-hidden="true" /> Vincular
                </button>
                <button
                  type="button"
                  aria-pressed={acao.acao === "criar"}
                  disabled={acao.acao !== "criar" && noLimite}
                  onClick={() => acao.acao !== "criar" && criar(nome, acao)}
                  className={cn(
                    "flex h-8 cursor-pointer items-center justify-center gap-1.5 rounded-sm px-3 text-sm font-medium transition-colors duration-fast ease-az-out focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-45",
                    acao.acao === "criar" ? "bg-elevated text-foreground shadow-[inset_0_-2px_0_var(--az-gold)]" : "text-muted-foreground hover:text-foreground",
                  )}
                >
                  <Plus className="h-3.5 w-3.5" aria-hidden="true" /> Criar
                </button>
              </div>
            </div>

            {acao.acao === "vincular" && (
              <div className="space-y-1">
                <Label className="text-xs font-normal text-muted-foreground">Conta no Azimute</Label>
                <Select value={acao.id} onValueChange={(id) => trocarConta(nome, { ...acao, id }, true)}>
                  <SelectTrigger aria-label={`Conta do Azimute para ${nome}`}>
                    <SelectValue placeholder="Escolha a conta" />
                  </SelectTrigger>
                  <SelectContent>
                    {contasAtivas.map((conta) => (
                      <SelectItem key={conta.id} value={conta.id}>
                        {conta.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                {erro("id") && <p className="text-xs text-outflow">{erro("id")}</p>}
              </div>
            )}

            {acao.acao === "criar" && (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="space-y-1">
                  <Label className="text-xs font-normal text-muted-foreground">Nome</Label>
                  <Input
                    aria-label={`Nome da nova conta ${nome}`}
                    value={acao.nome}
                    maxLength={100}
                    onChange={(e) => editar(nome, acao, { nome: e.target.value })}
                  />
                  {erro("nome") && <p className="text-xs text-outflow">{erro("nome")}</p>}
                </div>
                <div className="space-y-1">
                  <Label className="text-xs font-normal text-muted-foreground">Tipo</Label>
                  <Select value={acao.tipo} onValueChange={(tipo) => editar(nome, acao, { tipo: tipo as AccountType })}>
                    <SelectTrigger aria-label={`Tipo da nova conta ${nome}`}>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {Object.values(AccountType).map((tipo) => (
                        <SelectItem key={tipo} value={tipo}>
                          {AccountTypeLabels[tipo]}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  {erro("tipo") && <p className="text-xs text-outflow">{erro("tipo")}</p>}
                </div>
                <div className="space-y-1">
                  <Label className="text-xs font-normal text-muted-foreground">Instituição</Label>
                  <Select
                    value={acao.institution || NENHUMA}
                    onValueChange={(valor) => {
                      const banco = BANKS.find((b) => b.value === valor)
                      editar(nome, acao, { institution: banco ? banco.value : null, color: banco ? banco.color : null })
                    }}
                  >
                    <SelectTrigger aria-label={`Instituição da nova conta ${nome}`}>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value={NENHUMA} className="text-muted-foreground">
                        Nenhuma
                      </SelectItem>
                      {BANKS.map((banco) => (
                        <SelectItem key={banco.value} value={banco.value}>
                          {banco.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  {erro("institution") && <p className="text-xs text-outflow">{erro("institution")}</p>}
                </div>
                <div className="space-y-1">
                  <Label className="text-xs font-normal text-muted-foreground">Saldo atual</Label>
                  <MoneyInput
                    aria-label={`Saldo atual da nova conta ${nome}`}
                    value={acao.saldo_atual}
                    permitirNegativo
                    // Enquanto o texto não é um valor, fica o último valor lido
                    onValueChange={(valor) => valor !== null && editar(nome, acao, { saldo_atual: valor })}
                  />
                  {erro("saldo_atual") && <p className="text-xs text-outflow">{erro("saldo_atual")}</p>}
                </div>
              </div>
            )}
          </section>
        )
      })}
    </div>
  )
}
