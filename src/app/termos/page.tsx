"use client"

import { useEffect, useState, type ComponentType, type ReactNode } from "react"
import { ShieldCheck, FileText, Lock, Database, Trash2, Download, Target, Server, Sparkles, Cookie, Scale } from "lucide-react"
import { motion, useReducedMotion } from "framer-motion"
import { format } from "date-fns"
import { ptBR } from "date-fns/locale"

import { Badge } from "@/components/ui/badge"
import { Card } from "@/components/ui/card"
import { lerData } from "@/lib/datas"
import { tratarErro } from "@/lib/erros"
import { termosService, type TermosVigentes } from "@/services/termos"

// LGPD-31: as finalidades do uso dos dados
const FINALIDADES = [
  "Prestar o serviço: guardar e mostrar as suas contas, cartões, transações, metas e orçamentos.",
  "Criar e proteger a sua conta: identificar você no login e enviar e-mails de verificação, de recuperação de senha e de avisos sobre a conta.",
  "Liberar os recursos do seu plano.",
  "Dar suporte quando você pedir.",
]

// Uma seção dos termos: card de superfície com ícone de linha e título
function Secao({ icone: Icone, titulo, children }: { icone: ComponentType<{ className?: string }>; titulo: string; children: ReactNode }) {
  return (
    <Card className="p-5 sm:p-6">
      <div className="mb-4 flex items-center gap-3">
        <Icone className="h-5 w-5 shrink-0 text-muted-foreground" aria-hidden="true" />
        <h2 className="display-m">{titulo}</h2>
      </div>
      {children}
    </Card>
  )
}

// Bloco de destaque dentro de uma seção (sem cor de fundo, só borda)
function Quadro({ children, className }: { children: ReactNode; className?: string }) {
  return <div className={`rounded-md border border-border p-4 ${className ?? ""}`}>{children}</div>
}

