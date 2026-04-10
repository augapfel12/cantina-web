'use client'

import { useEffect, useState, useCallback } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabase'
import { useAuth } from '@/lib/auth-context'
import type {
  School,
  SchoolLevel,
  Price,
  Term,
  Holiday,
  MenuDay,
  DailyAvailable,
  Snack,
  Juice,
  Student,
  StudentFormData,
  DayOrderSelection,
} from '@/lib/types'
import {
  formatIDR,
  formatOrderDate,
  getWeekdaysBetween,
  groupByWeek,
  getWeekLabel,
  isPastDate,
} from '@/lib/utils'

// ─── Types ───────────────────────────────────────────────────────────────────

interface PageData {
  school: School
  levels: SchoolLevel[]
  prices: Price[]
  term: Term
  holidays: Holiday[]
  menuDays: MenuDay[]
  dailyAvailable: DailyAvailable[]
  snacks: Snack[]
  juices: Juice[]
}

// ─── Helpers ─────────────────────────────────────────────────────────────────

function getDietSurcharge(
  studentData: StudentFormData,
  prices: Price[],
  levelId: string
): number {
  const lunchPrice = prices.find(
    (p) => p.level_id === levelId && p.item_type === 'lunch'
  )
  if (!lunchPrice) return 0
  if (studentData.diet_vegan) return lunchPrice.diet_surcharge_vegan
  if (studentData.diet_gluten_free) return lunchPrice.diet_surcharge_gf
  return 0
}

function getPriceForLevel(
  prices: Price[],
  levelId: string,
  itemType: 'lunch' | 'snack' | 'juice'
): number {
  return prices.find((p) => p.level_id === levelId && p.item_type === itemType)?.price_idr ?? 0
}

// ─── Sub-components ──────────────────────────────────────────────────────────

function DietBadge({ label }: { label: string }) {
  return (
    <span className="inline-block px-2 py-0.5 rounded text-xs font-medium bg-orange-100 text-orange-700">
      {label}
    </span>
  )
}

interface DayRowProps {
  date: string
  menuDay: MenuDay | undefined
  dailyAvailable: DailyAvailable[]
  snacks: Snack[]
  juices: Juice[]
  selection: DayOrderSelection
  onChange: (sel: DayOrderSelection) => void
  disabled: boolean
  holidayName: string | null
  prices: Price[]
  levelId: string
  dietSurcharge: number
}

