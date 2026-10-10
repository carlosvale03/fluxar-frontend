"use client"

import { forwardRef, useState } from "react"
import { toast } from "sonner"

import { Button } from "@/components/ui/button"
import { Checkbox } from "@/components/ui/checkbox"
import { Skeleton } from "@/components/ui/skeleton"
import { tratarErro } from "@/lib/erros"
import { cn } from "@/lib/utils"
import { salarioService } from "@/services/salario"
import type { Category } from "@/types/categories"
import type { PlanoDoSalario } from "@/types/salario"

interface ReceitasDoSalarioProps {
  // Categorias de receita ativas, raízes com as subcategorias; null carregando
  categorias: Category[] | null
  // Categorias de salário salvas; null enquanto o plano carrega
  salvas: string[] | null
  onSalvas: (plano: PlanoDoSalario) => void
}

const mesmas = (a: string[], b: string[]) => a.length === b.length && a.every((id) => b.includes(id))

// SALARIO-14: as categorias de receita que contam como salário, escolhidas a
// qualquer momento, com ou sem plano. Grava só as categorias.
export const ReceitasDoSalario = forwardRef<HTMLElement, ReceitasDoSalarioProps>(function ReceitasDoSalario(
  { categorias, salvas, onSalvas },
  ref,
) {
  return (
    <section
      ref={ref}
      tabIndex={-1}
      aria-labelledby="receitas-do-salario-titulo"
      className="rounded-2xl border border-border bg-card p-5 space-y-4 scroll-mt-24 outline-none"
    >
      <div className="space-y-1">
        <h2 id="receitas-do-salario-titulo" className="text-base font-semibold">
          Receitas de salário
        </h2>
        <p className="text-sm text-muted-foreground">As receitas nestas categorias aparecem para dividir.</p>
      </div>
      {categorias === null || salvas === null ? (
        <div className="space-y-2">
          <Skeleton className="h-6 w-2/3 rounded-md" />
          <Skeleton className="h-6 w-1/2 rounded-md" />
        </div>
      ) : (
        // A chave recomeça a escolha quando as categorias salvas mudam
        <Escolha key={salvas.join(",")} categorias={categorias} salvas={salvas} onSalvas={onSalvas} />
      )}
    </section>
  )
})

function Escolha({ categorias, salvas, onSalvas }: { categorias: Category[]; salvas: string[]; onSalvas: (plano: PlanoDoSalario) => void }) {
  const [marcadas, setMarcadas] = useState<string[]>(salvas)
  const [salvando, setSalvando] = useState(false)
  const lista = categorias.flatMap((categoria) => [
    categoria,
    ...(categoria.subcategories ?? []).filter((sub) => sub.is_active !== false),
  ])
  const mudou = !mesmas(marcadas, salvas)

  const alternar = (id: string, marcada: boolean) =>
    setMarcadas((atuais) => (marcada ? [...atuais, id] : atuais.filter((c) => c !== id)))

  const salvar = async () => {
    setSalvando(true)
    try {
      const plano = await salarioService.salvarCategorias(marcadas)
      toast.success("Receitas de salário salvas.")
      onSalvas(plano)
    } catch (erro) {
      tratarErro(erro, { mensagemPadrao: "Erro ao salvar as receitas de salário." })
    } finally {
      setSalvando(false)
    }
  }

  if (lista.length === 0) {
    return <p className="text-sm text-muted-foreground">Você ainda não tem categorias de receita.</p>
  }

  return (
    <div className="space-y-4">
      <ul className="space-y-0.5" aria-label="Categorias de salário">
        {lista.map((categoria) => {
          const id = `categoria-do-salario-${categoria.id}`
          return (
            <li key={categoria.id} className={cn(categoria.parent && "pl-6")}>
              <label
                htmlFor={id}
                className="flex min-h-10 cursor-pointer items-center gap-3 rounded-lg px-2 text-sm hover:bg-muted/50"
              >
                <Checkbox
                  id={id}
                  checked={marcadas.includes(categoria.id)}
                  onCheckedChange={(marcada) => alternar(categoria.id, marcada === true)}
                />
                <span>{categoria.name}</span>
              </label>
            </li>
          )
        })}
      </ul>
      <div className="flex items-center justify-between gap-3">
        <p className="text-xs text-muted-foreground tabular-nums">
          {marcadas.length === 0
            ? "Nenhuma marcada"
            : `${marcadas.length} ${marcadas.length === 1 ? "marcada" : "marcadas"}`}
        </p>
        <Button variant="outline" className="h-10 rounded-xl px-4" disabled={!mudou || salvando} loading={salvando} onClick={salvar}>
          Salvar
        </Button>
      </div>
    </div>
  )
}
