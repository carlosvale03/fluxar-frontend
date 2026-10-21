import Link from "next/link"
import { Compass } from "lucide-react"

import { Button } from "@/components/ui/button"

// AZ-42: endereço que não existe
export default function PaginaNaoEncontrada() {
  return (
    <div className="container mx-auto flex min-h-[60vh] items-center justify-center px-4 py-10">
      <div className="w-full max-w-md text-center">
        <div className="mx-auto mb-5 flex h-12 w-12 items-center justify-center rounded-full border border-border-strong bg-elevated">
          <Compass className="h-6 w-6 text-gold-line" aria-hidden="true" />
        </div>
        <p className="label mb-2 text-muted-foreground">Erro 404</p>
        <h1 className="display-l mb-2">Fora do mapa</h1>
        <p className="mb-6 text-sm text-muted-foreground">Este endereço não existe ou mudou de lugar.</p>
        <Button asChild>
          <Link href="/dashboard">Voltar para a Ponte de Comando</Link>
        </Button>
      </div>
    </div>
  )
}
