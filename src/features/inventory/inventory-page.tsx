import { useState } from "react"
import { useLiveQuery } from "dexie-react-hooks"
import { Plus, Package, Trash2, Minus, AlertTriangle } from "lucide-react"
import { db } from "@/db/database"
import {
  deleteInventoryItem,
  deductFromInventory,
  formatExpirationDate,
  getStatusColor,
} from "@/services/inventory-service"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { AddInventoryModal } from "@/components/common/add-inventory-modal"
import type { InventoryItem, StorageLocation } from "@/types/database"

const locationConfig: {
  key: StorageLocation
  label: string
  icon: string
}[] = [
  { key: "fridge", label: "Fridge", icon: "🧊" },
  { key: "freezer", label: "Freezer", icon: "❄️" },
  { key: "pantry", label: "Pantry", icon: "🏠" },
  { key: "other", label: "Other", icon: "📦" },
]

export function InventoryPage() {
  const [showAddModal, setShowAddModal] = useState(false)
  const [activeLocation, setActiveLocation] = useState<StorageLocation | "all">("all")

  const inventory = useLiveQuery(() =>
    db.inventory.filter((item) => item.status !== "finished").toArray()
  )

  const expiringItems = useLiveQuery(() => {
    const futureDate = new Date()
    futureDate.setDate(futureDate.getDate() + 7)
    return db.inventory
      .filter((item) => {
        if (!item.expirationDate || item.status === "finished") return false
        return new Date(item.expirationDate) <= futureDate
      })
      .toArray()
  })

  const getItemsForLocation = (location: StorageLocation): InventoryItem[] => {
    if (!inventory) return []
    return inventory.filter((item) => item.location === location)
  }

  const getFilteredItems = (): InventoryItem[] => {
    if (!inventory) return []
    if (activeLocation === "all") return inventory
    return inventory.filter((item) => item.location === activeLocation)
  }

  const handleDelete = async (id: string) => {
    await deleteInventoryItem(id)
  }

  const handleDeduct = async (item: InventoryItem) => {
    const deductAmount = item.unit === "piece" ? 1 : item.quantity * 0.1
    await deductFromInventory(item.id, deductAmount)
  }

  const totalItems = inventory?.length ?? 0

  return (
    <div className="p-4 space-y-4">
      <header className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold">Pantry</h1>
          <p className="text-muted-foreground">
            {totalItems} item{totalItems !== 1 ? "s" : ""} on hand
          </p>
        </div>
        <Button
          size="icon-lg"
          className="rounded-full"
          onClick={() => setShowAddModal(true)}
        >
          <Plus className="w-6 h-6" />
        </Button>
      </header>

      {/* Expiring Soon Alert */}
      {expiringItems && expiringItems.length > 0 && (
        <Card className="border-yellow-500/50 bg-yellow-500/10">
          <CardContent className="py-3">
            <div className="flex items-center gap-2 text-yellow-700">
              <AlertTriangle className="w-5 h-5 shrink-0" />
              <div>
                <p className="font-medium">
                  {expiringItems.length} item{expiringItems.length !== 1 ? "s" : ""} expiring soon
                </p>
                <p className="text-sm opacity-80">
                  {expiringItems.slice(0, 2).map((i) => i.foodName).join(", ")}
                  {expiringItems.length > 2 && ` and ${expiringItems.length - 2} more`}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Location Filter */}
      <div className="flex gap-2 overflow-x-auto pb-2">
        <Button
          variant={activeLocation === "all" ? "default" : "outline"}
          size="sm"
          onClick={() => setActiveLocation("all")}
        >
          All
        </Button>
        {locationConfig.map(({ key, label, icon }) => {
          const count = getItemsForLocation(key).length
          return (
            <Button
              key={key}
              variant={activeLocation === key ? "default" : "outline"}
              size="sm"
              onClick={() => setActiveLocation(key)}
            >
              {icon} {label} ({count})
            </Button>
          )
        })}
      </div>

      {/* Inventory List */}
      {!inventory || inventory.length === 0 ? (
        <Card>
          <CardContent className="py-12">
            <div className="text-center space-y-4">
              <Package className="w-12 h-12 mx-auto text-muted-foreground" />
              <div>
                <p className="font-medium">No items in pantry</p>
                <p className="text-sm text-muted-foreground mt-1">
                  Add groceries to track what you have on hand
                </p>
              </div>
              <Button onClick={() => setShowAddModal(true)}>
                Add First Item
              </Button>
            </div>
          </CardContent>
        </Card>
      ) : activeLocation === "all" ? (
        // Show by location when "All" is selected
        locationConfig.map(({ key, label, icon }) => {
          const items = getItemsForLocation(key)
          if (items.length === 0) return null

          return (
            <Card key={key}>
              <CardHeader className="pb-2">
                <CardTitle className="text-lg flex items-center gap-2">
                  <span>{icon}</span>
                  {label}
                  <span className="text-sm font-normal text-muted-foreground">
                    ({items.length})
                  </span>
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  {items.map((item) => (
                    <InventoryItemRow
                      key={item.id}
                      item={item}
                      onDeduct={() => handleDeduct(item)}
                      onDelete={() => handleDelete(item.id)}
                    />
                  ))}
                </div>
              </CardContent>
            </Card>
          )
        })
      ) : (
        // Show flat list for specific location
        <Card>
          <CardContent className="py-4">
            {getFilteredItems().length === 0 ? (
              <p className="text-center text-muted-foreground py-4">
                No items in this location
              </p>
            ) : (
              <div className="space-y-2">
                {getFilteredItems().map((item) => (
                  <InventoryItemRow
                    key={item.id}
                    item={item}
                    onDeduct={() => handleDeduct(item)}
                    onDelete={() => handleDelete(item.id)}
                  />
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      )}

      <AddInventoryModal
        open={showAddModal}
        onOpenChange={setShowAddModal}
      />
    </div>
  )
}

function InventoryItemRow({
  item,
  onDeduct,
  onDelete,
}: {
  item: InventoryItem
  onDeduct: () => void
  onDelete: () => void
}) {
  const isExpired = item.expirationDate && new Date(item.expirationDate) < new Date()
  const isExpiringSoon = item.expirationDate && !isExpired && (() => {
    const daysUntilExpiration = Math.ceil(
      (new Date(item.expirationDate).getTime() - new Date().getTime()) / (1000 * 60 * 60 * 24)
    )
    return daysUntilExpiration <= 7
  })()

  return (
    <div className="flex items-center gap-3 p-3 bg-muted rounded-lg">
      <div className="flex-1 min-w-0">
        <p className="font-medium truncate">{item.foodName}</p>
        <div className="flex items-center gap-2 text-sm">
          <span className={getStatusColor(item.status)}>
            {item.quantity} {item.unit}
          </span>
          {item.expirationDate && (
            <span
              className={
                isExpired
                  ? "text-destructive"
                  : isExpiringSoon
                  ? "text-yellow-600"
                  : "text-muted-foreground"
              }
            >
              • {formatExpirationDate(new Date(item.expirationDate))}
            </span>
          )}
        </div>
      </div>

      <div className="flex items-center gap-1">
        <Button
          variant="ghost"
          size="icon"
          className="h-9 w-9"
          onClick={onDeduct}
          title="Use some"
        >
          <Minus className="w-4 h-4" />
        </Button>
        <Button
          variant="ghost"
          size="icon"
          className="h-9 w-9 text-muted-foreground hover:text-destructive"
          onClick={onDelete}
          title="Remove"
        >
          <Trash2 className="w-4 h-4" />
        </Button>
      </div>
    </div>
  )
}
