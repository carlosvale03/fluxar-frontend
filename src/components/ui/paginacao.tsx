"use client"

import { ChevronLeft, ChevronRight } from "lucide-react"

import { Button } from "@/components/ui/button"

interface PaginacaoProps {
  pagina: number
  totalDePaginas: number
  total: number
  // "registros", "transações"...
  rotulo: string
  carregando?: boolean
  onMudarPagina: (pagina: number) => void
}

// CONTRATO-05: lista paginada mostra o total de itens e os controles de página
export function Paginacao({ pagina, totalDePaginas, total, rotulo, carregando = false, onMudarPagina }: PaginacaoProps) {
  const ultima = Math.max(1, totalDePaginas)

  return (
    <div className="flex w-full flex-col items-center justify-between gap-3 border-t border-border p-4 sm:flex-row">
      <div className="label w-full text-center text-muted-foreground sm:w-auto sm:text-left">
        {total} {rotulo}
      </div>
      <div className="flex items-center justify-center gap-2 w-full sm:w-auto">
        <Button
          variant="outline"
          size="sm"
          onClick={() => onMudarPagina(Math.max(1, pagina - 1))}
          disabled={pagina <= 1 || carregando}
          className="flex-1 sm:flex-none"
        >
          <ChevronLeft aria-hidden="true" /> Anterior
        </Button>
        <div className="value-m px-3 text-muted-foreground">
          {pagina} de {ultima}
        </div>
        <Button
          variant="outline"
          size="sm"
          onClick={() => onMudarPagina(Math.min(ultima, pagina + 1))}
          disabled={pagina >= ultima || carregando}
          className="flex-1 sm:flex-none"
        >
          Próxima <ChevronRight aria-hidden="true" />
        </Button>
      </div>
    </div>
  )
}
