import { cn } from "@/lib/utils"

interface MacroBarProps {
  label: string
  current: number
  target: number
  unit?: string
  color: string
  showPercentage?: boolean
}

export function MacroBar({
  label,
  current,
  target,
  unit = "g",
  color,
  showPercentage = false,
}: MacroBarProps) {
  const percentage = Math.min((current / target) * 100, 100)

  return (
    <div className="space-y-2">
      <div className="flex justify-between items-center">
        <span className="text-sm font-medium">{label}</span>
        <span className="text-sm text-muted-foreground">
          {Math.round(current)} / {target}{unit}
          {showPercentage && (
            <span className="ml-2">({Math.round(percentage)}%)</span>
          )}
        </span>
      </div>
      <div className="h-3 bg-muted rounded-full overflow-hidden">
        <div
          className={cn("h-full rounded-full transition-all duration-500 ease-out")}
          style={{
            width: `${percentage}%`,
            backgroundColor: color,
          }}
        />
      </div>
    </div>
  )
}
