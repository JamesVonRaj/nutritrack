import { useState, useEffect } from "react"
import { useLiveQuery } from "dexie-react-hooks"
import { Search, Globe, Loader2 } from "lucide-react"
import { db } from "@/db/database"
import { searchFoods } from "@/services/food-service"
import { searchUSDAFoods, addUSDAFoodToDatabase, type USDASearchResult } from "@/services/usda-api"
import { addInventoryItem } from "@/services/inventory-service"
import type { Food, StorageLocation, ServingUnit } from "@/types/database"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogBody,
} from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { Select } from "@/components/ui/select"

interface AddInventoryModalProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  onItemAdded?: () => void
}

type ModalView = "search" | "details"

const locationOptions = [
  { value: "fridge", label: "Fridge" },
  { value: "freezer", label: "Freezer" },
  { value: "pantry", label: "Pantry" },
  { value: "other", label: "Other" },
]

const unitOptions = [
  { value: "g", label: "grams (g)" },
  { value: "kg", label: "kilograms (kg)" },
  { value: "oz", label: "ounces (oz)" },
  { value: "lb", label: "pounds (lb)" },
  { value: "ml", label: "milliliters (ml)" },
  { value: "l", label: "liters (l)" },
  { value: "cup", label: "cups" },
  { value: "piece", label: "pieces" },
  { value: "serving", label: "servings" },
]

