"use client"

import Link from "next/link"
import Image from "next/image"
import { ThemeToggle } from "@/components/theme-toggle"
import { Button } from "@/components/ui/button"
import { 
  User, Menu, LogOut, Loader2, MoreHorizontal, 
  LayoutDashboard, Wallet, CreditCard, ArrowRightLeft, 
  BarChart3, Calendar, Repeat, PieChart, ArrowUpDown, 
  Layers, Tag, Target
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
          <ThemeToggle />
          
          <div className="hidden md:flex items-center gap-2">
            {isLoading ? (
               <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
            ) : user ? (
               <DropdownMenu>
                 <DropdownMenuTrigger asChild>
                   <Button variant="ghost" className="relative h-8 w-8 rounded-full">
                      <Avatar className="h-8 w-8">
                        <AvatarImage src={getAbsoluteUrl(user.avatar_url) || ""} alt={user.name} />
                        <AvatarFallback>
                           {user.name.charAt(0).toUpperCase()}
                        </AvatarFallback>
                      </Avatar>
                   </Button>
                 </DropdownMenuTrigger>
                 <DropdownMenuContent className="w-56" align="end" forceMount>
                   <DropdownMenuLabel className="font-normal">
                     <div className="flex flex-col space-y-1">
                       <p className="text-sm font-medium leading-none">{user.name}</p>
                       <p className="text-xs leading-none text-muted-foreground">
                         {user.email}
                       </p>
                     </div>
                   </DropdownMenuLabel>
                   <DropdownMenuSeparator />
                   {user.role === "ADMIN" && (
                     <DropdownMenuItem asChild>
                       <Link href="/admin/dashboard" className="font-bold text-primary">
                         Painel Admin
                       </Link>
                     </DropdownMenuItem>
                   )}
                   <DropdownMenuItem asChild>
                     <Link href="/perfil">Perfil</Link>
                   </DropdownMenuItem>
                   <DropdownMenuItem asChild>
                     <Link href="/configuracoes">Configurações</Link>
                   </DropdownMenuItem>
                   <DropdownMenuSeparator />
                   <DropdownMenuItem onClick={logout} className="text-red-500 focus:text-red-500">
                     <LogOut className="mr-2 h-4 w-4" />
                     <span>Sair</span>
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
            <SheetContent side="left" className="w-[300px] border-r border-border/40 bg-background/95 backdrop-blur-xl p-0">
              <SheetHeader className="p-6 text-left border-b border-border/40">
                <SheetTitle className="font-black uppercase tracking-tight flex items-center gap-2">
                   Menu de Navegação
                </SheetTitle>
              </SheetHeader>
              <div className="flex flex-col gap-1 p-4">
                 {allNavItems.map((item) => {
                    const Icon = item.icon
                    const isActive = pathname === item.href
                    return (
                       <SheetClose key={item.href} asChild>
                          <Link 
                             href={item.href}
                             className={cn(
                                "flex items-center gap-4 px-4 py-3 rounded-2xl transition-all",
                                isActive ? "bg-primary text-primary-foreground font-bold shadow-lg shadow-primary/20" : "hover:bg-muted text-muted-foreground hover:text-foreground"
                             )}
                          >
                             <Icon className="h-5 w-5" />
                             <span className="text-sm font-medium">{item.name}</span>
                          </Link>
                       </SheetClose>
                    )
                 })}
              </div>
            </SheetContent>
          </Sheet>
        </div>
      </div>
    </header>
  )
}
