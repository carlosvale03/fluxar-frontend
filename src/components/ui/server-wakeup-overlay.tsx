"use client"

import { motion, AnimatePresence } from "framer-motion"
import { Coffee, Cloud, Sparkles, Loader2 } from "lucide-react"
import { useServerStatus } from "@/hooks/use-server-status"

export function ServerWakeupOverlay() {
  const { isWakingUp } = useServerStatus()

  return (
    <AnimatePresence>
      {isWakingUp && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-[9999] flex items-center justify-center bg-background/80 backdrop-blur-xl"
        >
          <motion.div 
            initial={{ scale: 0.9, opacity: 0, y: 20 }}
            animate={{ scale: 1, opacity: 1, y: 0 }}
            exit={{ scale: 0.9, opacity: 0, y: 20 }}
            className="max-w-md w-[90%] p-8 rounded-[40px] bg-card border border-border/40 shadow-2xl shadow-primary/10 text-center relative overflow-hidden"
          >
            {/* Background Spells */}
            <div className="absolute top-0 left-0 w-full h-full overflow-hidden pointer-events-none opacity-20">
                <motion.div 
                    animate={{ 
                        rotate: [0, 360],
                        scale: [1, 1.2, 1]
                    }}
                    transition={{ duration: 20, repeat: Infinity, ease: "linear" }}
                    className="absolute -top-1/2 -left-1/2 w-full h-full bg-gradient-to-br from-primary/30 to-transparent rounded-full blur-[100px]"
                />
                <motion.div 
                    animate={{ 
                        rotate: [360, 0],
                        scale: [1, 1.3, 1]
                    }}
                    transition={{ duration: 25, repeat: Infinity, ease: "linear" }}
                    className="absolute -bottom-1/2 -right-1/2 w-full h-full bg-gradient-to-tl from-emerald-500/20 to-transparent rounded-full blur-[100px]"
                />
            </div>

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

                <h2 className="text-2xl font-black tracking-tight text-foreground mb-4">
                    Estamos acordando o servidor...
                </h2>
                
                <p className="text-sm font-medium text-muted-foreground/80 leading-relaxed mb-8">
                    Como o <span className="text-foreground font-bold italic">Fluxar</span> ainda está em fase de testes e utilizando recursos gratuitos, nosso servidor entra em "hibernação" após algum tempo de inatividade.
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
                    <div className="flex items-center gap-2 text-[10px] font-black uppercase tracking-[0.2em] text-muted-foreground/40">
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
