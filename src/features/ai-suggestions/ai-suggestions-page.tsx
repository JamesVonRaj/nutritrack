import { useState } from "react"
import { useLiveQuery } from "dexie-react-hooks"
import {
  Sparkles,
  Loader2,
  ChefHat,
  Clock,
  Flame,
  Beef,
  Wheat,
  AlertCircle,
  Check,
  BookOpen,
  RefreshCw,
} from "lucide-react"
import { db } from "@/db/database"
import {
  getMealSuggestions,
  getContextSummary,
  saveSuggestionAsRecipe,
  type MealSuggestion,
  type SuggestionContext,
} from "@/services/ai-suggestion-service"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Select } from "@/components/ui/select"
import { cn } from "@/lib/utils"

const mealTypeOptions = [
  { value: "", label: "Any meal" },
  { value: "breakfast", label: "Breakfast" },
  { value: "lunch", label: "Lunch" },
  { value: "dinner", label: "Dinner" },
  { value: "snack", label: "Snack" },
]

export function AISuggestionsPage() {
  const [mealType, setMealType] = useState("")
  const [suggestions, setSuggestions] = useState<MealSuggestion[]>([])
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [context, setContext] = useState<SuggestionContext | null>(null)
  const [expandedSuggestion, setExpandedSuggestion] = useState<string | null>(null)

  const settings = useLiveQuery(() => db.settings.get("user-settings"))
  const hasAIConfig = !!settings?.aiConfig?.provider

  const handleGetSuggestions = async () => {
    setIsLoading(true)
    setError(null)

    try {
      const [newSuggestions, newContext] = await Promise.all([
        getMealSuggestions(mealType || undefined),
        getContextSummary(),
      ])
      setSuggestions(newSuggestions)
      setContext(newContext)
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to get suggestions")
    } finally {
      setIsLoading(false)
    }
  }

  const toggleExpanded = (id: string) => {
    setExpandedSuggestion(expandedSuggestion === id ? null : id)
  }

  return (
    <div className="p-4 space-y-4">
      <header>
        <h1 className="text-2xl font-bold flex items-center gap-2">
          <Sparkles className="w-6 h-6 text-primary" />
          AI Meal Ideas
        </h1>
        <p className="text-muted-foreground">
          Get personalized suggestions based on your inventory
        </p>
      </header>

      {!hasAIConfig ? (
        <Card>
          <CardContent className="py-8 text-center">
            <AlertCircle className="w-12 h-12 mx-auto text-muted-foreground mb-4" />
            <h3 className="font-medium mb-2">AI Not Configured</h3>
            <p className="text-sm text-muted-foreground mb-4">
              Add your API key in Settings to enable AI meal suggestions.
            </p>
            <Button variant="outline" onClick={() => window.location.href = "/settings"}>
              Go to Settings
            </Button>
          </CardContent>
        </Card>
      ) : (
        <>
          {/* Controls */}
          <Card>
            <CardContent className="py-4">
              <div className="flex gap-3">
                <div className="flex-1">
                  <Select
                    value={mealType}
                    onChange={(e) => setMealType(e.target.value)}
                    options={mealTypeOptions}
                  />
                </div>
                <Button
                  onClick={handleGetSuggestions}
                  disabled={isLoading}
                  className="min-w-[140px]"
                >
                  {isLoading ? (
                    <>
                      <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                      Thinking...
                    </>
                  ) : suggestions.length > 0 ? (
                    <>
                      <RefreshCw className="w-4 h-4 mr-2" />
                      New Ideas
                    </>
                  ) : (
                    <>
                      <Sparkles className="w-4 h-4 mr-2" />
                      Get Ideas
                    </>
                  )}
                </Button>
              </div>
            </CardContent>
          </Card>

          {/* Context Summary */}
          {context && (
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium text-muted-foreground">
                  Using for suggestions
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="flex justify-between text-sm">
                  <div>
                    <p className="text-muted-foreground">Inventory items</p>
                    <p className="font-medium">{context.inventory.length}</p>
                  </div>
                  <div className="text-right">
                    <p className="text-muted-foreground">Remaining today</p>
                    <p className="font-medium">
                      {Math.round(context.remainingGoals.calories)} cal ·{" "}
                      {Math.round(context.remainingGoals.protein)}g protein ·{" "}
                      {Math.round(context.remainingGoals.fiber)}g fiber
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Error */}
          {error && (
            <Card className="border-destructive">
              <CardContent className="py-4">
                <div className="flex items-start gap-3 text-destructive">
                  <AlertCircle className="w-5 h-5 flex-shrink-0 mt-0.5" />
                  <div>
                    <p className="font-medium">Error</p>
                    <p className="text-sm">{error}</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Suggestions */}
          {suggestions.length > 0 && (
            <div className="space-y-4">
              <h2 className="text-lg font-semibold">Suggested Meals</h2>
              {suggestions.map((suggestion) => (
                <SuggestionCard
                  key={suggestion.id}
                  suggestion={suggestion}
                  isExpanded={expandedSuggestion === suggestion.id}
                  onToggle={() => toggleExpanded(suggestion.id)}
                />
              ))}
            </div>
          )}

          {/* Empty State */}
          {!isLoading && suggestions.length === 0 && !error && (
            <Card>
              <CardContent className="py-12 text-center">
                <ChefHat className="w-16 h-16 mx-auto text-muted-foreground mb-4" />
                <h3 className="font-medium mb-2">Ready to suggest meals</h3>
                <p className="text-sm text-muted-foreground">
                  Tap "Get Ideas" to get AI-powered meal suggestions based on
                  your inventory and nutrition goals.
                </p>
              </CardContent>
            </Card>
          )}
        </>
      )}
    </div>
  )
}

function SuggestionCard({
  suggestion,
  isExpanded,
  onToggle,
}: {
  suggestion: MealSuggestion
  isExpanded: boolean
  onToggle: () => void
}) {
  const [isSaving, setIsSaving] = useState(false)
  const [isSaved, setIsSaved] = useState(false)
  const { estimatedNutrition } = suggestion

  const handleSaveAsRecipe = async () => {
    setIsSaving(true)
    try {
      await saveSuggestionAsRecipe(suggestion)
      setIsSaved(true)
    } finally {
      setIsSaving(false)
    }
  }

  return (
    <Card className="overflow-hidden">
      <button
        className="w-full text-left p-4 hover:bg-muted/50 transition-colors"
        onClick={onToggle}
      >
        <div className="flex items-start justify-between gap-3">
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 mb-1">
              <span
                className={cn(
                  "text-xs px-2 py-0.5 rounded-full font-medium",
                  suggestion.mealType === "breakfast" && "bg-yellow-100 text-yellow-700",
                  suggestion.mealType === "lunch" && "bg-blue-100 text-blue-700",
                  suggestion.mealType === "dinner" && "bg-purple-100 text-purple-700",
                  suggestion.mealType === "snack" && "bg-green-100 text-green-700"
                )}
              >
                {suggestion.mealType}
              </span>
              {suggestion.prepTime && (
                <span className="text-xs text-muted-foreground flex items-center gap-1">
                  <Clock className="w-3 h-3" />
                  {suggestion.prepTime}
                </span>
              )}
            </div>
            <h3 className="font-semibold">{suggestion.name}</h3>
            <p className="text-sm text-muted-foreground line-clamp-2">
              {suggestion.description}
            </p>
          </div>
        </div>

        {/* Quick nutrition */}
        <div className="flex gap-4 mt-3 text-sm">
          <span className="flex items-center gap-1 text-calories">
            <Flame className="w-4 h-4" />
            {estimatedNutrition.calories}
          </span>
          <span className="flex items-center gap-1 text-protein">
            <Beef className="w-4 h-4" />
            {estimatedNutrition.protein}g
          </span>
          <span className="flex items-center gap-1 text-fiber">
            <Wheat className="w-4 h-4" />
            {estimatedNutrition.fiber}g
          </span>
        </div>
      </button>

      {isExpanded && (
        <div className="px-4 pb-4 space-y-4 border-t pt-4">
          {/* Ingredients */}
          <div>
            <h4 className="text-sm font-medium mb-2">Ingredients</h4>
            <ul className="space-y-1">
              {suggestion.ingredients.map((ing, i) => (
                <li key={i} className="text-sm flex items-center gap-2">
                  {ing.fromInventory && (
                    <Check className="w-4 h-4 text-primary flex-shrink-0" />
                  )}
                  <span className={ing.fromInventory ? "" : "ml-6"}>
                    {ing.amount} {ing.name}
                  </span>
                </li>
              ))}
            </ul>
          </div>

          {/* Instructions */}
          {suggestion.instructions && suggestion.instructions.length > 0 && (
            <div>
              <h4 className="text-sm font-medium mb-2">Instructions</h4>
              <ol className="space-y-2">
                {suggestion.instructions.map((step, i) => (
                  <li key={i} className="text-sm flex gap-2">
                    <span className="font-medium text-muted-foreground">
                      {i + 1}.
                    </span>
                    <span>{step}</span>
                  </li>
                ))}
              </ol>
            </div>
          )}

          {/* Full Nutrition */}
          <div>
            <h4 className="text-sm font-medium mb-2">Nutrition</h4>
            <div className="grid grid-cols-5 gap-2 text-center text-sm">
              <div className="bg-muted rounded-lg p-2">
                <p className="text-calories font-semibold">
                  {estimatedNutrition.calories}
                </p>
                <p className="text-xs text-muted-foreground">cal</p>
              </div>
              <div className="bg-muted rounded-lg p-2">
                <p className="text-protein font-semibold">
                  {estimatedNutrition.protein}g
                </p>
                <p className="text-xs text-muted-foreground">protein</p>
              </div>
              <div className="bg-muted rounded-lg p-2">
                <p className="text-carbs font-semibold">
                  {estimatedNutrition.carbs}g
                </p>
                <p className="text-xs text-muted-foreground">carbs</p>
              </div>
              <div className="bg-muted rounded-lg p-2">
                <p className="text-fat font-semibold">
                  {estimatedNutrition.fat}g
                </p>
                <p className="text-xs text-muted-foreground">fat</p>
              </div>
              <div className="bg-muted rounded-lg p-2">
                <p className="text-fiber font-semibold">
                  {estimatedNutrition.fiber}g
                </p>
                <p className="text-xs text-muted-foreground">fiber</p>
              </div>
            </div>
          </div>

          {/* Actions */}
          <div className="flex gap-2 pt-2">
            <Button
              variant={isSaved ? "default" : "outline"}
              className="flex-1"
              onClick={handleSaveAsRecipe}
              disabled={isSaving || isSaved}
            >
              {isSaved ? (
                <>
                  <Check className="w-4 h-4 mr-2" />
                  Saved to Recipes
                </>
              ) : isSaving ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Saving...
                </>
              ) : (
                <>
                  <BookOpen className="w-4 h-4 mr-2" />
                  Save as Recipe
                </>
              )}
            </Button>
          </div>
        </div>
      )}
    </Card>
  )
}
