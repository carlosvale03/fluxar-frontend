# AZIMUTE — Produto

> Documento de produto do redesign que renomeia o Fluxar para **Azimute**.
> Complementa o [DESIGN.md](DESIGN.md), que define identidade visual, tokens e componentes.
> Status: propostas validadas em 21/10/2026 e revisadas com os princípios de *The Design of Everyday Things* (Don Norman) e o checklist do ui-ux-pro-max. Nenhum código foi alterado nesta etapa.

---

## 1. Manifesto

O azimute é o ângulo horizontal, medido em graus a partir do norte, que define um rumo. Navegadores e astrônomos o usam para saber exatamente para onde apontam e quanto se desviaram.

O Azimute aplica essa ideia ao dinheiro pessoal. Ele não é uma planilha colorida nem um aplicativo que celebra cada compra. É um instrumento: mostra onde você está (Posição), para onde quer ir (Destinos), por qual caminho (Rotas) e quanto está fora do curso (Desvio). E indica a correção.

**Promessa de valor:** rumo exato para o seu dinheiro.

**O que o usuário deve sentir:** que está pilotando um software de engenharia orçamentária moderno, sóbrio e robusto. Precisão no lugar de entusiasmo; clareza no lugar de enfeite.

### Princípios de produto

1. **Medir antes de opinar.** Todo número exibido tem origem rastreável (lançamento, rota, projeção). Nada de indicador "mágico".
2. **Desvio é o dado central.** A pergunta principal não é "quanto gastei?", e sim "quanto me afastei do plano e como corrijo?".
3. **Densidade com calma.** Muita informação por tela, organizada em hierarquia clara, sem ruído visual.
4. **Uma ação por vez em destaque.** Cada área da tela tem no máximo um elemento dourado (ação principal ou foco).
5. **A metáfora nomeia, a linguagem comum explica.** Os termos de navegação dão nome a módulos e conceitos; ao lado deles, sempre há uma explicação em linguagem comum visível na tela. O usuário nunca precisa decorar o glossário para usar o sistema.
6. **Todo erro tem saída.** Ações destrutivas têm desfazer ou confirmação; mensagens de erro dizem como resolver; nada que o usuário digitou se perde por causa de um erro.
7. **O estado está sempre à vista.** Período selecionado, filtros ativos, tema e plano atual ficam visíveis o tempo todo, para o usuário nunca agir no "modo errado".

---

## 2. Tom de voz

| Atributo | Somos | Não somos |
|---|---|---|
| Preciso | "Desvio de 18% em Mercado." | "Opa, parece que você gastou um pouquinho a mais!" |
| Sóbrio | "Destino alcançado." | "Parabéns!!! Você é incrível!" |
| Direto | "Corrija até dia 25." | "Que tal dar uma olhadinha nos seus gastos?" |
| Respeitoso | "Não foi possível registrar." | "Ops! Algo deu errado :(" |

### Regras de microcopy

- Sem emoji e sem ponto de exclamação no texto do sistema.
- Frases curtas, voz ativa, verbo no início dos botões ("Registrar", "Importar extrato", "Corrigir rota").
- Números sempre com unidade e referência: valor ou percentual, e contra o quê ("vs setembro", "de R$ 1.200").
- **Desvio sempre em percentual.** O arco da bússola desenha o desvio, mas o número exibido é em %, que o usuário já entende. Graus não aparecem como unidade.
- Erros dizem o que aconteceu e o que fazer, nessa ordem, sem culpar o usuário e **sem metáfora**: em um erro, clareza vale mais que identidade.
- Erros de formulário aparecem junto do campo, e o que foi digitado continua no campo.
- Nada de "simplesmente", "fácil", "por favor", "com sucesso".
- O sistema não fala em primeira pessoa ("não consegui"); fala do estado ("Não foi possível").
- Metáfora náutica só onde há um conceito do glossário. Evitar "capitão", "tesouro", "naufrágio", "tempestade" e afins.
- Botões e links nomeiam o destino ou o efeito ("Ver rota", "Excluir lançamento"), nunca "Clique aqui" ou "OK".

