"use client"

import { Server, ShieldAlert, Globe, ArrowLeft, RefreshCw } from "lucide-react"
import { Button } from "@/components/ui/button"
import Link from "next/link"
import { motion } from "framer-motion"

export default function MaintenancePage() {
    return (
        <div className="min-h-screen bg-black flex flex-col items-center justify-center p-4 relative overflow-hidden font-inter">
            {/* Background Gradients */}
            <div className="absolute top-[-10%] right-[-10%] w-[50%] h-[50%] bg-primary/10 rounded-full blur-[120px] animate-pulse" />
            <div className="absolute bottom-[-10%] left-[-10%] w-[50%] h-[50%] bg-blue-500/10 rounded-full blur-[120px] animate-pulse" style={{ animationDelay: '1s' }} />

            {/* Grid Pattern */}
            <div 
                className="absolute inset-0 opacity-[0.03]" 
                style={{ 
                    backgroundImage: `linear-gradient(#fff 1px, transparent 1px), linear-gradient(90deg, #fff 1px, transparent 1px)`,
                    backgroundSize: '40px 40px'
                }} 
            />

            <motion.div 
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.8 }}
                className="z-10 text-center max-w-2xl"
            >
                {/* Icon Circle */}
                <div className="mb-8 relative inline-block">
                    <div className="absolute inset-0 bg-primary/20 rounded-full blur-2xl animate-ping" />
                    <div className="relative h-24 w-24 bg-gradient-to-br from-primary to-blue-600 rounded-3xl flex items-center justify-center shadow-2xl rotate-3">
                        <Server className="h-12 w-12 text-white" />
                    </div>
                    <div className="absolute -bottom-2 -right-2 h-10 w-10 bg-black border-2 border-primary/30 rounded-full flex items-center justify-center shadow-xl">
                        <RefreshCw className="h-5 w-5 text-primary animate-spin" />
                    </div>
                </div>

                {/* Badge */}
                <div className="mb-6">
                    <span className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-primary/10 border border-primary/20 text-primary text-xs font-black uppercase tracking-widest">
                        <ShieldAlert className="h-3 w-3" />
                        Status: Manutenção Programada
                    </span>
                </div>

                {/* Content */}
                <h1 className="text-5xl md:text-7xl font-black text-white tracking-tighter mb-6 leading-none">
                    Estamos <span className="text-transparent bg-clip-text bg-gradient-to-r from-primary via-blue-400 to-primary bg-[length:200%_auto] animate-gradient-flow">melhorando</span> tudo para você.
                </h1>
                
                <p className="text-muted-foreground text-lg md:text-xl font-medium leading-relaxed mb-12 max-w-lg mx-auto">
                    O Fluxar está passando por uma atualização de infraestrutura para garantir mais estabilidade e velocidade na sua gestão financeira.
                </p>

                {/* Actions */}
                <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
                    <Button 
                        onClick={() => window.location.reload()}
                        className="h-14 px-8 rounded-2xl bg-white text-black hover:bg-zinc-200 text-base font-bold shadow-xl shadow-white/5 group transition-all duration-300"
                    >
                        <RefreshCw className="mr-2 h-5 w-5 group-hover:rotate-180 transition-transform duration-500" />
                        Tentar Novamente
                    </Button>
                    <Link href="/suporte">
                        <Button 
                            variant="outline"
                            className="h-14 px-8 rounded-2xl border-white/10 bg-white/5 hover:bg-white/10 text-white text-base font-bold transition-all duration-300"
                        >
                            <Globe className="mr-2 h-5 w-5" />
                            Ver Status da Rede
                        </Button>
                    </Link>
                </div>

                {/* Footer Info */}
                <div className="mt-16 pt-8 border-t border-white/5">
                    <div className="flex items-center justify-center gap-8 opacity-40">
                        <div className="text-left">
                            <p className="text-[10px] font-black uppercase tracking-widest text-muted-foreground mb-1">Início</p>
                            <p className="text-sm font-bold text-white">Agora</p>
                        </div>
                        <div className="h-8 w-[1px] bg-white/10" />
                        <div className="text-left">
                            <p className="text-[10px] font-black uppercase tracking-widest text-muted-foreground mb-1">Previsão</p>
                            <p className="text-sm font-bold text-white">~ 15 minutos</p>
                        </div>
                    </div>
                </div>
            </motion.div>

            <style jsx global>{`
                @keyframes gradient-flow {
                    0% { background-position: 0% 50%; }
                    50% { background-position: 100% 50%; }
                    100% { background-position: 0% 50%; }
                }
                .animate-gradient-flow {
                    animation: gradient-flow 6s ease infinite;
                }
            `}</style>
        </div>
    )
}
