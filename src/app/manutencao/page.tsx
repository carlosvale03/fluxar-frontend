"use client"

import { useEffect } from "react"
import { useRouter } from "next/navigation"
import { Server, ShieldAlert, Globe, RefreshCw } from "lucide-react"
import { Badge } from "@/components/ui/badge"
import { Logo } from "@/components/layout/logo"
import { Button } from "@/components/ui/button"
import Link from "next/link"
import { motion } from "framer-motion"
import { api, CHAVE_DA_VOLTA_DA_MANUTENCAO } from "@/services/apiClient"

const INTERVALO_DA_CONSULTA_MS = 30_000

export default function MaintenancePage() {
    const router = useRouter()
    // Consulta o estado ao abrir e a cada 30 segundos; quando a manutenção
    // acaba, volta à página em que o usuário estava (SESSAO-22)
    useEffect(() => {
        const consultar = async () => {
            try {
                const { data } = await api.get<{ maintenance: boolean | null }>("/health/")
                if (data.maintenance === false) {
                    const destino = sessionStorage.getItem(CHAVE_DA_VOLTA_DA_MANUTENCAO) || "/dashboard"
                    sessionStorage.removeItem(CHAVE_DA_VOLTA_DA_MANUTENCAO)
                    router.replace(destino)
                }
            } catch {
                // Sem resposta, a próxima consulta tenta de novo
            }
        }
        consultar()
        const intervalo = setInterval(consultar, INTERVALO_DA_CONSULTA_MS)
        return () => clearInterval(intervalo)
    }, [router])

    return (
        <div className="flex min-h-screen flex-col items-center justify-center bg-background p-4">
            <motion.div
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.24, ease: [0.2, 0, 0, 1] }}
                className="w-full max-w-xl text-center"
            >
                <div className="mb-8 flex justify-center">
                    <Logo tamanho={32} />
                </div>

                <div className="mb-6 flex justify-center">
                    <div className="flex h-12 w-12 items-center justify-center rounded-full border border-border-strong text-warn">
                        <Server className="h-6 w-6" aria-hidden="true" />
                    </div>
                </div>

                <div className="mb-4">
                    <Badge variant="warning">
                        <ShieldAlert className="h-3 w-3" aria-hidden="true" />
                        Manutenção programada
                    </Badge>
                </div>

                <h1 className="display-l mb-4">O Azimute está em manutenção</h1>

                <p className="mx-auto mb-8 max-w-lg text-sm leading-relaxed text-muted-foreground md:text-base">
                    Uma atualização da infraestrutura está em andamento. Seus dados continuam guardados; tente de novo em alguns minutos.
                </p>

                <div className="flex flex-col items-center justify-center gap-3 sm:flex-row">
                    <Button onClick={() => window.location.reload()} className="w-full max-md:h-11 sm:w-auto">
                        <RefreshCw className="h-4 w-4" aria-hidden="true" />
                        Tentar de novo
                    </Button>
                    <Button asChild variant="outline" className="w-full max-md:h-11 sm:w-auto">
                        <Link href="/suporte">
                            <Globe className="h-4 w-4" aria-hidden="true" />
                            Ver status do serviço
                        </Link>
                    </Button>
                </div>

                <dl className="mt-10 flex items-center justify-center gap-8 border-t border-border pt-6">
                    <div className="text-left">
                        <dt className="label mb-1 text-muted-foreground">Início</dt>
                        <dd className="text-sm font-medium text-foreground">Agora</dd>
                    </div>
                    <div className="h-8 w-px bg-border" aria-hidden="true" />
                    <div className="text-left">
                        <dt className="label mb-1 text-muted-foreground">Previsão</dt>
                        <dd className="font-mono text-sm text-foreground">~ 15 minutos</dd>
                    </div>
                </dl>
            </motion.div>
        </div>
    )
}
