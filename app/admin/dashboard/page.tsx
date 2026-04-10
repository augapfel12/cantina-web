'use client'

import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase'
import { formatIDR } from '@/lib/utils'
import { format } from 'date-fns'
import AdminGuard from '@/components/AdminGuard'
import Link from 'next/link'

interface DashboardStats {
  todayOrderItems: number
  todayRevenue: number
  pendingOrders: number
  paidOrders: number
  schoolBreakdown: { name: string; count: number }[]
}

export default function DashboardPage() {
  const [stats, setStats] = useState<DashboardStats | null>(null)
  const [loading, setLoading] = useState(true)
  const today = format(new Date(), 'yyyy-MM-dd')

  useEffect(() => {
    async function loadStats() {
      setLoading(true)

      // Today's order items
      const { data: todayItems } = await supabase
        .from('order_items')
        .select('*, orders(payment_status, total_idr, school_id, schools(name))')
        .eq('date', today)

      // All orders
      const { data: allOrders } = await supabase
        .from('orders')
        .select('payment_status, total_idr')

      const paidToday =
        todayItems?.filter(
          (item: any) => item.orders?.payment_status === 'paid'
        ) || []

      const todayRevenue = paidToday.reduce((sum: number, item: any) => {
        return sum + (item.orders?.total_idr || 0)
      }, 0)

      // School breakdown today
      const schoolCounts: Record<string, { name: string; count: number }> = {}
      todayItems?.forEach((item: any) => {
        const schoolId = item.orders?.school_id
        const schoolName = item.orders?.schools?.name || 'Unknown'
        if (schoolId) {
          if (!schoolCounts[schoolId]) schoolCounts[schoolId] = { name: schoolName, count: 0 }
          schoolCounts[schoolId].count++
        }
      })

      setStats({
        todayOrderItems: todayItems?.length || 0,
        todayRevenue,
        pendingOrders: allOrders?.filter((o: any) => o.payment_status === 'pending').length || 0,
        paidOrders: allOrders?.filter((o: any) => o.payment_status === 'paid').length || 0,
        schoolBreakdown: Object.values(schoolCounts),
      })

      setLoading(false)
    }

    loadStats()
  }, [today])

  return (
    <AdminGuard>
      <div className="p-6">
        {/* Header */}
        <div className="mb-6">
          <h1 className="text-2xl font-bold text-gray-900">Dashboard</h1>
          <p className="text-gray-500 text-sm mt-0.5">
            {format(new Date(), 'EEEE, dd MMMM yyyy')}
          </p>
        </div>

        {loading ? (
          <div className="flex items-center justify-center py-16">
            <div className="w-8 h-8 border-4 border-orange-500 border-t-transparent rounded-full animate-spin" />
          </div>
        ) : (
          <>
            {/* Stats grid */}
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
              <StatCard
                title="Lunches Today"
                value={stats?.todayOrderItems.toString() || '0'}
                icon="🍱"
                color="orange"
              />
              <StatCard
                title="Revenue Today"
                value={formatIDR(stats?.todayRevenue || 0)}
                icon="💰"
                color="green"
              />
              <StatCard
                title="Paid Orders"
                value={stats?.paidOrders.toString() || '0'}
                icon="✅"
                color="blue"
              />
              <StatCard
                title="Pending Payment"
                value={stats?.pendingOrders.toString() || '0'}
                icon="⏳"
                color="yellow"
              />
            </div>

            {/* Today's school breakdown */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
              <div className="bg-white rounded-xl border border-gray-200 p-5">
                <h2 className="font-semibold text-gray-800 mb-4">Today by School</h2>
                {stats?.schoolBreakdown.length === 0 ? (
                  <p className="text-gray-400 text-sm">No orders for today yet.</p>
                ) : (
                  <div className="space-y-2">
                    {stats?.schoolBreakdown.map((s) => (
                      <div key={s.name} className="flex items-center justify-between">
                        <span className="text-sm text-gray-700">{s.name}</span>
                        <span className="font-semibold text-orange-600">{s.count} lunches</span>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Quick links */}
              <div className="bg-white rounded-xl border border-gray-200 p-5">
                <h2 className="font-semibold text-gray-800 mb-4">Quick Actions</h2>
                <div className="grid grid-cols-2 gap-3">
                  {[
                    { href: '/admin/orders', label: "Today's Orders", icon: '📋' },
                    { href: '/admin/kitchen', label: 'Kitchen List', icon: '👨‍🍳' },
                    { href: '/admin/stickers', label: 'Print Stickers', icon: '🏷️' },
                    { href: '/admin/menu', label: 'Manage Menu', icon: '🍽️' },
                  ].map((link) => (
                    <Link
                      key={link.href}
                      href={link.href}
                      className="flex items-center gap-2 p-3 bg-gray-50 hover:bg-orange-50 border border-gray-200 hover:border-orange-200 rounded-lg transition-colors text-sm font-medium text-gray-700 hover:text-orange-700"
                    >
                      <span className="text-base">{link.icon}</span>
                      {link.label}
                    </Link>
                  ))}
                </div>
              </div>
            </div>
          </>
        )}
      </div>
    </AdminGuard>
  )
}

function StatCard({
  title,
  value,
  icon,
  color,
}: {
  title: string
  value: string
  icon: string
  color: 'orange' | 'green' | 'blue' | 'yellow'
}) {
  const colorMap = {
    orange: 'bg-orange-50 border-orange-200',
    green: 'bg-green-50 border-green-200',
    blue: 'bg-blue-50 border-blue-200',
    yellow: 'bg-yellow-50 border-yellow-200',
  }

  return (
    <div className={`rounded-xl border p-4 ${colorMap[color]}`}>
      <div className="flex items-center gap-2 mb-1">
        <span className="text-xl">{icon}</span>
        <p className="text-xs font-medium text-gray-500 uppercase tracking-wide">{title}</p>
      </div>
      <p className="text-xl font-bold text-gray-900">{value}</p>
    </div>
  )
}
