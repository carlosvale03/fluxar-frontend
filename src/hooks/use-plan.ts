import { useAuth } from "@/contexts/auth-context"
import { tratarErro } from "@/lib/erros"
import type { ChaveDeLimite, ChaveDeRecurso, Plano, UsoDoLimite } from "@/types/planos"

// Só para exibir o nome do plano; nenhuma decisão de acesso usa o nome (PERM-18)
const NOMES_DOS_PLANOS: Record<Plano, string> = {
  COMMON: "Comum",
  PREMIUM: "Premium",
  PREMIUM_PLUS: "Premium Plus",
}

export function nomeDoPlano(plano: Plano | undefined): string {
  return plano ? NOMES_DOS_PLANOS[plano] ?? plano : ""
}

// PERM-17 e PERM-18: o que o usuário pode usar vem só do `access` do /auth/me.
// Sem `access` (usuário ainda carregando), nada é liberado nem bloqueado:
// `podeUsar` e `limite` devolvem null e as telas esperam.
export function usePlan() {
  const { user, refreshUser } = useAuth()
  const acesso = user?.access ?? null
  const plano = acesso?.plan ?? user?.plan

  const podeUsar = (chave: ChaveDeRecurso): boolean | null =>
    acesso ? acesso.features?.[chave] === true : null

  const limite = (chave: ChaveDeLimite): UsoDoLimite | null =>
    acesso ? acesso.limits?.[chave] ?? { limit: null } : null

  // PERM-20: no limite (uso maior ou igual ao limite), a criação fica
  // desabilitada; `usado` substitui o uso da API quando a tela conta
  const limiteAtingido = (chave: ChaveDeLimite, usado?: number): boolean => {
    const uso = limite(chave)
    if (!uso || uso.limit === null) return false
    return (usado ?? uso.used ?? 0) >= uso.limit
  }

  // PERM-20: depois de criar ou excluir um item com limite, relê o /auth/me
  // para o `used` acompanhar e o AvisoDeLimite refletir na hora. O item já
  // foi salvo; se a releitura falhar, fica o uso anterior e o aviso vai ao
  // Sonner (CONTRATO-33)
  const atualizarUso = async (): Promise<void> => {
    try {
      await refreshUser?.()
    } catch (error) {
      tratarErro(error, { mensagemPadrao: "Não foi possível atualizar o uso do seu plano." })
    }
  }

  return {
    carregado: acesso !== null,
    podeUsar,
    limite,
    limiteAtingido,
    atualizarUso,
    plano,
    nomeDoPlano: nomeDoPlano(plano),
    liberacaoDeTestes: acesso?.testing_unlock === true,
    ehAdmin: acesso?.is_admin === true,
  }
}
