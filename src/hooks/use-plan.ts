
import { useAuth } from "@/contexts/auth-context"

export function usePlan() {
  const { user } = useAuth()
  
  const plan = user?.plan || "COMMON"
  
  const isCommon = plan === "COMMON"
  const isPremium = plan === "PREMIUM"
  const isPremiumPlus = plan === "PREMIUM_PLUS"

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
