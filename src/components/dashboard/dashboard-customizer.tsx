"use client"

import { useState, useEffect, useRef } from "react"
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
    ArrowUp, 
    ArrowDown, 
    GripVertical, 
    RotateCcw,
    TrendingUp,
    Wallet,
    Target,
    CreditCard,
    PieChart,
    BarChart3,
    type LucideIcon,
} from "lucide-react"

export type DashboardModuleId = 
    | "DAILY_CASH_FLOW"
    | "MONTHLY_BALANCE"
    | "BALANCE_EVOLUTION"
    | "BUDGET_SUMMARY"
    | "EXPENSE_DISTRIBUTION"
    | "CLASS_DISTRIBUTION"
    | "INCOME_SOURCE"
    | "CREDIT_MANAGEMENT"
    | "GOALS_JOURNEY"
    | "TAG_EXPENSE_DISTRIBUTION"
    | "TAG_INCOME_SOURCE"

export interface DashboardModuleConfig {
    id: DashboardModuleId
    label: string
    visible: boolean
    icon: LucideIcon
    color: string
}

// Cores das séries do tema (DESIGN.md §3.4); o campo fica para o layout salvo
const COLORS = {
    green: "var(--az-inflow)",
    blue: "var(--az-serie-2)",
    indigo: "var(--az-serie-5)",
    purple: "var(--az-serie-3)",
    rose: "var(--az-serie-4)",
    amber: "var(--az-serie-1)",
}

