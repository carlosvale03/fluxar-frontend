# Fluxar Frontend

Interface web do sistema Fluxar, desenvolvida com Next.js, TypeScript e Tailwind CSS.

## 🚀 Tecnologias
- Next.js 14+ (App Router)
- TypeScript
- Tailwind CSS
- Docker

## ⚙️ Configuração de Ambiente

1. **Crie o arquivo de variáveis locais:**
   Na raiz do projeto (`fluxar-frontend`), copie o exemplo:
   ```bash
   cp .env.example .env.local
   # Ou no Windows: copy .env.example .env.local
   ```

2. Variáveis Principais:

- `NEXT_PUBLIC_API_URL`: Endereço da API Backend.
  - Padrão Docker: `http://localhost:8000/api` (O browser acessa o back nesta porta).

> Nota: Apenas variáveis iniciadas com `NEXT_PUBLIC_` ficam visíveis no navegador.

## 🐳 Execução com Docker
Na raiz do projeto:
```bash
docker compose up
```

Acesse: `http://localhost:3000`

## 📦 Instalação Local (Node.js)
1. Instale dependências: `npm install`
2. Execute o servidor de desenvolvimento: `npm run dev`
