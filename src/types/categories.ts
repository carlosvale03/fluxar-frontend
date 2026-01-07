export type CategoryType = "INCOME" | "EXPENSE"

export interface Category {
    id: string
    name: string
    type: CategoryType
    icon: string
    color: string
    is_active: boolean
    parent_category?: string // ID of parent category if any
}

export interface Tag {
    id: string
    name: string
    color: string
    usage_count?: number
}
