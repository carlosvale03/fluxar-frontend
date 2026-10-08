import type { User } from "@/contexts/auth-context"
import type { Acesso, ChaveDeLimite, ChaveDeRecurso, UsoDoLimite } from "@/types/planos"

// Acesso do /auth/me (PERM-17) para os testes: tudo liberado e sem limite,
// com as trocas pedidas

export const RECURSOS: ChaveDeRecurso[] = [
  "relatorios_avancados",
  "comparacao_mensal",
  "analise_por_tag",
  "monitor_de_foco",
  "calendario",
  "personalizar_dashboard",
  "orcamentos",
  "metas",
  "tags",
  "cartoes",
  "compras_parceladas",
  "transacoes_recorrentes",
  "importacao_ofx",
  "importacao_planilha",
  "exportacao_pdf",
  "exportacao_xlsx",
  "gestao_do_salario",
  "vinculos",
]

export const LIMITES: ChaveDeLimite[] = [
  "limite_contas",
  "limite_cartoes",
  "limite_categorias",
  "limite_subcategorias",
  "limite_tags",
  "limite_metas",
]

interface Trocas {
  fechados?: ChaveDeRecurso[]
  limites?: Partial<Record<ChaveDeLimite, UsoDoLimite>>
  plan?: Acesso["plan"]
  testing_unlock?: boolean
  is_admin?: boolean
}

export function acesso(trocas: Trocas = {}): Acesso {
  const fechados = new Set(trocas.fechados ?? [])
  return {
    is_admin: trocas.is_admin ?? false,
    testing_unlock: trocas.testing_unlock ?? false,
    plan: trocas.plan ?? "COMMON",
    features: Object.fromEntries(RECURSOS.map((chave) => [chave, !fechados.has(chave)])) as Acesso["features"],
    limits: Object.fromEntries(
      LIMITES.map((chave) => [
        chave,
        trocas.limites?.[chave] ?? (chave === "limite_subcategorias" ? { limit: null } : { limit: null, used: 0 }),
      ]),
    ) as Acesso["limits"],
  }
}

export function usuario(trocas: Trocas & { role?: User["role"] } = {}, semAcesso = false): User {
  return {
    id: "u1",
    name: "Ana",
    email: "ana@x.com",
    plan: trocas.plan ?? "COMMON",
    role: trocas.role ?? "USER",
    emailVerified: true,
    cpf: null,
    phone_number: null,
    avatar_url: null,
    date_of_birth: null,
    monthly_income: null,
    preferences: { currency: "BRL", theme: "light", language: "pt-BR", notifications: {} },
    created_at: "2026-01-01T00:00:00Z",
    access: semAcesso ? undefined : acesso(trocas),
  }
}
