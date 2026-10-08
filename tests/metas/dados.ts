import { Account, AccountType } from "@/types/accounts"
import { Cofrinho, Goal } from "@/types/goals"

// Dados dos testes de metas: valores em texto, como vêm da API (AD-041)

export function meta(trocas: Partial<Goal> = {}): Goal {
  return {
    id: "meta-1",
    name: "Viagem",
    target_amount: "1000.00",
    current_amount: "300.00",
    account: "cofrinho-1",
    is_active: true,
    status: "IN_PROGRESS",
    progress_percentage: 30,
    amount_remaining: "700.00",
    correction: null,
    created_at: "2026-01-01T00:00:00Z",
    updated_at: "2026-01-01T00:00:00Z",
    ...trocas,
  }
}

export function cofrinho(trocas: Partial<Cofrinho> = {}): Cofrinho {
  return {
    account_id: "cofrinho-1",
    name: "Cofrinho Casa",
    balance: "700.00",
    goals_total: "500.00",
    free_balance: "200.00",
    ...trocas,
  }
}

export function conta(trocas: Partial<Account> = {}): Account {
  return {
    id: "conta-1",
    name: "Banco",
    type: AccountType.CHECKING,
    balance: "5000.00",
    initial_balance: "0.00",
    is_active: true,
    created_at: "2026-01-01T00:00:00Z",
    updated_at: "2026-01-01T00:00:00Z",
    ...trocas,
  } as Account
}

// O erro do axios com a resposta da API
export function erroDaApi(status: number, data: unknown) {
  return Object.assign(new Error("Request failed"), { isAxiosError: true, response: { status, data } })
}
