"use client"

import { useState } from "react"
import Link from "next/link"
import { CalendarCheck, PiggyBank, Scissors, Wallet } from "lucide-react"

import { Button } from "@/components/ui/button"
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { usePlan } from "@/hooks/use-plan"
import { formatarMoeda } from "@/lib/dinheiro"
import { tratarErro } from "@/lib/erros"
import { salarioService } from "@/services/salario"
import type { Transaction } from "@/types/transactions"

interface SalarioRecebido {
  id: string
  amount: string
}

interface AvisoDoSalarioProps {
  recebimento: SalarioRecebido | null
  onOpenChange: (open: boolean) => void
}

// SALARIO-20: os benefícios de dividir o salário assim que ele cai
const BENEFICIOS = [
  { icone: PiggyBank, texto: "Guardar antes de gastar" },
  { icone: CalendarCheck, texto: "Garantir as contas do mês" },
  { icone: Wallet, texto: "Saber quanto sobra livre para gastar" },
]

// SALARIO-19 a SALARIO-23: o aviso com o valor recebido, os benefícios,
// "Dividir agora" (a revisão desse recebimento) e "Agora não" (fecha; o
// recebimento fica na lista de salários a dividir)
export function AvisoDoSalario({ recebimento, onOpenChange }: AvisoDoSalarioProps) {
  return (
    <Dialog open={recebimento !== null} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[460px] p-8 border-none shadow-2xl rounded-[32px] bg-background">
        <DialogHeader>
          <div className="w-14 h-14 rounded-[20px] flex items-center justify-center bg-emerald-500 text-white shadow-xl shadow-emerald-500/20 mb-2">
            <Scissors className="h-7 w-7" />
          </div>
          <DialogTitle className="text-2xl font-black tracking-tight text-left">Seu salário chegou!</DialogTitle>
          <DialogDescription className="font-medium text-left">
            Você recebeu <span className="font-black text-emerald-600">{recebimento ? formatarMoeda(recebimento.amount) : ""}</span>.
            Que tal dividir agora, antes de começar a gastar?
          </DialogDescription>
        </DialogHeader>

        <ul className="space-y-2" aria-label="Benefícios de dividir o salário">
          {BENEFICIOS.map(({ icone: Icone, texto }) => (
            <li key={texto} className="flex items-center gap-3 p-3 rounded-2xl bg-muted/30 text-sm font-bold">
              <Icone className="h-4 w-4 text-primary shrink-0" />
              {texto}
            </li>
          ))}
        </ul>

        <div className="flex flex-col-reverse sm:flex-row gap-2 pt-2">
          <Button variant="ghost" className="rounded-2xl font-bold text-xs h-11 flex-1" onClick={() => onOpenChange(false)}>
            Agora não
          </Button>
          {recebimento && (
            <Button asChild className="rounded-2xl font-black text-xs h-11 flex-1 shadow-lg shadow-primary/20">
              <Link href={`/salario?dividir=${recebimento.id}`} onClick={() => onOpenChange(false)}>
                Dividir agora
              </Link>
            </Button>
          )}
        </div>
      </DialogContent>
    </Dialog>
  )
}

// O id da categoria da transação, como id ou objeto
function categoriaDa(transacao: Transaction): string | null {
  const categoria = transacao.category as unknown
  if (typeof categoria === "string") return categoria
  if (categoria && typeof categoria === "object" && "id" in categoria) return String((categoria as { id: unknown }).id)
  return transacao.category_detail?.id ?? null
}

// SALARIO-19 e SALARIO-25: depois de lançar ou efetivar uma receita, abre o
// aviso quando ela está efetivada, numa categoria de salário, e o recurso
// está liberado. As categorias de salário vêm do plano, lido só nessa hora.
// Receitas importadas não passam por aqui e não abrem o aviso.
export function useAvisoDoSalario() {
  const { podeUsar } = usePlan()
  const [recebimento, setRecebimento] = useState<SalarioRecebido | null>(null)

  const conferirSalario = async (transacao?: Transaction | null) => {
    if (!transacao || transacao.type !== "INCOME" || transacao.status !== "COMPLETED") return
    if (transacao.import_batch) return
    if (podeUsar("gestao_do_salario") !== true) return
    const categoria = categoriaDa(transacao)
    if (!categoria) return
    try {
      const plano = await salarioService.getPlano()
      if (plano.salary_categories.includes(categoria)) {
        setRecebimento({ id: transacao.id, amount: transacao.amount })
      }
    } catch (erro) {
      tratarErro(erro, { mensagemPadrao: "Não foi possível conferir se a receita é um salário." })
    }
  }

  const avisoDoSalario = (
    <AvisoDoSalario recebimento={recebimento} onOpenChange={(aberto) => !aberto && setRecebimento(null)} />
  )

  return { conferirSalario, avisoDoSalario }
}
