import { format, parseISO, isWeekend, isBefore, startOfDay } from 'date-fns'

/**
 * Format a price in Indonesian Rupiah format
 * e.g. 45000 → "Rp 45.000"
 */
export function formatIDR(amount: number): string {
  return `Rp ${amount.toLocaleString('id-ID')}`
}

/**
 * Format a date string as "Monday 06-April-26"
 */
export function formatOrderDate(dateStr: string): string {
  const date = parseISO(dateStr)
  const dayName = format(date, 'EEEE')
  const day = format(date, 'dd')
  const month = format(date, 'MMMM')
  const year = format(date, 'yy')
  return `${dayName} ${day}-${month}-${year}`
}

/**
 * Format date as "dd MMM yyyy" for display
 */
export function formatShortDate(dateStr: string): string {
  return format(parseISO(dateStr), 'dd MMM yyyy')
}

/**
 * Check if a date is in the past (before today)
 */
export function isPastDate(dateStr: string): boolean {
  const date = parseISO(dateStr)
  const today = startOfDay(new Date())
  return isBefore(date, today)
}

/**
 * Check if a date is a weekend
 */
export function isWeekendDate(dateStr: string): boolean {
  return isWeekend(parseISO(dateStr))
}

/**
 * Get all weekdays between two dates (inclusive)
 */
export function getWeekdaysBetween(startDate: string, endDate: string): string[] {
  const dates: string[] = []
  const start = parseISO(startDate)
  const end = parseISO(endDate)
  const current = new Date(start)

  while (current <= end) {
    if (!isWeekend(current)) {
      dates.push(format(current, 'yyyy-MM-dd'))
    }
    current.setDate(current.getDate() + 1)
  }

  return dates
}

/**
 * Group dates by week number (Mon-Fri)
 * Returns array of weeks, each week is an array of date strings
 */
export function groupByWeek(dates: string[]): string[][] {
  if (dates.length === 0) return []

  const weeks: string[][] = []
  let currentWeek: string[] = []

  for (const date of dates) {
    const d = parseISO(date)
    const dayOfWeek = d.getDay() // 0 = Sun, 1 = Mon, ...5 = Fri

    if (dayOfWeek === 1 && currentWeek.length > 0) {
      // Monday signals a new week
      weeks.push(currentWeek)
      currentWeek = [date]
    } else {
      currentWeek.push(date)
    }
  }

  if (currentWeek.length > 0) {
    weeks.push(currentWeek)
  }

  return weeks
}

/**
 * Get a week label like "Week 1: 06 Apr – 10 Apr"
 */
export function getWeekLabel(weekDates: string[], weekNumber: number): string {
  if (weekDates.length === 0) return `Week ${weekNumber}`
  const first = format(parseISO(weekDates[0]), 'dd MMM')
  const last = format(parseISO(weekDates[weekDates.length - 1]), 'dd MMM')
  return `Week ${weekNumber}: ${first} – ${last}`
}
