# NutriTrack User Guide

A personal nutrition tracking app that helps you log meals, manage your pantry, plan your week, and get AI-powered meal suggestions based on what you have on hand.

---

## Table of Contents

1. [Getting Started](#getting-started)
2. [Dashboard (Today)](#dashboard-today)
3. [Food Logging](#food-logging)
4. [Meal Planning](#meal-planning)
5. [AI Meal Ideas](#ai-meal-ideas)
6. [Pantry (Inventory)](#pantry-inventory)
7. [Settings](#settings)

---

## Getting Started

### Running the App

```bash
npm install
npm run dev
```

Open http://localhost:5173 in your browser.

### Navigation

The bottom navigation bar provides quick access to all features:

| Tab | Icon | Description |
|-----|------|-------------|
| Today | Dashboard | Daily overview and quick logging |
| Log | Utensils | Detailed food logging |
| Plan | Calendar | Weekly meal planning |
| Ideas | Sparkle | AI meal suggestions |
| Pantry | Package | Grocery inventory |
| Settings | Gear | Configure goals and API keys |

---

## Dashboard (Today)

The dashboard is your daily overview showing:

### Nutrition Progress

- **Calories** - Ring showing progress toward your daily target (1,350-1,450 cal default)
- **Protein** - Progress bar toward protein goal (50-65g default)
- **Fiber** - Progress bar toward fiber goal (15-25g default)

### Quick Add

Tap a meal button (Breakfast, Lunch, Dinner, Snack) to quickly log food to that meal.

### Today's Log

Shows all foods logged today, organized by meal type. Tap the trash icon to remove an entry.

---

## Food Logging

### Adding Food to Your Log

1. Tap **Log** in the bottom nav, or tap a meal button on the Dashboard
2. Search for a food by name
3. Results show:
   - **Your Foods** - Custom foods and previously used items
   - **USDA Database** - 300,000+ foods (requires API key)
4. Tap a food to select it
5. Choose the meal type and number of servings
6. Tap **Add to Log**

### Creating Custom Foods

1. In the food search, tap **Create Custom Food**
2. Enter the food name and nutrition info per serving:
   - Serving size and unit
   - Calories, protein, carbs, fat, fiber
3. Tap **Save Food**

The food is saved to your database for future use.

### Favorites

Foods you mark as favorites appear at the top of search results for quick access.

---

## Meal Planning

Plan your meals for the week ahead.

### Weekly View

- Navigate between weeks using the left/right arrows
- Tap the week label to jump back to the current week
- Days with planned meals show a dot indicator
- Today is highlighted with a ring

### Planning Meals

1. Tap a day to select it
2. Tap the **+** button next to a meal type (Breakfast, Lunch, Dinner, Snacks)
3. Search and select a food
4. Choose servings and tap **Add to Plan**

### Daily Summary

When you have meals planned, the daily summary shows:
- Total planned calories vs your target
- Total protein
- Total fiber

### Mark as Eaten

When you eat a planned meal:
1. Tap the **checkmark** button on the meal
2. The meal is automatically logged to your daily intake
3. The meal shows as completed (strikethrough)

### Remove Planned Meals

Tap the **trash** icon to remove a meal from your plan.

---

## AI Meal Ideas

Get personalized meal suggestions based on your inventory and nutrition goals.

### Setup

1. Go to **Settings**
2. Under **AI Meal Suggestions**, select a provider:
   - **Google Gemini** - Recommended, free tier available
   - **OpenAI** - GPT models
   - **Anthropic** - Claude models
   - **Ollama** - Local/self-hosted
3. Enter your API key
4. Optionally specify a model (e.g., `gemini-2.5-pro`)
5. Tap **Save AI Configuration**

### Getting Suggestions

1. Tap **Ideas** in the bottom nav
2. Optionally filter by meal type (Breakfast, Lunch, Dinner, Snack)
3. Tap **Get Ideas**

The AI analyzes:
- Your current inventory items
- Items expiring soon (prioritized)
- Your remaining daily nutrition goals

### Suggestion Cards

Each suggestion shows:
- Meal name and description
- Meal type badge
- Prep time
- Quick nutrition (calories, protein, fiber)

Tap a card to expand and see:
- Full ingredient list (checkmarks show items from your inventory)
- Step-by-step instructions
- Complete nutrition breakdown

### Save as Recipe

Tap **Save as Recipe** to save any suggestion to your recipes database for future use.

---

## Pantry (Inventory)

Track what groceries you have on hand.

### Adding Items

1. Tap **Pantry** in the bottom nav
2. Tap the **+** button
3. Search for a food or create a custom one
4. Enter:
   - Quantity and unit
   - Storage location (Fridge, Freezer, Pantry)
   - Expiration date (optional)
5. Tap **Add to Pantry**

### Viewing Inventory

Filter by location using the tabs:
- **All** - Everything
- **Fridge** - Refrigerated items
- **Freezer** - Frozen items
- **Pantry** - Dry goods and shelf-stable items

### Item Status

Items show status indicators:
- **Green** - Available
- **Yellow** - Low stock
- **Red** - Expired

### Expiration Alerts

Items expiring within 7 days show a warning with days remaining.

### Managing Items

- **Deduct** - Reduce quantity (e.g., after using some)
- **Delete** - Remove item entirely

---

## Settings

### Daily Goals

View your configured nutrition targets:
- Calories (min-max range)
- Protein (min-max range)
- Fiber
- Water

*Default goals are optimized for someone with lower caloric needs (1,350-1,450 cal).*

### USDA Food Database

Connect to the USDA FoodData Central database to search over 300,000 foods:

1. Get a free API key at https://fdc.nal.usda.gov/api-key-signup
2. Enter the key in Settings
3. Tap **Save**

Once enabled, USDA foods appear in search results when logging meals.

### AI Meal Suggestions

Configure your AI provider for meal suggestions:

| Provider | API Key Source | Default Model |
|----------|---------------|---------------|
| Google Gemini | https://aistudio.google.com/apikey | gemini-2.0-flash |
| OpenAI | https://platform.openai.com/api-keys | gpt-4o-mini |
| Anthropic | https://console.anthropic.com/settings/keys | claude-3-5-haiku-latest |
| Ollama | Local install | llama3.2 |

**Recommended Gemini Models:**
- `gemini-2.5-pro` - Most capable
- `gemini-2.5-flash` - Fast and smart
- `gemini-2.0-flash` - Fastest (default)

### Data Privacy

All your data is stored locally on your device using IndexedDB. Nothing is sent to external servers except:
- USDA food searches (if enabled)
- AI suggestion requests (if enabled)

---

## Tips

### Quick Logging
- Use the Dashboard's meal buttons for fastest logging
- Mark foods as favorites for quick access
- Recent foods appear automatically in search

### Accurate Tracking
- Log foods right after eating to avoid forgetting
- Use the USDA database for accurate nutrition data
- Adjust serving sizes to match what you actually ate

### Meal Planning
- Plan your week on Sunday
- Use AI suggestions when you're not sure what to make
- Check "expiring soon" items in your pantry for meal ideas

### Inventory Management
- Add groceries when you shop
- Set expiration dates to get alerts
- Deduct items as you use them to keep inventory accurate

---

## Keyboard Shortcuts

The app is designed for touch/tablet use, but also works with mouse and keyboard:

- **Tab** - Navigate between elements
- **Enter** - Select/confirm
- **Escape** - Close modals

---

## Troubleshooting

### Foods not showing in search
- Check if you have the USDA API key configured in Settings
- Try searching with different terms
- Create a custom food if needed

### AI suggestions not working
- Verify your API key is correct in Settings
- Check that you selected a provider and saved
- Try a different model if one isn't responding

### Data not saving
- The app uses your browser's IndexedDB storage
- Ensure you're not in private/incognito mode
- Check that your browser allows local storage
