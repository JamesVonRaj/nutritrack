import {
  collection,
  doc,
  setDoc,
  getDocs,
  deleteDoc,
  writeBatch,
  query,
  onSnapshot,
  type Unsubscribe,
} from "firebase/firestore"
import { firestore } from "@/lib/firebase"
import { db } from "@/db/database"
import type { Food, DailyLog, MealPlan, InventoryItem, Recipe, UserSettings } from "@/types/database"

let syncListeners: Unsubscribe[] = []
let currentUserId: string | null = null

function getUserCollection(userId: string, collectionName: string) {
  return collection(firestore, "users", userId, collectionName)
}

function serializeForFirestore<T>(data: T): Record<string, unknown> {
  const serialized: Record<string, unknown> = {}
  for (const [key, value] of Object.entries(data as Record<string, unknown>)) {
    if (value instanceof Date) {
      serialized[key] = value.toISOString()
    } else if (Array.isArray(value)) {
      serialized[key] = value.map(item =>
        item instanceof Date ? item.toISOString() :
        typeof item === 'object' && item !== null ? serializeForFirestore(item) : item
      )
    } else if (typeof value === 'object' && value !== null) {
      serialized[key] = serializeForFirestore(value)
    } else {
      serialized[key] = value
    }
  }
  return serialized
}

function deserializeFromFirestore<T>(data: Record<string, unknown>): T {
  const deserialized: Record<string, unknown> = {}
  for (const [key, value] of Object.entries(data)) {
    if (typeof value === 'string' && /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}/.test(value)) {
      deserialized[key] = new Date(value)
    } else if (Array.isArray(value)) {
      deserialized[key] = value.map(item => {
        if (typeof item === 'string' && /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}/.test(item)) {
          return new Date(item)
        }
        if (typeof item === 'object' && item !== null) {
          return deserializeFromFirestore(item as Record<string, unknown>)
        }
        return item
      })
    } else if (typeof value === 'object' && value !== null) {
      deserialized[key] = deserializeFromFirestore(value as Record<string, unknown>)
    } else {
      deserialized[key] = value
    }
  }
  return deserialized as T
}

export async function uploadAllData(userId: string): Promise<void> {
  const batch = writeBatch(firestore)

  // Upload foods
  const foods = await db.foods.toArray()
  for (const food of foods) {
    const docRef = doc(getUserCollection(userId, "foods"), food.id)
    batch.set(docRef, serializeForFirestore(food))
  }

  // Upload daily logs
  const dailyLogs = await db.dailyLogs.toArray()
  for (const log of dailyLogs) {
    const docRef = doc(getUserCollection(userId, "dailyLogs"), log.id)
    batch.set(docRef, serializeForFirestore(log))
  }

  // Upload meal plans
  const mealPlans = await db.mealPlans.toArray()
  for (const plan of mealPlans) {
    const docRef = doc(getUserCollection(userId, "mealPlans"), plan.id)
    batch.set(docRef, serializeForFirestore(plan))
  }

  // Upload inventory
  const inventory = await db.inventory.toArray()
  for (const item of inventory) {
    const docRef = doc(getUserCollection(userId, "inventory"), item.id)
    batch.set(docRef, serializeForFirestore(item))
  }

  // Upload recipes
  const recipes = await db.recipes.toArray()
  for (const recipe of recipes) {
    const docRef = doc(getUserCollection(userId, "recipes"), recipe.id)
    batch.set(docRef, serializeForFirestore(recipe))
  }

  // Upload settings (excluding sensitive data like API keys which stay local)
  const settings = await db.settings.get("user-settings")
  if (settings) {
    const settingsToSync = {
      ...settings,
      // Don't sync API keys - keep them local to each device
      usdaApiKey: undefined,
      aiConfig: undefined,
    }
    const docRef = doc(getUserCollection(userId, "settings"), settings.id)
    batch.set(docRef, serializeForFirestore(settingsToSync))
  }

  await batch.commit()
}

