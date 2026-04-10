'use client'

import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase'
import { formatIDR, formatOrderDate } from '@/lib/utils'
import { format } from 'date-fns'
import AdminGuard from '@/components/AdminGuard'

interface SchoolOption {
  id: string
  name: string
  slug: string
}

interface OrderSummary {
  menu1Count: number
  menu2Count: number
  dailyAvailable: Record<string, number>
  snacks: Record<string, number>
  juices: Record<string, number>
  totalLunches: number
}

interface StudentOrder {
  studentName: string
  className: string
  lunchChoice: string
  lunchName: string
  snackName: string
  juiceName: string
  dietFlags: string[]
  totalIdr: number
}

export default function OrdersPage() {
  const [schools, setSchools] = useState<SchoolOption[]>([])
  const [selectedSchool, setSelectedSchool] = useState<string>('')
  const [selectedDate, setSelectedDate] = useState(format(new Date(), 'yyyy-MM-dd'))
  const [loading, setLoading] = useState(false)
  const [summary, setSummary] = useState<OrderSummary | null>(null)
  const [studentOrders, setStudentOrders] = useState<StudentOrder[]>([])

  // Load schools
  useEffect(() => {
    supabase
      .from('schools')
      .select('id, name, slug')
      .eq('active', true)
      .order('name')
      .then(({ data }) => {
        setSchools(data || [])
        if (data && data.length > 0) setSelectedSchool(data[0].id)
      })
  }, [])

  // Load orders for selected date + school
  useEffect(() => {
    if (!selectedSchool || !selectedDate) return

    async function loadOrders() {
      setLoading(true)

      const { data: items } = await supabase
        .from('order_items')
        .select(`
          *,
          orders!inner(
            student_id,
            payment_status,
            school_id,
            students(student_name, class_name, diet_vegetarian, diet_vegan, diet_gluten_free, diet_dairy_free),
            total_idr
          ),
          daily_available(name),
          snacks(name),
          juices(name)
        `)
        .eq('date', selectedDate)
        .eq('orders.school_id', selectedSchool)
        .in('orders.payment_status', ['paid', 'pending'])

      if (!items) {
        setSummary(null)
        setStudentOrders([])
        setLoading(false)
        return
      }

      // Also need menu_days for the date
      const { data: menuDay } = await supabase
        .from('menu_days')
        .select('menu1_name, menu2_name')
        .eq('school_id', selectedSchool)
        .eq('date', selectedDate)
        .single()

      // Build summary
      const summaryData: OrderSummary = {
        menu1Count: 0,
        menu2Count: 0,
        dailyAvailable: {},
        snacks: {},
        juices: {},
        totalLunches: 0,
      }

      const ordersData: StudentOrder[] = []

      for (const item of items) {
        const student = item.orders?.students
        const dietFlags: string[] = []
        if (student?.diet_vegan) dietFlags.push('Vegan')
        if (student?.diet_vegetarian) dietFlags.push('Vegetarian')
        if (student?.diet_gluten_free) dietFlags.push('GF')
        if (student?.diet_dairy_free) dietFlags.push('DF')

        let lunchName = ''
        if (item.lunch_choice === 'menu1') {
          summaryData.menu1Count++
          summaryData.totalLunches++
          lunchName = menuDay?.menu1_name || 'Menu 1'
        } else if (item.lunch_choice === 'menu2') {
          summaryData.menu2Count++
          summaryData.totalLunches++
          lunchName = menuDay?.menu2_name || 'Menu 2'
        } else if (item.lunch_choice === 'daily_available' && item.daily_available?.name) {
          const da = item.daily_available.name
          summaryData.dailyAvailable[da] = (summaryData.dailyAvailable[da] || 0) + 1
          summaryData.totalLunches++
          lunchName = da
        }

        if (item.snacks?.name) {
          const s = item.snacks.name
          summaryData.snacks[s] = (summaryData.snacks[s] || 0) + 1
        }

        if (item.juices?.name) {
          const j = item.juices.name
          summaryData.juices[j] = (summaryData.juices[j] || 0) + 1
        }

        ordersData.push({
          studentName: student?.student_name || 'Unknown',
          className: student?.class_name || '',
          lunchChoice: item.lunch_choice || 'none',
          lunchName,
          snackName: item.snacks?.name || '',
          juiceName: item.juices?.name || '',
          dietFlags,
          totalIdr: item.total_idr || 0,
        })
      }

      // Sort by class then name
      ordersData.sort((a, b) =>
        (a.className + a.studentName).localeCompare(b.className + b.studentName)
      )

      setSummary(summaryData)
      setStudentOrders(ordersData)
      setLoading(false)
    }

    loadOrders()
  }, [selectedSchool, selectedDate])

  return (
    <AdminGuard>
      <div className="p-6">
        <div className="mb-6">
          <h1 className="text-2xl font-bold text-gray-900">Orders</h1>
          <p className="text-gray-500 text-sm mt-0.5">View daily order summaries and student lists</p>
        </div>

        {/* Filters */}
        <div className="bg-white rounded-xl border border-gray-200 p-4 mb-6 flex flex-wrap gap-4 items-end">
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

        {loading ? (
          <div className="flex justify-center py-16">
            <div className="w-8 h-8 border-4 border-orange-500 border-t-transparent rounded-full animate-spin" />
          </div>
        ) : !summary ? (
          <div className="bg-white rounded-xl border border-gray-200 p-8 text-center text-gray-500">
            No orders found for this date and school.
          </div>
        ) : (
          <div className="space-y-4">
            {/* Summary cards */}
            <div className="bg-white rounded-xl border border-gray-200 p-5">
              <h2 className="font-semibold text-gray-800 mb-4">
                Summary — {formatOrderDate(selectedDate)} — {summary.totalLunches} lunches total
              </h2>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                {/* Lunch */}
                <div>
                  <p className="text-xs font-semibold uppercase tracking-wide text-gray-500 mb-2">Lunch</p>
                  <div className="space-y-1">
                    {summary.menu1Count > 0 && (
                      <div className="flex justify-between text-sm">
                        <span>Menu 1</span>
                        <span className="font-semibold text-orange-600">{summary.menu1Count}x</span>
                      </div>
                    )}
                    {summary.menu2Count > 0 && (
                      <div className="flex justify-between text-sm">
                        <span>Menu 2</span>
                        <span className="font-semibold text-orange-600">{summary.menu2Count}x</span>
                      </div>
                    )}
                    {Object.entries(summary.dailyAvailable).map(([name, count]) => (
                      <div key={name} className="flex justify-between text-sm">
                        <span>{name}</span>
                        <span className="font-semibold text-orange-600">{count}x</span>
                      </div>
                    ))}
                    {summary.totalLunches === 0 && (
                      <p className="text-gray-400 text-sm">None</p>
                    )}
                  </div>
                </div>

                {/* Snacks */}
                <div>
                  <p className="text-xs font-semibold uppercase tracking-wide text-gray-500 mb-2">Snacks</p>
                  <div className="space-y-1">
                    {Object.entries(summary.snacks).map(([name, count]) => (
                      <div key={name} className="flex justify-between text-sm">
                        <span>{name}</span>
                        <span className="font-semibold text-orange-600">{count}x</span>
                      </div>
                    ))}
                    {Object.keys(summary.snacks).length === 0 && (
                      <p className="text-gray-400 text-sm">None</p>
                    )}
                  </div>
                </div>

                {/* Juices */}
                <div>
                  <p className="text-xs font-semibold uppercase tracking-wide text-gray-500 mb-2">Juices</p>
                  <div className="space-y-1">
                    {Object.entries(summary.juices).map(([name, count]) => (
                      <div key={name} className="flex justify-between text-sm">
                        <span>{name}</span>
                        <span className="font-semibold text-orange-600">{count}x</span>
                      </div>
                    ))}
                    {Object.keys(summary.juices).length === 0 && (
                      <p className="text-gray-400 text-sm">None</p>
                    )}
                  </div>
                </div>
              </div>
            </div>

            {/* Student list table */}
            <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
              <div className="px-5 py-3 border-b border-gray-100 flex items-center justify-between">
                <h2 className="font-semibold text-gray-800">
                  Student List ({studentOrders.length})
                </h2>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="bg-gray-50 border-b border-gray-100">
                      <th className="text-left px-4 py-2.5 font-medium text-gray-600">Student</th>
                      <th className="text-left px-4 py-2.5 font-medium text-gray-600">Class</th>
                      <th className="text-left px-4 py-2.5 font-medium text-gray-600">Lunch</th>
                      <th className="text-left px-4 py-2.5 font-medium text-gray-600">Snack</th>
                      <th className="text-left px-4 py-2.5 font-medium text-gray-600">Juice</th>
                      <th className="text-left px-4 py-2.5 font-medium text-gray-600">Diet</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-50">
                    {studentOrders.map((o, i) => (
                      <tr key={i} className="hover:bg-gray-50">
                        <td className="px-4 py-2.5 font-medium text-gray-800">{o.studentName}</td>
                        <td className="px-4 py-2.5 text-gray-500">{o.className}</td>
                        <td className="px-4 py-2.5">
                          {o.lunchChoice === 'none' ? (
                            <span className="text-gray-400">–</span>
                          ) : (
                            <span className="text-gray-700">{o.lunchName}</span>
                          )}
                        </td>
                        <td className="px-4 py-2.5 text-gray-700">{o.snackName || <span className="text-gray-400">–</span>}</td>
                        <td className="px-4 py-2.5 text-gray-700">{o.juiceName || <span className="text-gray-400">–</span>}</td>
                        <td className="px-4 py-2.5">
                          {o.dietFlags.length > 0 ? (
                            <div className="flex gap-1 flex-wrap">
                              {o.dietFlags.map((f) => (
                                <span
                                  key={f}
                                  className="px-1.5 py-0.5 bg-orange-100 text-orange-700 rounded text-xs font-medium"
                                >
                                  {f}
                                </span>
                              ))}
                            </div>
                          ) : (
                            <span className="text-gray-400">–</span>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}
      </div>
    </AdminGuard>
  )
}
