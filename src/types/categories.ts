export type CategoryType = "INCOME" | "EXPENSE"

export interface Category {
    id: string
    name: string
    type: CategoryType
    icon: string
    color: string
    is_active: boolean
    is_default: boolean
    parent?: string | null
    parent_name?: string | null
    subcategories?: Category[]
}

export interface CategoryInput {
    name: string
    type: CategoryType
    icon?: string
    color?: string
    is_active?: boolean
    parent?: string | null
}

export interface Tag {
    id: string
    name: string
    color: string
    usage_count?: number
}

export interface TagInput {
    name: string
    color: string
}
