"use client"

import { useEffect, useState } from "react"
import { format } from "date-fns"
import { toast } from "sonner"
import { Sparkles } from "lucide-react"

import { useAuth } from "@/hooks/use-auth"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Switch } from "@/components/ui/switch"
import { tratarErro } from "@/lib/erros"
import { privacidadeService } from "@/services/privacidade"

// LGPD-34: mostra se o consentimento está dado e permite dá-lo ou retirá-lo a
// qualquer momento; cada decisão fica gravada com a data (LGPD-35)
export function ConsentimentoDeMelhoria() {
  const { user, refreshUser } = useAuth()
  const [consentiu, setConsentiu] = useState(!!user?.product_improvement_consent)
  const [decididoEm, setDecididoEm] = useState<string | null>(null)
  const [salvando, setSalvando] = useState(false)

  // A data da última decisão vem do histórico
  useEffect(() => {
    privacidadeService.obterConsentimento().then(
      (atual) => {
        setConsentiu(atual.consent)
        setDecididoEm(atual.decided_at)
      },
      (error: unknown) => tratarErro(error, { mensagemPadrao: "Não foi possível carregar o seu consentimento." }),
    )
  }, [])

  const mudar = async (ligado: boolean) => {
    const anterior = consentiu
    setConsentiu(ligado)
    try {
      setSalvando(true)
      const atual = await privacidadeService.definirConsentimento(ligado)
      setConsentiu(atual.consent)
      setDecididoEm(atual.decided_at)
      toast.success(atual.consent ? "Consentimento dado. Obrigado!" : "Consentimento retirado.")
      await refreshUser()
    } catch (error) {
      setConsentiu(anterior)
      tratarErro(error, { mensagemPadrao: "Não foi possível salvar a sua decisão." })
    } finally {
      setSalvando(false)
    }
  }

  return (
    <Card className="rounded-[32px] border-border/60 shadow-sm bg-card overflow-hidden">
      <CardHeader className="p-8 pb-4">
        <div className="flex items-center gap-4">
          <div className="w-12 h-12 rounded-2xl bg-primary/5 flex items-center justify-center shadow-sm ring-1 ring-black/5 dark:ring-white/10">
            <Sparkles className="h-5 w-5 text-primary" />
          </div>
          <div>
            <CardTitle className="text-xl font-bold tracking-tight">Melhoria do produto</CardTitle>
            <CardDescription>Opcional. Você pode mudar de ideia a qualquer momento.</CardDescription>
          </div>
        </div>
      </CardHeader>
      <CardContent className="px-8 pb-8 pt-2 space-y-3">
        <div className="flex items-center justify-between gap-4 rounded-2xl border border-border/40 px-4 py-3">
          <label htmlFor="consentimento-melhoria" className="text-sm font-medium">
            Usar meus dados, anonimizados, para melhorar o produto e treinar modelos de previsão e de categorização
          </label>
          <Switch
            id="consentimento-melhoria"
            checked={consentiu}
            disabled={salvando}
            onCheckedChange={mudar}
          />
        </div>
        <p className="text-xs text-muted-foreground">
          Os dados anonimizados não trazem nome, e-mail, CPF nem identificadores. Ao retirar o consentimento, os seus dados
          ficam fora dos conjuntos novos.
          {decididoEm && ` Última decisão em ${format(new Date(decididoEm), "dd/MM/yyyy")}.`}
        </p>
      </CardContent>
    </Card>
  )
}
