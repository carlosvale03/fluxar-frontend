import axios from "axios"
import { toast } from "sonner"

import { mensagemDeErro } from "@/services/apiClient"

// CONTRATO-30 a CONTRATO-34 (AD-042): o caminho único para mostrar um erro da
// API. Erro de campo vai para o campo do formulário, `detail` vai para o
// Sonner, e rede, 5xx ou tempo esgotado mostram um aviso com "Tentar de novo".

export const MENSAGEM_SEM_SERVIDOR = "Não foi possível falar com o servidor."
export const ROTULO_TENTAR_DE_NOVO = "Tentar de novo"

// Só o que tratarErro usa do formulário (react-hook-form)
interface FormularioComErro {
  setError: (campo: never, erro: { type: string; message: string }) => void
}

export interface OpcoesDeErro {
  form?: FormularioComErro
  // Campos do formulário que recebem erro: lista com os mesmos nomes da API,
  // ou mapa do nome na API para o nome no formulário
  campos?: readonly string[] | Record<string, string>
  tentarDeNovo?: () => void
  mensagemPadrao?: string
}

type Resposta = { status?: number; data?: unknown }

// Erros do DRF por campo, inclusive aninhados ("preferences.theme")
function errosPorCampo(dados: unknown, prefixo = ""): [string, string][] {
  if (typeof dados === "string") return [[prefixo, dados]]
  if (Array.isArray(dados)) return dados.flatMap((item) => errosPorCampo(item, prefixo))
  if (dados && typeof dados === "object") {
    return Object.entries(dados).flatMap(([chave, valor]) =>
      errosPorCampo(valor, prefixo ? `${prefixo}.${chave}` : chave),
    )
  }
  return []
}

function campoDoFormulario(campo: string, campos: OpcoesDeErro["campos"]): string | undefined {
  if (!campos) return undefined
  if (Array.isArray(campos)) return campos.includes(campo) ? campo : undefined
  return (campos as Record<string, string>)[campo]
}

// PERM-15 e PERM-16: 403 de trava do plano. O auth-context registra como reler
// o /auth/me e como abrir a página de planos.
export const CODIGOS_DE_PLANO = ["plan_locked", "plan_limit_reached"] as const
export const ROTULO_VER_PLANOS = "Ver planos"

interface AcoesDePlano {
  reler: () => void
  abrirPlanos: () => void
}

let acoesDePlano: AcoesDePlano | null = null

export function registrarAcoesDePlano(acoes: AcoesDePlano): () => void {
  acoesDePlano = acoes
  return () => {
    if (acoesDePlano === acoes) acoesDePlano = null
  }
}

function ehBloqueioDePlano(status: number | undefined, dados: Record<string, unknown> | undefined) {
  return (
    status === 403 &&
    !!dados &&
    typeof dados === "object" &&
    (CODIGOS_DE_PLANO as readonly unknown[]).includes(dados.code)
  )
}

export function tratarErro(erro: unknown, opcoes: OpcoesDeErro = {}): void {
  const { form, campos, tentarDeNovo, mensagemPadrao } = opcoes

  // CONTRATO-07: uma requisição substituída por outra não mostra erro
  if (axios.isCancel(erro)) return

  const resposta = (erro as { response?: Resposta } | null)?.response

  // CONTRATO-33 e CONTRATO-34: sem resposta (rede ou tempo esgotado) ou 5xx
  if (!resposta || (resposta.status ?? 0) >= 500) {
    toast.error(MENSAGEM_SEM_SERVIDOR, {
      action: tentarDeNovo ? { label: ROTULO_TENTAR_DE_NOVO, onClick: tentarDeNovo } : undefined,
    })
    return
  }

  const dados = resposta.data as Record<string, unknown> | undefined

  // PERM-19 e PERM-20: o aviso da trava leva aos planos, e o acesso é relido
  // para a tela mostrar o bloqueio
  if (ehBloqueioDePlano(resposta.status, dados)) {
    const acoes = acoesDePlano
    toast.error(mensagemDeErro(erro), {
      action: {
        label: ROTULO_VER_PLANOS,
        onClick: () => (acoes ? acoes.abrirPlanos() : window.location.assign("/planos")),
      },
    })
    acoes?.reler()
    return
  }

  // CONTRATO-31: erro que não é de campo, inclusive o 403 (mostra o detail)
  if (dados && typeof dados === "object" && typeof dados.detail === "string") {
    toast.error(mensagemDeErro(erro))
    return
  }

  // CONTRATO-30: cada erro no seu campo; os que sobram vão para o Sonner
  if (resposta.status === 400 && dados && typeof dados === "object") {
    const sobras: string[] = []
    const marcados = new Set<string>()
    for (const [campo, mensagem] of errosPorCampo(dados)) {
      const doFormulario = form ? campoDoFormulario(campo, campos) : undefined
      if (doFormulario && form) {
        // Primeira mensagem de cada campo
        if (!marcados.has(doFormulario)) {
          form.setError(doFormulario as never, { type: "server", message: mensagem })
          marcados.add(doFormulario)
        }
      } else {
        sobras.push(mensagem)
      }
    }
    if (sobras.length) toast.error(sobras.join(" "))
    if (sobras.length || marcados.size) return
  }

  toast.error(mensagemDeErro(erro, mensagemPadrao))
}
