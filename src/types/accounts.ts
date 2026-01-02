
export enum AccountType {
    CHECKING = "CHECKING",
    SAVINGS = "SAVINGS",
    WALLET = "WALLET",
    INVESTMENT = "INVESTMENT"
}

export const AccountTypeLabels: Record<AccountType, string> = {
    [AccountType.CHECKING]: "Conta Corrente",
    [AccountType.SAVINGS]: "Poupança",
    [AccountType.WALLET]: "Carteira",
    [AccountType.INVESTMENT]: "Investimento"
}

export interface Account {
    id: string
    name: string
    type: AccountType
    balance: number
    initial_balance: number
    currency?: string
    is_active: boolean
    institution?: string
    color?: string
    created_at: string
    updated_at: string
}

export interface CreateAccountDTO {
    name: string
    type: AccountType
    initial_balance: number
    institution?: string
    color?: string
    is_active?: boolean
}

export interface UpdateAccountDTO extends Partial<CreateAccountDTO> {
    is_active?: boolean
}