### Exemplos por situação

**Erros**
- "Não foi possível registrar. O valor precisa ser maior que zero."
- "A data fica fora do período desta fatura (10/10 a 09/11). Ajuste a data ou escolha outra fatura."
- "A conexão caiu. O que você digitou continua aqui; tente salvar de novo."
- "A planilha tem 3 linhas sem data. Corrija na revisão ou ignore essas linhas."

**Conquistas**
- "Destino alcançado. Reserva de emergência: 100%, 3 dias antes do previsto."
- "Rota cumprida em setembro. Desvio final: 2%."
- "Seis meses seguidos dentro da tolerância."

**Previsões**
- "Mantido o rumo, você fecha outubro com R$ 1.240 livres."
- "Neste ritmo, Viagem · Lisboa chega em março de 2027."
- "A fatura de novembro deve fechar em R$ 2.310."

**Alertas**
- "Desvio de 18% em Mercado. Corrija até dia 25."
- "A fatura do cartão Azul vence em 3 dias: R$ 1.874,20."
- "Você atingiu o limite do seu plano para importações neste mês. Veja os planos para continuar."

**Estados vazios**
- Diário de Bordo: "Nenhum lançamento neste período. Registre o primeiro ou importe um extrato."
- Destinos: "Defina um destino para medir a distância até ele."
- Rotas: "Trace uma rota para cada área de gasto e acompanhe o desvio."
- Filtros sem resultado: "Nenhum lançamento com estes filtros. Limpar filtros."

**Confirmações e desfazer**
- "Lançamento registrado."
- "Rota atualizada."
- "Lançamento excluído. Desfazer" (aviso de 5 segundos com o botão Desfazer).
- "Partilha desfeita. Os valores voltaram para a conta de origem."

**Confirmações destrutivas (modal)**
- Título: "Excluir o cartão Azul?"
- Texto: "As 4 faturas e os 38 lançamentos deste cartão serão excluídos. Isso não pode ser desfeito."
- Botões: "Cancelar" e "Excluir cartão".

---

## 3. Glossário

### Regra de exibição

Cada termo do glossário aparece com uma **linha de apoio permanente** em linguagem comum: no cabeçalho da página ("Rotas · limites de gasto por categoria") e na navegação (tooltip e descrição no menu móvel). Assim o conhecimento fica no mundo, não na memória do usuário. Ver a decisão D-03.

### Termos novos

| Conceito atual (Fluxar) | Termo Azimute | Linha de apoio | Definição |
|---|---|---|---|
| Dashboard | **Ponte de Comando** | Visão geral do mês | Tela inicial com a posição, os desvios e a trajetória do mês. |
| Saldo total / patrimônio | **Posição** | Saldo de todas as contas | Soma dos saldos de todas as contas em um momento. |
| Transações | **Diário de Bordo** | Entradas e saídas | Registro cronológico de entradas, saídas e transferências. |
| Transação | **Lançamento** | — | Um registro do Diário de Bordo. |
| Receita / despesa | **Entrada / Saída** | — | Direção do dinheiro em relação às suas contas. |
| Orçamentos | **Rotas** | Limites de gasto por categoria | Limite planejado por categoria em um período. |
| Estouro / variação do orçamento | **Desvio** | — | Quanto o gasto real está acima ou abaixo do planejado, em %. |
| Margem aceitável | **Tolerância** | — | Faixa de desvio, em %, considerada dentro do rumo. |
| Metas | **Destinos** | Metas de economia | Objetivos de acumulação com valor e prazo. |
| Simulador da meta | **Projeção de Trajetória** | Simulador | Estimativa de quando um destino será alcançado. |
| Cofrinho de troco | **Lastro** | Cofrinho do troco | Reserva formada pelos arredondamentos dos lançamentos. |
| Gestão do salário / divisão | **Partilha** | Divisão do salário | Divisão de uma renda entre partes (necessidades, destinos etc.). |
| Relatórios | **Cartas** | Relatórios | Análises e gráficos por período, categoria ou marcador. |
| Tags | **Marcadores** | Tags | Etiquetas livres, transversais às categorias. |
| Fluxo de caixa diário | **Corrente** | Saldo dia a dia | Movimento do saldo dia a dia. |
| Planos (Common, Premium, Premium+) | *a decidir* | — | Ver decisão em aberto P-01. |

