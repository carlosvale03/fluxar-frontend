export interface BankOption {
    value: string
    label: string
    color: string
}

export const BANKS: BankOption[] = [
    { value: "nubank", label: "Nubank", color: "#820AD1" },
    { value: "itau", label: "Itaú", color: "#EC7000" },
    { value: "bradesco", label: "Bradesco", color: "#CC092F" },
    { value: "santander", label: "Santander", color: "#EC0000" },
    { value: "inter", label: "Banco Inter", color: "#FF7A00" },
    { value: "c6", label: "C6 Bank", color: "#242424" },
    { value: "btg", label: "BTG Pactual", color: "#00325D" },
    { value: "xp", label: "XP Investimentos", color: "#000000" },
    { value: "caixa", label: "Caixa", color: "#0066B3" },
    { value: "bb", label: "Banco do Brasil", color: "#F9DD16" },
    { value: "original", label: "Banco Original", color: "#25D366" },
    { value: "neon", label: "Neon", color: "#00FFFF" },
    { value: "next", label: "Next", color: "#00FF5F" },
]
