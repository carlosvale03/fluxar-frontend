"use client"

import { useState, useEffect, useRef } from "react"
import Link from "next/link"
import Image from "next/image"
import { ThemeToggle } from "@/components/theme-toggle"
import { Button } from "@/components/ui/button"
import { 
  User, Menu, LogOut, Loader2, MoreHorizontal, 
  LayoutDashboard, Wallet, CreditCard, ArrowRightLeft, 
  BarChart3, Calendar, Repeat, PieChart, ArrowUpDown, 
  Layers, Tag, Target, Settings, ChevronDown, Users
} from "lucide-react"
import { useAuth } from "@/hooks/use-auth"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
  SheetClose,
} from "@/components/ui/sheet"

import { usePathname } from "next/navigation"
import { getAbsoluteUrl, cn } from "@/lib/utils"

export function Header() {
  const { user, logout, isLoading } = useAuth()
  const pathname = usePathname()
  const [showScrollIndicator, setShowScrollIndicator] = useState(true)

  const handleScroll = (e: React.UIEvent<HTMLDivElement>) => {
    const { scrollTop, scrollHeight, clientHeight } = e.currentTarget
    const atBottom = scrollHeight - scrollTop <= clientHeight + 20
    if (atBottom && showScrollIndicator) setShowScrollIndicator(false)
    if (!atBottom && !showScrollIndicator) setShowScrollIndicator(true)
  }

  const primaryNavItems = [
    { name: "Dashboard", href: "/dashboard", icon: LayoutDashboard },
    { name: "Contas", href: "/contas", icon: Wallet },
    { name: "Cartões", href: "/cartoes", icon: CreditCard },
    { name: "Transações", href: "/transacoes", icon: ArrowRightLeft },
    { name: "Gráficos", href: "/relatorios", icon: BarChart3 },
  ]

  const secondaryNavItems = [
    { name: "Metas", href: "/metas", icon: Target },
    { name: "Calendário", href: "/calendario", icon: Calendar },
    { name: "Orçamentos", href: "/orcamentos", icon: PieChart },
    { name: "Importar & Exportar", href: "/importar", icon: ArrowUpDown },
    { name: "Categorias", href: "/categorias", icon: Layers },
    { name: "Tags", href: "/tags", icon: Tag },
  ]

  const allNavItems = [...primaryNavItems, ...secondaryNavItems]

  const showThemeToggle = process.env.NEXT_PUBLIC_SHOW_THEME_TOGGLE === 'true'

  const adminNavItems = [
    { name: "Painel Geral", href: "/admin/dashboard", icon: LayoutDashboard },
    { name: "Usuários", href: "/admin/usuarios", icon: Users },
    { name: "Configurações", href: "/admin/configuracoes", icon: Settings },
  ]

  const [navMode, setNavMode] = useState<'app' | 'admin'>('app')

  useEffect(() => {
    if (pathname.startsWith('/admin')) {
      setNavMode('admin')
    } else {
      setNavMode('app')
    }
  }, [pathname])

  return (
    <header className="sticky top-0 z-40 w-full border-b border-border bg-background/80 backdrop-blur-md">
      <div className="container mx-auto flex h-16 items-center px-4">
        {/* Logo - Esquerda */}
        <div className="flex-1 flex items-center">
          <Link href="/" className="flex items-center gap-2">
            <div className="relative h-10 w-40 hidden dark:block">
               <Image 
                src="/logo/logo-dark-clean-1630x700.png" 
                alt="Fluxar Logo" 
                fill
                sizes="160px"
                className="object-contain object-left"
                priority
              />
            </div>
            <div className="relative h-10 w-40 dark:hidden">
               <Image 
                src="/logo/logo-light-clean-1630x700.png" 
                alt="Fluxar Logo" 
                fill
                sizes="160px"
                className="object-contain object-left"
                priority
              />
            </div>
          </Link>
        </div>

        {/* Links Centralizados - Desktop */}
        <nav className="hidden md:flex items-center gap-1 text-sm font-medium">
          {primaryNavItems.map((item) => {
            const isActive = pathname === item.href
            return (
              <Link 
                key={item.href}
                href={item.href} 
                className={cn(
                  "relative px-3 py-2 transition-all duration-300 rounded-lg hover:bg-muted/50 whitespace-nowrap",
                  isActive 
                    ? "text-primary font-bold" 
                    : "text-muted-foreground hover:text-foreground"
                )}
              >
                {item.name}
                {isActive && (
                  <span className="absolute bottom-0 left-2 right-2 h-0.5 bg-primary rounded-full animate-in fade-in slide-in-from-bottom-1 duration-500" />
                )}
              </Link>
            )
          })}

          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="sm" className="h-9 w-9 p-0 rounded-lg hover:bg-muted/50 ml-1">
                 <MoreHorizontal className="h-5 w-5 text-muted-foreground" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-56 rounded-2xl p-2 shadow-xl border-border/40">
              <DropdownMenuLabel className="text-[10px] font-black uppercase tracking-widest opacity-40 px-3 py-2">Recursos Adicionais</DropdownMenuLabel>
              {secondaryNavItems.map((item) => {
                const Icon = item.icon
                const isActive = pathname === item.href
                return (
                  <DropdownMenuItem key={item.href} asChild>
                    <Link 
                      href={item.href} 
                      className={cn(
                        "flex items-center gap-3 px-3 py-2.5 rounded-xl cursor-pointer transition-all",
                        isActive ? "bg-primary/10 text-primary font-bold" : "hover:bg-muted"
                      )}
                    >
                      <Icon className={cn("h-4 w-4", isActive ? "text-primary" : "text-muted-foreground")} />
                      <span className="text-sm">{item.name}</span>
                    </Link>
                  </DropdownMenuItem>
                )
              })}
            </DropdownMenuContent>
          </DropdownMenu>
        </nav>

        {/* Ações - Direita */}
        <div className="flex-1 flex items-center justify-end gap-4">
          {showThemeToggle && <ThemeToggle />}
          
          <div className="hidden md:flex items-center gap-2">
            {isLoading ? (
               <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
            ) : user ? (
               <DropdownMenu>
                 <DropdownMenuTrigger asChild>
                   <Button variant="ghost" className="relative h-8 w-8 rounded-full">
                      <Avatar className="h-8 w-8">
                        <AvatarImage src={getAbsoluteUrl(user.avatar_url) || ""} alt={user.name} />
                        <AvatarFallback className="bg-avatar-premium text-primary font-bold text-xs">
                           {user.name.charAt(0).toUpperCase()}
                        </AvatarFallback>
                      </Avatar>
                   </Button>
                 </DropdownMenuTrigger>
                 <DropdownMenuContent className="w-72 rounded-[24px] p-2 shadow-xl border-border/40 animate-in zoom-in-95 duration-200" align="end" forceMount>
                   <DropdownMenuLabel className="p-3 font-normal">
                     <div className="flex items-center gap-3">
                        <Avatar className="h-10 w-10 border-2 border-primary/10">
                          <AvatarImage src={getAbsoluteUrl(user.avatar_url) || ""} alt={user.name} />
                          <AvatarFallback className="bg-avatar-premium text-primary font-black text-xs">
                             {user.name.charAt(0).toUpperCase()}
                          </AvatarFallback>
                        </Avatar>
                        <div className="flex flex-col space-y-0.5 overflow-hidden">
                          <p className="text-sm font-black tracking-tight leading-none truncate">{user.name}</p>
                          <p className="text-[10px] leading-none text-muted-foreground truncate opacity-70">
                            {user.email}
                          </p>
                          <div className="mt-1">
                            <span className={cn(
                              "text-[8px] font-black uppercase tracking-widest px-2 py-0.5 rounded-full border",
                              user.plan === 'COMMON' 
                                ? "bg-zinc-500/10 text-zinc-500 border-zinc-200 dark:border-zinc-800" 
                                : "bg-primary/10 text-primary border-primary/20"
                            )}>
                              {user.plan}
                            </span>
                          </div>
                        </div>
                     </div>
                   </DropdownMenuLabel>
                   <DropdownMenuSeparator className="mx-2 opacity-50" />
                   
                   {user.role === "ADMIN" && (
                     <DropdownMenuItem asChild>
                       <Link href="/admin/dashboard" className="flex items-center gap-3 px-3 py-2.5 rounded-xl cursor-pointer transition-all hover:bg-primary/5 group">
                         <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center group-hover:bg-primary/20 transition-colors">
                            <LayoutDashboard className="h-4 w-4 text-primary" />
                         </div>
                         <span className="text-sm font-bold text-primary">Painel Admin</span>
                       </Link>
                     </DropdownMenuItem>
                   )}
                   
                   <DropdownMenuItem asChild>
                     <Link href="/perfil" className="flex items-center gap-3 px-3 py-2.5 rounded-xl cursor-pointer transition-all hover:bg-muted group">
                       <div className="w-8 h-8 rounded-lg bg-muted flex items-center justify-center group-hover:bg-muted-foreground/10 transition-colors">
                          <User className="h-4 w-4 text-muted-foreground" />
                       </div>
                       <span className="text-sm font-medium">Meu Perfil</span>
                     </Link>
                   </DropdownMenuItem>
                   
                   <DropdownMenuItem asChild>
                     <Link href="/configuracoes" className="flex items-center gap-3 px-3 py-2.5 rounded-xl cursor-pointer transition-all hover:bg-muted group">
                       <div className="w-8 h-8 rounded-lg bg-muted flex items-center justify-center group-hover:bg-muted-foreground/10 transition-colors">
                          <Settings className="h-4 w-4 text-muted-foreground" />
                       </div>
                       <span className="text-sm font-medium">Configurações</span>
                     </Link>
                   </DropdownMenuItem>
                   
                   <DropdownMenuSeparator className="mx-2 opacity-50" />
                   
                   <DropdownMenuItem onClick={logout} className="flex items-center gap-3 px-3 py-2.5 rounded-xl cursor-pointer transition-all hover:bg-destructive/5 group text-destructive focus:text-destructive focus:bg-destructive/5">
                     <div className="w-8 h-8 rounded-lg bg-destructive/10 flex items-center justify-center group-hover:bg-destructive/20 transition-colors">
                        <LogOut className="h-4 w-4" />
                     </div>
                     <span className="text-sm font-bold">Sair da Conta</span>
                   </DropdownMenuItem>
                 </DropdownMenuContent>
               </DropdownMenu>
            ) : (
               <Link href="/auth/login">
                  <Button variant="default" size="sm">Entrar</Button>
               </Link>
            )}
          </div>

          <Sheet>
            <SheetTrigger asChild>
              <Button variant="ghost" size="icon" className="md:hidden">
                <Menu className="h-5 w-5" />
              </Button>
            </SheetTrigger>
            <SheetContent side="left" className="w-[300px] border-r border-border/40 bg-background/95 backdrop-blur-xl p-0 flex flex-col">
              <SheetHeader className="p-6 text-left border-b border-border/40 shrink-0">
                <div className="flex items-center justify-between">
                  <SheetTitle className="font-black uppercase tracking-tight flex items-center gap-2">
                    {navMode === 'admin' ? 'Gestão Admin' : 'Navegação'}
                  </SheetTitle>
                  {user?.role === 'ADMIN' && (
                    <div className="flex bg-muted/50 p-1 rounded-xl border border-border/40 scale-90 origin-right">
                      <button 
                        onClick={() => setNavMode('app')}
                        className={cn(
                          "px-3 py-1.5 rounded-lg text-[10px] font-black uppercase tracking-widest transition-all cursor-pointer",
                          navMode === 'app' ? "bg-background text-primary shadow-sm" : "text-muted-foreground opacity-50"
                        )}
                      >
                        App
                      </button>
                      <button 
                        onClick={() => setNavMode('admin')}
                        className={cn(
                          "px-3 py-1.5 rounded-lg text-[10px] font-black uppercase tracking-widest transition-all cursor-pointer",
                          navMode === 'admin' ? "bg-primary text-primary-foreground shadow-sm" : "text-muted-foreground opacity-50"
                        )}
                      >
                        Admin
                      </button>
                    </div>
                  )}
                </div>
              </SheetHeader>
              
              <div 
                className="flex-1 min-h-0 overflow-y-auto pl-4 pr-3 py-4 custom-scrollbar"
                onScroll={handleScroll}
              >
                <div className="flex flex-col gap-1">
                  {(navMode === 'app' ? allNavItems : adminNavItems).map((item) => {
                      const Icon = item.icon
                      const isActive = pathname === item.href
                      return (
                        <SheetClose key={item.href} asChild>
                            <Link 
                              href={item.href}
                              className={cn(
                                  "flex items-center gap-4 px-4 py-3 rounded-2xl transition-all",
                                  isActive 
                                    ? "bg-primary text-primary-foreground font-bold shadow-lg shadow-primary/20" 
                                    : "hover:bg-primary/10 text-muted-foreground hover:text-primary"
                              )}
                            >
                                <Icon className="h-5 w-5" />
                                <span className="text-sm font-medium">{item.name}</span>
                            </Link>
                        </SheetClose>
                      )
                  })}
                </div>
              </div>

              {/* Scroll Indicator */}
              {showScrollIndicator && (
                <div className="flex justify-center h-4 shrink-0 opacity-40 animate-bounce mb-1">
                  <ChevronDown className="h-5 w-5 text-primary" />
                </div>
              )}

              {user && (
                <div className="mt-auto p-4 shrink-0 animate-in fade-in slide-in-from-bottom-4 duration-500">
                  <div className="bg-muted/5 backdrop-blur-sm rounded-[32px] border border-border/60 p-5 relative overflow-hidden group">
                    {/* Linha de brilho superior sutil */}
                    <div className="absolute top-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-primary/20 to-transparent" />
                    
                    {/* User Identity */}
                    <div className="flex items-center gap-4 mb-5">
                      <div className="relative">
                        <Avatar className="h-12 w-12 border-2 border-primary/20 shadow-sm transition-transform group-hover:scale-105 duration-300">
                          <AvatarImage src={getAbsoluteUrl(user.avatar_url) || ""} alt={user.name} />
                          <AvatarFallback className="bg-avatar-premium text-primary font-black text-sm">
                              {user.name.charAt(0).toUpperCase()}
                          </AvatarFallback>
                        </Avatar>
                        <div className="absolute -bottom-0.5 -right-0.5 w-4 h-4 bg-emerald-500 border-2 border-background rounded-full" />
                      </div>
                      <div className="flex flex-col min-w-0">
                        <p className="text-sm font-black tracking-tight leading-none truncate mb-1.5">{user.name}</p>
                        <span className={cn(
                          "text-[8px] w-fit font-black uppercase tracking-[0.2em] px-2 py-0.5 rounded-full border transition-colors",
                          user.plan === 'COMMON' 
                            ? "bg-zinc-500/10 text-zinc-500 border-zinc-200 dark:border-zinc-800" 
                            : "bg-primary/10 text-primary border-primary/30 shadow-sm group-hover:bg-primary/20"
                        )}>
                          {user.plan}
                        </span>
                      </div>
                    </div>

                    {/* Quick Actions Grid */}
                    <div className="grid grid-cols-2 gap-2.5 mb-4">
                      <SheetClose asChild>
                        <Link href="/perfil" className="flex flex-col items-center justify-center gap-2 p-3 rounded-2xl bg-muted/10 border border-border/40 hover:bg-primary/5 hover:border-primary/30 transition-all group/item">
                          <User className="h-4 w-4 text-muted-foreground group-hover/item:text-primary transition-colors" />
                          <span className="text-[9px] font-black uppercase tracking-[0.15em] opacity-50 group-hover/item:opacity-100 transition-opacity">Perfil</span>
                        </Link>
                      </SheetClose>
                      <SheetClose asChild>
                        <Link href="/configuracoes" className="flex flex-col items-center justify-center gap-2 p-3 rounded-2xl bg-muted/10 border border-border/40 hover:bg-primary/5 hover:border-primary/30 transition-all group/item">
                          <Settings className="h-4 w-4 text-muted-foreground group-hover/item:text-primary transition-colors" />
                          <span className="text-[9px] font-black uppercase tracking-[0.15em] opacity-50 group-hover/item:opacity-100 transition-opacity">Ajustes</span>
                        </Link>
                      </SheetClose>
                    </div>

                    {/* Admin and Logout */}
                    <div className="space-y-2">
                      {user.role === "ADMIN" && (
                        <SheetClose asChild>
                          <Link href="/admin/dashboard" className="flex items-center justify-center gap-2 w-full py-2.5 rounded-xl bg-primary/10 text-primary hover:bg-primary/20 transition-all border border-primary/20 group/admin">
                            <LayoutDashboard className="h-3.5 w-3.5 group-hover/admin:scale-110 transition-transform" />
                            <span className="text-[10px] font-black uppercase tracking-widest">Painel Admin</span>
                          </Link>
                        </SheetClose>
                      )}
                      
                      <Button 
                        variant="ghost" 
                        onClick={logout}
                        className="w-full h-10 rounded-xl text-destructive hover:bg-destructive/5 hover:text-destructive flex items-center justify-center gap-2 group/logout transition-all border border-transparent hover:border-destructive/20"
                      >
                        <LogOut className="h-3.5 w-3.5 group-hover/logout:-translate-x-1 transition-transform" />
                        <span className="text-[10px] font-black uppercase tracking-widest">Sair da Conta</span>
                      </Button>
                    </div>
                  </div>
                </div>
              )}
            </SheetContent>
          </Sheet>
        </div>
      </div>
    </header>
  )
}
