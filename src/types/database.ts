export type ServingUnit =
  | 'g' | 'mg' | 'kg'
  | 'ml' | 'l'
  | 'oz' | 'lb'
  | 'cup' | 'tbsp' | 'tsp'
  | 'piece' | 'slice' | 'serving'

export type FoodCategory =
  | 'protein' | 'dairy' | 'grains' | 'vegetables'
  | 'fruits' | 'fats' | 'beverages' | 'snacks' | 'other'

export type FoodSource = 'usda' | 'custom' | 'recipe'

export type StorageLocation = 'fridge' | 'freezer' | 'pantry' | 'other'

export type MealType = 'breakfast' | 'lunch' | 'dinner' | 'snack'

export type InventoryStatus = 'available' | 'low' | 'expired' | 'finished'

export interface Macros {
  calories: number
  protein: number
  carbs: number
  fat: number
  fiber: number
}

export interface Food {
  id: string
  name: string
  brand?: string
  source: FoodSource
  usdaFdcId?: number

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

  barcode?: string
  category?: FoodCategory
  tags: string[]
  isFavorite: boolean

  createdAt: Date
  updatedAt: Date
}

export interface RecipeIngredient {
  foodId: string
  foodName: string
  quantity: number
  unit: ServingUnit
  notes?: string
}

export interface Recipe {
  id: string
  name: string
  description?: string

  ingredients: RecipeIngredient[]

  servings: number
  caloriesPerServing: number
  proteinPerServing: number
  carbsPerServing: number
  fatPerServing: number
  fiberPerServing: number

  prepTime?: number
  cookTime?: number
  instructions: string[]
  notes?: string

  tags: string[]
  category?: MealType
  isFavorite: boolean

  createdAt: Date
  updatedAt: Date
}

export interface InventoryItem {
  id: string
  foodId: string
  foodName: string

  quantity: number
  unit: ServingUnit
  originalQuantity: number

  purchaseDate: Date
  expirationDate?: Date

  location: StorageLocation
  status: InventoryStatus
  lowThreshold?: number

  createdAt: Date
  updatedAt: Date
}

export interface LogEntry {
  id: string
  timestamp: Date
  mealType: MealType

  itemType: 'food' | 'recipe'
  itemId: string
  itemName: string

  servings: number
  servingSize: number
  servingUnit: ServingUnit

  calories: number
  protein: number
  carbs: number
  fat: number
  fiber: number

  inventoryItemId?: string
  inventoryDeducted: boolean
}

export interface DailyLog {
  id: string
  date: string

  entries: LogEntry[]

  totalCalories: number
  totalProtein: number
  totalCarbs: number
  totalFat: number
  totalFiber: number

  waterIntake: number

  notes?: string

  createdAt: Date
  updatedAt: Date
}

export interface PlannedMeal {
  id: string
  mealType: MealType

  itemType: 'food' | 'recipe'
  itemId: string
  itemName: string

  servings: number

  calories: number
  protein: number
  carbs: number
  fat: number
  fiber: number

  isCompleted: boolean
  notes?: string
}

export interface MealPlan {
  id: string
  date: string

  meals: PlannedMeal[]

  totalCalories: number
  totalProtein: number
  totalCarbs: number
  totalFat: number
  totalFiber: number

  notes?: string

  createdAt: Date
  updatedAt: Date
}

export interface NutritionGoals {
  caloriesMin: number
  caloriesMax: number
  proteinMin: number
  proteinMax: number
  fiber: number
  water: number
}

export type AIProvider = 'openai' | 'anthropic' | 'gemini' | 'ollama'

export interface AIConfig {
  provider: AIProvider
  apiKey?: string
  ollamaUrl?: string
  model?: string
}

export interface UserSettings {
  id: string

  name?: string

  weightUnit: 'kg' | 'lb'
  volumeUnit: 'ml' | 'oz'

  goals: NutritionGoals

  theme: 'light' | 'dark' | 'system'

  usdaApiKey?: string
  aiConfig?: AIConfig

  createdAt: Date
  updatedAt: Date
}

export interface USDASearchCache {
  id: string
  query: string
  results: Food[]
  expiresAt: number
}
