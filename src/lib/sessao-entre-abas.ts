import axios from "axios"

import { definirTokenDeAcesso, obterTokenDeAcesso } from "@/services/apiClient"

// Uma renovação só para várias requisições e abas (SESSAO-10), e o aviso de
// fim da sessão às outras abas (SESSAO-14).
//
// Na aba, as chamadas simultâneas dividem a mesma promessa. Entre abas, a
// renovação roda dentro de um Web Lock: quem pega o lock logo depois de outra
// aba renovar usa o token que chegou pelo BroadcastChannel, sem renovar de
// novo, porque o token de renovação antigo já foi revogado pela rotação.

const NOME_DO_CANAL = "fluxar-sessao"
const NOME_DO_LOCK = "fluxar-renovacao"
const JANELA_DO_TOKEN_DE_OUTRA_ABA_MS = 10_000

type Mensagem = { tipo: "token"; token: string; em: number } | { tipo: "fim" }

let canal: BroadcastChannel | null | undefined
let tokenDeOutraAba: { token: string; em: number } | null = null
let renovacaoEmAndamento: Promise<string> | null = null
const ouvintesDoFim = new Set<() => void>()

// Abre o canal na primeira vez que a aba precisa dele
function obterCanal() {
  if (canal === undefined) {
    canal = typeof BroadcastChannel === "undefined" ? null : new BroadcastChannel(NOME_DO_CANAL)
    canal?.addEventListener("message", (evento: MessageEvent<Mensagem>) => {
      const mensagem = evento.data
      if (mensagem?.tipo === "token") {
        tokenDeOutraAba = { token: mensagem.token, em: mensagem.em }
      } else if (mensagem?.tipo === "fim") {
        ouvintesDoFim.forEach((ouvinte) => ouvinte())
      }
    })
  }
  return canal
}

async function renovarDentroDoLock(): Promise<string> {
  const recebido = tokenDeOutraAba
  // O token que a aba já usa e recebeu 401 não serve de novo
  if (
    recebido &&
    Date.now() - recebido.em < JANELA_DO_TOKEN_DE_OUTRA_ABA_MS &&
    recebido.token !== obterTokenDeAcesso()
  ) {
    definirTokenDeAcesso(recebido.token)
    return recebido.token
  }

  // O token de renovação vai no cookie httpOnly da mesma origem
  const { data } = await axios.post<{ access: string }>("/api/auth/refresh/")
  definirTokenDeAcesso(data.access)
  obterCanal()?.postMessage({ tipo: "token", token: data.access, em: Date.now() } satisfies Mensagem)
  return data.access
}

async function renovarComLock(locks: LockManager): Promise<string> {
  return await locks.request(NOME_DO_LOCK, renovarDentroDoLock)
}

export function renovarSessao(): Promise<string> {
  if (!renovacaoEmAndamento) {
    obterCanal()
    const locks = typeof navigator === "undefined" ? undefined : navigator.locks
    const renovacao = locks?.request ? renovarComLock(locks) : renovarDentroDoLock()
    renovacaoEmAndamento = renovacao.finally(() => {
      renovacaoEmAndamento = null
    })
  }
  return renovacaoEmAndamento
}

export function anunciarFimDaSessao() {
  obterCanal()?.postMessage({ tipo: "fim" } satisfies Mensagem)
}

export function aoFimDaSessao(ouvinte: () => void) {
  obterCanal()
  ouvintesDoFim.add(ouvinte)
  return () => {
    ouvintesDoFim.delete(ouvinte)
  }
}