### Termos que não mudam

Conta, cartão, fatura, categoria, calendário, importar, valor, data, limite, parcela, recorrência, saldo (de uma conta específica), perfil e configurações.

São termos que o usuário já entende e usa no banco. Trocá-los aumentaria o atrito sem ganho: a revisão de usabilidade mostrou que "Ancoradouros" (contas), "Rumos" (categorias) e "Almanaque" (calendário) exigiriam tradução mental a cada uso. "Rumos" ainda colidia com o sentido de "rumo" usado na microcopy ("rumo mantido"). Ver D-11.

---

## 4. Mapa de módulos

| Módulo | Rota atual | Papel no Azimute | Indicador principal |
|---|---|---|---|
| Ponte de Comando | `/dashboard` | Visão de comando do mês: posição, desvio, trajetória, últimos lançamentos e destinos. Mantém o personalizador de blocos que já existe. | Posição e desvio geral |
| Diário de Bordo | `/transacoes` | Lista densa com filtros, lançamentos avulsos, recorrentes e parcelados. | Entradas, saídas e resultado do período |
| Contas | `/contas` | Contas e carteiras com saldo, histórico e vínculos. | Posição por conta |
| Cartões | `/cartoes` | Cartões, faturas abertas e fechadas, detalhe da fatura. | Valor da próxima fatura e limite livre |
| Rotas | `/orcamentos` | Orçamentos por categoria, com tolerância e desvio. | Desvio por rota |
| Destinos | `/metas` | Metas com aportes, retiradas, histórico, simulador e Lastro. | Percentual e data prevista de chegada |
| Partilha | `/salario` | Plano de divisão da renda, modelos da literatura, revisão e histórico de divisões. | Livre após a partilha |
| Cartas | `/relatorios` | Relatórios por período, distribuição por categoria, classe e marcador, monitores de foco. | Comparativo entre períodos |
| Calendário | `/calendario` | Vencimentos, recorrências e fechamentos no calendário. | Compromissos dos próximos 7 dias |
| Categorias | `/categorias` | Categorias e classes de despesa. | — |
| Marcadores | `/tags` | Tags livres. | — |
| Importar | `/importar` | Assistente de importação de planilha e extrato. | Linhas importadas e pendentes |
| Planos | `/planos` | Comparação de planos e travas de recurso. | — |
| Perfil e Configurações | `/perfil`, `/configuracoes` | Conta, preferências, tema, privacidade e exclusão de conta. | — |
| Acesso | `/auth/*` | Login, cadastro, recuperação e verificação de e-mail. | — |
| Institucional | `/sobre`, `/termos`, `/manutencao` | Sobre, termos e aceite, página de manutenção. | — |
| Administração | `/admin` | Painel administrativo (fora do escopo do usuário final; recebe só os tokens). | — |

Nenhuma funcionalidade nova entra neste redesign. A mudança é de identidade, linguagem e interface. As rotas atuais continuam como estão; renomear URLs é uma decisão separada (P-02).

### Navegação principal

Nove destinos de primeiro nível são demais para uma barra. A navegação se divide assim:

- **Barra principal (desktop) / menu inferior (celular, até 5 itens):** Ponte de Comando, Diário de Bordo, Rotas, Destinos, Cartas.
- **Menu "Mais":** Contas, Cartões, Partilha, Calendário, Categorias, Marcadores, Importar.
- **Menu do avatar:** Perfil, Configurações, Planos, Sair (separado das demais opções).
- **Ação global:** "Registrar" sempre acessível (botão no topo no desktop, botão fixo no celular).

---

## 5. Decisões registradas

