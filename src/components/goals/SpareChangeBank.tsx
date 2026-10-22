"use client"

import { useState, useEffect } from "react"
import { Coins, PiggyBank, AlertTriangle, CheckCircle2 } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { Card, CardContent, CardHeader } from "@/components/ui/card"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue
} from "@/components/ui/select"
import { ConfiguracaoDeTrocos, DepositoDeTrocos, Goal } from "@/types/goals"
import { toast } from "sonner"
import { goalsService } from "@/services/goals"
import { formatarMoeda } from "@/lib/dinheiro"
import { tratarErro } from "@/lib/erros"

interface SpareChangeBankProps {
  goals: Goal[]
  onSuccess: () => void
}

// META-35, META-37, META-43 a META-45: os trocos são calculados e lembrados
// pelo backend; a tela só mostra o que está pendente, configura e deposita
export function SpareChangeBank({ goals, onSuccess }: SpareChangeBankProps) {
  const [config, setConfig] = useState<ConfiguracaoDeTrocos | null>(null)
  const [metaEscolhida, setMetaEscolhida] = useState<string>("")
  const [isSaving, setIsSaving] = useState(false)
  const [isDepositing, setIsDepositing] = useState(false)
  const [ultimoDeposito, setUltimoDeposito] = useState<DepositoDeTrocos | null>(null)

  const aplicar = (dados: ConfiguracaoDeTrocos) => {
    setConfig(dados)
    setMetaEscolhida(dados.goal !== null && !dados.paused ? String(dados.goal) : "")
  }

  const fetchConfig = async () => {
    try {
      aplicar(await goalsService.getSpareChange())
    } catch (error) {
      // CONTRATO-33: nenhuma falha silenciosa
      tratarErro(error, { mensagemPadrao: "Não foi possível carregar o Lastro do troco. Tente de novo.", tentarDeNovo: fetchConfig })
    }
  }

  useEffect(() => {
    fetchConfig()
  }, [])

  const salvar = async (ativo: boolean) => {
    try {
      setIsSaving(true)
      aplicar(await goalsService.updateSpareChange(ativo ? { active: true, goal: metaEscolhida } : { active: false }))
      // META-45: desativar mantém os trocos pendentes
      toast.success(ativo ? "Lastro do troco ativado." : "Lastro do troco desativado. Os trocos pendentes continuam disponíveis.")
    } catch (error) {
      tratarErro(error, { mensagemPadrao: "Não foi possível salvar o Lastro do troco. Tente de novo." })
    } finally {
      setIsSaving(false)
    }
  }

  const handleDeposit = async () => {
    try {
      setIsDepositing(true)
      const resultado = await goalsService.depositSpareChange()
      setUltimoDeposito(resultado)
      if (resultado.deposits.length > 0) {
        toast.success("Trocos depositados.")
      } else if (resultado.discarded === 0) {
        toast.info("Nenhum troco pendente para depositar.")
      }
      await fetchConfig()
      onSuccess()
    } catch (error) {
      tratarErro(error, { mensagemPadrao: "Não foi possível depositar os trocos. Tente de novo." })
    } finally {
      setIsDepositing(false)
    }
  }

  if (!config) return null

  const metasAtivas = goals.filter((goal) => goal.is_active !== false)
  const nomeDaMeta = goals.find((goal) => String(goal.id) === String(config.goal))?.name
  const escolherMeta = !config.active || config.paused
  const situacao = !config.active
    ? "Desativado"
    : config.paused
      ? "Pausado"
      : `Indo para ${nomeDaMeta ?? "o destino escolhido"}`

  return (
    <Card className="mb-6">
      <CardHeader className="p-5 pb-0">
        <div className="flex items-start justify-between gap-4">
          <div className="flex items-start gap-3">
            <Coins className="mt-0.5 h-5 w-5 text-gold-line" aria-hidden="true" />
            <div className="space-y-0.5">
              {/* AZ-27: o termo do glossário com a linha de apoio permanente (D-03) */}
              <h2 className="display-s">Lastro do troco</h2>
              <p className="text-sm text-muted-foreground">Cofrinho do troco</p>
              <p className="label text-fg-secondary" aria-live="polite">{situacao}</p>
            </div>
          </div>
          <div className="text-right">
            <p aria-label="Total pendente" className="value-l">{formatarMoeda(config.pending_total)}</p>
            <p className="label text-muted-foreground">Pendente</p>
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-4 p-5">
        {/* META-44: meta arquivada ou excluída pausa os trocos */}
        {config.active && config.paused && (
          <Alert variant="warning">
            <AlertTriangle className="h-4 w-4" aria-hidden="true" />
            <AlertDescription>
              <p>O destino dos trocos foi arquivado ou excluído. Escolha outro destino para voltar a juntar os trocos.</p>
            </AlertDescription>
          </Alert>
        )}

        <div className="flex flex-col items-end gap-3 md:flex-row">
          {escolherMeta && (
            <div className="w-full flex-1 space-y-2">
              <label htmlFor="meta-dos-trocos" className="text-sm font-medium">Destino dos trocos</label>
              <Select value={metaEscolhida} onValueChange={setMetaEscolhida}>
                <SelectTrigger id="meta-dos-trocos">
                  <SelectValue placeholder="Selecione um destino" />
                </SelectTrigger>
                <SelectContent>
                  {metasAtivas.map((goal) => (
                    <SelectItem key={goal.id} value={String(goal.id)}>
                      {goal.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}

          {escolherMeta ? (
            <Button
              variant="outline"
              className="w-full md:w-auto"
              disabled={!metaEscolhida || isSaving}
              onClick={() => salvar(true)}
            >
              {config.paused ? "Usar este destino" : "Ativar trocos"}
            </Button>
          ) : (
            <Button variant="outline" className="w-full md:w-auto" disabled={isSaving} onClick={() => salvar(false)}>
              Desativar trocos
            </Button>
          )}

          <Button
            className="w-full md:w-auto"
            disabled={config.pending_count === 0 || config.paused || config.goal === null || isDepositing}
            loading={isDepositing}
            onClick={handleDeposit}
          >
            <PiggyBank aria-hidden="true" /> Depositar trocos
          </Button>
        </div>

        <p className="text-sm text-muted-foreground">
          {`Juntando o troco de ${config.pending_count} ${config.pending_count === 1 ? "saída" : "saídas"}.`}
        </p>

        {/* META-38 e META-43: um aporte por conta de origem; trocos de conta excluída descartados */}
        {ultimoDeposito && (ultimoDeposito.deposits.length > 0 || ultimoDeposito.discarded > 0) && (
          <div className="space-y-1 rounded-md border border-border bg-elevated p-3">
            {ultimoDeposito.deposits.map((deposito) => (
              <p key={deposito.account_id} className="flex items-center gap-1.5 text-sm">
                <CheckCircle2 className="h-3.5 w-3.5 shrink-0 text-inflow" aria-hidden="true" />
                <span>{`Aporte de ${formatarMoeda(deposito.amount)}`}</span>
              </p>
            ))}
            {ultimoDeposito.discarded > 0 && (
              <p className="flex items-center gap-1.5 text-sm text-warn">
                <AlertTriangle className="h-3.5 w-3.5 shrink-0" aria-hidden="true" />
                <span>
                  {ultimoDeposito.discarded === 1
                    ? "1 troco de conta excluída foi descartado."
                    : `${ultimoDeposito.discarded} trocos de contas excluídas foram descartados.`}
                </span>
              </p>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  )
}