function DayRow({
  date,
  menuDay,
  dailyAvailable,
  snacks,
  juices,
  selection,
  onChange,
  disabled,
  holidayName,
  prices,
  levelId,
  dietSurcharge,
}: DayRowProps) {
  const lunchPrice = getPriceForLevel(prices, levelId, 'lunch')
  const snackPrice = getPriceForLevel(prices, levelId, 'snack')
  const juicePrice = getPriceForLevel(prices, levelId, 'juice')

  const hasLunch =
    selection.lunch_choice !== 'none' && selection.lunch_choice !== ''
  const rowTotal =
    (hasLunch ? lunchPrice + (dietSurcharge > 0 ? dietSurcharge : 0) : 0) +
    (selection.snack_id ? snackPrice : 0) +
    (selection.juice_id ? juicePrice : 0)

  const containerClass = disabled
    ? 'opacity-50 pointer-events-none bg-gray-50'
    : 'bg-white'

  return (
    <div className={`rounded-lg border border-gray-200 p-4 mb-3 ${containerClass}`}>
      {/* Date header */}
      <div className="flex items-center justify-between mb-3">
        <div>
          <span className="font-semibold text-gray-900">{formatOrderDate(date)}</span>
          {holidayName && (
            <span className="ml-2 text-xs font-medium text-red-500 bg-red-50 px-2 py-0.5 rounded">
              Holiday: {holidayName}
            </span>
          )}
          {isPastDate(date) && !holidayName && (
            <span className="ml-2 text-xs text-gray-400">Past</span>
          )}
        </div>
        {rowTotal > 0 && (
          <span className="text-sm font-semibold text-orange-600">
            {formatIDR(rowTotal)}
          </span>
        )}
      </div>

      {disabled ? (
        <p className="text-sm text-gray-400 italic">
          {holidayName ? 'No school – public holiday' : 'Ordering closed for past dates'}
        </p>
      ) : (
        <div className="space-y-3">
          {/* Lunch choices */}
          <div>
            <p className="text-xs font-semibold uppercase tracking-wide text-gray-500 mb-2">
              Lunch — {formatIDR(lunchPrice)}
              {dietSurcharge > 0 && (
                <span className="ml-1 text-orange-500">
                  + {formatIDR(dietSurcharge)} diet surcharge
                </span>
              )}
            </p>
            <div className="space-y-2">
              {/* No lunch */}
              <label className="flex items-start gap-2 cursor-pointer">
                <input
                  type="radio"
                  name={`lunch-${date}`}
                  value="none"
                  checked={selection.lunch_choice === 'none'}
                  onChange={() => onChange({ ...selection, lunch_choice: 'none' })}
                  className="mt-0.5 accent-orange-500"
                />
                <span className="text-sm text-gray-500 italic">No lunch</span>
              </label>

              {/* Menu 1 */}
              {menuDay?.menu1_name && (
                <label className="flex items-start gap-2 cursor-pointer">
                  <input
                    type="radio"
                    name={`lunch-${date}`}
                    value="menu1"
                    checked={selection.lunch_choice === 'menu1'}
                    onChange={() => onChange({ ...selection, lunch_choice: 'menu1' })}
                    className="mt-0.5 accent-orange-500"
                  />
                  <div>
                    <p className="text-sm font-medium text-gray-800">
                      {menuDay.menu1_name}
                    </p>
                    {menuDay.menu1_desc && (
                      <p className="text-xs text-gray-500 mt-0.5">{menuDay.menu1_desc}</p>
                    )}
                  </div>
                </label>
              )}

              {/* Menu 2 */}
              {menuDay?.menu2_name && (
                <label className="flex items-start gap-2 cursor-pointer">
                  <input
                    type="radio"
                    name={`lunch-${date}`}
                    value="menu2"
                    checked={selection.lunch_choice === 'menu2'}
                    onChange={() => onChange({ ...selection, lunch_choice: 'menu2' })}
                    className="mt-0.5 accent-orange-500"
                  />
                  <div>
                    <p className="text-sm font-medium text-gray-800">
                      {menuDay.menu2_name}
                    </p>
                    {menuDay.menu2_desc && (
                      <p className="text-xs text-gray-500 mt-0.5">{menuDay.menu2_desc}</p>
                    )}
                  </div>
                </label>
              )}

              {/* Daily available */}
              {dailyAvailable.length > 0 && (
                <div className="flex items-start gap-2">
                  <input
                    type="radio"
                    name={`lunch-${date}`}
                    value="daily_available"
                    id={`da-radio-${date}`}
                    checked={selection.lunch_choice === 'daily_available'}
                    onChange={() =>
                      onChange({ ...selection, lunch_choice: 'daily_available' })
                    }
                    className="mt-2 accent-orange-500"
                  />
                  <div className="flex-1">
                    <label
                      htmlFor={`da-radio-${date}`}
                      className="text-sm font-medium text-gray-800 cursor-pointer"
                    >
                      Daily available choices
                    </label>
                    {selection.lunch_choice === 'daily_available' && (
                      <select
                        className="mt-1 w-full border border-gray-300 rounded-md px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-orange-400"
                        value={selection.daily_available_id}
                        onChange={(e) =>
                          onChange({ ...selection, daily_available_id: e.target.value })
                        }
                      >
                        <option value="">Select a dish…</option>
                        {dailyAvailable.map((item) => (
                          <option key={item.id} value={item.id}>
                            {item.code ? `${item.code}. ` : ''}{item.name}
                            {item.description ? ` – ${item.description}` : ''}
                          </option>
                        ))}
                      </select>
                    )}
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Snack */}
          <div>
            <p className="text-xs font-semibold uppercase tracking-wide text-gray-500 mb-1">
              Snack — {formatIDR(snackPrice)}
            </p>
            <select
              className="w-full border border-gray-300 rounded-md px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-orange-400"
              value={selection.snack_id}
              onChange={(e) => onChange({ ...selection, snack_id: e.target.value })}
            >
              <option value="">No snack</option>
              {snacks.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.name}
                </option>
              ))}
            </select>
          </div>

          {/* Juice */}
          <div>
            <p className="text-xs font-semibold uppercase tracking-wide text-gray-500 mb-1">
              Juice — {formatIDR(juicePrice)}
            </p>
            <select
              className="w-full border border-gray-300 rounded-md px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-orange-400"
              value={selection.juice_id}
              onChange={(e) => onChange({ ...selection, juice_id: e.target.value })}
            >
              <option value="">No juice</option>
              {juices.map((j) => (
                <option key={j.id} value={j.id}>
                  {j.name}
                </option>
              ))}
            </select>
          </div>
        </div>
      )}
    </div>
  )
}

interface WeekAccordionProps {
  weekLabel: string
  weekNumber: number
  dates: string[]
  isOpen: boolean
  onToggle: () => void
  menuDayMap: Record<string, MenuDay>
  holidayMap: Record<string, Holiday>
  dailyAvailable: DailyAvailable[]
  snacks: Snack[]
  juices: Juice[]
  selections: Record<string, DayOrderSelection>
  onSelectionChange: (date: string, sel: DayOrderSelection) => void
  prices: Price[]
  levelId: string
  dietSurcharge: number
}

