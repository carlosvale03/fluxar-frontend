import { History } from "lucide-react"

import { cn } from "@/lib/utils"

export const TEXTO_DO_SELO = "Sugerida pelo seu histórico"

// IMPORT-46: a categoria veio das correções do próprio usuário na importação
export function SeloDeSugerida({ className }: { className?: string }) {
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-primary/10 text-primary text-[8px] font-black uppercase tracking-widest",
        className,
      )}
    >
      <History className="h-2.5 w-2.5" aria-hidden />
      {TEXTO_DO_SELO}
    </span>
  )
}
