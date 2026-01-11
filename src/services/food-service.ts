import { db } from "@/db/database"
import type { Food, FoodSource, ServingUnit, FoodCategory } from "@/types/database"

export interface CreateFoodInput {
  name: string
  brand?: string
  source?: FoodSource
  servingSize: number
  servingUnit: ServingUnit
  servingSizeGrams: number
  calories: number
  protein: number
  carbs: number
  fat: number
  fiber: number
  sodium?: number
  sugar?: number
  category?: FoodCategory
  tags?: string[]
}

export async function createFood(input: CreateFoodInput): Promise<Food> {
  const food: Food = {
    id: crypto.randomUUID(),
    name: input.name,
    brand: input.brand,
    source: input.source ?? "custom",
    servingSize: input.servingSize,
    servingUnit: input.servingUnit,
    servingSizeGrams: input.servingSizeGrams,
    calories: input.calories,
    protein: input.protein,
    carbs: input.carbs,
    fat: input.fat,
    fiber: input.fiber,
    sodium: input.sodium,
    sugar: input.sugar,
    category: input.category,
    tags: input.tags ?? [],
    isFavorite: false,
    createdAt: new Date(),
    updatedAt: new Date(),
  }

  await db.foods.add(food)
  return food
}

export async function updateFood(id: string, updates: Partial<Food>): Promise<void> {
  await db.foods.update(id, {
    ...updates,
    updatedAt: new Date(),
  })
}

export async function deleteFood(id: string): Promise<void> {
  await db.foods.delete(id)
}

export async function toggleFavorite(id: string): Promise<void> {
  const food = await db.foods.get(id)
  if (food) {
    await db.foods.update(id, {
      isFavorite: !food.isFavorite,
      updatedAt: new Date(),
    })
  }
}

export async function searchFoods(query: string): Promise<Food[]> {
  const lowerQuery = query.toLowerCase()
  return db.foods
    .filter((food) => food.name.toLowerCase().includes(lowerQuery))
    .toArray()
}

export async function getFavoriteFoods(): Promise<Food[]> {
  return db.foods.where("isFavorite").equals(1).toArray()
}

export async function getRecentFoods(limit = 10): Promise<Food[]> {
  return db.foods.orderBy("createdAt").reverse().limit(limit).toArray()
}

export async function getAllFoods(): Promise<Food[]> {
  return db.foods.orderBy("name").toArray()
}
