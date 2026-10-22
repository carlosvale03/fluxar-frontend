"use client"

import { useState } from "react"
import { format } from "date-fns"
import { CreditCard, Link2, Loader2, Lock, Plus, Search, Unlink } from "lucide-react"
import { toast } from "sonner"

import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { MoneyInput } from "@/components/ui/money-input"
import { MENSAGEM_RECURSO_BLOQUEADO } from "@/components/planos/recurso-bloqueado"
import { lerData } from "@/lib/datas"
import { Valor } from "@/components/ui/valor"
import { tratarErro } from "@/lib/erros"
import { cn } from "@/lib/utils"
import { buscarGastos, desvincular, ehPrincipal, podeTerVinculo, vincular } from "@/services/vinculos"
import type { Transaction } from "@/types/transactions"

export type TipoDoGastoRelacionado = "EXPENSE" | "CREDIT_CARD"

interface AcoesDoVinculoProps {
  transacao: Transaction
  // VINCULO-20: com o recurso travado, lançar e vincular aparecem travados
  liberado: boolean
  onLancarRelacionado: (principal: Transaction, tipo: TipoDoGastoRelacionado) => void
  onVincular: (transacao: Transaction) => void
  // Depois de desfazer, a lista recarrega
  onAlterado: () => void
  className?: string
}

// VINCULO-01 a VINCULO-04: as ações de vínculo de uma transação. Só despesas
// e compras no cartão se vinculam; a dependente não vira principal, e a
// principal não vira dependente (um nível só).
export function AcoesDoVinculo({ transacao, liberado, onLancarRelacionado, onVincular, onAlterado, className }: AcoesDoVinculoProps) {
  const [desfazendo, setDesfazendo] = useState(false)
  if (!podeTerVinculo(transacao)) return null

  const dependente = !!transacao.principal_detail
  const podeSerPrincipal = !dependente
  const podeSerDependente = !ehPrincipal(transacao)

  // VINCULO-04 e VINCULO-21: desfazer funciona mesmo com o recurso travado
  const desfazer = async () => {
    setDesfazendo(true)
    try {
      await desvincular(transacao.id)
      toast.success("Vínculo desfeito.")
      onAlterado()
    } catch (error) {
      tratarErro(error, { mensagemPadrao: "Não foi possível desfazer o vínculo. Tente de novo." })
    } finally {
      setDesfazendo(false)
    }
  }

  const itemTravado = (rotulo: string, Icone: typeof Plus) => (
    <DropdownMenuItem disabled title={MENSAGEM_RECURSO_BLOQUEADO}>
      <Icone className="mr-2 h-4 w-4" /> {rotulo}
      <Lock className="ml-auto h-3.5 w-3.5 text-warn" aria-label="Travado pelo plano" />
    </DropdownMenuItem>
  )

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          variant="ghost"
          size="icon"
          aria-label={`Vínculo de ${transacao.description}`}
          title="Vínculo"
          onClick={(e) => e.stopPropagation()}
          className={cn("h-8 w-8", className)}
        >
          {desfazendo ? <Loader2 className="animate-spin" aria-hidden="true" /> : <Link2 aria-hidden="true" />}
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="min-w-[240px]" onClick={(e) => e.stopPropagation()}>
        <DropdownMenuLabel className="label text-muted-foreground">Gastos relacionados</DropdownMenuLabel>
        <DropdownMenuSeparator />
        {podeSerPrincipal && (liberado ? (
          <>
            <DropdownMenuItem onClick={() => onLancarRelacionado(transacao, "EXPENSE")}>
              <Plus className="mr-2 h-4 w-4" /> Lançar gasto relacionado
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => onLancarRelacionado(transacao, "CREDIT_CARD")}>
              <CreditCard className="mr-2 h-4 w-4" /> Lançar compra relacionada no cartão
            </DropdownMenuItem>
          </>
        ) : itemTravado("Lançar gasto relacionado", Plus))}
        {podeSerDependente && (liberado ? (
          <DropdownMenuItem onClick={() => onVincular(transacao)}>
            <Link2 className="mr-2 h-4 w-4" /> Vincular a um gasto
          </DropdownMenuItem>
        ) : itemTravado("Vincular a um gasto", Link2))}
        {dependente && (
          <DropdownMenuItem
            className="text-outflow focus:text-outflow"
            disabled={desfazendo}
            onClick={desfazer}
          >
            <Unlink className="mr-2 h-4 w-4" /> Desfazer vínculo
          </DropdownMenuItem>
        )}
      </DropdownMenuContent>
    </DropdownMenu>
  )
}

