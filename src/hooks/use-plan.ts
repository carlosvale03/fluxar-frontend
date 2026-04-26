
import { useAuth } from "@/contexts/auth-context"

export function usePlan() {
  const { user } = useAuth()
  
  // Fase de Testes: Todos os usuários têm acesso total
  const plan = "PREMIUM_PLUS" as any
  
  const isCommon = false
  const isPremium = true
  const isPremiumPlus = true

  const formatPlanName = () => {
      switch(plan) {
          case "PREMIUM": return "Premium"
          case "PREMIUM_PLUS": return "Premium Plus"
          default: return "Comum"
      }
  }

  return {
    plan,
    isCommon,
    isPremium,
    isPremiumPlus,
    label: formatPlanName()
  }
}
