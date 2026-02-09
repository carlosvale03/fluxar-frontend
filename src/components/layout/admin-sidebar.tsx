"use client"

import Link from "next/link"
import { usePathname } from "next/navigation"
import { LayoutDashboard, Users, Settings, ShieldCheck, ArrowLeft } from "lucide-react"
import { cn } from "@/lib/utils"

export function AdminSidebar() {
  const pathname = usePathname()

  const items = [
    { name: "Dashboard", href: "/admin/dashboard", icon: LayoutDashboard },
    { name: "Usuários", href: "/admin/usuarios", icon: Users },
    { name: "Configurações", href: "/admin/configuracoes", icon: Settings },
  ]

  return (
    <div className="w-64 border-r border-border bg-card/30 backdrop-blur-md hidden lg:flex flex-col gap-4 p-6 min-h-[calc(100vh-64px)]">
      <div className="flex items-center gap-3 px-2 mb-6">
        <div className="w-10 h-10 rounded-2xl bg-primary/10 flex items-center justify-center">
          <ShieldCheck className="h-5 w-5 text-primary" />
        </div>
        <div>
          <h2 className="text-sm font-black uppercase tracking-tight">Fluxar Admin</h2>
          <p className="text-[10px] font-bold text-muted-foreground uppercase opacity-50">Gestão de Sistema</p>
        </div>
      </div>

      <nav className="space-y-2 flex-1">
        {items.map((item) => {
          const isActive = pathname.startsWith(item.href)
          const Icon = item.icon
          
          return (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                "flex items-center gap-3 px-4 py-3 rounded-2xl text-sm font-bold transition-all duration-300",
                isActive 
                  ? "bg-primary text-primary-foreground shadow-lg shadow-primary/20 scale-[1.02]" 
                  : "text-muted-foreground hover:bg-muted/50 hover:text-foreground"
              )}
            >
              <Icon className="h-4 w-4" />
              {item.name}
            </Link>
          )
        })}
      </nav>

      <div className="pt-6 border-t border-border/40">
        <Link
          href="/dashboard"
          className="flex items-center gap-3 px-4 py-3 rounded-2xl text-sm font-bold text-muted-foreground hover:bg-primary/10 hover:text-primary transition-all duration-300"
        >
          <ArrowLeft className="h-4 w-4" />
          Voltar à Aplicação
        </Link>
      </div>
    </div>
  )
}
