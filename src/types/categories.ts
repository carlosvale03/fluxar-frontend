export type CategoryType = "INCOME" | "EXPENSE"

// Classes de despesa (CLASSE-02 a CLASSE-09): Essencial e Dispensável são as
// padrão; o usuário cria outras até o total de 5
export interface ExpenseClass {
    id: string
    name: string
    color: string
    is_default: boolean
    // Categorias ativas com essa classe própria (CLASSE-09)
    categories_count: number
}

export interface ExpenseClassInput {
    name: string
    color: string
}

// Classe efetiva de uma categoria de despesa (CLASSE-16, CLASSE-18)
export interface EffectiveClass {
    id: string
    name: string
    color: string
}

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
