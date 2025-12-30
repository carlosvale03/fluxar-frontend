import { type ClassValue, clsx } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

export function getAbsoluteUrl(path?: string | null) {
  if (!path) return ""
  if (path.startsWith("http")) return path
  
  // Base URL logic - derive from API_URL or default to localhost:8000
  const apiUrl = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000/api"
  const baseUrl = apiUrl.replace(/\/api\/?$/, "")
  
  // Clean path
  let finalPath = path
  
  // Fix: If backend returns /avatars/ but serves at /media/avatars/ (Common Django misconfig)
  if (finalPath.startsWith("/avatars/") && !finalPath.startsWith("/media/")) {
      finalPath = `/media${finalPath}`
  }
  
  return `${baseUrl}${finalPath.startsWith("/") ? "" : "/"}${finalPath}`
}