// Exportado para o dashboard usar o layout padrão com personalizar_dashboard fechado (PERM-19)
export const DEFAULT_CONFIG: DashboardModuleConfig[] = [
    { id: "DAILY_CASH_FLOW", label: "Fluxo de Caixa Diário", visible: true, icon: TrendingUp, color: COLORS.green },
    { id: "MONTHLY_BALANCE", label: "Balanço Mensal", visible: true, icon: BarChart3, color: COLORS.blue },
    { id: "BALANCE_EVOLUTION", label: "Evolução de Saldo", visible: true, icon: BarChart3, color: COLORS.indigo },
    { id: "BUDGET_SUMMARY", label: "Orçamentos Ativos", visible: true, icon: Wallet, color: COLORS.purple },
    { id: "EXPENSE_DISTRIBUTION", label: "Distribuição de Despesas", visible: true, icon: PieChart, color: COLORS.rose },
    // CLASSE-28: ao lado do gráfico de despesas por categoria
    { id: "CLASS_DISTRIBUTION", label: "Despesas por Classe", visible: true, icon: PieChart, color: COLORS.purple },
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
    // Anúncio para leitor de tela depois de mover um bloco pelos botões
    const [anuncio, setAnuncio] = useState("")
    // Depois de mover pelo teclado, o foco segue o bloco na nova posição
    const focoPendente = useRef<{ id: DashboardModuleId; direcao: "subir" | "descer" } | null>(null)
    const botoes = useRef(new Map<string, HTMLButtonElement | null>())

    useEffect(() => {
        if (open) {
            setLocalConfig([...config])
            setAnuncio("")
        }
    }, [open, config])

    useEffect(() => {
        const pendente = focoPendente.current
        if (!pendente) return
        focoPendente.current = null
        const outro = pendente.direcao === "subir" ? "descer" : "subir"
        const alvo = botoes.current.get(`${pendente.id}-${pendente.direcao}`)
        // Na ponta da lista o botão fica desabilitado: o foco vai para o outro
        if (alvo && !alvo.disabled) alvo.focus()
        else botoes.current.get(`${pendente.id}-${outro}`)?.focus()
    }, [localConfig])

    const handleToggle = (id: DashboardModuleId) => {
        setLocalConfig(prev => prev.map(m =>
            m.id === id ? { ...m, visible: !m.visible } : m
        ))
    }

    const mover = (index: number, destino: number, direcao: "subir" | "descer") => {
        if (destino < 0 || destino >= localConfig.length) return
        const newConfig = [...localConfig]
        const [modulo] = newConfig.splice(index, 1)
        newConfig.splice(destino, 0, modulo)
        focoPendente.current = { id: modulo.id, direcao }
        setLocalConfig(newConfig)
        setAnuncio(`${modulo.label} na posição ${destino + 1} de ${newConfig.length}.`)
    }

    const moveUp = (index: number) => mover(index, index - 1, "subir")
    const moveDown = (index: number) => mover(index, index + 1, "descer")

    // Arrastar nativo, além dos botões de subir e descer
    const onDragStart = (e: React.DragEvent, index: number) => {
        setDraggedIndex(index)
        e.dataTransfer.effectAllowed = "move"
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

    const onDragEnd = () => {
        setDraggedIndex(null)
    }

    const handleReset = () => {
        setLocalConfig([...DEFAULT_CONFIG])
        setAnuncio("Ordem padrão restaurada.")
    }

    const handleSave = () => {
        onConfigChange(localConfig)
        onOpenChange(false)
    }

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="mx-auto w-[95vw] gap-0 p-0 sm:w-full sm:max-w-[520px]">
                <DialogHeader className="p-6 pb-4">
                    <DialogTitle>Personalizar Painel</DialogTitle>
                    <DialogDescription>
                        Escolha os blocos visíveis e a ordem. Arraste ou use os botões de subir e descer.
                    </DialogDescription>
                </DialogHeader>

                <p className="sr-only" aria-live="polite">{anuncio}</p>

                <ul className="custom-scrollbar max-h-[60vh] space-y-2 overflow-y-auto px-4 pb-6 sm:max-h-[450px] sm:px-6">
                    {localConfig.map((module, index) => {
                        const Icon = module.icon
                        const isBeingDragged = draggedIndex === index

                        return (
                            <li
                                key={module.id}
                                draggable
                                onDragStart={(e) => onDragStart(e, index)}
                                onDragOver={(e) => onDragOver(e, index)}
                                onDragEnd={onDragEnd}
                                className={cn(
                                    "flex items-center justify-between gap-3 rounded-md border border-border bg-card p-3 transition-colors duration-fast",
                                    isBeingDragged ? "border-border-strong bg-elevated opacity-60" : "hover:bg-elevated"
                                )}
                            >
                                <div className="flex min-w-0 items-center gap-3">
                                    <GripVertical className="h-4 w-4 shrink-0 cursor-grab text-muted-foreground" aria-hidden="true" />
                                    <Icon className="h-4 w-4 shrink-0 text-fg-secondary" aria-hidden="true" />
                                    <Label htmlFor={`visible-${module.id}`} className="truncate text-sm font-medium">
                                        {module.label}
                                    </Label>
                                </div>
                                <div className="flex shrink-0 items-center gap-1">
                                    <Button
                                        ref={(el) => { botoes.current.set(`${module.id}-subir`, el) }}
                                        variant="ghost"
                                        size="icon"
                                        className="h-8 w-8"
                                        aria-label={`Subir ${module.label}`}
                                        title="Subir"
                                        onClick={() => moveUp(index)}
                                        disabled={index === 0}
                                    >
                                        <ArrowUp aria-hidden="true" />
                                    </Button>
                                    <Button
                                        ref={(el) => { botoes.current.set(`${module.id}-descer`, el) }}
                                        variant="ghost"
                                        size="icon"
                                        className="h-8 w-8"
                                        aria-label={`Descer ${module.label}`}
                                        title="Descer"
                                        onClick={() => moveDown(index)}
                                        disabled={index === localConfig.length - 1}
                                    >
                                        <ArrowDown aria-hidden="true" />
                                    </Button>
                                    <div className="ml-1 border-l border-border pl-3">
                                        <Switch
                                            id={`visible-${module.id}`}
                                            checked={module.visible}
                                            onCheckedChange={() => handleToggle(module.id)}
                                        />
                                    </div>
                                </div>
                            </li>
                        )
                    })}
                </ul>

                <div className="flex flex-col items-center justify-between gap-3 border-t border-border p-6 sm:flex-row">
                    <Button variant="ghost" onClick={handleReset}>
                        <RotateCcw aria-hidden="true" /> Restaurar padrão
                    </Button>
                    <div className="flex w-full flex-col items-center gap-2 sm:w-auto sm:flex-row">
                        <Button variant="outline" onClick={() => onOpenChange(false)} className="w-full sm:w-auto">
                            Cancelar
                        </Button>
                        <Button onClick={handleSave} className="w-full sm:w-auto">
                            Salvar layout
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
        const parsed: Partial<DashboardModuleConfig>[] = JSON.parse(saved)
        // Merge with DEFAULT_CONFIG in case new modules were added or attributes changed
        const salvo = (id: string) => parsed.find(p => p.id === id)
        const ordem = (id: string) => parsed.findIndex(p => p.id === id)
        const config: DashboardModuleConfig[] = DEFAULT_CONFIG.filter(def => salvo(def.id)).map(def => ({
            ...def,
            ...salvo(def.id),
            icon: def.icon,
            color: def.color,
        })).sort((a, b) => ordem(a.id) - ordem(b.id))
        // Módulo novo entra logo depois do que o precede no layout padrão, como
        // a divisão por classe ao lado da distribuição de despesas; o primeiro do
        // padrão entra no começo
        DEFAULT_CONFIG.forEach((def, index) => {
            if (salvo(def.id)) return
            const anterior = DEFAULT_CONFIG[index - 1]
            if (!anterior) {
                config.splice(0, 0, def)
                return
            }
            const posicao = config.findIndex(m => m.id === anterior.id)
            config.splice(posicao === -1 ? config.length : posicao + 1, 0, def)
        })
        return config
    } catch {
        return DEFAULT_CONFIG
    }
}
