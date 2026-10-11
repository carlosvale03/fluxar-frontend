import { AccountType } from "@/types/accounts"
import type { AcaoDaConta, PlanoDeImportacao } from "@/types/importacao"

// AD-055: a tela é dona do plano editado. A resposta de uma análise traz o
// plano completo (com o motivo das abas, os cabeçalhos e os dados das contas
// no arquivo), mas uma edição feita enquanto a análise rodava não pode se
// perder: o que o usuário decidiu prevalece, e o servidor completa o resto.
export function mesclarPlano(local: PlanoDeImportacao, servidor: PlanoDeImportacao): PlanoDeImportacao {
  const abasLocais = new Map((local.abas ?? []).map((aba) => [aba.nome, aba]))
  const contasLocais = local.contas ?? {}

  return {
    modelo: servidor.modelo ?? null,
    abas: (servidor.abas ?? []).map((aba) => {
      const editada = abasLocais.get(aba.nome)
      if (!editada) return aba
      // Com o papel igual, o motivo do servidor vale; com o papel trocado
      // depois do envio, o motivo antigo não se aplica mais
      const motivo = editada.papel === aba.papel ? aba.motivo : null
      return { ...aba, papel: editada.papel, colunas: editada.colunas ?? aba.colunas, motivo }
    }),
    contas: Object.fromEntries(
      Object.entries(servidor.contas ?? {}).map(([nome, acao]) => {
        const editada = contasLocais[nome]
        return [nome, editada ? ({ ...editada, arquivo: acao.arquivo } as AcaoDaConta) : acao]
      }),
    ),
    linhas: local.linhas ?? servidor.linhas ?? {},
  }
}

// Comparação de nomes sem maiúsculas, acentos e espaços extras (IMPCOMP-11)
export function nomeComparavel(texto: string | null | undefined): string {
  return (texto ?? "")
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .replace(/\s+/g, " ")
    .trim()
}

// IMPCOMP-12: o tipo sugerido pelas palavras óbvias do nome, a mesma regra
// do backend; usado quando o usuário troca uma conta vinculada para criar
export function tipoSugerido(nome: string): AccountType {
  const comparavel = nomeComparavel(nome)
  const tem = (...palavras: string[]) => palavras.some((palavra) => comparavel.includes(palavra))
  if (tem("carteira")) return AccountType.WALLET
  if (tem("poupanca", "reserva")) return AccountType.SAVINGS
  if (tem("investimento", "cdb")) return AccountType.INVESTMENT
  if (tem("cofrinho")) return AccountType.PIGGY_BANK
  return AccountType.CHECKING
}
