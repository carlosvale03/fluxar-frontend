"use client"

import { useSyncExternalStore } from "react"
import { User } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Skeleton } from "@/components/ui/skeleton"
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"
import { Logo } from "@/components/layout/logo"

// AZ-08: referência viva do sistema visual do Azimute (DESIGN.md). Os tokens
// são lidos do CSS, então a página mostra os valores do tema ativo.

const GRUPOS_DE_CORES: { titulo: string; tokens: [string, string][] }[] = [
  {
    titulo: "Superfícies",
    tokens: [
      ["canvas", "--az-canvas"],
      ["surface", "--az-surface"],
      ["elevated", "--az-elevated"],
    ],
  },
  {
    titulo: "Bordas",
    tokens: [
      ["border-subtle", "--az-border-subtle"],
      ["border-strong", "--az-border-strong"],
      ["border-input", "--az-border-input"],
    ],
  },
  {
    titulo: "Texto",
    tokens: [
      ["fg", "--az-text-primary"],
      ["fg-secondary", "--az-text-secondary"],
      ["fg-muted", "--az-text-muted"],
    ],
  },
  {
    titulo: "Ouro",
    tokens: [
      ["gold", "--az-gold"],
      ["gold-hover", "--az-gold-hover"],
      ["gold-line", "--az-gold-line"],
      ["gold-ink", "--az-gold-ink"],
    ],
  },
  {
    titulo: "Semânticas",
    tokens: [
      ["inflow", "--az-inflow"],
      ["outflow", "--az-outflow"],
      ["warn", "--az-warn"],
      ["info", "--az-info"],
    ],
  },
  {
    titulo: "Séries de gráfico",
    tokens: [
      ["serie-1", "--az-serie-1"],
      ["serie-2", "--az-serie-2"],
      ["serie-3", "--az-serie-3"],
      ["serie-4", "--az-serie-4"],
      ["serie-5", "--az-serie-5"],
      ["serie-outros", "--az-serie-outros"],
    ],
  },
]

const ESCALA: { classe: string; uso: string; exemplo: string }[] = [
  { classe: "display-xl", uso: "Posição na Ponte de Comando", exemplo: "R$ 48.210,33" },
  { classe: "display-l", uso: "Título de página", exemplo: "Ponte de Comando" },
  { classe: "display-m", uso: "Título de seção e de modal", exemplo: "Trajetória" },
  { classe: "display-s", uso: "Título de card", exemplo: "Rotas" },
  { classe: "value-l", uso: "Indicadores", exemplo: "+ R$ 12.400,00" },
  { classe: "value-m", uso: "Valores em tabela", exemplo: "− 412,37" },
  { classe: "text-sm", uso: "Corpo e interface (Plex Sans)", exemplo: "Desvio de 18% em Mercado. Corrija até dia 25." },
  { classe: "label", uso: "Rótulos, cabeçalhos de tabela, pílulas", exemplo: "Posição · outubro 2026" },
]

const MOVIMENTO: { classe: string; duracao: string; uso: string }[] = [
  { classe: "duration-fast", duracao: "100ms", uso: "Hover, pressionado, foco" },
  { classe: "duration-base", duracao: "180ms", uso: "Menus, abas, expandir" },
  { classe: "duration-slow", duracao: "240ms", uso: "Modal e painel lateral" },
  { classe: "duration-exit", duracao: "130ms", uso: "Saídas (~70% da entrada)" },
]

const CAMADAS: [string, number, string][] = [
  ["z-sticky", 10, "Cabeçalho fixo, barra de ações"],
  ["z-dropdown", 20, "Menus e popovers"],
  ["z-overlay", 40, "Scrim de modal"],
  ["z-modal", 50, "Modais e painéis"],
  ["z-toast", 100, "Avisos"],
]

// A classe do <html> (tema) é a fonte: a página renderiza de novo quando o
// next-themes a troca, e só então lê os valores do CSS
function observarClasseDoHtml(avisar: () => void) {
  const observador = new MutationObserver(avisar)
  observador.observe(document.documentElement, { attributes: true, attributeFilter: ["class"] })
  return () => observador.disconnect()
}

