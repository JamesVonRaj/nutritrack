import { useState, useEffect } from "react"
import { useLiveQuery } from "dexie-react-hooks"
import { Search, Globe, Loader2 } from "lucide-react"
import { db } from "@/db/database"
import { searchFoods } from "@/services/food-service"
import { searchUSDAFoods, addUSDAFoodToDatabase, type USDASearchResult } from "@/services/usda-api"
import { addPlannedMeal } from "@/services/meal-plan-service"
import type { Food, MealType } from "@/types/database"
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

interface AddToPlanModalProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  date: string
  defaultMealType?: MealType
  onMealAdded?: () => void
}

type ModalView = "search" | "details"

const mealTypeOptions = [
  { value: "breakfast", label: "Breakfast" },
  { value: "lunch", label: "Lunch" },
  { value: "dinner", label: "Dinner" },
  { value: "snack", label: "Snack" },
]

export function AddToPlanModal({
  open,
  onOpenChange,
  date,
  defaultMealType = "breakfast",
  onMealAdded,
}: AddToPlanModalProps) {
  const [view, setView] = useState<ModalView>("search")
  const [searchQuery, setSearchQuery] = useState("")
  const [localResults, setLocalResults] = useState<Food[]>([])
  const [usdaResults, setUsdaResults] = useState<USDASearchResult[]>([])
  const [isSearchingUSDA, setIsSearchingUSDA] = useState(false)
  const [selectedFood, setSelectedFood] = useState<Food | null>(null)
  const [servings, setServings] = useState("1")
  const [mealType, setMealType] = useState<MealType>(defaultMealType)
  const [isSubmitting, setIsSubmitting] = useState(false)

  const settings = useLiveQuery(() => db.settings.get("user-settings"))
  const hasUSDAKey = !!settings?.usdaApiKey

  const favorites = useLiveQuery(() =>
    db.foods.filter((f) => f.isFavorite).toArray()
  )

  const recentFoods = useLiveQuery(() =>
    db.foods.orderBy("createdAt").reverse().limit(8).toArray()
  )

  useEffect(() => {
    if (!open) {
      setView("search")
      setSearchQuery("")
      setLocalResults([])
      setUsdaResults([])
      setSelectedFood(null)
      setServings("1")
    }
  }, [open])

  useEffect(() => {
    setMealType(defaultMealType)
  }, [defaultMealType])

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
    setView("details")
  }

  const handleSelectUSDAFood = async (result: USDASearchResult) => {
    const food = await addUSDAFoodToDatabase(result)
    setSelectedFood(food)
    setView("details")
  }

  const handleAddToPlan = async () => {
    if (!selectedFood) return

    setIsSubmitting(true)

    try {
      await addPlannedMeal({
        date,
        mealType,
        item: selectedFood,
        itemType: "food",
        servings: parseFloat(servings) || 1,
      })

      onOpenChange(false)
      onMealAdded?.()
    } finally {
      setIsSubmitting(false)
    }
  }

  const formattedDate = new Date(date + "T00:00:00").toLocaleDateString("en-US", {
    weekday: "long",
    month: "short",
    day: "numeric",
  })

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent onClose={() => onOpenChange(false)}>
        {view === "search" && (
          <>
            <DialogHeader>
              <DialogTitle>Plan Meal</DialogTitle>
              <p className="text-sm text-muted-foreground">{formattedDate}</p>
            </DialogHeader>
            <DialogBody className="space-y-4">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground" />
                <Input
                  placeholder="Search foods..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-10"
                  autoFocus
                />
              </div>

              <div className="max-h-[50vh] overflow-y-auto space-y-4">
                {searchQuery.length >= 2 ? (
                  <>
                    {localResults.length > 0 && (
                      <div>
                        <h3 className="text-xs font-medium text-muted-foreground mb-2 uppercase">
                          Your Foods
                        </h3>
                        <div className="space-y-2">
                          {localResults.map((food) => (
                            <FoodButton
                              key={food.id}
                              food={food}
                              onClick={() => handleSelectFood(food)}
                            />
                          ))}
                        </div>
                      </div>
                    )}

                    {hasUSDAKey && (
                      <div>
                        <h3 className="text-xs font-medium text-muted-foreground mb-2 uppercase flex items-center gap-1">
                          <Globe className="w-3 h-3" />
                          USDA Database
                          {isSearchingUSDA && <Loader2 className="w-3 h-3 animate-spin" />}
                        </h3>
                        {usdaResults.length > 0 && (
                          <div className="space-y-2">
                            {usdaResults.map((result) => (
                              <button
                                key={result.fdcId}
                                className="w-full p-3 text-left bg-muted hover:bg-muted/80 rounded-lg"
                                onClick={() => handleSelectUSDAFood(result)}
                              >
                                <p className="font-medium truncate">{result.name}</p>
                                <p className="text-sm text-muted-foreground">
                                  {result.calories} cal | {result.protein}g protein
                                </p>
                              </button>
                            ))}
                          </div>
                        )}
                      </div>
                    )}
                  </>
                ) : (
                  <>
                    {favorites && favorites.length > 0 && (
                      <div>
                        <h3 className="text-xs font-medium text-muted-foreground mb-2 uppercase">
                          Favorites
                        </h3>
                        <div className="space-y-2">
                          {favorites.map((food) => (
                            <FoodButton
                              key={food.id}
                              food={food}
                              onClick={() => handleSelectFood(food)}
                            />
                          ))}
                        </div>
                      </div>
                    )}

                    {recentFoods && recentFoods.length > 0 && (
                      <div>
                        <h3 className="text-xs font-medium text-muted-foreground mb-2 uppercase">
                          Recent
                        </h3>
                        <div className="space-y-2">
                          {recentFoods.map((food) => (
                            <FoodButton
                              key={food.id}
                              food={food}
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
              <DialogTitle>Meal Details</DialogTitle>
              <p className="text-sm text-muted-foreground">{formattedDate}</p>
            </DialogHeader>
            <DialogBody className="space-y-4">
              <div className="p-4 bg-muted rounded-lg">
                <h3 className="font-medium">{selectedFood.name}</h3>
                <p className="text-sm text-muted-foreground">
                  {selectedFood.servingSize} {selectedFood.servingUnit} = {selectedFood.calories} cal
                </p>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-sm font-medium mb-2 block">Meal</label>
                  <Select
                    value={mealType}
                    onChange={(e) => setMealType(e.target.value as MealType)}
                    options={mealTypeOptions}
                  />
                </div>
                <div>
                  <label className="text-sm font-medium mb-2 block">Servings</label>
                  <Input
                    type="number"
                    step="0.25"
                    min="0.25"
                    value={servings}
                    onChange={(e) => setServings(e.target.value)}
                  />
                </div>
              </div>

              <div className="p-4 bg-muted rounded-lg">
                <h4 className="text-sm font-medium mb-2">Planned Nutrition</h4>
                <div className="grid grid-cols-3 gap-2 text-sm">
                  <div>
                    <p className="text-muted-foreground">Calories</p>
                    <p className="font-medium">
                      {Math.round(selectedFood.calories * (parseFloat(servings) || 1))}
                    </p>
                  </div>
                  <div>
                    <p className="text-muted-foreground">Protein</p>
                    <p className="font-medium">
                      {(selectedFood.protein * (parseFloat(servings) || 1)).toFixed(1)}g
                    </p>
                  </div>
                  <div>
                    <p className="text-muted-foreground">Fiber</p>
                    <p className="font-medium">
                      {(selectedFood.fiber * (parseFloat(servings) || 1)).toFixed(1)}g
                    </p>
                  </div>
                </div>
              </div>

              <div className="flex gap-3">
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
                  onClick={handleAddToPlan}
                  disabled={isSubmitting}
                >
                  {isSubmitting ? "Adding..." : "Add to Plan"}
                </Button>
              </div>
            </DialogBody>
          </>
        )}
      </DialogContent>
    </Dialog>
  )
}

function FoodButton({ food, onClick }: { food: Food; onClick: () => void }) {
  return (
    <button
      className="w-full p-3 text-left bg-muted hover:bg-muted/80 rounded-lg"
      onClick={onClick}
    >
      <p className="font-medium truncate">{food.name}</p>
      <p className="text-sm text-muted-foreground">
        {food.calories} cal | {food.protein}g protein
      </p>
    </button>
  )
}
