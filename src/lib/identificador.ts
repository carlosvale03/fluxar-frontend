// AD-007 e SALARIO-79: a chave de uma tentativa (UUID v4). O
// crypto.randomUUID só existe em contexto seguro (https ou localhost); aberto
// por http num IP da rede, o app monta o UUID com crypto.getRandomValues, que
// existe também fora dele, e só sem crypto recorre ao Math.random.
export function novoIdentificador(): string {
  const cripto = typeof globalThis !== "undefined" ? globalThis.crypto : undefined
  if (typeof cripto?.randomUUID === "function") return cripto.randomUUID()

  const bytes = new Uint8Array(16)
  if (typeof cripto?.getRandomValues === "function") cripto.getRandomValues(bytes)
  else for (let i = 0; i < bytes.length; i++) bytes[i] = Math.floor(Math.random() * 256)
  // Versão 4 e variante RFC 4122
  bytes[6] = (bytes[6] & 0x0f) | 0x40
  bytes[8] = (bytes[8] & 0x3f) | 0x80
  const hex = Array.from(bytes, (b) => b.toString(16).padStart(2, "0")).join("")
  return `${hex.slice(0, 8)}-${hex.slice(8, 12)}-${hex.slice(12, 16)}-${hex.slice(16, 20)}-${hex.slice(20)}`
}