export function AddInventoryModal({
  open,
  onOpenChange,
  onItemAdded,
}: AddInventoryModalProps) {
  const [view, setView] = useState<ModalView>("search")
  const [searchQuery, setSearchQuery] = useState("")
  const [localResults, setLocalResults] = useState<Food[]>([])
  const [usdaResults, setUsdaResults] = useState<USDASearchResult[]>([])
  const [isSearchingUSDA, setIsSearchingUSDA] = useState(false)
  const [selectedFood, setSelectedFood] = useState<Food | null>(null)

  // Form state
  const [quantity, setQuantity] = useState("1")
  const [unit, setUnit] = useState<ServingUnit>("piece")
  const [location, setLocation] = useState<StorageLocation>("fridge")
  const [expirationDate, setExpirationDate] = useState("")
  const [isSubmitting, setIsSubmitting] = useState(false)

  const settings = useLiveQuery(() => db.settings.get("user-settings"))
  const hasUSDAKey = !!settings?.usdaApiKey

  const recentFoods = useLiveQuery(() =>
    db.foods.orderBy("createdAt").reverse().limit(10).toArray()
  )

  useEffect(() => {
    if (!open) {
      setView("search")
      setSearchQuery("")
      setLocalResults([])
      setUsdaResults([])
      setSelectedFood(null)
      setQuantity("1")
      setUnit("piece")
      setLocation("fridge")
      setExpirationDate("")
    }
  }, [open])

  useEffect(() => {
    if (searchQuery.length >= 2) {
      searchFoods(searchQuery).then(setLocalResults)

      if (hasUSDAKey && settings?.usdaApiKey) {
        setIsSearchingUSDA(true)
        searchUSDAFoods(searchQuery, settings.usdaApiKey)
          .then((results) => {
            const localNames = new Set(localResults.map((f) => f.name.toLowerCase()))
            const filtered = results.filter((r) => !localNames.has(r.name.toLowerCase()))
            setUsdaResults(filtered.slice(0, 10))
          })
          .catch(() => setUsdaResults([]))
          .finally(() => setIsSearchingUSDA(false))
      }
    } else {
      setLocalResults([])
      setUsdaResults([])
    }
  }, [searchQuery, hasUSDAKey, settings?.usdaApiKey])

  const handleSelectFood = (food: Food) => {
    setSelectedFood(food)
    setUnit(food.servingUnit)
    setView("details")
  }

  const handleSelectUSDAFood = async (result: USDASearchResult) => {
    const food = await addUSDAFoodToDatabase(result)
    setSelectedFood(food)
    setUnit(food.servingUnit)
    setView("details")
  }

  const handleAddItem = async () => {
    if (!selectedFood) return

    setIsSubmitting(true)

    try {
      await addInventoryItem({
        foodId: selectedFood.id,
        foodName: selectedFood.name,
        quantity: parseFloat(quantity) || 1,
        unit,
        location,
        expirationDate: expirationDate ? new Date(expirationDate) : undefined,
      })

      onOpenChange(false)
      onItemAdded?.()
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent onClose={() => onOpenChange(false)}>
        {view === "search" && (
          <>
            <DialogHeader>
              <DialogTitle>Add to Pantry</DialogTitle>
            </DialogHeader>
            <DialogBody className="space-y-4">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground" />
                <Input
                  placeholder="Search for a food..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-10"
                  autoFocus
                />
              </div>

              <div className="max-h-[60vh] overflow-y-auto space-y-4">
                {searchQuery.length >= 2 ? (
                  <>
                    {localResults.length > 0 && (
                      <div>
                        <h3 className="text-xs font-medium text-muted-foreground mb-2 uppercase tracking-wide">
                          Your Foods
                        </h3>
                        <div className="space-y-2">
                          {localResults.map((food) => (
                            <FoodButton
                              key={food.id}
                              name={food.name}
                              detail={food.brand}
                              onClick={() => handleSelectFood(food)}
                            />
                          ))}
                        </div>
                      </div>
                    )}

                    {hasUSDAKey && (
                      <div>
                        <h3 className="text-xs font-medium text-muted-foreground mb-2 uppercase tracking-wide flex items-center gap-1">
                          <Globe className="w-3 h-3" />
                          USDA Database
                          {isSearchingUSDA && (
                            <Loader2 className="w-3 h-3 animate-spin ml-1" />
                          )}
                        </h3>
                        {usdaResults.length > 0 && (
                          <div className="space-y-2">
                            {usdaResults.map((result) => (
                              <FoodButton
                                key={result.fdcId}
                                name={result.name}
                                detail={result.brand}
                                onClick={() => handleSelectUSDAFood(result)}
                              />
                            ))}
                          </div>
                        )}
                      </div>
                    )}

                    {localResults.length === 0 && usdaResults.length === 0 && !isSearchingUSDA && (
                      <p className="text-center text-muted-foreground py-4">
                        No foods found
                      </p>
                    )}
                  </>
                ) : (
                  <>
                    {recentFoods && recentFoods.length > 0 && (
                      <div>
                        <h3 className="text-xs font-medium text-muted-foreground mb-2 uppercase tracking-wide">
                          Recent Foods
                        </h3>
                        <div className="space-y-2">
                          {recentFoods.map((food) => (
                            <FoodButton
                              key={food.id}
                              name={food.name}
                              detail={food.brand}
                              onClick={() => handleSelectFood(food)}
                            />
                          ))}
                        </div>
                      </div>
                    )}
                  </>
                )}
              </div>
            </DialogBody>
          </>
        )}

        {view === "details" && selectedFood && (
          <>
            <DialogHeader>
              <DialogTitle>Item Details</DialogTitle>
            </DialogHeader>
            <DialogBody className="space-y-4">
              <div className="p-4 bg-muted rounded-lg">
                <h3 className="font-medium">{selectedFood.name}</h3>
                {selectedFood.brand && (
                  <p className="text-sm text-muted-foreground">
                    {selectedFood.brand}
                  </p>
                )}
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-sm font-medium mb-2 block">
                    Quantity
                  </label>
                  <Input
                    type="number"
                    step="0.5"
                    min="0.5"
                    value={quantity}
                    onChange={(e) => setQuantity(e.target.value)}
                  />
                </div>
                <div>
                  <label className="text-sm font-medium mb-2 block">Unit</label>
                  <Select
                    value={unit}
                    onChange={(e) => setUnit(e.target.value as ServingUnit)}
                    options={unitOptions}
                  />
                </div>
              </div>

              <div>
                <label className="text-sm font-medium mb-2 block">
                  Storage Location
                </label>
                <Select
                  value={location}
                  onChange={(e) => setLocation(e.target.value as StorageLocation)}
                  options={locationOptions}
                />
              </div>

              <div>
                <label className="text-sm font-medium mb-2 block">
                  Expiration Date (optional)
                </label>
                <Input
                  type="date"
                  value={expirationDate}
                  onChange={(e) => setExpirationDate(e.target.value)}
                  min={new Date().toISOString().split("T")[0]}
                />
              </div>

              <div className="flex gap-3 pt-2">
                <Button
                  variant="outline"
                  className="flex-1"
                  onClick={() => {
                    setSelectedFood(null)
                    setView("search")
                  }}
                >
                  Back
                </Button>
                <Button
                  className="flex-1"
                  onClick={handleAddItem}
                  disabled={isSubmitting}
                >
                  {isSubmitting ? "Adding..." : "Add to Pantry"}
                </Button>
              </div>
            </DialogBody>
          </>
        )}
      </DialogContent>
    </Dialog>
  )
}

function FoodButton({
  name,
  detail,
  onClick,
}: {
  name: string
  detail?: string
  onClick: () => void
}) {
  return (
    <button
      className="w-full p-3 text-left bg-muted hover:bg-muted/80 rounded-lg transition-colors min-h-[48px]"
      onClick={onClick}
    >
      <p className="font-medium truncate">{name}</p>
      {detail && (
        <p className="text-sm text-muted-foreground truncate">{detail}</p>
      )}
    </button>
  )
}
