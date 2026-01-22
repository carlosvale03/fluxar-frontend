"use client"

import { useState } from "react"
import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"
import { ChevronLeft, ChevronRight } from "lucide-react"

interface MonthRangePickerProps {
  onRangeChange: (start: { month: number; year: number }, end: { month: number; year: number }) => void
  initialStart?: { month: number; year: number }
  initialEnd?: { month: number; year: number }
  excludedPeriod?: { month: number; year: number }
}

export function MonthRangePicker({ onRangeChange, initialStart, initialEnd, excludedPeriod }: MonthRangePickerProps) {
  const [currentYear, setCurrentYear] = useState(new Date().getFullYear())
  const [hoveredMonth, setHoveredMonth] = useState<{ month: number; year: number } | null>(null)
  const [selection, setSelection] = useState<{
    start: { month: number; year: number } | null
    end: { month: number; year: number } | null
  }>({
    start: initialStart || null,
    end: initialEnd || null
  })

  const months = [
    "Jan", "Fev", "Mar", "Abr", "Mai", "Jun",
    "Jul", "Ago", "Set", "Out", "Nov", "Dez"
  ]

  const handleMonthClick = (monthIndex: number) => {
    const month = monthIndex + 1
    const year = currentYear

    if (excludedPeriod?.month === month && excludedPeriod?.year === year) return

    if (!selection.start || (selection.start && selection.end)) {
      // First click or reset
      const newStart = { month, year }
      setSelection({ start: newStart, end: null })
    } else {
      // Second click - selection of end or swap if before
      const startVal = selection.start.year * 12 + selection.start.month
      const currentVal = year * 12 + month

      if (currentVal < startVal) {
        // Current is before start, make it the new start
        setSelection({ start: { month, year }, end: selection.start })
        onRangeChange({ month, year }, selection.start)
      } else {
        setSelection({ ...selection, end: { month, year } })
        onRangeChange(selection.start, { month, year })
      }
    }
  }

  const isSelected = (month: number, year: number) => {
    if (!selection.start) return false
    
    const startVal = selection.start.year * 12 + selection.start.month
    const currentVal = year * 12 + month

    if (!selection.end) {
      if (!hoveredMonth) return selection.start.month === month && selection.start.year === year
      
      const hoverVal = hoveredMonth.year * 12 + hoveredMonth.month
      const minVal = Math.min(startVal, hoverVal)
      const maxVal = Math.max(startVal, hoverVal)
      return currentVal >= minVal && currentVal <= maxVal
    }

    const endVal = selection.end.year * 12 + selection.end.month
    return currentVal >= startVal && currentVal <= endVal
  }

  const isEdge = (month: number, year: number) => {
    if (!selection.start) return false
    
    const isStart = selection.start.month === month && selection.start.year === year
    const isEnd = selection.end && selection.end.month === month && selection.end.year === year
    
    // If only start is selected, check hovered month for potential end
    if (!selection.end && hoveredMonth) {
      const startVal = selection.start.year * 12 + selection.start.month
      const hoverVal = hoveredMonth.year * 12 + hoveredMonth.month
      const isHoverStart = hoveredMonth.month === month && hoveredMonth.year === year && hoverVal < startVal
      const isHoverEnd = hoveredMonth.month === month && hoveredMonth.year === year && hoverVal > startVal
      
      if (isStart && hoverVal > startVal) return "start"
      if (isStart && hoverVal < startVal) return "end"
      if (isHoverStart) return "start"
      if (isHoverEnd) return "end"
    }

    if (isStart) return "start"
    if (isEnd) return "end"
    return false
  }

  return (
    <div className="p-3 sm:p-4 bg-background/50 backdrop-blur-md border border-border/40 rounded-2xl shadow-sm">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-3 sm:mb-4">
        <h4 className="text-xs sm:text-sm font-black text-foreground flex items-center gap-2">
          <ChevronLeft 
            className="h-4 w-4 cursor-pointer hover:text-primary transition-colors" 
            onClick={() => setCurrentYear(prev => prev - 1)}
          />
          {currentYear}
          <ChevronRight 
            className="h-4 w-4 cursor-pointer hover:text-primary transition-colors" 
            onClick={() => setCurrentYear(prev => prev + 1)}
          />
        </h4>
        <div className="flex gap-2">
            <span className={cn(
                "text-[9px] sm:text-[10px] uppercase font-black transition-all duration-300 px-2 sm:px-3 py-1 sm:py-1.5 rounded-full shadow-sm",
                (!selection.start || (selection.start && !selection.end)) 
                    ? (selection.start ? "bg-emerald-500/20 text-emerald-800 dark:text-emerald-400" : "bg-amber-500/20 text-amber-800 dark:text-amber-400")
                    : "bg-blue-500/20 text-blue-800 dark:text-blue-400"
            )}>
                {!selection.start 
                    ? "1. Selecione o início" 
                    : (!selection.end ? "2. Selecione o fim" : "✓ Período Definido")}
            </span>
        </div>
      </div>
      
      <div className="grid grid-cols-4 gap-1.5 sm:gap-2">
        {months.map((name, index) => {
          const month = index + 1
          const selected = isSelected(month, currentYear)
          const edge = isEdge(month, currentYear)
          const isExcluded = excludedPeriod?.month === month && excludedPeriod?.year === currentYear
          
          return (
            <Button
              key={name}
              variant="ghost"
              size="sm"
              disabled={isExcluded}
              onClick={() => handleMonthClick(index)}
              onMouseEnter={() => setHoveredMonth({ month, year: currentYear })}
              onMouseLeave={() => setHoveredMonth(null)}
              className={cn(
                "h-9 sm:h-10 rounded-xl text-[12px] sm:text-[13px] font-black transition-all duration-200",
                selected && !edge && "bg-primary/20 text-primary dark:text-primary-foreground hover:bg-primary/30",
                edge === "start" && "bg-primary text-primary-foreground hover:bg-primary/90 rounded-r-none shadow-md",
                edge === "end" && "bg-primary text-primary-foreground hover:bg-primary/90 rounded-l-none shadow-md",
                edge === "start" && !selection.end && !hoveredMonth && "rounded-r-xl",
                !selected && !isExcluded && "hover:bg-accent text-foreground/90 hover:text-foreground",
                isExcluded && "opacity-20 grayscale pointer-events-none"
              )}
            >
              {name}
            </Button>
          )
        })}
      </div>
      
      {(selection.start || selection.end) && (
        <div className="mt-4 pt-3 sm:pt-4 border-t border-border/40 flex justify-between items-center">
            <div className="flex flex-col">
                <span className="text-[9px] sm:text-[10px] text-foreground font-black uppercase tracking-tight">Período</span>
                <span className="text-[10px] sm:text-xs font-black text-foreground/80">
                    {selection.start ? `${months[selection.start.month - 1]}/${selection.start.year}` : "..."} 
                    {selection.end ? ` - ${months[selection.end.month - 1]}/${selection.end.year}` : ""}
                </span>
            </div>
            <Button 
                variant="ghost" 
                size="sm" 
                className="text-[9px] sm:text-[10px] h-7 px-2 uppercase font-black hover:text-destructive text-foreground/60 border border-transparent hover:border-destructive/20"
                onClick={() => setSelection({ start: null, end: null })}
            >
                Limpar
            </Button>
        </div>
      )}
    </div>
  )
}
