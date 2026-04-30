"use client"

import { useState, useEffect } from "react"
import { 
    Dialog, 
    DialogContent, 
    DialogHeader, 
    DialogTitle, 
    DialogDescription,
} from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Switch } from "@/components/ui/switch"
import { Label } from "@/components/ui/label"
import { cn } from "@/lib/utils"
import { 
    Eye, 
    EyeOff, 
    ArrowUp, 
    ArrowDown, 
    GripVertical, 
    RotateCcw,
    LayoutDashboard,
    TrendingUp,
    Wallet,
    Target,
    CreditCard,
    PieChart,
    BarChart3
} from "lucide-react"

export type DashboardModuleId = 
    | "DAILY_CASH_FLOW"
    | "MONTHLY_BALANCE"
    | "BALANCE_EVOLUTION"
    | "BUDGET_SUMMARY"
    | "EXPENSE_DISTRIBUTION"
    | "INCOME_SOURCE"
    | "CREDIT_MANAGEMENT"
    | "GOALS_JOURNEY"
    | "TAG_EXPENSE_DISTRIBUTION"
    | "TAG_INCOME_SOURCE"

export interface DashboardModuleConfig {
    id: DashboardModuleId
    label: string
    visible: boolean
    icon: any
    color: string
}

const COLORS = {
    green: "#10b981",
    blue: "#0ea5e9",
    indigo: "#6366f1",
    purple: "#8b5cf6",
    rose: "#f43f5e",
    amber: "#f59e0b",
}

const DEFAULT_CONFIG: DashboardModuleConfig[] = [
    { id: "DAILY_CASH_FLOW", label: "Fluxo de Caixa Diário", visible: true, icon: TrendingUp, color: COLORS.green },
    { id: "MONTHLY_BALANCE", label: "Balanço Mensal", visible: true, icon: BarChart3, color: COLORS.blue },
    { id: "BALANCE_EVOLUTION", label: "Evolução de Saldo", visible: true, icon: BarChart3, color: COLORS.indigo },
    { id: "BUDGET_SUMMARY", label: "Orçamentos Ativos", visible: true, icon: Wallet, color: COLORS.purple },
    { id: "EXPENSE_DISTRIBUTION", label: "Distribuição de Despesas", visible: true, icon: PieChart, color: COLORS.rose },
    { id: "INCOME_SOURCE", label: "Origem dos Ganhos", visible: true, icon: PieChart, color: COLORS.green },
    { id: "TAG_EXPENSE_DISTRIBUTION", label: "Despesas por Tag", visible: false, icon: PieChart, color: COLORS.rose },
    { id: "TAG_INCOME_SOURCE", label: "Ganhos por Tag", visible: false, icon: PieChart, color: COLORS.green },
    { id: "CREDIT_MANAGEMENT", label: "Gestão de Créditos", visible: true, icon: CreditCard, color: COLORS.amber },
    { id: "GOALS_JOURNEY", label: "Jornada de Metas", visible: true, icon: Target, color: COLORS.purple },
]

interface DashboardCustomizerProps {
    open: boolean
    onOpenChange: (open: boolean) => void
    config: DashboardModuleConfig[]
    onConfigChange: (newConfig: DashboardModuleConfig[]) => void
}

