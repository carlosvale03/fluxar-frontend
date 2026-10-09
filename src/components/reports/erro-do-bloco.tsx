"use client"

import { AlertCircle, RotateCw } from "lucide-react"

import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { ROTULO_TENTAR_DE_NOVO } from "@/lib/erros"

interface ErroDoBlocoProps {
    titulo: string
    onTentarDeNovo: () => void
    className?: string
}

// REL-24: a falha de um bloco do relatório aparece só nele, com "Tentar de
// novo" chamando só a rota do bloco; os outros blocos seguem na tela
export function ErroDoBloco({ titulo, onTentarDeNovo, className }: ErroDoBlocoProps) {
    return (
        <section aria-label={titulo} className={className}>
            <Card className="h-full border border-dashed border-destructive/30 bg-card shadow-md rounded-[32px] overflow-hidden">
                <CardContent className="flex flex-col items-center justify-center gap-4 py-12 px-6 text-center">
                    <div className="w-12 h-12 rounded-xl bg-destructive/10 flex items-center justify-center text-destructive">
                        <AlertCircle className="h-6 w-6" />
                    </div>
                    <div>
                        <h3 className="text-xs font-black uppercase tracking-[0.2em] text-muted-foreground/70">{titulo}</h3>
                        <p className="text-sm text-muted-foreground mt-2">Não foi possível carregar este bloco.</p>
                    </div>
                    <Button variant="outline" className="rounded-xl font-bold gap-2" onClick={onTentarDeNovo}>
                        <RotateCw className="h-4 w-4" /> {ROTULO_TENTAR_DE_NOVO}
                    </Button>
                </CardContent>
            </Card>
        </section>
    )
}