function WeekAccordion({
  weekLabel,
  weekNumber,
  dates,
  isOpen,
  onToggle,
  menuDayMap,
  holidayMap,
  dailyAvailable,
  snacks,
  juices,
  selections,
  onSelectionChange,
  prices,
  levelId,
  dietSurcharge,
}: WeekAccordionProps) {
  const lunchPrice = getPriceForLevel(prices, levelId, 'lunch')
  const snackPrice = getPriceForLevel(prices, levelId, 'snack')
  const juicePrice = getPriceForLevel(prices, levelId, 'juice')

  const weekTotal = dates.reduce((sum, date) => {
    const sel = selections[date]
    if (!sel) return sum
    const holiday = holidayMap[date]
    const past = isPastDate(date)
    if (holiday || past) return sum
    const hasLunch = sel.lunch_choice !== 'none' && sel.lunch_choice !== ''
    return (
      sum +
      (hasLunch ? lunchPrice + (dietSurcharge > 0 ? dietSurcharge : 0) : 0) +
      (sel.snack_id ? snackPrice : 0) +
      (sel.juice_id ? juicePrice : 0)
    )
  }, 0)

  return (
    <div className="mb-4 rounded-xl overflow-hidden border border-gray-200 shadow-sm">
      <button
        onClick={onToggle}
        className="w-full flex items-center justify-between px-4 py-3 bg-orange-500 hover:bg-orange-600 transition-colors text-white"
      >
        <span className="font-semibold text-base">{weekLabel}</span>
        <div className="flex items-center gap-3">
          {weekTotal > 0 && (
            <span className="text-sm font-medium bg-orange-600 bg-opacity-50 px-2 py-0.5 rounded">
              {formatIDR(weekTotal)}
            </span>
          )}
          <svg
            className={`w-5 h-5 transition-transform ${isOpen ? 'rotate-180' : ''}`}
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
          >
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
          </svg>
        </div>
      </button>

      {isOpen && (
        <div className="p-4 bg-gray-50">
          {dates.map((date) => {
            const holiday = holidayMap[date]
            const past = isPastDate(date)
            const disabled = !!holiday || past
            return (
              <DayRow
                key={date}
                date={date}
                menuDay={menuDayMap[date]}
                dailyAvailable={dailyAvailable}
                snacks={snacks}
                juices={juices}
                selection={
                  selections[date] || {
                    date,
                    lunch_choice: 'none',
                    daily_available_id: '',
                    snack_id: '',
                    juice_id: '',
                  }
                }
                onChange={(sel) => onSelectionChange(date, sel)}
                disabled={disabled}
                holidayName={holiday?.name ?? null}
                prices={prices}
                levelId={levelId}
                dietSurcharge={dietSurcharge}
              />
            )
          })}
        </div>
      )}
    </div>
  )
}

// ─── Main page ────────────────────────────────────────────────────────────────

