"use client"

import { useState, useEffect } from "react"
import {
  Coins,
  PiggyBank,
  Loader2,
  AlertCircle,
  CheckCircle2
} from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
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
      tratarErro(error, { mensagemPadrao: "Erro ao carregar o cofrinho de trocos.", tentarDeNovo: fetchConfig })
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
      toast.success(ativo ? "Cofrinho de trocos ativado." : "Cofrinho de trocos desativado. Os trocos pendentes continuam disponíveis.")
    } catch (error) {
      tratarErro(error, { mensagemPadrao: "Erro ao salvar o cofrinho de trocos." })
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
        toast.success("Trocos depositados com sucesso!")
      } else if (resultado.discarded === 0) {
        toast.info("Nenhum troco pendente para depositar.")
      }
      await fetchConfig()
      onSuccess()
    } catch (error) {
      tratarErro(error, { mensagemPadrao: "Erro ao depositar os trocos." })
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
      : `Indo para ${nomeDaMeta ?? "a meta escolhida"}`

  return (
    <Card className="border-primary/20 bg-primary/5 md:rounded-[32px] overflow-hidden border-2 mb-8">
      <CardHeader className="pb-2">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-primary text-white flex items-center justify-center shadow-lg shadow-primary/20">
              <Coins className="h-5 w-5" />
            </div>
            <div>
              <CardTitle className="text-lg font-black uppercase tracking-tight">Cofrinho de Trocos</CardTitle>
              <p className="text-[10px] font-medium text-muted-foreground uppercase tracking-widest">{situacao}</p>
            </div>
          </div>
          <div className="text-right">
            <p aria-label="Total pendente" className="text-2xl font-black text-primary">{formatarMoeda(config.pending_total)}</p>
            <p className="text-[10px] font-bold opacity-60">PENDENTE</p>
          </div>
        </div>
      </CardHeader>
      <CardContent className="pt-4 space-y-4">
        {/* META-44: meta arquivada ou excluída pausa os trocos */}
        {config.active && config.paused && (
          <div role="alert" className="p-3 rounded-2xl border border-orange-500/20 bg-orange-500/5 flex items-center gap-3 text-orange-600">
            <AlertCircle className="h-4 w-4 shrink-0" />
            <p className="text-[11px] font-bold">
              A meta dos trocos foi arquivada ou excluída. Escolha outra meta para voltar a juntar os trocos.
            </p>
          </div>
        )}

        <div className="flex flex-col md:flex-row gap-4 items-end">
          {escolherMeta && (
            <div className="flex-1 space-y-2 w-full">
              <label className="text-[10px] font-black uppercase tracking-widest opacity-60">Meta dos trocos:</label>
              <Select value={metaEscolhida} onValueChange={setMetaEscolhida}>
                <SelectTrigger className="rounded-xl border-primary/20 bg-background/50 h-11">
                  <SelectValue placeholder="Selecione uma meta" />
                </SelectTrigger>
                <SelectContent className="rounded-xl">
                  {metasAtivas.map((goal) => (
                    <SelectItem key={goal.id} value={String(goal.id)} className="rounded-lg">
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
              className="rounded-xl font-black uppercase tracking-widest text-[10px] h-11 px-6 w-full md:w-auto"
              disabled={!metaEscolhida || isSaving}
              onClick={() => salvar(true)}
            >
              {config.paused ? "Usar esta meta" : "Ativar trocos"}
            </Button>
          ) : (
            <Button
              variant="outline"
              className="rounded-xl font-black uppercase tracking-widest text-[10px] h-11 px-6 w-full md:w-auto"
              disabled={isSaving}
              onClick={() => salvar(false)}
            >
              Desativar
            </Button>
          )}

          <Button
            className="rounded-xl font-black uppercase tracking-widest text-[10px] h-11 px-8 shadow-lg shadow-primary/20 w-full md:w-auto"
            disabled={config.pending_count === 0 || config.paused || config.goal === null || isDepositing}
            onClick={handleDeposit}
          >
            {isDepositing ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <>
                <PiggyBank className="mr-2 h-4 w-4" /> Depositar trocos
              </>
            )}
          </Button>
        </div>

        <div className="p-3 rounded-2xl bg-background/40 flex items-center gap-3">
           <div className="w-6 h-6 rounded-full bg-emerald-500/10 text-emerald-500 flex items-center justify-center">
             <CheckCircle2 className="h-3.5 w-3.5" />
           </div>
           <p className="text-[10px] font-medium text-muted-foreground italic">
             {`Juntando o troco de ${config.pending_count} ${config.pending_count === 1 ? "despesa" : "despesas"}.`}
           </p>
        </div>

        {/* META-38 e META-43: um aporte por conta de origem; trocos de conta excluída descartados */}
        {ultimoDeposito && (ultimoDeposito.deposits.length > 0 || ultimoDeposito.discarded > 0) && (
          <div className="p-3 rounded-2xl bg-background/40 space-y-1">
            {ultimoDeposito.deposits.map((deposito) => (
              <p key={deposito.account_id} className="text-[11px] font-bold text-emerald-600">
                {`Aporte de ${formatarMoeda(deposito.amount)}`}
              </p>
            ))}
            {ultimoDeposito.discarded > 0 && (
              <p className="text-[11px] font-bold text-orange-600">
                {ultimoDeposito.discarded === 1
                  ? "1 troco de conta excluída foi descartado."
                  : `${ultimoDeposito.discarded} trocos de contas excluídas foram descartados.`}
              </p>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  )
}
