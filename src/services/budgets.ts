import { api } from "./apiClient"
import { Budget, BudgetInput, BudgetFilters } from "@/types/budgets"

export const getBudgets = async (filters?: BudgetFilters): Promise<Budget[]> => {
    const response = await api.get("/budgets/", { params: filters })
    if (Array.isArray(response.data)) {
        return response.data
    }
    if (response.data && Array.isArray(response.data.results)) {
        return response.data.results
    }
    console.warn("Unexpected response format from /budgets/", response.data)
    return []
}

export const getBudgetById = async (id: string): Promise<Budget> => {
    const response = await api.get<Budget>(`/budgets/${id}/`)
    return response.data
}

export const createBudget = async (data: BudgetInput): Promise<Budget> => {
    const response = await api.post<Budget>("/budgets/", data)
    return response.data
}

export const updateBudget = async (id: string, data: Partial<BudgetInput>): Promise<Budget> => {
    const response = await api.put<Budget>(`/budgets/${id}/`, data)
    return response.data
}

export const deleteBudget = async (id: string): Promise<void> => {
    await api.delete(`/budgets/${id}/`)
}

export const bulkImportBudgets = async (source_ids: string[], month: number, year: number): Promise<{ message: string; imported_count?: number; skipped_count?: number }> => {
    const response = await api.post("/budgets/bulk_import/", { source_ids, month, year })
    return response.data
}


