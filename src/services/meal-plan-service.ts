import { db } from "@/db/database"
import { addLogEntry } from "@/services/daily-log-service"
import type { MealPlan, PlannedMeal, MealType, Food, Recipe } from "@/types/database"

export async function getOrCreateMealPlan(date: string): Promise<MealPlan> {
  const existing = await db.mealPlans.where("date").equals(date).first()
  if (existing) return existing

  const newPlan: MealPlan = {
    id: `plan-${date}`,
    date,
    meals: [],
    totalCalories: 0,
    totalProtein: 0,
    totalCarbs: 0,
    totalFat: 0,
    totalFiber: 0,
    createdAt: new Date(),
    updatedAt: new Date(),
  }

  await db.mealPlans.add(newPlan)
  return newPlan
}

export async function getMealPlansForWeek(startDate: Date): Promise<Map<string, MealPlan>> {
  const plans = new Map<string, MealPlan>()

  for (let i = 0; i < 7; i++) {
    const date = new Date(startDate)
    date.setDate(date.getDate() + i)
    const dateStr = date.toISOString().split("T")[0]
    const plan = await getOrCreateMealPlan(dateStr)
    plans.set(dateStr, plan)
  }

  return plans
}

function calculateMacros(item: Food | Recipe, servings: number) {
  if ("caloriesPerServing" in item) {
    return {
      calories: Math.round(item.caloriesPerServing * servings),
      protein: Math.round(item.proteinPerServing * servings * 10) / 10,
      carbs: Math.round(item.carbsPerServing * servings * 10) / 10,
      fat: Math.round(item.fatPerServing * servings * 10) / 10,
      fiber: Math.round(item.fiberPerServing * servings * 10) / 10,
    }
  }
  return {
    calories: Math.round(item.calories * servings),
    protein: Math.round(item.protein * servings * 10) / 10,
    carbs: Math.round(item.carbs * servings * 10) / 10,
    fat: Math.round(item.fat * servings * 10) / 10,
    fiber: Math.round(item.fiber * servings * 10) / 10,
  }
}

function recalculateTotals(meals: PlannedMeal[]): Pick<MealPlan, "totalCalories" | "totalProtein" | "totalCarbs" | "totalFat" | "totalFiber"> {
  return meals.reduce(
    (totals, meal) => ({
      totalCalories: totals.totalCalories + meal.calories,
      totalProtein: Math.round((totals.totalProtein + meal.protein) * 10) / 10,
      totalCarbs: Math.round((totals.totalCarbs + meal.carbs) * 10) / 10,
      totalFat: Math.round((totals.totalFat + meal.fat) * 10) / 10,
      totalFiber: Math.round((totals.totalFiber + meal.fiber) * 10) / 10,
    }),
    { totalCalories: 0, totalProtein: 0, totalCarbs: 0, totalFat: 0, totalFiber: 0 }
  )
}

export interface AddPlannedMealInput {
  date: string
  mealType: MealType
  item: Food | Recipe
  itemType: "food" | "recipe"
  servings: number
}

export async function addPlannedMeal(input: AddPlannedMealInput): Promise<PlannedMeal> {
  const plan = await getOrCreateMealPlan(input.date)
  const macros = calculateMacros(input.item, input.servings)

  const meal: PlannedMeal = {
    id: crypto.randomUUID(),
    mealType: input.mealType,
    itemType: input.itemType,
    itemId: input.item.id,
    itemName: input.item.name,
    servings: input.servings,
    ...macros,
    isCompleted: false,
  }

  const updatedMeals = [...plan.meals, meal]
  const totals = recalculateTotals(updatedMeals)

  await db.mealPlans.update(plan.id, {
    meals: updatedMeals,
    ...totals,
    updatedAt: new Date(),
  })

  return meal
}

export async function removePlannedMeal(date: string, mealId: string): Promise<void> {
  const plan = await getOrCreateMealPlan(date)
  const updatedMeals = plan.meals.filter((m) => m.id !== mealId)
  const totals = recalculateTotals(updatedMeals)

  await db.mealPlans.update(plan.id, {
    meals: updatedMeals,
    ...totals,
    updatedAt: new Date(),
  })
}

export async function markMealAsEaten(date: string, mealId: string): Promise<void> {
  const plan = await getOrCreateMealPlan(date)
  const mealIndex = plan.meals.findIndex((m) => m.id === mealId)

  if (mealIndex === -1) return

  const meal = plan.meals[mealIndex]

  // Get the food from database
  const food = await db.foods.get(meal.itemId)
  if (!food) return

  // Add to daily log
  await addLogEntry({
    date,
    mealType: meal.mealType,
    item: food,
    itemType: "food",
    servings: meal.servings,
  })

  // Mark as completed in plan
  const updatedMeals = [...plan.meals]
  updatedMeals[mealIndex] = { ...meal, isCompleted: true }

  await db.mealPlans.update(plan.id, {
    meals: updatedMeals,
    updatedAt: new Date(),
  })
}

export function getWeekDates(referenceDate: Date = new Date()): Date[] {
  const dates: Date[] = []
  const startOfWeek = new Date(referenceDate)
  const day = startOfWeek.getDay()
  startOfWeek.setDate(startOfWeek.getDate() - day) // Start from Sunday

  for (let i = 0; i < 7; i++) {
    const date = new Date(startOfWeek)
    date.setDate(date.getDate() + i)
    dates.push(date)
  }

  return dates
}

export function formatDayShort(date: Date): string {
  return date.toLocaleDateString("en-US", { weekday: "short" })
}

export function formatDayNumber(date: Date): string {
  return date.getDate().toString()
}

export function isToday(date: Date): boolean {
  const today = new Date()
  return (
    date.getDate() === today.getDate() &&
    date.getMonth() === today.getMonth() &&
    date.getFullYear() === today.getFullYear()
  )
}

export function isSameDay(date1: Date, date2: Date): boolean {
  return (
    date1.getDate() === date2.getDate() &&
    date1.getMonth() === date2.getMonth() &&
    date1.getFullYear() === date2.getFullYear()
  )
}
