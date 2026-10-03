import { format } from "date-fns"
import { ptBR } from "date-fns/locale"

// FATURA-43: "2026-10-01" vira 01/10 no fuso local. new Date("2026-10-01")
// lê a data como meia-noite UTC e, no Brasil, mostra 30/09.
export function lerData(data: string): Date {
  const [ano, mes, dia] = data.slice(0, 10).split("-").map(Number)
  return new Date(ano, mes - 1, dia)
}

// FATURA-43: nome do mês (1 a 12) sem partir de hoje; setMonth num dia 31
// pulava para o mês seguinte.
export function nomeDoMes(mes: number): string {
  return format(new Date(2000, mes - 1, 1), "MMMM", { locale: ptBR })
}

// CONTRATO-25: data sem hora para a API ("AAAA-MM-DD") pelos componentes
// locais. toISOString() passa para UTC e, à noite no Brasil, já é o dia
// seguinte.
export function paraApi(data: Date): string {
  return format(data, "yyyy-MM-dd")
}

// CONTRATO-25: o dia de hoje no calendário do usuário, para a API
export function hojeNaApi(): string {
  return paraApi(new Date())
}
