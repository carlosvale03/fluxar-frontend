"use client"

import { ShieldCheck, Users, Target, Eye, ArrowRight } from "lucide-react"
import Link from "next/link"
import { motion, useReducedMotion } from "framer-motion"

import { Button } from "@/components/ui/button"
import { Card } from "@/components/ui/card"
import { SimboloAzimute } from "@/components/layout/logo"

const VALORES = [
  { icon: ShieldCheck, title: "Segurança", desc: "A conexão é criptografada, e seus dados pessoais ficam criptografados no banco." },
  { icon: Users, title: "Comunidade", desc: "Evoluímos ouvindo o feedback real dos nossos usuários." },
  { icon: Eye, title: "Transparência", desc: "Sem letras miúdas. Você sempre sabe como seus dados são usados." },
]

export default function AboutPage() {
  const reduzirMovimento = useReducedMotion()

  return (
    <div className="flex min-h-screen flex-col items-center bg-background px-4 py-12 sm:px-6 lg:px-8">
      <motion.div
        initial={reduzirMovimento ? false : { opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.24, ease: [0.2, 0, 0, 1] }}
        className="w-full max-w-4xl space-y-12"
      >
        <header className="text-center">
          <div className="mb-6 flex justify-center">
            <SimboloAzimute tamanho={40} />
          </div>
          <h1 className="display-l mb-3">Sobre o Azimute</h1>
          <p className="mx-auto max-w-xl text-base text-muted-foreground">
            Finanças pessoais com medida: o que entrou, o que saiu e quanto falta para cada destino.
          </p>
        </header>

        {/* Nossa missão */}
        <section className="max-w-2xl space-y-4">
          <div className="flex items-center gap-2">
            <Target className="h-5 w-5 text-muted-foreground" aria-hidden="true" />
            <h2 className="display-m">Nossa missão</h2>
          </div>
          <p className="leading-relaxed text-fg-secondary">
            O Azimute foi criado para ocupar o espaço entre as planilhas complexas e os aplicativos financeiros genéricos.
            Ele mostra a posição das suas contas, o desvio de cada rota e a distância até cada destino, com números exatos.
          </p>
          <p className="leading-relaxed text-fg-secondary">
            Clareza vem antes da decisão: cada número aparece com a unidade e a referência, para você saber o que corrigir.
          </p>
        </section>

        {/* Nossos valores */}
        <section aria-label="Nossos valores" className="grid grid-cols-1 gap-4 sm:grid-cols-3">
          {VALORES.map((val) => (
            <Card key={val.title} className="flex flex-col gap-3 p-5">
              <val.icon className="h-5 w-5 text-muted-foreground" aria-hidden="true" />
              <div className="space-y-1">
                <h3 className="display-s">{val.title}</h3>
                <p className="text-sm leading-relaxed text-muted-foreground">{val.desc}</p>
              </div>
            </Card>
          ))}
        </section>

        {/* Por que o Azimute? */}
        <Card className="p-6 sm:p-8">
          <div className="max-w-2xl space-y-4">
            <h2 className="display-m">Comece pelo mês atual</h2>
            <p className="leading-relaxed text-fg-secondary">
              Registre os lançamentos, trace uma rota para cada área de gasto e defina destinos para o que você quer juntar.
            </p>
            <Button asChild className="max-md:h-11">
              <Link href="/auth/register">
                Criar conta
                <ArrowRight className="h-4 w-4" aria-hidden="true" />
              </Link>
            </Button>
          </div>
        </Card>

        <p className="pb-12 text-center text-xs text-muted-foreground">
          Azimute · Feito para você
        </p>
      </motion.div>
    </div>
  )
}
