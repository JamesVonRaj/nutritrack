import { db } from "@/db/database"
import type { Food } from "@/types/database"

const USDA_API_BASE = "https://api.nal.usda.gov/fdc/v1"

// USDA nutrient IDs
const NUTRIENT_IDS = {
  ENERGY: 1008,        // Calories (kcal)
  PROTEIN: 1003,       // Protein (g)
  FAT: 1004,           // Total Fat (g)
  CARBS: 1005,         // Carbohydrates (g)
  FIBER: 1079,         // Dietary Fiber (g)
  SUGAR: 2000,         // Total Sugars (g)
  SODIUM: 1093,        // Sodium (mg)
}

interface USDANutrient {
  nutrientId: number
  nutrientName: string
  value: number
  unitName: string
}

interface USDAFoodSearchResult {
  fdcId: number
  description: string
  dataType: string
  brandOwner?: string
  brandName?: string
  ingredients?: string
  servingSize?: number
  servingSizeUnit?: string
  foodNutrients: USDANutrient[]
}

interface USDASearchResponse {
  foods: USDAFoodSearchResult[]
  totalHits: number
  currentPage: number
  totalPages: number
}

export interface USDASearchResult {
  fdcId: number
  name: string
  brand?: string
  dataType: string
  calories: number
  protein: number
  carbs: number
  fat: number
  fiber: number
  servingSize: number
  servingUnit: string
}

function extractNutrient(nutrients: USDANutrient[], nutrientId: number): number {
  const nutrient = nutrients.find((n) => n.nutrientId === nutrientId)
  return nutrient?.value ?? 0
}

function mapUSDAToSearchResult(food: USDAFoodSearchResult): USDASearchResult {
  const nutrients = food.foodNutrients

  return {
    fdcId: food.fdcId,
    name: food.description,
    brand: food.brandOwner || food.brandName,
    dataType: food.dataType,
    calories: Math.round(extractNutrient(nutrients, NUTRIENT_IDS.ENERGY)),
    protein: Math.round(extractNutrient(nutrients, NUTRIENT_IDS.PROTEIN) * 10) / 10,
    carbs: Math.round(extractNutrient(nutrients, NUTRIENT_IDS.CARBS) * 10) / 10,
    fat: Math.round(extractNutrient(nutrients, NUTRIENT_IDS.FAT) * 10) / 10,
    fiber: Math.round(extractNutrient(nutrients, NUTRIENT_IDS.FIBER) * 10) / 10,
    servingSize: food.servingSize || 100,
    servingUnit: food.servingSizeUnit?.toLowerCase() || "g",
  }
}

export async function searchUSDAFoods(
  query: string,
  apiKey: string,
  pageSize = 25
): Promise<USDASearchResult[]> {
  if (!apiKey) {
    throw new Error("USDA API key is required")
  }

  // Check cache first
  const cacheKey = `usda-search-${query.toLowerCase()}`
  const cached = await db.usdaSearchCache
    .where("query")
    .equals(query.toLowerCase())
    .first()

  if (cached && cached.expiresAt > Date.now()) {
    // Return cached results mapped to USDASearchResult format
    return cached.results.map((food) => ({
      fdcId: food.usdaFdcId!,
      name: food.name,
      brand: food.brand,
      dataType: "cached",
      calories: food.calories,
      protein: food.protein,
      carbs: food.carbs,
      fat: food.fat,
      fiber: food.fiber,
      servingSize: food.servingSize,
      servingUnit: food.servingUnit,
    }))
  }

  const url = new URL(`${USDA_API_BASE}/foods/search`)
  url.searchParams.set("api_key", apiKey)
  url.searchParams.set("query", query)
  url.searchParams.set("pageSize", String(pageSize))
  // Prioritize common foods over branded
  url.searchParams.set("dataType", "Foundation,SR Legacy,Survey (FNDDS),Branded")

  const response = await fetch(url.toString())

  if (!response.ok) {
    if (response.status === 403) {
      throw new Error("Invalid USDA API key")
    }
    throw new Error(`USDA API error: ${response.status}`)
  }

  const data: USDASearchResponse = await response.json()
  const results = data.foods.map(mapUSDAToSearchResult)

  // Cache results for 7 days
  const foodsForCache: Food[] = results.map((r) => ({
    id: `usda-${r.fdcId}`,
    name: r.name,
    brand: r.brand,
    source: "usda" as const,
    usdaFdcId: r.fdcId,
    servingSize: r.servingSize,
    servingUnit: r.servingUnit as Food["servingUnit"],
    servingSizeGrams: r.servingUnit === "g" ? r.servingSize : 0,
    calories: r.calories,
    protein: r.protein,
    carbs: r.carbs,
    fat: r.fat,
    fiber: r.fiber,
    tags: [],
    isFavorite: false,
    createdAt: new Date(),
    updatedAt: new Date(),
  }))

  await db.usdaSearchCache.put({
    id: cacheKey,
    query: query.toLowerCase(),
    results: foodsForCache,
    expiresAt: Date.now() + 7 * 24 * 60 * 60 * 1000, // 7 days
  })

  return results
}

export function usdaResultToFood(result: USDASearchResult): Food {
  return {
    id: crypto.randomUUID(),
    name: result.name,
    brand: result.brand,
    source: "usda",
    usdaFdcId: result.fdcId,
    servingSize: result.servingSize,
    servingUnit: normalizeServingUnit(result.servingUnit),
    servingSizeGrams: result.servingUnit === "g" ? result.servingSize : 0,
    calories: result.calories,
    protein: result.protein,
    carbs: result.carbs,
    fat: result.fat,
    fiber: result.fiber,
    tags: [],
    isFavorite: false,
    createdAt: new Date(),
    updatedAt: new Date(),
  }
}

function normalizeServingUnit(unit: string): Food["servingUnit"] {
  const normalized = unit.toLowerCase().trim()
  const unitMap: Record<string, Food["servingUnit"]> = {
    g: "g",
    gram: "g",
    grams: "g",
    mg: "mg",
    kg: "kg",
    ml: "ml",
    l: "l",
    oz: "oz",
    ounce: "oz",
    ounces: "oz",
    lb: "lb",
    pound: "lb",
    pounds: "lb",
    cup: "cup",
    cups: "cup",
    tbsp: "tbsp",
    tablespoon: "tbsp",
    tsp: "tsp",
    teaspoon: "tsp",
    piece: "piece",
    pieces: "piece",
    slice: "slice",
    slices: "slice",
    serving: "serving",
    servings: "serving",
  }
  return unitMap[normalized] || "serving"
}

export async function addUSDAFoodToDatabase(result: USDASearchResult): Promise<Food> {
  // Check if we already have this food
  const existing = await db.foods
    .where("usdaFdcId")
    .equals(result.fdcId)
    .first()

  if (existing) {
    // Update the timestamp so it appears in recent
    await db.foods.update(existing.id, { updatedAt: new Date() })
    return existing
  }

  const food = usdaResultToFood(result)
  await db.foods.add(food)
  return food
}
