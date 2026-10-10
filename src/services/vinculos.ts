import { format } from "date-fns"

import { lerData } from "@/lib/datas"
import { formatarMoeda, paraCentavos } from "@/lib/dinheiro"
import { api } from "@/services/apiClient"
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

// AD-027: só despesas e compras no cartão se vinculam
export function podeTerVinculo(transacao: Pick<Transaction, "type">): boolean {
  return transacao.type === "EXPENSE" || transacao.type === "CREDIT_CARD" || transacao.type === "CREDIT_CARD_EXPENSE"
}

// VINCULO-02 e VINCULO-09: liga a transação à principal, ou troca a principal
export async function vincular(id: string, principal: string): Promise<Transaction> {
  const resposta = await api.post<Transaction>(`/transactions/${id}/link/`, { principal })
  return resposta.data
}

// VINCULO-04 e VINCULO-21: desfaz só o vínculo, mesmo com o recurso travado
export async function desvincular(id: string): Promise<Transaction> {
  const resposta = await api.delete<Transaction>(`/transactions/${id}/link/`)
  return resposta.data
}

export interface BuscaDeGasto {
  descricao?: string
  // AAAA-MM-DD
  data?: string
  // Texto decimal da API ("45.00")
  valor?: string | null
}

// VINCULO-03: a principal é procurada pela descrição, data ou valor entre as
// despesas e compras no cartão do usuário (type=EXPENSE traz as duas). A API
// não filtra por valor: o valor é conferido em centavos nas transações da
// busca. A própria transação fica de fora.
export async function buscarGastos(busca: BuscaDeGasto, excluir: string): Promise<Transaction[]> {
  const params = new URLSearchParams()
  params.append("type", "EXPENSE")
  params.append("page_size", "100")
  const descricao = busca.descricao?.trim()
  if (descricao) params.append("search", descricao)
  if (busca.data) {
    params.append("startDate", busca.data)
    params.append("endDate", busca.data)
  }
  const resposta = await api.get(`/transactions/?${params.toString()}`)
  const resultados: Transaction[] = resposta.data?.results ?? []
  const valor = busca.valor ? paraCentavos(busca.valor) : null
  return resultados.filter(
    (t) => t.id !== excluir && podeTerVinculo(t) && (valor === null || paraCentavos(t.amount) === valor),
  )
}

export function ehPrincipal(transacao: Pick<Transaction, "dependents_count" | "total_cost">): boolean {
  return (transacao.dependents_count ?? 0) > 0 && !!transacao.total_cost
}
