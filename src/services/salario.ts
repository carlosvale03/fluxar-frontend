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
  Simulacao,
} from "@/types/salario"

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

  // SALARIO-29 e SALARIO-30
  revisar: async (receipt: string, adjustments?: AjustesDaDivisao) => {
    const response = await api.post<RevisaoDaDivisao>(
      "/salary/divisions/preview/",
      adjustments && Object.keys(adjustments).length ? { receipt, adjustments } : { receipt },
    )
    return response.data
  },

  // SALARIO-32 a SALARIO-37: a chave da tentativa vai em todo reenvio (AD-007)
  gerar: async (receipt: string, idempotencyKey: string, adjustments?: AjustesDaDivisao) => {
    const corpo: Record<string, unknown> = { receipt, idempotency_key: idempotencyKey }
    if (adjustments && Object.keys(adjustments).length) corpo.adjustments = adjustments
    const response = await api.post<DivisaoDoSalario>("/salary/divisions/", corpo)
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