| ID | Decisão |
|---|---|
| D-01 | Nome do produto: **AZIMUTE**. Promessa: "Rumo exato para o seu dinheiro." |
| D-02 | Tom sóbrio e preciso, sem emoji e sem exclamação. |
| D-03 | Glossário da seção 3, sempre com a linha de apoio em linguagem comum, de forma permanente. |
| D-04 | O ouro é reservado para ação principal, seleção e foco. Entradas e saídas nunca usam ouro. |
| D-05 | Alertas usam listra lateral e ícone, nunca preenchimento, para não competir com o ouro. |
| D-06 | Tipografia: Archivo (títulos), IBM Plex Sans (corpo), IBM Plex Mono (números). |
| D-07 | Dois temas: escuro como padrão e claro como alternativa, ambos com contraste AA ou melhor. |
| D-08 | O token `accent-line` cobre linhas, arcos e texto dourado; no claro ele escurece para `#9A5B00`. |
| D-09 | Desvio e tolerância são exibidos em percentual. O arco da bússola é só a representação visual. |
| D-10 | Exclusões simples têm "Desfazer" por 5 segundos; exclusões em cascata ou irreversíveis pedem confirmação em modal com o impacto descrito. |
| D-11 | Conta, cartão, categoria, calendário e importar mantêm o nome comum. |
| D-12 | Navegação em dois níveis: 5 destinos principais e o menu "Mais" (seção 4). |

### Decisões em aberto

| ID | Pergunta | Proposta atual |
|---|---|---|
| P-01 | Como chamar os planos de assinatura? | Manter "Planos" ou adotar "Classes de Navegação". |
| P-02 | Renomear as URLs (`/transacoes` → `/diario` etc.)? | Manter as rotas atuais nesta etapa. |
| P-03 | Como calcular o desvio geral da Ponte de Comando? | Média dos desvios das rotas ponderada pelo limite de cada uma; validar com o backend. |
| P-04 | Logo definitivo | O ponteiro de bússola da prévia é provisório. |
| P-05 | O glossário funciona para quem não participou do projeto? | Testar com 5 usuários antes da Fase 4 (tarefa AZ-37). |

---

## 6. Roadmap e backlog

Quatro fases sequenciais. Dentro de cada fase, as tarefas sem dependência entre si podem correr em paralelo. Cada tarefa vira uma branch e um PR para a `development`.

Legenda de tamanho: **P** (até meio dia), **M** (1 a 2 dias), **G** (3 dias ou mais).

### Fase 1 — Fundação: tokens, tema e tipografia

Objetivo: a aplicação inteira passa a usar a nova paleta e as novas fontes, sem mudar a estrutura das telas.

| ID | Tarefa | Tam. | Depende de | Critério de aceite |
|---|---|---|---|---|
| AZ-01 | Substituir os primitivos de cor em `src/app/globals.css` pelos tokens do DESIGN.md (escuro e claro). | M | — | Todos os tokens da seção 3 do DESIGN.md existem como variáveis CSS nos dois temas; nenhum hex do Fluxar sobra no arquivo. |
| AZ-02 | Remapear o bloco `@theme` do Tailwind v4 para os tokens semânticos novos (`canvas`, `surface`, `elevated`, `accent`, `inflow`, `outflow`, `warn`, `info`). | P | AZ-01 | Utilitários como `bg-surface`, `text-inflow` e `border-input` funcionam; os nomes antigos usados no código continuam resolvendo para as cores novas. |
| AZ-03 | Trocar Geist e Geist Mono por Archivo, IBM Plex Sans e IBM Plex Mono via `next/font/google` em `src/app/layout.tsx`. | P | — | As três famílias carregam com `display: swap`; Archivo inclui o eixo `wdth`. |
| AZ-04 | Criar a escala tipográfica e os utilitários `.display`, `.mono` (com `tabular-nums`) e `.label`. | P | AZ-03 | Escala da seção 4 do DESIGN.md aplicável por classe; valores monetários alinham na casa decimal; nenhum texto abaixo de 12px. |
| AZ-05 | Tornar o tema escuro o padrão no `ThemeProvider` e manter o alternador para o claro. | P | AZ-01 | Primeiro acesso abre no escuro; a escolha do usuário persiste. |
| AZ-06 | Rebrand básico: nome, `<title>`, metadados, favicon e logo provisório. | P | — | Nenhum "Fluxar" visível na interface do usuário. |
| AZ-07 | Tokens de movimento, z-index e breakpoints (seção 5 do DESIGN.md). | P | — | Durações, curvas, camadas e breakpoints vêm de variáveis, sem valores soltos nos componentes. |
| AZ-08 | Atualizar a página `/design-system` para exibir os tokens, a tipografia e os componentes novos. | M | AZ-01 a AZ-04 | A página serve de referência visual nos dois temas. |

