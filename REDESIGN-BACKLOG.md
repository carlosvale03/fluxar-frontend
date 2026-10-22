# AZIMUTE — Levantamento completo de tarefas do redesign

> Detalha o roadmap da seção 6 do [PRODUCT.md](PRODUCT.md) arquivo por arquivo, com base num inventário do código em 22/10/2026 (branch `development`, commit `cbdd050`).
> Os IDs AZ-xx são os mesmos do PRODUCT.md; subtarefas usam AZ-xx.y. Tarefas novas descobertas no inventário começam em AZ-40.
> Regras visuais e de texto: [DESIGN.md](DESIGN.md) e [PRODUCT.md](PRODUCT.md).
>
> **Estado em 22/10/2026:** Fases 1 a 4 implementadas (PRs #45 a #51 e o PR da Fase 4). Ficam abertos: o teste com 5 usuários (AZ-37, roteiro em [TESTE-DE-USABILIDADE.md](TESTE-DE-USABILIDADE.md)); o desfazer nas exclusões, que depende de um endpoint de restauração no backend; a Bússola do desvio geral (P-03) e a tolerância das rotas, que dependem de dados da API; a contagem animada dos indicadores (AZ-35); "Ver como tabela" e legenda clicável nos gráficos; e a decisão P-01 do PRODUCT.md (as P-12 a P-16 viraram as decisões D-13 a D-17).

---

## 1. Retrato do sistema hoje

| Item | Número |
|---|---|
| Linhas em `src/app`, `src/components` e `src/providers` | ~34,8 mil |
| Páginas (`page.tsx`) | 32 (17 do app, 4 do admin, 5 de acesso, 4 institucionais, design-system e a raiz, que só redireciona) |
| Componentes em `src/components` | ~140 arquivos em 19 pastas |
| Usos de classes semânticas (`bg-card`, `text-muted-foreground`, `bg-primary` …) | ~2.900 em ~120 arquivos — mudam sozinhos com a troca dos tokens |
| Classes de paleta crua do Tailwind (`emerald-500`, `amber-*`, `rose-*`, `white`, `black` …) | **1.210 em 101 arquivos** — trabalho manual |
| Hex/rgb no TSX | 207 (boa parte é dado: cores pré-definidas dos seletores e cores de banco) |
| Arquivos com Recharts | 10, com o mesmo array `COLORS` copiado 3 vezes |
| Ocorrências de "Fluxar" | 87 em 39 arquivos (incluindo chaves técnicas) |
| Testes | 103 arquivos, 611 testes; 89 arquivos consultam texto; ~209 linhas de consulta usam termos que serão renomeados |
| Ícones | lucide-react em 122 arquivos (fica) |
| framer-motion | 10 arquivos, só em acesso, manutenção, sobre, termos e overlay |
| Toasts | sonner em ~50 arquivos, 128 chamadas, 41 com "sucesso", nenhum com ação de desfazer |

### Achados que viram tarefa

1. **As fontes não estão funcionando.** `layout.tsx` carrega Geist em `--font-geist-sans`, mas o `@theme` não mapeia `--font-sans`; o app usa a fonte padrão do sistema. (AZ-03)
2. **Animações de entrada não existem de fato.** `animate-in` (109 usos), `animate-out` (10) e `animate-shimmer` (4) dependem do `tw-animate-css`, que não está instalado. (AZ-40)
3. **Variáveis indefinidas:** `--primary-rgb` e `--primary` usadas em `contas/page.tsx` e `ImportBudgetsDialog.tsx` não existem. (AZ-01.4)
4. **Tokens mortos:** `--finance-chart-1..4` nunca usados; `--bg-*`, `--text-*` e `--palette-*` nunca referenciados no TSX. (AZ-01)
5. **Estilo "gritado" espalhado:** `font-black` (880), `uppercase` (782), `text-[8–11px]` (777), `tracking-widest` (385), `rounded-[Npx]` (272), `backdrop-blur` (101), `transition-all` (361). Contradiz o DESIGN.md (mínimo de 12px, raios 6/8/12, sem blur decorativo) e precisa ser limpo tela a tela. (AZ-41)
6. **Exclusão inconsistente:** Dialog (contas, cartões, admin), AlertDialog (categorias, tags, orçamentos) e `window.confirm()` nativo (metas: meta e cofrinho). (AZ-15, AZ-27)
7. **Navegação:** o item ativo usa `pathname ===`, então `/cartoes/[id]` não acende Cartões; `/transacoes/recorrentes` não aparece no menu; o rótulo de relatórios é "Gráficos". (AZ-21)
8. **Alternador de tema escondido** atrás de `NEXT_PUBLIC_SHOW_THEME_TOGGLE`; o padrão do `ThemeProvider` é `system`. (AZ-05)
9. **Sem `error.tsx`, `loading.tsx` ou `not-found.tsx`.** Erros e carregamentos são resolvidos dentro de cada página. (AZ-42)
10. **Cabeçalho e rodapé aparecem em todas as rotas**, inclusive acesso, termos e manutenção. (AZ-21.6)
11. **Acessibilidade:** nenhum skip link, 2 `aria-live`, 2 usos de reduced-motion. (AZ-36)
12. **Testes acoplados a cores:** `tests/classes/classe-das-categorias` e `grafico-por-classe` comparam rgb exatos; `salario/equilibrio`, `resumo` e `plano` verificam `text-destructive`/`text-muted-foreground`. (AZ-39)

---

## 2. Decisões que o inventário levantou

| ID | Pergunta | Recomendação |
|---|---|---|
| P-06 | Renomear as chaves técnicas `fluxar.token`, `fluxar.refresh_token`, `fluxar.voltar_*`, `fluxar-sessao`, `fluxar-renovacao`, `fluxar-tema`? | **Manter.** Trocar desloga todo mundo e quebra testes de sessão; não é visível ao usuário. |
| P-07 | Renomear o pacote (`fluxar-frontend`), o repositório e o domínio da API (`fluxar-api.onrender.com`)? | Fora do escopo do redesign; decidir junto com o backend. |
| P-08 | Cores pré-definidas dos seletores (categoria, tag, conta, classe) e cores de banco (`data/banks.ts`)? | **Manter**: são dados do usuário e marcas de terceiros. Só conferir contraste do texto sobre elas. |
| P-09 | Nome do cartão de exemplo "Fluxar Pay" no `credit-card-item` e no formulário. | Trocar por "Azimute" ou por um nome neutro ("Meu cartão"). |
| P-10 | Telas de acesso e institucionais continuam com cabeçalho e rodapé do app? | Não: layout próprio, só com logo (AZ-21.6). |
| P-11 | framer-motion nas telas de acesso e marketing. | Manter a biblioteca, mas aplicar os tokens de movimento e o reduced-motion. |

---

## 3. Ordem sugerida de PRs

```
Onda 1 (fundação, em paralelo)   AZ-01/02 tokens · AZ-03/04 fontes · AZ-05 tema · AZ-06 marca · AZ-07 movimento · AZ-40 animações
Onda 2 (base)                    AZ-08 design-system · AZ-43 tema de gráficos · AZ-44 cores financeiras semânticas
Onda 3 (componentes, paralelo)   AZ-10 … AZ-20
Onda 4 (casca)                   AZ-21 navegação · AZ-22 cabeçalho de página · AZ-42 limites de erro/carregamento
Onda 5 (telas, paralelo por módulo) AZ-23 … AZ-31 (cada uma já inclui a limpeza AZ-41 e os testes do módulo)
Onda 6 (linguagem e acabamento)  AZ-32 … AZ-39
```

Cada PR de tela atualiza os testes do próprio módulo. Assim a suíte nunca fica vermelha esperando uma tarefa de "consertar testes" no final.

---

## 4. Fase 1 — Fundação

### AZ-01 Tokens de cor em `src/app/globals.css` (M)
- [ ] AZ-01.1 Substituir os primitivos `--palette-*` pela paleta do DESIGN.md §3.1 e §3.2, mantendo as três camadas.
- [ ] AZ-01.2 Reescrever o bloco `.dark`/`[data-theme='dark']` usando os primitivos, sem hex solto.
- [ ] AZ-01.3 Criar os tokens auxiliares (`tolerance`, `sheen`, `focus-ring`, `scrim`) e as séries de gráfico §3.4.
- [ ] AZ-01.4 Definir ou eliminar `--primary-rgb`/`--primary` (usados em `contas/page.tsx` ×3 e `ImportBudgetsDialog.tsx`).
- [ ] AZ-01.5 Remover `--finance-chart-1..4` e demais tokens mortos; trocar o comentário "FLUXAR DESIGN SYSTEM".
- [ ] AZ-01.6 Revisar as utilidades `bg-avatar-premium`, `custom-scrollbar` e `no-scrollbar` para a paleta nova.
- Aceite: nenhum hex do Fluxar no arquivo; contraste conferido nos dois temas.

### AZ-02 `@theme` do Tailwind v4 (P)
- [ ] AZ-02.1 Mapear os semânticos novos (`canvas`, `surface`, `elevated`, `border-*`, `fg*`, `accent*`, `inflow`, `outflow`, `warn`, `info`).
- [ ] AZ-02.2 Apontar os nomes shadcn existentes para os tokens novos (tabela do DESIGN.md §3.5), para os ~2.900 usos mudarem sem tocar nos arquivos.
- [ ] AZ-02.3 Raios: `sm` 6, `md` 8, `lg` 12, `full` 999.

### AZ-03 Fontes (P)
- [ ] AZ-03.1 Trocar `Geist`/`Geist_Mono` por Archivo (eixo `wdth`), IBM Plex Sans e IBM Plex Mono em `src/app/layout.tsx`.
- [ ] AZ-03.2 **Mapear `--font-sans`, `--font-mono` e `--font-display` no `@theme`** (hoje quebrado).
- [ ] AZ-03.3 Conferir os 14 usos de `font-mono` (admin, money-input, formulários de tag/meta/categoria/conta/cartão, relatórios).

### AZ-04 Escala tipográfica (P)
- [ ] AZ-04.1 Utilitários `.display-*`, `.value-*`, `.label` e `.mono` com `tabular-nums` (DESIGN.md §4).
- [ ] AZ-04.2 Corpo de 16px e campos de 16px abaixo de 768px.
- [ ] AZ-04.3 Helper de formatação `pt-BR` para moeda e percentual, se ainda não houver um central.

### AZ-05 Tema (P)
- [ ] AZ-05.1 `ThemeProvider` com `defaultTheme="dark"` (hoje `system`).
- [ ] AZ-05.2 Remover a dependência de `NEXT_PUBLIC_SHOW_THEME_TOGGLE`; alternador sempre visível (cabeçalho e Configurações).
- [ ] AZ-05.3 Alternador com rótulo acessível e estado ("Tema escuro ativo").

### AZ-06 Marca (P)
- [ ] AZ-06.1 Metadados em `app/layout.tsx` ("Azimute — Rumo exato para o seu dinheiro").
- [ ] AZ-06.2 Logo provisório em SVG (substitui os PNGs `public/logo/logo-*-clean.png` e `simbol.png` no `header.tsx` e no `auth-shell.tsx`).
- [ ] AZ-06.3 `favicon.ico`, ícones e `site.webmanifest` (hoje com `name` vazio e não ligado aos metadados).
- [ ] AZ-06.4 Trocar "Fluxar" nos textos visíveis: `header`, `footer`, `admin-sidebar`, `auth-shell`, `server-wakeup-overlay`, `page-help`, `excluir-conta` (nome do arquivo exportado `meus_dados_fluxar.xlsx` e toast), `RevisaoDeContas` ("Conta no Fluxar"), `credit-card-item`/`credit-card-form-dialog` ("Fluxar Pay", P-09), login, cadastro, verificação, redefinição de senha, manutenção, sobre, termos, aceite, planos, dashboard, admin/usuarios.
- [ ] AZ-06.5 **Não** trocar as chaves técnicas (P-06).

### AZ-07 Movimento, camadas e breakpoints (P)
- [ ] AZ-07.1 Tokens `motion-fast/base/slow` e curvas.
- [ ] AZ-07.2 Escala de z-index do DESIGN.md §5.
- [ ] AZ-07.3 Breakpoints 375/768/1024/1440 no `@theme`.
- [ ] AZ-07.4 Regra global para `prefers-reduced-motion`.

### AZ-40 Animações de entrada (P) — novo
- [ ] Instalar e importar `tw-animate-css` **ou** substituir os 119 usos de `animate-in`/`animate-out` por utilitários próprios com os tokens de movimento.
- [ ] Definir `animate-shimmer` (4 usos) ou trocar pelo `Skeleton`.
- [ ] Levar o `@keyframes gradient-flow` de `manutencao/page.tsx` para o CSS global ou removê-lo.

### AZ-08 Página `/design-system` (M)
- [ ] Reescrever `app/design-system/page.tsx` (164 linhas) com tokens, tipografia, componentes e alternador de tema, a partir da prévia validada.
- [ ] Decidir o destino de `ui/modal.tsx` (só usado aqui): remover ou unificar com `Dialog`.

---

## 5. Fase 2 — Componentes base

### AZ-43 Tema único de gráficos (M) — novo
- [ ] AZ-43.1 Criar `src/lib/graficos/tema.ts` (ou em `constants/`) com séries, grade, eixos, tooltip e formatação `pt-BR`.
- [ ] AZ-43.2 Eliminar os 3 arrays `COLORS` duplicados (`relatorios/page.tsx`, `CategoryDistributionChart`, `TagDistributionChart`).
- [ ] AZ-43.3 Trocar os hex fixos de `GoalDetails` e `GoalSimulator` (`#00A8E8`, `#2DD4BF`, `#CBD5E1` …), `tags/page.tsx` (`#10b981`, `#3b82f6`) e os gradientes de `MonthlyComparisonChart` e `relatorios`.
- [ ] AZ-43.4 Tooltip compartilhado (fundo `elevated`, mono, foco por teclado).
- [ ] AZ-43.5 Componente de estado do gráfico: carregando, vazio (evoluir `ChartEmptyState`), erro com "Tentar de novo" (unificar com `reports/erro-do-bloco`).
- [ ] AZ-43.6 "Ver como tabela" e resumo em `aria-label`.

### AZ-44 Cores financeiras semânticas (M) — novo
O grosso das 1.210 classes cruas é `emerald` (entrada/sucesso), `rose`/`red` (saída/erro), `amber`/`orange` (alerta) e `blue` (info).
- [ ] AZ-44.1 Criar utilitários semânticos (`text-inflow`, `bg-inflow/10`, `text-outflow`, `text-warn`, `text-info` …).
- [ ] AZ-44.2 Componentes `<Valor>` (sinal, cor e formatação) e `<Variacao>` (▲/▼ com percentual) para não repetir a lógica.
- [ ] AZ-44.3 Trocar os 29 usos inline de `var(--finance-income/expense)` pelos tokens novos.
- A substituição em massa das classes cruas acontece em cada tela (AZ-23 a AZ-31), não num PR gigante.

### AZ-10 Button — `ui/button.tsx` (P)
- [ ] Variantes primária, secundária, fantasma e destrutiva; remover os 18 usos de paleta crua do arquivo e as variantes `brand-*`.
- [ ] Estados de carregamento (largura fixa, sem duplo clique), desabilitado com motivo, pressionado.
- [ ] `aria-label` obrigatório em botão só de ícone (revisar usos).

### AZ-11 Card — `ui/card.tsx` (P)
- [ ] Superfície, borda, raio 12px, brilho de 1px só no escuro.
- [ ] Variante clicável (seta, hover, alvo inteiro) e estática.
- [ ] Remover `rounded-[32px]`, `rounded-2xl` e `backdrop-blur` sobrescritos nas páginas (feito junto de cada tela).

### AZ-12 Campos — `input`, `textarea`, `select`, `money-input`, `password-input`, `form`, `label`, `checkbox`, `switch`, `slider` (M)
- [ ] Rótulo visível, `border-input`, foco em ouro, erro ligado por `aria-describedby` (ajustar `form.tsx`).
- [ ] 44px e 16px no celular; `inputmode="decimal"` no `money-input`.
- [ ] Resumo de erros para formulários longos (transação, cartão, conta, meta).
- [ ] `autocomplete` correto nos campos de acesso; colar permitido.

### AZ-13 Badge e pílulas — `ui/badge.tsx` (P)
- [ ] Mono 12px, caixa alta, variantes semânticas; remover `brand-*`.
- [ ] Chip de filtro ativo com "×" (usado em AZ-24).
- [ ] Revisar `selo-de-sugerida` e `marca-do-vinculo` sobre a variante nova.

### AZ-14 Alertas — `ui/alert.tsx`, `planos/aviso-de-limite`, `planos/recurso-bloqueado`, `sessao/aviso-de-conexao` (P)
- [ ] Listra lateral, ícone, sem fundo colorido.
- [ ] `recurso-bloqueado` explica o motivo e o caminho (plano necessário).

### AZ-15 Diálogos — `dialog`, `alert-dialog`, `sheet`, `popover`, `dropdown-menu` (M)
- [ ] Superfície `elevated`, título em Archivo, fechar visível, Esc, foco preso e devolvido.
- [ ] Componente único de **confirmação destrutiva** com impacto descrito; substituir os três padrões atuais (Dialog, AlertDialog e `window.confirm`).
- [ ] Confirmação ao fechar com alterações não salvas (formulários de transação, cartão, conta, meta).

### AZ-16 Tabela — `ui/table.tsx`, `ui/paginacao.tsx` (M)
- [ ] Linhas de 40px, cabeçalho `.label`, valores à direita, `aria-sort`.
- [ ] Versão em lista para o celular (padrão único; hoje só `/transacoes` tem).

### AZ-17 Medição — novos `Bussola`, `AnelDeProgresso`, `BarraDeRota`; revisar `ui/progress.tsx` (M)
- [ ] Desvio em %, tolerância marcada, rótulo acessível completo.
- [ ] Usar em `BudgetSummary`, `orcamentos/page`, `credit-card-item` (limite), `metas/page` e `GoalDetails`.

### AZ-18 Gráficos (M)
- [ ] Aplicar o tema da AZ-43 nos 10 arquivos com Recharts.
- [ ] Granularidade no título; legenda clicável; barras horizontais no celular.

### AZ-19 Toast com desfazer (P)
- [ ] Configurar o `<Toaster>` de `layout.tsx` (tirar `richColors`, posição inferior direita, tema próprio).
- [ ] Helper `avisar.excluido(mensagem, desfazer)` com 5s e `aria-live`.
- [ ] Aplicar onde o backend permitir restaurar (lançamento, categoria, tag); onde não permitir, manter confirmação.

### AZ-20 Restantes — `tabs`, `calendar`, `month-picker`, `month-range-picker`, `scroll-area`, `separator`, `skeleton`, `avatar`, `help-info`, `page-help`, `icon-picker`, `server-wakeup-overlay`, `theme-toggle` (M)
- [ ] Alvos de 44px no celular; `month-range-picker` sem o "✓" emoji.
- [ ] `server-wakeup-overlay` com os tokens e reduced-motion.

---

## 6. Fase 3 — Casca e telas

### AZ-21 Navegação — `layout/header.tsx` (402), `layout/footer.tsx`, `layout/admin-sidebar.tsx` (M)
- [ ] AZ-21.1 Barra com 5 destinos (Ponte de Comando, Diário de Bordo, Rotas, Destinos, Cartas) e menu "Mais" (Contas, Cartões, Partilha, Calendário, Categorias, Marcadores, Importar). Hoje: Dashboard, Contas, Cartões, Transações, Gráficos + "…".
- [ ] AZ-21.2 Item ativo por prefixo (`startsWith`), para `/cartoes/[id]` e `/transacoes/recorrentes` acenderem o pai; `aria-current`.
- [ ] AZ-21.3 Incluir "Recorrentes" como sub-item do Diário de Bordo.
- [ ] AZ-21.4 Celular: menu inferior com 5 itens + "Mais" em sheet; "Registrar" fixo. Hoje é um sheet lateral com seta animada.
- [ ] AZ-21.5 Menu do avatar com "Sair" separado; Painel Admin só para admins.
- [ ] AZ-21.6 Layout próprio sem cabeçalho/rodapé do app para `/auth/*`, `/termos/aceite` e `/manutencao` (P-10).
- [ ] AZ-21.7 Link "Pular para o conteúdo" e foco no `h1` na troca de rota.
- [ ] AZ-21.8 Busca com atalho (se ainda não existir, só o gatilho visual fica para depois — não é funcionalidade nova obrigatória).
- [ ] AZ-21.9 `admin-sidebar`: tokens novos, item ativo, "Voltar à aplicação".

### AZ-22 Cabeçalho de página padrão (P)
- [ ] Componente `CabecalhoDePagina` com título, linha de apoio, período (`MonthPicker`) e ações; integrar `page-help`.
- [ ] Usar em todas as páginas do app.

### AZ-42 Limites de erro e carregamento (M) — novo
- [ ] `app/(app)/error.tsx`, `app/(app)/loading.tsx`, `app/not-found.tsx` e `app/global-error.tsx` no estilo novo.
- [ ] Substituir o "Ops! Algo deu errado." do dashboard pela mensagem padrão.

### AZ-23 Ponte de Comando — `(app)/dashboard/page.tsx` (660) + `components/dashboard/*` (~1,8 mil) (G)
- [ ] Layout do DESIGN.md §7: Posição, 4 indicadores (`DashboardKPIs`), alertas, Trajetória (`DailyCashFlowChart` evoluído), Rotas (`BudgetSummary` com `BarraDeRota`), Diário (últimos lançamentos), Destinos.
- [ ] Desvio geral com a `Bussola` (depende de P-03).
- [ ] `dashboard-customizer`: blocos opcionais (`NetWorthBreakdown`, `MonthlyComparisonChart`, distribuições por categoria/classe/tag) + **subir/descer por botão** além do arrastar nativo.
- [ ] Menu "Registrar" com os 4 formulários (lançamento, transferência, compra no cartão, pagamento de fatura).
- [ ] `AvisoDoSalario` ("Seu salário chegou!") no tom novo.
- [ ] Limpeza AZ-41 e cores AZ-44 (26 classes cruas, 8 hex).
- [ ] Testes do módulo.

### AZ-24 Diário de Bordo — `(app)/transacoes/page.tsx` (1.176), `transacoes/recorrentes/page.tsx` (186), `components/transactions/*` (~4,3 mil) (G)
- [ ] Tabela densa (desktop) e lista (celular) com o componente `<Valor>`.
- [ ] `transaction-filters` (469): filtros compactos, chips de filtros ativos, "Limpar filtros".
- [ ] Abas Semana/Mês/Ano integradas ao cabeçalho de período.
- [ ] Formulários: `transaction-form-dialog` (899), `transfer-form-dialog` (654), `card-expense-form-dialog` (637), `invoice-payment-dialog` (641) — rótulos, erros por campo, restrições, confirmação ao fechar.
- [ ] `transaction-delete-dialog` (137) no componente de confirmação destrutiva (escopo de recorrência e parcelas mantido); desfazer onde possível.
- [ ] `import-dialog` (581, OFX) e `vincular-transacao` (254) no estilo novo.
- [ ] Recorrentes no mesmo padrão de tabela.
- [ ] Limpeza AZ-41/AZ-44 (60 + 52 + 44 + 23 + 21 classes cruas nos maiores arquivos).
- [ ] Testes do módulo.

### AZ-25 Contas e Cartões (M + M)
- **Contas** — `(app)/contas/page.tsx` (528), `accounts/*`
  - [ ] Grade de cards, filtros avançados (sheet com slider), confirmação destrutiva com impacto.
  - [ ] `account-form-dialog` (496): 20 hex de cores pré-definidas ficam (P-08).
  - [ ] `balance-adjustment-dialog` ("Reajustar Saldo").
- **Cartões** — `(app)/cartoes/page.tsx` (409), `cartoes/[id]/page.tsx` (343), `cards/*`
  - [ ] `credit-card-item` (156): visual do cartão no estilo novo, limite com `BarraDeRota`, "Fluxar Pay" (P-09).
  - [ ] `invoice-list` (217) e `invoice-details-dialog` (194) com a tabela nova.
  - [ ] "Desfazer pagamento" alinhado ao padrão de desfazer.
- [ ] Testes de contas e faturas.

### AZ-26 Rotas — `(app)/orcamentos/page.tsx` (522), `budgets/BudgetForm` (302), `ImportBudgetsDialog` (353) (M)
- [ ] Cards de rota com `BarraDeRota`, desvio em % e tolerância.
- [ ] Confirmação destrutiva padrão (hoje AlertDialog).
- [ ] Estado vazio sem "Comece agora!".

### AZ-27 Destinos — `(app)/metas/page.tsx` (706), `goals/*` (~2,4 mil) (M/G)
- [ ] Cards com `AnelDeProgresso` e data prevista.
- [ ] **Trocar os dois `window.confirm()`** (excluir meta e cofrinho vazio) pelo componente de confirmação.
- [ ] `GoalForm` (577, abas), `GoalDepositForm`, `GoalWithdrawForm`, `GoalHistory`, `GoalDetails` (492), `GoalSimulator` (401 → Projeção de Trajetória).
- [ ] `SpareChangeBank` → Lastro, com linha de apoio "Cofrinho do troco".
- [ ] Testes de metas.

### AZ-28 Partilha — `(app)/salario/page.tsx`, `components/salario/*` (~3,1 mil) (M/G)
- [ ] Etapas (`EtapasDoPlano`) com progresso e volta; `EscolhaDoModelo`, `SobreOModelo`, `EditorDoPlano` (784), `ResumoDoPlano`, `BarraDaDivisao`.
- [ ] `RevisaoDaDivisao` (638), `DesfazerDivisao`, `DivisoesRecentes` — já têm desfazer; alinhar ao padrão novo.
- [ ] `ReceitasDoSalario`, `SalariosADividir`, `ReferenciasDoMes`, `AvisoDoSalario`.
- [ ] Testes: 13 arquivos em `tests/salario`, os mais afetados pelos textos.

### AZ-29 Cartas e Calendário (G + P)
- **Cartas** — `(app)/relatorios/page.tsx` (1.166), `reports/*`
  - [ ] Seções (Análise Patrimonial, Aportes vs Performance, Monitor de Foco, Análise de Risco) no layout novo, com o tema de gráficos.
  - [ ] `focus-selection-modal`, `GastosPuxados`, `erro-do-bloco`.
  - [ ] 63 classes cruas e 15 hex.
- **Calendário** — `(app)/calendario/page.tsx` (144), `calendar/FinancialCalendar` (247)
  - [ ] Grade do mês no estilo novo, valores com `<Valor>`, diálogo do dia (31 classes cruas).
- [ ] Testes de relatórios.

### AZ-30 Categorias, Marcadores e Importar (M + M + M)
- **Categorias** — `(app)/categorias/page.tsx` (696), `CategoryForm` (416), `GerenciarClasses` (477), `ui/icon-picker`
  - [ ] Árvore de categorias, abas, tabela; confirmação padrão. Cores pré-definidas ficam (P-08).
- **Marcadores** — `(app)/tags/page.tsx` (802), `TagForm` (243), `TagSelector` (224)
  - [ ] Gráfico de insights com o tema novo; "Guia de Tags Premium" no tom novo.
- **Importar** — `(app)/importar/page.tsx` (377), `importacao/*` (~1,3 mil)
  - [ ] Assistente com etapas claras e volta, área de soltar arquivo com alternativa por botão, revisão de linhas com tabela nova, resultado.
- [ ] Testes de classes, importação e permissões.

### AZ-31 Acesso, Planos, Perfil, Configurações, Institucional e Admin (G)
- **Acesso** — `auth/login` (228), `register` (319), `forgot-password` (154), `reset-password` (200), `verify-email` (170), `auth-shell` (82), `resend-verification`
  - [ ] Layout próprio, logo novo, framer-motion com tokens e reduced-motion; "Bem-vindo de volta ao Fluxar!" e "Tudo pronto!" no tom novo.
- **Planos** — `(app)/planos/page.tsx` (150): comparação no estilo novo (nome em P-01).
- **Perfil** — `(app)/perfil/page.tsx` (430): recorte de foto e formulário.
- **Configurações** — `(app)/configuracoes/page.tsx` (383), `privacidade/*`: abas, alternador de tema visível, exclusão de conta com confirmação padrão.
- **Institucional** — `sobre` (121, "Feito com ❤️"), `termos` (259, 54 classes cruas), `termos/aceite` (124), `manutencao` (133).
- **Admin** — `admin/dashboard` (170), `admin/usuarios` (769), `admin/usuarios/[id]` (744, 64 classes cruas), `admin/configuracoes` (436, emojis ⛔/✅), `admin/saude-do-sistema`, `planos/tabela-de-travas`: **só tokens e componentes base**, sem redesenho de layout.
- [ ] Testes de autenticação, LGPD, painel admin e permissões.

### AZ-41 Limpeza de estilo por tela (contínuo) — novo
Aplicada dentro de cada PR de tela (AZ-23 a AZ-31), com este checklist:
- [ ] Nenhuma classe de paleta crua (`emerald-*`, `rose-*`, `amber-*`, `blue-*`, `white`, `black` …) fora de dados do usuário.
- [ ] Nenhum `text-[8px]`–`text-[11px]`; usar a escala.
- [ ] `font-black` + `uppercase` + `tracking-widest` só via `.label`.
- [ ] Raios da escala (sem `rounded-[32px]`).
- [ ] Sem `backdrop-blur` decorativo e sem `shadow-primary/20`.
- [ ] `transition-all` trocado por transições de propriedade com os tokens.
- [ ] Uma ação primária por área.

---

## 7. Fase 4 — Linguagem e acabamento

### AZ-32 Glossário na interface (M)
Ocorrências a revisar (strings visíveis, sem mexer em tipos e campos da API):

| Termo atual | Novo | Ocorrências / arquivos | Principais arquivos |
|---|---|---|---|
| Dashboard | Ponte de Comando | 5 / 5 | `header`, `dashboard/page`, `import-dialog`, `GoalSimulator` (admin mantém "Painel") |
| Transação/Transações | Lançamento / Diário de Bordo | 97 / 33 | `transacoes/page`, `RevisaoDaDivisao`, `transaction-delete-dialog`, `DesfazerDivisao`, `recorrentes` |
| Orçamento(s) | Rota(s) | 41 / 11 | `orcamentos/page`, `BudgetForm`, `ImportBudgetsDialog`, `constants/help-texts`, `BudgetSummary` |
| Meta(s) | Destino(s) | 130 / 24 | `EditorDoPlano`, `metas/page`, `SpareChangeBank`, `GoalForm`, `GoalWithdrawForm` |
| Relatório(s) / Gráficos | Cartas | 14 / 8 | `relatorios/page`, `header` ("Gráficos") |
| Tag(s) | Marcador(es) | ~29 arquivos | `tags/page`, `TagForm`, `transaction-form-dialog`, `focus-selection-modal`, `TagSelector`, `transaction-filters` |
| Cofrinho | Lastro | ~32 strings / 13 arquivos | `metas/page`, `GoalForm`, `EditorDoPlano`, `GoalDepositForm`, `GoalWithdrawForm` |
| Gestão do salário | Partilha | 9 / 6 | `header`, `salario/page`, `GestaoDoSalario`, admin |

- [ ] Linha de apoio permanente em cada cabeçalho de página.
- [ ] Atualizar `constants/help-texts.ts` e `page-help`.

### AZ-33 Microcopy (M)
- [ ] 41 "com sucesso" em 28 arquivos → confirmações curtas ("Lançamento registrado").
- [ ] ~50 frases com "!" → sem exclamação.
- [ ] 3 emojis (admin/configuracoes, sobre, month-range-picker) → ícone Lucide ou texto.
- [ ] Erros no formato "o que houve + o que fazer", sem metáfora.

### AZ-34 Estados vazios e de carregamento (M)
- [ ] Revisar os estados vazios de todas as telas (texto, uma linha, uma ação).
- [ ] Skeletons com a forma do conteúdo; nada aparece antes de 300ms.

### AZ-35 Movimento (P)
- [ ] Aplicar tokens nos componentes e nas telas de framer-motion; contagem curta nos indicadores; reduced-motion em tudo (hoje só 2 usos).

### AZ-36 Acessibilidade (M)
- [ ] Skip link (0 hoje), `aria-live` nos avisos (2 hoje), hierarquia de títulos, foco visível, ordem de tabulação, rótulos de gráfico, texto ampliado a 200%, nos dois temas.

### AZ-37 Teste com 5 usuários (M)
- [ ] Roteiro do PRODUCT.md (registrar, achar um gasto, ver o desvio de uma rota, corrigir um erro, desfazer uma exclusão).

### AZ-38 Revisão responsiva (M)
- [ ] 375, 768, 1024 e 1440px em todas as telas.

### AZ-39 Testes e documentação (P, distribuído)
- [ ] Os testes de cada módulo mudam no PR da tela (AZ-23 a AZ-31) e no PR do glossário (AZ-32). Maior impacto: `tests/salario` (plano 20, receitas 19, revisão 16, resumo 15 linhas), `tests/metas`, `tests/permissoes`.
- [ ] Trocar as asserções de cor exata (`tests/classes/classe-das-categorias`, `grafico-por-classe`) e de classe (`salario/equilibrio`, `resumo`, `plano`) por verificações de token ou de texto.
- [ ] Não mexer nos testes de sessão que usam as chaves `fluxar.*` (P-06).
- [ ] README e DEPLOY com o nome novo (o nome do pacote fica, P-07).

---

## 8. Resumo de esforço

| Fase | Tarefas | Estimativa |
|---|---|---|
| 1 — Fundação | AZ-01 a AZ-08, AZ-40 | 4 a 6 dias |
| 2 — Componentes | AZ-10 a AZ-20, AZ-43, AZ-44 | 9 a 13 dias |
| 3 — Casca e telas | AZ-21 a AZ-31, AZ-41, AZ-42 | 22 a 30 dias |
| 4 — Linguagem e acabamento | AZ-32 a AZ-39 | 8 a 11 dias |
| **Total** | **43 tarefas** | **~43 a 60 dias de trabalho** |

As telas mais pesadas são Diário de Bordo (~5,7 mil linhas com os formulários), Cartas (1,2 mil), Destinos (~3,1 mil), Partilha (~3,1 mil) e Ponte de Comando (~2,5 mil). A troca de tokens da Fase 1 já muda a cara de boa parte do sistema; o trabalho manual pesado são as 1.210 classes cruas e as ~209 consultas de texto nos testes.
