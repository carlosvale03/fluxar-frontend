import { format } from "date-fns"

import { lerData } from "@/lib/datas"
import { formatarMoeda } from "@/lib/dinheiro"
import type { PrincipalDoVinculo, Transaction } from "@/types/transactions"

// Vínculo entre transações (AD-027, AD-054): uma despesa ou compra no cartão
// pode ser dependente de uma principal, num nível só. O vínculo é só
// informação; os valores vêm da API (VINCULO-26).

// VINCULO-24: a principal mostra o valor dela mais o das dependentes
export function textoDoCustoTotal(totalCost: string): string {
  return `Custo total ${formatarMoeda(totalCost)}`
}

export function textoDosDependentes(quantidade: number): string {
  return quantidade === 1 ? "1 gasto relacionado" : `${quantidade} gastos relacionados`
}

// VINCULO-25: a dependente indica a principal, com a descrição e a data
export function textoDaPrincipal(principal: PrincipalDoVinculo): string {
  return `Por causa de: ${principal.description}, ${format(lerData(principal.date), "dd/MM/yyyy")}`
}

// VINCULO-31: a lista filtrada pela principal, com as dependentes dela
export function urlDaPrincipal(id: string): string {
  return `/transacoes?principalId=${encodeURIComponent(id)}`
}

export function ehPrincipal(transacao: Pick<Transaction, "dependents_count" | "total_cost">): boolean {
  return (transacao.dependents_count ?? 0) > 0 && !!transacao.total_cost
}
