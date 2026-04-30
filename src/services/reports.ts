import { api } from "./apiClient"
import { 
    DashboardReport, 
    CalendarReport, 
    TransactionReportFilters, 
    SimpleChartsReport, 
    AdvancedChartsReport,
    MonthlyComparisonData,
    TagDistributionReport
} from "@/types/reports"

export const getDashboardSummary = async (month?: number, year?: number, days?: number | string): Promise<DashboardReport> => {
    const response = await api.get<any>("/reports/dashboard/", {
        params: { month, year, days }
    })
    return response.data
}


export const getCalendarReport = async (month: number, year: number): Promise<CalendarReport> => {
    const response = await api.get<any>("/reports/calendar/", {
        params: { month, year }
    })
    const data = response.data

    return {
        ...data,
        days: (data.days || []).map((day: any) => ({
            ...day,
            total_incomes: Number(day.total_incomes || 0),
            total_expenses: Number(day.total_expenses || 0),
            net_amount: Number(day.net_amount || 0)
        })),
        total_income: Number(data.total_income || 0),
        total_expense: Number(data.total_expense || 0)
    }
}

export const getTransactionHistory = async (filters: TransactionReportFilters) => {
    // Correct endpoint for transactions list
    const response = await api.get<any>("/transactions/", {
        params: filters
    })
    
    // Normalize paginated response
    if (response.data && Array.isArray(response.data.results)) {
        return response.data
    }
    
    // If it's a direct array, wrap it to match the expected structure
    if (Array.isArray(response.data)) {
        return {
            results: response.data,
            count: response.data.length,
            next: null,
            previous: null
        }
    }

    return {
        results: [],
        count: 0,
        next: null,
        previous: null
    }
}

export const getSimpleCharts = async (period?: string, month?: number, year?: number): Promise<SimpleChartsReport> => {
    const response = await api.get<any>("/reports/charts/simple/", {
        params: { period, month, year }
    })
    const data = response.data

    return {
        income_vs_expense: data.income_vs_expense || [],
        expense_by_category: (data.expense_by_category || []).map((item: any) => ({
            ...item,
            id: item.category_id || item.id || item.categoryId || item.category || (item.category && item.category.id)
        })),
        income_by_category: (data.income_by_category || []).map((item: any) => ({
            ...item,
            id: item.category_id || item.id || item.categoryId || item.category || (item.category && item.category.id)
        }))
    }
}

export const getAdvancedCharts = async (period?: string): Promise<AdvancedChartsReport> => {
    const response = await api.get<any>("/reports/charts/advanced/", {
        params: { period }
    })
    const data = response.data

    return {
        net_worth_evolution: data.net_worth_evolution || [],
        spending_frequency: data.spending_frequency || [],
        investment_analysis: data.investment_analysis,
        custom_monitoring: data.custom_monitoring,
        next_big_expense: data.next_big_expense,
        financial_freedom_projection: data.financial_freedom_projection || [],
        fixed_vs_variable: data.fixed_vs_variable,
        daily_spending_report: data.daily_spending_report,
        risk_analysis: data.risk_analysis,
        spend_by_weekday: data.spend_by_weekday || [],
        period: data.period
    }
}

export const getMonthlyComparison = async (months: number = 6, month?: number, year?: number): Promise<MonthlyComparisonData[]> => {
    const response = await api.get<any>("/reports/charts/monthly-comparison/", {
        params: { months, month, year }
    })
    return response.data
}

export const getTagDistribution = async (month?: number, year?: number, period?: string): Promise<TagDistributionReport> => {
    const response = await api.get<TagDistributionReport>("/reports/charts/tag-distribution/", {
        params: { month, year, period }
    })
    return response.data
}
