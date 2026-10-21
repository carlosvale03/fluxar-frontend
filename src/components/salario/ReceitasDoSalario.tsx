"use client"

import { forwardRef, useImperativeHandle, useRef, useState } from "react"
import { flushSync } from "react-dom"
import { ChevronDown } from "lucide-react"
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
  // Se há salário a dividir; null enquanto os salários carregam
  temSalarioADividir: boolean | null
  onSalvas: (plano: PlanoDoSalario) => void
}

// O que a página pode pedir ao painel: abrir e pôr o foco na primeira categoria
export interface PainelDeReceitas {
  abrir: () => void
}

const CONTEUDO = "receitas-do-salario-conteudo"

const mesmas = (a: string[], b: string[]) => a.length === b.length && a.every((id) => b.includes(id))

const listaDasCategorias = (categorias: Category[]) =>
  categorias.flatMap((categoria) => [categoria, ...(categoria.subcategories ?? []).filter((sub) => sub.is_active !== false)])

// SALARIO-14 e SALARIO-62: as categorias de receita que contam como salário,
// escolhidas a qualquer momento, com ou sem plano. Grava só as categorias. É
// uma configuração de uma vez: com categorias escolhidas e salário a dividir,
// a seção começa recolhida, com os nomes escolhidos e "Alterar"; ao salvar,
// recolhe.
export const ReceitasDoSalario = forwardRef<PainelDeReceitas, ReceitasDoSalarioProps>(function ReceitasDoSalario(
  { categorias, salvas, temSalarioADividir, onSalvas },
  ref,
) {
  const secao = useRef<HTMLElement>(null)
  const alternador = useRef<HTMLButtonElement>(null)
  // null segue o padrão; true ou false é a escolha do usuário
  const [abertoPeloUsuario, setAbertoPeloUsuario] = useState<boolean | null>(null)
  const carregando = categorias === null || salvas === null || temSalarioADividir === null
  const recolhidaPorPadrao = !carregando && salvas.length > 0 && temSalarioADividir
  const aberto = abertoPeloUsuario ?? !recolhidaPorPadrao

  useImperativeHandle(ref, () => ({
    abrir() {
      flushSync(() => setAbertoPeloUsuario(true))
      const painel = secao.current
      if (!painel) return
      const reduzido = window.matchMedia?.("(prefers-reduced-motion: reduce)").matches
      painel.scrollIntoView?.({ behavior: reduzido ? "auto" : "smooth", block: "start" })
      const alvo = painel.querySelector<HTMLElement>('[role="checkbox"]') ?? painel
      alvo.focus({ preventScroll: true })
    },
  }))

  // Salvo, a seção recolhe e o foco fica no "Alterar"
  const salvou = (plano: PlanoDoSalario) => {
    onSalvas(plano)
    flushSync(() => setAbertoPeloUsuario(false))
    alternador.current?.focus()
  }

  const nomes = listaDasCategorias(categorias ?? [])
    .filter((c) => salvas?.includes(c.id))
    .map((c) => c.name)
  const escolhidas = !salvas?.length
    ? "Nenhuma receita escolhida"
    : nomes.length
      ? nomes.join(", ")
      : `${salvas.length} ${salvas.length === 1 ? "categoria" : "categorias"}`

  return (
    <section
      ref={secao}
      tabIndex={-1}
      aria-labelledby="receitas-do-salario-titulo"
      className="rounded-lg border border-border bg-card p-5 space-y-4 scroll-mt-24 outline-none"
    >
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0 space-y-1">
          <h2 id="receitas-do-salario-titulo" className="display-s">
            Receitas de salário
          </h2>
          {aberto || carregando ? (
            <p className="text-sm text-muted-foreground">As receitas nestas categorias aparecem para dividir.</p>
          ) : (
            <p className={cn("text-sm", salvas?.length ? "text-foreground" : "text-muted-foreground")}>{escolhidas}</p>
          )}
        </div>
        {!carregando && (
          <Button
            ref={alternador}
            variant="ghost"
            className="-mr-2 -mt-2 h-10 shrink-0 rounded-md px-3"
            aria-expanded={aberto}
            aria-controls={CONTEUDO}
            aria-label={aberto ? "Recolher receitas de salário" : "Alterar receitas de salário"}
            onClick={() => setAbertoPeloUsuario(!aberto)}
          >
            {aberto ? "Recolher" : "Alterar"}
            <ChevronDown
              aria-hidden
              className={cn("motion-safe:transition-transform motion-safe:duration-base", aberto && "rotate-180")}
            />
          </Button>
        )}
      </div>
      {carregando ? (
        <div className="space-y-2">
          <Skeleton className="h-6 w-2/3 rounded-md" />
          <Skeleton className="h-6 w-1/2 rounded-md" />
        </div>
      ) : (
        <div id={CONTEUDO} hidden={!aberto}>
          {/* A chave recomeça a escolha quando as categorias salvas mudam */}
          <Escolha key={salvas.join(",")} categorias={categorias} salvas={salvas} onSalvas={salvou} />
        </div>
      )}
    </section>
  )
})

function Escolha({ categorias, salvas, onSalvas }: { categorias: Category[]; salvas: string[]; onSalvas: (plano: PlanoDoSalario) => void }) {
  const lista = listaDasCategorias(categorias)
  // SALARIO-14: uma categoria salva que foi inativada não está na lista nem
  // vai no envio, que o backend recusaria
  const ativa = (id: string) => lista.some((c) => c.id === id)
  const ativas = salvas.filter(ativa)
  const [marcadas, setMarcadas] = useState<string[]>(ativas)
  const [salvando, setSalvando] = useState(false)
  const mudou = !mesmas(marcadas, ativas)

  const alternar = (id: string, marcada: boolean) =>
    setMarcadas((atuais) => (marcada ? [...atuais, id] : atuais.filter((c) => c !== id)))

  const salvar = async () => {
    setSalvando(true)
    try {
      const plano = await salarioService.salvarCategorias(marcadas.filter(ativa))
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
                className="flex min-h-10 cursor-pointer items-center gap-3 rounded-lg px-2 text-sm hover:bg-elevated"
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
        <Button variant="outline" className="h-10 rounded-md px-4" disabled={!mudou || salvando} loading={salvando} onClick={salvar}>
          Salvar
        </Button>
      </div>
    </div>
  )
}
