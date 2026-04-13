"use client"

import * as React from "react"
import { useState } from "react"
import { ChevronLeft, ChevronRight, Calendar as CalendarIcon } from "lucide-react"
import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover"

interface MonthPickerProps {
  currentMonth: number
  currentYear: number
  onSelect: (month: number, year: number) => void
}

export function MonthPicker({ currentMonth, currentYear, onSelect }: MonthPickerProps) {
  const [isOpen, setIsOpen] = useState(false)
  const [viewYear, setViewYear] = useState(currentYear)

  const months = [
    "Jan", "Fev", "Mar", "Abr", "Mai", "Jun",
    "Jul", "Ago", "Set", "Out", "Nov", "Dez"
  ]

  const fullMonths = [
    "Janeiro", "Fevereiro", "Março", "Abril", "Maio", "Junho",
    "Julho", "Agosto", "Setembro", "Outubro", "Novembro", "Dezembro"
  ]

  const handleMonthClick = (monthIndex: number) => {
    onSelect(monthIndex + 1, viewYear)
    setIsOpen(false)
  }

  return (
    <Popover open={isOpen} onOpenChange={setIsOpen}>
      <PopoverTrigger asChild>
        <Button
          variant="ghost"
          className={cn(
            "h-12 px-6 rounded-2xl flex items-center gap-3 transition-all duration-300",
            "bg-background/40 hover:bg-background/60 border border-border/40 hover:border-border/80 shadow-sm",
            "group"
          )}
        >
          <div className="w-9 h-9 rounded-xl bg-primary/10 flex items-center justify-center text-primary group-hover:scale-110 transition-transform duration-500 shadow-sm ring-1 ring-primary/20">
            <CalendarIcon className="h-4 w-4" />
          </div>
          <div className="flex flex-col items-start gap-1">
            <span className="text-[9px] font-black uppercase text-muted-foreground/50 tracking-[0.2em] leading-none">Período</span>
            <span className="text-sm font-black text-foreground/90 tracking-tight">
              {fullMonths[currentMonth - 1]} <span className="text-primary">{currentYear}</span>
            </span>
          </div>
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-72 p-4 bg-background/80 backdrop-blur-2xl border-border/40 shadow-2xl rounded-3xl" align="center">
        <div className="space-y-4">
          <div className="flex items-center justify-between px-1">
            <h4 className="text-sm font-black flex items-center gap-2">
              <span className="text-primary">{viewYear}</span>
            </h4>
            <div className="flex items-center gap-1">
              <Button
                variant="ghost"
                size="icon"
                className="h-8 w-8 rounded-xl hover:bg-primary/10"
                onClick={() => setViewYear(prev => prev - 1)}
              >
                <ChevronLeft className="h-4 w-4" />
              </Button>
              <Button
                variant="ghost"
                size="icon"
                className="h-8 w-8 rounded-xl hover:bg-primary/10"
                onClick={() => setViewYear(prev => prev + 1)}
              >
                <ChevronRight className="h-4 w-4" />
              </Button>
            </div>
          </div>
          
          <div className="grid grid-cols-3 gap-2">
            {months.map((month, index) => {
              const isSelected = currentMonth === index + 1 && currentYear === viewYear
              return (
                <Button
                  key={month}
                  variant="ghost"
                  className={cn(
                    "h-10 rounded-xl text-xs font-black transition-all duration-200",
                    isSelected 
                      ? "bg-primary text-primary-foreground hover:bg-primary/90 shadow-lg shadow-primary/20" 
                      : "hover:bg-primary/10 text-foreground/70 hover:text-primary"
                  )}
                  onClick={() => handleMonthClick(index)}
                >
                  {month}
                </Button>
              )
            })}
          </div>
        </div>
      </PopoverContent>
    </Popover>
  )
}
