'use client'

import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase'
import { formatOrderDate } from '@/lib/utils'
import { format } from 'date-fns'
import AdminGuard from '@/components/AdminGuard'

interface KitchenItem {
  category: string
  name: string
  count: number
  dietBreakdown: Record<string, number>
}

interface SchoolOption {
  id: string
  name: string
}

export default function KitchenPage() {
  const [schools, setSchools] = useState<SchoolOption[]>([])
  const [selectedSchool, setSelectedSchool] = useState<string>('')
  const [selectedDate, setSelectedDate] = useState(format(new Date(), 'yyyy-MM-dd'))
  const [kitchenItems, setKitchenItems] = useState<KitchenItem[]>([])
  const [loading, setLoading] = useState(false)
  const [menuDay, setMenuDay] = useState<{ menu1_name: string; menu2_name: string } | null>(null)
  const [emailSending, setEmailSending] = useState(false)
  const [emailStatus, setEmailStatus] = useState<{ type: 'success' | 'error'; message: string } | null>(null)

  useEffect(() => {
    supabase
      .from('schools')
      .select('id, name')
      .eq('active', true)
      .order('name')
      .then(({ data }) => {
        setSchools(data || [])
        if (data && data.length > 0) setSelectedSchool(data[0].id)
      })
  }, [])

  useEffect(() => {
    if (!selectedSchool || !selectedDate) return

    async function loadKitchenData() {
      setLoading(true)

      const [{ data: items }, { data: md }] = await Promise.all([
        supabase
          .from('order_items')
          .select(`
            *,
            orders!inner(school_id, payment_status, students(diet_vegan, diet_vegetarian, diet_gluten_free, diet_dairy_free)),
            daily_available(name),
            snacks(name),
            juices(name)
          `)
          .eq('date', selectedDate)
          .eq('orders.school_id', selectedSchool)
          .eq('orders.payment_status', 'paid'),
        supabase
          .from('menu_days')
          .select('menu1_name, menu2_name')
          .eq('school_id', selectedSchool)
          .eq('date', selectedDate)
          .single(),
      ])

      setMenuDay(md || null)

      if (!items) {
        setKitchenItems([])
        setLoading(false)
        return
      }

      // Build kitchen quantities
      const counts: Record<string, KitchenItem> = {}

      function addItem(category: string, name: string, dietFlags: string[]) {
        const key = `${category}:${name}`
        if (!counts[key]) {
          counts[key] = { category, name, count: 0, dietBreakdown: {} }
        }
        counts[key].count++
        if (dietFlags.length > 0) {
          const label = dietFlags.join('+')
          counts[key].dietBreakdown[label] = (counts[key].dietBreakdown[label] || 0) + 1
        }
      }

      for (const item of items) {
        const student = item.orders?.students
        const dietFlags: string[] = []
        if (student?.diet_vegan) dietFlags.push('Vegan')
        if (student?.diet_gluten_free) dietFlags.push('GF')

        if (item.lunch_choice === 'menu1' && md?.menu1_name) {
          addItem('Lunch', md.menu1_name, dietFlags)
        } else if (item.lunch_choice === 'menu2' && md?.menu2_name) {
          addItem('Lunch', md.menu2_name, dietFlags)
        } else if (item.lunch_choice === 'daily_available' && item.daily_available?.name) {
          addItem('Lunch', item.daily_available.name, dietFlags)
        }

        if (item.snacks?.name) {
          addItem('Snack', item.snacks.name, [])
        }

        if (item.juices?.name) {
          addItem('Juice', item.juices.name, [])
        }
      }

      setKitchenItems(Object.values(counts).sort((a, b) => {
        if (a.category !== b.category) return a.category.localeCompare(b.category)
        return b.count - a.count
      }))
      setLoading(false)
    }

    loadKitchenData()
  }, [selectedSchool, selectedDate])

  const categories = ['Lunch', 'Snack', 'Juice']

  async function handleSendKitchenReport() {
    setEmailSending(true)
    setEmailStatus(null)
    try {
      const res = await fetch('/api/send-kitchen-report', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ date: selectedDate }),
      })
      const data = await res.json()
      if (!res.ok || data.error) {
        setEmailStatus({ type: 'error', message: data.error || 'Fehler beim Senden.' })
      } else {
        setEmailStatus({ type: 'success', message: 'Küchenbericht erfolgreich gesendet!' })
      }
    } catch {
      setEmailStatus({ type: 'error', message: 'Netzwerkfehler beim Senden.' })
    } finally {
      setEmailSending(false)
      setTimeout(() => setEmailStatus(null), 5000)
    }
  }

  return (
    <AdminGuard>
      <div className="p-6">
        {/* Header with action buttons */}
        <div className="mb-6 flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Kitchen List</h1>
            <p className="text-gray-500 text-sm mt-0.5">Quantities to prepare</p>
          </div>
          <div className="flex items-center gap-3 print:hidden">
            <button
              onClick={handleSendKitchenReport}
              disabled={emailSending}
              className="flex items-center gap-2 bg-orange-500 hover:bg-orange-600 disabled:bg-orange-300 text-white px-4 py-2 rounded-lg text-sm font-medium transition-colors"
            >
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
              </svg>
              {emailSending ? 'Sende...' : 'Email Küchenbericht senden'}
            </button>
            <button
              onClick={() => window.print()}
              className="flex items-center gap-2 bg-gray-800 hover:bg-gray-900 text-white px-4 py-2 rounded-lg text-sm font-medium transition-colors"
            >
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 17h2a2 2 0 002-2v-4a2 2 0 00-2-2H5a2 2 0 00-2 2v4a2 2 0 002 2h2m2 4h6a2 2 0 002-2v-4a2 2 0 00-2-2H9a2 2 0 00-2 2v4a2 2 0 002 2zm8-12V5a2 2 0 00-2-2H9a2 2 0 00-2 2v4h10z" />
              </svg>
              Print
            </button>
          </div>
        </div>

        {/* Email status toast */}
        {emailStatus && (
          <div className={`mb-4 px-4 py-3 rounded-lg text-sm font-medium print:hidden ${
            emailStatus.type === 'success'
              ? 'bg-green-50 border border-green-200 text-green-800'
              : 'bg-red-50 border border-red-200 text-red-800'
          }`}>
            {emailStatus.message}
          </div>
        )}

        {/* Filters */}
        <div className="bg-white rounded-xl border border-gray-200 p-4 mb-6 flex flex-wrap gap-4 print:hidden">
          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1">Date</label>
            <input
              type="date"
              className="border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-orange-400"
              value={selectedDate}
              onChange={(e) => setSelectedDate(e.target.value)}
            />
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1">School</label>
            <select
              className="border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-orange-400"
              value={selectedSchool}
              onChange={(e) => setSelectedSchool(e.target.value)}
            >
              {schools.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.name}
                </option>
              ))}
            </select>
          </div>
        </div>

        {/* Print header */}
        <div className="hidden print:block mb-6">
          <h2 className="text-xl font-bold">Cantina Kitchen List</h2>
          <p className="text-gray-600">{formatOrderDate(selectedDate)}</p>
          <p className="text-gray-600">{schools.find((s) => s.id === selectedSchool)?.name}</p>
          {menuDay && (
            <div className="mt-2 text-sm">
              <p>Menu 1: {menuDay.menu1_name}</p>
              <p>Menu 2: {menuDay.menu2_name}</p>
            </div>
          )}
        </div>

        {loading ? (
          <div className="flex justify-center py-16 print:hidden">
            <div className="w-8 h-8 border-4 border-orange-500 border-t-transparent rounded-full animate-spin" />
          </div>
        ) : kitchenItems.length === 0 ? (
          <div className="bg-white rounded-xl border border-gray-200 p-8 text-center text-gray-500">
            No paid orders for this date and school.
          </div>
        ) : (
          <div className="space-y-4">
            {categories.map((cat) => {
              const items = kitchenItems.filter((i) => i.category === cat)
              if (items.length === 0) return null
              return (
                <div key={cat} className="bg-white rounded-xl border border-gray-200 overflow-hidden">
                  <div className="px-5 py-3 bg-orange-500 flex items-center justify-between">
                    <h2 className="font-semibold text-white">{cat}</h2>
                    <span className="text-orange-100 text-sm">
                      {items.reduce((s, i) => s + i.count, 0)} total
                    </span>
                  </div>
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="bg-gray-50 border-b border-gray-100">
                        <th className="text-left px-5 py-2.5 font-medium text-gray-600">Item</th>
                        <th className="text-center px-5 py-2.5 font-medium text-gray-600 w-20">Qty</th>
                        <th className="text-left px-5 py-2.5 font-medium text-gray-600">Diet notes</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-50">
                      {items.map((item, i) => (
                        <tr key={i} className="hover:bg-gray-50">
                          <td className="px-5 py-3 font-medium text-gray-800">{item.name}</td>
                          <td className="px-5 py-3 text-center">
                            <span className="inline-block min-w-[2rem] text-center bg-orange-100 text-orange-700 font-bold text-lg rounded-lg px-3 py-1">
                              {item.count}
                            </span>
                          </td>
                          <td className="px-5 py-3 text-gray-500">
                            {Object.entries(item.dietBreakdown).length > 0 ? (
                              <div className="flex gap-2 flex-wrap">
                                {Object.entries(item.dietBreakdown).map(([label, cnt]) => (
                                  <span
                                    key={label}
                                    className="px-2 py-0.5 bg-yellow-50 border border-yellow-200 text-yellow-700 rounded text-xs"
                                  >
                                    {label}: {cnt}
                                  </span>
                                ))}
                              </div>
                            ) : (
                              <span className="text-gray-300">–</span>
                            )}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )
            })}
          </div>
        )}
      </div>

      <style jsx global>{`
        @media print {
          body { font-size: 12pt; }
          .print\\:hidden { display: none !important; }
          .print\\:block { display: block !important; }
        }
      `}</style>
    </AdminGuard>
  )
}