### Fase 2 — Componentes base

Objetivo: os componentes de `src/components/ui` seguem o sistema da seção 5 do DESIGN.md.

| ID | Tarefa | Tam. | Depende de | Critério de aceite |
|---|---|---|---|---|
| AZ-10 | Button: variantes primária (ouro), secundária (contorno), fantasma e destrutiva; estados de foco, carregamento e desabilitado com motivo. | P | Fase 1 | No máximo uma primária por área; foco visível com anel de 2px; botão em carregamento não aceita segundo clique e não muda de largura. |
| AZ-11 | Card: superfície, borda sutil e brilho de 1px no topo (só no escuro). Variante clicável com hover e seta; variante elevada para popovers. | P | Fase 1 | Card clicável e card estático são distinguíveis sem passar o mouse. |
| AZ-12 | Input, Select, Textarea, MoneyInput, PasswordInput: rótulo visível, borda `border-input`, foco em ouro, erro abaixo do campo ligado por `aria-describedby`. | M | Fase 1 | Bordas com 3:1 nos dois temas; campos com 16px de fonte e 44px de altura no celular; valor digitado preservado após erro. |
| AZ-13 | Badge e pílulas: mono, caixa alta, 12px, variantes neutra, entrada, saída, alerta, info e destino. | P | Fase 1 | Toda variante colorida tem texto; nenhuma depende só da cor. |
| AZ-14 | Alert e avisos: listra lateral de 3px e ícone; variantes alerta, erro, info e sucesso. | P | Fase 1 | Nenhum alerta com fundo preenchido em cor. |
| AZ-15 | Dialog, AlertDialog, Modal e Sheet: superfície elevada, título em Archivo, fechar visível, Esc fecha, foco preso no modal e devolvido ao gatilho. | M | AZ-10, AZ-11 | Uma única ação primária por modal; confirmação destrutiva descreve o impacto; fechar com alterações não salvas pede confirmação. |
| AZ-16 | Table e Paginação: linhas densas (40px), valores em mono alinhados à direita, cabeçalho em `.label`, ordenação com `aria-sort`. | M | AZ-04 | Coluna ordenada indicada por ícone e atributo. |
| AZ-17 | Componentes de medição: Bússola (desvio em %), Anel de progresso e Barra de rota (bullet chart com marca de limite e zona de tolerância). | M | Fase 1 | Funcionam nos dois temas; o valor em % aparece em texto ao lado; leitor de tela anuncia valor, limite e situação. |
| AZ-18 | Tema dos gráficos Recharts com estados de carregamento, vazio e erro, tooltip por teclado e tabela alternativa. | M | Fase 1 | Um único arquivo de tema; nenhum gráfico mostra eixo vazio durante o carregamento. |
| AZ-19 | Toast com ação "Desfazer" (sonner): 5s, `aria-live="polite"`, não rouba foco. | P | Fase 1 | Excluir um lançamento e desfazer restaura o registro e a posição na lista. |
| AZ-20 | Restantes: Tabs, Switch, Checkbox, Slider, Calendar, Popover, DropdownMenu, Skeleton. | M | Fase 1 | Inventário de `src/components/ui` 100% revisado; alvos de toque de 44px no celular. |

### Fase 3 — Navegação e telas

Objetivo: estrutura de navegação e layout de cada módulo na nova identidade.

