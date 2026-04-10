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

interface Student {
  id: string
  student_name: string
  class_name: string
  level_id: string
}

interface SchoolLevel {
  id: string
  name: string
}

export default function AccountPage() {
  const router = useRouter()
  const { user, loading: authLoading, profile, signOut } = useAuth()

  // Schools
  const [schools, setSchools] = useState<School[]>([])
  const [loadingSchools, setLoadingSchools] = useState(true)

  // Form values
  const [phone, setPhone] = useState('')
  const [schoolId, setSchoolId] = useState('')

  // Save state
  const [savingPhone, setSavingPhone] = useState(false)
  const [phoneSuccess, setPhoneSuccess] = useState(false)
  const [phoneError, setPhoneError] = useState<string | null>(null)

  const [savingSchool, setSavingSchool] = useState(false)
  const [schoolSuccess, setSchoolSuccess] = useState(false)
  const [schoolError, setSchoolError] = useState<string | null>(null)

  // Children
  const [children, setChildren] = useState<Student[]>([])
  const [levels, setLevels] = useState<SchoolLevel[]>([])
  const [loadingChildren, setLoadingChildren] = useState(false)

  const profileComplete = !!(profile?.school_id && profile?.phone)

  // Redirect if not logged in
  useEffect(() => {
    if (!authLoading && !user) {
      router.replace('/')
    }
  }, [authLoading, user, router])

  // Populate form from profile once loaded
  useEffect(() => {
    if (profile) {
      setPhone(profile.phone ?? '')
      setSchoolId(profile.school_id ?? '')
    }
  }, [profile])

  // Fetch schools
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

  // Fetch children when user is known
  useEffect(() => {
    if (!user) return
    async function fetchChildren() {
      setLoadingChildren(true)
      const { data: students } = await supabase
        .from('students')
        .select('id, student_name, class_name, level_id')
        .eq('user_id', user!.id)
        .order('created_at', { ascending: false })
      setChildren(students ?? [])

      if (students && students.length > 0 && profile?.school_id) {
        const { data: lvls } = await supabase
          .from('school_levels')
          .select('id, name')
          .eq('school_id', profile.school_id)
        setLevels(lvls ?? [])
      }
      setLoadingChildren(false)
    }
    fetchChildren()
  }, [user, profile?.school_id])

  async function handleSavePhone(e: React.FormEvent) {
    e.preventDefault()
    setPhoneError(null)
    setPhoneSuccess(false)
    if (!phone.trim()) {
      setPhoneError('Phone number is required.')
      return
    }
    setSavingPhone(true)
    const { error } = await supabase
      .from('profiles')
      .upsert({ id: user!.id, phone: phone.trim() })
    setSavingPhone(false)
    if (error) {
      setPhoneError('Failed to save. Please try again.')
      return
    }
    setPhoneSuccess(true)
    setTimeout(() => setPhoneSuccess(false), 3000)
  }

  async function handleSaveSchool(e: React.FormEvent) {
    e.preventDefault()
    setSchoolError(null)
    setSchoolSuccess(false)
    if (!schoolId) {
      setSchoolError('Please select a school.')
      return
    }
    setSavingSchool(true)
    const { error } = await supabase
      .from('profiles')
      .upsert({ id: user!.id, school_id: schoolId })
    setSavingSchool(false)
    if (error) {
      setSchoolError('Failed to save. Please try again.')
      return
    }
    setSchoolSuccess(true)
    setTimeout(() => setSchoolSuccess(false), 3000)
  }

  async function handleSignOut() {
    await signOut()
    router.replace('/')
  }

  const selectedSchool = schools.find((s) => s.id === schoolId)

  function getLevelName(levelId: string) {
    return levels.find((l) => l.id === levelId)?.name ?? levelId
  }

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
      {/* Header */}
      <header className="bg-orange-500 px-4 py-4 shadow-md">
        <div className="max-w-lg mx-auto flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 bg-white rounded-full flex items-center justify-center shadow">
              <span className="text-orange-500 font-bold text-base">C</span>
            </div>
            <div>
              <span className="text-white font-bold text-lg leading-tight">Cantina</span>
              <p className="text-orange-100 text-xs">My Account</p>
            </div>
          </div>
          <button
            onClick={handleSignOut}
            className="text-sm text-orange-100 hover:text-white font-medium transition-colors"
          >
            Sign out
          </button>
        </div>
      </header>

      <main className="max-w-lg mx-auto px-4 py-6 space-y-6">
        {/* Incomplete profile banner */}
        {!profileComplete && (
          <div className="bg-orange-50 border-2 border-orange-400 rounded-xl px-4 py-4 flex items-center justify-between gap-4">
            <div>
              <p className="text-orange-700 font-semibold text-sm">
                Please complete your profile to start ordering
              </p>
              <p className="text-orange-600 text-xs mt-1">
                Add your child's details to get started.
              </p>
            </div>
            <a
              href="/account/setup"
              className="shrink-0 bg-orange-500 hover:bg-orange-600 text-white font-semibold px-4 py-2 rounded-xl transition-colors text-sm"
            >
              Complete →
            </a>
          </div>
        )}

        {/* Section 1: Account Details */}
        <section className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
          <div className="px-5 py-4 border-b border-gray-100">
            <h2 className="font-semibold text-gray-800">Account Details</h2>
          </div>
          <div className="px-5 py-5 space-y-4">
            {/* Email — read only */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Email</label>
              <input
                type="email"
                value={user.email ?? ''}
                readOnly
                className="w-full border border-gray-200 rounded-lg px-3 py-2.5 text-sm bg-gray-50 text-gray-500 cursor-not-allowed"
              />
            </div>

            {/* Phone form */}
            <form onSubmit={handleSavePhone} className="space-y-3">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Phone Number{' '}
                  <span className="text-red-500">*</span>
                </label>
                <input
                  type="tel"
                  autoComplete="tel"
                  className={`w-full border rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-orange-400 transition-colors ${
                    !profileComplete && !phone.trim()
                      ? 'border-orange-400 bg-orange-50'
                      : 'border-gray-300'
                  }`}
                  placeholder="+62 812 3456 7890"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  disabled={savingPhone}
                />
              </div>

              {phoneError && (
                <div className="bg-red-50 border border-red-200 rounded-lg px-3 py-2 text-sm text-red-600">
                  {phoneError}
                </div>
              )}
              {phoneSuccess && (
                <div className="bg-green-50 border border-green-200 rounded-lg px-3 py-2 text-sm text-green-700">
                  Phone number saved.
                </div>
              )}

              <button
                type="submit"
                disabled={savingPhone}
                className="bg-orange-500 hover:bg-orange-600 disabled:bg-orange-300 disabled:cursor-not-allowed text-white font-semibold px-5 py-2 rounded-xl transition-colors text-sm flex items-center gap-2"
              >
                {savingPhone ? (
                  <>
                    <span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                    Saving…
                  </>
                ) : (
                  'Save'
                )}
              </button>
            </form>
          </div>
        </section>

        {/* Section 2: My School */}
        <section className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
          <div className="px-5 py-4 border-b border-gray-100">
            <h2 className="font-semibold text-gray-800">My School</h2>
          </div>
          <div className="px-5 py-5 space-y-4">
            <form onSubmit={handleSaveSchool} className="space-y-3">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  School <span className="text-red-500">*</span>
                </label>
                <select
                  className={`w-full border rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-orange-400 bg-white transition-colors ${
                    !profileComplete && !schoolId
                      ? 'border-orange-400 bg-orange-50'
                      : 'border-gray-300'
                  }`}
                  value={schoolId}
                  onChange={(e) => setSchoolId(e.target.value)}
                  disabled={savingSchool || loadingSchools}
                >
                  <option value="">
                    {loadingSchools ? 'Loading schools…' : 'Select your school…'}
                  </option>
                  {schools.map((s) => (
                    <option key={s.id} value={s.id}>
                      {s.name}
                    </option>
                  ))}
                </select>
                <p className="text-xs text-gray-400 mt-1">
                  Your school determines which menu you see.
                </p>
              </div>

              {schoolError && (
                <div className="bg-red-50 border border-red-200 rounded-lg px-3 py-2 text-sm text-red-600">
                  {schoolError}
                </div>
              )}
              {schoolSuccess && (
                <div className="bg-green-50 border border-green-200 rounded-lg px-3 py-2 text-sm text-green-700">
                  School saved.
                </div>
              )}

              <button
                type="submit"
                disabled={savingSchool || loadingSchools}
                className="bg-orange-500 hover:bg-orange-600 disabled:bg-orange-300 disabled:cursor-not-allowed text-white font-semibold px-5 py-2 rounded-xl transition-colors text-sm flex items-center gap-2"
              >
                {savingSchool ? (
                  <>
                    <span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                    Saving…
                  </>
                ) : (
                  'Save'
                )}
              </button>
            </form>

            {/* Profile complete CTA */}
            {profileComplete && selectedSchool && (
              <div className="pt-2 border-t border-gray-100">
                <p className="text-sm text-gray-500 mb-3">
                  Profile complete! You're set up for{' '}
                  <span className="font-medium text-gray-700">{selectedSchool.name}</span>.
                </p>
                <a
                  href={`/${selectedSchool.slug}`}
                  className="inline-flex items-center gap-2 bg-orange-500 hover:bg-orange-600 text-white font-semibold px-5 py-2 rounded-xl transition-colors text-sm"
                >
                  Start Ordering
                  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                  </svg>
                </a>
              </div>
            )}

            {/* After saving both, show CTA even if not yet profileComplete (optimistic) */}
            {!profileComplete && schoolSuccess && phoneSuccess && selectedSchool && (
              <div className="pt-2 border-t border-gray-100">
                <a
                  href={`/${selectedSchool.slug}`}
                  className="inline-flex items-center gap-2 bg-orange-500 hover:bg-orange-600 text-white font-semibold px-5 py-2 rounded-xl transition-colors text-sm"
                >
                  Start Ordering
                  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                  </svg>
                </a>
              </div>
            )}
          </div>
        </section>

        {/* Section 3: My Children */}
        <section className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
          <div className="px-5 py-4 border-b border-gray-100">
            <h2 className="font-semibold text-gray-800">My Children</h2>
          </div>
          <div className="px-5 py-5">
            {loadingChildren ? (
              <div className="flex justify-center py-4">
                <span className="w-6 h-6 border-2 border-orange-400 border-t-transparent rounded-full animate-spin" />
              </div>
            ) : children.length === 0 ? (
                  <div className="text-center py-4">
                <p className="text-sm text-gray-400 mb-3">No children added yet.</p>
                <a
                  href="/account/setup"
                  className="inline-flex items-center gap-2 bg-orange-500 hover:bg-orange-600 text-white font-semibold px-5 py-2 rounded-xl transition-colors text-sm"
                >
                  Add a Child
                </a>
              </div>
            ) : (
              <ul className="space-y-3">
                {children.map((child) => (
                  <li
                    key={child.id}
                    className="flex items-center justify-between bg-gray-50 rounded-xl px-4 py-3"
                  >
                    <div>
                      <p className="text-sm font-semibold text-gray-800">{child.student_name}</p>
                      <p className="text-xs text-gray-500">
                        {child.class_name}
                        {levels.length > 0 && ` · ${getLevelName(child.level_id)}`}
                      </p>
                    </div>
                  </li>
                ))}
              </ul>
            )}

            <div className="mt-4 pt-4 border-t border-gray-100 flex flex-wrap items-center gap-3">
              <a
                href="/account/setup"
                className="inline-flex items-center gap-2 text-sm font-medium text-orange-600 hover:text-orange-700 transition-colors"
              >
                + Add Another Child
              </a>
              {selectedSchool && (
                <a
                  href={`/${selectedSchool.slug}`}
                  className="inline-flex items-center gap-2 text-sm font-medium text-gray-500 hover:text-gray-700 transition-colors ml-auto"
                >
                  Go to order page
                  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                  </svg>
                </a>
              )}
            </div>
          </div>
        </section>
      </main>
    </div>
  )
}
