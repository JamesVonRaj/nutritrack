import { useLiveQuery } from "dexie-react-hooks"
import { useState, useEffect } from "react"
import { ExternalLink, Check, Eye, EyeOff, Sparkles } from "lucide-react"
import { db, initializeSettings } from "@/db/database"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { Select } from "@/components/ui/select"
import type { AIProvider } from "@/types/database"

const aiProviderOptions = [
  { value: "", label: "Not configured" },
  { value: "gemini", label: "Google Gemini" },
  { value: "openai", label: "OpenAI" },
  { value: "anthropic", label: "Anthropic (Claude)" },
  { value: "ollama", label: "Ollama (Local)" },
]

export function SettingsPage() {
  const [apiKey, setApiKey] = useState("")
  const [showApiKey, setShowApiKey] = useState(false)
  const [apiKeySaved, setApiKeySaved] = useState(false)

  const [aiProvider, setAiProvider] = useState<AIProvider | "">("")
  const [aiApiKey, setAiApiKey] = useState("")
  const [showAiApiKey, setShowAiApiKey] = useState(false)
  const [ollamaUrl, setOllamaUrl] = useState("http://localhost:11434")
  const [aiModel, setAiModel] = useState("")
  const [aiSaved, setAiSaved] = useState(false)

  useEffect(() => {
    initializeSettings()
  }, [])

  const settings = useLiveQuery(() => db.settings.get("user-settings"))

  useEffect(() => {
    if (settings?.usdaApiKey) {
      setApiKey(settings.usdaApiKey)
    }
  }, [settings?.usdaApiKey])

  useEffect(() => {
    if (settings?.aiConfig) {
      setAiProvider(settings.aiConfig.provider || "")
      setAiApiKey(settings.aiConfig.apiKey || "")
      setOllamaUrl(settings.aiConfig.ollamaUrl || "http://localhost:11434")
      setAiModel(settings.aiConfig.model || "")
    }
  }, [settings?.aiConfig])

  const handleSaveApiKey = async () => {
    if (!settings) return
    await db.settings.update("user-settings", {
      usdaApiKey: apiKey.trim(),
      updatedAt: new Date(),
    })
    setApiKeySaved(true)
    setTimeout(() => setApiKeySaved(false), 2000)
  }

  const handleSaveAiConfig = async () => {
    if (!settings) return
    await db.settings.update("user-settings", {
      aiConfig: aiProvider
        ? {
            provider: aiProvider,
            apiKey: aiApiKey.trim() || undefined,
            ollamaUrl: aiProvider === "ollama" ? ollamaUrl.trim() : undefined,
            model: aiModel.trim() || undefined,
          }
        : undefined,
      updatedAt: new Date(),
    })
    setAiSaved(true)
    setTimeout(() => setAiSaved(false), 2000)
  }

  if (!settings) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-muted-foreground">Loading...</div>
      </div>
    )
  }

  return (
    <div className="p-4 space-y-6">
      <header>
        <h1 className="text-2xl font-bold">Settings</h1>
        <p className="text-muted-foreground">Customize your experience</p>
      </header>

      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Daily Goals</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex justify-between items-center py-2 border-b">
            <span>Calories</span>
            <span className="text-muted-foreground">
              {settings.goals.caloriesMin} - {settings.goals.caloriesMax}
            </span>
          </div>
          <div className="flex justify-between items-center py-2 border-b">
            <span>Protein</span>
            <span className="text-muted-foreground">
              {settings.goals.proteinMin} - {settings.goals.proteinMax}g
            </span>
          </div>
          <div className="flex justify-between items-center py-2 border-b">
            <span>Fiber</span>
            <span className="text-muted-foreground">{settings.goals.fiber}g</span>
          </div>
          <div className="flex justify-between items-center py-2">
            <span>Water</span>
            <span className="text-muted-foreground">
              {settings.goals.water}ml
            </span>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-lg">USDA Food Database</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <p className="text-sm text-muted-foreground">
            Connect to the USDA FoodData Central database to search over 300,000
            foods with detailed nutrition information.
          </p>

          <div className="space-y-2">
            <label className="text-sm font-medium">API Key</label>
            <div className="flex gap-2">
              <div className="relative flex-1">
                <Input
                  type={showApiKey ? "text" : "password"}
                  value={apiKey}
                  onChange={(e) => setApiKey(e.target.value)}
                  placeholder="Enter your USDA API key"
                  className="pr-10"
                />
                <button
                  type="button"
                  onClick={() => setShowApiKey(!showApiKey)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                >
                  {showApiKey ? (
                    <EyeOff className="w-4 h-4" />
                  ) : (
                    <Eye className="w-4 h-4" />
                  )}
                </button>
              </div>
              <Button onClick={handleSaveApiKey} disabled={!apiKey.trim()}>
                {apiKeySaved ? (
                  <>
                    <Check className="w-4 h-4 mr-1" />
                    Saved
                  </>
                ) : (
                  "Save"
                )}
              </Button>
            </div>
          </div>

          <a
            href="https://fdc.nal.usda.gov/api-key-signup"
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-1 text-sm text-primary hover:underline"
          >
            Get a free API key
            <ExternalLink className="w-3 h-3" />
          </a>

          {settings.usdaApiKey && (
            <div className="p-3 bg-primary/10 text-primary rounded-lg text-sm">
              USDA search is enabled. Search for any food when logging meals.
            </div>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-lg flex items-center gap-2">
            <Sparkles className="w-5 h-5" />
            AI Meal Suggestions
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <p className="text-sm text-muted-foreground">
            Enable AI-powered meal suggestions based on your inventory and
            nutrition goals.
          </p>

          <div className="space-y-2">
            <label className="text-sm font-medium">Provider</label>
            <Select
              value={aiProvider}
              onChange={(e) => setAiProvider(e.target.value as AIProvider | "")}
              options={aiProviderOptions}
            />
          </div>

          {aiProvider && aiProvider !== "ollama" && (
            <div className="space-y-2">
              <label className="text-sm font-medium">API Key</label>
              <div className="relative">
                <Input
                  type={showAiApiKey ? "text" : "password"}
                  value={aiApiKey}
                  onChange={(e) => setAiApiKey(e.target.value)}
                  placeholder={`Enter your ${
                    aiProvider === "openai" ? "OpenAI" :
                    aiProvider === "gemini" ? "Gemini" : "Anthropic"
                  } API key`}
                  className="pr-10"
                />
                <button
                  type="button"
                  onClick={() => setShowAiApiKey(!showAiApiKey)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                >
                  {showAiApiKey ? (
                    <EyeOff className="w-4 h-4" />
                  ) : (
                    <Eye className="w-4 h-4" />
                  )}
                </button>
              </div>
              <a
                href={
                  aiProvider === "openai"
                    ? "https://platform.openai.com/api-keys"
                    : aiProvider === "gemini"
                    ? "https://aistudio.google.com/apikey"
                    : "https://console.anthropic.com/settings/keys"
                }
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1 text-sm text-primary hover:underline"
              >
                Get an API key
                <ExternalLink className="w-3 h-3" />
              </a>
            </div>
          )}

          {aiProvider === "ollama" && (
            <div className="space-y-2">
              <label className="text-sm font-medium">Ollama URL</label>
              <Input
                value={ollamaUrl}
                onChange={(e) => setOllamaUrl(e.target.value)}
                placeholder="http://localhost:11434"
              />
              <p className="text-xs text-muted-foreground">
                Make sure Ollama is running locally with a model installed.
              </p>
            </div>
          )}

          {aiProvider && (
            <div className="space-y-2">
              <label className="text-sm font-medium">Model (optional)</label>
              <Input
                value={aiModel}
                onChange={(e) => setAiModel(e.target.value)}
                placeholder={
                  aiProvider === "openai"
                    ? "gpt-4o-mini"
                    : aiProvider === "gemini"
                    ? "gemini-2.0-flash"
                    : aiProvider === "anthropic"
                    ? "claude-3-5-haiku-latest"
                    : "llama3.2"
                }
              />
              <p className="text-xs text-muted-foreground">
                Leave blank to use the default model.
              </p>
            </div>
          )}

          {aiProvider && (
            <Button
              onClick={handleSaveAiConfig}
              className="w-full"
              disabled={
                (aiProvider !== "ollama" && !aiApiKey.trim()) ||
                (aiProvider === "ollama" && !ollamaUrl.trim())
              }
            >
              {aiSaved ? (
                <>
                  <Check className="w-4 h-4 mr-1" />
                  Saved
                </>
              ) : (
                "Save AI Configuration"
              )}
            </Button>
          )}

          {!aiProvider && (
            <Button
              variant="outline"
              onClick={handleSaveAiConfig}
              className="w-full"
            >
              Clear AI Configuration
            </Button>
          )}

          {settings.aiConfig?.provider && (
            <div className="p-3 bg-primary/10 text-primary rounded-lg text-sm">
              AI suggestions enabled with{" "}
              {settings.aiConfig.provider === "gemini"
                ? "Google Gemini"
                : settings.aiConfig.provider === "openai"
                ? "OpenAI"
                : settings.aiConfig.provider === "anthropic"
                ? "Anthropic"
                : "Ollama"}
              . Go to AI Meal Ideas to get suggestions.
            </div>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Appearance</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex justify-between items-center py-2">
            <span>Theme</span>
            <span className="text-muted-foreground capitalize">
              {settings.theme}
            </span>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Data</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <p className="text-sm text-muted-foreground">
            All your data is stored locally on this device. Nothing is sent to
            any server except USDA food searches (if enabled).
          </p>
        </CardContent>
      </Card>
    </div>
  )
}
