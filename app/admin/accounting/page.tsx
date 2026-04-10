'use client'

import { useEffect, useState, useCallback } from 'react'
import { supabase } from '@/lib/supabase'
import { formatIDR } from '@/lib/utils'
import { format, parseISO } from 'date-fns'
import AdminGuard from '@/components/AdminGuard'

// ─── Types ───────────────────────────────────────────────────────────────────

interface School {
  id: string
  name: string
}

interface OutstandingOrder {
  id: string
  created_at: string
  payment_status: 'pending' | 'failed'
  total_idr: number
  student: {
    student_name: string
    class_name: string
  } | null
  school: {
    name: string
  } | null
  term: {
    name: string
  } | null
}

interface MonthlyBreakdown {
  category: string
  orders: number
  amount: number
}

interface StudentMonthTotal {
  student_name: string
  class_name: string
  total: number
}

interface InvoiceOrder {
  id: string
  created_at: string
  payment_status: string
  total_idr: number
  student: {
    student_name: string
    class_name: string
  } | null
  school: {
    name: string
  } | null
}

// ─── Helpers ─────────────────────────────────────────────────────────────────

function StatusBadge({ status }: { status: string }) {
  if (status === 'pending') {
    return (
      <span className="px-2 py-0.5 rounded-full text-xs font-semibold bg-orange-100 text-orange-700">
        Pending
      </span>
    )
  }
  if (status === 'failed') {
    return (
      <span className="px-2 py-0.5 rounded-full text-xs font-semibold bg-red-100 text-red-700">
        Failed
      </span>
    )
  }
  return (
    <span className="px-2 py-0.5 rounded-full text-xs font-semibold bg-green-100 text-green-700">
      Paid
    </span>
  )
}

function shortId(id: string) {
  return id.substring(0, 8)
}

// ─── Tab 1: Outstanding Payments ─────────────────────────────────────────────

