"use client"

import { 
  BarChart, 
  Bar, 
  ResponsiveContainer, 
  PieChart, 
  Pie, 
  Cell,
  XAxis,
  YAxis,
  AreaChart,
  Area
} from "recharts"
import type { ReactNode } from "react"
import Link from "next/link"
import { ArrowRight, LucideIcon, Sparkles } from "lucide-react"
import { cn } from "@/lib/utils"

interface ChartEmptyStateProps {
  type: "bar" | "pie" | "area"
  title?: string
  description?: string
  icon?: LucideIcon
  className?: string
  height?: number | string
  // AZ-34: todo estado vazio tem uma ação. Sem ela, o link leva ao Diário de
  // Bordo, onde os lançamentos são registrados
  acao?: ReactNode
}

// Ação padrão dos gráficos vazios
export function AcaoDoDiario() {
  return (
    <Link
      href="/transacoes"
      className="inline-flex items-center gap-1 text-sm font-medium text-fg-secondary transition-colors duration-fast hover:text-foreground"
    >
      Abrir o Diário de Bordo <ArrowRight className="h-4 w-4" aria-hidden="true" />
    </Link>
  )
}

export function ChartEmptyState({ 
  type, 
  title = "Nada registrado neste período.",
  description = "Os lançamentos do período aparecem aqui.",
  icon: Icon = Sparkles,
  className,
  height = 250,
  acao = <AcaoDoDiario />,
}: ChartEmptyStateProps) {
  
  // Dados neutros fixos e intencionalmente mais baixos para não tomarem o palco
  const ghostBarData = [
    { value: 40 }, { value: 65 }, { value: 45 }, 
    { value: 80 }, { value: 35 }, { value: 55 },
    { value: 40 }, { value: 60 }
  ]

  const ghostPieData = [
    { value: 400 }, { value: 400 }, { value: 400 }, { value: 400 }
  ]

  const ghostAreaData = Array.from({ length: 12 }).map((_, i) => ({
    value: 40 + Math.sin(i / 1.5) * 15
  }))

  const renderGhostChart = () => {
    // Aumentamos a opacidade individual para 15% e removemos opacidades dos containers pai
    switch (type) {
      case "bar":
        return (
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={ghostBarData} margin={{ top: 20, right: 10, left: 10, bottom: 0 }}>
              <Bar dataKey="value" fill="currentColor" radius={[4, 4, 0, 0]} opacity={0.15} barSize={24} />
              <XAxis hide />
              <YAxis hide />
            </BarChart>
          </ResponsiveContainer>
        )
      case "pie":
        return (
          <ResponsiveContainer width="100%" height="100%">
            <PieChart>
              <Pie
                data={ghostPieData}
                cx="50%" cy="50%" innerRadius="70%" outerRadius="90%" paddingAngle={10}
                dataKey="value" stroke="none" opacity={0.15}
              >
                {ghostPieData.map((_, index) => (
                  <Cell key={`cell-${index}`} fill="currentColor" />
                ))}
              </Pie>
            </PieChart>
          </ResponsiveContainer>
        )
      case "area":
        return (
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={ghostAreaData} margin={{ top: 0, right: 0, left: 0, bottom: 0 }}>
              <Area 
                type="monotone" 
                dataKey="value" 
                stroke="currentColor" 
                fill="currentColor" 
                opacity={0.15} 
                strokeWidth={2}
                strokeDasharray="4 4"
              />
            </AreaChart>
          </ResponsiveContainer>
        )
    }
  }

  return (
    <div 
      className={cn("relative w-full flex items-center justify-center overflow-hidden", className)} 
      style={{ height: typeof height === 'number' ? `${height}px` : height }}
    >
      {/* Ghost Chart Layer - Usar cor de texto muda do sistema como base sem opacidade no container */}
      <div className="absolute inset-0 pointer-events-none select-none text-border-strong" aria-hidden="true">
        {renderGhostChart()}
      </div>

      {/* Message Layer - Design limpo focado em legibilidade e contraste */}
      <div className="relative z-10 flex flex-col items-center text-center px-4 max-w-[280px] space-y-4 pointer-events-none">
        
        <div className="mb-1 flex h-11 w-11 items-center justify-center rounded-full border border-border-strong bg-elevated">
          <Icon className="h-5 w-5 text-muted-foreground" aria-hidden="true" />
        </div>

        <div className="space-y-1.5">
          <p className="text-sm font-semibold text-foreground">
            {title}
          </p>
          
          <p className="max-w-[240px] text-sm leading-relaxed text-muted-foreground">
            {description}
          </p>
        </div>

        {acao && <div className="pointer-events-auto">{acao}</div>}
      </div>
    </div>
  )
}
