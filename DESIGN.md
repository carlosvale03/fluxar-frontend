# AZIMUTE — Design

> Sistema visual do redesign Fluxar → Azimute.
> Complementa o [PRODUCT.md](PRODUCT.md), que define tom de voz, glossário, módulos e roadmap.
> Status: paleta e tipografia validadas em 21/10/2026 com uma prévia navegável nos dois temas; documento revisado com *The Design of Everyday Things* (Don Norman) e o checklist do ui-ux-pro-max (seção 11).
> Este documento substitui integralmente o "Conceito 2: Fluxo & Fluidez" do Fluxar.

---

## 1. Identidade e moodboard

### Conceito

**Instrumento de precisão à noite.** A interface lembra um painel de navegação ou o mostrador de um relógio técnico: fundo escuro com leve tom azul-noturno, informação em branco frio, e um único metal precioso, o ouro, marcando o que importa agora. Nada brilha sem motivo.

Três ideias guiam as decisões:

1. **Mostrador:** números grandes em fonte monoespaçada, rótulos pequenos em caixa alta, marcas de referência (limite, tolerância, previsto) desenhadas como em um instrumento.
2. **Rumo:** o desvio é desenhado como ângulo (arco de bússola) ou distância de uma marca, e sempre acompanhado do número em %. A cor nunca é a única pista.
3. **Ouro escasso:** um elemento dourado por área. Quando tudo é destaque, nada é.

### Referências pesquisadas

