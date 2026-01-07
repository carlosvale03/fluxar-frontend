
export interface CreditCard {
    id: string
    name: string
    limit: number
    closing_day: number
    due_day: number
    brand?: string // optional brand (visa, master) if API expands
    institution?: string | null
    color?: string | null
    account_id: string
    created_at: string
    updated_at: string
    // Helper fields often returned by serializers for UI convenience
    current_invoice_total?: number
    available_limit?: number
    next_due_date?: string
    is_active?: boolean
}

export interface CreateCreditCardDTO {
    name: string
    limit: number
    closing_day: number
    due_day: number
    institution?: string
    account_id: string
    color?: string
}

export interface UpdateCreditCardDTO extends Partial<CreateCreditCardDTO> {}

export interface Invoice {
    id: string
    month: number
    year: number
    status: "OPEN" | "CLOSED" | "PAID" | "OVERDUE"
    total_amount: number
    due_date: string
    closing_date: string
}
