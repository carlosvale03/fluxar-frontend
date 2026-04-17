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
import { LucideIcon, Sparkles } from "lucide-react"
import { cn } from "@/lib/utils"

interface ChartEmptyStateProps {
  type: "bar" | "pie" | "area"
  title?: string
  description?: string
  icon?: LucideIcon
  className?: string
  height?: number | string
}

export function ChartEmptyState({ 
  type, 
  title = "Sem dados", 
  description = "Aguardando seus primeiros registros para este período.",
  icon: Icon = Sparkles,
  className,
  height = 250
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
      className={cn("relative w-full flex items-center justify-center overflow-hidden group/empty transition-colors duration-500", className)} 
      style={{ height: typeof height === 'number' ? `${height}px` : height }}
    >
      {/* Ghost Chart Layer - Usar cor de texto muda do sistema como base sem opacidade no container */}
      <div className="absolute inset-0 pointer-events-none select-none text-muted-foreground/30 dark:text-muted-foreground/40">
        {renderGhostChart()}
      </div>

      {/* Message Layer - Design limpo focado em legibilidade e contraste */}
      <div className="relative z-10 flex flex-col items-center text-center px-4 max-w-[280px] space-y-4 pointer-events-none">
        
        {/* Ícone com fundo mais nítido */}
        <div className="w-14 h-14 rounded-2xl bg-white dark:bg-card flex items-center justify-center border border-border/60 shadow-lg mb-1 ring-4 ring-muted/50 dark:ring-muted/5 transition-all">
          <Icon className="h-6 w-6 text-muted-foreground" />
        </div>

        <div className="space-y-1.5 animate-in fade-in slide-in-from-bottom-2 duration-700">
          {/* Título com contraste máximo */}
          <p className="text-[11px] font-black uppercase tracking-[0.25em] text-foreground leading-none">
            {title}
          </p>
          
          {/* Descrição legível em ambos os temas */}
          <p className="text-[11px] font-bold text-muted-foreground leading-relaxed italic opacity-90 max-w-[200px]">
            {description}
          </p>
        </div>
      </div>
    </div>
  )
}
