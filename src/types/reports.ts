import { Category } from "./categories"

export interface DashboardReport {
    summary: {
        total_balance: number
        monthly_income: number
        monthly_expense: number
        net_result: number
        total_credit_limit: number
        total_current_invoices: number
        net_worth: number
        savings_rate: number
        total_liquid_balance: number
        total_investment_balance: number
        liquidity_ratio: number
        financial_score: number
    }
    budgets: {
        ok_count: number
        near_limit_count: number
        over_limit_count: number
    }
    credit_cards?: {
        id: string
        name: string
        limit: number
        current_invoice: number
        available_limit: number
        color: string
        institution: string
        due_day: number
    }[]
    goals?: {
        active_count: number
        average_progress: number
    }
}

export interface CalendarDayReport {
    date: string
    total_incomes: number
    total_expenses: number
    net_amount: number
    is_positive: boolean
}

export interface CalendarReport {
    month: number
    year: number
    days: CalendarDayReport[]
    total_income: number
    total_expense: number
}

export interface TransactionReportFilters {
    date_from?: string
    date_to?: string
    account_id?: string
    card_id?: string
    category_id?: string
    tag_id?: string
    type?: string
    page?: number
    page_size?: number
    ordering?: string
}

export interface SimpleChartsReport {
    income_vs_expense: {
        label: string
        income: number
        expense: number
        full_date?: string
    }[]
    expense_by_category: {
        category_name: string
        amount: number
        color: string
        percentage: number
    }[]
    income_by_category: {
        category_name: string
        amount: number
        color: string
        percentage: number
    }[]
}

export interface AdvancedChartsReport {
    net_worth_evolution: {
        date: string
        balance: number
    }[]
    spending_frequency: {
        day_of_week: number
        hour_of_day: number
        count: number
    }[]
    investment_analysis?: {
        has_investments_account: boolean
        total_invested: number
        monthly_history: {
            month: string
            contribution: number
            returns: number
        }[]
        asset_allocation: {
            name: string
            value: number
            color: string
        }[]
    }
    custom_monitoring?: {
        id: string
        name: string
        type: 'category' | 'tag'
        icon?: string
        color?: string
        current_month: number
        average_month: number
        status: 'success' | 'warning' | 'error'
    }[]
    next_big_expense?: {
        description: string
        amount: number
        date: string
        category: string
    } | null
    financial_freedom_projection?: {
        years: number
        label: string
        value: number
    }[]
    fixed_vs_variable?: {
        fixed: number
        variable: number
        total: number
    }
    daily_spending_report?: {
        safe_daily_spend: number
        remaining_days: number
        available_for_month: number
    }
    risk_analysis?: {
        level: 'Baixa' | 'Média' | 'Alta'
        volatility_score: number
        recommendation: string
        sensitive_category: string | null
    }
    spend_by_weekday?: {
        label: string
        amount: number
    }[]
    period?: {
        start_date: string
        end_date: string
        requested_start_date?: string
    }
}

export interface MonthlyComparisonData {
    month: string
    income: number
    expense: number
    balance: number
}
