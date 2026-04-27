import Link from "next/link"

export function Footer() {
  const currentYear = new Date().getFullYear();

  return (
    <footer className="w-full border-t border-border/40 bg-background py-8">
      <div className="container mx-auto flex flex-col items-center justify-between gap-4 md:flex-row px-4">
        <p className="text-xs font-medium text-muted-foreground/60">
          © {currentYear} <span className="font-bold text-muted-foreground/80">Fluxar</span>. Todos os direitos reservados.
        </p>
        <nav className="flex items-center gap-6">
          <Link href="/sobre" className="text-[10px] font-black uppercase tracking-widest text-muted-foreground/40 hover:text-primary transition-colors">Sobre Nós</Link>
          <Link href="/termos" className="text-[10px] font-black uppercase tracking-widest text-muted-foreground/40 hover:text-primary transition-colors">Termos & Privacidade</Link>
        </nav>
      </div>
    </footer>
  )
}
