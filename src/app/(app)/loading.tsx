import { Skeleton } from "@/components/ui/skeleton"

// AZ-42: carregamento da troca de tela, com a forma do cabeçalho e de um bloco
export default function CarregandoATela() {
  return (
    <div className="container mx-auto space-y-6 px-4 py-8" aria-busy="true" aria-label="Carregando">
      <div className="space-y-2">
        <Skeleton className="h-8 w-56" />
        <Skeleton className="h-4 w-40" />
      </div>
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <Skeleton key={i} className="h-24" />
        ))}
      </div>
      <Skeleton className="h-72" />
    </div>
  )
}
