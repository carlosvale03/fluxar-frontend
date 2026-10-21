"use client"

import { ResponsiveContainer, PieChart, Pie, Cell, Tooltip } from "recharts"

import { formatarMoeda } from "@/lib/dinheiro"

import { CaixaDoTooltip, LinhaDoTooltip } from "./partes-do-grafico"

export interface FatiaDaRosca {
  chave: string
  nome: string
  // Texto decimal da API ("100.10"), mostrado com o formatador único
  valor: string | number
  centavos: number
  // Cor do dado do usuário (categoria, classe, tag) ou da série do tema
  cor: string
  // Texto extra no tooltip e na lista ("60,0%")
  extra?: string
  // Nome acessível do botão da linha; sem ele, o texto visível nomeia
  rotulo?: string
  testIdDaCor?: string
  aoClicar: () => void
}

interface RoscaDeDistribuicaoProps {
  fatias: FatiaDaRosca[]
  // Total já formatado, no centro da rosca
  total: string
  rotuloDoTotal?: string
}

// AZ-23 e AZ-29 (DESIGN.md §6): a rosca das distribuições por categoria,
// classe e tag, com a lista ao lado. Cada linha da lista é um botão, então o
// filtro que o clique abre também funciona pelo teclado.
export function RoscaDeDistribuicao({ fatias, total, rotuloDoTotal = "Total" }: RoscaDeDistribuicaoProps) {
  // O Recharts precisa de número: a conversão é só para plotar
  const dadosDoGrafico = fatias.map((fatia) => ({ ...fatia, plotado: fatia.centavos / 100 }))

  return (
    <>
      <div className="relative h-[220px] w-full sm:h-[250px] sm:flex-1 lg:h-[280px]" style={{ minWidth: 0 }}>
        <ResponsiveContainer width="100%" height="100%" minWidth={0}>
          <PieChart>
            <Pie
              data={dadosDoGrafico}
              cx="50%"
              cy="50%"
              innerRadius="68%"
              outerRadius="90%"
              paddingAngle={2}
              dataKey="plotado"
              nameKey="nome"
              stroke="var(--az-surface)"
              strokeWidth={2}
            >
              {fatias.map((fatia) => (
                <Cell
                  key={fatia.chave}
                  fill={fatia.cor}
                  className="cursor-pointer outline-none transition-opacity duration-fast hover:opacity-80"
                  onClick={fatia.aoClicar}
                />
              ))}
            </Pie>
            <Tooltip
              wrapperStyle={{ zIndex: 100 }}
              content={({ active, payload }) => {
                if (active && payload && payload.length) {
                  const fatia = payload[0].payload as FatiaDaRosca
                  return (
                    <CaixaDoTooltip>
                      <LinhaDoTooltip
                        cor={fatia.cor}
                        nome={fatia.nome}
                        valor={fatia.extra ? `${formatarMoeda(fatia.valor)} · ${fatia.extra}` : formatarMoeda(fatia.valor)}
                      />
                    </CaixaDoTooltip>
                  )
                }
                return null
              }}
            />
          </PieChart>
        </ResponsiveContainer>
        <div className="pointer-events-none absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 text-center">
          <span className="label block text-muted-foreground">{rotuloDoTotal}</span>
          <span className="value-m block">{total}</span>
        </div>
      </div>
      <ul className="custom-scrollbar mt-4 max-h-[250px] w-full shrink-0 space-y-0.5 overflow-y-auto pr-2 sm:mt-0 sm:w-[180px] lg:w-[240px]">
        {fatias.map((fatia) => (
          <li key={fatia.chave}>
            <button
              type="button"
              onClick={fatia.aoClicar}
              aria-label={fatia.rotulo}
              className="group flex w-full items-center justify-between gap-2 rounded-sm px-2 py-1.5 text-left transition-colors duration-fast hover:bg-elevated focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
            >
              <span className="flex min-w-0 items-center gap-2">
                <span
                  data-testid={fatia.testIdDaCor}
                  aria-hidden="true"
                  className="h-2 w-2 shrink-0 rounded-full"
                  style={{ backgroundColor: fatia.cor }}
                />
                <span className="truncate text-sm text-fg-secondary group-hover:text-foreground">{fatia.nome}</span>
              </span>
              <span className="flex shrink-0 flex-col items-end">
                <span className="value-m">{formatarMoeda(fatia.valor)}</span>
                {fatia.extra && <span className="text-xs text-muted-foreground">{fatia.extra}</span>}
              </span>
            </button>
          </li>
        ))}
      </ul>
    </>
  )
}
