import { api } from "./apiClient"
import { Tag, TagInput } from "@/types/categories"

export const getTags = async (): Promise<Tag[]> => {
    const response = await api.get("/tags/")
    if (Array.isArray(response.data)) {
        return response.data
    }
    if (response.data && Array.isArray(response.data.results)) {
        return response.data.results
    }
    console.warn("Unexpected response format from /tags/", response.data)
    return []
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
