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
            <Card className="h-full">
                <CardContent className="flex flex-col items-center justify-center gap-4 py-12 px-6 text-center">
                    <div className="flex h-11 w-11 items-center justify-center rounded-full border border-border-strong bg-elevated text-outflow">
                        <AlertCircle className="h-5 w-5" aria-hidden="true" />
                    </div>
                    <div>
                        <h3 className="label text-muted-foreground">{titulo}</h3>
                        <p className="text-sm text-muted-foreground mt-2">Não foi possível carregar este bloco.</p>
                    </div>
                    <Button variant="outline" onClick={onTentarDeNovo}>
                        <RotateCw aria-hidden="true" /> {ROTULO_TENTAR_DE_NOVO}
                    </Button>
                </CardContent>
            </Card>
        </section>
    )
}
