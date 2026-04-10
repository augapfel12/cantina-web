'use client'

import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase'
import { format } from 'date-fns'
import AdminGuard from '@/components/AdminGuard'

interface StickerData {
  studentName: string
  className: string
  lunchName: string
  snackName: string
  juiceName: string
  dietFlags: string[]
  schoolName: string
  date: string
}

interface SchoolOption {
  id: string
  name: string
}

export default function StickersPage() {
  const [schools, setSchools] = useState<SchoolOption[]>([])
  const [selectedSchool, setSelectedSchool] = useState<string>('')
  const [selectedDate, setSelectedDate] = useState(format(new Date(), 'yyyy-MM-dd'))
  const [stickers, setStickers] = useState<StickerData[]>([])
  const [loading, setLoading] = useState(false)

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

    async function loadStickers() {
      setLoading(true)

      const [{ data: items }, { data: school }, { data: menuDay }] = await Promise.all([
        supabase
          .from('order_items')
          .select(`
            *,
            orders!inner(school_id, payment_status, students(student_name, class_name, diet_vegan, diet_vegetarian, diet_gluten_free, diet_dairy_free)),
            daily_available(name),
            snacks(name),
            juices(name)
          `)
          .eq('date', selectedDate)
          .eq('orders.school_id', selectedSchool)
          .eq('orders.payment_status', 'paid'),
        supabase.from('schools').select('name').eq('id', selectedSchool).single(),
        supabase
          .from('menu_days')
          .select('menu1_name, menu2_name')
          .eq('school_id', selectedSchool)
          .eq('date', selectedDate)
          .single(),
      ])

      if (!items) {
        setStickers([])
        setLoading(false)
        return
      }

      const stickerList: StickerData[] = items
        .filter((item: any) => item.lunch_choice !== 'none')
        .map((item: any) => {
          const student = item.orders?.students

          let lunchName = ''
          if (item.lunch_choice === 'menu1') lunchName = menuDay?.menu1_name || 'Menu 1'
          else if (item.lunch_choice === 'menu2') lunchName = menuDay?.menu2_name || 'Menu 2'
          else if (item.daily_available?.name) lunchName = item.daily_available.name

          const dietFlags: string[] = []
          if (student?.diet_vegan) dietFlags.push('VEGAN')
          if (student?.diet_vegetarian && !student?.diet_vegan) dietFlags.push('VEGETARIAN')
          if (student?.diet_gluten_free) dietFlags.push('GLUTEN-FREE')
          if (student?.diet_dairy_free) dietFlags.push('DAIRY-FREE')

          return {
            studentName: student?.student_name || 'Unknown',
            className: student?.class_name || '',
            lunchName,
            snackName: item.snacks?.name || '',
            juiceName: item.juices?.name || '',
            dietFlags,
            schoolName: school?.name || '',
            date: selectedDate,
          }
        })

      // Sort by class then name
      stickerList.sort((a, b) =>
        (a.className + a.studentName).localeCompare(b.className + b.studentName)
      )

      setStickers(stickerList)
      setLoading(false)
    }

    loadStickers()
  }, [selectedSchool, selectedDate])

  const dateDisplay = selectedDate
    ? new Date(selectedDate).toLocaleDateString('en-GB', {
        weekday: 'long',
        day: 'numeric',
        month: 'long',
        year: 'numeric',
      })
    : ''

  return (
    <AdminGuard>
      <div className="p-6">
        {/* Header */}
        <div className="mb-6 flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Sticker Labels</h1>
            <p className="text-gray-500 text-sm mt-0.5">Print lunch stickers for students</p>
          </div>
          <button
            onClick={() => window.print()}
            className="flex items-center gap-2 bg-gray-800 hover:bg-gray-900 text-white px-4 py-2 rounded-lg text-sm font-medium transition-colors print:hidden"
          >
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 17h2a2 2 0 002-2v-4a2 2 0 00-2-2H5a2 2 0 00-2 2v4a2 2 0 002 2h2m2 4h6a2 2 0 002-2v-4a2 2 0 00-2-2H9a2 2 0 00-2 2v4a2 2 0 002 2zm8-12V5a2 2 0 00-2-2H9a2 2 0 00-2 2v4h10z" />
            </svg>
            Print Stickers
          </button>
        </div>

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
          {stickers.length > 0 && (
            <div className="flex items-end">
              <span className="text-sm text-gray-500">{stickers.length} stickers</span>
            </div>
          )}
        </div>

        {loading ? (
          <div className="flex justify-center py-16 print:hidden">
            <div className="w-8 h-8 border-4 border-orange-500 border-t-transparent rounded-full animate-spin" />
          </div>
        ) : stickers.length === 0 ? (
          <div className="bg-white rounded-xl border border-gray-200 p-8 text-center text-gray-500 print:hidden">
            No paid orders with lunch for this date and school.
          </div>
        ) : (
          <div
            className="grid gap-3"
            style={{ gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))' }}
            id="sticker-grid"
          >
            {stickers.map((sticker, i) => (
              <StickerLabel key={i} sticker={sticker} date={dateDisplay} />
            ))}
          </div>
        )}
      </div>

      <style jsx global>{`
        @media print {
          * { -webkit-print-color-adjust: exact !important; print-color-adjust: exact !important; }
          body { margin: 0; padding: 0; }
          .print\\:hidden { display: none !important; }
          #sticker-grid {
            display: grid !important;
            grid-template-columns: repeat(3, 1fr) !important;
            gap: 4mm !important;
            padding: 5mm !important;
          }
          .sticker-card {
            break-inside: avoid !important;
            page-break-inside: avoid !important;
            border: 1px solid #ccc !important;
            border-radius: 4mm !important;
            padding: 3mm !important;
            font-size: 9pt !important;
          }
        }
      `}</style>
    </AdminGuard>
  )
}

