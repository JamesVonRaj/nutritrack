import { db, getOrCreateDailyLog } from "@/db/database"
import type { LogEntry, MealType, Food, Recipe, DailyLog } from "@/types/database"

export interface AddLogEntryInput {
  date: string
  mealType: MealType
  item: Food | Recipe
  itemType: "food" | "recipe"
  servings: number
}

function calculateMacros(item: Food | Recipe, servings: number) {
  if ("caloriesPerServing" in item) {
    // It's a recipe
    return {
      calories: Math.round(item.caloriesPerServing * servings),
      protein: Math.round(item.proteinPerServing * servings * 10) / 10,
      carbs: Math.round(item.carbsPerServing * servings * 10) / 10,
      fat: Math.round(item.fatPerServing * servings * 10) / 10,
      fiber: Math.round(item.fiberPerServing * servings * 10) / 10,
    }
  } else {
    // It's a food
    return {
      calories: Math.round(item.calories * servings),
      protein: Math.round(item.protein * servings * 10) / 10,
      carbs: Math.round(item.carbs * servings * 10) / 10,
      fat: Math.round(item.fat * servings * 10) / 10,
      fiber: Math.round(item.fiber * servings * 10) / 10,
    }
  }
}

function recalculateTotals(entries: LogEntry[]): Pick<DailyLog, "totalCalories" | "totalProtein" | "totalCarbs" | "totalFat" | "totalFiber"> {
  return entries.reduce(
    (totals, entry) => ({
      totalCalories: totals.totalCalories + entry.calories,
      totalProtein: Math.round((totals.totalProtein + entry.protein) * 10) / 10,
      totalCarbs: Math.round((totals.totalCarbs + entry.carbs) * 10) / 10,
      totalFat: Math.round((totals.totalFat + entry.fat) * 10) / 10,
      totalFiber: Math.round((totals.totalFiber + entry.fiber) * 10) / 10,
    }),
    { totalCalories: 0, totalProtein: 0, totalCarbs: 0, totalFat: 0, totalFiber: 0 }
  )
}

export async function addLogEntry(input: AddLogEntryInput): Promise<LogEntry> {
  const dailyLog = await getOrCreateDailyLog(input.date)
  const macros = calculateMacros(input.item, input.servings)

  const entry: LogEntry = {
    id: crypto.randomUUID(),
    timestamp: new Date(),
    mealType: input.mealType,
    itemType: input.itemType,
    itemId: input.item.id,
    itemName: input.item.name,
    servings: input.servings,
    servingSize: "servingSize" in input.item ? input.item.servingSize : 1,
    servingUnit: "servingUnit" in input.item ? input.item.servingUnit : "serving",
    ...macros,
    inventoryDeducted: false,
  }

  const updatedEntries = [...dailyLog.entries, entry]
  const totals = recalculateTotals(updatedEntries)

  await db.dailyLogs.update(dailyLog.id, {
    entries: updatedEntries,
    ...totals,
    updatedAt: new Date(),
  })

  return entry
}

export async function removeLogEntry(date: string, entryId: string): Promise<void> {
  const dailyLog = await getOrCreateDailyLog(date)
  const updatedEntries = dailyLog.entries.filter((e) => e.id !== entryId)
  const totals = recalculateTotals(updatedEntries)

  await db.dailyLogs.update(dailyLog.id, {
    entries: updatedEntries,
    ...totals,
    updatedAt: new Date(),
  })
}

export async function updateLogEntry(
  date: string,
  entryId: string,
  updates: { servings?: number; mealType?: MealType }
): Promise<void> {
  const dailyLog = await getOrCreateDailyLog(date)
  const entryIndex = dailyLog.entries.findIndex((e) => e.id === entryId)

  if (entryIndex === -1) return

  const entry = dailyLog.entries[entryIndex]
  const food = await db.foods.get(entry.itemId)

  if (!food) return

  const newServings = updates.servings ?? entry.servings
  const macros = calculateMacros(food, newServings)

  const updatedEntry: LogEntry = {
    ...entry,
    ...updates,
    ...macros,
  }

  const updatedEntries = [...dailyLog.entries]
  updatedEntries[entryIndex] = updatedEntry
  const totals = recalculateTotals(updatedEntries)

  await db.dailyLogs.update(dailyLog.id, {
    entries: updatedEntries,
    ...totals,
    updatedAt: new Date(),
  })
}

export async function updateWaterIntake(date: string, amount: number): Promise<void> {
  const dailyLog = await getOrCreateDailyLog(date)
  await db.dailyLogs.update(dailyLog.id, {
    waterIntake: amount,
    updatedAt: new Date(),
  })
}