export default function TermsPage() {
  const [termos, setTermos] = useState<TermosVigentes | null>(null)
  const reduzirMovimento = useReducedMotion()

  // LGPD-28 e LGPD-31: versão, data e serviços vêm da API, publicados junto com este texto
  useEffect(() => {
    const carregar = () => {
      termosService.obter().then(setTermos, (error: unknown) => {
        tratarErro(error, { mensagemPadrao: "Não foi possível carregar a versão dos termos.", tentarDeNovo: carregar })
      })
    }
    carregar()
  }, [])

  return (
    <div className="flex min-h-screen flex-col items-center bg-background px-4 py-12 sm:px-6 lg:px-8">
      <motion.div
        initial={reduzirMovimento ? false : { opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.24, ease: [0.2, 0, 0, 1] }}
        className="w-full max-w-3xl space-y-6"
      >
        <header className="mb-2 space-y-1">
          <h1 className="display-l">Termos e Privacidade</h1>
          <p className="text-sm text-muted-foreground">
            {termos
              ? `Versão ${termos.version}, em vigor desde ${format(lerData(termos.effective_date), "d 'de' MMMM 'de' yyyy", { locale: ptBR })}`
              : "Carregando a versão vigente..."}
          </p>
        </header>

        <Secao icone={ShieldCheck} titulo="Compromisso Azimute">
          <p className="text-sm leading-relaxed text-fg-secondary">
            No Azimute, levamos sua privacidade e a segurança dos seus dados financeiros a sério.
            Este documento explica como coletamos, usamos e protegemos suas informações dentro da nossa plataforma.
            Ao utilizar o Azimute, você concorda com as práticas descritas aqui.
          </p>
        </Secao>

        <Secao icone={Database} titulo="1. Coleta de Dados">
          <div className="space-y-4">
            <Quadro>
              <h3 className="label mb-2 text-muted-foreground">O que armazenamos</h3>
              <ul className="list-inside list-disc space-y-2 text-sm text-fg-secondary">
                <li>Informações de conta: Nome e e-mail.</li>
                <li>Dados Financeiros: Transações, saldos, categorias e metas.</li>
                <li>Arquivos Importados: Conteúdo de planilhas (XLS/CSV) e extratos (OFX).</li>
                <li>Imagens: Fotos de perfil e imagens anexadas às suas metas.</li>
              </ul>
            </Quadro>
            <p className="text-sm leading-relaxed text-fg-secondary">
              Não coletamos dados diretamente de suas contas bancárias através de senhas. Toda importação é feita manualmente por você através de arquivos ou digitação.
            </p>
          </div>
        </Secao>

        {/* Finalidades (LGPD-31) */}
        <Secao icone={Target} titulo="2. Para que usamos os dados">
          <ul className="mb-4 list-inside list-disc space-y-2 text-sm text-fg-secondary">
            {FINALIDADES.map((finalidade) => (
              <li key={finalidade}>{finalidade}</li>
            ))}
          </ul>
          <Quadro>
            <h3 className="label mb-2 flex items-center gap-2 text-muted-foreground">
              <Sparkles className="h-3.5 w-3.5" aria-hidden="true" /> Opcional: melhoria do produto
            </h3>
            <p className="text-sm leading-relaxed text-fg-secondary">
              Só com o seu consentimento, dado no cadastro ou nas configurações, usamos os seus dados anonimizados para
              melhorar o produto e treinar modelos de previsão e de categorização. Os dados anonimizados não trazem nome,
              e-mail, CPF, identificadores nem nomes de contas e cartões. O consentimento é opcional, vem desmarcado e pode
              ser retirado a qualquer momento nas configurações; a partir daí, os seus dados ficam fora dos conjuntos novos.
            </p>
          </Quadro>
        </Secao>

        {/* Serviços que tratam os dados (LGPD-31) */}
        <Secao icone={Server} titulo="3. Serviços que tratam os dados">
          {termos ? (
            <ul className="divide-y divide-border rounded-md border border-border">
              {termos.services.map((servico) => (
                <li key={servico.name} className="flex flex-col gap-1 p-3 sm:flex-row sm:items-center sm:justify-between">
                  <span className="text-sm font-medium text-foreground">{servico.name}</span>
                  <span className="text-sm text-muted-foreground">{servico.purpose}</span>
                </li>
              ))}
            </ul>
          ) : (
            <p className="text-sm text-muted-foreground">Carregando a lista de serviços...</p>
          )}
        </Secao>

        <Secao icone={Lock} titulo="4. Segurança">
          <p className="mb-4 text-sm leading-relaxed text-fg-secondary">
            A conexão entre o seu navegador e o Azimute é criptografada (HTTPS). CPF, telefone, data de nascimento e renda
            ficam criptografados no banco de dados.
          </p>
          <div className="flex flex-wrap gap-2">
            <Badge variant="secondary">Conexão HTTPS</Badge>
            <Badge variant="secondary">Dados pessoais criptografados</Badge>
          </div>
        </Secao>

        <Secao icone={FileText} titulo="5. Seus Direitos">
          <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
            <Quadro className="flex flex-col gap-2">
              <Download className="h-5 w-5 text-muted-foreground" aria-hidden="true" />
              <h3 className="text-sm font-semibold text-foreground">Download dos seus dados</h3>
              <p className="text-sm leading-relaxed text-muted-foreground">Em qualquer plano, você baixa os seus dados financeiros em uma planilha (XLSX) em Configurações, na aba Privacidade, inclusive antes de excluir a conta.</p>
            </Quadro>
            <Quadro className="flex flex-col gap-2">
              <Trash2 className="h-5 w-5 text-outflow" aria-hidden="true" />
              <h3 className="text-sm font-semibold text-foreground">Exclusão</h3>
              <p className="text-sm leading-relaxed text-muted-foreground">Você pode excluir a sua conta pelo app, em Configurações, na aba Privacidade, confirmando a senha. A conta é desativada na hora e, depois de 30 dias, ela e todos os dados são apagados definitivamente. Até lá, basta entrar de novo para desistir.</p>
            </Quadro>
          </div>
        </Secao>

        <Secao icone={Scale} titulo="6. Planos e Uso">
          <p className="mb-4 text-sm leading-relaxed text-fg-secondary">
            O Azimute oferece diferentes níveis de acesso. Enquanto funcionalidades de organização básica são gratuitas, recursos avançados de análise, automação e exportação de relatórios são exclusivos para planos pagos.
          </p>
          <Quadro>
            <h3 className="label mb-2 text-muted-foreground">Responsabilidade do usuário</h3>
            <p className="text-sm leading-relaxed text-fg-secondary">
              Você é o único responsável pela veracidade dos dados inseridos e pela segurança da sua senha. O Azimute não se responsabiliza por decisões financeiras tomadas com base nas projeções da plataforma.
            </p>
          </Quadro>
        </Secao>

        <Secao icone={Cookie} titulo="7. Cookies">
          <p className="text-sm leading-relaxed text-fg-secondary">
            Utilizamos apenas cookies essenciais e tecnologias de armazenamento local para manter sua sessão ativa e salvar suas preferências de interface (como o modo escuro). Não utilizamos cookies de rastreamento para fins publicitários de terceiros.
          </p>
        </Secao>

        <Secao icone={FileText} titulo="8. Alterações">
          <p className="text-sm leading-relaxed text-fg-secondary">
            Cada versão destes termos tem número e data de vigência. Quando uma versão nova passa a valer, o Azimute mostra o que mudou e pede o seu aceite no próximo acesso, antes de liberar as outras telas.
          </p>
        </Secao>

        <p className="mx-auto max-w-lg pb-12 text-center text-sm leading-relaxed text-muted-foreground">
          Dúvidas sobre nossa política de privacidade? Entre em contato com nosso suporte através do e-mail suporte@fluxar.com.br
        </p>
      </motion.div>
    </div>
  )
}
