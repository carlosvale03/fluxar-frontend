"use client"

import { useId, useState } from "react"
import { ChevronDown, Info } from "lucide-react"

import { Button } from "@/components/ui/button"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import { EXPLICACOES_DOS_MODELOS, explicacaoDaParte, type FonteDoModelo } from "@/lib/explicacoes-dos-modelos"
import { cn } from "@/lib/utils"

function Fonte({ fonte }: { fonte: FonteDoModelo }) {
  return (
    <p className="text-xs text-muted-foreground">
      Fonte: {fonte.autores}, <em>{fonte.obra}</em> ({fonte.ano})
    </p>
  )
}

// SALARIO-57: "Como funciona" na escolha do modelo abre o que o modelo e cada
// parte significam, com a obra de origem
export function ComoFunciona({ codigo, className }: { codigo: string; className?: string }) {
  const [aberto, setAberto] = useState(false)
  const id = useId()
  const explicacao = EXPLICACOES_DOS_MODELOS[codigo]
  if (!explicacao) return null

  return (
    <div className={className}>
      <Button
        type="button"
        variant="ghost"
        className="-ml-3 h-10 rounded-xl px-3 text-sm"
        aria-expanded={aberto}
        aria-controls={id}
        onClick={() => setAberto((atual) => !atual)}
      >
        Como funciona
        <ChevronDown aria-hidden className={cn("motion-safe:transition-transform motion-safe:duration-200", aberto && "rotate-180")} />
      </Button>
      <div id={id} hidden={!aberto} className="mt-1 space-y-2 border-l-2 border-border pl-3 text-sm">
        <p>{explicacao.descricao}</p>
        {explicacao.partes.length > 0 && (
          <ul className="space-y-1.5">
            {explicacao.partes.map((parte) => (
              <li key={parte.nome}>
                <span className="font-medium">
                  {parte.nome} ({parte.percentual}%):
                </span>{" "}
                <span className="text-muted-foreground">{parte.significado}</span>
              </li>
            ))}
          </ul>
        )}
        {explicacao.fonte && <Fonte fonte={explicacao.fonte} />}
      </div>
    </div>
  )
}

// SALARIO-57: ao lado de uma parte com o nome de uma parte conhecida, o botão
// abre o que ela significa e a obra de origem
export function SobreAParte({
  nome,
  codigoDoModelo,
  className,
}: {
  nome: string
  codigoDoModelo?: string | null
  className?: string
}) {
  const explicacao = explicacaoDaParte(nome, codigoDoModelo)
  if (!explicacao) return null
  const { parte, modelo } = explicacao

  return (
    <Popover>
      <PopoverTrigger asChild>
        <Button
          type="button"
          variant="ghost"
          size="icon"
          className={cn("h-10 w-10 shrink-0 rounded-xl text-muted-foreground hover:text-foreground", className)}
          aria-label={`O que é ${nome.trim()}`}
        >
          <Info aria-hidden />
        </Button>
      </PopoverTrigger>
      <PopoverContent aria-label={`Sobre ${parte.nome}`} className="w-80 max-w-[calc(100vw-2rem)] space-y-2 rounded-xl text-sm">
        <p className="font-medium">{parte.nome}</p>
        <p className="text-muted-foreground">{parte.significado}</p>
        <p className="text-xs text-muted-foreground">
          Parte do modelo {modelo.nome}, com {parte.percentual}% do salário.
        </p>
        {modelo.fonte && <Fonte fonte={modelo.fonte} />}
      </PopoverContent>
    </Popover>
  )
}
