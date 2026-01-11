import { db } from "@/db/database"

export interface MealSuggestion {
  id: string
  name: string
  description: string
  ingredients: {
    name: string
    amount: string
    fromInventory: boolean
  }[]
  estimatedNutrition: {
    calories: number
    protein: number
    carbs: number
    fat: number
    fiber: number
  }
  prepTime?: string
  instructions?: string[]
  mealType: "breakfast" | "lunch" | "dinner" | "snack"
}

export interface SuggestionContext {
  inventory: { name: string; quantity: number; unit: string; location: string; expiringDays?: number }[]
  remainingGoals: {
    calories: number
    protein: number
    fiber: number
  }
  mealType?: "breakfast" | "lunch" | "dinner" | "snack"
  preferences?: string
}

async function buildContext(mealType?: string): Promise<SuggestionContext> {
  // Get inventory items
  const inventoryItems = await db.inventory
    .filter((item) => item.status !== "finished")
    .toArray()

  const inventory = inventoryItems.map((item) => {
    let expiringDays: number | undefined
    if (item.expirationDate) {
      const diff = item.expirationDate.getTime() - Date.now()
      expiringDays = Math.ceil(diff / (1000 * 60 * 60 * 24))
    }
    return {
      name: item.foodName,
      quantity: item.quantity,
      unit: item.unit,
      location: item.location,
      expiringDays,
    }
  })

  // Get today's log to calculate remaining goals
  const today = new Date().toISOString().split("T")[0]
  const dailyLog = await db.dailyLogs.where("date").equals(today).first()

  const settings = await db.settings.get("user-settings")
  const goals = settings?.goals ?? {
    caloriesMin: 1350,
    caloriesMax: 1450,
    proteinMin: 50,
    proteinMax: 65,
    fiber: 20,
    water: 2000,
  }

  const consumed = {
    calories: dailyLog?.totalCalories ?? 0,
    protein: dailyLog?.totalProtein ?? 0,
    fiber: dailyLog?.totalFiber ?? 0,
  }

  const targetCalories = (goals.caloriesMin + goals.caloriesMax) / 2
  const targetProtein = (goals.proteinMin + goals.proteinMax) / 2

  return {
    inventory,
    remainingGoals: {
      calories: Math.max(0, targetCalories - consumed.calories),
      protein: Math.max(0, targetProtein - consumed.protein),
      fiber: Math.max(0, goals.fiber - consumed.fiber),
    },
    mealType: mealType as SuggestionContext["mealType"],
  }
}

function buildPrompt(context: SuggestionContext): string {
  const inventoryList = context.inventory
    .map((item) => {
      let str = `- ${item.name}: ${item.quantity} ${item.unit} (${item.location})`
      if (item.expiringDays !== undefined && item.expiringDays <= 3) {
        str += ` [EXPIRES IN ${item.expiringDays} DAYS - USE FIRST]`
      }
      return str
    })
    .join("\n")

  const mealTypeStr = context.mealType ? ` for ${context.mealType}` : ""

  return `You are a helpful nutrition assistant. Based on the user's available ingredients and remaining daily nutrition goals, suggest 3 meal ideas${mealTypeStr}.

AVAILABLE INVENTORY:
${inventoryList || "No inventory items tracked yet."}

REMAINING DAILY GOALS:
- Calories: ${Math.round(context.remainingGoals.calories)} cal
- Protein: ${Math.round(context.remainingGoals.protein)}g
- Fiber: ${Math.round(context.remainingGoals.fiber)}g

REQUIREMENTS:
1. Prioritize ingredients that are expiring soon
2. Use ingredients from the inventory when possible
3. Keep suggestions simple and practical
4. Each suggestion should help meet the remaining nutrition goals
5. If inventory is limited, suggest simple meals that use what's available plus common staples

Respond with ONLY valid JSON in this exact format:
{
  "suggestions": [
    {
      "name": "Meal Name",
      "description": "Brief description of the meal",
      "mealType": "breakfast|lunch|dinner|snack",
      "ingredients": [
        {"name": "ingredient", "amount": "quantity with unit", "fromInventory": true}
      ],
      "estimatedNutrition": {
        "calories": 400,
        "protein": 25,
        "carbs": 30,
        "fat": 15,
        "fiber": 8
      },
      "prepTime": "15 minutes",
      "instructions": ["Step 1", "Step 2"]
    }
  ]
}`
}

