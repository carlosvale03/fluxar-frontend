"use client"

import * as React from "react"
import * as LucideIcons from "lucide-react"
import { Search } from "lucide-react"
import { cn } from "@/lib/utils"
import { Input } from "@/components/ui/input"

// List of recommended icons for financial categories (deduplicated)
export const RECOMMENDED_ICONS = Array.from(new Set([
  "Wallet", "CreditCard", "Banknote", "TrendingUp", "TrendingDown", 
  "ShoppingBag", "Utensils", "Car", "Home", "Briefcase", 
  "GraduationCap", "HeartPulse", "Gamepad2", "Plane", "Trophy", 
  "Gift", "Smartphone", "Zap", "Droplets", "Bus", 
  "ShoppingBasket", "Coffee", "Music", "Film", "Camera", 
  "Tv", "Watch", "Umbrella", "Baby", "Dog", "Cat", 
  "Flower2", "Sprout", "Sun", "Moon", "Cloud", "Star", 
  "Check", "X", "Search", "Settings", "User", "Lock", "Mail", "Phone", "Bell",
  "ArrowUpCircle", "ArrowDownCircle", "DollarSign", "Euro", "Bitcoin", "PiggyBank",
  "Building", "Landmark", "Store", "Factory", "Hammer", "Wrench", "Shield",
  "Wifi", "Flame", "Lightbulb", "Shirt", "Stethoscope", "Pill", "Syringe", "Dumbbell",
  "Ticket", "Palette", "Languages", "Map", "Navigation", "Grape", "Apple",
  "Beef", "Fish", "Egg", "Milk", "IceCream", "Pizza", "Soup", "Sandwich",
  "Bicycle", "Truck", "Train", "Anchor", "Activity", "Heart", "Smile", "Flag",
  "Book", "Newspaper", "PenTool", "Brush", "Music2", "Headphones", "Mic",
  "CloudRain", "CloudLightning", "Thermometer", "Wind", "Mountain", "Waves"
]))

