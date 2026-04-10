'use client'

import { useEffect } from 'react'
import Link from 'next/link'
import { useAuth } from '@/lib/auth-context'
import { supabase } from '@/lib/supabase'
import AuthModal from '@/components/AuthModal'

export default function HomePage() {
  const { user, loading, profile } = useAuth()

  useEffect(() => {
    if (loading) return
    if (!user) return

    // Profile incomplete → go to setup page to complete it
    if (!profile?.school_id || !profile?.phone) {
      window.location.href = '/account/setup'
      return
    }

    // Profile complete → redirect to school order page
    async function redirect() {
      const { data: school } = await supabase
        .from('schools')
        .select('slug')
        .eq('id', profile!.school_id)
        .single()

      if (school?.slug) {
        window.location.href = `/${school.slug}`
      }
    }

    redirect()
  }, [user, loading, profile])

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="inline-block w-10 h-10 border-4 border-orange-500 border-t-transparent rounded-full animate-spin" />
      </div>
    )
  }

  // Logged-in user — show spinner while redirect resolves
  if (user) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="inline-block w-10 h-10 border-4 border-orange-500 border-t-transparent rounded-full animate-spin" />
      </div>
    )
  }

  // Not logged in — show auth modal centered on orange branded page
  return (
    <div className="min-h-screen bg-orange-500 flex flex-col">
      {/* Header */}
      <header className="py-12 text-center">
        <div className="w-20 h-20 bg-white rounded-2xl flex items-center justify-center mx-auto mb-4 shadow-lg">
          <span className="text-orange-500 font-bold text-4xl">C</span>
        </div>
        <h1 className="text-white font-bold text-4xl mb-2">Cantina</h1>
        <p className="text-orange-100 text-lg">School Lunch Bali</p>
      </header>

      {/* Auth form — rendered inline without overlay */}
      <div className="flex-1 flex items-start justify-center px-4 pb-12">
        <AuthModal />
      </div>

      {/* Admin link */}
      <div className="text-center pb-6">
        <Link
          href="/admin"
          className="text-sm text-orange-200 hover:text-white transition-colors"
        >
          Admin →
        </Link>
      </div>
    </div>
  )
}
