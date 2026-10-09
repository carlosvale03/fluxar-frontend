"use client"

import { useEffect, useState } from "react"
import { ShieldCheck, FileText, Lock, Database, Trash2, Download, Target, Server, Sparkles } from "lucide-react"
import { motion } from "framer-motion"
import { format } from "date-fns"
import { ptBR } from "date-fns/locale"

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

export default function TermsPage() {
  const [termos, setTermos] = useState<TermosVigentes | null>(null)

  // LGPD-28 e LGPD-31: versão, data e serviços vêm da API, publicados junto com este texto
  useEffect(() => {
    const carregar = () => {
      termosService.obter().then(setTermos, (error: unknown) => {
        tratarErro(error, { mensagemPadrao: "Não foi possível carregar a versão dos termos.", tentarDeNovo: carregar })
      })
    }
    carregar()
  }, [])

  const containerVariants = {
    hidden: { opacity: 0 },
    show: {
      opacity: 1,
      transition: {
        staggerChildren: 0.1
      }
    }
  }

  const itemVariants = {
    hidden: { opacity: 0, y: 20 },
    show: { opacity: 1, y: 0 }
  }

  return (
    <div className="min-h-screen bg-background flex flex-col items-center py-12 px-4 sm:px-6 lg:px-8">
      <motion.div 
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        className="max-w-3xl w-full mb-8"
      >
        <h1 className="text-4xl font-black tracking-tight uppercase mb-2">Termos & Privacidade</h1>
        <p className="text-muted-foreground font-medium">
          {termos
            ? `Versão ${termos.version}, em vigor desde ${format(lerData(termos.effective_date), "d 'de' MMMM 'de' yyyy", { locale: ptBR })}`
            : "Carregando a versão vigente..."}
        </p>
      </motion.div>

      <motion.div 
        variants={containerVariants}
        initial="hidden"
        animate="show"
        className="max-w-3xl w-full space-y-8"
      >
        {/* Intro Card */}
        <motion.div variants={itemVariants} className="p-8 rounded-[32px] bg-card border border-border/60 shadow-xl shadow-black/5">
          <div className="flex items-center gap-4 mb-6">
            <div className="w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center shrink-0 shadow-sm ring-1 ring-black/5 dark:ring-white/10 text-primary">
              <ShieldCheck className="h-6 w-6" />
            </div>
            <h2 className="text-xl font-black uppercase tracking-tight">Compromisso Fluxar</h2>
          </div>
          <p className="text-sm leading-relaxed text-muted-foreground font-medium">
            No Fluxar, levamos sua privacidade e a segurança dos seus dados financeiros a sério. 
            Este documento explica como coletamos, usamos e protegemos suas informações dentro da nossa plataforma. 
            Ao utilizar o Fluxar, você concorda com as práticas descritas aqui.
          </p>
        </motion.div>

        {/* Coleta de Dados */}
        <motion.div variants={itemVariants} className="p-8 rounded-[32px] bg-card border border-border/60 shadow-xl shadow-black/5">
          <div className="flex items-center gap-4 mb-6">
            <div className="w-12 h-12 rounded-xl bg-blue-500/10 flex items-center justify-center shrink-0 shadow-sm ring-1 ring-black/5 dark:ring-white/10 text-blue-500">
              <Database className="h-6 w-6" />
            </div>
            <h2 className="text-xl font-black uppercase tracking-tight">1. Coleta de Dados</h2>
          </div>
          <div className="space-y-4">
            <div className="p-4 rounded-2xl bg-muted/30 border border-border/40">
              <h3 className="text-[10px] font-black uppercase tracking-widest text-foreground mb-2">O que armazenamos:</h3>
              <ul className="text-xs space-y-2 text-muted-foreground font-medium list-disc list-inside">
                <li>Informações de conta: Nome e e-mail.</li>
                <li>Dados Financeiros: Transações, saldos, categorias e metas.</li>
                <li>Arquivos Importados: Conteúdo de planilhas (XLS/CSV) e extratos (OFX).</li>
                <li>Imagens: Fotos de perfil e imagens anexadas às suas metas.</li>
              </ul>
            </div>
            <p className="text-sm leading-relaxed text-muted-foreground font-medium">
              Não coletamos dados diretamente de suas contas bancárias através de senhas. Toda importação é feita manualmente por você através de arquivos ou digitação.
            </p>
          </div>
        </motion.div>

        {/* Finalidades (LGPD-31) */}
        <motion.div variants={itemVariants} className="p-8 rounded-[32px] bg-card border border-border/60 shadow-xl shadow-black/5">
          <div className="flex items-center gap-4 mb-6">
            <div className="w-12 h-12 rounded-xl bg-indigo-500/10 flex items-center justify-center shrink-0 shadow-sm ring-1 ring-black/5 dark:ring-white/10 text-indigo-500">
              <Target className="h-6 w-6" />
            </div>
            <h2 className="text-xl font-black uppercase tracking-tight">2. Para que usamos os dados</h2>
          </div>
          <ul className="text-sm space-y-2 text-muted-foreground font-medium list-disc list-inside mb-4">
            {FINALIDADES.map((finalidade) => (
              <li key={finalidade}>{finalidade}</li>
            ))}
          </ul>
          <div className="p-4 rounded-2xl bg-indigo-500/5 border border-indigo-500/10">
            <h3 className="text-[10px] font-black uppercase tracking-widest text-foreground mb-2 flex items-center gap-2">
              <Sparkles className="h-3 w-3" /> Opcional: melhoria do produto
            </h3>
            <p className="text-xs text-muted-foreground leading-relaxed">
              Só com o seu consentimento, dado no cadastro ou nas configurações, usamos os seus dados anonimizados para
              melhorar o produto e treinar modelos de previsão e de categorização. Os dados anonimizados não trazem nome,
              e-mail, CPF, identificadores nem nomes de contas e cartões. O consentimento é opcional, vem desmarcado e pode
              ser retirado a qualquer momento nas configurações; a partir daí, os seus dados ficam fora dos conjuntos novos.
            </p>
          </div>
        </motion.div>

        {/* Serviços que tratam os dados (LGPD-31) */}
        <motion.div variants={itemVariants} className="p-8 rounded-[32px] bg-card border border-border/60 shadow-xl shadow-black/5">
          <div className="flex items-center gap-4 mb-6">
            <div className="w-12 h-12 rounded-xl bg-sky-500/10 flex items-center justify-center shrink-0 shadow-sm ring-1 ring-black/5 dark:ring-white/10 text-sky-500">
              <Server className="h-6 w-6" />
            </div>
            <h2 className="text-xl font-black uppercase tracking-tight">3. Serviços que tratam os dados</h2>
          </div>
          {termos ? (
            <ul className="space-y-2">
              {termos.services.map((servico) => (
                <li key={servico.name} className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-1 p-3 rounded-2xl bg-muted/30 border border-border/40">
                  <span className="text-sm font-bold">{servico.name}</span>
                  <span className="text-xs text-muted-foreground">{servico.purpose}</span>
                </li>
              ))}
            </ul>
          ) : (
            <p className="text-sm text-muted-foreground">Carregando a lista de serviços...</p>
          )}
        </motion.div>

        {/* Uso e Segurança */}
        <motion.div variants={itemVariants} className="p-8 rounded-[32px] bg-card border border-border/60 shadow-xl shadow-black/5">
          <div className="flex items-center gap-4 mb-6">
            <div className="w-12 h-12 rounded-xl bg-amber-500/10 flex items-center justify-center shrink-0 shadow-sm ring-1 ring-black/5 dark:ring-white/10 text-amber-500">
              <Lock className="h-6 w-6" />
            </div>
            <h2 className="text-xl font-black uppercase tracking-tight">4. Segurança</h2>
          </div>
          <p className="text-sm leading-relaxed text-muted-foreground font-medium mb-4">
            A conexão entre o seu navegador e o Fluxar é criptografada (HTTPS). CPF, telefone, data de nascimento e renda
            ficam criptografados no banco de dados.
          </p>
          <div className="flex gap-2">
            <Badge className="bg-amber-500/10 text-amber-600 border-amber-200 text-[9px] font-black uppercase tracking-wider rounded-full px-3">Conexão HTTPS</Badge>
            <Badge className="bg-amber-500/10 text-amber-600 border-amber-200 text-[9px] font-black uppercase tracking-wider rounded-full px-3">Dados pessoais criptografados</Badge>
          </div>
        </motion.div>

        {/* Seus Direitos */}
        <motion.div variants={itemVariants} className="p-8 rounded-[32px] bg-card border border-border/60 shadow-xl shadow-black/5">
          <div className="flex items-center gap-4 mb-6">
            <div className="w-12 h-12 rounded-xl bg-green-500/10 flex items-center justify-center shrink-0 shadow-sm ring-1 ring-black/5 dark:ring-white/10 text-green-500">
              <FileText className="h-6 w-6" />
            </div>
            <h2 className="text-xl font-black uppercase tracking-tight">5. Seus Direitos</h2>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="p-4 rounded-2xl bg-green-500/5 border border-green-500/10 flex flex-col gap-2">
              <Download className="h-5 w-5 text-green-600" />
              <h4 className="font-bold text-sm">Download dos seus dados</h4>
              <p className="text-[11px] text-muted-foreground leading-relaxed">Em qualquer plano, você baixa os seus dados financeiros em uma planilha (XLSX) em Configurações, na aba Privacidade, inclusive antes de excluir a conta.</p>
            </div>
            <div className="p-4 rounded-2xl bg-destructive/5 border border-destructive/10 flex flex-col gap-2">
              <Trash2 className="h-5 w-5 text-destructive" />
              <h4 className="font-bold text-sm">Exclusão</h4>
              <p className="text-[11px] text-muted-foreground leading-relaxed">Você pode excluir a sua conta pelo app, em Configurações, na aba Privacidade, confirmando a senha. A conta é desativada na hora e, depois de 30 dias, ela e todos os dados são apagados definitivamente. Até lá, basta entrar de novo para desistir.</p>
            </div>
          </div>
        </motion.div>

        {/* Planos e Funcionalidades */}
        <motion.div variants={itemVariants} className="p-8 rounded-[32px] bg-card border border-border/60 shadow-xl shadow-black/5">
          <div className="flex items-center gap-4 mb-6">
            <div className="w-12 h-12 rounded-xl bg-purple-500/10 flex items-center justify-center shrink-0 shadow-sm ring-1 ring-black/5 dark:ring-white/10 text-purple-500">
              <ShieldCheck className="h-6 w-6" />
            </div>
            <h2 className="text-xl font-black uppercase tracking-tight">6. Planos e Uso</h2>
          </div>
          <p className="text-sm leading-relaxed text-muted-foreground font-medium mb-4">
            O Fluxar oferece diferentes níveis de acesso. Enquanto funcionalidades de organização básica são gratuitas, recursos avançados de análise, automação e exportação de relatórios são exclusivos para planos pagos.
          </p>
          <div className="p-4 rounded-2xl bg-purple-500/5 border border-purple-500/10">
            <h4 className="text-[10px] font-black uppercase tracking-widest text-purple-700 mb-2">Responsabilidade do Usuário:</h4>
            <p className="text-xs text-muted-foreground leading-relaxed">
              Você é o único responsável pela veracidade dos dados inseridos e pela segurança da sua senha. O Fluxar não se responsabiliza por decisões financeiras tomadas com base nas projeções da plataforma.
            </p>
          </div>
        </motion.div>

        {/* Cookies e Tecnologia */}
        <motion.div variants={itemVariants} className="p-8 rounded-[32px] bg-card border border-border/60 shadow-xl shadow-black/5">
          <div className="flex items-center gap-4 mb-6">
            <div className="w-12 h-12 rounded-xl bg-cyan-500/10 flex items-center justify-center shrink-0 shadow-sm ring-1 ring-black/5 dark:ring-white/10 text-cyan-500">
              <Lock className="h-6 w-6" />
            </div>
            <h2 className="text-xl font-black uppercase tracking-tight">7. Cookies</h2>
          </div>
          <p className="text-sm leading-relaxed text-muted-foreground font-medium">
            Utilizamos apenas cookies essenciais e tecnologias de armazenamento local para manter sua sessão ativa e salvar suas preferências de interface (como o modo escuro). Não utilizamos cookies de rastreamento para fins publicitários de terceiros.
          </p>
        </motion.div>

        {/* Alterações */}
        <motion.div variants={itemVariants} className="p-8 rounded-[32px] bg-card border border-border/60 shadow-xl shadow-black/5">
          <div className="flex items-center gap-4 mb-6">
            <div className="w-12 h-12 rounded-xl bg-muted flex items-center justify-center shrink-0 shadow-sm ring-1 ring-black/5 text-muted-foreground">
              <FileText className="h-6 w-6" />
            </div>
            <h2 className="text-xl font-black uppercase tracking-tight">8. Alterações</h2>
          </div>
          <p className="text-sm leading-relaxed text-muted-foreground font-medium">
            Cada versão destes termos tem número e data de vigência. Quando uma versão nova passa a valer, o Fluxar mostra o que mudou e pede o seu aceite no próximo acesso, antes de liberar as outras telas.
          </p>
        </motion.div>

        {/* Footer info */}
        <motion.div variants={itemVariants} className="text-center pb-12">
          <p className="text-xs text-muted-foreground max-w-lg mx-auto leading-relaxed">
            Dúvidas sobre nossa política de privacidade? Entre em contato com nosso suporte através do e-mail suporte@fluxar.com.br
          </p>
        </motion.div>
      </motion.div>
    </div>
  )
}

function Badge({ children, className }: { children: React.ReactNode, className?: string }) {
  return (
    <span className={`inline-flex items-center border rounded-full px-2.5 py-0.5 font-semibold transition-colors focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 ${className}`}>
      {children}
    </span>
  )
}