function Amostra({ nome, variavel, classeDoHtml }: { nome: string; variavel: string; classeDoHtml: string }) {
  const valor = classeDoHtml ? getComputedStyle(document.documentElement).getPropertyValue(variavel).trim() : ""
  return (
    <div className="overflow-hidden rounded-lg border border-border-subtle bg-surface">
      <div className="h-12 border-b border-border-subtle" style={{ background: `var(${variavel})` }} />
      <div className="px-3 py-2">
        <p className="text-sm">{nome}</p>
        <p className="value-m text-fg-muted">{valor || "—"}</p>
      </div>
    </div>
  )
}

function Secao({ titulo, children }: { titulo: string; children: React.ReactNode }) {
  return (
    <section className="space-y-4">
      <h2 className="display-m">{titulo}</h2>
      {children}
    </section>
  )
}

export default function DesignSystemPage() {
  const classeDoHtml = useSyncExternalStore(
    observarClasseDoHtml,
    () => document.documentElement.className || " ",
    () => "",
  )
  const nomeDoTema = !classeDoHtml ? "" : classeDoHtml.includes("dark") ? "tema escuro" : "tema claro"

  return (
    <div className="container mx-auto space-y-12 px-4 py-10">
      <header className="space-y-3">
        <Logo tamanho={32} />
        <h1 className="display-l">Sistema visual</h1>
        <p className="max-w-2xl text-fg-secondary">
          Referência viva dos tokens, da tipografia e dos componentes do Azimute. Regras completas no DESIGN.md.
          {nomeDoTema && <span className="text-fg-muted"> Mostrando o {nomeDoTema}.</span>}
        </p>
      </header>

      <Secao titulo="Cores">
        <div className="space-y-6">
          {GRUPOS_DE_CORES.map((grupo) => (
            <div key={grupo.titulo} className="space-y-2">
              <p className="label text-fg-muted">{grupo.titulo}</p>
              <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-6">
                {grupo.tokens.map(([nome, variavel]) => (
                  <Amostra key={nome} nome={nome} variavel={variavel} classeDoHtml={classeDoHtml} />
                ))}
              </div>
            </div>
          ))}
          <p className="text-sm text-fg-secondary">
            Regra do ouro: <span className="text-fg">gold</span> pinta fundos;{" "}
            <span className="text-gold-line">gold-line</span> desenha traços e letras.
          </p>
        </div>
      </Secao>

      <Secao titulo="Tipografia">
        <p className="text-sm text-fg-secondary">
          Archivo largo nos títulos, IBM Plex Sans no corpo e IBM Plex Mono nos números e rótulos.
        </p>
        <div className="divide-y divide-border-subtle rounded-lg border border-border-subtle bg-surface">
          {ESCALA.map((estilo) => (
            <div key={estilo.classe} className="grid gap-1 px-4 py-3 md:grid-cols-[180px_1fr] md:items-baseline md:gap-6">
              <div>
                <p className="value-m text-gold-line">.{estilo.classe}</p>
                <p className="text-xs text-fg-muted">{estilo.uso}</p>
              </div>
              <p className={estilo.classe}>{estilo.exemplo}</p>
            </div>
          ))}
        </div>
      </Secao>

      <Secao titulo="Movimento e camadas">
        <div className="grid gap-4 md:grid-cols-2">
          <div className="space-y-2">
            <p className="label text-fg-muted">Durações (passe o mouse)</p>
            {MOVIMENTO.map((item) => (
              <div
                key={item.classe}
                className={`flex items-center justify-between rounded-lg border border-border-subtle bg-surface px-4 py-3 transition-colors ease-az-out hover:bg-elevated ${item.classe}`}
              >
                <span className="value-m">.{item.classe}</span>
                <span className="text-xs text-fg-muted">{item.duracao} · {item.uso}</span>
              </div>
            ))}
            <p className="text-xs text-fg-muted">Com movimento reduzido ligado no sistema, nada anima.</p>
          </div>
          <div className="space-y-2">
            <p className="label text-fg-muted">Camadas</p>
            {CAMADAS.map(([classe, valor, uso]) => (
              <div key={classe} className="flex items-center justify-between rounded-lg border border-border-subtle bg-surface px-4 py-3">
                <span className="value-m">.{classe}</span>
                <span className="text-xs text-fg-muted">{valor} · {uso}</span>
              </div>
            ))}
          </div>
        </div>
      </Secao>

      <Secao titulo="Componentes atuais">
        <p className="text-sm text-fg-secondary">
          Os componentes abaixo já usam os tokens novos, mas ainda serão revisados na Fase 2 (AZ-10 a AZ-20).
        </p>

        <div className="space-y-2">
          <p className="label text-fg-muted">Botões</p>
          <div className="flex flex-wrap gap-3">
            <Button>Registrar</Button>
            <Button variant="secondary">Secundário</Button>
            <Button variant="outline">Contorno</Button>
            <Button variant="ghost">Fantasma</Button>
            <Button variant="destructive">Excluir</Button>
            <Button variant="link">Ver rota</Button>
            <Button disabled>Desabilitado</Button>
            <Button loading>Carregando</Button>
            <Button size="icon" aria-label="Perfil"><User className="h-4 w-4" aria-hidden="true" /></Button>
          </div>
        </div>

        <div className="grid max-w-sm gap-4">
          <p className="label text-fg-muted">Campos</p>
          <div className="space-y-2">
            <label htmlFor="ds-email" className="text-sm font-medium">E-mail</label>
            <Input id="ds-email" type="email" placeholder="nome@exemplo.com" />
          </div>
          <div className="space-y-2">
            <label htmlFor="ds-desabilitado" className="text-sm font-medium">Desabilitado</label>
            <Input id="ds-desabilitado" disabled placeholder="Campo desabilitado" />
          </div>
        </div>

        <div className="space-y-2">
          <p className="label text-fg-muted">Pílulas</p>
          <div className="flex flex-wrap gap-3">
            <Badge>Padrão</Badge>
            <Badge variant="secondary">Secundária</Badge>
            <Badge variant="outline">Contorno</Badge>
            <Badge variant="destructive">Saída</Badge>
            <Badge variant="success">Entrada</Badge>
          </div>
        </div>

        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          <Card>
            <CardHeader>
              <CardTitle className="display-s">Posição</CardTitle>
              <CardDescription>Saldo de todas as contas</CardDescription>
            </CardHeader>
            <CardContent className="space-y-1">
              <p className="value-l">R$ 48.210,33</p>
              <p className="text-sm text-fg-secondary">
                <span className="value-m text-inflow">▲ 2,1%</span> vs setembro
              </p>
            </CardContent>
          </Card>
          <Card>
            <CardHeader>
              <CardTitle className="display-s">Diário de Bordo</CardTitle>
              <CardDescription>Últimos lançamentos</CardDescription>
            </CardHeader>
            <CardContent className="divide-y divide-border-subtle">
              <div className="flex items-center justify-between py-2 text-sm">
                <span>Supermercado Central</span>
                <span className="value-m text-outflow">− 412,37</span>
              </div>
              <div className="flex items-center justify-between py-2 text-sm">
                <span>Salário</span>
                <span className="value-m text-inflow">+ 9.800,00</span>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader>
              <CardTitle className="display-s">Carregando</CardTitle>
              <CardDescription>Skeleton com a forma do conteúdo</CardDescription>
            </CardHeader>
            <CardContent className="space-y-2">
              <Skeleton className="h-7 w-40" />
              <Skeleton className="h-4 w-28" />
            </CardContent>
          </Card>
        </div>

        <div className="space-y-2">
          <p className="label text-fg-muted">Modal</p>
          <Dialog>
            <DialogTrigger asChild>
              <Button variant="outline">Abrir modal de exemplo</Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle className="display-m">Excluir o cartão Azul?</DialogTitle>
                <DialogDescription>
                  As 4 faturas e os 38 lançamentos deste cartão serão excluídos. Isso não pode ser desfeito.
                </DialogDescription>
              </DialogHeader>
              <DialogFooter>
                <DialogClose asChild>
                  <Button variant="outline">Cancelar</Button>
                </DialogClose>
                <DialogClose asChild>
                  <Button variant="destructive">Excluir cartão</Button>
                </DialogClose>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </div>
      </Secao>
    </div>
  )
}
