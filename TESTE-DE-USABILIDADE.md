# AZIMUTE — Roteiro do teste com 5 usuários

> Tarefa AZ-37 do [REDESIGN-BACKLOG.md](REDESIGN-BACKLOG.md). Responde à decisão em aberto P-05 do [PRODUCT.md](PRODUCT.md): o glossário (Ponte de Comando, Diário de Bordo, Rotas, Destinos, Partilha, Cartas) funciona para quem não participou do projeto?
> Cinco pessoas encontram cerca de 85% dos problemas de usabilidade (Nielsen). O objetivo é achar problemas, não medir satisfação.

---

## 1. Preparação

| Item | Como |
|---|---|
| Participantes | 5 pessoas que controlam as próprias finanças (planilha, app de banco ou outro app) e que **nunca usaram** o Fluxar nem o Azimute. Misture idades e pelo menos 2 pessoas no celular. |
| Ambiente | Ambiente de testes (staging) com uma conta de teste por participante. Nunca a conta real de alguém. |
| Dados da conta | 2 contas (corrente e carteira), 1 cartão com fatura aberta, ~40 lançamentos no mês atual e no anterior, 4 rotas (Moradia, Mercado acima do limite, Transporte, Lazer), 2 destinos (um concluído e um em andamento), 1 salário a dividir. |
| Dispositivos | 3 sessões no desktop (Chrome) e 2 no celular (375 a 430px de largura). Tema escuro, que é o padrão. |
| Registro | Gravação de tela e áudio com consentimento por escrito. Uma pessoa conduz, outra anota na planilha da seção 4. |
| Duração | 30 a 40 minutos por pessoa. |

---

## 2. Roteiro da sessão

**Abertura (3 min).** Ler em voz alta:

> "Obrigado por participar. Vamos testar o aplicativo, não você: se algo for difícil, a culpa é do aplicativo. Vou pedir algumas tarefas; tente fazer sozinho e vá pensando em voz alta. Eu não vou ajudar durante as tarefas, mas no fim conversamos sobre tudo."

**Primeira impressão (2 min).** Na Ponte de Comando, sem clicar em nada:
- "O que você acha que esta tela mostra?"
- "O que você acha que significa 'Rotas'? E 'Destinos'? E 'Diário de Bordo'?" (anotar as respostas literalmente)

**Tarefas (20 a 25 min).** Uma de cada vez, lida pelo condutor. Não dizer o nome do menu.

| # | Tarefa (como falar) | Sucesso quando | Observar |
|---|---|---|---|
| T1 | "Você gastou R$ 42,90 no mercado hoje no débito. Registre esse gasto." | Lançamento de saída criado com valor, categoria e conta certos. | Acha o "Registrar"? Entende Entrada/Saída? Erros de valor (vírgula/ponto)? |
| T2 | "Descubra quanto você gastou com transporte na semana passada." | Chega ao número no Diário de Bordo (filtro de categoria e período) ou em Cartas. | Usa filtros? Percebe os chips de filtro ativo? Sabe limpar? |
| T3 | "O app diz que você saiu do planejado em alguma área. Qual área e quanto?" | Diz "Mercado" e o desvio em % (ou o valor acima do limite). | Liga "Rotas" a orçamento? Entende o desvio em %? Vê o alerta da Ponte de Comando? |
| T4 | "Registre um gasto de R$ 0,00 no cartão e corrija o erro." (dar o cartão de teste) | Lê a mensagem de erro e corrige sem ajuda; o que foi digitado continua no campo. | A mensagem diz o que fazer? O campo com erro fica claro? |
| T5 | "Exclua o lançamento que você criou na primeira tarefa. Agora imagine que foi por engano: o que você faria?" | Exclui pela confirmação e explica o que acontece (ou usa o Desfazer, se disponível). | A confirmação diz o impacto? A pessoa confia que o certo foi apagado? |

Depois de cada tarefa, perguntar: **"De 1 (muito difícil) a 7 (muito fácil), quão fácil foi?"** (SEQ).

**Encerramento (5 min).**
- "O que foi mais confuso?"
- "Que nome você daria para 'Rotas'? E para 'Destinos'?"
- "Você usaria esse app? Por quê?"

---

## 3. Métricas

| Métrica | Como medir | Meta para o lançamento |
|---|---|---|
| Taxa de sucesso | Tarefa concluída sem ajuda | ≥ 4 de 5 pessoas em cada tarefa |
| Tempo por tarefa | Do fim da leitura até o sucesso | T1 < 1 min; T2 e T3 < 2 min |
| Erros | Cliques no lugar errado, voltas, mensagens de erro | Registrar e classificar |
| SEQ | Nota de 1 a 7 | Média ≥ 5,5 por tarefa |
| Glossário (P-05) | Respostas da primeira impressão | Pelo menos 3 de 5 entendem cada termo **com** a linha de apoio visível |

---

## 4. Planilha de registro

Uma linha por problema observado:

| Participante | Tarefa | Tela | O que aconteceu (fato, não opinião) | Citação | Gravidade (0–4) | Princípio afetado |
|---|---|---|---|---|---|---|
| P1 | T3 | Ponte de Comando | Procurou "Orçamentos" no menu e não achou | "Cadê o orçamento?" | 3 | Descoberta |

**Gravidade (Nielsen):** 0 = não é problema; 1 = cosmético; 2 = menor; 3 = grave, corrigir antes do lançamento; 4 = catastrófico, impede a tarefa.

**Princípio afetado** (DESIGN.md §11): descoberta, avaliação (entender o que aconteceu), recuperação de erro, mapeamento, restrições.

---

## 5. Depois das sessões

1. Juntar os problemas iguais e somar quantas pessoas tiveram cada um.
2. Problemas de gravidade 3 e 4 viram tarefas novas no backlog **antes do lançamento**.
3. Se algum termo do glossário falhar (menos de 3 de 5 entendem com a linha de apoio), registrar a troca como decisão no PRODUCT.md (§5) e trocar o termo pelo nome comum.
4. Registrar o resultado e a data na decisão P-05.
