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
            <main className="flex-1 w-full bg-muted/10">
                {children}
            </main>
        </div>
    </AdminGuard>
  )
}
