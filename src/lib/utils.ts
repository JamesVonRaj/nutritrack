import { type ClassValue, clsx } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

export function formatNumber(num: number, decimals = 0): string {
  return num.toFixed(decimals)
}

export function getDateString(date: Date = new Date()): string {
  return date.toISOString().split('T')[0]
}

export function parseDate(dateString: string): Date {
  return new Date(dateString + 'T00:00:00')
}
