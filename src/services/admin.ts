import { api } from "./apiClient"
import { User } from "@/contexts/auth-context"

export interface PaginatedResponse<T> {
  count: number
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

export async function getSystemLogs(): Promise<SystemLog[]> {
  // Mock implementation until backend endpoint exists
  // In a real scenario: await api.get<SystemLog[]>("/admin/logs/")
  return [
      { id: '1', action: 'UPDATE_USER', description: 'Alteração de permissão', admin_name: 'Admin Carlos', timestamp: new Date(Date.now() - 1000 * 60 * 5).toISOString() },
      { id: '2', action: 'SYSTEM_MAINTENANCE', description: 'Modo de manutenção ativado', admin_name: 'Admin System', timestamp: new Date(Date.now() - 1000 * 60 * 120).toISOString() },
      { id: '3', action: 'DELETE_USER', description: 'Remoção de usuário inativo', admin_name: 'Admin Carlos', timestamp: new Date(Date.now() - 1000 * 60 * 60 * 24).toISOString() },
      { id: '4', action: 'UPDATE_SETTINGS', description: 'Atualização de cache global', admin_name: 'Admin System', timestamp: new Date(Date.now() - 1000 * 60 * 60 * 48).toISOString() },
      { id: '5', action: 'API_KEY_ROTATE', description: 'Rotação de chaves de API', admin_name: 'Super Admin', timestamp: new Date(Date.now() - 1000 * 60 * 60 * 72).toISOString() }
  ]
}

export async function updateSystemSettings(settings: { maintenance_mode: boolean }) {
    // Mock implementation
    // await api.post("/admin/settings/", settings)
    return new Promise(resolve => setTimeout(resolve, 800))
}
// User Details
export async function getAdminUser(userId: string) {
    // Assuming standard REST endpoint
    // If it doesn't exist, we might need to fallback to filtered list, but let's try direct first or mock if 404
    try {
        const response = await api.get<User>(`/admin/users/${userId}/`)
        return response.data
    } catch (error) {
        console.warn("API de detalhes de usuário não encontrada, usando mock de fallback.")
        // Mock fallback for development if backend isn't ready
        return {
            id: userId,
            name: "Usuário Mock",
            email: "mock@fluxar.com",
            role: "USER",
            is_active: true,
            plan: "PREMIUM",
            created_at: new Date().toISOString(),
            avatar_url: null,
            emailVerified: true
        } as User
    }
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

export async function getUserLogs(userId: string): Promise<SystemLog[]> {
    // Mock logs specific to user
    return [
        { id: '101', action: 'LOGIN', description: 'Login realizado com sucesso', admin_name: 'System', timestamp: new Date(Date.now() - 1000 * 60 * 30).toISOString() },
        { id: '102', action: 'UPDATE_PROFILE', description: 'Atualizou foto de perfil', admin_name: 'Usuário', timestamp: new Date(Date.now() - 1000 * 60 * 60 * 24).toISOString() },
        { id: '103', action: 'FAILED_LOGIN', description: 'Tentativa de login falhou (senha incorreta)', admin_name: 'System', timestamp: new Date(Date.now() - 1000 * 60 * 60 * 48).toISOString() },
        { id: '104', action: 'PLAN_UPGRADE', description: 'Upgrade para plano Premium', admin_name: 'System', timestamp: new Date(Date.now() - 1000 * 60 * 60 * 24 * 5).toISOString() }
    ]
}
