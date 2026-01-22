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
      <div className="relative">
        <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
        <Input
          placeholder="Buscar ícone..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="pl-8"
        />
      </div>
      
      <div className="grid grid-cols-6 gap-2 max-h-[200px] overflow-y-auto p-1 border rounded-md custom-scrollbar">
        {filteredIcons.map((iconName) => {
          const IconComponent = (LucideIcons as any)[iconName]
          if (!IconComponent) return null

          return (
            <button
              key={iconName}
              type="button"
              onClick={() => onChange(iconName)}
              className={cn(
                "flex items-center justify-center p-2 rounded-md transition-all hover:bg-primary/20 hover:text-primary cursor-pointer",
                value === iconName ? "bg-primary text-primary-foreground hover:bg-primary/90 hover:text-primary-foreground shadow-sm scale-110" : "bg-background text-muted-foreground"
              )}
              title={iconName}
            >
              <IconComponent className="h-5 w-5" />
            </button>
          )
        })}
        {filteredIcons.length === 0 && (
          <div className="col-span-6 text-center py-4 text-sm text-muted-foreground">
            Nenhum ícone encontrado.
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
