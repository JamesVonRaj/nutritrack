import { useState, useEffect } from "react"
import { useLiveQuery } from "dexie-react-hooks"
import { ChevronLeft, ChevronRight, Plus, Check, Trash2 } from "lucide-react"
import { db } from "@/db/database"
import {
  getWeekDates,
  formatDayShort,
  formatDayNumber,
  isToday,
  getOrCreateMealPlan,
  removePlannedMeal,
  markMealAsEaten,
} from "@/services/meal-plan-service"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { AddToPlanModal } from "@/components/common/add-to-plan-modal"
import type { MealPlan, MealType, PlannedMeal } from "@/types/database"
import { cn } from "@/lib/utils"

const mealTypes: { type: MealType; label: string }[] = [
  { type: "breakfast", label: "Breakfast" },
  { type: "lunch", label: "Lunch" },
  { type: "dinner", label: "Dinner" },
  { type: "snack", label: "Snacks" },
]

export function MealPlansPage() {
  const [weekOffset, setWeekOffset] = useState(0)
  const [selectedDate, setSelectedDate] = useState<string>(
    new Date().toISOString().split("T")[0]
  )
  const [showAddModal, setShowAddModal] = useState(false)
  const [selectedMealType, setSelectedMealType] = useState<MealType>("breakfast")

  const weekDates = getWeekDates(
    new Date(Date.now() + weekOffset * 7 * 24 * 60 * 60 * 1000)
  )

  const weekDateStrings = weekDates.map((d) => d.toISOString().split("T")[0])

  // Initialize meal plans for the week
  useEffect(() => {
    weekDateStrings.forEach((date) => {
      getOrCreateMealPlan(date)
    })
  }, [weekOffset])

  const mealPlans = useLiveQuery(
    () =>
      db.mealPlans
        .where("date")
        .anyOf(weekDateStrings)
        .toArray(),
    [weekOffset]
  )

  const settings = useLiveQuery(() => db.settings.get("user-settings"))

  const getPlanForDate = (date: string): MealPlan | undefined => {
    return mealPlans?.find((p) => p.date === date)
  }

  const selectedPlan = getPlanForDate(selectedDate)

  const getMealsForType = (mealType: MealType): PlannedMeal[] => {
    if (!selectedPlan) return []
    return selectedPlan.meals.filter((m) => m.mealType === mealType)
  }

  const handleAddMeal = (mealType: MealType) => {
    setSelectedMealType(mealType)
    setShowAddModal(true)
  }

  const handleRemoveMeal = async (mealId: string) => {
    await removePlannedMeal(selectedDate, mealId)
  }

  const handleMarkAsEaten = async (mealId: string) => {
    await markMealAsEaten(selectedDate, mealId)
  }

  const goToPreviousWeek = () => setWeekOffset((o) => o - 1)
  const goToNextWeek = () => setWeekOffset((o) => o + 1)
  const goToCurrentWeek = () => {
    setWeekOffset(0)
    setSelectedDate(new Date().toISOString().split("T")[0])
  }

  const weekLabel = (() => {
    const start = weekDates[0]
    const end = weekDates[6]
    const startMonth = start.toLocaleDateString("en-US", { month: "short" })
    const endMonth = end.toLocaleDateString("en-US", { month: "short" })

    if (startMonth === endMonth) {
      return `${startMonth} ${start.getDate()} - ${end.getDate()}`
    }
    return `${startMonth} ${start.getDate()} - ${endMonth} ${end.getDate()}`
  })()

  const calorieTarget = settings
    ? (settings.goals.caloriesMin + settings.goals.caloriesMax) / 2
    : 1400

  return (
    <div className="p-4 space-y-4">
      <header>
        <h1 className="text-2xl font-bold">Meal Plan</h1>
        <p className="text-muted-foreground">Plan your weekly meals</p>
      </header>

      {/* Week Navigation */}
      <div className="flex items-center justify-between">
        <Button variant="ghost" size="icon" onClick={goToPreviousWeek}>
          <ChevronLeft className="w-5 h-5" />
        </Button>
        <button
          onClick={goToCurrentWeek}
          className="text-sm font-medium hover:text-primary transition-colors"
        >
          {weekLabel}
        </button>
        <Button variant="ghost" size="icon" onClick={goToNextWeek}>
          <ChevronRight className="w-5 h-5" />
        </Button>
      </div>

      {/* Day Selector */}
      <div className="flex gap-1 justify-between">
        {weekDates.map((date, i) => {
          const dateStr = weekDateStrings[i]
          const plan = getPlanForDate(dateStr)
          const isSelected = dateStr === selectedDate
          const isTodayDate = isToday(date)
          const hasPlannedMeals = plan && plan.meals.length > 0

          return (
            <button
              key={dateStr}
              onClick={() => setSelectedDate(dateStr)}
              className={cn(
                "flex-1 py-2 px-1 rounded-lg text-center transition-colors min-w-0",
                isSelected
                  ? "bg-primary text-primary-foreground"
                  : "bg-muted hover:bg-muted/80",
                isTodayDate && !isSelected && "ring-2 ring-primary"
              )}
            >
              <p className="text-xs">{formatDayShort(date)}</p>
              <p className="text-lg font-bold">{formatDayNumber(date)}</p>
              {hasPlannedMeals && (
                <div
                  className={cn(
                    "w-1.5 h-1.5 rounded-full mx-auto mt-1",
                    isSelected ? "bg-primary-foreground" : "bg-primary"
                  )}
                />
              )}
            </button>
          )
        })}
      </div>

      {/* Daily Summary */}
      {selectedPlan && selectedPlan.meals.length > 0 && (
        <Card>
          <CardContent className="py-3">
            <div className="flex justify-around text-center">
              <div>
                <p className="text-lg font-bold">{selectedPlan.totalCalories}</p>
                <p className="text-xs text-muted-foreground">
                  / {Math.round(calorieTarget)} cal
                </p>
              </div>
              <div>
                <p className="text-lg font-bold">{selectedPlan.totalProtein}g</p>
                <p className="text-xs text-muted-foreground">protein</p>
              </div>
              <div>
                <p className="text-lg font-bold">{selectedPlan.totalFiber}g</p>
                <p className="text-xs text-muted-foreground">fiber</p>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Meal Sections */}
      {mealTypes.map(({ type, label }) => {
        const meals = getMealsForType(type)

        return (
          <Card key={type}>
            <CardHeader className="pb-2">
              <div className="flex justify-between items-center">
                <CardTitle className="text-lg">{label}</CardTitle>
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => handleAddMeal(type)}
                >
                  <Plus className="w-5 h-5" />
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              {meals.length === 0 ? (
                <button
                  onClick={() => handleAddMeal(type)}
                  className="w-full py-4 text-center text-muted-foreground hover:bg-muted rounded-lg transition-colors"
                >
                  + Plan {label.toLowerCase()}
                </button>
              ) : (
                <div className="space-y-2">
                  {meals.map((meal) => (
                    <PlannedMealRow
                      key={meal.id}
                      meal={meal}
                      onMarkAsEaten={() => handleMarkAsEaten(meal.id)}
                      onRemove={() => handleRemoveMeal(meal.id)}
                    />
                  ))}
                  <button
                    onClick={() => handleAddMeal(type)}
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

      <AddToPlanModal
        open={showAddModal}
        onOpenChange={setShowAddModal}
        date={selectedDate}
        defaultMealType={selectedMealType}
      />
    </div>
  )
}

function PlannedMealRow({
  meal,
  onMarkAsEaten,
  onRemove,
}: {
  meal: PlannedMeal
  onMarkAsEaten: () => void
  onRemove: () => void
}) {
  return (
    <div
      className={cn(
        "flex items-center gap-3 p-3 rounded-lg",
        meal.isCompleted ? "bg-primary/10" : "bg-muted"
      )}
    >
      <div className="flex-1 min-w-0">
        <p
          className={cn(
            "font-medium truncate",
            meal.isCompleted && "line-through text-muted-foreground"
          )}
        >
          {meal.itemName}
        </p>
        <p className="text-sm text-muted-foreground">
          {meal.servings} serving{meal.servings !== 1 ? "s" : ""} ·{" "}
          {meal.calories} cal
        </p>
      </div>

      <div className="flex items-center gap-1">
        {!meal.isCompleted && (
          <Button
            variant="ghost"
            size="icon"
            className="h-9 w-9 text-primary"
            onClick={onMarkAsEaten}
            title="Mark as eaten"
          >
            <Check className="w-4 h-4" />
          </Button>
        )}
        <Button
          variant="ghost"
          size="icon"
          className="h-9 w-9 text-muted-foreground hover:text-destructive"
          onClick={onRemove}
          title="Remove"
        >
          <Trash2 className="w-4 h-4" />
        </Button>
      </div>
    </div>
  )
}
