import type { Metadata } from "next";
import { Archivo, IBM_Plex_Mono, IBM_Plex_Sans } from "next/font/google";
import "./globals.css";
import { ThemeProvider } from "@/providers/theme-provider";
import { AuthProvider } from "@/contexts/auth-context";
import { Avisos } from "@/components/layout/avisos";
import { FocoNaTrocaDeRota } from "@/components/layout/foco-na-troca-de-rota";
import { Header } from "@/components/layout/header";
import { Footer } from "@/components/layout/footer";

// Títulos (Archivo largo), corpo (IBM Plex Sans) e números (IBM Plex Mono): DESIGN.md §4
const archivo = Archivo({
  variable: "--font-archivo",
  subsets: ["latin"],
  axes: ["wdth"],
  display: "swap",
});

// Variável com o eixo de largura, como o Archivo: com pesos fixos, o Google
// devolve instâncias estáticas que quebram o carregador de fontes no build da Vercel
const plexSans = IBM_Plex_Sans({
  variable: "--font-plex-sans",
  subsets: ["latin"],
  axes: ["wdth"],
  display: "swap",
});

const plexMono = IBM_Plex_Mono({
  variable: "--font-plex-mono",
  subsets: ["latin"],
  weight: ["400", "500"],
  display: "swap",
});

export const metadata: Metadata = {
  title: { default: "Azimute", template: "%s · Azimute" },
  description: "Rumo exato para o seu dinheiro.",
  applicationName: "Azimute",
};

import { ServerWakeupOverlay } from "@/components/ui/server-wakeup-overlay";

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    // As variáveis das fontes ficam no <html> para o --font-sans do @theme (definido no :root) enxergá-las
    <html
      lang="pt-BR"
      suppressHydrationWarning
      className={`${archivo.variable} ${plexSans.variable} ${plexMono.variable}`}
    >
      <body
        className="antialiased min-h-screen flex flex-col bg-background text-foreground"
      >
        <ThemeProvider
          attribute="class"
          defaultTheme="dark"
          enableSystem
          disableTransitionOnChange
        >
          <AuthProvider>
            {/* AZ-21.7: primeiro item do teclado */}
            <a
              href="#conteudo"
              className="sr-only focus:not-sr-only focus:fixed focus:left-4 focus:top-4 focus:z-toast focus:rounded-md focus:bg-gold focus:px-4 focus:py-2 focus:text-gold-ink"
            >
              Pular para o conteúdo
            </a>
            <Header />
            {/* max-md:pb-20: espaço para o menu inferior do celular */}
            <main id="conteudo" tabIndex={-1} className="flex-1 outline-none max-md:pb-20">
              {children}
            </main>
            <FocoNaTrocaDeRota />
            <Footer />
            <ServerWakeupOverlay />
            <Avisos />
          </AuthProvider>
        </ThemeProvider>
      </body>
    </html>
  );
}
