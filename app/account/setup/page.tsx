'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { useAuth } from '@/lib/auth-context'
import { supabase } from '@/lib/supabase'

interface School {
  id: string
  slug: string
  name: string
}

interface SchoolLevel {
  id: string
  name: string
  sort_order: number
}

const DIET_OPTIONS = [
  { key: 'diet_vegetarian', label: 'Vegetarian' },
  { key: 'diet_vegan', label: 'Vegan (+Rp 15.000/meal)' },
  { key: 'diet_gluten_free', label: 'Gluten-free (+Rp 15.000/meal)' },
  { key: 'diet_dairy_free', label: 'Dairy-free' },
] as const

type DietKey = (typeof DIET_OPTIONS)[number]['key']

export default function AccountSetupPage() {
  const router = useRouter()
  const { user, loading: authLoading } = useAuth()

  // Schools + levels
  const [schools, setSchools] = useState<School[]>([])
  const [levels, setLevels] = useState<SchoolLevel[]>([])
  const [loadingSchools, setLoadingSchools] = useState(true)
  const [loadingLevels, setLoadingLevels] = useState(false)

  // Child details
  const [childFirstName, setChildFirstName] = useState('')
  const [childLastName, setChildLastName] = useState('')
  const [className, setClassName] = useState('')
  const [schoolId, setSchoolId] = useState('')
  const [levelId, setLevelId] = useState('')
  const [allergies, setAllergies] = useState('')

  // Diet
  const [diet, setDiet] = useState<Record<DietKey, boolean>>({
    diet_vegetarian: false,
    diet_vegan: false,
    diet_gluten_free: false,
    diet_dairy_free: false,
  })

  // Parent details
  const [parentFirstName, setParentFirstName] = useState('')
  const [parentLastName, setParentLastName] = useState('')
  const [mobile, setMobile] = useState('')

  // Form state
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)

  // Redirect if not logged in
  useEffect(() => {
    if (!authLoading && !user) {
      router.replace('/')
    }
  }, [authLoading, user, router])

  // Fetch active schools
  useEffect(() => {
    async function fetchSchools() {
      setLoadingSchools(true)
      const { data } = await supabase
        .from('schools')
        .select('id, slug, name')
        .eq('active', true)
        .order('name')
      setSchools(data ?? [])
      setLoadingSchools(false)
    }
    fetchSchools()
  }, [])

  // Fetch levels when school changes
  useEffect(() => {
    if (!schoolId) {
      setLevels([])
      setLevelId('')
      return
    }
    async function fetchLevels() {
      setLoadingLevels(true)
      setLevelId('')
      const { data } = await supabase
        .from('school_levels')
        .select('id, name, sort_order')
        .eq('school_id', schoolId)
        .order('sort_order')
      setLevels(data ?? [])
      setLoadingLevels(false)
    }
    fetchLevels()
  }, [schoolId])

  function toggleDiet(key: DietKey) {
    setDiet((prev) => ({ ...prev, [key]: !prev[key] }))
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError(null)

    // Validation
    if (!childFirstName.trim()) return setError('Child first name is required.')
    if (!childLastName.trim()) return setError('Child last name is required.')
    if (!schoolId) return setError('Please select a school.')
    if (!levelId) return setError('Please select a level (Primary or Secondary).')
    if (!parentFirstName.trim()) return setError('Parent first name is required.')
    if (!parentLastName.trim()) return setError('Parent last name is required.')
    if (!mobile.trim()) return setError('Mobile number is required.')

    setSaving(true)

    const studentName = `${childFirstName.trim()} ${childLastName.trim()}`
    const parentName = `${parentFirstName.trim()} ${parentLastName.trim()}`

    // Insert into students table
    const { error: studentError } = await supabase.from('students').insert({
      user_id: user!.id,
      school_id: schoolId,
      level_id: levelId,
      student_name: studentName,
      class_name: className.trim() || null,
      parent_name: parentName,
      parent_email: user!.email,
      parent_phone: mobile.trim(),
      diet_vegetarian: diet.diet_vegetarian,
      diet_vegan: diet.diet_vegan,
      diet_gluten_free: diet.diet_gluten_free,
      diet_dairy_free: diet.diet_dairy_free,
    })

    if (studentError) {
      setSaving(false)
      setError('Failed to save student details. ' + studentError.message)
      return
    }

    // Upsert profile with phone + school_id
    const { error: profileError } = await supabase.from('profiles').upsert({
      id: user!.id,
      phone: mobile.trim(),
      school_id: schoolId,
    })

    if (profileError) {
      setSaving(false)
      setError('Student saved, but failed to update profile. ' + profileError.message)
      return
    }

    // Redirect to school order page
    const selectedSchool = schools.find((s) => s.id === schoolId)
    if (selectedSchool?.slug) {
      window.location.href = `/${selectedSchool.slug}`
    } else {
      router.replace('/account')
    }
  }

  const inputClass =
    'w-full border border-gray-300 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-orange-400 focus:border-transparent transition-colors bg-white'

  const labelClass = 'block text-sm font-medium text-gray-700 mb-1'

  if (authLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="inline-block w-10 h-10 border-4 border-orange-500 border-t-transparent rounded-full animate-spin" />
      </div>
    )
  }

  if (!user) return null

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Orange header */}
      <header className="bg-orange-500 px-4 py-4 shadow-md">
        <div className="max-w-2xl mx-auto flex items-center gap-3">
          <div className="w-9 h-9 bg-white rounded-full flex items-center justify-center shadow">
            <span className="text-orange-500 font-bold text-base">C</span>
          </div>
          <div>
            <span className="text-white font-bold text-lg leading-tight">Cantina</span>
            <p className="text-orange-100 text-xs">Complete Your Profile</p>
          </div>
        </div>
      </header>

      <main className="max-w-2xl mx-auto px-4 py-8">
        <div className="mb-6">
          <h1 className="text-2xl font-bold text-gray-900">Student Profile</h1>
          <p className="text-gray-500 text-sm mt-1">
            Tell us about your child so we can set up their lunch orders.
          </p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-6">

          {/* CHILD DETAILS */}
          <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
            <div className="px-6 py-3 bg-gray-50 border-b border-gray-100">
              <h2 className="text-xs font-semibold text-gray-400 uppercase tracking-wider">Child Details</h2>
            </div>
            <div className="px-6 py-5 space-y-4">
              {/* First + Last name */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className={labelClass}>
                    First Name <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    className={inputClass}
                    placeholder="e.g. Sari"
                    value={childFirstName}
                    onChange={(e) => setChildFirstName(e.target.value)}
                    disabled={saving}
                  />
                </div>
                <div>
                  <label className={labelClass}>
                    Last Name <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    className={inputClass}
                    placeholder="e.g. Wijaya"
                    value={childLastName}
                    onChange={(e) => setChildLastName(e.target.value)}
                    disabled={saving}
                  />
                </div>
              </div>

              {/* Class + School */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className={labelClass}>Class / Grade</label>
                  <input
                    type="text"
                    className={inputClass}
                    placeholder="e.g. Grade 3A"
                    value={className}
                    onChange={(e) => setClassName(e.target.value)}
                    disabled={saving}
                  />
                </div>
                <div>
                  <label className={labelClass}>
                    School <span className="text-red-500">*</span>
                  </label>
                  <select
                    className={inputClass}
                    value={schoolId}
                    onChange={(e) => setSchoolId(e.target.value)}
                    disabled={saving || loadingSchools}
                  >
                    <option value="">
                      {loadingSchools ? 'Loading…' : 'Select school…'}
                    </option>
                    {schools.map((s) => (
                      <option key={s.id} value={s.id}>
                        {s.name}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              {/* Level */}
              <div>
                <label className={labelClass}>
                  Level <span className="text-red-500">*</span>
                </label>
                {loadingLevels ? (
                  <div className="flex items-center gap-2 text-sm text-gray-400 py-2">
                    <span className="w-4 h-4 border-2 border-orange-400 border-t-transparent rounded-full animate-spin" />
                    Loading levels…
                  </div>
                ) : levels.length === 0 ? (
                  <p className="text-sm text-gray-400 py-2">
                    {schoolId ? 'No levels found for this school.' : 'Select a school first.'}
                  </p>
                ) : (
                  <div className="flex flex-wrap gap-3 mt-1">
                    {levels.map((lvl) => (
                      <label
                        key={lvl.id}
                        className={`flex items-center gap-2 px-4 py-2.5 rounded-lg border cursor-pointer transition-colors text-sm font-medium select-none ${
                          levelId === lvl.id
                            ? 'border-orange-500 bg-orange-50 text-orange-700'
                            : 'border-gray-300 text-gray-700 hover:border-gray-400'
                        }`}
                      >
                        <input
                          type="radio"
                          name="level"
                          value={lvl.id}
                          checked={levelId === lvl.id}
                          onChange={() => setLevelId(lvl.id)}
                          className="accent-orange-500"
                          disabled={saving}
                        />
                        {lvl.name}
                      </label>
                    ))}
                  </div>
                )}
                <p className="text-xs text-gray-400 mt-1.5">Affects meal pricing.</p>
              </div>

              {/* Allergies */}
              <div>
                <label className={labelClass}>Allergies / Special Notes</label>
                <textarea
                  className={`${inputClass} resize-none`}
                  rows={3}
                  placeholder="e.g. Nut allergy, no shellfish…"
                  value={allergies}
                  onChange={(e) => setAllergies(e.target.value)}
                  disabled={saving}
                />
              </div>
            </div>
          </div>

          {/* DIET */}
          <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
            <div className="px-6 py-3 bg-gray-50 border-b border-gray-100">
              <h2 className="text-xs font-semibold text-gray-400 uppercase tracking-wider">Diet</h2>
            </div>
            <div className="px-6 py-5">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {DIET_OPTIONS.map(({ key, label }) => (
                  <label
                    key={key}
                    className={`flex items-center gap-3 px-4 py-3 rounded-lg border cursor-pointer transition-colors text-sm select-none ${
                      diet[key]
                        ? 'border-orange-400 bg-orange-50 text-orange-700 font-medium'
                        : 'border-gray-200 text-gray-700 hover:border-gray-300'
                    }`}
                  >
                    <input
                      type="checkbox"
                      checked={diet[key]}
                      onChange={() => toggleDiet(key)}
                      className="accent-orange-500 w-4 h-4 shrink-0"
                      disabled={saving}
                    />
                    {label}
                  </label>
                ))}
              </div>
            </div>
          </div>

          {/* PARENT / GUARDIAN DETAILS */}
          <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
            <div className="px-6 py-3 bg-gray-50 border-b border-gray-100">
              <h2 className="text-xs font-semibold text-gray-400 uppercase tracking-wider">Parent / Guardian Details</h2>
            </div>
            <div className="px-6 py-5 space-y-4">
              {/* First + Last name */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className={labelClass}>
                    First Name <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    className={inputClass}
                    placeholder="e.g. Budi"
                    value={parentFirstName}
                    onChange={(e) => setParentFirstName(e.target.value)}
                    disabled={saving}
                  />
                </div>
                <div>
                  <label className={labelClass}>
                    Last Name <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    className={inputClass}
                    placeholder="e.g. Santoso"
                    value={parentLastName}
                    onChange={(e) => setParentLastName(e.target.value)}
                    disabled={saving}
                  />
                </div>
              </div>

              {/* Email — read only */}
              <div>
                <label className={labelClass}>Email</label>
                <input
                  type="email"
                  value={user.email ?? ''}
                  readOnly
                  className="w-full border border-gray-200 rounded-lg px-3 py-2.5 text-sm bg-gray-50 text-gray-400 cursor-not-allowed"
                />
              </div>

              {/* Mobile */}
              <div>
                <label className={labelClass}>
                  Mobile Number <span className="text-red-500">*</span>
                </label>
                <input
                  type="tel"
                  autoComplete="tel"
                  className={inputClass}
                  placeholder="+62 812 3456 7890"
                  value={mobile}
                  onChange={(e) => setMobile(e.target.value)}
                  disabled={saving}
                />
              </div>
            </div>
          </div>

          {/* Error */}
          {error && (
            <div className="bg-red-50 border border-red-200 rounded-xl px-4 py-3 text-sm text-red-600">
              {error}
            </div>
          )}

          {/* Submit */}
          <button
            type="submit"
            disabled={saving}
            className="w-full bg-orange-500 hover:bg-orange-600 disabled:bg-orange-300 disabled:cursor-not-allowed text-white font-semibold py-3 rounded-xl transition-colors text-base flex items-center justify-center gap-2"
          >
            {saving ? (
              <>
                <span className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                Saving…
              </>
            ) : (
              'Save & Continue'
            )}
          </button>

          <p className="text-center text-xs text-gray-400 pb-8">
            You can update these details later from your account page.
          </p>
        </form>
      </main>
    </div>
  )
}
