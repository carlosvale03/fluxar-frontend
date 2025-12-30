
import { useAuth } from "@/contexts/auth-context"

export function usePlan() {
  const { user } = useAuth()
  
  const plan = user?.plan || "common"

  const isCommon = plan === "common"
  const isPremium = plan === "premium"
  const isPremiumPlus = plan === "premium_plus"

  const formatPlanName = () => {
      switch(plan) {
          case "premium": return "Premium"
          case "premium_plus": return "Premium Plus"
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
