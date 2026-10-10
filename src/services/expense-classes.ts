import { api } from "./apiClient"
import { ExpenseClass, ExpenseClassInput } from "@/types/categories"

// CLASSE-02: a lista vem completa, sem paginação, com as padrão primeiro
export const getExpenseClasses = async (): Promise<ExpenseClass[]> => {
    const response = await api.get<ExpenseClass[]>("/expense-classes/")
    return response.data
}

export const createExpenseClass = async (data: ExpenseClassInput): Promise<ExpenseClass> => {
    const response = await api.post<ExpenseClass>("/expense-classes/", data)
    return response.data
}

// As classes padrão só aceitam a troca de cor (CLASSE-08)
export const updateExpenseClass = async (id: string, data: Partial<ExpenseClassInput>): Promise<ExpenseClass> => {
    const response = await api.patch<ExpenseClass>(`/expense-classes/${id}/`, data)
    return response.data
}

// CLASSE-10: as categorias que usavam a classe passam a seguir a herança
export const deleteExpenseClass = async (id: string): Promise<void> => {
    await api.delete(`/expense-classes/${id}/`)
}
