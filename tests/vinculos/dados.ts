// Transações com vínculo para os testes, no formato da API (contratos de T2 a T6)

export const LAZER = { id: "cat-lazer", name: "Lazer", type: "EXPENSE", color: "#a855f7", icon: "Film", subcategories: [] }
export const TRANSPORTE = { id: "cat-transp", name: "Transporte", type: "EXPENSE", color: "#3b82f6", icon: "Car", subcategories: [] }

export function resposta<T>(data: T) {
  return Promise.resolve({ data })
}

export function transacao(trocas: Record<string, unknown> = {}) {
  return {
    id: "t-x",
    description: "Padaria",
    amount: "12.00",
    signed_amount: "-12.00",
    date: "2026-09-12",
    type: "EXPENSE",
    status: "COMPLETED",
    account: "conta-1",
    category: "cat-lazer",
    category_detail: LAZER,
    tags: [],
    import_batch: null,
    principal: null,
    principal_detail: null,
    dependents_count: 0,
    total_cost: null,
    created_at: "2026-09-12T12:00:00Z",
    updated_at: "2026-09-12T12:00:00Z",
    ...trocas,
  }
}

// O cinema de R$ 50,00 com o transporte de R$ 45,00 (spec, custo total)
export const CINEMA = transacao({
  id: "t-cinema",
  description: "Cinema",
  amount: "50.00",
  signed_amount: "-50.00",
  dependents_count: 1,
  total_cost: "95.00",
})

export const TRANSPORTE_DO_CINEMA = transacao({
  id: "t-transp",
  description: "Uber até o cinema",
  amount: "45.00",
  signed_amount: "-45.00",
  category: "cat-transp",
  category_detail: TRANSPORTE,
  principal: "t-cinema",
  principal_detail: { id: "t-cinema", description: "Cinema", date: "2026-09-12" },
})

export const PADARIA = transacao({ id: "t-padaria", description: "Padaria" })
