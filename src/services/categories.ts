import { api } from "./apiClient"
import { Category, CategoryInput } from "@/types/categories"

export const getCategories = async (): Promise<Category[]> => {
    // CONTRATO-01: coleção completa, como array; o erro sobe para a tela
    const response = await api.get<Category[]>("/categories/")
    return response.data
}

export const createCategory = async (data: CategoryInput): Promise<Category> => {
    const response = await api.post<Category>("/categories/", data)
    return response.data
}

export const updateCategory = async (id: string, data: Partial<CategoryInput>): Promise<Category> => {
    const response = await api.put<Category>(`/categories/${id}/`, data)
    return response.data
}

export const deleteCategory = async (id: string): Promise<void> => {
    await api.delete(`/categories/${id}/`)
}
