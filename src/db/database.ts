import Dexie, { type Table } from 'dexie'
import type {
  Food,
  Recipe,
  InventoryItem,
  MealPlan,
  DailyLog,
  UserSettings,
  USDASearchCache,
} from '@/types/database'

export class NutriTrackDB extends Dexie {
  foods!: Table<Food>
  recipes!: Table<Recipe>
  inventory!: Table<InventoryItem>
  mealPlans!: Table<MealPlan>
  dailyLogs!: Table<DailyLog>
  settings!: Table<UserSettings>
  usdaSearchCache!: Table<USDASearchCache>

  constructor() {
    super('NutriTrackDB')

    this.version(1).stores({
      foods: 'id, name, source, usdaFdcId, barcode, category, isFavorite, createdAt',
      recipes: 'id, name, category, isFavorite, createdAt',
      inventory: 'id, foodId, status, location, expirationDate, updatedAt',
      mealPlans: 'id, date',
      dailyLogs: 'id, date',
      settings: 'id',
      usdaSearchCache: 'id, query, expiresAt',
    })
  }
}

export const db = new NutriTrackDB()

export async function initializeSettings(): Promise<UserSettings> {
  const existing = await db.settings.get('user-settings')
  if (existing) return existing

  const defaultSettings: UserSettings = {
    id: 'user-settings',
    weightUnit: 'lb',
    volumeUnit: 'oz',
    goals: {
      caloriesMin: 1350,
      caloriesMax: 1450,
      proteinMin: 50,
      proteinMax: 65,
      fiber: 20,
      water: 2000,
    },
    theme: 'system',
    createdAt: new Date(),
    updatedAt: new Date(),
  }

  await db.settings.add(defaultSettings)
  return defaultSettings
}

export async function getOrCreateDailyLog(date: string): Promise<DailyLog> {
  const existing = await db.dailyLogs.where('date').equals(date).first()
  if (existing) return existing

  const newLog: DailyLog = {
    id: `log-${date}`,
    date,
    entries: [],
    totalCalories: 0,
    totalProtein: 0,
    totalCarbs: 0,
    totalFat: 0,
    totalFiber: 0,
    waterIntake: 0,
    createdAt: new Date(),
    updatedAt: new Date(),
  }

  await db.dailyLogs.add(newLog)
  return newLog
}