function StickerLabel({ sticker, date }: { sticker: StickerData; date: string }) {
  const hasDiet = sticker.dietFlags.length > 0

  return (
    <div
      className={`sticker-card bg-white border-2 rounded-xl p-3 text-xs shadow-sm ${
        hasDiet ? 'border-orange-400' : 'border-gray-200'
      }`}
    >
      {/* School + date */}
      <div className="flex items-center justify-between mb-2 pb-1.5 border-b border-gray-100">
        <span className="text-gray-400 text-xs">{sticker.schoolName}</span>
        <span className="text-gray-400 text-xs">{date}</span>
      </div>

      {/* Student name */}
      <p className="font-bold text-gray-900 text-sm leading-tight">{sticker.studentName}</p>
      {sticker.className && (
        <p className="text-gray-500 text-xs mb-2">{sticker.className}</p>
      )}

      {/* Diet flags */}
      {hasDiet && (
        <div className="flex gap-1 flex-wrap mb-2">
          {sticker.dietFlags.map((flag) => (
            <span
              key={flag}
              className="bg-red-100 text-red-700 font-bold px-1.5 py-0.5 rounded text-xs uppercase"
            >
              {flag}
            </span>
          ))}
        </div>
      )}

      {/* Food items */}
      <div className="space-y-1 bg-orange-50 rounded-lg p-2">
        {sticker.lunchName && (
          <div className="flex items-start gap-1">
            <span className="text-orange-400 mt-0.5">🍱</span>
            <span className="text-gray-800 font-medium leading-tight">{sticker.lunchName}</span>
          </div>
        )}
        {sticker.snackName && (
          <div className="flex items-start gap-1">
            <span className="text-orange-400 mt-0.5">🍪</span>
            <span className="text-gray-700 leading-tight">{sticker.snackName}</span>
          </div>
        )}
        {sticker.juiceName && (
          <div className="flex items-start gap-1">
            <span className="text-orange-400 mt-0.5">🥤</span>
            <span className="text-gray-700 leading-tight">{sticker.juiceName}</span>
          </div>
        )}
      </div>

      {/* Cantina brand */}
      <div className="mt-2 pt-1.5 border-t border-gray-100 text-center">
        <span className="text-orange-400 font-bold text-xs tracking-wide">CANTINA</span>
      </div>
    </div>
  )
}
