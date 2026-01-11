import { cn } from "@/lib/utils"

interface MacroRingProps {
  label: string
  current: number
  target: number
  unit?: string
  color: string
  size?: "sm" | "md" | "lg"
}

export function MacroRing({
  label,
  current,
  target,
  unit = "g",
  color,
  size = "md",
}: MacroRingProps) {
  const percentage = Math.min((current / target) * 100, 100)
  const circumference = 2 * Math.PI * 40

  const sizeClasses = {
    sm: "w-20 h-20",
    md: "w-28 h-28",
    lg: "w-36 h-36",
  }

  const textSizes = {
    sm: "text-sm",
    md: "text-lg",
    lg: "text-2xl",
  }

  const labelSizes = {
    sm: "text-xs",
    md: "text-xs",
    lg: "text-sm",
  }

  return (
    <div className="flex flex-col items-center gap-2">
      <div className={cn("relative", sizeClasses[size])}>
        <svg className="w-full h-full -rotate-90" viewBox="0 0 100 100">
          <circle
            cx="50"
            cy="50"
            r="40"
            fill="none"
            stroke="currentColor"
            strokeWidth="8"
            className="text-muted"
          />
          <circle
            cx="50"
            cy="50"
            r="40"
            fill="none"
            stroke={color}
            strokeWidth="8"
            strokeLinecap="round"
            strokeDasharray={circumference}
            strokeDashoffset={circumference - (percentage / 100) * circumference}
            className="transition-all duration-500 ease-out"
          />
        </svg>
        <div className="absolute inset-0 flex flex-col items-center justify-center">
          <span className={cn("font-bold", textSizes[size])}>
            {Math.round(current)}
          </span>
          <span className={cn("text-muted-foreground", labelSizes[size])}>
            / {target}{unit}
          </span>
        </div>
      </div>
      <span className="text-sm font-medium text-muted-foreground">{label}</span>
    </div>
  )
}
