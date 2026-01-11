import { useLiveQuery } from "dexie-react-hooks"
import { Plus, Trash2 } from "lucide-react"
import { db, getOrCreateDailyLog, initializeSettings } from "@/db/database"
import { removeLogEntry } from "@/services/daily-log-service"
import { getDateString } from "@/lib/utils"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { MacroRing } from "@/components/common/macro-ring"
import { MacroBar } from "@/components/common/macro-bar"
import { AddFoodModal } from "@/components/common/add-food-modal"
import { useEffect, useState } from "react"
import type { DailyLog, UserSettings, MealType } from "@/types/database"

export function DashboardPage() {
  const today = getDateString()
  const [settings, setSettings] = useState<UserSettings | null>(null)
  const [dailyLog, setDailyLog] = useState<DailyLog | null>(null)
  const [showAddModal, setShowAddModal] = useState(false)
  const [selectedMealType, setSelectedMealType] = useState<MealType>("snack")

  useEffect(() => {
    initializeSettings().then(setSettings)
    getOrCreateDailyLog(today).then(setDailyLog)
  }, [today])

  const liveSettings = useLiveQuery(() => db.settings.get("user-settings"))
  const liveDailyLog = useLiveQuery(() =>
    db.dailyLogs.where("date").equals(today).first()
  )

  const currentSettings = liveSettings ?? settings
  const currentLog = liveDailyLog ?? dailyLog

  if (!currentSettings || !currentLog) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-muted-foreground">Loading...</div>
      </div>
    )
  }

  const { goals } = currentSettings
  const calorieTarget = (goals.caloriesMin + goals.caloriesMax) / 2
  const proteinTarget = (goals.proteinMin + goals.proteinMax) / 2

  const handleAddFood = (mealType: MealType = "snack") => {
    setSelectedMealType(mealType)
    setShowAddModal(true)
  }

  const handleDeleteEntry = async (entryId: string) => {
    await removeLogEntry(today, entryId)
  }

  const getMealTypeLabel = (type: MealType) => {
    return type.charAt(0).toUpperCase() + type.slice(1)
  }

  return (
    <div className="p-4 space-y-6">
      <header className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold">Today</h1>
          <p className="text-muted-foreground">
            {new Date().toLocaleDateString("en-US", {
              weekday: "long",
              month: "long",
              day: "numeric",
            })}
          </p>
        </div>
        <Button
          size="icon-lg"
          className="rounded-full"
          onClick={() => handleAddFood()}
        >
          <Plus className="w-6 h-6" />
        </Button>
      </header>

      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-lg">Daily Progress</CardTitle>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="flex justify-around">
            <MacroRing
              label="Calories"
              current={currentLog.totalCalories}
              target={calorieTarget}
              unit=""
              color="var(--color-calories)"
              size="lg"
            />
            <MacroRing
              label="Protein"
              current={currentLog.totalProtein}
              target={proteinTarget}
              unit="g"
              color="var(--color-protein)"
              size="lg"
            />
          </div>

          <div className="space-y-4">
            <MacroBar
              label="Fiber"
              current={currentLog.totalFiber}
              target={goals.fiber}
              unit="g"
              color="var(--color-fiber)"
            />
            <MacroBar
              label="Carbs"
              current={currentLog.totalCarbs}
              target={150}
              unit="g"
              color="var(--color-carbs)"
            />
            <MacroBar
              label="Fat"
              current={currentLog.totalFat}
              target={50}
              unit="g"
              color="var(--color-fat)"
            />
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-lg">Today's Meals</CardTitle>
        </CardHeader>
        <CardContent>
          {currentLog.entries.length === 0 ? (
            <div className="py-8 text-center text-muted-foreground">
              <p>No meals logged yet.</p>
              <p className="text-sm mt-1">Tap + to add your first meal</p>
            </div>
          ) : (
            <div className="space-y-2">
              {currentLog.entries.map((entry) => (
                <div
                  key={entry.id}
                  className="flex justify-between items-center p-3 bg-muted rounded-lg"
                >
                  <div className="flex-1 min-w-0">
                    <p className="font-medium truncate">{entry.itemName}</p>
                    <p className="text-sm text-muted-foreground">
                      {getMealTypeLabel(entry.mealType)} -{" "}
                      {entry.servings === 1
                        ? "1 serving"
                        : `${entry.servings} servings`}
                    </p>
                  </div>
                  <div className="text-right mr-2">
                    <p className="font-medium">{entry.calories} cal</p>
                    <p className="text-sm text-muted-foreground">
                      {entry.protein}g protein
                    </p>
                  </div>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="text-muted-foreground hover:text-destructive shrink-0"
                    onClick={() => handleDeleteEntry(entry.id)}
                  >
                    <Trash2 className="w-4 h-4" />
                  </Button>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-lg">Quick Add by Meal</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 gap-3">
            <Button
              variant="outline"
              className="h-14"
              onClick={() => handleAddFood("breakfast")}
            >
              + Breakfast
            </Button>
            <Button
              variant="outline"
              className="h-14"
              onClick={() => handleAddFood("lunch")}
            >
              + Lunch
            </Button>
            <Button
              variant="outline"
              className="h-14"
              onClick={() => handleAddFood("dinner")}
            >
              + Dinner
            </Button>
            <Button
              variant="outline"
              className="h-14"
              onClick={() => handleAddFood("snack")}
            >
              + Snack
            </Button>
          </div>
        </CardContent>
      </Card>

      <AddFoodModal
        open={showAddModal}
        onOpenChange={setShowAddModal}
        defaultMealType={selectedMealType}
      />
    </div>
  )
}
