import { cn } from "@/lib/utils"

interface LogoProps {
  className?: string
  // Tamanho do símbolo em px; o nome acompanha a altura
  tamanho?: number
  semNome?: boolean
}

// AZ-06: logo provisório (P-04). Ponteiro de bússola com o norte em ouro e o
// sul na cor da borda, ao lado do nome em Archivo largo.
export function SimboloAzimute({ tamanho = 28, className }: { tamanho?: number; className?: string }) {
  return (
    <svg
      width={tamanho}
      height={tamanho}
      viewBox="0 0 28 28"
      aria-hidden="true"
      className={className}
    >
      <circle cx="14" cy="14" r="12.5" fill="none" className="stroke-border-strong" strokeWidth="1.5" />
      <path d="M14 3.5 L17.2 14 L14 12.4 L10.8 14 Z" className="fill-gold" />
      <path d="M14 24.5 L10.8 14 L14 15.6 L17.2 14 Z" className="fill-border-input" />
    </svg>
  )
}

export function Logo({ className, tamanho = 28, semNome = false }: LogoProps) {
  return (
    <span className={cn("inline-flex items-center gap-2.5 text-foreground", className)}>
      <SimboloAzimute tamanho={tamanho} />
      {semNome ? (
        <span className="sr-only">Azimute</span>
      ) : (
        <span
          className="font-display font-semibold uppercase tracking-[0.08em] [font-stretch:125%]"
          style={{ fontSize: Math.round(tamanho * 0.6) }}
        >
          Azimute
        </span>
      )}
    </span>
  )
}
