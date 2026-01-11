import { NavLink } from "react-router-dom"
import {
  LayoutDashboard,
  UtensilsCrossed,
  CalendarDays,
  Sparkles,
  Package,
  Settings,
} from "lucide-react"
import { cn } from "@/lib/utils"

const navItems = [
  { to: "/", icon: LayoutDashboard, label: "Today" },
  { to: "/log", icon: UtensilsCrossed, label: "Log" },
  { to: "/plan", icon: CalendarDays, label: "Plan" },
  { to: "/ideas", icon: Sparkles, label: "Ideas" },
  { to: "/inventory", icon: Package, label: "Pantry" },
  { to: "/settings", icon: Settings, label: "Settings" },
]

export function BottomNav() {
  return (
    <nav className="fixed bottom-0 left-0 right-0 z-50 bg-background border-t safe-area-pb">
      <div className="flex justify-around items-center h-16">
        {navItems.map(({ to, icon: Icon, label }) => (
          <NavLink
            key={to}
            to={to}
            className={({ isActive }) =>
              cn(
                "flex flex-col items-center justify-center gap-1 px-2 py-2 min-w-[56px] min-h-[48px] rounded-lg transition-colors",
                isActive
                  ? "text-primary"
                  : "text-muted-foreground hover:text-foreground"
              )
            }
          >
            <Icon className="w-5 h-5" />
            <span className="text-xs font-medium">{label}</span>
          </NavLink>
        ))}
      </div>
    </nav>
  )
}
