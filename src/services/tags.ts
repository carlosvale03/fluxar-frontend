import { api } from "./apiClient"
import { Tag, TagInput } from "@/types/categories"

export const getTags = async (): Promise<Tag[]> => {
    // CONTRATO-01: coleção completa, como array; o erro sobe para a tela
    const response = await api.get<Tag[]>("/tags/")
    return response.data
}

export const createTag = async (data: TagInput): Promise<Tag> => {
    const response = await api.post<Tag>("/tags/", data)
    return response.data
}

export const updateTag = async (id: string, data: Partial<TagInput>): Promise<Tag> => {
    const response = await api.put<Tag>(`/tags/${id}/`, data)
    return response.data
}

export const deleteTag = async (id: string): Promise<void> => {
    await api.delete(`/tags/${id}/`)
}

export const getTagInsights = async (tagId: string, months: number = 6): Promise<any> => {
    const response = await api.get(`/reports/charts/tag-insights/`, {
        params: { tag_id: tagId, months }
    })
    return response.data
}

