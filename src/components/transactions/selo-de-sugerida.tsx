import { History } from "lucide-react"

import { cn } from "@/lib/utils"

export const TEXTO_DO_SELO = "Sugerida pelo seu histórico"

// IMPORT-46: a categoria veio das correções do próprio usuário na importação
export function SeloDeSugerida({ className }: { className?: string }) {
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1 rounded-full border border-border-strong px-2 py-0.5 text-xs text-info",
        className,
      )}
    >
      <History className="h-3 w-3" aria-hidden />
      {TEXTO_DO_SELO}
    </span>
  )
}
