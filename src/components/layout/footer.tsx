export function Footer() {
  return (
    <footer className="border-t border-border bg-neutral-50 dark:bg-neutral-900/50">
      <div className="container mx-auto flex flex-col items-center justify-between gap-4 py-10 md:h-16 md:flex-row md:py-0 px-4">
        <p className="text-center text-sm leading-loose text-muted-foreground md:text-left">
          © 2025 Fluxar. Todos os direitos reservados.
        </p>
        <div className="flex items-center gap-4 text-sm text-muted-foreground">
          <a href="#" className="hover:underline hover:text-primary">Termos</a>
          <a href="#" className="hover:underline hover:text-primary">Privacidade</a>
        </div>
      </div>
    </footer>
  )
}