| ID | Tarefa | Tam. | Depende de | Critério de aceite |
|---|---|---|---|---|
| AZ-21 | Navegação em dois níveis (seção 4): barra com 5 destinos, menu "Mais", menu do avatar, busca com atalho, alternador de tema, link "Pular para o conteúdo". Menu inferior no celular. | M | Fase 2 | Item ativo marcado pela linha de ouro e por `aria-current`; ícone e rótulo em todos os itens; "Sair" separado das demais opções; sem rolagem horizontal em 375px. |
| AZ-22 | Cabeçalho de página padrão: título com termo do glossário, linha de apoio, seletor de período sempre visível e ações da página. | P | AZ-21 | Todas as telas usam o mesmo cabeçalho; o período ativo aparece em todas as telas que dependem dele. |
| AZ-23 | Ponte de Comando: layout da seção 7 do DESIGN.md, mantendo o personalizador de blocos. | G | AZ-17, AZ-18, AZ-22 | Hierarquia: Posição → indicadores → alertas → Trajetória e Rotas → Diário e Destinos. |
| AZ-24 | Diário de Bordo (transações): lista densa, filtros compactos com chips dos filtros ativos e "Limpar filtros". | G | AZ-16, AZ-19, AZ-22 | Filtros ativos sempre visíveis; valores com sinal e cor de direção; exclusão com desfazer. |
| AZ-25 | Contas e Cartões. | M | AZ-22 | Exclusão de cartão ou conta com impacto descrito no modal. |
| AZ-26 | Rotas (orçamentos) com Barra de rota e tolerância. | M | AZ-17 | Desvio sempre visível em número, não só em cor. |
| AZ-27 | Destinos (metas), Projeção de Trajetória e Lastro. | M | AZ-17 | — |
| AZ-28 | Partilha (gestão do salário). | M | AZ-22 | Etapas do plano com indicador de progresso e volta possível. |
| AZ-29 | Cartas (relatórios) e Calendário. | G | AZ-18 | Cada gráfico informa a granularidade (dia, semana, mês). |
| AZ-30 | Categorias, Marcadores e Importar. | M | AZ-22 | Importação mostra etapas, permite voltar e preserva o que já foi revisado. |
| AZ-31 | Acesso (auth), Planos, Perfil, Configurações, Institucional e Admin. | G | Fase 2 | Login aceita gerenciador de senhas e colar; recurso bloqueado pelo plano explica o motivo e o caminho; Admin recebe só os tokens. |

### Fase 4 — Linguagem e acabamento

Objetivo: a interface fala Azimute e se comporta com precisão.

| ID | Tarefa | Tam. | Depende de | Critério de aceite |
|---|---|---|---|---|
| AZ-32 | Aplicar o glossário em títulos, menus, botões e rótulos, com a linha de apoio permanente. | M | Fase 3 | Nenhum termo do glossário aparece sem linha de apoio no cabeçalho da página. |
| AZ-33 | Reescrever erros, confirmações, alertas e previsões conforme a seção 2. | M | AZ-32 | Sem emoji, exclamação, "com sucesso" ou metáfora em mensagens de erro. |
| AZ-34 | Estados vazios e de carregamento de todos os módulos. | M | Fase 3 | Cada estado vazio tem título, uma linha de explicação e uma ação; carregamentos acima de 1s usam skeleton. |
| AZ-35 | Movimento: aplicar os tokens, contagem curta de números, respeito a `prefers-reduced-motion`. | P | Fase 3 | Com movimento reduzido ligado, nada anima. |
| AZ-36 | Auditoria de acessibilidade: contraste, foco, ordem de tabulação, hierarquia de títulos, foco na troca de rota e rótulos de gráficos, nos dois temas. | M | Fase 3 | Nenhuma falha AA nas telas principais. |
| AZ-37 | Teste de usabilidade com 5 usuários: 5 tarefas (registrar, achar um gasto, ver o desvio de uma rota, corrigir um erro, desfazer uma exclusão). | M | Fase 3 | Relatório com problemas e gravidade; problemas graves viram tarefas antes do lançamento. |
| AZ-38 | Revisão responsiva em 375, 768, 1024 e 1440px. | M | Fase 3 | Sem rolagem horizontal e sem texto cortado. |
| AZ-39 | Atualizar README, testes com textos afetados e a página `/design-system`. | P | AZ-32, AZ-33 | Suíte de testes passa com os textos novos. |