export async function downloadAllData(userId: string): Promise<void> {
  // Download foods
  const foodsSnapshot = await getDocs(getUserCollection(userId, "foods"))
  for (const docSnap of foodsSnapshot.docs) {
    const food = deserializeFromFirestore<Food>(docSnap.data())
    await db.foods.put(food)
  }

  // Download daily logs
  const logsSnapshot = await getDocs(getUserCollection(userId, "dailyLogs"))
  for (const docSnap of logsSnapshot.docs) {
    const log = deserializeFromFirestore<DailyLog>(docSnap.data())
    await db.dailyLogs.put(log)
  }

  // Download meal plans
  const plansSnapshot = await getDocs(getUserCollection(userId, "mealPlans"))
  for (const docSnap of plansSnapshot.docs) {
    const plan = deserializeFromFirestore<MealPlan>(docSnap.data())
    await db.mealPlans.put(plan)
  }

  // Download inventory
  const inventorySnapshot = await getDocs(getUserCollection(userId, "inventory"))
  for (const docSnap of inventorySnapshot.docs) {
    const item = deserializeFromFirestore<InventoryItem>(docSnap.data())
    await db.inventory.put(item)
  }

  // Download recipes
  const recipesSnapshot = await getDocs(getUserCollection(userId, "recipes"))
  for (const docSnap of recipesSnapshot.docs) {
    const recipe = deserializeFromFirestore<Recipe>(docSnap.data())
    await db.recipes.put(recipe)
  }

  // Download settings (merge with local, keeping API keys)
  const settingsSnapshot = await getDocs(getUserCollection(userId, "settings"))
  if (!settingsSnapshot.empty) {
    const remoteSettings = deserializeFromFirestore<UserSettings>(settingsSnapshot.docs[0].data())
    const localSettings = await db.settings.get("user-settings")
    if (localSettings) {
      // Merge: keep local API keys, take remote goals/preferences
      await db.settings.put({
        ...remoteSettings,
        usdaApiKey: localSettings.usdaApiKey,
        aiConfig: localSettings.aiConfig,
      })
    }
  }
}

async function syncDocToFirestore(
  userId: string,
  collectionName: string,
  docId: string,
  data: unknown
): Promise<void> {
  const docRef = doc(getUserCollection(userId, collectionName), docId)
  await setDoc(docRef, serializeForFirestore(data))
}

async function deleteDocFromFirestore(
  userId: string,
  collectionName: string,
  docId: string
): Promise<void> {
  const docRef = doc(getUserCollection(userId, collectionName), docId)
  await deleteDoc(docRef)
}

export function startRealtimeSync(userId: string): void {
  if (currentUserId === userId) return // Already syncing

  stopRealtimeSync() // Stop any existing sync
  currentUserId = userId

  // Set up Dexie hooks to sync changes to Firestore
  const tables = [
    { table: db.foods, name: "foods" },
    { table: db.dailyLogs, name: "dailyLogs" },
    { table: db.mealPlans, name: "mealPlans" },
    { table: db.inventory, name: "inventory" },
    { table: db.recipes, name: "recipes" },
  ]

  for (const { table, name } of tables) {
    // Hook into creates and updates
    table.hook("creating", function (primKey, obj) {
      syncDocToFirestore(userId, name, primKey as string, obj).catch(console.error)
    })

    table.hook("updating", function (modifications, primKey, obj) {
      const updated = { ...obj, ...modifications }
      syncDocToFirestore(userId, name, primKey as string, updated).catch(console.error)
    })

    table.hook("deleting", function (primKey) {
      deleteDocFromFirestore(userId, name, primKey as string).catch(console.error)
    })
  }

  // Listen for remote changes and sync to local
  for (const { name } of tables) {
    const unsub = onSnapshot(
      query(getUserCollection(userId, name)),
      (snapshot) => {
        snapshot.docChanges().forEach(async (change) => {
          const data = deserializeFromFirestore(change.doc.data())
          const id = change.doc.id

          if (change.type === "added" || change.type === "modified") {
            // @ts-expect-error - dynamic table access
            const localDoc = await db[name].get(id)
            const remoteUpdatedAt = (data as { updatedAt?: Date }).updatedAt
            const localUpdatedAt = (localDoc as { updatedAt?: Date } | undefined)?.updatedAt
            // Only update if remote is newer or doesn't exist locally
            if (!localDoc || (remoteUpdatedAt && localUpdatedAt && remoteUpdatedAt > localUpdatedAt) || (remoteUpdatedAt && !localUpdatedAt)) {
              // @ts-expect-error - dynamic table access
              await db[name].put(data)
            }
          } else if (change.type === "removed") {
            // @ts-expect-error - dynamic table access
            await db[name].delete(id)
          }
        })
      },
      (error) => {
        console.error(`Sync error for ${name}:`, error)
      }
    )
    syncListeners.push(unsub)
  }
}

export function stopRealtimeSync(): void {
  for (const unsub of syncListeners) {
    unsub()
  }
  syncListeners = []
  currentUserId = null
}

export function isSyncing(): boolean {
  return currentUserId !== null
}
