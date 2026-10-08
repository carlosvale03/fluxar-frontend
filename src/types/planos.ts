// PERM-17 e PERM-18: o acesso do usuário vem do /auth/me; o frontend não tem
// plano nem limite escritos no código

export type Plano = "COMMON" | "PREMIUM" | "PREMIUM_PLUS"

export type ChaveDeRecurso =
  | "relatorios_avancados"
  | "comparacao_mensal"
  | "analise_por_tag"
  | "monitor_de_foco"
  | "calendario"
  | "personalizar_dashboard"
  | "orcamentos"
  | "metas"
  | "tags"
  | "cartoes"
  | "compras_parceladas"
  | "transacoes_recorrentes"
  | "importacao_ofx"
  | "importacao_planilha"
  | "exportacao_pdf"
  | "exportacao_xlsx"
  | "gestao_do_salario"
  | "vinculos"

export type ChaveDeLimite =
  | "limite_contas"
  | "limite_cartoes"
  | "limite_categorias"
  | "limite_subcategorias"
  | "limite_tags"
  | "limite_metas"

// `used` não vem em limite_subcategorias: o uso é contado por categoria-pai na tela
export interface UsoDoLimite {
  limit: number | null
  used?: number
}

export interface Acesso {
  is_admin: boolean
  testing_unlock: boolean
  plan: Plano
  features: Record<ChaveDeRecurso, boolean>
  limits: Record<ChaveDeLimite, UsoDoLimite>
}

// GET /api/plans/ e /api/admin/plans/ (PERM-10, PERM-27)
export type ValorDaTrava = boolean | { limit: number | null }

export interface TravaDoCatalogo {
  key: ChaveDeRecurso | ChaveDeLimite
  type: "feature" | "limit"
  name: string
  description: string
  values: Record<Plano, ValorDaTrava>
}
