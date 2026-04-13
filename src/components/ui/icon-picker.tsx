"use client"

import * as React from "react"
import * as LucideIcons from "lucide-react"
import { Search } from "lucide-react"
import { cn } from "@/lib/utils"
import { Input } from "@/components/ui/input"

// List of recommended icons for financial categories (deduplicated)
export const RECOMMENDED_ICONS = Array.from(new Set([
  "Wallet", "CreditCard", "Banknote", "TrendingUp", "TrendingDown", 
  "ShoppingBag", "Utensils", "Car", "Home", "Briefcase", 
  "GraduationCap", "HeartPulse", "Gamepad2", "Plane", "Trophy", 
  "Gift", "Smartphone", "Zap", "Droplets", "Bus", 
  "ShoppingBasket", "Coffee", "Music", "Film", "Camera", 
  "Tv", "Watch", "Umbrella", "Baby", "Dog", "Cat", 
  "Flower2", "Sprout", "Sun", "Moon", "Cloud", "Star", 
  "Check", "X", "Search", "Settings", "User", "Lock", "Mail", "Phone", "Bell",
  "ArrowUpCircle", "ArrowDownCircle", "DollarSign", "Euro", "Bitcoin", "PiggyBank",
  "Building", "Landmark", "Store", "Factory", "Hammer", "Wrench", "Shield",
  "Wifi", "Flame", "Lightbulb", "Shirt", "Stethoscope", "Pill", "Syringe", "Dumbbell",
  "Ticket", "Palette", "Languages", "Map", "Navigation", "Grape", "Apple",
  "Beef", "Fish", "Egg", "Milk", "IceCream", "Pizza", "Soup", "Sandwich",
  "Bicycle", "Truck", "Train", "Anchor", "Activity", "Heart", "Smile", "Flag",
  "Book", "Newspaper", "PenTool", "Brush", "Music2", "Headphones", "Mic",
  "CloudRain", "CloudLightning", "Thermometer", "Wind", "Mountain", "Waves"
]))

interface IconPickerProps {
  value?: string
  onChange: (value: string) => void
  className?: string
}

export function IconPicker({ value, onChange, className }: IconPickerProps) {
  const [searchTerm, setSearchTerm] = React.useState("")

  const filteredIcons = RECOMMENDED_ICONS.filter((iconName) =>
    iconName.toLowerCase().includes(searchTerm.toLowerCase())
  )

  return (
    <div className={cn("space-y-4", className)}>
      <div className="relative group">
        <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground group-focus-within:text-primary transition-colors" />
        <Input
          placeholder="Buscar ícone..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="pl-10 h-11 rounded-xl bg-muted/20 border-border/10 focus-visible:ring-primary/20 focus-visible:border-primary/40 transition-all font-medium"
        />
      </div>
      
      <div className="grid grid-cols-6 sm:grid-cols-8 gap-2.5 max-h-[220px] overflow-y-auto p-3 bg-muted/5 border border-border/40 rounded-2xl custom-scrollbar animate-in fade-in duration-500">
        {filteredIcons.map((iconName) => {
          const IconComponent = (LucideIcons as any)[iconName]
          if (!IconComponent) return null

          const isSelected = value === iconName

          return (
            <button
              key={iconName}
              type="button"
              onClick={() => onChange(iconName)}
              className={cn(
                "w-10 h-10 flex items-center justify-center rounded-xl transition-all duration-300 cursor-pointer shrink-0",
                isSelected 
                  ? "bg-primary text-primary-foreground shadow-lg shadow-primary/25 scale-110 ring-2 ring-primary/20 z-10" 
                  : "bg-background border border-border/40 text-muted-foreground/60 hover:bg-primary/10 hover:text-primary hover:border-primary/30 hover:shadow-sm"
              )}
              title={iconName}
            >
              <IconComponent className={cn("transition-transform duration-300", isSelected ? "h-5 w-5 scale-110" : "h-4.5 w-4.5")} />
            </button>
          )
        })}
        {filteredIcons.length === 0 && (
          <div className="col-span-full py-10 flex flex-col items-center justify-center text-center space-y-2 opacity-40">
            <Search className="h-8 w-8 mb-2" />
            <p className="text-[10px] font-black uppercase tracking-widest">Nenhum ícone encontrado</p>
          </div>
        )}
      </div>
    </div>
  )
}

// Utility to render dynamic icon
export function LucideIcon({ name, className, ...props }: { name: string; className?: string } & any) {
  const IconComponent = (LucideIcons as any)[name] || LucideIcons.HelpCircle
  return <IconComponent className={className} {...props} />
}
