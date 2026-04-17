import { api } from "./apiClient"
import { Category, CategoryInput } from "@/types/categories"

export const getCategories = async (): Promise<Category[]> => {
    const response = await api.get("/categories/")
        if (Array.isArray(response.data)) {
        return response.data
    }
    if (response.data && Array.isArray(response.data.results)) {
        return response.data.results
    }
            console.warn("Unexpected response format from /categories/", response.data)
    return []
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
