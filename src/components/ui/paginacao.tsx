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
    <div className="flex flex-col sm:flex-row items-center justify-between p-4 gap-4 border-t border-border/40 bg-muted/10 w-full">
      <div className="text-[10px] font-black uppercase tracking-widest text-muted-foreground/60 w-full sm:w-auto text-center sm:text-left">
        {total} {rotulo}
      </div>
      <div className="flex items-center justify-center gap-2 w-full sm:w-auto">
        <Button
          variant="outline"
          size="sm"
          onClick={() => onMudarPagina(Math.max(1, pagina - 1))}
          disabled={pagina <= 1 || carregando}
          className="flex-1 sm:flex-none rounded-xl h-8 px-4 font-black text-[10px] uppercase tracking-widest"
        >
          <ChevronLeft className="h-3 w-3 mr-1" /> Ant.
        </Button>
        <div className="text-[10px] font-black uppercase tracking-widest px-4 border-x border-border/20 tabular-nums">
          {pagina} de {ultima}
        </div>
        <Button
          variant="outline"
          size="sm"
          onClick={() => onMudarPagina(Math.min(ultima, pagina + 1))}
          disabled={pagina >= ultima || carregando}
          className="flex-1 sm:flex-none rounded-xl h-8 px-4 font-black text-[10px] uppercase tracking-widest"
        >
          Próx. <ChevronRight className="h-3 w-3 ml-1" />
        </Button>
      </div>
    </div>
  )
}
