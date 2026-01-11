import { useLiveQuery } from "dexie-react-hooks"
import { Plus, Trash2 } from "lucide-react"
import { db, getOrCreateDailyLog } from "@/db/database"
import { removeLogEntry } from "@/services/daily-log-service"
import { getDateString } from "@/lib/utils"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { AddFoodModal } from "@/components/common/add-food-modal"
import { useEffect, useState } from "react"
import type { DailyLog, MealType, LogEntry } from "@/types/database"

const mealTypes: { type: MealType; label: string }[] = [
  { type: "breakfast", label: "Breakfast" },
  { type: "lunch", label: "Lunch" },
  { type: "dinner", label: "Dinner" },
  { type: "snack", label: "Snacks" },
]

export function FoodLogPage() {
  const today = getDateString()
  const [dailyLog, setDailyLog] = useState<DailyLog | null>(null)
  const [showAddModal, setShowAddModal] = useState(false)
  const [selectedMealType, setSelectedMealType] = useState<MealType>("breakfast")

  useEffect(() => {
    getOrCreateDailyLog(today).then(setDailyLog)
  }, [today])

  const liveDailyLog = useLiveQuery(() =>
    db.dailyLogs.where("date").equals(today).first()
  )

  const currentLog = liveDailyLog ?? dailyLog

  const handleAddFood = (mealType: MealType) => {
    setSelectedMealType(mealType)
    setShowAddModal(true)
  }

  const handleDeleteEntry = async (entryId: string) => {
    await removeLogEntry(today, entryId)
  }

  const getEntriesForMeal = (mealType: MealType): LogEntry[] => {
    if (!currentLog) return []
    return currentLog.entries.filter((e) => e.mealType === mealType)
  }

  const getMealTotals = (entries: LogEntry[]) => {
    return entries.reduce(
      (acc, entry) => ({
        calories: acc.calories + entry.calories,
        protein: acc.protein + entry.protein,
      }),
      { calories: 0, protein: 0 }
    )
  }

  if (!currentLog) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-muted-foreground">Loading...</div>
      </div>
    )
  }

  return (
    <div className="p-4 space-y-4">
      <header>
        <h1 className="text-2xl font-bold">Food Log</h1>
        <p className="text-muted-foreground">
          {new Date().toLocaleDateString("en-US", {
            weekday: "long",
            month: "long",
            day: "numeric",
          })}
        </p>
      </header>

      <div className="p-4 bg-muted rounded-lg">
        <div className="flex justify-around text-center">
          <div>
            <p className="text-2xl font-bold">{currentLog.totalCalories}</p>
            <p className="text-sm text-muted-foreground">calories</p>
          </div>
          <div>
            <p className="text-2xl font-bold">{currentLog.totalProtein}g</p>
            <p className="text-sm text-muted-foreground">protein</p>
          </div>
          <div>
            <p className="text-2xl font-bold">{currentLog.totalFiber}g</p>
            <p className="text-sm text-muted-foreground">fiber</p>
          </div>
        </div>
      </div>

      {mealTypes.map(({ type, label }) => {
        const entries = getEntriesForMeal(type)
        const totals = getMealTotals(entries)

        return (
          <Card key={type}>
            <CardHeader className="pb-2">
              <div className="flex justify-between items-center">
                <div>
                  <CardTitle className="text-lg">{label}</CardTitle>
                  {entries.length > 0 && (
                    <p className="text-sm text-muted-foreground">
                      {totals.calories} cal | {totals.protein}g protein
                    </p>
                  )}
                </div>
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => handleAddFood(type)}
                >
                  <Plus className="w-5 h-5" />
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              {entries.length === 0 ? (
                <button
                  onClick={() => handleAddFood(type)}
                  className="w-full py-4 text-center text-muted-foreground hover:bg-muted rounded-lg transition-colors"
                >
                  + Add food
                </button>
              ) : (
                <div className="space-y-2">
                  {entries.map((entry) => (
                    <div
                      key={entry.id}
                      className="flex justify-between items-center p-3 bg-muted rounded-lg"
                    >
                      <div className="flex-1 min-w-0">
                        <p className="font-medium truncate">{entry.itemName}</p>
                        <p className="text-sm text-muted-foreground">
                          {entry.servings === 1
                            ? `${entry.servingSize} ${entry.servingUnit}`
                            : `${entry.servings} x ${entry.servingSize} ${entry.servingUnit}`}
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
                  <button
                    onClick={() => handleAddFood(type)}
                    className="w-full py-2 text-center text-sm text-muted-foreground hover:bg-muted rounded-lg transition-colors"
                  >
                    + Add more
                  </button>
                </div>
              )}
            </CardContent>
          </Card>
        )
      })}

      <AddFoodModal
        open={showAddModal}
        onOpenChange={setShowAddModal}
        defaultMealType={selectedMealType}
      />
    </div>
  )
}