function OutstandingTab({ schools }: { schools: School[] }) {
  const [orders, setOrders] = useState<OutstandingOrder[]>([])
  const [loading, setLoading] = useState(true)
  const [schoolFilter, setSchoolFilter] = useState('all')
  const [statusFilter, setStatusFilter] = useState<'all' | 'pending' | 'failed'>('all')
  const [marking, setMarking] = useState<string | null>(null)

  const loadOrders = useCallback(async () => {
    setLoading(true)
    let query = supabase
      .from('orders')
      .select(`
        id,
        created_at,
        payment_status,
        total_idr,
        student:students(student_name, class_name),
        school:schools(name),
        term:terms(name)
      `)
      .in('payment_status', ['pending', 'failed'])
      .order('created_at', { ascending: false })

    if (schoolFilter !== 'all') {
      query = query.eq('school_id', schoolFilter)
    }
    if (statusFilter !== 'all') {
      query = query.eq('payment_status', statusFilter)
    }

    const { data } = await query
    setOrders((data as unknown as OutstandingOrder[]) || [])
    setLoading(false)
  }, [schoolFilter, statusFilter])

  useEffect(() => {
    loadOrders()
  }, [loadOrders])

  async function markAsPaid(orderId: string) {
    setMarking(orderId)
    await supabase
      .from('orders')
      .update({ payment_status: 'paid' })
      .eq('id', orderId)
    await loadOrders()
    setMarking(null)
  }

  function openInvoice(orderId: string) {
    window.open(`/api/invoice/${orderId}`, '_blank')
  }

  const totalOutstanding = orders.reduce((sum, o) => sum + (o.total_idr || 0), 0)

  return (
    <div className="space-y-4">
      {/* Filters */}
      <div className="bg-white rounded-xl border border-gray-200 p-4 flex flex-wrap gap-4 items-end">
        <div>
          <label className="block text-xs font-medium text-gray-600 mb-1">School</label>
          <select
            className="border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-orange-400"
            value={schoolFilter}
            onChange={(e) => setSchoolFilter(e.target.value)}
          >
            <option value="all">All Schools</option>
            {schools.map((s) => (
              <option key={s.id} value={s.id}>{s.name}</option>
            ))}
          </select>
        </div>
        <div>
          <label className="block text-xs font-medium text-gray-600 mb-1">Status</label>
          <select
            className="border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-orange-400"
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value as 'all' | 'pending' | 'failed')}
          >
            <option value="all">All</option>
            <option value="pending">Pending</option>
            <option value="failed">Failed</option>
          </select>
        </div>
      </div>

      {/* Summary bar */}
      <div className="bg-orange-50 border border-orange-200 rounded-xl px-5 py-3 flex items-center justify-between">
        <span className="text-sm font-medium text-orange-800">
          {orders.length} order{orders.length !== 1 ? 's' : ''} outstanding
        </span>
        <span className="text-base font-bold text-orange-700">
          Total: {formatIDR(totalOutstanding)}
        </span>
      </div>

      {/* Table */}
      <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
        {loading ? (
          <div className="flex justify-center py-16">
            <div className="w-8 h-8 border-4 border-orange-500 border-t-transparent rounded-full animate-spin" />
          </div>
        ) : orders.length === 0 ? (
          <div className="p-8 text-center text-gray-400 text-sm">
            No outstanding payments found.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-gray-50 border-b border-gray-100">
                  <th className="text-left px-4 py-3 font-medium text-gray-600">Date</th>
                  <th className="text-left px-4 py-3 font-medium text-gray-600">Student</th>
                  <th className="text-left px-4 py-3 font-medium text-gray-600">School</th>
                  <th className="text-left px-4 py-3 font-medium text-gray-600">Term/Period</th>
                  <th className="text-right px-4 py-3 font-medium text-gray-600">Total</th>
                  <th className="text-center px-4 py-3 font-medium text-gray-600">Status</th>
                  <th className="text-center px-4 py-3 font-medium text-gray-600">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {orders.map((order) => (
                  <tr key={order.id} className="hover:bg-gray-50">
                    <td className="px-4 py-3 text-gray-600 whitespace-nowrap">
                      {format(parseISO(order.created_at), 'dd MMM yyyy')}
                    </td>
                    <td className="px-4 py-3">
                      <div className="font-medium text-gray-800">
                        {order.student?.student_name || 'Unknown'}
                      </div>
                      <div className="text-xs text-gray-400">{order.student?.class_name || ''}</div>
                    </td>
                    <td className="px-4 py-3 text-gray-600">{order.school?.name || '—'}</td>
                    <td className="px-4 py-3 text-gray-600">{order.term?.name || '—'}</td>
                    <td className="px-4 py-3 text-right font-semibold text-gray-800">
                      {formatIDR(order.total_idr)}
                    </td>
                    <td className="px-4 py-3 text-center">
                      <StatusBadge status={order.payment_status} />
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center justify-center gap-2">
                        <button
                          onClick={() => markAsPaid(order.id)}
                          disabled={marking === order.id}
                          className="px-3 py-1.5 bg-green-500 hover:bg-green-600 text-white rounded-lg text-xs font-medium transition-colors disabled:opacity-50"
                        >
                          {marking === order.id ? 'Saving...' : 'Mark Paid'}
                        </button>
                        <button
                          onClick={() => openInvoice(order.id)}
                          className="px-3 py-1.5 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-lg text-xs font-medium transition-colors"
                        >
                          Send Invoice
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  )
}

// ─── Tab 2: Monthly Overview ──────────────────────────────────────────────────

function MonthlyTab({ schools }: { schools: School[] }) {
  const [selectedSchool, setSelectedSchool] = useState(schools[0]?.id || '')
  const [selectedMonth, setSelectedMonth] = useState(format(new Date(), 'yyyy-MM'))
  const [loading, setLoading] = useState(false)
  const [revenue, setRevenue] = useState(0)
  const [breakdown, setBreakdown] = useState<MonthlyBreakdown[]>([])
  const [studentTotals, setStudentTotals] = useState<StudentMonthTotal[]>([])

  const loadData = useCallback(async () => {
    if (!selectedSchool || !selectedMonth) return
    setLoading(true)

    const [year, month] = selectedMonth.split('-')
    const startDate = `${year}-${month}-01`
    // Get last day of month
    const lastDay = new Date(parseInt(year), parseInt(month), 0).getDate()
    const endDate = `${year}-${month}-${lastDay.toString().padStart(2, '0')}`

    const { data: items } = await supabase
      .from('order_items')
      .select(`
        date,
        lunch_price_idr,
        snack_price_idr,
        juice_price_idr,
        diet_surcharge_idr,
        total_idr,
        lunch_choice,
        snack_id,
        juice_id,
        orders!inner(
          payment_status,
          school_id,
          total_idr,
          students(student_name, class_name)
        )
      `)
      .eq('orders.school_id', selectedSchool)
      .eq('orders.payment_status', 'paid')
      .gte('date', startDate)
      .lte('date', endDate)

    if (!items || items.length === 0) {
      setRevenue(0)
      setBreakdown([])
      setStudentTotals([])
      setLoading(false)
      return
    }

    // Revenue = sum of all order total_idr (de-duped by order)
    const orderTotalsMap: Record<string, number> = {}
    const studentMap: Record<string, StudentMonthTotal> = {}

    let lunchOrders = 0
    let lunchAmount = 0
    let snackOrders = 0
    let snackAmount = 0
    let juiceOrders = 0
    let juiceAmount = 0

    for (const item of items as any[]) {
      const orderTotal = item.orders?.total_idr || 0
      const orderId = item.orders?.id
      // de-dup orders for revenue
      if (orderId && !orderTotalsMap[orderId]) {
        orderTotalsMap[orderId] = orderTotal
      }

      if (item.lunch_price_idr > 0) {
        lunchOrders++
        lunchAmount += item.lunch_price_idr + (item.diet_surcharge_idr || 0)
      }
      if (item.snack_id) {
        snackOrders++
        snackAmount += item.snack_price_idr || 0
      }
      if (item.juice_id) {
        juiceOrders++
        juiceAmount += item.juice_price_idr || 0
      }

      // Student totals — accumulate per item total
      const student = item.orders?.students
      const studentName = student?.student_name || 'Unknown'
      const className = student?.class_name || ''
      const key = `${studentName}__${className}`
      if (!studentMap[key]) {
        studentMap[key] = { student_name: studentName, class_name: className, total: 0 }
      }
      studentMap[key].total += item.total_idr || 0
    }

    const totalRevenue = Object.values(orderTotalsMap).reduce((a, b) => a + b, 0)

    const bd: MonthlyBreakdown[] = []
    if (lunchOrders > 0) bd.push({ category: 'Lunch', orders: lunchOrders, amount: lunchAmount })
    if (snackOrders > 0) bd.push({ category: 'Snack', orders: snackOrders, amount: snackAmount })
    if (juiceOrders > 0) bd.push({ category: 'Juice', orders: juiceOrders, amount: juiceAmount })

    const totalOrders = bd.reduce((s, r) => s + r.orders, 0)
    const totalAmount = bd.reduce((s, r) => s + r.amount, 0)
    bd.push({ category: 'Total', orders: totalOrders, amount: totalAmount })

    const sortedStudents = Object.values(studentMap).sort((a, b) =>
      (a.class_name + a.student_name).localeCompare(b.class_name + b.student_name)
    )

    setRevenue(totalRevenue)
    setBreakdown(bd)
    setStudentTotals(sortedStudents)
    setLoading(false)
  }, [selectedSchool, selectedMonth])

  useEffect(() => {
    loadData()
  }, [loadData])

  async function exportCSV() {
    if (!selectedSchool || !selectedMonth) return
    const url = `/api/export/${selectedSchool}?month=${selectedMonth}`
    const a = document.createElement('a')
    a.href = url
    a.download = `cantina-${selectedMonth}-${selectedSchool.substring(0, 8)}.csv`
    a.click()
  }

  return (
    <div className="space-y-4">
      {/* Controls */}
      <div className="bg-white rounded-xl border border-gray-200 p-4 flex flex-wrap gap-4 items-end">
        <div>
          <label className="block text-xs font-medium text-gray-600 mb-1">School</label>
          <select
            className="border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-orange-400"
            value={selectedSchool}
            onChange={(e) => setSelectedSchool(e.target.value)}
          >
            {schools.map((s) => (
              <option key={s.id} value={s.id}>{s.name}</option>
            ))}
          </select>
        </div>
        <div>
          <label className="block text-xs font-medium text-gray-600 mb-1">Month</label>
          <input
            type="month"
            className="border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-orange-400"
            value={selectedMonth}
            onChange={(e) => setSelectedMonth(e.target.value)}
          />
        </div>
        <button
          onClick={exportCSV}
          className="px-4 py-2 bg-orange-500 hover:bg-orange-600 text-white rounded-lg text-sm font-medium transition-colors flex items-center gap-2"
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
          </svg>
          Export CSV
        </button>
      </div>

      {loading ? (
        <div className="flex justify-center py-16">
          <div className="w-8 h-8 border-4 border-orange-500 border-t-transparent rounded-full animate-spin" />
        </div>
      ) : (
        <>
          {/* Revenue card */}
          <div className="bg-orange-50 border border-orange-200 rounded-xl p-5">
            <p className="text-xs font-semibold uppercase tracking-wide text-orange-600 mb-1">
              Total Revenue (Paid Orders)
            </p>
            <p className="text-3xl font-bold text-orange-700">{formatIDR(revenue)}</p>
          </div>

          {/* Breakdown table */}
          {breakdown.length > 0 && (
            <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
              <div className="px-5 py-3 border-b border-gray-100">
                <h3 className="font-semibold text-gray-800">Breakdown by Category</h3>
              </div>
              <table className="w-full text-sm">
                <thead>
                  <tr className="bg-gray-50 border-b border-gray-100">
                    <th className="text-left px-5 py-2.5 font-medium text-gray-600">Category</th>
                    <th className="text-right px-5 py-2.5 font-medium text-gray-600">Orders</th>
                    <th className="text-right px-5 py-2.5 font-medium text-gray-600">Amount IDR</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-50">
                  {breakdown.map((row, i) => (
                    <tr
                      key={row.category}
                      className={`${i === breakdown.length - 1 ? 'bg-orange-50 font-semibold' : 'hover:bg-gray-50'}`}
                    >
                      <td className="px-5 py-2.5 text-gray-800">{row.category}</td>
                      <td className="px-5 py-2.5 text-right text-gray-700">{row.orders}</td>
                      <td className="px-5 py-2.5 text-right text-gray-700">{formatIDR(row.amount)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          {/* Student list */}
          {studentTotals.length > 0 && (
            <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
              <div className="px-5 py-3 border-b border-gray-100">
                <h3 className="font-semibold text-gray-800">Student Totals ({studentTotals.length})</h3>
              </div>
              <table className="w-full text-sm">
                <thead>
                  <tr className="bg-gray-50 border-b border-gray-100">
                    <th className="text-left px-5 py-2.5 font-medium text-gray-600">Student</th>
                    <th className="text-left px-5 py-2.5 font-medium text-gray-600">Class</th>
                    <th className="text-right px-5 py-2.5 font-medium text-gray-600">Total</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-50">
                  {studentTotals.map((s, i) => (
                    <tr key={i} className="hover:bg-gray-50">
                      <td className="px-5 py-2.5 font-medium text-gray-800">{s.student_name}</td>
                      <td className="px-5 py-2.5 text-gray-500">{s.class_name}</td>
                      <td className="px-5 py-2.5 text-right font-semibold text-gray-800">{formatIDR(s.total)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          {breakdown.length === 0 && studentTotals.length === 0 && (
            <div className="bg-white rounded-xl border border-gray-200 p-8 text-center text-gray-400 text-sm">
              No paid orders found for this school and month.
            </div>
          )}
        </>
      )}
    </div>
  )
}

// ─── Tab 3: Invoice History ───────────────────────────────────────────────────

function InvoiceHistoryTab({ schools }: { schools: School[] }) {
  const [orders, setOrders] = useState<InvoiceOrder[]>([])
  const [loading, setLoading] = useState(true)
  const [schoolFilter, setSchoolFilter] = useState('all')

  const loadOrders = useCallback(async () => {
    setLoading(true)
    let query = supabase
      .from('orders')
      .select(`
        id,
        created_at,
        payment_status,
        total_idr,
        student:students(student_name, class_name),
        school:schools(name)
      `)
      .order('created_at', { ascending: false })
      .limit(200)

    if (schoolFilter !== 'all') {
      query = query.eq('school_id', schoolFilter)
    }

    const { data } = await query
    setOrders((data as unknown as InvoiceOrder[]) || [])
    setLoading(false)
  }, [schoolFilter])

  useEffect(() => {
    loadOrders()
  }, [loadOrders])

  function viewInvoice(orderId: string) {
    window.open(`/api/invoice/${orderId}`, '_blank')
  }

  function downloadInvoice(orderId: string) {
    const a = document.createElement('a')
    a.href = `/api/invoice/${orderId}`
    a.target = '_blank'
    a.click()
  }

  return (
    <div className="space-y-4">
      {/* Filter */}
      <div className="bg-white rounded-xl border border-gray-200 p-4 flex flex-wrap gap-4 items-end">
        <div>
          <label className="block text-xs font-medium text-gray-600 mb-1">School</label>
          <select
            className="border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-orange-400"
            value={schoolFilter}
            onChange={(e) => setSchoolFilter(e.target.value)}
          >
            <option value="all">All Schools</option>
            {schools.map((s) => (
              <option key={s.id} value={s.id}>{s.name}</option>
            ))}
          </select>
        </div>
      </div>

      {/* Table */}
      <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
        {loading ? (
          <div className="flex justify-center py-16">
            <div className="w-8 h-8 border-4 border-orange-500 border-t-transparent rounded-full animate-spin" />
          </div>
        ) : orders.length === 0 ? (
          <div className="p-8 text-center text-gray-400 text-sm">No orders found.</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-gray-50 border-b border-gray-100">
                  <th className="text-left px-4 py-3 font-medium text-gray-600">Order ID</th>
                  <th className="text-left px-4 py-3 font-medium text-gray-600">Student / School</th>
                  <th className="text-left px-4 py-3 font-medium text-gray-600">Date</th>
                  <th className="text-right px-4 py-3 font-medium text-gray-600">Amount</th>
                  <th className="text-center px-4 py-3 font-medium text-gray-600">Status</th>
                  <th className="text-center px-4 py-3 font-medium text-gray-600">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {orders.map((order) => (
                  <tr key={order.id} className="hover:bg-gray-50">
                    <td className="px-4 py-3 font-mono text-gray-500 text-xs">
                      {shortId(order.id)}
                    </td>
                    <td className="px-4 py-3">
                      <div className="font-medium text-gray-800">
                        {order.student?.student_name || 'Unknown'}
                      </div>
                      <div className="text-xs text-gray-400">{order.school?.name || ''}</div>
                    </td>
                    <td className="px-4 py-3 text-gray-600 whitespace-nowrap">
                      {format(parseISO(order.created_at), 'dd MMM yyyy')}
                    </td>
                    <td className="px-4 py-3 text-right font-semibold text-gray-800">
                      {formatIDR(order.total_idr)}
                    </td>
                    <td className="px-4 py-3 text-center">
                      <StatusBadge status={order.payment_status} />
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center justify-center gap-2">
                        <button
                          onClick={() => viewInvoice(order.id)}
                          className="px-3 py-1.5 bg-orange-50 hover:bg-orange-100 text-orange-700 border border-orange-200 rounded-lg text-xs font-medium transition-colors"
                        >
                          View Invoice
                        </button>
                        <button
                          onClick={() => downloadInvoice(order.id)}
                          className="px-3 py-1.5 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-lg text-xs font-medium transition-colors"
                        >
                          Download
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  )
}

// ─── Main Page ────────────────────────────────────────────────────────────────

type Tab = 'outstanding' | 'monthly' | 'history'

export default function AccountingPage() {
  const [activeTab, setActiveTab] = useState<Tab>('outstanding')
  const [schools, setSchools] = useState<School[]>([])

  useEffect(() => {
    supabase
      .from('schools')
      .select('id, name')
      .eq('active', true)
      .order('name')
      .then(({ data }) => setSchools(data || []))
  }, [])

  const tabs: { id: Tab; label: string }[] = [
    { id: 'outstanding', label: 'Outstanding Payments' },
    { id: 'monthly', label: 'Monthly Overview' },
    { id: 'history', label: 'Invoice History' },
  ]

  return (
    <AdminGuard>
      <div className="p-6">
        {/* Header */}
        <div className="mb-6">
          <h1 className="text-2xl font-bold text-gray-900">Accounting</h1>
          <p className="text-gray-500 text-sm mt-0.5">
            Manage payments, invoices, and financial reporting
          </p>
        </div>

        {/* Tabs */}
        <div className="flex gap-1 mb-6 border-b border-gray-200">
          {tabs.map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`px-5 py-2.5 text-sm font-medium rounded-t-lg transition-colors -mb-px ${
                activeTab === tab.id
                  ? 'bg-white border border-b-white border-gray-200 text-orange-600'
                  : 'text-gray-500 hover:text-gray-700'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>

        {/* Tab content */}
        {activeTab === 'outstanding' && <OutstandingTab schools={schools} />}
        {activeTab === 'monthly' && <MonthlyTab schools={schools} />}
        {activeTab === 'history' && <InvoiceHistoryTab schools={schools} />}
      </div>
    </AdminGuard>
  )
}