| Referência | O que aproveitamos | O que descartamos |
|---|---|---|
| [Linear](https://linear.app) | Fundo quase preto com tom azulado, bordas de 1px, brilho fino no topo dos cards em vez de sombra, alta densidade sem aperto. É a referência principal. | — |
| [Raycast](https://www.raycast.com) | Botões claros em pílula, texto auxiliar em mono, sensação de ferramenta. | Vermelho da marca. |
| [Mercury](https://mercury.com) | Sobriedade de produto financeiro, uma única cor de destaque, muito respiro nas telas do produto. | O site de marketing com fotografia. |
| Prints enviados (portfólio "Jenny", portfólio "DevFusion", paleta "Black and Gold Elegance") | Ouro âmbar como único destaque, números grandes, rótulos pequenos em caixa alta, azul-noturno como tom de fundo. | Fotografia em destaque, selos circulares, brilho laranja intenso e cards com cantos recortados. |
| Mostradores de relógios técnicos e instrumentos náuticos | Marcas de escala, ponteiro, leitura contra uma referência. | Texturas e skeuomorfismo. |
| Base do ui-ux-pro-max (paletas e pares tipográficos) | A paleta "Fintech" da base confirma a direção: ouro (`#F59E0B`) sobre azul-noturno, com texto escuro sobre o ouro. O par "IBM Plex Sans + mono" aparece entre os recomendados para produtos técnicos e de dados. | A recomendação genérica gerada para "finanças pessoais" (glassmorphism, fontes manuscritas, verde como destaque) não combina com o posicionamento e foi rejeitada. |

A busca no Dribbble não carregou durante a pesquisa e não entrou no levantamento.

### Assinatura visual

- **Logo provisório:** círculo fino com ponteiro de bússola; metade norte em ouro, metade sul em cinza de borda. Logotipo "AZIMUTE" em Archivo largo, caixa alta.
- **Marca de seleção:** linha de 2px em ouro sob o item ativo da navegação.
- **Ponteiro:** um ponto dourado com contorno da cor da superfície marca a posição atual em gráficos.

---

## 2. Princípios visuais

1. **Superfície antes de sombra.** A profundidade vem da troca de tom (canvas → surface → elevated) e de bordas de 1px. No escuro não há sombra projetada.
2. **Cor carrega significado.** Ouro = ação e foco. Verde = entrada. Vermelho = saída. Laranja = desvio e alerta. Azul = informação e tolerância. Neutros para todo o resto.
3. **Cor nunca sozinha.** Todo estado colorido também tem texto, sinal (+ / −), ícone ou marca de posição. Isso também resolve o par verde/vermelho para quem tem daltonismo.
4. **O que é clicável parece clicável.** Elementos interativos têm sinal visível sem depender do hover: botão com forma de botão, link com seta ou sublinhado, card clicável com seta no canto. Elementos estáticos não reagem ao mouse.
5. **O estado está à vista.** Período, filtros ativos e item de navegação atual ficam sempre visíveis.
6. **Números são o conteúdo.** Valores em IBM Plex Mono com algarismos tabulares, alinhados à direita em tabelas.
7. **Densidade calma.** Espaçamento em múltiplos de 4px, linhas de tabela de 40px, cards com 20px de respiro interno.

---

## 3. Cores e design tokens

Todos os contrastes abaixo foram calculados com a fórmula de luminância relativa do WCAG 2.x.
Critérios: texto normal AA ≥ 4,5:1 e AAA ≥ 7:1; componentes e gráficos ≥ 3:1.

### 3.1 Tema escuro (padrão)

| Token | Hex | Uso | Contraste (surface `#0D121C`) |
|---|---|---|---|
| `canvas` | `#07090F` | Fundo da página | — |
| `surface` | `#0D121C` | Cards, tabelas, painéis | — |
| `elevated` | `#151C2B` | Popovers, modais, hover, item ativo | — |
| `border-subtle` | `#1E2738` | Divisórias e borda de cards | decorativa |
| `border-strong` | `#2E3A52` | Botão secundário, pílulas | decorativa |
| `border-input` | `#5C6882` | Borda de campos de formulário | 3,35 (AA componentes); 3,05 sobre elevated |
| `text-primary` | `#ECEEF2` | Texto principal e valores | 16,14 (AAA) |
| `text-secondary` | `#A4ADBE` | Texto de apoio | 8,30 (AAA) |
| `text-muted` | `#7A8599` | Rótulos, datas, legendas | 5,04 (AA); 4,58 sobre elevated |
| `accent` | `#F5A524` | Fundo do botão primário, ponteiro, seleção | 9,18 |
| `accent-hover` | `#FFB84D` | Hover do botão primário | — |
| `accent-ink` | `#0A0D14` | Texto sobre `accent` | 9,52 sobre accent; 11,30 sobre accent-hover |
| `accent-line` | `#F5A524` | Linhas, arcos e texto dourado | 9,18 |
| `inflow` | `#3ED6A0` | Entradas, destino atingido | 10,11 |
| `outflow` | `#FF6B6B` | Saídas, erro destrutivo | 6,75 |
| `warn` | `#FF8A3D` | Desvio e alertas | 7,99 |
| `info` | `#6EA8FF` | Informação, faixa de tolerância | 7,77 |

Valores sobre canvas e elevated: todos os textos e cores semânticas passam AA nos três fundos (pior caso: `text-muted` sobre elevated, 4,58).

### 3.2 Tema claro

| Token | Hex | Uso | Contraste (surface `#FFFFFF`) |
|---|---|---|---|
| `canvas` | `#F4F5F7` | Fundo da página | — |
| `surface` | `#FFFFFF` | Cards, tabelas, painéis | — |
| `elevated` | `#ECEFF3` | Hover, item ativo, trilhas de barra | — |
| `border-subtle` | `#E2E6EC` | Divisórias e borda de cards | decorativa |
| `border-strong` | `#CBD2DC` | Botão secundário, pílulas | decorativa |
| `border-input` | `#7D8798` | Borda de campos | 3,63; 3,14 sobre elevated |
| `text-primary` | `#0B1220` | Texto principal | 18,72 (AAA) |
| `text-secondary` | `#4A5568` | Texto de apoio | 7,53 (AAA) |
| `text-muted` | `#5E6A7D` | Rótulos, datas | 5,48 (AA); 4,75 sobre elevated |
| `accent` | `#F5A524` | Fundo do botão primário | 2,04 — **só como fundo, nunca como texto ou linha** |
| `accent-hover` | `#E8960F` | Hover do botão primário | — |
| `accent-ink` | `#0A0D14` | Texto sobre `accent` | 9,52; 8,14 sobre accent-hover |
| `accent-line` | `#9A5B00` | Linhas, arcos e texto dourado | 5,43 |
| `inflow` | `#0B7A55` | Entradas | 5,34 |
| `outflow` | `#C62F2F` | Saídas | 5,46 |
| `warn` | `#B93F0A` | Desvio e alertas | 5,56 |
| `info` | `#1F5FD6` | Informação, tolerância | 5,73 |

No claro, o ouro puro não tem contraste para linha ou texto. Por isso existe o token `accent-line`: no escuro ele é igual a `accent`; no claro, escurece para `#9A5B00`. Regra prática: **`accent` pinta fundos, `accent-line` desenha traços e letras.**

O brilho de 1px no topo dos cards existe só no escuro; no claro, o token `sheen` é transparente. Como o claro não tem brilho, os cards se separam do canvas pela borda `border-subtle` e pela diferença entre `#FFFFFF` e `#F4F5F7`.

### 3.3 Tokens auxiliares

| Token | Escuro | Claro | Uso |
|---|---|---|---|
| `tolerance` | `rgba(110,168,255,.10)` | `rgba(31,95,214,.08)` | Faixa de tolerância em gráficos |
| `sheen` | `rgba(236,238,242,.14)` | transparente | Brilho no topo dos cards |
| `focus-ring` | `accent` 2px + afastamento 2px | `accent-line` 2px + afastamento 2px | Foco visível (4,97:1 sobre canvas claro) |
| `scrim` | `rgba(7,9,15,.72)` | `rgba(11,18,32,.40)` | Fundo atrás de modais |

### 3.4 Séries de gráfico (categorias)

Para distribuições por categoria, marcador ou classe. Máximo de 5 séries com cor; o restante se agrupa em "Outros". Verde e vermelho ficam fora desta lista porque são reservados para entrada e saída. Com mais de 5 categorias, o gráfico de rosca dá lugar a barras horizontais.

| Ordem | Escuro | Claro | Contraste mínimo |
|---|---|---|---|
| 1 | `#F5A524` | `#9A5B00` | 9,18 / 5,43 |
| 2 | `#6EA8FF` | `#1F5FD6` | 7,77 / 5,73 |
| 3 | `#C39BFF` | `#7A4FD0` | 8,44 / 5,45 |
| 4 | `#FF8FB1` | `#B8336A` | 8,76 / 5,65 |
| 5 | `#8FD0E8` | `#0E7490` | 11,03 / 5,36 |
| Outros | `#A4ADBE` | `#4A5568` | 8,30 / 7,53 |

### 3.5 Arquitetura no Tailwind v4

O projeto já organiza as cores em três camadas em `src/app/globals.css` (primitivos → semânticos → `@theme`). A estrutura se mantém; mudam os valores e os nomes semânticos. O tema claro e o escuro trocam pela classe `.dark` que o `next-themes` aplica. Componentes usam só tokens semânticos, nunca hex direto.

```css
@theme {
  --color-canvas: var(--az-canvas);
  --color-surface: var(--az-surface);
  --color-elevated: var(--az-elevated);
  --color-border-subtle: var(--az-border-subtle);
  --color-border-strong: var(--az-border-strong);
  --color-border-input: var(--az-border-input);
  --color-fg: var(--az-text-primary);
  --color-fg-secondary: var(--az-text-secondary);
  --color-fg-muted: var(--az-text-muted);
  --color-gold: var(--az-gold);
  --color-gold-hover: var(--az-gold-hover);
  --color-gold-ink: var(--az-gold-ink);
  --color-gold-line: var(--az-gold-line);
  --color-inflow: var(--az-inflow);
  --color-outflow: var(--az-outflow);
  --color-warn: var(--az-warn);
  --color-info: var(--az-info);

  --font-display: var(--font-archivo), sans-serif;
  --font-sans: var(--font-plex-sans), sans-serif;
  --font-mono: var(--font-plex-mono), monospace;
}

:root {            /* tema claro */
  --az-canvas: #F4F5F7;
  /* ... demais valores da tabela 3.2 */
}

.dark {            /* tema escuro (padrão) */
  --az-canvas: #07090F;
  /* ... demais valores da tabela 3.1 */
}
```

**No código, o ouro se chama `gold`.** Os tokens `accent`, `accent-hover`, `accent-ink` e `accent-line` deste documento viram as utilidades `gold`, `gold-hover`, `gold-ink` e `gold-line` (`bg-gold`, `text-gold-line` …), porque `accent` já é o realce de hover dos componentes shadcn (menus, select, calendário). Os valores crus ficam em variáveis `--az-*` no `globals.css`.

Os nomes do shadcn que os componentes já usam (`background`, `card`, `primary`, `muted`, `accent`, `destructive`, `border`, `input`, `ring`) passam a apontar para os tokens novos, para que nada quebre antes da revisão de cada componente:

| Nome atual | Aponta para |
|---|---|
| `background` | `canvas` |
| `card`, `popover` | `surface`, `elevated` |
| `foreground` | `text-primary` |
| `primary` / `primary-foreground` | `gold` / `gold-ink` |
| `secondary`, `muted`, `accent` | `elevated` |
| `muted-foreground` | `text-secondary` |
| `destructive` / `destructive-foreground` | `outflow` / texto escuro `#0A0D14` no escuro (7,0:1) e branco no claro (5,46:1) |
| `border` | `border-subtle` |
| `input` | `border-input` (o `Input` passa a usar `border-input`, como o `Select` e o `Textarea`) |
| `ring` | `gold-line` |
| `brand-*`, `neutral-*` (legado do Fluxar) | escala do ouro e neutros novos, até a revisão dos componentes |
| `--finance-income`, `--finance-expense` (legado, usados inline nos gráficos) | `inflow`, `outflow` |

---

## 4. Tipografia

Três famílias gratuitas do Google Fonts, carregadas com `next/font/google`.

| Papel | Família | Link | Pesos e eixos | Por quê |
|---|---|---|---|---|
| Títulos e logotipo | **Archivo** | [fonts.google.com/specimen/Archivo](https://fonts.google.com/specimen/Archivo) | Variável; `wght` 600, `wdth` 125 | A largura expandida dá o ar imponente e técnico das referências sem ser decorativa. Uma única família variável cobre do título ao logotipo. |
| Corpo e interface | **IBM Plex Sans** | [fonts.google.com/specimen/IBM+Plex+Sans](https://fonts.google.com/specimen/IBM+Plex+Sans) | 400, 500, 600 | Desenhada para a IBM com herança de engenharia; ótima legibilidade em tamanhos pequenos e personalidade sem chamar atenção. Menos genérica que Inter. |
| Números, valores e rótulos | **IBM Plex Mono** | [fonts.google.com/specimen/IBM+Plex+Mono](https://fonts.google.com/specimen/IBM+Plex+Mono) | 400, 500 | Mesma família do corpo, então combina naturalmente. Algarismos de largura fixa alinham valores na casa decimal, como em um instrumento. |

```ts
import { Archivo, IBM_Plex_Sans, IBM_Plex_Mono } from "next/font/google"

const archivo = Archivo({ subsets: ["latin"], axes: ["wdth"], variable: "--font-archivo", display: "swap" })
const plexSans = IBM_Plex_Sans({ subsets: ["latin"], weight: ["400", "500", "600"], variable: "--font-plex-sans", display: "swap" })
const plexMono = IBM_Plex_Mono({ subsets: ["latin"], weight: ["400", "500"], variable: "--font-plex-mono", display: "swap" })
```

### Escala

| Estilo | Família | Desktop (tamanho / linha) | Celular | Peso | Uso |
|---|---|---|---|---|---|
| `display-xl` | Plex Mono | 44 / 48 | 32 / 38 | 500 | Posição na Ponte de Comando |
| `display-l` | Archivo 125% | 28 / 34 | 24 / 30 | 600 | Título de página |
| `display-m` | Archivo 125% | 20 / 26 | 18 / 24 | 600 | Título de seção e de modal |
| `display-s` | Archivo 125% | 16 / 22 | 16 / 22 | 600 | Título de card |
| `value-l` | Plex Mono | 22 / 28 | 20 / 26 | 500 | Indicadores |
| `value-m` | Plex Mono | 14 / 20 | 15 / 22 | 400 | Valores em tabela |
| `body` | Plex Sans | 14 / 21 | 16 / 24 | 400 | Texto corrido e interface |
| `body-strong` | Plex Sans | 14 / 21 | 16 / 24 | 600 | Botões, ênfase |
| `small` | Plex Sans | 12 / 18 | 13 / 20 | 400 | Texto de apoio |
| `label` | Plex Mono | 12 / 16, caixa alta, espaçamento 0,06em | 12 / 16 | 400 | Rótulos de indicador, cabeçalho de tabela, pílulas |

Regras:
- Valores monetários sempre em mono com `font-variant-numeric: tabular-nums` e formatação `pt-BR` (`Intl.NumberFormat`).
- Centavos podem aparecer em `text-muted` no valor de destaque (R$ 48.210<span>,33</span>).
- **Nada abaixo de 12px.** No celular, o corpo sobe para 16px e os campos de formulário usam 16px, para o iOS não aplicar zoom ao focar.
- Títulos com espaçamento de letra de -0,01em; rótulos em caixa alta com +0,06em.
- Uma hierarquia de títulos por página (`h1` → `h2` → `h3`), sem pular níveis.
- Texto corrido com no máximo ~75 caracteres por linha.

---

## 5. Sistema de componentes

### Medidas gerais

| Item | Valor |
|---|---|
| Grade de espaçamento | 4px (4, 8, 12, 16, 20, 24, 32, 48) |
| Raio | 6px (itens de menu), 8px (botões e campos), 12px (cards e modais), 999px (pílulas) |
| Altura de controle | 36px no desktop (32px no modo compacto de tabelas); **44px no celular** |
| Alvo de toque | Mínimo de 44×44px no celular e 24×24px no desktop, com 8px entre alvos |
| Borda | 1px |
| Largura máxima de conteúdo | 1240px com 24px de margem lateral (16px no celular) |
| Breakpoints | 375 (celular), 768 (tablet), 1024 (desktop), 1440 (desktop largo) |

### Camadas (z-index)

| Camada | Valor | Uso |
|---|---|---|
| base | 0 | Conteúdo |
| sticky | 10 | Cabeçalho fixo, barra de ações de tabela |
| dropdown | 20 | Menus e popovers |
| overlay | 40 | Scrim de modal |
| modal | 50 | Modais e painéis laterais |
| toast | 100 | Avisos |

Elementos fixos nunca cobrem o elemento com foco do teclado; o conteúdo recebe espaço extra para não ficar escondido sob o cabeçalho ou o botão fixo do celular.

### Cards

- Fundo `surface`, borda `border-subtle`, raio 12px, preenchimento 20px.
- No escuro, brilho de 1px no topo: gradiente horizontal de transparente para `sheen` e de volta.
- Título em `display-s`; ação secundária do card ("Ver todos →") em `text-secondary` à direita.
- **Card clicável:** seta discreta no canto superior direito, cursor de mão, hover com fundo `elevated` e o card inteiro como alvo. **Card estático:** sem seta e sem hover. A diferença é visível antes de passar o mouse.
- Sem sombra projetada. Popovers e modais usam `elevated`; no claro recebem uma sombra suave (`0 8px 24px rgba(11,18,32,.08)`).

### Botões

| Variante | Fundo | Texto | Borda | Uso |
|---|---|---|---|---|
| Primária | `accent` | `accent-ink` | — | A ação principal da área. Uma por vez. |
| Secundária | transparente | `text-primary` | `border-strong` | Ações alternativas. |
| Fantasma | transparente | `text-secondary` | — | Ações terciárias e de linha. |
| Destrutiva | transparente | `outflow` | `outflow` | Excluir. Fica separada das ações principais, nunca ao lado da primária. |

Estados:
- **Hover:** primária vai para `accent-hover`; as demais ganham fundo `elevated`.
- **Pressionado:** escala 0,98 por 100ms, sem mudar o tamanho do layout.
- **Foco:** anel de 2px em `accent-line` com 2px de afastamento.
- **Carregando:** indicador no lugar do rótulo, largura mantida, novos cliques ignorados.
- **Desabilitado:** opacidade 0,45 e cursor de bloqueio. Sempre que possível, prefira manter o botão ativo e explicar o problema ao clicar; quando desabilitar for necessário, mostre o motivo em texto próximo (ex.: "Escolha uma conta para registrar").
- Botão só de ícone sempre tem `aria-label` e tooltip.

### Pílulas e badges

- Plex Mono, 12px, caixa alta, espaçamento 0,06em, raio 999px, borda `border-strong`, fundo transparente.
- A cor fica no texto: neutra (`text-secondary`), entrada, saída, alerta, info ou destino (`accent-line`).
- Pílula preenchida só em contagem numérica (ex.: notificações).
- **Chip de filtro ativo:** pílula com o valor do filtro e um "×" para remover, mais um link "Limpar filtros" no fim da lista.

### Campos de formulário

- **Rótulo sempre visível** acima do campo; placeholder só como exemplo de valor, nunca como rótulo.
- Fundo `surface` (escuro) ou branco (claro), borda `border-input`, raio 8px.
- Foco: borda `accent-line` + anel de foco.
- Campos obrigatórios marcados; texto de ajuda permanente abaixo dos campos complexos.
- **Validação ao sair do campo**, não a cada tecla. Erro abaixo do campo, em `small` na cor `outflow`, com ícone e ligado por `aria-describedby`. O valor digitado continua no campo.
- Formulário com vários erros: resumo no topo com links para cada campo, foco no resumo, e os erros continuam junto de cada campo.
- **Restrições que evitam erro:** MoneyInput aceita só números e formata enquanto digita; datas usam seletor; selects mostram só opções válidas para o contexto (ex.: só faturas abertas do cartão escolhido).
- Tipos corretos para teclado do celular (`inputmode="decimal"` em valores, `type="email"` em e-mail) e `autocomplete` nos campos de acesso.
- MoneyInput: valor em mono alinhado à direita, prefixo "R$" em `text-muted`.
- Modal com alterações não salvas pede confirmação antes de fechar.

### Alertas

- Listra lateral de 3px na cor do estado, sem cantos arredondados no lado da listra; fundo `surface`; borda de 1px nos outros lados.
- Ícone, pílula com o tipo ("DESVIO", "VENCIMENTO") e uma frase no formato do PRODUCT.md, com ação de texto à direita.
- Nunca preencher o fundo com a cor do estado. Isso mantém o laranja do alerta separado do ouro.
- Quando houver mais de um alerta no mesmo lugar, mostra-se o mais grave e um link com a contagem ("+2 desvios"), para nenhum alerta ficar escondido.

### Avisos temporários (toast) e desfazer

- Canto inferior direito no desktop, acima do menu inferior no celular.
- Fundo `elevated`, borda `border-strong`, ícone do estado e uma frase curta.
- Duração: 4s para confirmações; **5s com botão "Desfazer"** para exclusões simples.
- `aria-live="polite"`; o aviso não rouba o foco.
- Erros que exigem ação não usam toast: aparecem junto do campo ou como alerta na página.

### Modais e painéis

- Fundo `elevated`, raio 12px, `scrim` atrás.
- Cabeçalho com título em `display-m` e botão de fechar sempre visível; Esc fecha; o foco fica preso no modal e volta ao botão que o abriu.
- Rodapé com ações alinhadas à direita: secundária à esquerda, primária à direita.
- Confirmações destrutivas trazem o nome do item e o impacto no texto ("As 4 faturas e os 38 lançamentos serão excluídos"), e o botão repete o verbo ("Excluir cartão").
- Modal não é usado para navegação principal.

### Tabelas

- Linhas de 40px, divisória `border-subtle` entre linhas, sem listras alternadas.
- Cabeçalho em `label`. Data em mono `text-muted`; descrição em `body`; valor em `value-m` alinhado à direita.
- Valor de entrada com "+" e `inflow`; saída com "−" e `outflow`; transferência com "→" e `text-primary`.
- Hover da linha: fundo `elevated`. Coluna ordenável com ícone e `aria-sort`.
- Ações da linha visíveis no foco do teclado, não só no hover.
- Listas com mais de 50 itens usam paginação ou virtualização.
- No celular, a tabela vira lista de dois níveis (descrição e data em cima, valor à direita).

### Componentes de medição (novos)

| Componente | Desenho | Leitura | Uso |
|---|---|---|---|
| **Bússola** | Arco circular de 6px; trilha `border-subtle`; marca do norte (plano) em `text-primary`; zona de tolerância marcada na trilha; arco do desvio em `accent-line` dentro da tolerância e em `warn` fora dela. O ângulo é proporcional ao desvio, com fim de escala em 50%. | Desvio em % ao lado, com a tolerância ("12% · tolerância 15%"). | Desvio geral |
| **Anel de progresso** | Círculo de 5px; trilha `border-subtle`; progresso em `accent-line` (em andamento) ou `inflow` com ícone de check (concluído). | Percentual e data prevista ao lado. | Destinos |
| **Barra de rota** | Bullet chart: trilha de 6px em `elevated`; zona de tolerância em `tolerance`; preenchimento em `text-secondary`; marca vertical de 2px no limite. Acima do limite, preenchimento e valor em `warn` e ícone de alerta. | "R$ 1.416 / 1.200" e o desvio em %. | Rotas |

Os três têm o valor em texto visível e um rótulo para leitor de tela com valor, limite e situação ("Mercado: R$ 1.416 de R$ 1.200, 18% acima do limite"). A cor nunca é a única informação.

### Movimento e microinterações

| Token | Duração | Curva | Uso |
|---|---|---|---|
| `motion-fast` | 100ms | `ease-out` | Hover, pressionado, foco |
| `motion-base` | 180ms | `ease-out` | Abrir menus, trocar abas, expandir |
| `motion-slow` | 240ms | `ease-out` | Abrir modal e painel lateral |
| saída | ~70% da entrada | `ease-in` | Fechar menus e modais |

- Animar só `transform` e `opacity`, nunca largura, altura ou posição de layout.
- Modais e menus surgem a partir do elemento que os abriu (escala de 0,96 a 1 + opacidade).
- Indicadores numéricos fazem uma contagem curta (até 400ms) ao carregar o período.
- Ao trocar de período, os gráficos fazem uma transição suave da forma, sem redesenhar do zero.
- Animações nunca bloqueiam a interação e podem ser interrompidas.
- Brilho só no topo dos cards (1px) e no ponteiro do gráfico. Nada de neon ou sombra colorida.
- Com `prefers-reduced-motion`, todas as animações ficam desligadas e os valores aparecem prontos.

### Estados de carregamento

- Até 300ms: nada aparece, para evitar piscar.
- De 300ms a 1s: indicador discreto no próprio componente.
- Acima de 1s: skeleton com a forma do conteúdo, reservando o espaço para não deslocar a página.
- Falha de rede: mensagem no lugar do conteúdo com botão "Tentar de novo".

---

## 6. Gráficos

Biblioteca: Recharts, com um tema único compartilhado.

| Elemento | Escuro e claro |
|---|---|
| Grade | `border-subtle`, só linhas horizontais |
| Eixos | Plex Mono 12px, `text-muted`, sem linha de eixo, valores em formato `pt-BR` |
| Série real | `accent-line`, 2,5px |
| Série prevista | `text-muted`, 2px tracejado (5 5) |
| Tolerância | área `tolerance` |
| Ponto atual | círculo `accent` de 5px com contorno `surface` de 2px e rótulo do valor |
| Entradas / saídas | `inflow` / `outflow`, sempre com sinal no rótulo |
| Categorias | Séries da seção 3.4 |
| Tooltip | fundo `elevated`, borda `border-strong`, valores em mono; no claro, sombra suave |

Regras:
- **Tipo de gráfico pelo dado:** tendência no tempo → linha; comparação entre categorias → barras; proporção com até 5 partes → rosca; desvio contra limite → barra de rota (bullet).
- Legenda acima do gráfico, à direita do título. A legenda funciona como filtro: clicar em uma série esconde ou mostra a série.
- Granularidade sempre indicada ("por dia", "por mês").
- Tooltip abre no hover, no toque e no foco do teclado, com o mesmo conteúdo.
- Cada gráfico tem um resumo em texto (`aria-label`) com a conclusão principal e uma tabela equivalente acessível ("Ver como tabela").
- Estados próprios: carregando (skeleton com a forma do gráfico), sem dados (mensagem e ação, nunca eixo vazio) e erro (mensagem e "Tentar de novo").
- No celular, menos marcas no eixo e barras horizontais no lugar de verticais.

---

## 7. Ponte de Comando (tela principal)

### Hierarquia

1. **Posição:** o número mais importante da tela, em `display-xl`, com variação contra o mês anterior.
2. **Indicadores:** entradas, saídas, livre para o mês e desvio geral.
3. **Alertas:** o desvio mais grave do período, com a contagem dos demais.
4. **Trajetória e Rotas:** onde estou contra o previsto e quais rotas desviam.
5. **Diário de Bordo e Destinos:** o que aconteceu por último e para onde estou indo.

### Wireframe (desktop, 1240px)

```
┌──────────────────────────────────────────────────────────────────────────┐
│ ◈ AZIMUTE   Ponte de Comando · Diário de Bordo · Rotas · Destinos ·      │
│             Cartas · Mais ▾           [Buscar  Ctrl K]  [tema]  (CV)     │
│             ‾‾‾‾‾‾‾‾‾‾‾‾‾‾‾‾ (linha de ouro no item ativo)               │
├──────────────────────────────────────────────────────────────────────────┤
│ Ponte de Comando · visão geral do mês         Período ◂ out/2026 ▸       │
│                                                                          │
│ POSIÇÃO                                                                  │
│ R$ 48.210,33                          [Importar extrato] [Registrar +]   │
│ ▲ 2,1% vs setembro · rumo mantido                                        │
├────────────────┬────────────────┬────────────────┬───────────────────────┤
│ ENTRADAS       │ SAÍDAS         │ LIVRE P/ O MÊS │ (◔) DESVIO GERAL      │
│ + R$ 12.400,00 │ − R$ 8.932,18  │ R$ 1.240,00    │     12%               │
│ 4 lançamentos  │ 61 lançamentos │ projeção 31/10 │     tolerância 15%    │
├────────────────┴────────────────┴────────────────┴───────────────────────┤
│ ▌⚠ DESVIO  Desvio de 18% em Mercado. Corrija até dia 25.                 │
│                                          Ver rota →   +2 desvios →       │
├──────────────────────────────────────────────┬───────────────────────────┤
│ TRAJETÓRIA · por dia  ─ Real ┄ Previsto ▒ Tol │ ROTAS                  ↗ │
│  50k ┤                          ▒▒▒▒▒▒▒▒▒▒▒   │ Moradia   2.100 / 2.200  │
│  48k ┤               ●R$ 48.210 ▒▒▒┄┄┄┄       │ ███████████████████▏│ −5%│
│  46k ┤      ╱‾‾╲╱‾‾‾      ┄┄┄┄▒▒▒▒             │ Mercado   1.416 / 1.200  │
│  44k ┤ ╱‾‾‾     ┄┄┄┄▒▒▒▒▒                      │ █████████████████│███+18%⚠│
│      └ 01 ──────────── 15 ──────────── 31     │ Transporte  380 / 600    │
│                             Ver como tabela   │ ████████████        │−37%│
├──────────────────────────────────────────────┼───────────────────────────┤
│ DIÁRIO DE BORDO                  Ver todos → │ DESTINOS               ↗ │
│ 20/10  Salário · Empresa X   RENDA  +9.800,00│ (●) Reserva   100% ✓      │
│ 19/10  Supermercado Central  MERCADO −412,37 │ (◕) Lisboa     62% mar/27 │
│ 18/10  Posto Azul            TRANSP. −180,00 │ (◔) Apto.      18% 2029   │
│ 17/10  Aporte · Reserva      DESTINO →500,00 │                           │
│ 16/10  Aluguel               MORADIA −2.100  │                           │
└──────────────────────────────────────────────┴───────────────────────────┘
```

A seta `↗` no canto de Rotas e Destinos indica card clicável (leva ao módulo). Os indicadores do topo são estáticos.

### Grade e responsividade

- **Desktop (≥ 1024px):** indicadores em 4 colunas iguais, espaço de 12px; corpo em 2 colunas na proporção 2:1.
- **Tablet (768 a 1023px):** indicadores em 2×2; corpo em uma coluna, na ordem Trajetória, Rotas, Diário, Destinos.
- **Celular (< 768px):** menu inferior com 5 destinos; Posição com 32px; indicadores em 2×2; "Registrar" como botão fixo acima do menu inferior; o conteúdo recebe espaço para não ficar escondido sob ele.

### Personalização

O personalizador de blocos que já existe (`dashboard-customizer`) continua. O layout acima é o padrão; os blocos atuais (distribuição por categoria, por classe, por marcador, comparativo mensal, patrimônio por conta) entram como blocos opcionais com o mesmo tratamento de card. Reordenar blocos tem alternativa por botões (subir e descer), não só arrastar.

---

## 8. Ícones e imagens

- Ícones: Lucide (já instalado), traço de 1,5px, um único estilo (contorno) em todo o produto. Tamanhos: 16px na interface, 20px em destaque.
- Ícone ao lado de texto visível é decorativo (`aria-hidden="true"`); ícone sozinho tem nome acessível.
- Ícones que carregam significado têm contraste de 3:1 ou mais.
- Sem emoji, sem ilustrações coloridas e sem fotografia dentro do produto. Estados vazios usam um ícone de linha e texto.
- Avatar: iniciais em mono sobre `elevated` com borda `border-strong`.

---

## 9. Acessibilidade

- Contraste mínimo AA em todo texto, nos dois temas (verificado nas tabelas da seção 3).
- Bordas de campos, ícones com significado e elementos gráficos com 3:1 ou mais.
- Foco sempre visível com o anel de `accent-line`; nunca remover `outline` sem substituto; elementos fixos não cobrem o foco.
- Link "Pular para o conteúdo" no início da página; na troca de rota, o foco vai para o título da nova página.
- Ordem de tabulação igual à ordem visual; tudo operável por teclado, inclusive tooltips de gráfico e reordenação de blocos.
- Cor nunca é a única informação: sinal, texto, ícone ou posição acompanham cada estado.
- Gráficos com resumo em texto e tabela equivalente.
- Alvos de toque de 44×44px no celular e 24×24px no desktop.
- Avisos em `aria-live="polite"`; erros de formulário em `role="alert"` ou ligados ao campo.
- Login aceita gerenciador de senhas e colar.
- `prefers-reduced-motion` respeitado em todas as animações.
- Zoom do navegador nunca bloqueado; a interface funciona com texto ampliado em 200%.

---

## 10. Prévia de referência

A prévia validada é uma página HTML estática com a Ponte de Comando, as amostras de todos os tokens e um alternador entre os temas escuro e claro. Ela foi gerada fora do repositório; ao iniciar a Fase 1 (tarefa AZ-08), seu conteúdo serve de base para a página `/design-system`. A prévia é anterior a esta revisão: ainda mostra o desvio em graus e não tem o menu "Mais".

---

## 11. Revisão de usabilidade

A primeira versão destes documentos foi revisada com o diagnóstico de *The Design of Everyday Things* (descoberta, avaliação, recuperação de erro, mapeamento e restrições, 2 pontos cada) e com o checklist do ui-ux-pro-max (acessibilidade, toque, navegação, formulários, movimento e gráficos).

**Nota da primeira versão: 4/10.** Depois das correções: **9/10**, a confirmar com o teste com 5 usuários (AZ-37).

| Problema encontrado | Princípio | Correção |
|---|---|---|
| Desvio exibido em graus: o usuário não sabe se 12° é muito ou pouco. | Avaliação, modelo mental | Desvio e tolerância em %; o arco é só o desenho (D-09). |
| Termos como "Ancoradouros", "Rumos" e "Almanaque" exigiam decorar o glossário; "Rumos" colidia com "rumo mantido". | Descoberta, conhecimento no mundo | Termos comuns mantidos para conta, categoria e calendário; linha de apoio permanente nos demais (D-03, D-11). |
| Erro de exemplo com metáfora ("Coordenada inválida"). | Mensagens de erro | Erros em linguagem comum, com a correção e preservando o que foi digitado. |
| Nenhum caminho de desfazer. | Recuperação de erro | Toast com "Desfazer" por 5s e modal com impacto para exclusões em cascata (D-10). |
| Um único alerta na Ponte de Comando escondia os demais. | Avaliação, estado visível | Alerta mais grave + contagem dos outros. |
| Nove itens na barra principal. | Navegação | Cinco destinos principais e o menu "Mais" (D-12). |
| Cards clicáveis e estáticos com a mesma aparência. | Sinais (signifiers) | Seta no canto e hover só nos clicáveis. |
| Filtros e período podiam ficar fora de vista. | Erro de modo | Cabeçalho padrão com período e chips de filtros ativos. |
| Texto de 11px e controles de 40px no celular. | Toque e legibilidade | Mínimo de 12px, corpo de 16px no celular, alvos de 44px. |
| Gráficos sem estados de carregamento, vazio e erro, nem alternativa acessível. | Gráficos e dados | Estados próprios, tooltip por teclado, tabela equivalente e legenda clicável. |
| Movimento sem tokens nem regra de saída. | Movimento | Tokens de duração, saída mais rápida que entrada, só `transform` e `opacity`. |
