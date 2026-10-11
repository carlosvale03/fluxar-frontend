"use client"

import { BadgeCheck, Info, Sheet as SheetIcon } from "lucide-react"

import { Badge } from "@/components/ui/badge"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import type { AbaDoPlano, CampoDeColuna, PapelDaAba, PlanoDeImportacao } from "@/types/importacao"

export const SELO_MOBILLS = "Modelo Mobills reconhecido"

const PAPEIS: { valor: PapelDaAba; rotulo: string }[] = [
  { valor: "RECEITAS_DESPESAS", rotulo: "Receitas e despesas" },
  { valor: "TRANSFERENCIAS", rotulo: "Transferências" },
  { valor: "IGNORAR", rotulo: "Ignorar" },
]

const ROTULOS_DOS_CAMPOS: Record<CampoDeColuna, string> = {
  date_column: "Data",
  description_column: "Descrição",
  amount_column: "Valor",
  income_column: "Entrada",
  expense_column: "Saída",
  account_column: "Conta",
  source_account_column: "Conta de origem",
  dest_account_column: "Conta de destino",
  type_column: "Tipo",
  status_column: "Situação",
  category_column: "Categoria",
  subcategory_column: "Subcategoria",
  tags_column: "Tags",
}

// Campos que cada papel lê (IMPCOMP-04 a IMPCOMP-06, IMPCOMP-18, IMPCOMP-20)
const CAMPOS_DO_PAPEL: Record<Exclude<PapelDaAba, "IGNORAR">, CampoDeColuna[]> = {
  RECEITAS_DESPESAS: [
    "date_column",
    "description_column",
    "amount_column",
    "income_column",
    "expense_column",
    "account_column",
    "type_column",
    "status_column",
    "category_column",
    "subcategory_column",
    "tags_column",
    "dest_account_column",
  ],
  TRANSFERENCIAS: [
    "date_column",
    "amount_column",
    "source_account_column",
    "dest_account_column",
    "description_column",
    "tags_column",
  ],
}

// O Select do Radix não aceita valor vazio
const NENHUMA = "__nenhuma__"

interface RevisaoDeAbasProps {
  plano: PlanoDeImportacao
  onAlterar: (plano: PlanoDeImportacao) => void
}

// IMPCOMP-38 e IMPCOMP-44: o papel e as colunas de cada aba, já preenchidos
// com o plano detectado e com os cabeçalhos reais como opções; mudar pede
// uma nova análise
export function RevisaoDeAbas({ plano, onAlterar }: RevisaoDeAbasProps) {
  const abas = plano.abas ?? []

  const trocarAba = (indice: number, nova: AbaDoPlano) => {
    onAlterar({ ...plano, abas: abas.map((aba, i) => (i === indice ? nova : aba)) })
  }

  const trocarPapel = (indice: number, papel: PapelDaAba) => {
    const aba = abas[indice]
    // Uma aba que estava ignorada sem colunas deixa a detecção preencher
    const semColunas = !aba.colunas || Object.values(aba.colunas).every((coluna) => !coluna)
    trocarAba(indice, { ...aba, papel, colunas: semColunas ? undefined : aba.colunas, motivo: null })
  }

  const trocarColuna = (indice: number, campo: CampoDeColuna, valor: string) => {
    const aba = abas[indice]
    trocarAba(indice, { ...aba, colunas: { ...(aba.colunas ?? {}), [campo]: valor === NENHUMA ? null : valor } })
  }

  return (
    <div className="space-y-3">
      {plano.modelo === "MOBILLS" && (
        <Badge className="rounded-full bg-emerald-500/10 text-emerald-600 border border-emerald-500/20 font-black text-[10px] uppercase tracking-widest gap-1.5">
          <BadgeCheck className="h-3.5 w-3.5" /> {SELO_MOBILLS}
        </Badge>
      )}

      {abas.map((aba, indice) => {
        // Cabeçalho vazio não vira opção (o Select não aceita valor vazio)
        const cabecalho = [...new Set((aba.cabecalho ?? []).filter((coluna) => coluna && coluna.trim()))]
        const campos = aba.papel === "IGNORAR" ? [] : CAMPOS_DO_PAPEL[aba.papel]
        return (
          <section
            key={aba.nome}
            aria-label={`Aba ${aba.nome}`}
            className="p-4 rounded-3xl bg-muted/5 border border-border/40 space-y-3"
          >
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div className="flex items-center gap-2 min-w-0">
                <SheetIcon className="h-4 w-4 text-blue-500 shrink-0" />
                <h4 className="text-sm font-black truncate">{aba.nome}</h4>
              </div>
              <Select value={aba.papel} onValueChange={(valor) => trocarPapel(indice, valor as PapelDaAba)}>
                <SelectTrigger aria-label={`Papel da aba ${aba.nome}`} className="h-10 sm:w-56 rounded-xl border-border/40 font-bold text-xs">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent className="rounded-xl">
                  {PAPEIS.map(({ valor, rotulo }) => (
                    <SelectItem key={valor} value={valor} className="rounded-lg font-bold text-xs">
                      {rotulo}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {aba.papel === "IGNORAR" && aba.motivo && (
              <p className="flex items-center gap-2 text-[11px] font-medium text-muted-foreground">
                <Info className="h-3.5 w-3.5 shrink-0" /> {aba.motivo}
              </p>
            )}

            {campos.length > 0 && (
              <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                {campos.map((campo) => {
                  const rotulo = ROTULOS_DOS_CAMPOS[campo]
                  const atual = aba.colunas?.[campo] || NENHUMA
                  // O cabeçalho do plano pode não estar na lista (plano antigo)
                  const opcoes = atual !== NENHUMA && !cabecalho.includes(atual) ? [...cabecalho, atual] : cabecalho
                  return (
                    <div key={campo} className="space-y-1">
                      <Label className="text-[9px] font-bold uppercase text-muted-foreground/60 pl-1">{rotulo}</Label>
                      <Select value={atual} onValueChange={(valor) => trocarColuna(indice, campo, valor)}>
                        <SelectTrigger aria-label={`${rotulo} da aba ${aba.nome}`} className="h-9 rounded-xl border-border/40 font-bold text-xs">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent className="rounded-xl">
                          <SelectItem value={NENHUMA} className="rounded-lg text-xs text-muted-foreground">
                            Nenhuma
                          </SelectItem>
                          {opcoes.map((coluna) => (
                            <SelectItem key={coluna} value={coluna} className="rounded-lg font-bold text-xs">
                              {coluna}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                  )
                })}
              </div>
            )}
          </section>
        )
      })}
    </div>
  )
}
