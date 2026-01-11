import { useState, useEffect } from "react"
import { useLiveQuery } from "dexie-react-hooks"
import { Search, Plus, Star, Clock, Globe, Loader2 } from "lucide-react"
import { db } from "@/db/database"
import { searchFoods } from "@/services/food-service"
import { searchUSDAFoods, addUSDAFoodToDatabase, type USDASearchResult } from "@/services/usda-api"
import { addLogEntry } from "@/services/daily-log-service"
import { getDateString } from "@/lib/utils"
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

interface AddFoodModalProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  defaultMealType?: MealType
  onFoodAdded?: () => void
}

type ModalView = "search" | "create" | "log"

const mealTypeOptions = [
  { value: "breakfast", label: "Breakfast" },
  { value: "lunch", label: "Lunch" },
  { value: "dinner", label: "Dinner" },
  { value: "snack", label: "Snack" },
]

export function AddFoodModal({
  open,
  onOpenChange,
  defaultMealType = "snack",
  onFoodAdded,
}: AddFoodModalProps) {
  const [view, setView] = useState<ModalView>("search")
  const [searchQuery, setSearchQuery] = useState("")
  const [localResults, setLocalResults] = useState<Food[]>([])
  const [usdaResults, setUsdaResults] = useState<USDASearchResult[]>([])
  const [isSearchingUSDA, setIsSearchingUSDA] = useState(false)
  const [usdaError, setUsdaError] = useState<string | null>(null)
  const [selectedFood, setSelectedFood] = useState<Food | null>(null)
  const [servings, setServings] = useState("1")
  const [mealType, setMealType] = useState<MealType>(defaultMealType)

  const settings = useLiveQuery(() => db.settings.get("user-settings"))

  const favorites = useLiveQuery(() =>
    db.foods.filter((f) => f.isFavorite).toArray()
  )

  const recentFoods = useLiveQuery(() =>
    db.foods.orderBy("createdAt").reverse().limit(5).toArray()
  )

  const hasUSDAKey = !!settings?.usdaApiKey

  useEffect(() => {
    if (!open) {
      setView("search")
      setSearchQuery("")
      setLocalResults([])
      setUsdaResults([])
      setUsdaError(null)
      setSelectedFood(null)
      setServings("1")
    }
  }, [open])

  useEffect(() => {
    setMealType(defaultMealType)
  }, [defaultMealType])

  useEffect(() => {
    if (searchQuery.length >= 2) {
      // Search local database
      searchFoods(searchQuery).then(setLocalResults)

      // Search USDA if API key is configured
      if (hasUSDAKey && settings?.usdaApiKey) {
        setIsSearchingUSDA(true)
        setUsdaError(null)
        searchUSDAFoods(searchQuery, settings.usdaApiKey)
          .then((results) => {
            // Filter out results that match local foods by name
            const localNames = new Set(localResults.map(f => f.name.toLowerCase()))
            const filtered = results.filter(r => !localNames.has(r.name.toLowerCase()))
            setUsdaResults(filtered.slice(0, 15))
          })
          .catch((err) => {
            setUsdaError(err.message)
            setUsdaResults([])
          })
          .finally(() => setIsSearchingUSDA(false))
      }
    } else {
      setLocalResults([])
      setUsdaResults([])
    }
  }, [searchQuery, hasUSDAKey, settings?.usdaApiKey])

  const handleSelectFood = (food: Food) => {
    setSelectedFood(food)
    setView("log")
  }

  const handleSelectUSDAFood = async (result: USDASearchResult) => {
    // Add USDA food to local database and select it
    const food = await addUSDAFoodToDatabase(result)
    setSelectedFood(food)
    setView("log")
  }

  const handleLogFood = async () => {
    if (!selectedFood) return

    const servingsNum = parseFloat(servings) || 1

    await addLogEntry({
      date: getDateString(),
      mealType,
      item: selectedFood,
      itemType: "food",
      servings: servingsNum,
    })

    onOpenChange(false)
    onFoodAdded?.()
  }

  const totalResults = localResults.length + usdaResults.length

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent onClose={() => onOpenChange(false)}>
        {view === "search" && (
          <>
            <DialogHeader>
              <DialogTitle>Add Food</DialogTitle>
            </DialogHeader>
            <DialogBody className="space-y-4">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground" />
                <Input
                  placeholder={hasUSDAKey ? "Search local & USDA foods..." : "Search foods..."}
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-10"
                  autoFocus
                />
              </div>

              {searchQuery.length >= 2 ? (
                <div className="space-y-4 max-h-[60vh] overflow-y-auto">
                  {/* Local Results */}
                  {localResults.length > 0 && (
                    <div>
                      <h3 className="text-xs font-medium text-muted-foreground mb-2 uppercase tracking-wide">
                        Your Foods
                      </h3>
                      <div className="space-y-2">
                        {localResults.map((food) => (
                          <FoodListItem
                            key={food.id}
                            food={food}
                            onClick={() => handleSelectFood(food)}
                          />
                        ))}
                      </div>
                    </div>
                  )}

                  {/* USDA Results */}
                  {hasUSDAKey && (
                    <div>
                      <h3 className="text-xs font-medium text-muted-foreground mb-2 uppercase tracking-wide flex items-center gap-1">
                        <Globe className="w-3 h-3" />
                        USDA Database
                        {isSearchingUSDA && (
                          <Loader2 className="w-3 h-3 animate-spin ml-1" />
                        )}
                      </h3>

                      {usdaError && (
                        <p className="text-sm text-destructive py-2">{usdaError}</p>
                      )}

                      {!isSearchingUSDA && usdaResults.length > 0 && (
                        <div className="space-y-2">
                          {usdaResults.map((result) => (
                            <USDAFoodListItem
                              key={result.fdcId}
                              result={result}
                              onClick={() => handleSelectUSDAFood(result)}
                            />
                          ))}
                        </div>
                      )}

                      {!isSearchingUSDA && usdaResults.length === 0 && !usdaError && localResults.length === 0 && (
                        <p className="text-sm text-muted-foreground py-2">
                          No results found
                        </p>
                      )}
                    </div>
                  )}

                  {/* No results at all */}
                  {totalResults === 0 && !isSearchingUSDA && !usdaError && (
                    <div className="text-center py-8 space-y-4">
                      <p className="text-muted-foreground">No foods found</p>
                      <Button
                        variant="outline"
                        onClick={() => setView("create")}
                      >
                        <Plus className="w-4 h-4 mr-2" />
                        Create "{searchQuery}"
                      </Button>
                    </div>
                  )}
                </div>
              ) : (
                <div className="space-y-6 max-h-[60vh] overflow-y-auto">
                  {!hasUSDAKey && (
                    <div className="p-3 bg-muted rounded-lg text-sm">
                      <p className="font-medium">Enable USDA Food Search</p>
                      <p className="text-muted-foreground mt-1">
                        Add your free USDA API key in Settings to search 300,000+ foods.
                      </p>
                    </div>
                  )}

                  {favorites && favorites.length > 0 && (
                    <div>
                      <h3 className="text-sm font-medium text-muted-foreground mb-2 flex items-center gap-2">
                        <Star className="w-4 h-4" />
                        Favorites
                      </h3>
                      <div className="space-y-2">
                        {favorites.map((food) => (
                          <FoodListItem
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
                      <h3 className="text-sm font-medium text-muted-foreground mb-2 flex items-center gap-2">
                        <Clock className="w-4 h-4" />
                        Recent
                      </h3>
                      <div className="space-y-2">
                        {recentFoods.map((food) => (
                          <FoodListItem
                            key={food.id}
                            food={food}
                            onClick={() => handleSelectFood(food)}
                          />
                        ))}
                      </div>
                    </div>
                  )}

                  <div className="pt-4 border-t">
                    <Button
                      variant="outline"
                      className="w-full"
                      onClick={() => setView("create")}
                    >
                      <Plus className="w-4 h-4 mr-2" />
                      Create Custom Food
                    </Button>
                  </div>
                </div>
              )}
            </DialogBody>
          </>
        )}

        {view === "create" && (
          <CreateFoodForm
            initialName={searchQuery}
            onBack={() => setView("search")}
            onCreated={(food) => {
              setSelectedFood(food)
              setView("log")
            }}
          />
        )}

        {view === "log" && selectedFood && (
          <>
            <DialogHeader>
              <DialogTitle>Log Food</DialogTitle>
            </DialogHeader>
            <DialogBody className="space-y-6">
              <div className="p-4 bg-muted rounded-lg">
                <h3 className="font-medium">{selectedFood.name}</h3>
                {selectedFood.brand && (
                  <p className="text-sm text-muted-foreground">
                    {selectedFood.brand}
                  </p>
                )}
                <p className="text-sm text-muted-foreground mt-1">
                  {selectedFood.servingSize} {selectedFood.servingUnit} ={" "}
                  {selectedFood.calories} cal
                </p>
                {selectedFood.source === "usda" && (
                  <p className="text-xs text-primary mt-1 flex items-center gap-1">
                    <Globe className="w-3 h-3" />
                    From USDA database
                  </p>
                )}
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-sm font-medium mb-2 block">
                    Servings
                  </label>
                  <Input
                    type="number"
                    step="0.25"
                    min="0.25"
                    value={servings}
                    onChange={(e) => setServings(e.target.value)}
                  />
                </div>
                <div>
                  <label className="text-sm font-medium mb-2 block">Meal</label>
                  <Select
                    value={mealType}
                    onChange={(e) => setMealType(e.target.value as MealType)}
                    options={mealTypeOptions}
                  />
                </div>
              </div>

              <div className="p-4 bg-muted rounded-lg">
                <h4 className="text-sm font-medium mb-2">Nutrition</h4>
                <div className="grid grid-cols-2 gap-2 text-sm">
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Calories</span>
                    <span className="font-medium">
                      {Math.round(selectedFood.calories * (parseFloat(servings) || 1))}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Protein</span>
                    <span className="font-medium">
                      {(selectedFood.protein * (parseFloat(servings) || 1)).toFixed(1)}g
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Carbs</span>
                    <span className="font-medium">
                      {(selectedFood.carbs * (parseFloat(servings) || 1)).toFixed(1)}g
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Fat</span>
                    <span className="font-medium">
                      {(selectedFood.fat * (parseFloat(servings) || 1)).toFixed(1)}g
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Fiber</span>
                    <span className="font-medium">
                      {(selectedFood.fiber * (parseFloat(servings) || 1)).toFixed(1)}g
                    </span>
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
                <Button className="flex-1" onClick={handleLogFood}>
                  Add to Log
                </Button>
              </div>
            </DialogBody>
          </>
        )}
      </DialogContent>
    </Dialog>
  )
}

function FoodListItem({
  food,
  onClick,
}: {
  food: Food
  onClick: () => void
}) {
  return (
    <button
      className="w-full p-3 text-left bg-muted hover:bg-muted/80 rounded-lg transition-colors flex justify-between items-center min-h-[56px]"
      onClick={onClick}
    >
      <div className="min-w-0 flex-1">
        <p className="font-medium truncate">{food.name}</p>
        <p className="text-sm text-muted-foreground">
          {food.servingSize} {food.servingUnit}
          {food.brand && ` - ${food.brand}`}
        </p>
      </div>
      <div className="text-right ml-2">
        <p className="font-medium">{food.calories} cal</p>
        <p className="text-sm text-muted-foreground">{food.protein}g protein</p>
      </div>
    </button>
  )
}

function USDAFoodListItem({
  result,
  onClick,
}: {
  result: USDASearchResult
  onClick: () => void
}) {
  return (
    <button
      className="w-full p-3 text-left bg-muted hover:bg-muted/80 rounded-lg transition-colors flex justify-between items-center min-h-[56px]"
      onClick={onClick}
    >
      <div className="min-w-0 flex-1">
        <p className="font-medium truncate">{result.name}</p>
        <p className="text-sm text-muted-foreground truncate">
          {result.servingSize}{result.servingUnit}
          {result.brand && ` - ${result.brand}`}
        </p>
      </div>
      <div className="text-right ml-2">
        <p className="font-medium">{result.calories} cal</p>
        <p className="text-sm text-muted-foreground">{result.protein}g protein</p>
      </div>
    </button>
  )
}

interface CreateFoodFormProps {
  initialName?: string
  onBack: () => void
  onCreated: (food: Food) => void
}

function CreateFoodForm({ initialName = "", onBack, onCreated }: CreateFoodFormProps) {
  const [name, setName] = useState(initialName)
  const [servingSize, setServingSize] = useState("100")
  const [servingUnit, setServingUnit] = useState("g")
  const [calories, setCalories] = useState("")
  const [protein, setProtein] = useState("")
  const [carbs, setCarbs] = useState("")
  const [fat, setFat] = useState("")
  const [fiber, setFiber] = useState("")
  const [isSubmitting, setIsSubmitting] = useState(false)

  const servingUnitOptions = [
    { value: "g", label: "grams (g)" },
    { value: "oz", label: "ounces (oz)" },
    { value: "cup", label: "cup" },
    { value: "tbsp", label: "tablespoon" },
    { value: "tsp", label: "teaspoon" },
    { value: "piece", label: "piece" },
    { value: "serving", label: "serving" },
  ]

  const handleSubmit = async () => {
    if (!name || !calories) return

    setIsSubmitting(true)

    try {
      const food: Food = {
        id: crypto.randomUUID(),
        name,
        source: "custom",
        servingSize: parseFloat(servingSize) || 100,
        servingUnit: servingUnit as Food["servingUnit"],
        servingSizeGrams: servingUnit === "g" ? parseFloat(servingSize) || 100 : 0,
        calories: parseFloat(calories) || 0,
        protein: parseFloat(protein) || 0,
        carbs: parseFloat(carbs) || 0,
        fat: parseFloat(fat) || 0,
        fiber: parseFloat(fiber) || 0,
        tags: [],
        isFavorite: false,
        createdAt: new Date(),
        updatedAt: new Date(),
      }

      await db.foods.add(food)
      onCreated(food)
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <>
      <DialogHeader>
        <DialogTitle>Create Food</DialogTitle>
      </DialogHeader>
      <DialogBody className="space-y-4">
        <div>
          <label className="text-sm font-medium mb-2 block">Name</label>
          <Input
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="Food name"
            autoFocus
          />
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="text-sm font-medium mb-2 block">
              Serving Size
            </label>
            <Input
              type="number"
              value={servingSize}
              onChange={(e) => setServingSize(e.target.value)}
              placeholder="100"
            />
          </div>
          <div>
            <label className="text-sm font-medium mb-2 block">Unit</label>
            <Select
              value={servingUnit}
              onChange={(e) => setServingUnit(e.target.value)}
              options={servingUnitOptions}
            />
          </div>
        </div>

        <div className="border-t pt-4">
          <h4 className="text-sm font-medium mb-3">Nutrition per serving</h4>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="text-sm text-muted-foreground mb-1 block">
                Calories
              </label>
              <Input
                type="number"
                value={calories}
                onChange={(e) => setCalories(e.target.value)}
                placeholder="0"
              />
            </div>
            <div>
              <label className="text-sm text-muted-foreground mb-1 block">
                Protein (g)
              </label>
              <Input
                type="number"
                step="0.1"
                value={protein}
                onChange={(e) => setProtein(e.target.value)}
                placeholder="0"
              />
            </div>
            <div>
              <label className="text-sm text-muted-foreground mb-1 block">
                Carbs (g)
              </label>
              <Input
                type="number"
                step="0.1"
                value={carbs}
                onChange={(e) => setCarbs(e.target.value)}
                placeholder="0"
              />
            </div>
            <div>
              <label className="text-sm text-muted-foreground mb-1 block">
                Fat (g)
              </label>
              <Input
                type="number"
                step="0.1"
                value={fat}
                onChange={(e) => setFat(e.target.value)}
                placeholder="0"
              />
            </div>
            <div>
              <label className="text-sm text-muted-foreground mb-1 block">
                Fiber (g)
              </label>
              <Input
                type="number"
                step="0.1"
                value={fiber}
                onChange={(e) => setFiber(e.target.value)}
                placeholder="0"
              />
            </div>
          </div>
        </div>

        <div className="flex gap-3 pt-2">
          <Button variant="outline" className="flex-1" onClick={onBack}>
            Back
          </Button>
          <Button
            className="flex-1"
            onClick={handleSubmit}
            disabled={!name || !calories || isSubmitting}
          >
            {isSubmitting ? "Creating..." : "Create Food"}
          </Button>
        </div>
      </DialogBody>
    </>
  )
}