async function callOpenAI(prompt: string, apiKey: string, model?: string): Promise<string> {
  const response = await fetch("https://api.openai.com/v1/chat/completions", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${apiKey}`,
    },
    body: JSON.stringify({
      model: model || "gpt-4o-mini",
      messages: [
        {
          role: "system",
          content: "You are a nutrition assistant that provides meal suggestions in JSON format only.",
        },
        { role: "user", content: prompt },
      ],
      temperature: 0.7,
      max_tokens: 2000,
    }),
  })

  if (!response.ok) {
    const error = await response.text()
    throw new Error(`OpenAI API error: ${error}`)
  }

  const data = await response.json()
  return data.choices[0].message.content
}

async function callAnthropic(prompt: string, apiKey: string, model?: string): Promise<string> {
  const response = await fetch("https://api.anthropic.com/v1/messages", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "x-api-key": apiKey,
      "anthropic-version": "2023-06-01",
      "anthropic-dangerous-direct-browser-access": "true",
    },
    body: JSON.stringify({
      model: model || "claude-3-5-haiku-latest",
      max_tokens: 2000,
      messages: [{ role: "user", content: prompt }],
    }),
  })

  if (!response.ok) {
    const error = await response.text()
    throw new Error(`Anthropic API error: ${error}`)
  }

  const data = await response.json()
  return data.content[0].text
}

async function callGemini(prompt: string, apiKey: string, model?: string): Promise<string> {
  const modelId = model || "gemini-2.0-flash"
  const response = await fetch(
    `https://generativelanguage.googleapis.com/v1beta/models/${modelId}:generateContent?key=${apiKey}`,
    {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        contents: [{ parts: [{ text: prompt }] }],
        generationConfig: {
          temperature: 0.7,
          maxOutputTokens: 2000,
        },
      }),
    }
  )

  if (!response.ok) {
    const error = await response.text()
    throw new Error(`Gemini API error: ${error}`)
  }

  const data = await response.json()
  return data.candidates[0].content.parts[0].text
}

async function callOllama(prompt: string, url: string, model?: string): Promise<string> {
  const baseUrl = url.replace(/\/$/, "")
  const response = await fetch(`${baseUrl}/api/generate`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model: model || "llama3.2",
      prompt,
      stream: false,
    }),
  })

  if (!response.ok) {
    const error = await response.text()
    throw new Error(`Ollama API error: ${error}`)
  }

  const data = await response.json()
  return data.response
}

function parseResponse(response: string): MealSuggestion[] {
  // Extract JSON from response (handle markdown code blocks)
  let jsonStr = response
  const jsonMatch = response.match(/```(?:json)?\s*([\s\S]*?)```/)
  if (jsonMatch) {
    jsonStr = jsonMatch[1]
  }

  // Try to find JSON object
  const objectMatch = jsonStr.match(/\{[\s\S]*\}/)
  if (objectMatch) {
    jsonStr = objectMatch[0]
  }

  const parsed = JSON.parse(jsonStr)
  const suggestions = parsed.suggestions || parsed

  return suggestions.map((s: any) => ({
    id: crypto.randomUUID(),
    name: s.name,
    description: s.description,
    mealType: s.mealType || "dinner",
    ingredients: s.ingredients || [],
    estimatedNutrition: s.estimatedNutrition || {
      calories: 0,
      protein: 0,
      carbs: 0,
      fat: 0,
      fiber: 0,
    },
    prepTime: s.prepTime,
    instructions: s.instructions,
  }))
}

export async function getMealSuggestions(
  mealType?: string
): Promise<MealSuggestion[]> {
  const settings = await db.settings.get("user-settings")

  if (!settings?.aiConfig?.provider || !settings.aiConfig.apiKey) {
    if (settings?.aiConfig?.provider === "ollama" && settings.aiConfig.ollamaUrl) {
      // Ollama doesn't need an API key
    } else {
      throw new Error("AI not configured. Please add your API key in Settings.")
    }
  }

  const context = await buildContext(mealType)
  const prompt = buildPrompt(context)

  let response: string

  const { provider, apiKey, ollamaUrl, model } = settings.aiConfig

  switch (provider) {
    case "openai":
      if (!apiKey) throw new Error("OpenAI API key not configured")
      response = await callOpenAI(prompt, apiKey, model)
      break
    case "anthropic":
      if (!apiKey) throw new Error("Anthropic API key not configured")
      response = await callAnthropic(prompt, apiKey, model)
      break
    case "gemini":
      if (!apiKey) throw new Error("Gemini API key not configured")
      response = await callGemini(prompt, apiKey, model)
      break
    case "ollama":
      if (!ollamaUrl) throw new Error("Ollama URL not configured")
      response = await callOllama(prompt, ollamaUrl, model)
      break
    default:
      throw new Error(`Unknown AI provider: ${provider}`)
  }

  return parseResponse(response)
}

export async function getContextSummary(): Promise<SuggestionContext> {
  return buildContext()
}

export async function saveSuggestionAsRecipe(suggestion: MealSuggestion): Promise<string> {
  const now = new Date()

  const recipe = {
    id: crypto.randomUUID(),
    name: suggestion.name,
    description: suggestion.description,

    ingredients: suggestion.ingredients.map((ing) => ({
      foodId: "",
      foodName: ing.name,
      quantity: parseFloat(ing.amount.replace(/[^\d.]/g, "")) || 1,
      unit: "serving" as const,
      notes: ing.amount,
    })),

    servings: 1,
    caloriesPerServing: suggestion.estimatedNutrition.calories,
    proteinPerServing: suggestion.estimatedNutrition.protein,
    carbsPerServing: suggestion.estimatedNutrition.carbs,
    fatPerServing: suggestion.estimatedNutrition.fat,
    fiberPerServing: suggestion.estimatedNutrition.fiber,

    prepTime: suggestion.prepTime ? parseInt(suggestion.prepTime) || undefined : undefined,
    cookTime: undefined,
    instructions: suggestion.instructions || [],
    notes: "Generated by AI",

    tags: ["ai-generated"],
    category: suggestion.mealType,
    isFavorite: false,

    createdAt: now,
    updatedAt: now,
  }

  await db.recipes.add(recipe)
  return recipe.id
}
