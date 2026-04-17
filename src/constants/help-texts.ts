export const HELP_CONTENTS = {
    SAVINGS_RATE: {
        title: "Poder de Aporte",
        description: "Poder de aporte é a capacidade financeira e a disciplina de adicionar dinheiro novo aos seus investimentos de forma constante. Ele é o principal motor para a construção de riqueza no longo prazo, superando muitas vezes a rentabilidade, pois potencializa o efeito dos juros compostos sobre o montante acumulado, permitindo aportes maiores e resultados exponenciais ao longo do tempo."
    },
    NET_WORTH: {
        title: "Patrimônio Líquido (Net Worth)",
        description: "É a soma de tudo o que você possui (ativos como saldo em conta e investimentos) menos tudo o que você deve (passivos como faturas de cartão e empréstimos). O Net Worth é a fotografia real da sua riqueza atual."
    },
    FOCUSED_MONITOR: {
        title: "Monitor de Foco",
        description: "O Monitor de Foco permite que você escolha categorias ou tags específicas para vigiar de perto. O sistema compara seus gastos atuais com a média dos últimos meses, alertando se você estiver saindo do planejado para aquele item específico."
    },
    SPENDING_FREQUENCY: {
        title: "Mapa de Calor de Atividade",
        description: "Visualiza em quais dias da semana e horários você costuma realizar mais transações. Isso ajuda a identificar padrões comportamentais, como o 'hábito de gastar no fim de semana' ou compras impulsivas noturnas."
    },
    INVESTMENT_ANALYSIS: {
        title: "Análise de Investimentos",
        description: "Aqui você vê a movimentação de capital para suas contas de investimento. Diferente das despesas, este valor representa dinheiro que está sendo guardado para o futuro, não gasto."
    },
    LIQUIDITY_RATIO: {
        title: "Índice de Liquidez",
        description: "Indica quanto do seu patrimônio está disponível imediatamente (em contas correntes ou reservas de emergência) comparado ao seu gasto mensal. Um índice saudável garante que você possa cobrir imprevistos sem resgatar investimentos de longo prazo."
    },
    DAILY_CASH_FLOW: {
        title: "Fluxo de Caixa Diário",
        description: "Representa a movimentação de entrada e saída de dinheiro no dia a dia. Ajuda a entender em quais dias do mês o seu dinheiro está sendo mais demandado e se o saldo do dia ficou positivo ou negativo."
    },
    TOTAL_BALANCE: {
        title: "Saldo em Contas",
        description: "O valor total somado de todas as suas contas bancárias e carteiras vinculadas (excluindo investimentos). É o dinheiro que você tem em mãos para as obrigações imediatas."
    },
    NET_RESULT: {
        title: "Resultado Líquido",
        description: "É o que sobra do seu dinheiro após pagar todas as contas do mês. Se for positivo, parabéns: você gastou menos do que ganhou! Se for negativo, indica que você precisou usar reservas ou crédito para fechar o mês."
    },
    CREDIT_MANAGEMENT: {
        title: "Gestão de Crédito",
        description: "Acompanha o uso do limite dos seus cartões de crédito. Manter o uso abaixo de 50% do limite é uma boa prática para manter seu Score Financeiro saudável."
    },
    BUDGETS: {
        title: "Controle de Orçamentos",
        description: "Orçamentos permitem definir limites de gastos por categoria. O sistema monitora suas transações em tempo real e avisa quando você está próximo de ultrapassar o limite definido, ajudando a manter a disciplina financeira."
    },
    FINANCIAL_SCORE: {
        title: "Score de Saúde Financeira",
        description: "É uma nota de 0 a 100 baseada na sua disciplina de gastos, poder de aporte e reserva de emergência. Quanto maior o score, mais sólida é sua base financeira para novos investimentos."
    },
    NEXT_BIG_EXPENSE: {
        title: "Próximo Grande Gasto",
        description: "Utilizamos análise técnica de fluxo histórico para identificar padrões de gastos elevados recorrentes (como seguros, impostos anuais ou faturas sazonais) e prever quando eles ocorrerão novamente."
    },
    PROJECTION: {
        title: "Simulador de Liberdade",
        description: "Projeta o crescimento do seu patrimônio investido ao longo das décadas, considerando juros compostos de 8% ao ano e o seu aporte médio mensal atual. É uma estimativa para visualização de longo prazo."
    },
    SAFE_DAILY_SPEND: {
        title: "Gasto Diário Seguro",
        description: "Calcula quanto você pode gastar por dia hoje sem comprometer suas contas futuras. Considera seu saldo atual, a renda esperada até o fim do mês e subtrai as despesas já realizadas e agendadas."
    },
    FIXED_VS_VARIABLE: {
        title: "Fixos vs Variáveis",
        description: "Separa seus gastos em 'Comprometidos' (contas fixas, assinaturas, aluguel) e 'Discricionários' (estilo de vida, lazer). Ajuda a entender qual fatia do seu orçamento está engessada."
    }
} as const;

export type HelpTopic = keyof typeof HELP_CONTENTS;