interface VincularTransacaoDialogProps {
  // A transação que vai virar dependente
  transacao: Transaction | null
  onOpenChange: (open: boolean) => void
  onVinculada: () => void
}

// VINCULO-02 e VINCULO-03: procura a principal pela descrição, data ou valor
// entre as despesas e compras no cartão e liga a transação a ela
export function VincularTransacaoDialog({ transacao, onOpenChange, onVinculada }: VincularTransacaoDialogProps) {
  return (
    <Dialog open={!!transacao} onOpenChange={onOpenChange}>
      {/* Cada transação abre a busca do zero */}
      {transacao && <BuscaDoGasto key={transacao.id} transacao={transacao} onOpenChange={onOpenChange} onVinculada={onVinculada} />}
    </Dialog>
  )
}

function BuscaDoGasto({ transacao, onOpenChange, onVinculada }: VincularTransacaoDialogProps & { transacao: Transaction }) {
  const [descricao, setDescricao] = useState("")
  const [data, setData] = useState("")
  const [valor, setValor] = useState("")
  const [resultados, setResultados] = useState<Transaction[] | null>(null)
  const [buscando, setBuscando] = useState(false)
  const [ligando, setLigando] = useState<string | null>(null)

  const buscar = async () => {
    setBuscando(true)
    try {
      setResultados(await buscarGastos({ descricao, data, valor }, transacao.id))
    } catch (error) {
      tratarErro(error, { mensagemPadrao: "Não foi possível buscar os gastos.", tentarDeNovo: buscar })
    } finally {
      setBuscando(false)
    }
  }

  const ligar = async (principal: Transaction) => {
    setLigando(principal.id)
    try {
      await vincular(transacao.id, principal.id)
      toast.success("Gasto vinculado.")
      onVinculada()
      onOpenChange(false)
    } catch (error) {
      // VINCULO-05 a VINCULO-08: a recusa vem no detail, que vai ao Sonner
      tratarErro(error, { mensagemPadrao: "Não foi possível vincular o gasto. Tente de novo." })
    } finally {
      setLigando(null)
    }
  }

  return (
      <DialogContent className="sm:max-w-[560px]">
        <DialogHeader>
          <DialogTitle>Vincular a um gasto</DialogTitle>
          <DialogDescription>
            Escolha o gasto que puxou &ldquo;{transacao.description}&rdquo;.
          </DialogDescription>
        </DialogHeader>

        <form
          role="search"
          className="grid grid-cols-1 sm:grid-cols-3 gap-3"
          onSubmit={(e) => {
            e.preventDefault()
            void buscar()
          }}
        >
          <div className="space-y-1.5 sm:col-span-3">
            <Label htmlFor="busca-descricao">Descrição</Label>
            <Input id="busca-descricao" value={descricao} onChange={(e) => setDescricao(e.target.value)} placeholder="Ex.: Cinema" />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="busca-data">Data</Label>
            <Input id="busca-data" type="date" value={data} onChange={(e) => setData(e.target.value)} />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="busca-valor">Valor</Label>
            <MoneyInput id="busca-valor" value={valor} onValueChange={(v) => setValor(v ?? "")} />
          </div>
          <div className="flex items-end">
            <Button type="submit" loading={buscando} className="w-full">
              <Search aria-hidden="true" />
              Buscar
            </Button>
          </div>
        </form>

        {resultados !== null && (
          resultados.length === 0 ? (
            <p role="status" className="py-6 text-center text-sm text-fg-secondary">Nenhum gasto encontrado. Mude a descrição, a data ou o valor e busque de novo.</p>
          ) : (
            <ul aria-label="Gastos encontrados" className="max-h-[320px] divide-y divide-border overflow-y-auto rounded-md border border-border">
              {resultados.map((gasto) => (
                <li key={gasto.id} className="flex items-center gap-3 px-3 py-2">
                  <div className="flex-1 min-w-0">
                    <p className="truncate text-sm font-medium">{gasto.description}</p>
                    <p className="text-xs text-muted-foreground">
                      {format(lerData(gasto.purchase_date || gasto.date), "dd/MM/yyyy")}
                      {gasto.category_detail ? ` · ${gasto.category_detail.name}` : ""}
                    </p>
                  </div>
                  <Valor valor={gasto.amount} direcao="saida" />
                  <Button
                    size="sm"
                    variant="outline"
                    disabled={ligando !== null}
                    onClick={() => ligar(gasto)}
                    aria-label={`Vincular a ${gasto.description}`}
                  >
                    {ligando === gasto.id ? <Loader2 className="animate-spin" aria-hidden="true" /> : "Vincular"}
                  </Button>
                </li>
              ))}
            </ul>
          )
        )}
      </DialogContent>
  )
}
