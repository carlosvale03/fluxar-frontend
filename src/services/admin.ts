import { api } from "./apiClient"
import { User } from "@/contexts/auth-context"
import type { Plano, TravaDoCatalogo } from "@/types/planos"

// LGPD-19: no painel, o CPF e o telefone chegam mascarados, só com os últimos
// dígitos ("***.***.***-12"), e a data de nascimento e a renda não chegam
export type UsuarioNoPainel = Omit<User, "date_of_birth" | "monthly_income">

// CONTRATO-02: formato único das listas paginadas
export interface PaginatedResponse<T> {
  count: number
  total_pages: number
  current_page: number
  next: string | null
  previous: string | null
  results: T[]
}

export async function getAdminUsers(
  page: number = 1, 
  search: string = "", 
  showArchived: boolean = false,
  role?: string,
  plan?: string
) {
  const response = await api.get<PaginatedResponse<User>>("/admin/users/", {
    params: { 
      page, 
      search,
      show_archived: showArchived ? 'true' : 'false',
      role,
      plan
    }
  })
  return response.data
}

export async function updateAdminUser(userId: string, data: Partial<User> & { admin_password?: string }) {
  const response = await api.patch<User>(`/admin/users/${userId}/`, data)
  return response.data
}

export async function deleteAdminUser(userId: string, admin_password: string) {
  await api.delete(`/admin/users/${userId}/`, {
    data: { admin_password }
  })
}

export async function hardDeleteAdminUser(userId: string, admin_password: string) {
  await api.delete(`/admin/users/${userId}/`, {
    data: { 
        admin_password,
        permanent: true 
    }
  })
}

export async function bulkDeleteAdminUsers(userIds: string[], admin_password: string) {
  await api.delete("/admin/users/", {
    data: { user_ids: userIds, admin_password }
  })
}

// ADMIN-02: saúde medida na hora; o banco vem com erro e sem latência quando cai
export interface SaudeDoSistema {
  api: string
  database: {
    status: "ok" | "error"
    latency_ms: number | null
    version: string | null
  }
}

// ADMIN-05 e ADMIN-07: sem receita; contagem por plano e a porcentagem
// ("42.9", sempre uma casa) de usuários em planos pagos
export interface AdminStats {
  total_users: number
  users_by_plan: Record<Plano, number>
  paid_users_percentage: string
  recent_users: Array<{
    id: string
    name: string
    email: string
    created_at: string
  }>
  health: SaudeDoSistema
  // ADMIN-03: versão do deploy em execução
  version: string
}

export async function getAdminStats() {
  const response = await api.get<AdminStats>("/admin/stats/")
  return response.data
}

// System Logs & Settings
export interface SystemLog {
  id: string
  action: string
  description: string
  admin_name: string
  timestamp: string
  details?: any
}

export async function getSystemLogs(page: number = 1): Promise<PaginatedResponse<SystemLog>> {
  const response = await api.get<PaginatedResponse<SystemLog>>("/admin/logs/", { params: { page } })
  return response.data
}

export async function updateSystemSettings(settings: Record<string, any>) {
    const response = await api.post("/admin/settings/", settings)
    return response.data
}

export async function getSystemSettings(): Promise<Record<string, any>> {
    const response = await api.get<Record<string, any>>("/admin/settings/")
    return response.data
}
// User Details
export async function getAdminUser(userId: string) {
    // O erro sobe para a tela, sem usuário de mentira
    const response = await api.get<UsuarioNoPainel>(`/admin/users/${userId}/`)
    return response.data
}

export interface UserFinancialStats {
    total_balance: string
    avg_income_value: string
    avg_expense_value: string
    income_count_per_day: number
    expense_count_per_day: number
    last_transaction_date: string
}

export async function getUserFinancialStats(userId: string): Promise<UserFinancialStats> {
    const response = await api.get<UserFinancialStats>(`/admin/users/${userId}/financial-stats/`)
    return response.data
}

export async function getUserLogs(userId: string, page: number = 1): Promise<PaginatedResponse<SystemLog>> {
    const response = await api.get<PaginatedResponse<SystemLog>>(`/admin/users/${userId}/logs/`, { params: { page } })
    return response.data
}

export async function resetAdminUserPassword(userId: string, data: { admin_password: string, new_password: string }) {
    const response = await api.post<{ message: string }>(`/admin/users/${userId}/reset-password/`, data)
    return response.data
}

export async function clearAdminUserData(userId: string, adminPassword: string) {
    const response = await api.post<{ message: string }>(`/admin/users/${userId}/clear-data/`, { admin_password: adminPassword })
    return response.data
}

// PERM-10 a PERM-13 e PERM-24: travas dos planos e liberação para testes
export interface ConfiguracaoDosPlanos {
  testing_unlock: boolean
  catalog: TravaDoCatalogo[]
}

export type MudancaDosPlanos =
  | { testing_unlock: boolean }
  | { key: string; plan: Plano; enabled: boolean }
  | { key: string; plan: Plano; limit: number | null }

export async function getAdminPlans() {
  const response = await api.get<ConfiguracaoDosPlanos>("/admin/plans/")
  return response.data
}

// Responde com a configuração inteira, já com a mudança
export async function updateAdminPlans(mudanca: MudancaDosPlanos) {
  const response = await api.patch<ConfiguracaoDosPlanos>("/admin/plans/", mudanca)
  return response.data
}
