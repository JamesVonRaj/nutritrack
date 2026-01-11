import { useLiveQuery } from "dexie-react-hooks"
import { useState, useEffect } from "react"
import { ExternalLink, Check, Eye, EyeOff, Sparkles, Cloud, CloudOff, LogOut, Loader2 } from "lucide-react"
import { db, initializeSettings } from "@/db/database"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { Select } from "@/components/ui/select"
import type { AIProvider } from "@/types/database"
import { signInWithGoogle, signOut, onAuthChange, type AuthUser } from "@/services/auth-service"
import { uploadAllData, downloadAllData, startRealtimeSync, stopRealtimeSync } from "@/services/sync-service"

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

  const [user, setUser] = useState<AuthUser | null>(null)
  const [isSyncing, setIsSyncing] = useState(false)
  const [syncStatus, setSyncStatus] = useState<string | null>(null)

  useEffect(() => {
    initializeSettings()

    // Listen for auth changes
    const unsubscribe = onAuthChange((authUser) => {
      setUser(authUser)
      if (authUser) {
        startRealtimeSync(authUser.uid)
      } else {
        stopRealtimeSync()
      }
    })

    return () => unsubscribe()
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

  const handleSignIn = async () => {
    setIsSyncing(true)
    setSyncStatus("Signing in...")
    try {
      const authUser = await signInWithGoogle()
      setSyncStatus("Downloading cloud data...")
      await downloadAllData(authUser.uid)
      setSyncStatus("Uploading local data...")
      await uploadAllData(authUser.uid)
      startRealtimeSync(authUser.uid)
      setSyncStatus("Sync complete!")
      setTimeout(() => setSyncStatus(null), 2000)
    } catch (error) {
      setSyncStatus(`Error: ${error instanceof Error ? error.message : "Failed to sign in"}`)
      setTimeout(() => setSyncStatus(null), 3000)
    } finally {
      setIsSyncing(false)
    }
  }

  const handleSignOut = async () => {
    stopRealtimeSync()
    await signOut()
    setUser(null)
    setSyncStatus(null)
  }

  const handleForceSync = async () => {
    if (!user) return
    setIsSyncing(true)
    setSyncStatus("Syncing...")
    try {
      await downloadAllData(user.uid)
      await uploadAllData(user.uid)
      setSyncStatus("Sync complete!")
      setTimeout(() => setSyncStatus(null), 2000)
    } catch (error) {
      setSyncStatus(`Error: ${error instanceof Error ? error.message : "Sync failed"}`)
      setTimeout(() => setSyncStatus(null), 3000)
    } finally {
      setIsSyncing(false)
    }
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
          <CardTitle className="text-lg flex items-center gap-2">
            {user ? <Cloud className="w-5 h-5 text-primary" /> : <CloudOff className="w-5 h-5" />}
            Cloud Sync
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {user ? (
            <>
              <div className="flex items-center gap-3 p-3 bg-muted rounded-lg">
                {user.photoURL && (
                  <img
                    src={user.photoURL}
                    alt=""
                    className="w-10 h-10 rounded-full"
                  />
                )}
                <div className="flex-1 min-w-0">
                  <p className="font-medium truncate">{user.displayName}</p>
                  <p className="text-sm text-muted-foreground truncate">{user.email}</p>
                </div>
              </div>

              <div className="p-3 bg-primary/10 text-primary rounded-lg text-sm flex items-center gap-2">
                <Cloud className="w-4 h-4 flex-shrink-0" />
                Sync enabled. Your data syncs automatically across devices.
              </div>

              {syncStatus && (
                <div className="p-3 bg-muted rounded-lg text-sm flex items-center gap-2">
                  {isSyncing && <Loader2 className="w-4 h-4 animate-spin" />}
                  {syncStatus}
                </div>
              )}

              <div className="flex gap-2">
                <Button
                  variant="outline"
                  className="flex-1"
                  onClick={handleForceSync}
                  disabled={isSyncing}
                >
                  {isSyncing ? (
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  ) : (
                    <Cloud className="w-4 h-4 mr-2" />
                  )}
                  Sync Now
                </Button>
                <Button
                  variant="outline"
                  onClick={handleSignOut}
                  disabled={isSyncing}
                >
                  <LogOut className="w-4 h-4 mr-2" />
                  Sign Out
                </Button>
              </div>
            </>
          ) : (
            <>
              <p className="text-sm text-muted-foreground">
                Sign in with Google to sync your data across all your devices.
                Your nutrition logs, meal plans, and inventory will be available
                everywhere.
              </p>

              {syncStatus && (
                <div className="p-3 bg-muted rounded-lg text-sm flex items-center gap-2">
                  {isSyncing && <Loader2 className="w-4 h-4 animate-spin" />}
                  {syncStatus}
                </div>
              )}

              <Button
                className="w-full"
                onClick={handleSignIn}
                disabled={isSyncing}
              >
                {isSyncing ? (
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                ) : (
                  <Cloud className="w-4 h-4 mr-2" />
                )}
                Sign in with Google
              </Button>
            </>
          )}
        </CardContent>
      </Card>

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
            {user
              ? "Your data is stored locally and synced to Google Cloud. API keys are stored locally only and not synced."
              : "All your data is stored locally on this device. Sign in with Google to sync across devices."}
          </p>
        </CardContent>
      </Card>
    </div>
  )
}
