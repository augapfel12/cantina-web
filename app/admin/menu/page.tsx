'use client'

import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase'
import { formatOrderDate, getWeekdaysBetween } from '@/lib/utils'
import AdminGuard from '@/components/AdminGuard'
import type { School, Term, MenuDay } from '@/lib/types'
import { format } from 'date-fns'

export default function MenuPage() {
  const [schools, setSchools] = useState<School[]>([])
  const [selectedSchool, setSelectedSchool] = useState<string>('')
  const [terms, setTerms] = useState<Term[]>([])
  const [selectedTerm, setSelectedTerm] = useState<string>('')
  const [menuDays, setMenuDays] = useState<MenuDay[]>([])
  const [loading, setLoading] = useState(false)
  const [editingDay, setEditingDay] = useState<MenuDay | null>(null)
  const [editForm, setEditForm] = useState({
    menu1_name: '',
    menu1_desc: '',
    menu2_name: '',
    menu2_desc: '',
  })
  const [saving, setSaving] = useState(false)
  const [saveMsg, setSaveMsg] = useState('')

  // Load schools
  useEffect(() => {
    supabase
      .from('schools')
      .select('*')
      .eq('active', true)
      .order('name')
      .then(({ data }) => {
        setSchools(data || [])
        if (data && data.length > 0) setSelectedSchool(data[0].id)
      })
  }, [])

  // Load terms when school changes
  useEffect(() => {
    if (!selectedSchool) return
    supabase
      .from('terms')
      .select('*')
      .eq('school_id', selectedSchool)
      .order('start_date', { ascending: false })
      .then(({ data }) => {
        setTerms(data || [])
        if (data && data.length > 0) setSelectedTerm(data[0].id)
      })
  }, [selectedSchool])

  // Load menu days when term changes
  useEffect(() => {
    if (!selectedTerm) return
    setLoading(true)
    supabase
      .from('menu_days')
      .select('*')
      .eq('term_id', selectedTerm)
      .order('date')
      .then(({ data }) => {
        setMenuDays(data || [])
        setLoading(false)
      })
  }, [selectedTerm])

  function openEdit(day: MenuDay | null, date: string) {
    if (day) {
      setEditingDay(day)
      setEditForm({
        menu1_name: day.menu1_name || '',
        menu1_desc: day.menu1_desc || '',
        menu2_name: day.menu2_name || '',
        menu2_desc: day.menu2_desc || '',
      })
    } else {
      // New menu day
      setEditingDay({
        id: '',
        term_id: selectedTerm,
        school_id: selectedSchool,
        date,
        menu1_name: null,
        menu1_desc: null,
        menu2_name: null,
        menu2_desc: null,
        created_at: '',
      })
      setEditForm({ menu1_name: '', menu1_desc: '', menu2_name: '', menu2_desc: '' })
    }
  }

  async function saveMenuDay() {
    if (!editingDay) return
    setSaving(true)
    setSaveMsg('')

    const payload = {
      term_id: selectedTerm,
      school_id: selectedSchool,
      date: editingDay.date,
      menu1_name: editForm.menu1_name || null,
      menu1_desc: editForm.menu1_desc || null,
      menu2_name: editForm.menu2_name || null,
      menu2_desc: editForm.menu2_desc || null,
    }

    let error
    if (editingDay.id) {
      // Update existing
      const res = await supabase.from('menu_days').update(payload).eq('id', editingDay.id)
      error = res.error
    } else {
      // Insert new
      const res = await supabase.from('menu_days').insert(payload)
      error = res.error
    }

    if (error) {
      setSaveMsg(`Error: ${error.message}`)
    } else {
      setSaveMsg('Saved!')
      // Refresh menu days
      const { data } = await supabase
        .from('menu_days')
        .select('*')
        .eq('term_id', selectedTerm)
        .order('date')
      setMenuDays(data || [])
      setTimeout(() => {
        setEditingDay(null)
        setSaveMsg('')
      }, 800)
    }

    setSaving(false)
  }

  const currentTerm = terms.find((t) => t.id === selectedTerm)
  const weekdates = currentTerm
    ? getWeekdaysBetween(currentTerm.start_date, currentTerm.end_date)
    : []
  const menuDayMap: Record<string, MenuDay> = {}
  menuDays.forEach((md) => { menuDayMap[md.date] = md })

  return (
    <AdminGuard>
      <div className="p-6">
        <div className="mb-6">
          <h1 className="text-2xl font-bold text-gray-900">Menu Management</h1>
          <p className="text-gray-500 text-sm mt-0.5">View and edit daily menus per term</p>
        </div>

        {/* Filters */}
        <div className="bg-white rounded-xl border border-gray-200 p-4 mb-6 flex flex-wrap gap-4">
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
            <label className="block text-xs font-medium text-gray-600 mb-1">Term</label>
            <select
              className="border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-orange-400"
              value={selectedTerm}
              onChange={(e) => setSelectedTerm(e.target.value)}
            >
              {terms.map((t) => (
                <option key={t.id} value={t.id}>{t.name}</option>
              ))}
            </select>
          </div>
        </div>

        {/* Edit modal */}
        {editingDay && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-2xl shadow-xl w-full max-w-lg p-6">
              <div className="flex items-center justify-between mb-4">
                <h2 className="font-semibold text-gray-900">
                  Edit Menu — {formatOrderDate(editingDay.date)}
                </h2>
                <button
                  onClick={() => setEditingDay(null)}
                  className="text-gray-400 hover:text-gray-600"
                >
                  <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>

              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Menu 1 Name</label>
                  <input
                    type="text"
                    className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-orange-400"
                    value={editForm.menu1_name}
                    onChange={(e) => setEditForm((f) => ({ ...f, menu1_name: e.target.value }))}
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Menu 1 Description</label>
                  <textarea
                    rows={2}
                    className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-orange-400 resize-none"
                    value={editForm.menu1_desc}
                    onChange={(e) => setEditForm((f) => ({ ...f, menu1_desc: e.target.value }))}
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Menu 2 Name</label>
                  <input
                    type="text"
                    className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-orange-400"
                    value={editForm.menu2_name}
                    onChange={(e) => setEditForm((f) => ({ ...f, menu2_name: e.target.value }))}
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Menu 2 Description</label>
                  <textarea
                    rows={2}
                    className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-orange-400 resize-none"
                    value={editForm.menu2_desc}
                    onChange={(e) => setEditForm((f) => ({ ...f, menu2_desc: e.target.value }))}
                  />
                </div>
              </div>

              {saveMsg && (
                <p className={`mt-3 text-sm ${saveMsg.startsWith('Error') ? 'text-red-600' : 'text-green-600'}`}>
                  {saveMsg}
                </p>
              )}

              <div className="flex gap-3 mt-5">
                <button
                  onClick={saveMenuDay}
                  disabled={saving}
                  className="flex-1 bg-orange-500 hover:bg-orange-600 disabled:bg-gray-300 text-white font-semibold py-2.5 rounded-xl text-sm transition-colors"
                >
                  {saving ? 'Saving…' : 'Save Menu'}
                </button>
                <button
                  onClick={() => setEditingDay(null)}
                  className="px-5 py-2.5 border border-gray-300 rounded-xl text-sm font-medium text-gray-700 hover:bg-gray-50"
                >
                  Cancel
                </button>
              </div>
            </div>
          </div>
        )}

        {loading ? (
          <div className="flex justify-center py-16">
            <div className="w-8 h-8 border-4 border-orange-500 border-t-transparent rounded-full animate-spin" />
          </div>
        ) : !currentTerm ? (
          <div className="bg-white rounded-xl border border-gray-200 p-8 text-center text-gray-500">
            No term found for this school.
          </div>
        ) : (
          <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
            <div className="px-5 py-3 bg-orange-500">
              <h2 className="font-semibold text-white">{currentTerm.name}</h2>
              <p className="text-orange-100 text-sm">
                {format(new Date(currentTerm.start_date), 'dd MMM yyyy')} –{' '}
                {format(new Date(currentTerm.end_date), 'dd MMM yyyy')}
              </p>
            </div>
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-gray-50 border-b border-gray-100">
                  <th className="text-left px-4 py-2.5 font-medium text-gray-600">Date</th>
                  <th className="text-left px-4 py-2.5 font-medium text-gray-600">Menu 1</th>
                  <th className="text-left px-4 py-2.5 font-medium text-gray-600">Menu 2</th>
                  <th className="px-4 py-2.5 w-16" />
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {weekdates.map((date) => {
                  const md = menuDayMap[date]
                  return (
                    <tr key={date} className="hover:bg-gray-50">
                      <td className="px-4 py-3 font-medium text-gray-700 whitespace-nowrap">
                        {formatOrderDate(date)}
                      </td>
                      <td className="px-4 py-3">
                        {md?.menu1_name ? (
                          <div>
                            <p className="font-medium text-gray-800">{md.menu1_name}</p>
                            {md.menu1_desc && (
                              <p className="text-xs text-gray-400 mt-0.5 line-clamp-1">{md.menu1_desc}</p>
                            )}
                          </div>
                        ) : (
                          <span className="text-gray-300">–</span>
                        )}
                      </td>
                      <td className="px-4 py-3">
                        {md?.menu2_name ? (
                          <div>
                            <p className="font-medium text-gray-800">{md.menu2_name}</p>
                            {md.menu2_desc && (
                              <p className="text-xs text-gray-400 mt-0.5 line-clamp-1">{md.menu2_desc}</p>
                            )}
                          </div>
                        ) : (
                          <span className="text-gray-300">–</span>
                        )}
                      </td>
                      <td className="px-4 py-3 text-right">
                        <button
                          onClick={() => openEdit(md || null, date)}
                          className="text-xs font-medium text-orange-500 hover:text-orange-700 hover:underline"
                        >
                          {md ? 'Edit' : 'Add'}
                        </button>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </AdminGuard>
  )
}
