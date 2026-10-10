import { textoDoPercentual, type BarraDaDivisao as Barra } from "@/lib/salario"
import { cn } from "@/lib/utils"

// Seis matizes bem distintos, no claro e no escuro; da sétima parte em
// diante as cores se repetem. O cinza fica para o livre.
const CORES = ["bg-sky-500", "bg-amber-400", "bg-violet-500", "bg-emerald-500", "bg-rose-500", "bg-lime-300"]
export const COR_DO_LIVRE = "bg-muted-foreground/30"

export const corDaParte = (indice: number) => CORES[indice % CORES.length]

export function PontoDaCor({ className }: { className: string }) {
  return <span aria-hidden className={cn("inline-block h-2.5 w-2.5 shrink-0 rounded-full", className)} />
}

// A divisão como uma barra de 100%, uma fatia por parte na ordem do plano e
// o livre em cinza. A descrição em texto vai para quem usa leitor de tela.
export function BarraDaDivisao({ barra, className }: { barra: Barra; className?: string }) {
  const visiveis = barra.fatias.filter((f) => f.centesimos > 0)
  const descricao = [
    ...visiveis.map((f) => `${f.nome || "Parte sem nome"} ${textoDoPercentual(f.centesimos)}`),
    ...(barra.livre > 0 ? [`Livre ${textoDoPercentual(barra.livre)}`] : []),
  ].join(", ")

  return (
    <div
      role="img"
      aria-label={`Divisão do salário: ${descricao}`}
      className={cn("flex h-3 w-full gap-0.5 overflow-hidden rounded-full bg-muted", className)}
    >
      {visiveis.map((fatia) => (
        <span
          key={fatia.indice}
          className={cn("h-full basis-0 motion-safe:transition-[flex-grow] motion-safe:duration-200", corDaParte(fatia.indice))}
          style={{ flexGrow: fatia.centesimos }}
        />
      ))}
      {barra.livre > 0 && (
        <span
          className={cn("h-full basis-0 motion-safe:transition-[flex-grow] motion-safe:duration-200", COR_DO_LIVRE)}
          style={{ flexGrow: barra.livre }}
        />
      )}
    </div>
  )
}
