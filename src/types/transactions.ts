import { Category } from "./categories"
import { Account } from "./accounts"
import { CreditCard, Invoice } from "./cards"

export type TransactionType = "INCOME" | "EXPENSE" | "TRANSFER" | "CREDIT_CARD_EXPENSE" | "RECURRING" | "TRANSFER_OUT" | "TRANSFER_IN" | "CREDIT_CARD" | "INVOICE_PAYMENT"

export enum TransactionStatus {
    PENDING = "PENDING",
    COMPLETED = "COMPLETED",
    CANCELLED = "CANCELLED"
}

export interface Transaction {
    id: string
    description: string
    amount: number
    date: string
    type: TransactionType
    status?: TransactionStatus

    // Foreign Keys (IDs)
    account?: string
    credit_card?: string
    invoice?: string
    category?: string

    // Expanded Details (from Serializer)
    category_detail?: Category
    account_detail?: Account
    credit_card_detail?: CreditCard
    invoice_detail?: Invoice
    
    tags: string[] // List of IDs
    tags_detail?: Tag[] // List of objects
    
    // Installments
    is_installment?: boolean
    installment_number?: number
    installment_total?: number
    
    // Recurrence
    is_recurring?: boolean
    frequency?: "DAILY" | "WEEKLY" | "MONTHLY" | "YEARLY"
    recurring_source?: string // UUID of the recurrence group source


    // Transfer Logic
    transfer_id?: string
    signed_amount?: number // Added for V2 Backend
    related_transaction?: string | { id: string, account_name?: string, type?: TransactionType } | Transaction // ID or object
    account_from?: string
    account_to?: string
    target_account?: string
    source_account?: string

    created_at: string
    updated_at: string
}

export interface CreateTransactionDTO {
    description: string
    amount: number
    date: string
    type: TransactionType
    category_id?: string
    account_id?: string
    card_id?: string
    tags?: string[] // IDs
    // Specific for transfers
    target_account_id?: string
    // Specific for installments
    installments?: number
    // Recurrence
    is_recurring?: boolean
    frequency?: "DAILY" | "WEEKLY" | "MONTHLY" | "YEARLY"
}

export interface Tag {
    id: string
    name: string
    color: string
}