export function DashboardCustomizer({ open, onOpenChange, config, onConfigChange }: DashboardCustomizerProps) {
    const [localConfig, setLocalConfig] = useState<DashboardModuleConfig[]>([])
    const [draggedIndex, setDraggedIndex] = useState<number | null>(null)

    useEffect(() => {
        if (open) {
            setLocalConfig([...config])
        }
    }, [open, config])

    const handleToggle = (id: DashboardModuleId) => {
        setLocalConfig(prev => prev.map(m => 
            m.id === id ? { ...m, visible: !m.visible } : m
        ))
    }

    const moveUp = (index: number) => {
        if (index === 0) return
        const newConfig = [...localConfig]
        const temp = newConfig[index]
        newConfig[index] = newConfig[index - 1]
        newConfig[index - 1] = temp
        setLocalConfig(newConfig)
    }

    const moveDown = (index: number) => {
        if (index === localConfig.length - 1) return
        const newConfig = [...localConfig]
        const temp = newConfig[index]
        newConfig[index] = newConfig[index + 1]
        newConfig[index + 1] = temp
        setLocalConfig(newConfig)
    }

    // Drag and Drop Logic
    const onDragStart = (e: React.DragEvent, index: number) => {
        setDraggedIndex(index)
        e.dataTransfer.effectAllowed = "move"
        
        // Add a slight delay to the visual change so it doesn't look weird when starting to drag
        setTimeout(() => {
            const target = e.target as HTMLElement
            if (target && target.classList) {
                target.classList.add("opacity-50")
            }
        }, 0)
    }

    const onDragOver = (e: React.DragEvent, index: number) => {
        e.preventDefault()
        if (draggedIndex === null || draggedIndex === index) return

        const newConfig = [...localConfig]
        const draggedItem = newConfig[draggedIndex]
        newConfig.splice(draggedIndex, 1)
        newConfig.splice(index, 0, draggedItem)
        setLocalConfig(newConfig)
        setDraggedIndex(index)
    }

    const onDragEnd = (e: React.DragEvent) => {
        setDraggedIndex(null)
        const target = e.target as HTMLElement
        if (target && target.classList) {
            target.classList.remove("opacity-50")
        }
    }

    const handleReset = () => {
        setLocalConfig([...DEFAULT_CONFIG])
    }

    const handleSave = () => {
        onConfigChange(localConfig)
        onOpenChange(false)
    }

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="w-[95vw] sm:w-full sm:max-w-[500px] rounded-[24px] sm:rounded-[32px] border-border/40 bg-card/95 backdrop-blur-2xl p-0 overflow-hidden shadow-2xl mx-auto">
                <div className="p-6 sm:p-8 pb-4">
                    <DialogHeader>
                        <div className="flex items-center gap-3 mb-2">
                            <div className="w-10 h-10 sm:w-12 sm:h-12 rounded-xl sm:rounded-2xl bg-primary/10 flex items-center justify-center text-primary shadow-inner shrink-0">
                                <LayoutDashboard className="h-5 w-5 sm:h-6 sm:h-6" />
                            </div>
                            <div className="min-w-0">
                                <DialogTitle className="text-xl sm:text-2xl font-black tracking-tight truncate">Personalizar Painel</DialogTitle>
                                <DialogDescription className="text-[10px] sm:text-xs font-bold text-muted-foreground uppercase tracking-widest mt-0.5">Organize sua visualização</DialogDescription>
                            </div>
                        </div>
                    </DialogHeader>
                </div>

                <div className="px-4 sm:px-8 pb-6 sm:pb-8 space-y-3 max-h-[60vh] sm:max-h-[450px] overflow-y-auto custom-scrollbar">
                    {localConfig.map((module, index) => {
                        const Icon = module.icon
                        const isBeingDragged = draggedIndex === index
                        
                        return (
                            <div 
                                key={module.id} 
                                draggable
                                onDragStart={(e) => onDragStart(e, index)}
                                onDragOver={(e) => onDragOver(e, index)}
                                onDragEnd={onDragEnd}
                                className={cn(
                                    "flex items-center justify-between p-4 rounded-3xl bg-background/40 border border-border/10 group transition-all duration-300 hover:border-primary/20 hover:bg-background/60 cursor-move relative",
                                    isBeingDragged && "border-primary/50 shadow-2xl scale-[1.02] z-10 bg-background/80"
                                )}
                            >
                                <div className="flex items-center gap-2 sm:gap-4 min-w-0">
                                    <div className="flex items-center gap-2 sm:gap-3 min-w-0">
                                        <div className="text-muted-foreground/30 group-hover:text-primary/50 transition-colors shrink-0">
                                            <GripVertical className="h-4 w-4 sm:h-5 sm:w-5" />
                                        </div>
                                        <div 
                                            className="w-8 h-8 sm:w-10 sm:h-10 rounded-lg sm:rounded-xl flex items-center justify-center transition-all duration-500 shadow-sm shrink-0"
                                            style={{ 
                                                backgroundColor: `${module.color}15`,
                                                color: module.color
                                            }}
                                        >
                                            <Icon className="h-4 w-4 sm:h-5 sm:w-5" />
                                        </div>
                                        <div className="min-w-0">
                                            <p className="text-xs sm:text-sm font-black transition-colors truncate">{module.label}</p>
                                            <p className="text-[9px] sm:text-[10px] font-bold text-muted-foreground/50 uppercase tracking-widest">Módulo</p>
                                        </div>
                                    </div>
                                </div>
                                <div className="flex items-center gap-2 sm:gap-4 shrink-0">
                                    <div className="flex items-center gap-0.5 sm:gap-1 lg:opacity-0 lg:group-hover:opacity-100 transition-opacity">
                                        <Button 
                                            variant="ghost" 
                                            size="icon" 
                                            className="h-7 w-7 sm:h-8 sm:w-8 rounded-lg hover:text-primary hover:bg-primary/10"
                                            onClick={(e) => {
                                                e.stopPropagation()
                                                moveUp(index)
                                            }}
                                            disabled={index === 0}
                                        >
                                            <ArrowUp className="h-3 w-3 sm:h-4 sm:w-4" />
                                        </Button>
                                        <Button 
                                            variant="ghost" 
                                            size="icon" 
                                            className="h-7 w-7 sm:h-8 sm:w-8 rounded-lg hover:text-primary hover:bg-primary/10"
                                            onClick={(e) => {
                                                e.stopPropagation()
                                                moveDown(index)
                                            }}
                                            disabled={index === localConfig.length - 1}
                                        >
                                            <ArrowDown className="h-3 w-3 sm:h-4 sm:w-4" />
                                        </Button>
                                    </div>
                                    <div className="flex items-center gap-2 sm:gap-3 border-l border-border/10 pl-2 sm:pl-4 ml-1 sm:ml-2">
                                        <Switch 
                                            id={`visible-${module.id}`}
                                            checked={module.visible}
                                            onCheckedChange={() => handleToggle(module.id)}
                                            className="data-[state=checked]:bg-primary scale-75 sm:scale-100"
                                        />
                                    </div>
                                </div>
                            </div>
                        )
                    })}
                </div>

                <div className="p-6 sm:p-8 pt-4 bg-muted/20 border-t border-border/10 flex flex-col sm:flex-row items-center justify-between gap-4">
                    <Button 
                        variant="ghost" 
                        onClick={handleReset}
                        className="rounded-2xl font-black text-[10px] sm:text-xs uppercase tracking-widest opacity-60 hover:opacity-100 h-10"
                    >
                        <RotateCcw className="mr-2 h-3 w-3 sm:h-4 sm:w-4" /> Resetar
                    </Button>
                    <div className="flex flex-col sm:flex-row items-center gap-3 w-full sm:w-auto">
                        <Button 
                            variant="outline" 
                            onClick={() => onOpenChange(false)}
                            className="w-full sm:w-auto rounded-2xl border-border/40 font-black text-[10px] sm:text-xs uppercase tracking-widest h-11 sm:h-12 px-6"
                        >
                            Cancelar
                        </Button>
                        <Button 
                            onClick={handleSave}
                            className="w-full sm:w-auto rounded-2xl bg-primary hover:bg-primary/90 font-black text-[10px] sm:text-xs uppercase tracking-widest h-11 sm:h-12 px-8 shadow-lg shadow-primary/20"
                        >
                            Salvar Layout
                        </Button>
                    </div>
                </div>
            </DialogContent>
        </Dialog>
    )
}

export const getInitialConfig = (): DashboardModuleConfig[] => {
    if (typeof window === "undefined") return DEFAULT_CONFIG
    
    const saved = localStorage.getItem("dashboard_layout_config")
    if (!saved) return DEFAULT_CONFIG

    try {
        const parsed = JSON.parse(saved)
        // Merge with DEFAULT_CONFIG in case new modules were added or attributes changed
        return DEFAULT_CONFIG.map(def => {
            const found = parsed.find((p: any) => p.id === def.id)
            return found ? { ...def, visible: found.visible, ...found, icon: def.icon, color: def.color } : def
        }).sort((a, b) => {
            const indexA = parsed.findIndex((p: any) => p.id === a.id)
            const indexB = parsed.findIndex((p: any) => p.id === b.id)
            if (indexA === -1 && indexB === -1) return 0
            if (indexA === -1) return 1
            if (indexB === -1) return -1
            return indexA - indexB
        })
    } catch (e) {
        return DEFAULT_CONFIG
    }
}
