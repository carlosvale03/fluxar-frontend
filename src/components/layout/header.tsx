"use client"

import * as React from "react"
import Link from "next/link"
import { usePathname } from "next/navigation"
import { ChevronDown, Loader2, LogOut, MoreHorizontal, Settings, Sparkles, User, LayoutDashboard } from "lucide-react"

import { ThemeToggle } from "@/components/theme-toggle"
import { Logo } from "@/components/layout/logo"
import { Button } from "@/components/ui/button"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { Sheet, SheetClose, SheetContent, SheetDescription, SheetHeader, SheetTitle, SheetTrigger } from "@/components/ui/sheet"
import {
  NAVEGACAO_ADMIN,
  NAVEGACAO_MAIS,
  NAVEGACAO_PRINCIPAL,
  itemAtivo,
  semCasca,
  type ItemDeNavegacao,
} from "@/components/layout/navegacao"
import { useAuth } from "@/hooks/use-auth"
import { getAbsoluteUrl, cn } from "@/lib/utils"

type Usuario = NonNullable<ReturnType<typeof useAuth>["user"]>

function AvatarDoUsuario({ user, tamanho = "h-8 w-8" }: { user: Usuario; tamanho?: string }) {
  return (
    <Avatar className={cn(tamanho, "border border-border-strong")}>
      <AvatarImage src={getAbsoluteUrl(user.avatar_url) || ""} alt="" />
      <AvatarFallback className="bg-elevated font-mono text-xs text-foreground">
        {user.name.charAt(0).toUpperCase()}
      </AvatarFallback>
    </Avatar>
  )
}

interface ItemDaListaProps extends Omit<React.ComponentPropsWithoutRef<typeof Link>, "href"> {
  item: ItemDeNavegacao
  ativo: boolean
}

// Item da lista do menu "Mais" e do painel do celular: ícone, nome e linha de apoio.
// Repassa ref e props para o Link, porque é usado com asChild (menuitem do Radix, SheetClose).
const ItemDaLista = React.forwardRef<HTMLAnchorElement, ItemDaListaProps>(({ item, ativo, className, ...props }, ref) => {
  const Icone = item.icone
  return (
    <Link
      ref={ref}
      href={item.href}
      aria-current={ativo ? "page" : undefined}
      className={cn(
        "flex items-center gap-3 rounded-md px-3 py-2 transition-colors duration-fast",
        ativo ? "bg-elevated text-foreground" : "text-fg-secondary hover:bg-elevated hover:text-foreground",
        className
      )}
      {...props}
    >
      <Icone className={cn("h-4 w-4 shrink-0", ativo ? "text-gold-line" : "text-muted-foreground")} aria-hidden="true" />
      <span className="flex min-w-0 flex-col">
        <span className="text-sm">{item.nome}</span>
        <span className="truncate text-xs text-muted-foreground">{item.apoio}</span>
      </span>
    </Link>
  )
})
ItemDaLista.displayName = "ItemDaLista"

