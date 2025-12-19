import Link from "next/link"
import Image from "next/image"
import { ThemeToggle } from "@/components/theme-toggle"
import { Button } from "@/components/ui/button"
import { User, Menu } from "lucide-react"

export function Header() {
  return (
    <header className="sticky top-0 z-40 w-full border-b border-border bg-background/80 backdrop-blur-md">
      <div className="container mx-auto flex h-16 items-center justify-between px-4">
        <div className="flex items-center gap-6">
          <Link href="/" className="flex items-center gap-2">
            {/* Logo image swapping handled by theme or CSS filters usually, 
                but here displaying the light version by default and handling dark via class or separated image if needed.
                For now using a generic container since Next.js Image source dynamic switching requires client side or CSS tricks.
             */}
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
          </nav>
        </div>

        <div className="flex items-center gap-4">
          <ThemeToggle />
          
          <div className="hidden md:flex items-center gap-2">
             <Button variant="ghost" size="icon" className="rounded-full">
                <User className="h-5 w-5" />
             </Button>
          </div>

          <Button variant="ghost" size="icon" className="md:hidden">
            <Menu className="h-5 w-5" />
          </Button>
        </div>
      </div>
    </header>
  )
}
