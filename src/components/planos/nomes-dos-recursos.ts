import type { ChaveDeLimite, ChaveDeRecurso, TravaDoCatalogo } from "@/types/planos"

type ChaveDaTrava = ChaveDeRecurso | ChaveDeLimite

// Texto antigo do catálogo da API -> texto com o glossário do Azimute
type Troca = readonly [antigo: string, novo: string]

// AZ-32: o catálogo da API ainda usa os nomes antigos (tags, metas, orçamentos...).
// Na tela, as travas desses módulos aparecem com os termos do glossário. A troca
// só vale quando a API manda exatamente o texto antigo: um nome ou uma descrição
// mudados no painel aparecem como vieram. As chaves e os valores não mudam.
const NOMES: Partial<Record<ChaveDaTrava, Troca>> = {
  relatorios_avancados: ["Relatórios avançados", "Cartas avançadas"],
  analise_por_tag: ["Análise por tag", "Análise por marcador"],
  personalizar_dashboard: ["Personalizar o dashboard", "Personalizar a Ponte de Comando"],
  orcamentos: ["Orçamentos", "Rotas"],
  metas: ["Metas", "Destinos"],
  tags: ["Tags", "Marcadores"],
  transacoes_recorrentes: ["Transações recorrentes", "Lançamentos recorrentes"],
  gestao_do_salario: ["Gestão do salário", "Partilha"],
  vinculos: ["Vínculos entre transações", "Vínculos entre lançamentos"],
  limite_tags: ["Tags", "Marcadores"],
  limite_metas: ["Metas", "Destinos"],
}

const DESCRICOES: Partial<Record<ChaveDaTrava, Troca>> = {
  relatorios_avancados: ['Aba "Avançados" da tela Relatórios.', 'Aba "Avançados" da tela Cartas.'],
  comparacao_mensal: [
    "Gráfico de comparação mensal no dashboard e nos relatórios.",
    "Gráfico de comparação mensal na Ponte de Comando e nas Cartas.",
  ],
  analise_por_tag: ["Análise e distribuição por tag nos relatórios.", "Análise e distribuição por marcador nas Cartas."],
  monitor_de_foco: ["Monitor de foco nos relatórios.", "Monitor de foco nas Cartas."],
  orcamentos: [
    "Tela Orçamentos, inclusive a importação de orçamentos de outro mês.",
    "Tela Rotas, inclusive a importação de rotas de outro mês.",
  ],
  metas: [
    "Tela Metas: metas, aportes, resgates, histórico e cofrinho de arredondamento.",
    "Tela Destinos: destinos, aportes, resgates, histórico e o Lastro.",
  ],
  transacoes_recorrentes: [
    'Opção "recorrente" ao lançar, e edição e exclusão de séries inteiras.',
    'Opção "recorrente" ao registrar, e edição e exclusão de séries inteiras.',
  ],
  tags: ["Tela Tags e campo de tags nos lançamentos.", "Tela Marcadores e campo de marcadores nos lançamentos."],
  exportacao_pdf: ["Exportação de transações em PDF.", "Exportação de lançamentos em PDF."],
  exportacao_xlsx: ["Exportação de transações em XLSX.", "Exportação de lançamentos em XLSX."],
  personalizar_dashboard: ["Personalização do layout do dashboard.", "Personalização do layout da Ponte de Comando."],
  gestao_do_salario: [
    "Tela Gestão do salário: plano de divisão, simulação, divisão, desfazer e o aviso ao lançar o salário.",
    "Tela Partilha: plano de divisão, simulação, divisão, desfazer e o aviso ao registrar o salário.",
  ],
  vinculos: [
    "Criar e trocar vínculos entre transações, filtro de vinculadas e relatório de gastos puxados.",
    "Criar e trocar vínculos entre lançamentos, filtro de vinculados e a carta de gastos puxados.",
  ],
  limite_contas: [
    "Contas ativas, sem contar os cofrinhos criados por metas.",
    "Contas ativas, sem contar as contas criadas pelos destinos.",
  ],
  limite_tags: ["Tags.", "Marcadores."],
  limite_metas: ["Metas ativas.", "Destinos ativos."],
}

function trocar(trocas: Partial<Record<ChaveDaTrava, Troca>>, chave: ChaveDaTrava, texto: string): string {
  const troca = trocas[chave]
  return troca && troca[0] === texto ? troca[1] : texto
}

export function nomeDaTrava(trava: Pick<TravaDoCatalogo, "key" | "name">): string {
  return trocar(NOMES, trava.key, trava.name)
}

export function descricaoDaTrava(trava: Pick<TravaDoCatalogo, "key" | "description">): string {
  return trocar(DESCRICOES, trava.key, trava.description)
}
