import type { Rewrite } from "next/dist/lib/load-custom-routes"
import { formatUrl } from "next/dist/shared/lib/router/utils/format-url"
import { getPathMatch } from "next/dist/shared/lib/router/utils/path-match"
import { prepareDestination } from "next/dist/shared/lib/router/utils/prepare-destination"
import { afterEach, describe, expect, it, vi } from "vitest"

import nextConfig from "../../next.config"
import { api } from "@/services/apiClient"

// SESSAO-05: a página chama a API por /api na própria origem, e o Next.js faz
// o rewrite para o backend. Assim o cookie de renovação é de primeira parte em
// qualquer navegador, inclusive no Safari.

// Resolve o caminho como o roteador do Next: a primeira regra que casa vence
async function destinoDe(caminho: string) {
  const regras = (await nextConfig.rewrites!()) as Rewrite[]
  for (const regra of regras) {
    const params = getPathMatch(regra.source, { strict: true, removeUnnamedParams: true })(caminho)
    if (params) {
      const { parsedDestination } = prepareDestination({
        appendParamsToQuery: false, destination: regra.destination, params, query: {},
      })
      return formatUrl(parsedDestination)
    }
  }
  return null
}

describe("proxy da API", () => {
  afterEach(() => {
    vi.unstubAllEnvs()
  })

  it("leva /api/* ao BACKEND_URL mantendo a barra final das rotas do Django", async () => {
    vi.stubEnv("BACKEND_URL", "https://fluxar-api.onrender.com")

    expect(await destinoDe("/api/auth/refresh/")).toBe("https://fluxar-api.onrender.com/api/auth/refresh/")
    expect(await destinoDe("/api/accounts/12/")).toBe("https://fluxar-api.onrender.com/api/accounts/12/")
    // Sem o redirecionamento 308 que tiraria a barra final antes do rewrite
    expect(nextConfig.skipTrailingSlashRedirect).toBe(true)
  })

  it("usa http://localhost:8000 sem BACKEND_URL e não mexe nas páginas", async () => {
    vi.stubEnv("BACKEND_URL", undefined)

    expect(await destinoDe("/api/auth/logout/")).toBe("http://localhost:8000/api/auth/logout/")
    expect(await destinoDe("/dashboard")).toBeNull()
  })

  it("o apiClient chama a API pela própria origem", () => {
    expect(api.defaults.baseURL).toBe("/api")
  })
})
