import { Category } from "./categories"

export interface DashboardReport {
    summary: {
        total_balance: string
        monthly_income: string
        monthly_expense: string
        net_result: string
        total_credit_limit: string
        total_current_invoices: string
        net_worth: string
        savings_rate: number
        total_liquid_balance: string
        total_investment_balance: string
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
        limit: string
        current_invoice: string
        available_limit: string
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
    total_incomes: string
    total_expenses: string
    net_amount: string
    is_positive: boolean
}

export interface CalendarReport {
    month: number
    year: number
    days: CalendarDayReport[]
    total_income: string
    total_expense: string
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
        income: string
        expense: string
        full_date?: string
    }[]
    expense_by_category: {
        id?: string
        category_name: string
        amount: string
        color: string
        percentage: number
    }[]
    income_by_category: {
        id?: string
        category_name: string
        amount: string
        color: string
        percentage: number
    }[]
}

export interface AdvancedChartsReport {
    net_worth_evolution: {
        date: string
        balance: string
    }[]
    spending_frequency: {
        day_of_week: number
        hour_of_day: number
        count: number
    }[]
    investment_analysis?: {
        has_investments_account: boolean
        total_invested: string
        monthly_history: {
            month: string
            contribution: string
            returns: string
        }[]
        asset_allocation: {
            name: string
            value: string
            color: string
        }[]
    }
    custom_monitoring?: {
        id: string
        name: string
        type: 'category' | 'tag'
        icon?: string
        color?: string
        current_month: string
        average_month: string
        status: 'success' | 'warning' | 'error'
    }[]
    next_big_expense?: {
        description: string
        amount: string
        date: string
        category: string
    } | null
    financial_freedom_projection?: {
        years: number
        label: string
        value: string
    }[]
    fixed_vs_variable?: {
        fixed: string
        variable: string
        total: string
    }
    daily_spending_report?: {
        safe_daily_spend: string
        remaining_days: number
        available_for_month: string
    }
    risk_analysis?: {
        level: 'Baixa' | 'Média' | 'Alta'
        volatility_score: number
        recommendation: string
        sensitive_category: string | null
    }
    spend_by_weekday?: {
        label: string
        amount: string
    }[]
    period?: {
        start_date: string
        end_date: string
        requested_start_date?: string
    }
}

export interface MonthlyComparisonData {
    month: string
    income: string
    expense: string
    balance: string
}

export interface TagDistributionReport {
    expense_by_tag: {
        id: string
        name: string
        amount: string
        color: string
    }[]
    income_by_tag: {
        id: string
        name: string
        amount: string
        color: string
    }[]
    period: {
        start_date: string
        end_date: string
    }
}

