"use client"

import { motion, AnimatePresence } from "framer-motion"
import { Coffee, Cloud, Sparkles, Loader2, X } from "lucide-react"
import { useServerStatus } from "@/hooks/use-server-status"
import { serverStatusManager } from "@/services/serverStatus"

export function ServerWakeupOverlay() {
  const { isWakingUp } = useServerStatus()

  return (
    <AnimatePresence>
      {isWakingUp && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-[9999] flex items-center justify-center bg-[var(--az-scrim)]"
        >
          <motion.div 
            initial={{ scale: 0.9, opacity: 0, y: 20 }}
            animate={{ scale: 1, opacity: 1, y: 0 }}
            exit={{ scale: 0.9, opacity: 0, y: 20 }}
            className="relative w-[90%] max-w-md overflow-hidden rounded-lg border border-border bg-card p-8 text-center"
          >
            {/* CONTRATO-35: o aviso pode ser fechado */}
            <button
                type="button"
                aria-label="Fechar"
                onClick={() => serverStatusManager.dismiss()}
                className="absolute top-5 right-5 z-20 w-9 h-9 rounded-2xl flex items-center justify-center text-muted-foreground hover:text-foreground hover:bg-muted/60 transition-colors"
            >
                <X className="w-4 h-4" />
            </button>

            <div className="relative z-10">
                <div className="flex justify-center mb-6">
                    <div className="relative">
                        <motion.div
                            animate={{ 
                                scale: [1, 1.1, 1],
                                rotate: [0, 5, -5, 0]
                            }}
                            transition={{ duration: 4, repeat: Infinity }}
                            className="w-20 h-20 rounded-3xl bg-primary/10 flex items-center justify-center text-primary shadow-inner"
                        >
                            <Coffee className="w-10 h-10" />
                        </motion.div>
                        <motion.div 
                            animate={{ opacity: [0, 1, 0], y: [0, -20] }}
                            transition={{ duration: 2, repeat: Infinity, delay: 0.5 }}
                            className="absolute -top-2 -right-2 text-primary"
                        >
                            <Sparkles className="w-5 h-5" />
                        </motion.div>
                    </div>
                </div>

                <h2 className="display-m mb-4">
                    Estamos acordando o servidor...
                </h2>
                
                <p className="text-sm font-medium text-muted-foreground/80 leading-relaxed mb-8">
                    Como o <span className="text-foreground font-bold italic">Azimute</span> ainda está em fase de testes e utilizando recursos gratuitos, nosso servidor entra em "hibernação" após algum tempo de inatividade.
                    <br /><br />
                    <span className="text-primary font-bold">Só um instantinho!</span> Ele já está preparando o café e estará pronto para você em alguns segundos.
                </p>

                <div className="flex flex-col items-center gap-4">
                    <div className="h-1.5 w-48 bg-muted rounded-full overflow-hidden relative">
                        <motion.div 
                            animate={{ left: ["-100%", "100%"] }}
                            transition={{ duration: 2, repeat: Infinity, ease: "easeInOut" }}
                            className="absolute top-0 bottom-0 w-1/2 bg-gradient-to-r from-transparent via-primary to-transparent"
                        />
                    </div>
                    <div className="label flex items-center gap-2 text-muted-foreground">
                        <Loader2 className="w-3 h-3 animate-spin" />
                        Reinicialização em curso
                    </div>
                </div>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  )
}