// Aliases in Portuguese for icon search
export const ICON_ALIASES: Record<string, string[]> = {
  Wallet: ["carteira", "dinheiro", "pagamento", "finanças"],
  CreditCard: ["cartão", "crédito", "débito", "nubank", "banco"],
  Banknote: ["dinheiro", "nota", "cédula", "cash", "papel"],
  TrendingUp: ["lucro", "subida", "ganho", "investimento", "receita", "positivo"],
  TrendingDown: ["prejuízo", "descida", "perda", "gasto", "despesa", "negativo"],
  ShoppingBag: ["compras", "sacola", "loja", "shopee", "mercado", "varejo"],
  Utensils: ["comida", "restaurante", "alimentação", "jantar", "almoço", "garfo"],
  Car: ["carro", "veículo", "transporte", "gasolina", "uber", "automóvel"],
  Home: ["casa", "moradia", "aluguel", "lar", "residência"],
  Briefcase: ["trabalho", "emprego", "carreira", "negócios", "maleta", "office"],
  GraduationCap: ["educação", "faculdade", "escola", "estudo", "formatura", "curso"],
  HeartPulse: ["saúde", "médico", "hospital", "batimento", "exame", "clínica"],
  Gamepad2: ["jogos", "games", "lazer", "entretenimento", "ps5", "xbox", "videogame"],
  Plane: ["viagem", "avião", "férias", "turismo", "passagem", "aeroporto"],
  Trophy: ["prêmio", "troféu", "conquista", "vitória", "bônus", "recompensa"],
  Gift: ["presente", "doação", "mimo", "aniversário", "lembrança"],
  Smartphone: ["celular", "telefone", "mobile", "app", "iphone", "android"],
  Zap: ["energia", "luz", "eletricidade", "rápido", "raio", "potência"],
  Droplets: ["água", "líquido", "limpeza", "chuva", "gota"],
  Bus: ["ônibus", "transporte", "público", "circular", "viagem"],
  ShoppingBasket: ["mercado", "compras", "cesta", "feira", "supermercado"],
  Coffee: ["café", "bebida", "padaria", "starbucks", "lanche", "copo"],
  Music: ["música", "som", "áudio", "show", "spotify", "melodia"],
  Film: ["filme", "cinema", "netflix", "vídeo", "lazer", "entretenimento"],
  Camera: ["foto", "fotografia", "instagram", "câmera", "lente"],
  Tv: ["televisão", "tv", "streaming", "série", "controle"],
  Watch: ["relógio", "tempo", "horário", "acessório", "pulso"],
  Umbrella: ["seguro", "proteção", "guarda-chuva", "imprevisto", "sol"],
  Baby: ["bebê", "filhos", "criança", "maternidade", "paternidade", "fralda"],
  Dog: ["cachorro", "pet", "animal", "veterinário", "cão"],
  Cat: ["gato", "pet", "animal", "veterinário", "felino"],
  Flower2: ["flores", "jardim", "decoração", "presente", "natureza"],
  Sprout: ["investimento", "crescimento", "planta", "broto", "sustentável"],
  Sun: ["luz", "dia", "sol", "verão", "calor", "clima"],
  Moon: ["noite", "descanso", "lua", "dormir", "escuro"],
  Cloud: ["nuvem", "clima", "armazenamento", "drive", "tempo"],
  Star: ["favorito", "estrela", "importante", "destaque", "avaliação"],
  Check: ["concluído", "pago", "ok", "sucesso", "feito"],
  X: ["cancelado", "erro", "parar", "fechar", "remover"],
  Search: ["buscar", "procurar", "pesquisar", "lupa", "encontrar"],
  Settings: ["ajustes", "configurações", "ferramentas", "engrenagem", "painel"],
  User: ["usuário", "perfil", "pessoa", "cliente", "membro"],
  Lock: ["segurança", "cadeado", "senha", "privacidade", "bloqueio"],
  Mail: ["e-mail", "correio", "mensagem", "carta", "caixa de entrada"],
  Phone: ["telefone", "ligação", "contato", "chamada", "fixo"],
  Bell: ["notificação", "alerta", "sino", "aviso", "campainha"],
  ArrowUpCircle: ["receita", "entrada", "subir", "ganho", "positivo"],
  ArrowDownCircle: ["despesa", "saída", "descer", "gasto", "negativo"],
  DollarSign: ["dólar", "moeda", "dinheiro", "eua", "câmbio"],
  Euro: ["euro", "moeda", "dinheiro", "europa", "câmbio"],
  Bitcoin: ["cripto", "bitcoin", "investimento", "moeda digital", "crypto"],
  PiggyBank: ["poupança", "cofre", "porquinho", "reserva", "guardar", "economizar"],
  Building: ["prédio", "empresa", "escritório", "condomínio", "apartamento"],
  Landmark: ["banco", "governo", "monumento", "instituição", "história"],
  Store: ["loja", "comércio", "estabelecimento", "venda", "comprar"],
  Factory: ["indústria", "fábrica", "produção", "negócio", "operário"],
  Hammer: ["reforma", "ferramenta", "martelo", "construção", "obras"],
  Wrench: ["manutenção", "conserto", "ferramenta", "ajuste", "mecânico"],
  Shield: ["proteção", "seguro", "escudo", "garantia", "segurança"],
  Wifi: ["internet", "wi-fi", "rede", "conexão", "roteador"],
  Flame: ["fogo", "gás", "quente", "importante", "incêndio"],
  Lightbulb: ["ideia", "luz", "lâmpada", "criatividade", "inovação"],
  Shirt: ["roupa", "vestuário", "moda", "camisa", "lavanderia"],
  Stethoscope: ["saúde", "médico", "estetoscópio", "consulta", "doutor"],
  Pill: ["remédio", "farmácia", "saúde", "medicamento", "hospital"],
  Syringe: ["vacina", "exame", "hospital", "seringa", "injeção"],
  Dumbbell: ["academia", "treino", "esporte", "saúde", "peso", "musculação"],
  Ticket: ["ingresso", "ticket", "passagem", "evento", "cinema"],
  Palette: ["arte", "design", "cores", "pintura", "estilo"],
  Languages: ["idioma", "tradução", "língua", "estrangeiro", "inglês"],
  Map: ["mapa", "localização", "onde", "endereço", "viagem"],
  Navigation: ["gps", "navegação", "rota", "direção", "mapas"],
  Grape: ["fruta", "uva", "vinho", "mercado", "hortifruti"],
  Apple: ["fruta", "maçã", "saúde", "mercado", "hortifruti"],
  Beef: ["carne", "churrasco", "açougue", "boi", "proteína"],
  Fish: ["peixe", "frutos do mar", "pesca", "saudável", "ômega 3"],
  Egg: ["ovo", "proteína", "café da manhã", "mercado", "galinha"],
  Milk: ["leite", "laticínios", "café da manhã", "mercado", "vaca"],
  IceCream: ["sorvete", "doce", "sobremesa", "gelado", "picolé"],
  Pizza: ["pizza", "lanche", "jantar", "delivery", "massa"],
  Soup: ["sopa", "caldo", "jantar", "quente", "legumes"],
  Sandwich: ["lanche", "sanduíche", "fast food", "hambúrguer", "comida rápida"],
  Bicycle: ["bicicleta", "bike", "esporte", "lazer", "transporte", "pedalar"],
  Truck: ["frete", "mudança", "caminhão", "entrega", "logística"],
  Train: ["trem", "metrô", "viagem", "transporte", "estação"],
  Anchor: ["âncora", "porto", "mar", "estável", "navio"],
  Activity: ["atividade", "gráfico", "saúde", "movimento", "exercício"],
  Heart: ["favorito", "amor", "saúde", "curtir", "coração"],
  Smile: ["feliz", "satisfação", "lazer", "sorriso", "alegria"],
  Flag: ["bandeira", "meta", "objetivo", "país", "aviso"],
  Book: ["livro", "leitura", "estudo", "educação", "biblioteca"],
  Newspaper: ["jornal", "notícia", "revista", "informação", "atualidades"],
  PenTool: ["design", "ferramenta", "vetor", "criação", "desenho"],
  Brush: ["pintura", "pincel", "limpeza", "beleza", "maquiagem"],
  Music2: ["música", "instrumento", "nota musical", "melodia", "violão"],
  Headphones: ["fone", "ouvido", "música", "podcast", "headset"],
  Mic: ["microfone", "áudio", "gravação", "podcast", "voz", "palco"],
  CloudRain: ["chuva", "clima", "tempo", "água", "temporal"],
  CloudLightning: ["tempestade", "raio", "clima", "tempo", "trovão"],
  Thermometer: ["temperatura", "clima", "febre", "quente", "frio", "hospital"],
  Wind: ["vento", "clima", "ar", "fresco", "natureza"],
  Mountain: ["montanha", "natureza", "viagem", "aventura", "escalada"],
  Waves: ["mar", "praia", "surfe", "ondas", "água", "férias"]
}

