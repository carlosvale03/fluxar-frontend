"use client"

import * as React from "react"
import { ChevronLeft, ChevronRight } from "lucide-react"
import { DayPicker } from "react-day-picker"
import { ptBR } from "date-fns/locale"
import { addMonths, format, setMonth, setYear, subMonths } from "date-fns"

import { cn } from "@/lib/utils"
import { buttonVariants } from "@/components/ui/button"

export type CalendarProps = React.ComponentProps<typeof DayPicker>

function Calendar({
  className,
  classNames,
  showOutsideDays = true,
  ...props
}: CalendarProps) {
  // Safe access to selected prop
  // If props.selected is undefined, we assume it's uncontrolled or just unselected
  const propSelected = (props as any).selected as Date | undefined
  const [tempSelected, setTempSelected] = React.useState<Date | undefined>(propSelected)
  
  // Internal state for current month view
  const [currentMonth, setCurrentMonth] = React.useState<Date>(
    props.month || propSelected || new Date()
  )
  const [view, setView] = React.useState<'calendar' | 'years'>('calendar')

  // Sync internal state with props only if props change externally
  React.useEffect(() => {
    if (propSelected) {
         setTempSelected(propSelected)
         // Only jump month if we aren't already there? 
         // Actually, let's keep the jump behavior for now but maybe avoid overriding if the user is browsing
         // For now, simple sync:
         if (!props.month) {
            setCurrentMonth(propSelected)
         }
    }
    if (props.month) {
        setCurrentMonth(props.month)
    }
  }, [propSelected, props.month])

  const handleDaySelect = (date: Date | undefined) => {
      setTempSelected(date)
      // Do NOT call props.onSelect here. Wait for confirmation.
  }

  const handleConfirm = () => {
      if ((props as any).onSelect) {
          // We need to cast because props.onSelect has complex signature depending on mode
          // For 'single' mode, it expects Date | undefined.
          ((props as any).onSelect)(tempSelected)
      }
      const onClose = (props as any).onClose
      if (onClose) {
          onClose()
      }
  }

  const handleCancel = () => {
      // Revert to original prop
      setTempSelected(propSelected)
      const onClose = (props as any).onClose
      if (onClose) {
          onClose()
      }
  }

  const handlePreviousMonth = (e: React.MouseEvent) => {
    e.preventDefault()
    const newMonth = subMonths(currentMonth, 1)
    setCurrentMonth(newMonth)
    // Explicit check to satisfy TS
    const onMonthChange = (props as any).onMonthChange
    if (onMonthChange) {
        onMonthChange(newMonth)
    }
  }

  const handleNextMonth = (e: React.MouseEvent) => {
    e.preventDefault()
    const newMonth = addMonths(currentMonth, 1)
    setCurrentMonth(newMonth)
    const onMonthChange = (props as any).onMonthChange
    if (onMonthChange) {
        onMonthChange(newMonth)
    }
  }

  const handleYearClick = (year: number) => {
    const newMonth = setYear(currentMonth, year)
    setCurrentMonth(newMonth)
    setView('calendar')
    const onMonthChange = (props as any).onMonthChange
    if (onMonthChange) {
        onMonthChange(newMonth)
    }
  }

  const currentYear = new Date().getFullYear()
  const years = Array.from({ length: 120 }, (_, i) => currentYear - 100 + i).reverse()

  return (
    <div className={cn("p-3 relative", className)}>
        {/* Custom Header */}
        <div className="flex justify-between items-center mb-4 px-1">
            <button
                type="button"
                onClick={() => setView(v => v === 'calendar' ? 'years' : 'calendar')}
                className="text-sm font-medium hover:bg-muted px-2 py-1 rounded-md transition-colors capitalize flex items-center justify-center cursor-pointer"
            >
                {format(currentMonth, "MMMM yyyy", { locale: ptBR })}
            </button>
            
            {view === 'calendar' && (
                <div className="flex items-center space-x-1">
                    <button
                        type="button"
                        onClick={handlePreviousMonth}
                        className={cn(
                            buttonVariants({ variant: "outline" }),
                            "h-7 w-7 bg-transparent p-0 opacity-50 hover:opacity-100"
                        )}
                        aria-label="Mês anterior"
                    >
                        <ChevronLeft className="h-4 w-4" />
                    </button>
                    <button
                        type="button"
                        onClick={handleNextMonth}
                        className={cn(
                            buttonVariants({ variant: "outline" }),
                            "h-7 w-7 bg-transparent p-0 opacity-50 hover:opacity-100"
                        )}
                        aria-label="Próximo mês"
                    >
                        <ChevronRight className="h-4 w-4" />
                    </button>
                </div>
            )}
        </div>

        {view === 'years' ? (
             <div className="h-[280px] w-full overflow-y-auto grid grid-cols-4 gap-2 custom-scrollbar pr-1">
                {years.map(year => (
                    <button
                        key={year}
                        type="button"
                        onClick={() => handleYearClick(year)}
                        className={cn(
                            "p-2 text-sm rounded-md hover:bg-muted transition-colors",
                            year === currentMonth.getFullYear() && "bg-primary text-primary-foreground hover:bg-primary/90"
                        )}
                    >
                        {year}
                    </button>
                ))}
             </div>
        ) : (
            <>
            <DayPicker
                locale={ptBR}
                month={currentMonth}
                onMonthChange={setCurrentMonth}
                showOutsideDays={showOutsideDays}
                className="p-0"
                classNames={{
                    months: "flex flex-col sm:flex-row space-y-4 sm:space-x-4 sm:space-y-0",
                    month: "space-y-4",
                    month_caption: "hidden", 
                    caption_label: "hidden",
                    nav: "hidden",
                    button_previous: "hidden",
                    button_next: "hidden", 
                    month_grid: "w-full border-collapse space-y-1",
                    weekdays: "flex",
                    weekday:
                    "text-muted-foreground rounded-md w-9 font-normal text-[0.8rem]",
                    week: "flex w-full mt-2",
                    day: "h-9 w-9 text-center text-sm p-0 relative [&:has([aria-selected].day-range-end)]:rounded-r-md [&:has([aria-selected].day-outside)]:bg-accent/50 [&:has([aria-selected])]:bg-accent first:[&:has([aria-selected])]:rounded-l-md last:[&:has([aria-selected])]:rounded-r-md focus-within:relative focus-within:z-20",
                    day_button: cn(
                    buttonVariants({ variant: "ghost" }),
                    "h-9 w-9 p-0 font-normal aria-selected:opacity-100"
                    ),
                    range_end: "day-range-end",
                    selected:
                    "bg-primary text-primary-foreground hover:bg-primary hover:text-primary-foreground focus:bg-primary focus:text-primary-foreground",
                    today: "bg-accent text-accent-foreground",
                    outside:
                    "day-outside text-muted-foreground opacity-50 aria-selected:bg-accent/50 aria-selected:text-muted-foreground aria-selected:opacity-30",
                    disabled: "text-muted-foreground opacity-50",
                    range_middle:
                    "aria-selected:bg-accent aria-selected:text-accent-foreground",
                    hidden: "invisible",
                    ...classNames,
                }}
                components={{
                    Chevron: ({ orientation }) => {
                        if (orientation === "left") return <ChevronLeft className="h-4 w-4" />
                        if (orientation === "right") return <ChevronRight className="h-4 w-4" />
                        return <></>
                    }
                }}
                {...(props as any)}
                // Override selected to use tempSelected
                selected={tempSelected as any}
                // Override onSelect to intercept
                onSelect={handleDaySelect as any}
            />
            
            {/* Confirmation Buttons */}
            <div className="flex justify-end items-center gap-2 mt-4 pt-2 border-t text-muted-foreground">
                <button
                    type="button"
                    onClick={handleCancel}
                    className={cn(buttonVariants({ variant: "ghost", size: "sm" }), "text-xs h-8")}
                >
                    Cancelar
                </button>
                <button
                    type="button"
                    onClick={handleConfirm}
                    className={cn(buttonVariants({ variant: "default", size: "sm" }), "text-xs h-8")}
                >
                    OK
                </button>
            </div>
            </>
        )}
    </div>
  )
}
Calendar.displayName = "Calendar"

export { Calendar }
