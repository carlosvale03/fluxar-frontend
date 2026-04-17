import { Category } from "./categories"

export type BudgetStatus = "OK" | "NEAR_LIMIT" | "OVER_LIMIT"

export interface Budget {
    id: string
    category: string
    category_detail: Category
    amount_limit: number
    month: number
    year: number
    total_spent: number
    percentage_used: number
    status: BudgetStatus
    created_at: string
    updated_at: string
}

export interface BudgetInput {
    category: string
    amount_limit: number
    month: number
    year: number
}

export interface BudgetFilters {
    month?: number
    year?: number
    start_month?: number
    start_year?: number
    end_month?: number
    end_year?: number
}

