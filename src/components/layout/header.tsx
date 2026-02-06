"use client"

import Link from "next/link"
import Image from "next/image"
import { ThemeToggle } from "@/components/theme-toggle"
import { Button } from "@/components/ui/button"
import { User, Menu, LogOut, Loader2 } from "lucide-react"
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

import { usePathname } from "next/navigation"
import { getAbsoluteUrl, cn } from "@/lib/utils"

export function Header() {
  const { user, logout, isLoading } = useAuth()
  const pathname = usePathname()

  const navItems = [
    { name: "Dashboard", href: "/dashboard" },
    { name: "Contas", href: "/contas" },
    { name: "Cartões", href: "/cartoes" },
    { name: "Calendário", href: "/calendario" },
    { name: "Transações", href: "/transacoes" },
    { name: "Orçamentos", href: "/orcamentos" },
    { name: "Gráficos", href: "/relatorios" },
    { name: "Categorias", href: "/categorias" },
    { name: "Tags", href: "/tags" },
  ]

  return (
    <header className="sticky top-0 z-40 w-full border-b border-border bg-background/80 backdrop-blur-md">
      <div className="container mx-auto flex h-16 items-center justify-between px-4">
        <div className="flex items-center gap-6">
          <Link href="/" className="flex items-center gap-2">
            <div className="relative h-10 w-40 hidden dark:block">
               <Image 
                src="/logo/logo-dark-clean-1630x700.png" 
                alt="Fluxar Logo" 
                fill
                sizes="(max-width: 768px) 160px, 160px"
                className="object-contain object-left"
                priority
              />
            </div>
            <div className="relative h-10 w-40 dark:hidden">
               <Image 
                src="/logo/logo-light-clean-1630x700.png" 
                alt="Fluxar Logo" 
                fill
                sizes="(max-width: 768px) 160px, 160px"
                className="object-contain object-left"
                priority
              />
            </div>
          </Link>

          <nav className="hidden md:flex items-center gap-2 text-sm font-medium">
            {navItems.map((item) => {
              const isActive = pathname === item.href
              return (
                <Link 
                  key={item.href}
                  href={item.href} 
                  className={cn(
                    "relative px-3 py-2 transition-all duration-300 rounded-lg hover:bg-muted/50",
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
          </nav>
        </div>

        <div className="flex items-center gap-4">
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
                   <DropdownMenuItem asChild>
                     <Link href="/perfil">Perfil</Link>
                   </DropdownMenuItem>
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

          <Button variant="ghost" size="icon" className="md:hidden">
            <Menu className="h-5 w-5" />
          </Button>
        </div>
      </div>
    </header>
  )
}
