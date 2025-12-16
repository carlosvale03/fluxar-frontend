# 🚀 Guia de Deploy - Fluxar Frontend

Este repositório utiliza **GitHub Actions** para CI e **Vercel** para CD.

## 🔄 Fluxo de CI/CD
1. **Pull Request:** O GitHub Actions roda:
   - Lint (`npm run lint`)
   - Build de teste (`npm run build`)
2. **Merge na Main:** A Vercel detecta o push e publica a nova versão.

## ☁️ Configuração na Vercel
O projeto é detectado automaticamente como **Next.js**.

### Variáveis de Ambiente (Production)
Configure no painel da Vercel:
- `NEXT_PUBLIC_API_URL`: URL do backend em produção (ex: `https://fluxar-api.onrender.com/api`)

> **Nota:** Não é necessário configurar chaves de banco de dados ou secrets do backend aqui. O Frontend é público.
