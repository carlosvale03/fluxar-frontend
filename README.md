# Fluxar – Sistema de Controle Financeiro Pessoal (Frontend)

Interface web moderna e intuitiva para o sistema **Fluxar**, projetada para oferecer uma experiência de gestão financeira pessoal premium, com foco em usabilidade, performance e design sofisticado.

---

## 🏗️ Arquitetura do Projeto

O Fluxar segue um modelo de arquitetura desacoplada (**API REST + SPA**):

- **Backend**: API robusta em Django/Python (Repositório: `fluxar-backend`).
- **Frontend**: Single Page Application (SPA) desenvolvida com Next.js e React (Este repositório).

### Módulos Documentados
- **Autenticação**: Fluxo completo de login, registro e proteção de rotas via JWT.
- **Dashboard**: Visão geral de saldos, receitas e despesas.
- **Transações**: Lista avançada com filtros, criação de transações avulsas e recorrentes.
- **Contas e Cartões**: Gestão de saldos bancários e limites de cartões de crédito.

---

## 🛠️ Tecnologias Utilizadas

- **Core**: [Next.js 16](https://nextjs.org/) (App Router), [React 19](https://react.dev/), [TypeScript](https://www.typescriptlang.org/).
- **Estilização**: [Tailwind CSS v4](https://tailwindcss.com/) com design system personalizado.
- **Componentes UI**: [Radix UI](https://www.radix-ui.com/) para acessibilidade e [Lucide React](https://lucide.dev/) para ícones.
- **Formulários**: [React Hook Form](https://react-hook-form.com/) e [Zod](https://zod.dev/) para validação.
- **Gráficos**: [Recharts](https://recharts.org/).
- **Comunicação**: [Axios](https://axios-http.com/) para consumo da API.
- **Infra**: Docker, Vercel (Deploy).

---

## 🚀 Como Rodar o Projeto (Localmente)

### Pré-requisitos
- Node.js 20+
- npm ou yarn

### Passo a Passo

1. **Instale as dependências:**
   ```bash
   npm install
   ```

2. **Configure as variáveis de ambiente:**
   Crie um arquivo `.env.local` na raiz do projeto:
   ```bash
   cp .env.example .env.local
   ```
   *No Windows:* `copy .env.example .env.local`

3. **Inicie o servidor de desenvolvimento:**
   ```bash
   npm run dev
   ```
   Acesse: [http://localhost:3000](http://localhost:3000)

---

## 🐳 Como Rodar com Docker

Para um ambiente completo e isolado:

```bash
docker compose up --build
```

### Serviços no Docker
- **frontend**: Next.js rodando em `http://localhost:3000`.

> [!NOTE]
> O container está configurado com `WATCHPACK_POLLING=true` para garantir que o Hot Reload funcione corretamente em ambientes Windows/Docker.

---

## 🔑 Variáveis de Ambiente

As variáveis devem ser configuradas no arquivo `.env.local`.

| Variável | Descrição | Exemplo |
| :--- | :--- | :--- |
| `NEXT_PUBLIC_API_URL` | URL base da API do Backend | `http://localhost:8000/api` |
| `NEXT_PUBLIC_ENABLE_ANALYTICS` | Habilitar/Desabilitar logs ou analytics | `false` |

---

## 📂 Estrutura de Pastas

```text
src/
├── app/          # Rotas e páginas (Next.js App Router)
├── components/   # Componentes reutilizáveis (UI, Layout, Features)
├── constants/    # Valores constantes e configurações estáticas
├── contexts/     # Contextos do React (Auth, Theme, etc.)
├── data/         # Mock data ou definições de dados estáticos
├── hooks/        # Hooks personalizados do React
├── lib/          # Configurações de bibliotecas (utils, api client)
├── providers/    # Wrappers de contexto globais
├── services/     # Lógica de integração com a API
└── types/        # Definições de tipos TypeScript e Interfaces
```

---

## 🔄 CI/CD e Deploy

O fluxo de deploy é automatizado:

- **Frontend**: Realizado via **Vercel**. Cada push na branch `main` dispara um novo deploy de produção. PRs geram ambientes de preview automáticos.
- **Integração**: O frontend consome a API hospedada no Render.

---

## 🤝 Como Contribuir

1. Faça um **Fork** do projeto.
2. Crie uma branch para sua feature: `git checkout -b feat/minha-feature`.
3. Siga o padrão de **Conventional Commits** (`feat:`, `fix:`, `docs:`, etc.).
4. Abra um **Pull Request** para a branch `main`.

---

## 📄 Licença

Este projeto está sob a licença [MIT](LICENSE).
