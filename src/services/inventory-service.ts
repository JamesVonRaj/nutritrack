import { db } from "@/db/database"
import type { InventoryItem, StorageLocation, ServingUnit } from "@/types/database"

export interface AddInventoryItemInput {
  foodId: string
  foodName: string
  quantity: number
  unit: ServingUnit
  location: StorageLocation
  purchaseDate?: Date
  expirationDate?: Date
  lowThreshold?: number
}

export async function addInventoryItem(input: AddInventoryItemInput): Promise<InventoryItem> {
  const now = new Date()

  const item: InventoryItem = {
    id: crypto.randomUUID(),
    foodId: input.foodId,
    foodName: input.foodName,
    quantity: input.quantity,
    unit: input.unit,
    originalQuantity: input.quantity,
    purchaseDate: input.purchaseDate ?? now,
    expirationDate: input.expirationDate,
    location: input.location,
    status: "available",
    lowThreshold: input.lowThreshold,
    createdAt: now,
    updatedAt: now,
  }

  await db.inventory.add(item)
  return item
}

export async function updateInventoryItem(
  id: string,
  updates: Partial<Omit<InventoryItem, "id" | "createdAt">>
): Promise<void> {
  const item = await db.inventory.get(id)
  if (!item) return

  const newQuantity = updates.quantity ?? item.quantity
  let status = item.status

  // Update status based on quantity
  if (newQuantity <= 0) {
    status = "finished"
  } else if (item.lowThreshold && newQuantity <= item.lowThreshold) {
    status = "low"
  } else {
    status = "available"
  }

  // Check expiration
  if (item.expirationDate && new Date() > item.expirationDate) {
    status = "expired"
  }

  await db.inventory.update(id, {
    ...updates,
    status,
    updatedAt: new Date(),
  })
}

export async function deleteInventoryItem(id: string): Promise<void> {
  await db.inventory.delete(id)
}

export async function deductFromInventory(
  id: string,
  amount: number
): Promise<void> {
  const item = await db.inventory.get(id)
  if (!item) return

  const newQuantity = Math.max(0, item.quantity - amount)
  await updateInventoryItem(id, { quantity: newQuantity })
}

export async function getInventoryByLocation(
  location: StorageLocation
): Promise<InventoryItem[]> {
  return db.inventory
    .where("location")
    .equals(location)
    .filter((item) => item.status !== "finished")
    .toArray()
}

export async function getAllInventory(): Promise<InventoryItem[]> {
  return db.inventory
    .filter((item) => item.status !== "finished")
    .toArray()
}

export async function getExpiringItems(daysAhead = 7): Promise<InventoryItem[]> {
  const futureDate = new Date()
  futureDate.setDate(futureDate.getDate() + daysAhead)

  return db.inventory
    .filter((item) => {
      if (!item.expirationDate || item.status === "finished") return false
      return item.expirationDate <= futureDate
    })
    .toArray()
}

export async function getLowStockItems(): Promise<InventoryItem[]> {
  return db.inventory.where("status").equals("low").toArray()
}

export async function getInventoryForFood(foodId: string): Promise<InventoryItem | undefined> {
  return db.inventory
    .where("foodId")
    .equals(foodId)
    .filter((item) => item.status !== "finished")
    .first()
}

export function getStatusColor(status: InventoryItem["status"]): string {
  switch (status) {
    case "available":
      return "text-primary"
    case "low":
      return "text-yellow-600"
    case "expired":
      return "text-destructive"
    case "finished":
      return "text-muted-foreground"
    default:
      return "text-foreground"
  }
}

export function formatExpirationDate(date: Date): string {
  const now = new Date()
  const diff = date.getTime() - now.getTime()
  const days = Math.ceil(diff / (1000 * 60 * 60 * 24))

  if (days < 0) {
    return `Expired ${Math.abs(days)} day${Math.abs(days) !== 1 ? "s" : ""} ago`
  } else if (days === 0) {
    return "Expires today"
  } else if (days === 1) {
    return "Expires tomorrow"
  } else if (days <= 7) {
    return `Expires in ${days} days`
  } else {
    return `Expires ${date.toLocaleDateString()}`
  }
}
