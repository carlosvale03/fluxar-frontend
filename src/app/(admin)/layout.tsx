import AdminGuard from "@/components/auth/admin-guard"
import { AdminSidebar } from "@/components/layout/admin-sidebar"

export default function AdminLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <AdminGuard>
        <div className="flex flex-1">
            <AdminSidebar />
            {/* O <main> é o do layout raiz (#conteudo) */}
            <div className="w-full flex-1">
                {children}
            </div>
        </div>
    </AdminGuard>
  )
}
