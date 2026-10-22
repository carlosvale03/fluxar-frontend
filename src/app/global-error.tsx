"use client"

// AZ-42: falha no próprio layout raiz. Sem o layout, não há tema nem fontes:
// as cores vêm direto do tema escuro do DESIGN.md.
export default function ErroGeral({ reset }: { error: Error & { digest?: string }; reset: () => void }) {
  return (
    <html lang="pt-BR">
      <body style={{ margin: 0, background: "#07090F", color: "#ECEEF2", fontFamily: "system-ui, sans-serif" }}>
        <div role="alert" style={{ minHeight: "100vh", display: "grid", placeItems: "center", padding: 16 }}>
          <div style={{ maxWidth: 420, textAlign: "center" }}>
            <h1 style={{ fontSize: 22, margin: "0 0 8px" }}>O Azimute não conseguiu abrir</h1>
            <p style={{ color: "#A4ADBE", fontSize: 14, margin: "0 0 24px" }}>
              Seus dados continuam salvos. Tente de novo em instantes.
            </p>
            <button
              type="button"
              onClick={reset}
              style={{
                background: "#F5A524",
                color: "#0A0D14",
                border: 0,
                borderRadius: 8,
                padding: "10px 16px",
                fontWeight: 600,
                cursor: "pointer",
              }}
            >
              Tentar de novo
            </button>
          </div>
        </div>
      </body>
    </html>
  )
}
