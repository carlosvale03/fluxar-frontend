import { paraCentavos } from "@/lib/dinheiro"
import type { ReferenciaDaParte, ReferenciasDoSalario } from "@/types/salario"

// SALARIO-56: com menos de 3 meses completos, a tela diz quantos entraram na
// média ("Média de 1 mês", "Média de 2 meses")
export function avisoDosMeses(mesesUsados: number): string | null {
  if (mesesUsados >= 3) return null
  if (mesesUsados <= 0) return "Ainda não há um mês completo de histórico."
  return `Média de ${mesesUsados} ${mesesUsados === 1 ? "mês" : "meses"}`
}

// SALARIO-54: a porcentagem do salário médio que a classe da referência
// ocupou no histórico, com uma casa ("62,0%"). Sem salário no histórico ou
// sem a classe, não há porcentagem.
export function porcentagemNoHistorico(
  referencia: ReferenciaDaParte | null | undefined,
  referencias: ReferenciasDoSalario | null | undefined,
): string | null {
  if (!referencia || !referencias) return null
  const salario = paraCentavos(referencias.history.salary_average)
  if (!(salario > 0)) return null
  const classe = referencias.history.by_class.find((c) => c.reference === referencia)
  if (!classe) return null
  // Em décimos de ponto percentual, em inteiros: 186000 * 1000 / 300000 = 620
  const decimos = Math.round((paraCentavos(classe.average) * 1000) / salario)
  return `${Math.floor(decimos / 10)},${decimos % 10}%`
}

// Percentual da API ("33.33") para o campo ("33,33"), sem zeros à direita
export function percentualParaCampo(valor: string): string {
  const centesimos = paraCentavos(valor)
  if (Number.isNaN(centesimos) || centesimos < 0) return ""
  const fracao = String(centesimos % 100).padStart(2, "0").replace(/0+$/, "")
  return fracao ? `${Math.floor(centesimos / 100)},${fracao}` : String(Math.floor(centesimos / 100))
}

// "N transações" com o singular para uma (SALARIO-31)
export function quantidadeDeTransacoes(n: number): string {
  return `${n} ${n === 1 ? "transação" : "transações"}`
}