interface IconPickerProps {
  value?: string
  onChange: (value: string) => void
  className?: string
}

export function IconPicker({ value, onChange, className }: IconPickerProps) {
  const [searchTerm, setSearchTerm] = React.useState("")

  const normalizeString = (str: string) => 
    str.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "")

  const filteredIcons = RECOMMENDED_ICONS.filter((iconName) => {
    const searchNormalized = normalizeString(searchTerm)
    const nameNormalized = normalizeString(iconName)
    const aliases = ICON_ALIASES[iconName] || []
    
    // Check if name matches or any alias matches
    return nameNormalized.includes(searchNormalized) || 
           aliases.some(alias => normalizeString(alias).includes(searchNormalized))
  })

  return (
    <div className={cn("space-y-4", className)}>
      <div className="relative group">
        <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground group-focus-within:text-primary transition-colors" />
        <Input
          placeholder="Buscar ícone (ex: casa, comida, lazer...)"
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="pl-10 h-11 rounded-xl bg-muted/20 border-border/10 focus-visible:ring-primary/20 focus-visible:border-primary/40 transition-all font-medium"
        />
      </div>
      
      <div className="grid grid-cols-6 sm:grid-cols-8 gap-2.5 max-h-[220px] overflow-y-auto p-3 bg-muted/5 border border-border/40 rounded-2xl custom-scrollbar animate-in fade-in duration-500">
        {filteredIcons.map((iconName) => {
          const IconComponent = (LucideIcons as any)[iconName]
          if (!IconComponent) return null

          const isSelected = value === iconName

          return (
            <button
              key={iconName}
              type="button"
              onClick={() => onChange(iconName)}
              className={cn(
                "w-10 h-10 flex items-center justify-center rounded-xl transition-all duration-300 cursor-pointer shrink-0",
                isSelected 
                  ? "bg-primary text-primary-foreground shadow-lg shadow-primary/25 scale-110 ring-2 ring-primary/20 z-10" 
                  : "bg-background border border-border/40 text-muted-foreground/60 hover:bg-primary/10 hover:text-primary hover:border-primary/30 hover:shadow-sm"
              )}
              title={iconName}
            >
              <IconComponent className={cn("transition-transform duration-300", isSelected ? "h-5 w-5 scale-110" : "h-4.5 w-4.5")} />
            </button>
          )
        })}
        {filteredIcons.length === 0 && (
          <div className="col-span-full py-10 flex flex-col items-center justify-center text-center space-y-2 opacity-40">
            <Search className="h-8 w-8 mb-2" />
            <p className="text-[10px] font-black uppercase tracking-widest">Nenhum ícone encontrado</p>
          </div>
        )}
      </div>
    </div>
  )
}

// Utility to render dynamic icon
export function LucideIcon({ name, className, ...props }: { name: string; className?: string } & any) {
  const IconComponent = (LucideIcons as any)[name] || LucideIcons.HelpCircle
  return <IconComponent className={className} {...props} />
}
