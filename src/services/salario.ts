import { api } from "./apiClient"
import type {
  AjustesDaDivisao,
  DivisaoDoSalario,
  ModeloDeDivisao,
  ParteEnviada,
  PlanoDoSalario,
  PlanoEnviado,
  RecebimentoDoSalario,
  ReferenciasDoSalario,
  RevisaoDaDivisao,
  SaidasDaDivisao,
  Simulacao,
} from "@/types/salario"

// Os ajustes e as saídas só vão no corpo quando têm algum item
function opcionais(adjustments?: AjustesDaDivisao, outflows?: SaidasDaDivisao) {
  const corpo: { adjustments?: AjustesDaDivisao; outflows?: SaidasDaDivisao } = {}
  if (adjustments && Object.keys(adjustments).length) corpo.adjustments = adjustments
  if (outflows && Object.keys(outflows).length) corpo.outflows = outflows
  return corpo
}

// Gestão do salário: todas as rotas dependem do recurso `gestao_do_salario`
// (SALARIO-16); o erro sobe para a tela, que chama tratarErro (AD-042).
export const salarioService = {
  // SALARIO-01 e SALARIO-02
  getModelos: async () => {
    const response = await api.get<ModeloDeDivisao[]>("/salary/models/")
    return response.data
  },

  // SALARIO-12 e SALARIO-14
  getPlano: async () => {
    const response = await api.get<PlanoDoSalario>("/salary/plan/")
    return response.data
  },

  // SALARIO-04 a SALARIO-12: substitui as partes na ordem enviada
  salvarPlano: async (plano: PlanoEnviado) => {
    const response = await api.put<PlanoDoSalario>("/salary/plan/", plano)
    return response.data
  },

  // SALARIO-14: grava só as categorias de receita que contam como salário,
  // sem mexer nas partes; devolve o plano como o GET
  salvarCategorias: async (ids: string[]) => {
    const response = await api.put<PlanoDoSalario>("/salary/categories/", { salary_categories: ids })
    return response.data
  },

  // SALARIO-13: sem `parts`, usa o plano salvo; nada é gravado
  simular: async (amount: string, parts?: ParteEnviada[]) => {
    const response = await api.post<Simulacao>("/salary/simulate/", parts ? { amount, parts } : { amount })
    return response.data
  },

  // SALARIO-24
  getPendentes: async () => {
    const response = await api.get<RecebimentoDoSalario[]>("/salary/pending/")
    return response.data
  },

  // SALARIO-29, SALARIO-30 e SALARIO-71: sem `outflows`, nada é descontado,
  // e cada saída vem com a parte sugerida
  revisar: async (receipt: string, adjustments?: AjustesDaDivisao, outflows?: SaidasDaDivisao) => {
    const response = await api.post<RevisaoDaDivisao>("/salary/divisions/preview/", {
      receipt,
      ...opcionais(adjustments, outflows),
    })
    return response.data
  },

  // SALARIO-32 a SALARIO-37: a chave da tentativa vai em todo reenvio (AD-007);
  // SALARIO-68: as saídas escolhidas na revisão; SALARIO-74: o total que a
  // revisão mostrou, para o backend recusar se a divisão mudou desde então
  gerar: async (
    receipt: string,
    idempotencyKey: string,
    adjustments?: AjustesDaDivisao,
    outflows?: SaidasDaDivisao,
    expectedTotal?: string,
  ) => {
    const response = await api.post<DivisaoDoSalario>("/salary/divisions/", {
      receipt,
      idempotency_key: idempotencyKey,
      ...opcionais(adjustments, outflows),
      ...(expectedTotal !== undefined ? { expected_total: expectedTotal } : {}),
    })
    return response.data
  },

  getDivisao: async (id: string) => {
    const response = await api.get<DivisaoDoSalario>(`/salary/divisions/${id}/`)
    return response.data
  },

  // SALARIO-45 e SALARIO-49: as divisões ainda no prazo, mais recentes primeiro
  getDivisoesRecentes: async () => {
    const response = await api.get<DivisaoDoSalario[]>("/salary/divisions/", { params: { undoable: true } })
    return response.data
  },

  // SALARIO-46 a SALARIO-51
  desfazer: async (id: string) => {
    const response = await api.post<DivisaoDoSalario>(`/salary/divisions/${id}/undo/`)
    return response.data
  },

  // SALARIO-52, SALARIO-53 e SALARIO-56
  getReferencias: async () => {
    const response = await api.get<ReferenciasDoSalario>("/salary/references/")
    return response.data
  },
}
