import {
  ArrowRightLeft,
  ArrowUpDown,
  Banknote,
  BarChart3,
  Calendar,
  Compass,
  CreditCard,
  Layers,
  LayoutDashboard,
  type LucideIcon,
  PieChart,
  Repeat,
  Settings,
  Tag,
  Target,
  Users,
  Wallet,
} from "lucide-react"

export interface ItemDeNavegacao {
  nome: string
  // Linha de apoio em linguagem comum (PRODUCT.md §3, D-03)
  apoio: string
  href: string
  icone: LucideIcon
}

// D-12 e AZ-21: cinco destinos principais
export const NAVEGACAO_PRINCIPAL: ItemDeNavegacao[] = [
  { nome: "Ponte de Comando", apoio: "Visão geral do mês", href: "/dashboard", icone: Compass },
  { nome: "Diário de Bordo", apoio: "Entradas e saídas", href: "/transacoes", icone: ArrowRightLeft },
  { nome: "Rotas", apoio: "Limites de gasto por categoria", href: "/orcamentos", icone: PieChart },
  { nome: "Destinos", apoio: "Metas de economia", href: "/metas", icone: Target },
  { nome: "Cartas", apoio: "Relatórios", href: "/relatorios", icone: BarChart3 },
]

// ... e o resto no menu "Mais"
export const NAVEGACAO_MAIS: ItemDeNavegacao[] = [
  { nome: "Contas", apoio: "Saldos das contas e carteiras", href: "/contas", icone: Wallet },
  { nome: "Cartões", apoio: "Cartões e faturas", href: "/cartoes", icone: CreditCard },
  { nome: "Recorrentes", apoio: "Lançamentos que se repetem", href: "/transacoes/recorrentes", icone: Repeat },
  { nome: "Partilha", apoio: "Divisão do salário", href: "/salario", icone: Banknote },
  { nome: "Calendário", apoio: "Vencimentos e fechamentos", href: "/calendario", icone: Calendar },
  { nome: "Categorias", apoio: "Categorias e classes", href: "/categorias", icone: Layers },
  { nome: "Marcadores", apoio: "Tags", href: "/tags", icone: Tag },
  { nome: "Importar", apoio: "Extratos e planilhas", href: "/importar", icone: ArrowUpDown },
]

export const NAVEGACAO_ADMIN: ItemDeNavegacao[] = [
  { nome: "Painel geral", apoio: "Saúde do sistema", href: "/admin/dashboard", icone: LayoutDashboard },
  { nome: "Usuários", apoio: "Contas e planos", href: "/admin/usuarios", icone: Users },
  { nome: "Configurações", apoio: "Manutenção e limites", href: "/admin/configuracoes", icone: Settings },
]

// AZ-21.2: o item acende também nas páginas filhas (/cartoes/12 acende Cartões).
// Um item mais específico da mesma lista (Recorrentes) vence o mais geral.
export function itemAtivo(pathname: string, itens: ItemDeNavegacao[]): string | null {
  const candidatos = itens
    .filter((item) => pathname === item.href || pathname.startsWith(`${item.href}/`))
    .sort((a, b) => b.href.length - a.href.length)
  return candidatos[0]?.href ?? null
}

// Rotas sem a casca do app (cabeçalho, rodapé e menu inferior): AZ-21.6
const ROTAS_SEM_CASCA = ["/auth", "/termos/aceite", "/manutencao"]

export function semCasca(pathname: string): boolean {
  return ROTAS_SEM_CASCA.some((rota) => pathname === rota || pathname.startsWith(`${rota}/`))
}
