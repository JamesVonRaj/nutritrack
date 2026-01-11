import { Outlet } from "react-router-dom"
import { BottomNav } from "./bottom-nav"

export function AppShell() {
  return (
    <div className="min-h-screen bg-background">
      <main className="pb-20">
        <Outlet />
      </main>
      <BottomNav />
    </div>
  )
}
