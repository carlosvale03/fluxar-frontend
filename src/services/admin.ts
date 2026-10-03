import { api } from "./apiClient"
import { User } from "@/contexts/auth-context"

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

export interface AdminStats {
  total_users: number
  premium_users: number
  recent_users: Array<{
    id: string
    name: string
    email: string
    created_at: string
  }>
  status: string
  db_status: string
  db_latency: string
  api_version: string
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
    const response = await api.get<User>(`/admin/users/${userId}/`)
    return response.data
}

export interface UserFinancialStats {
    total_balance: number
    avg_income_value: number
    avg_expense_value: number
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
