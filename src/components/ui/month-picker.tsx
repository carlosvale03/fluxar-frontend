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
          variant="outline"
          // AZ-41: seletor de período no padrão do Azimute
          className="h-11 gap-3 px-3"
        >
          <CalendarIcon className="h-4 w-4 text-gold-line" aria-hidden="true" />
          <div className="flex flex-col items-start gap-0.5">
            <span className="label leading-none text-muted-foreground">Período</span>
            <span className="text-sm text-foreground">
              {fullMonths[currentMonth - 1]} <span className="value-m">{currentYear}</span>
            </span>
          </div>
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-72 p-4" align="center">
        <div className="space-y-4">
          <div className="flex items-center justify-between px-1">
            <h4 className="value-m text-foreground">{viewYear}</h4>
            <div className="flex items-center gap-1">
              <Button
                variant="ghost"
                size="icon"
                className="h-8 w-8"
                aria-label="Ano anterior"
                onClick={() => setViewYear(prev => prev - 1)}
              >
                <ChevronLeft className="h-4 w-4" aria-hidden="true" />
              </Button>
              <Button
                variant="ghost"
                size="icon"
                className="h-8 w-8"
                aria-label="Próximo ano"
                onClick={() => setViewYear(prev => prev + 1)}
              >
                <ChevronRight className="h-4 w-4" aria-hidden="true" />
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
                    "h-10 text-sm",
                    isSelected
                      ? "bg-gold text-gold-ink hover:bg-gold-hover hover:text-gold-ink"
                      : "text-fg-secondary"
                  )}
                  aria-pressed={isSelected}
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
