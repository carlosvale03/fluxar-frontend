import { api } from "./apiClient"

export interface FocusedMonitorItem {
    id: string
    category?: string
    tag?: string
    category_name?: string
    tag_name?: string
}

export const getFocusedMonitors = async (): Promise<FocusedMonitorItem[]> => {
    const response = await api.get("/focused-monitors/")
    return response.data
}

export const createFocusedMonitor = async (data: { category?: string, tag?: string }): Promise<FocusedMonitorItem> => {
    const response = await api.post("/focused-monitors/", data)
    return response.data
}

export const deleteFocusedMonitor = async (id: string): Promise<void> => {
    await api.delete(`/focused-monitors/${id}/`)
}
