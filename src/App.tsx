import { useEffect } from "react"
import { HashRouter, Routes, Route } from "react-router-dom"
import { AppShell } from "@/components/layout/app-shell"
import { DashboardPage } from "@/features/dashboard/dashboard-page"
import { FoodLogPage } from "@/features/food-log/food-log-page"
import { MealPlansPage } from "@/features/meal-plans/meal-plans-page"
import { AISuggestionsPage } from "@/features/ai-suggestions/ai-suggestions-page"
import { InventoryPage } from "@/features/inventory/inventory-page"
import { SettingsPage } from "@/features/settings/settings-page"
import { seedDatabase } from "@/db/seed-data"

function App() {
  useEffect(() => {
    seedDatabase()
  }, [])

  return (
    <HashRouter>
      <Routes>
        <Route element={<AppShell />}>
          <Route path="/" element={<DashboardPage />} />
          <Route path="/log" element={<FoodLogPage />} />
          <Route path="/plan" element={<MealPlansPage />} />
          <Route path="/ideas" element={<AISuggestionsPage />} />
          <Route path="/inventory" element={<InventoryPage />} />
          <Route path="/settings" element={<SettingsPage />} />
        </Route>
      </Routes>
    </HashRouter>
  )
}

export default App