// AZ-21 (PRODUCT.md §4, D-12): cinco destinos na barra, o resto no menu "Mais",
// conta e saída no avatar. No celular, menu inferior com quatro destinos e "Mais".
export function Header() {
  const { user, logout, isLoading } = useAuth()
  const pathname = usePathname()

  if (semCasca(pathname)) return null

  const ativoPrincipal = itemAtivo(pathname, NAVEGACAO_PRINCIPAL)
  const ativoMais = itemAtivo(pathname, NAVEGACAO_MAIS)
  const ativoAdmin = itemAtivo(pathname, NAVEGACAO_ADMIN)
  const ehAdmin = user?.role === "ADMIN"

  return (
    <>
      <header className="sticky top-0 z-40 w-full border-b border-border bg-background">
        <div className="container mx-auto flex h-16 items-center gap-4 px-4">
          <div className="flex flex-1 items-center">
            <Link href="/" aria-label="Azimute, página inicial" className="flex items-center gap-2">
              <Logo tamanho={26} />
            </Link>
          </div>

          {user && (
            <nav aria-label="Navegação principal" className="hidden items-center gap-1 md:flex">
              {NAVEGACAO_PRINCIPAL.map((item) => {
                const ativo = ativoPrincipal === item.href
                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    title={item.apoio}
                    aria-current={ativo ? "page" : undefined}
                    className={cn(
                      "whitespace-nowrap rounded-md px-3 py-2 text-sm transition-colors duration-fast",
                      ativo
                        ? "bg-elevated text-foreground shadow-[inset_0_-2px_0_var(--az-gold)]"
                        : "text-fg-secondary hover:bg-elevated hover:text-foreground"
                    )}
                  >
                    {item.nome}
                  </Link>
                )
              })}

              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button
                    variant="ghost"
                    size="sm"
                    className={cn("h-9 gap-1", ativoMais && "bg-elevated text-foreground shadow-[inset_0_-2px_0_var(--az-gold)]")}
                  >
                    Mais
                    <ChevronDown aria-hidden="true" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="w-72">
                  {NAVEGACAO_MAIS.map((item) => (
                    <DropdownMenuItem key={item.href} asChild className="p-0">
                      <ItemDaLista item={item} ativo={ativoMais === item.href} />
                    </DropdownMenuItem>
                  ))}
                </DropdownMenuContent>
              </DropdownMenu>
            </nav>
          )}

          <div className="flex flex-1 items-center justify-end gap-2">
            <ThemeToggle />

            {isLoading ? (
              <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" aria-label="Carregando" />
            ) : user ? (
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="ghost" className="h-9 w-9 rounded-full p-0" aria-label="Menu da conta">
                    <AvatarDoUsuario user={user} />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent className="w-64" align="end">
                  <DropdownMenuLabel className="flex items-center gap-3 font-normal">
                    <AvatarDoUsuario user={user} tamanho="h-9 w-9" />
                    <span className="flex min-w-0 flex-col">
                      <span className="truncate text-sm font-semibold">{user.name}</span>
                      <span className="truncate text-xs text-muted-foreground">{user.email}</span>
                    </span>
                  </DropdownMenuLabel>
                  <DropdownMenuSeparator />
                  {ehAdmin && (
                    <DropdownMenuItem asChild>
                      <Link href="/admin/dashboard">
                        <LayoutDashboard aria-hidden="true" /> Painel Admin
                      </Link>
                    </DropdownMenuItem>
                  )}
                  <DropdownMenuItem asChild>
                    <Link href="/perfil">
                      <User aria-hidden="true" /> Meu Perfil
                    </Link>
                  </DropdownMenuItem>
                  {/* PERM-27: a página de planos */}
                  <DropdownMenuItem asChild>
                    <Link href="/planos">
                      <Sparkles aria-hidden="true" /> Planos
                    </Link>
                  </DropdownMenuItem>
                  <DropdownMenuItem asChild>
                    <Link href="/configuracoes">
                      <Settings aria-hidden="true" /> Configurações
                    </Link>
                  </DropdownMenuItem>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem onClick={logout} className="text-outflow focus:text-outflow">
                    <LogOut aria-hidden="true" /> Sair da Conta
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            ) : (
              <Button asChild size="sm">
                <Link href="/auth/login">Entrar</Link>
              </Button>
            )}
          </div>
        </div>
      </header>

      {user && (
        <nav
          aria-label="Navegação principal"
          className="fixed inset-x-0 bottom-0 z-40 grid grid-cols-5 border-t border-border bg-background pb-[env(safe-area-inset-bottom)] md:hidden"
        >
          {NAVEGACAO_PRINCIPAL.slice(0, 4).map((item) => {
            const Icone = item.icone
            const ativo = ativoPrincipal === item.href
            return (
              <Link
                key={item.href}
                href={item.href}
                aria-current={ativo ? "page" : undefined}
                className={cn(
                  "flex min-h-14 flex-col items-center justify-center gap-1 px-1 text-[11px] leading-tight transition-colors duration-fast",
                  ativo ? "text-foreground shadow-[inset_0_2px_0_var(--az-gold)]" : "text-muted-foreground"
                )}
              >
                <Icone className={cn("h-5 w-5", ativo && "text-gold-line")} aria-hidden="true" />
                <span className="text-center">{item.nome}</span>
              </Link>
            )
          })}

          <Sheet>
            <SheetTrigger asChild>
              <button
                type="button"
                aria-label="Mais módulos e conta"
                className={cn(
                  "flex min-h-14 cursor-pointer flex-col items-center justify-center gap-1 text-[11px] text-muted-foreground",
                  (ativoMais || ativoPrincipal === "/relatorios") && "text-foreground shadow-[inset_0_2px_0_var(--az-gold)]"
                )}
              >
                <MoreHorizontal className="h-5 w-5" aria-hidden="true" />
                Mais
              </button>
            </SheetTrigger>
            <SheetContent side="bottom" className="max-h-[85dvh] overflow-y-auto rounded-t-lg p-0">
              <SheetHeader className="border-b border-border p-4 text-left">
                <SheetTitle>Mais</SheetTitle>
                <SheetDescription>Os outros módulos, a sua conta e a saída.</SheetDescription>
              </SheetHeader>
              <div className="space-y-4 p-3">
                <div className="grid gap-1">
                  {[NAVEGACAO_PRINCIPAL[4], ...NAVEGACAO_MAIS].map((item) => (
                    <SheetClose key={item.href} asChild>
                      <ItemDaLista item={item} ativo={ativoMais === item.href || ativoPrincipal === item.href} />
                    </SheetClose>
                  ))}
                </div>

                {ehAdmin && (
                  <div className="grid gap-1 border-t border-border pt-3">
                    <p className="label px-3 text-muted-foreground">Administração</p>
                    {NAVEGACAO_ADMIN.map((item) => (
                      <SheetClose key={item.href} asChild>
                        <ItemDaLista item={item} ativo={ativoAdmin === item.href} />
                      </SheetClose>
                    ))}
                  </div>
                )}

                <div className="grid gap-1 border-t border-border pt-3">
                  <SheetClose asChild>
                    <ItemDaLista item={{ nome: "Meu Perfil", apoio: "Dados e foto", href: "/perfil", icone: User }} ativo={pathname === "/perfil"} />
                  </SheetClose>
                  <SheetClose asChild>
                    <ItemDaLista item={{ nome: "Planos", apoio: "O que cada plano libera", href: "/planos", icone: Sparkles }} ativo={pathname === "/planos"} />
                  </SheetClose>
                  <SheetClose asChild>
                    <ItemDaLista
                      item={{ nome: "Configurações", apoio: "Tema, segurança e privacidade", href: "/configuracoes", icone: Settings }}
                      ativo={pathname === "/configuracoes"}
                    />
                  </SheetClose>
                </div>

                <div className="border-t border-border pt-3">
                  <Button variant="destructive" className="w-full" onClick={logout}>
                    <LogOut aria-hidden="true" /> Sair da Conta
                  </Button>
                </div>
              </div>
            </SheetContent>
          </Sheet>
        </nav>
      )}
    </>
  )
}
