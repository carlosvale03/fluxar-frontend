"use client"

import { ShieldCheck, Users, Target, Rocket, Heart, ChevronLeft } from "lucide-react"
import Link from "next/link"
import { motion } from "framer-motion"

export default function AboutPage() {
  const containerVariants = {
    hidden: { opacity: 0 },
    show: {
      opacity: 1,
      transition: {
        staggerChildren: 0.1
      }
    }
  }

  const itemVariants = {
    hidden: { opacity: 0, y: 20 },
    show: { opacity: 1, y: 0 }
  }

  return (
    <div className="min-h-screen bg-background flex flex-col items-center py-12 px-4 sm:px-6 lg:px-8">
      <motion.div 
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        className="max-w-3xl w-full mb-8 text-center"
      >
        <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-primary/10 text-primary mb-6 shadow-xl shadow-primary/10">
          <Rocket className="h-8 w-8" />
        </div>
        <h1 className="text-4xl md:text-5xl font-black tracking-tight uppercase mb-4">Sobre o Fluxar</h1>
        <p className="text-lg text-muted-foreground font-medium max-w-xl mx-auto">
          Nascemos para simplificar sua vida financeira com inteligência e elegância.
        </p>
      </motion.div>

      <motion.div 
        variants={containerVariants}
        initial="hidden"
        animate="show"
        className="max-w-4xl w-full space-y-12"
      >
        {/* Nossa Missão */}
        <motion.div variants={itemVariants} className="grid grid-cols-1 md:grid-cols-2 gap-8 items-center">
          <div className="space-y-6">
            <div className="flex items-center gap-3">
              <Target className="h-5 w-5 text-primary" />
              <h2 className="text-xl font-black uppercase tracking-tight">Nossa Missão</h2>
            </div>
            <p className="text-muted-foreground leading-relaxed">
              O Fluxar foi criado para preencher o vazio entre planilhas complexas e aplicativos financeiros genéricos. 
              Nossa missão é fornecer ferramentas de alta fidelidade que dão a você o controle total do seu dinheiro, sem fricção.
            </p>
            <p className="text-muted-foreground leading-relaxed">
              Acreditamos que a clareza financeira é o primeiro passo para a liberdade, e usamos tecnologia de ponta para transformar dados em decisões.
            </p>
          </div>
          <div className="p-8 rounded-[40px] bg-card border border-border/60 shadow-2xl shadow-black/5 relative overflow-hidden group">
            <div className="absolute top-0 right-0 w-32 h-32 bg-primary/5 rounded-full -mr-16 -mt-16 blur-3xl group-hover:bg-primary/10 transition-colors" />
            <div className="relative space-y-4">
              <div className="flex gap-2">
                {[1, 2, 3].map((i) => (
                  <div key={i} className="h-2 w-2 rounded-full bg-primary/20" />
                ))}
              </div>
              <div className="space-y-2">
                <div className="h-4 w-3/4 rounded-full bg-muted/40" />
                <div className="h-4 w-1/2 rounded-full bg-primary/20" />
                <div className="h-4 w-2/3 rounded-full bg-muted/40" />
              </div>
            </div>
          </div>
        </motion.div>

        {/* Nossos Valores */}
        <motion.div variants={itemVariants} className="grid grid-cols-1 sm:grid-cols-3 gap-6">
          {[
            { icon: ShieldCheck, title: "Segurança", desc: "Seus dados são criptografados com padrões bancários.", color: "text-blue-500", bg: "bg-blue-500/10" },
            { icon: Users, title: "Comunidade", desc: "Evoluímos ouvindo o feedback real dos nossos usuários.", color: "text-purple-500", bg: "bg-purple-500/10" },
            { icon: Heart, title: "Transparência", desc: "Sem letras miúdas. Você sempre sabe como seus dados são usados.", color: "text-rose-500", bg: "bg-rose-500/10" },
          ].map((val, idx) => (
            <div key={idx} className="p-6 rounded-3xl bg-card border border-border/60 shadow-lg shadow-black/5 flex flex-col gap-4">
              <div className={`w-12 h-12 rounded-2xl ${val.bg} ${val.color} flex items-center justify-center shadow-sm`}>
                <val.icon className="h-6 w-6" />
              </div>
              <div className="space-y-1">
                <h3 className="font-black uppercase text-sm tracking-tight">{val.title}</h3>
                <p className="text-xs text-muted-foreground leading-relaxed">{val.desc}</p>
              </div>
            </div>
          ))}
        </motion.div>

        {/* Por que o Fluxar? */}
        <motion.div variants={itemVariants} className="p-10 rounded-[48px] bg-primary text-primary-foreground shadow-2xl shadow-primary/20 relative overflow-hidden">
          <div className="absolute top-0 right-0 w-64 h-64 bg-white/10 rounded-full -mr-32 -mt-32 blur-3xl" />
          <div className="relative z-10 max-w-2xl">
            <h2 className="text-3xl font-black uppercase tracking-tighter mb-6 leading-none">O Futuro das Finanças Pessoais é aqui.</h2>
            <p className="text-primary-foreground/80 leading-relaxed mb-8">
              Não somos apenas mais um gerenciador. Somos seu parceiro estratégico para conquistar suas metas, planejar sua aposentadoria e viver com tranquilidade.
            </p>
            <Link 
              href="/auth/register" 
              className="inline-flex h-12 items-center justify-center px-8 rounded-full bg-white text-primary font-black uppercase text-xs tracking-widest hover:scale-105 active:scale-95 transition-all shadow-xl shadow-black/10"
            >
              Começar Agora
            </Link>
          </div>
        </motion.div>

        <motion.div variants={itemVariants} className="text-center pb-20">
          <p className="text-[10px] font-black uppercase tracking-[0.2em] text-muted-foreground/40">
            Fluxar S.A. • Feito com ❤️ para você
          </p>
        </motion.div>
      </motion.div>
    </div>
  )
}
