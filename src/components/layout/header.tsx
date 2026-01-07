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

import { getAbsoluteUrl } from "@/lib/utils"

export function Header() {
  const { user, logout, isLoading } = useAuth()

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
                className="object-contain object-left"
                priority
              />
            </div>
            <div className="relative h-10 w-40 dark:hidden">
               <Image 
                src="/logo/logo-light-clean-1630x700.png" 
                alt="Fluxar Logo" 
                fill
                className="object-contain object-left"
                priority
              />
            </div>
          </Link>

          <nav className="hidden md:flex items-center gap-6 text-sm font-medium text-muted-foreground">
            <Link href="/dashboard" className="transition-colors hover:text-primary">
              Dashboard
            </Link>
            <Link href="/contas" className="transition-colors hover:text-primary">
              Contas
            </Link>
            <Link href="/cartoes" className="transition-colors hover:text-primary">
              Cartões
            </Link>
            <Link href="/transacoes" className="transition-colors hover:text-primary">
              Transações
            </Link>
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