export default function SchoolOrderPage() {
  const params = useParams()
  const router = useRouter()
  const schoolSlug = params.school as string
  const { user, loading: authLoading, profile, signOut } = useAuth()

  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [pageData, setPageData] = useState<PageData | null>(null)

  // Existing students for this user
  const [existingStudents, setExistingStudents] = useState<Student[]>([])
  const [selectedStudentId, setSelectedStudentId] = useState<string | null>(null)
  const [loadingStudents, setLoadingStudents] = useState(false)

  // formStep: 'select-child' | 'new-child' | 'menu'
  // (auth step removed — handled by home page)

  // Student form
  const [student, setStudent] = useState<StudentFormData>({
    student_name: '',
    class_name: '',
    level_id: '',
    parent_name: '',
    parent_email: '',
    parent_phone: '',
    diet_vegetarian: false,
    diet_vegan: false,
    diet_gluten_free: false,
    diet_dairy_free: false,
  })
  const [phoneError, setPhoneError] = useState<string | null>(null)

  // Day selections: date → DayOrderSelection
  const [selections, setSelections] = useState<Record<string, DayOrderSelection>>({})
  const [openWeeks, setOpenWeeks] = useState<Record<number, boolean>>({ 0: true })
  const [submitting, setSubmitting] = useState(false)
  const [submitError, setSubmitError] = useState<string | null>(null)

  // formStep: 'select-child' | 'new-child' | 'menu'
  const [formStep, setFormStep] = useState<'select-child' | 'new-child' | 'menu'>('select-child')

  // ── Load page data ──
  useEffect(() => {
    async function loadData() {
      setLoading(true)
      setError(null)

      try {
        const { data: school, error: schoolErr } = await supabase
          .from('schools')
          .select('*')
          .eq('slug', schoolSlug)
          .eq('active', true)
          .single()

        if (schoolErr || !school) {
          setError('School not found. Please check the URL.')
          setLoading(false)
          return
        }

        const [
          { data: levels },
          { data: prices },
          { data: terms },
          { data: holidays },
          { data: menuDays },
          { data: dailyAvailable },
          { data: snacks },
          { data: juices },
        ] = await Promise.all([
          supabase.from('school_levels').select('*').eq('school_id', school.id).order('sort_order'),
          supabase.from('prices').select('*').eq('school_id', school.id),
          supabase.from('terms').select('*').eq('school_id', school.id).eq('active', true).order('start_date'),
          supabase.from('holidays').select('*').eq('school_id', school.id).order('date'),
          supabase.from('menu_days').select('*').eq('school_id', school.id).order('date'),
          supabase.from('daily_available').select('*').eq('school_id', school.id).eq('active', true).order('sort_order'),
          supabase.from('snacks').select('*').eq('school_id', school.id).eq('active', true).order('sort_order'),
          supabase.from('juices').select('*').eq('school_id', school.id).eq('active', true).order('sort_order'),
        ])

        if (!terms || terms.length === 0) {
          setError('No active term found for this school.')
          setLoading(false)
          return
        }

        const term = terms[0]

        setPageData({
          school,
          levels: levels || [],
          prices: prices || [],
          term,
          holidays: holidays || [],
          menuDays: menuDays || [],
          dailyAvailable: dailyAvailable || [],
          snacks: snacks || [],
          juices: juices || [],
        })

        if (levels && levels.length === 1) {
          setStudent((prev) => ({ ...prev, level_id: levels[0].id }))
        }
      } catch (e) {
        setError('Failed to load school data. Please try again.')
      }

      setLoading(false)
    }

    loadData()
  }, [schoolSlug])

  // ── Handle auth state changes ──
  useEffect(() => {
    if (authLoading) return

    if (!user) {
      // Not logged in — send to home to authenticate
      router.replace('/')
      return
    }

    // Profile incomplete — redirect to account page to complete it
    if (profile !== undefined && (!profile?.school_id || !profile?.phone)) {
      router.replace('/account')
      return
    }

    // If user's profile school doesn't match this page's school, redirect to their school
    if (profile?.school_id && pageData) {
      if (profile.school_id !== pageData.school.id) {
        supabase
          .from('schools')
          .select('slug')
          .eq('id', profile.school_id)
          .single()
          .then(({ data: school }) => {
            if (school?.slug) {
              window.location.href = `/${school.slug}`
            }
          })
        return
      }
    }

    // User is logged in and on correct school page - determine next step
    handleUserLoggedIn(user.id, user.email ?? '')
  }, [user, authLoading, profile, pageData])

  async function handleUserLoggedIn(userId: string, userEmail: string) {
    setLoadingStudents(true)
    const { data: students } = await supabase
      .from('students')
      .select('*')
      .eq('user_id', userId)
      .order('created_at', { ascending: false })
    setLoadingStudents(false)

    if (students && students.length > 0) {
      setExistingStudents(students)
      setFormStep('select-child')
    } else {
      // Pre-fill email from auth
      setStudent((prev) => ({ ...prev, parent_email: userEmail }))
      setFormStep('new-child')
    }
  }

  // Get the active student data (either from existing or from form)
  const activeStudent: StudentFormData | null = (() => {
    if (formStep === 'menu' && selectedStudentId) {
      const s = existingStudents.find((s) => s.id === selectedStudentId)
      if (s) {
        return {
          student_name: s.student_name,
          class_name: s.class_name ?? '',
          level_id: s.level_id,
          parent_name: s.parent_name ?? '',
          parent_email: s.parent_email ?? '',
          parent_phone: s.parent_phone ?? '',
          diet_vegetarian: s.diet_vegetarian,
          diet_vegan: s.diet_vegan,
          diet_gluten_free: s.diet_gluten_free,
          diet_dairy_free: s.diet_dairy_free,
        }
      }
    }
    if (formStep === 'menu') return student
    return null
  })()

  // ── Computed values ──
  const weekDates = pageData
    ? getWeekdaysBetween(pageData.term.start_date, pageData.term.end_date)
    : []
  const weekGroups = groupByWeek(weekDates)

  const menuDayMap: Record<string, MenuDay> = {}
  pageData?.menuDays.forEach((md) => { menuDayMap[md.date] = md })

  const holidayMap: Record<string, Holiday> = {}
  pageData?.holidays.forEach((h) => { holidayMap[h.date] = h })

  const effectiveStudent = activeStudent ?? student
  const dietSurcharge = pageData
    ? getDietSurcharge(effectiveStudent, pageData.prices, effectiveStudent.level_id)
    : 0

  const lunchPrice = pageData ? getPriceForLevel(pageData.prices, effectiveStudent.level_id, 'lunch') : 0
  const snackPrice = pageData ? getPriceForLevel(pageData.prices, effectiveStudent.level_id, 'snack') : 0
  const juicePrice = pageData ? getPriceForLevel(pageData.prices, effectiveStudent.level_id, 'juice') : 0

  const grandTotal = Object.entries(selections).reduce((sum, [date, sel]) => {
    const holiday = holidayMap[date]
    const past = isPastDate(date)
    if (holiday || past) return sum
    const hasLunch = sel.lunch_choice !== 'none' && sel.lunch_choice !== ''
    return (
      sum +
      (hasLunch ? lunchPrice + (dietSurcharge > 0 ? dietSurcharge : 0) : 0) +
      (sel.snack_id ? snackPrice : 0) +
      (sel.juice_id ? juicePrice : 0)
    )
  }, 0)

  const handleSelectionChange = useCallback((date: string, sel: DayOrderSelection) => {
    setSelections((prev) => ({ ...prev, [date]: sel }))
  }, [])

  // ── Student form validation ──
  const studentFormValid =
    student.student_name.trim() !== '' &&
    student.level_id !== '' &&
    student.parent_name.trim() !== '' &&
    student.parent_email.trim() !== '' &&
    student.parent_phone.trim() !== ''

  function handleContinueToMenu() {
    if (!student.parent_phone.trim()) {
      setPhoneError('Phone number is required.')
      return
    }
    setPhoneError(null)
    setFormStep('menu')
  }

  // ── Submit / checkout ──
  async function handleCheckout() {
    if (!pageData || !user) return
    setSubmitting(true)
    setSubmitError(null)

    try {
      let studentId: string

      if (selectedStudentId && formStep === 'menu') {
        // Use existing student
        studentId = selectedStudentId
      } else {
        // Validate phone
        if (!student.parent_phone.trim()) {
          setSubmitError('Phone number is required.')
          setSubmitting(false)
          return
        }

        // Insert new student with user_id
        const { data: insertedStudent, error: studentErr } = await supabase
          .from('students')
          .insert({
            school_id: pageData.school.id,
            level_id: student.level_id,
            student_name: student.student_name,
            class_name: student.class_name || null,
            parent_name: student.parent_name,
            parent_email: student.parent_email,
            parent_phone: student.parent_phone,
            diet_vegetarian: student.diet_vegetarian,
            diet_vegan: student.diet_vegan,
            diet_gluten_free: student.diet_gluten_free,
            diet_dairy_free: student.diet_dairy_free,
            user_id: user.id,
          })
          .select()
          .single()

        if (studentErr || !insertedStudent) {
          throw new Error('Failed to save student details.')
        }
        studentId = insertedStudent.id
      }

      // Build order items
      const orderItemsData = Object.entries(selections)
        .filter(([date, sel]) => {
          const holiday = holidayMap[date]
          const past = isPastDate(date)
          if (holiday || past) return false
          const hasLunch = sel.lunch_choice !== 'none' && sel.lunch_choice !== ''
          return hasLunch || sel.snack_id || sel.juice_id
        })
        .map(([date, sel]) => {
          const hasLunch = sel.lunch_choice !== 'none' && sel.lunch_choice !== ''
          const lunchAmt = hasLunch ? lunchPrice : 0
          const snackAmt = sel.snack_id ? snackPrice : 0
          const juiceAmt = sel.juice_id ? juicePrice : 0
          const surcharge = hasLunch ? dietSurcharge : 0
          return {
            date,
            lunch_choice: sel.lunch_choice || 'none',
            daily_available_id:
              sel.lunch_choice === 'daily_available' && sel.daily_available_id
                ? sel.daily_available_id
                : null,
            snack_id: sel.snack_id || null,
            juice_id: sel.juice_id || null,
            lunch_price_idr: lunchAmt,
            snack_price_idr: snackAmt,
            juice_price_idr: juiceAmt,
            diet_surcharge_idr: surcharge,
            total_idr: lunchAmt + snackAmt + juiceAmt + surcharge,
          }
        })

      if (orderItemsData.length === 0) {
        setSubmitError('Please select at least one item to order.')
        setSubmitting(false)
        return
      }

      // Insert order
      const { data: order, error: orderErr } = await supabase
        .from('orders')
        .insert({
          student_id: studentId,
          school_id: pageData.school.id,
          term_id: pageData.term.id,
          total_idr: grandTotal,
          payment_status: 'pending',
          payment_method: 'stripe',
        })
        .select()
        .single()

      if (orderErr || !order) {
        throw new Error('Failed to create order.')
      }

      // Insert order items
      const itemsWithOrderId = orderItemsData.map((item) => ({
        ...item,
        order_id: order.id,
      }))

      const { error: itemsErr } = await supabase.from('order_items').insert(itemsWithOrderId)

      if (itemsErr) {
        throw new Error('Failed to save order items.')
      }

      // Send order confirmation email (non-blocking)
      try {
        await fetch('/api/send-order-confirmation', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ orderId: order.id }),
        })
      } catch (emailErr) {
        console.warn('Order confirmation email failed (non-fatal):', emailErr)
      }

      // Create Stripe checkout session
      const displayStudent = activeStudent ?? student
      const response = await fetch('/api/checkout', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          orderId: order.id,
          totalIdr: grandTotal,
          schoolName: pageData.school.name,
          studentName: displayStudent.student_name,
          termName: pageData.term.name,
          itemCount: orderItemsData.length,
        }),
      })

      const { url, error: checkoutError } = await response.json()

      if (checkoutError) {
        setSubmitError(`Payment setup failed: ${checkoutError}`)
        setSubmitting(false)
        return
      }

      window.location.href = url
    } catch (e: unknown) {
      setSubmitError(e instanceof Error ? e.message : 'An unexpected error occurred.')
      setSubmitting(false)
    }
  }

  // ── Render ──
  if (loading || authLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center">
          <div className="inline-block w-10 h-10 border-4 border-orange-500 border-t-transparent rounded-full animate-spin mb-4" />
          <p className="text-gray-600">Loading menu…</p>
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50 p-4">
        <div className="bg-white rounded-xl shadow-sm border border-red-200 p-8 max-w-md text-center">
          <p className="text-2xl mb-2">🍽️</p>
          <h2 className="text-xl font-semibold text-gray-800 mb-2">Oops!</h2>
          <p className="text-red-600">{error}</p>
        </div>
      </div>
    )
  }

  if (!pageData) return null

  const { school, levels, prices, term, dailyAvailable, snacks, juices } = pageData

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-orange-500 shadow-md">
        <div className="max-w-2xl mx-auto px-4 py-5">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-white rounded-full flex items-center justify-center shadow">
                <span className="text-orange-500 font-bold text-lg">C</span>
              </div>
              <div>
                <h1 className="text-white font-bold text-xl leading-tight">Cantina</h1>
                <p className="text-orange-100 text-sm">{school.name}</p>
              </div>
            </div>
            {user && (
              <div className="flex items-center gap-3">
                <span className="text-orange-100 text-xs hidden sm:block truncate max-w-[160px]">
                  {user.email}
                </span>
                <button
                  onClick={() => signOut()}
                  className="text-xs text-white bg-orange-600 hover:bg-orange-700 px-3 py-1.5 rounded-lg transition-colors font-medium"
                >
                  Sign out
                </button>
              </div>
            )}
          </div>
        </div>
      </header>

      <main className="max-w-2xl mx-auto px-4 py-6">
        {/* Term banner */}
        <div className="bg-white rounded-xl border border-orange-200 p-4 mb-6 flex items-center justify-between">
          <div>
            <p className="text-xs text-gray-500 uppercase tracking-wide font-medium">Ordering for</p>
            <p className="font-semibold text-gray-800">{term.name}</p>
            <p className="text-xs text-gray-500 mt-0.5">
              {new Date(term.start_date).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })}
              {' – '}
              {new Date(term.end_date).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })}
            </p>
          </div>
          <div className="text-right">
            <p className="text-xs text-gray-500">Lunch</p>
            {levels.map((lvl) => {
              const p = prices.find((pr) => pr.level_id === lvl.id && pr.item_type === 'lunch')
              return p ? (
                <p key={lvl.id} className="text-sm font-semibold text-orange-600">
                  {lvl.name}: {formatIDR(p.price_idr)}
                </p>
              ) : null
            })}
          </div>
        </div>

        {/* ── Loading students ── */}
        {loadingStudents && (
          <div className="flex items-center justify-center py-12">
            <div className="w-8 h-8 border-4 border-orange-500 border-t-transparent rounded-full animate-spin" />
          </div>
        )}

        {/* ── Select child step ── */}
        {!loadingStudents && formStep === 'select-child' && (
          <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-5">
            <h2 className="text-lg font-semibold text-gray-800 mb-1">Welcome back!</h2>
            <p className="text-sm text-gray-500 mb-4">Select a child to order for, or add a new one.</p>

            <div className="space-y-3 mb-4">
              {existingStudents.map((s) => {
                const levelName = levels.find((l) => l.id === s.level_id)?.name
                const isSelected = selectedStudentId === s.id
                return (
                  <button
                    key={s.id}
                    onClick={() => setSelectedStudentId(s.id)}
                    className={`w-full text-left p-4 rounded-xl border-2 transition-colors ${
                      isSelected
                        ? 'border-orange-500 bg-orange-50'
                        : 'border-gray-200 hover:border-orange-300 bg-white'
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="font-semibold text-gray-800">{s.student_name}</p>
                        <p className="text-sm text-gray-500">
                          {levelName}{s.class_name ? ` · ${s.class_name}` : ''}
                        </p>
                        <div className="flex gap-1 mt-1 flex-wrap">
                          {s.diet_vegan && <DietBadge label="Vegan" />}
                          {s.diet_vegetarian && <DietBadge label="Vegetarian" />}
                          {s.diet_gluten_free && <DietBadge label="Gluten-free" />}
                          {s.diet_dairy_free && <DietBadge label="Dairy-free" />}
                        </div>
                      </div>
                      <div className={`w-5 h-5 rounded-full border-2 flex-shrink-0 ${isSelected ? 'border-orange-500 bg-orange-500' : 'border-gray-300'}`}>
                        {isSelected && (
                          <svg className="w-full h-full text-white p-0.5" viewBox="0 0 20 20" fill="currentColor">
                            <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                          </svg>
                        )}
                      </div>
                    </div>
                  </button>
                )
              })}
            </div>

            <button
              onClick={() => {
                setSelectedStudentId(null)
                setStudent((prev) => ({ ...prev, parent_email: user?.email ?? '' }))
                setFormStep('new-child')
              }}
              className="w-full border-2 border-dashed border-gray-300 hover:border-orange-400 text-gray-500 hover:text-orange-600 font-medium py-3 rounded-xl transition-colors text-sm mb-4"
            >
              + Add another child
            </button>

            <button
              onClick={() => {
                if (selectedStudentId) setFormStep('menu')
              }}
              disabled={!selectedStudentId}
              className="w-full bg-orange-500 hover:bg-orange-600 disabled:bg-gray-300 disabled:cursor-not-allowed text-white font-semibold py-3 rounded-xl transition-colors text-sm"
            >
              Continue to Menu Selection →
            </button>
          </div>
        )}

        {/* ── New child form ── */}
        {!loadingStudents && formStep === 'new-child' && (
          <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-5">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-semibold text-gray-800">Child Details</h2>
              {existingStudents.length > 0 && (
                <button
                  onClick={() => setFormStep('select-child')}
                  className="text-sm text-orange-500 hover:text-orange-700 font-medium"
                >
                  ← Back
                </button>
              )}
            </div>

            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <div className="sm:col-span-2">
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Student Name <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-orange-400"
                  placeholder="e.g. Sasha Doe"
                  value={student.student_name}
                  onChange={(e) => setStudent((p) => ({ ...p, student_name: e.target.value }))}
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Class</label>
                <input
                  type="text"
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-orange-400"
                  placeholder="e.g. Year 5B"
                  value={student.class_name}
                  onChange={(e) => setStudent((p) => ({ ...p, class_name: e.target.value }))}
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Level <span className="text-red-500">*</span>
                </label>
                <select
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-orange-400"
                  value={student.level_id}
                  onChange={(e) => setStudent((p) => ({ ...p, level_id: e.target.value }))}
                >
                  <option value="">Select level…</option>
                  {levels.map((lvl) => (
                    <option key={lvl.id} value={lvl.id}>
                      {lvl.name}
                    </option>
                  ))}
                </select>
              </div>

              <div className="sm:col-span-2">
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Parent / Guardian Name <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-orange-400"
                  placeholder="e.g. Jane Doe"
                  value={student.parent_name}
                  onChange={(e) => setStudent((p) => ({ ...p, parent_name: e.target.value }))}
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Parent Email <span className="text-red-500">*</span>
                </label>
                <input
                  type="email"
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-orange-400 bg-gray-50"
                  placeholder="jane@example.com"
                  value={student.parent_email}
                  readOnly
                />
                <p className="text-xs text-gray-400 mt-0.5">Filled from your account</p>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Phone / WhatsApp <span className="text-red-500">*</span>
                </label>
                <input
                  type="tel"
                  className={`w-full border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-orange-400 ${phoneError ? 'border-red-400' : 'border-gray-300'}`}
                  placeholder="+62 812 000 0000"
                  value={student.parent_phone}
                  onChange={(e) => {
                    setStudent((p) => ({ ...p, parent_phone: e.target.value }))
                    if (e.target.value.trim()) setPhoneError(null)
                  }}
                />
                {phoneError && <p className="text-xs text-red-500 mt-0.5">{phoneError}</p>}
              </div>
            </div>

            {/* Dietary requirements */}
            <div className="mt-5">
              <p className="text-sm font-medium text-gray-700 mb-2">Dietary Requirements</p>
              <p className="text-xs text-gray-500 mb-3">
                A surcharge of Rp 15.000/day applies for Vegan and Gluten-free meals.
              </p>
              <div className="grid grid-cols-2 gap-2">
                {[
                  { key: 'diet_vegetarian', label: 'Vegetarian' },
                  { key: 'diet_vegan', label: 'Vegan (+Rp 15k)' },
                  { key: 'diet_gluten_free', label: 'Gluten-free (+Rp 15k)' },
                  { key: 'diet_dairy_free', label: 'Dairy-free' },
                ].map(({ key, label }) => (
                  <label key={key} className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="checkbox"
                      className="accent-orange-500 w-4 h-4"
                      checked={student[key as keyof StudentFormData] as boolean}
                      onChange={(e) =>
                        setStudent((p) => ({ ...p, [key]: e.target.checked }))
                      }
                    />
                    <span className="text-sm text-gray-700">{label}</span>
                  </label>
                ))}
              </div>
              {student.diet_vegan && (
                <div className="mt-2 flex gap-1 flex-wrap">
                  <DietBadge label="Vegan" />
                </div>
              )}
              {student.diet_gluten_free && (
                <div className="mt-2 flex gap-1 flex-wrap">
                  <DietBadge label="Gluten-free" />
                </div>
              )}
            </div>

            <button
              onClick={handleContinueToMenu}
              disabled={!studentFormValid}
              className="mt-6 w-full bg-orange-500 hover:bg-orange-600 disabled:bg-gray-300 disabled:cursor-not-allowed text-white font-semibold py-3 rounded-xl transition-colors text-sm"
            >
              Continue to Menu Selection →
            </button>
          </div>
        )}

        {/* ── Menu step ── */}
        {formStep === 'menu' && (
          <div>
            {/* Ordering-for bar */}
            {(() => {
              const display = activeStudent
              if (!display) return null
              const levelName = levels.find((l) => l.id === display.level_id)?.name
              return (
                <div className="bg-white rounded-xl border border-gray-200 p-4 mb-4 flex items-center justify-between">
                  <div>
                    <p className="text-xs text-gray-500 uppercase tracking-wide font-medium mb-0.5">Ordering for</p>
                    <p className="font-semibold text-gray-800">{display.student_name}</p>
                    <p className="text-sm text-gray-500">
                      {levelName}{display.class_name ? ` · ${display.class_name}` : ''}
                      {' · '}{user?.email}
                    </p>
                    <div className="flex gap-1 mt-1 flex-wrap">
                      {display.diet_vegan && <DietBadge label="Vegan" />}
                      {display.diet_vegetarian && <DietBadge label="Vegetarian" />}
                      {display.diet_gluten_free && <DietBadge label="Gluten-free" />}
                      {display.diet_dairy_free && <DietBadge label="Dairy-free" />}
                    </div>
                  </div>
                  <button
                    onClick={() => {
                      setSelectedStudentId(null)
                      setFormStep(existingStudents.length > 0 ? 'select-child' : 'new-child')
                    }}
                    className="text-sm text-orange-500 hover:text-orange-700 font-medium flex-shrink-0 ml-3"
                  >
                    Change
                  </button>
                </div>
              )
            })()}

            {/* Week accordions */}
            {weekGroups.map((weekDates, idx) => (
              <WeekAccordion
                key={idx}
                weekNumber={idx + 1}
                weekLabel={getWeekLabel(weekDates, idx + 1)}
                dates={weekDates}
                isOpen={openWeeks[idx] ?? false}
                onToggle={() =>
                  setOpenWeeks((prev) => ({ ...prev, [idx]: !prev[idx] }))
                }
                menuDayMap={menuDayMap}
                holidayMap={holidayMap}
                dailyAvailable={dailyAvailable}
                snacks={snacks}
                juices={juices}
                selections={selections}
                onSelectionChange={handleSelectionChange}
                prices={prices}
                levelId={effectiveStudent.level_id}
                dietSurcharge={dietSurcharge}
              />
            ))}

            {/* Order summary & checkout */}
            <div className="sticky bottom-0 bg-white border-t border-gray-200 rounded-t-2xl shadow-xl p-5 -mx-4 mt-4">
              <div className="flex items-center justify-between mb-3">
                <div>
                  <p className="text-sm text-gray-500">
                    {Object.values(selections).filter((s) => {
                      const h = holidayMap[s.date]
                      const p = isPastDate(s.date)
                      if (h || p) return false
                      return (
                        (s.lunch_choice !== 'none' && s.lunch_choice !== '') ||
                        s.snack_id ||
                        s.juice_id
                      )
                    }).length}{' '}
                    days selected
                  </p>
                  <p className="text-2xl font-bold text-gray-900">
                    {formatIDR(grandTotal)}
                  </p>
                </div>
                <button
                  onClick={handleCheckout}
                  disabled={submitting || grandTotal === 0}
                  className="bg-orange-500 hover:bg-orange-600 disabled:bg-gray-300 disabled:cursor-not-allowed text-white font-semibold px-6 py-3 rounded-xl transition-colors text-sm"
                >
                  {submitting ? (
                    <span className="flex items-center gap-2">
                      <span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                      Processing…
                    </span>
                  ) : (
                    'Proceed to Payment'
                  )}
                </button>
              </div>

              {submitError && (
                <div className="bg-red-50 border border-red-200 rounded-lg px-3 py-2 text-sm text-red-600">
                  {submitError}
                </div>
              )}
            </div>
          </div>
        )}
      </main>
    </div>
  )
}
