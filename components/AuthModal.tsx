'use client'

import { useState } from 'react'
import { useAuth } from '@/lib/auth-context'
import { supabase } from '@/lib/supabase'

interface AuthModalProps {
  onSuccess?: () => void
}

export default function AuthModal({ onSuccess }: AuthModalProps) {
  const { signIn, signUp } = useAuth()
  const [tab, setTab] = useState<'signin' | 'signup'>('signin')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)

  function resetForm() {
    setEmail('')
    setPassword('')
    setConfirmPassword('')
    setError(null)
  }

  function switchTab(t: 'signin' | 'signup') {
    setTab(t)
    resetForm()
  }

  async function handleSignIn(e: React.FormEvent) {
    e.preventDefault()
    setError(null)
    if (!email.trim() || !password) {
      setError('Please enter your email and password.')
      return
    }
    setLoading(true)
    const { error: signInError } = await signIn(email.trim(), password)
    if (signInError) {
      setLoading(false)
      setError(signInError)
      return
    }

    // Fetch profile to determine redirect
    const { data: { user } } = await supabase.auth.getUser()
    if (user) {
      const { data: profile } = await supabase
        .from('profiles')
        .select('school_id, phone')
        .eq('id', user.id)
        .single()

      if (profile?.school_id && profile?.phone) {
        const { data: school } = await supabase
          .from('schools')
          .select('slug')
          .eq('id', profile.school_id)
          .single()

        if (school?.slug) {
          window.location.href = `/${school.slug}`
          return
        }
      }
    }

    // Incomplete profile — go to setup page
    window.location.href = '/account/setup'
  }

  async function handleSignUp(e: React.FormEvent) {
    e.preventDefault()
    setError(null)
    if (!email.trim() || !password) {
      setError('Please enter your email and password.')
      return
    }
    if (password.length < 6) {
      setError('Password must be at least 6 characters.')
      return
    }
    if (password !== confirmPassword) {
      setError('Passwords do not match.')
      return
    }
    setLoading(true)
    const { error: signUpError } = await signUp(email.trim(), password)
    setLoading(false)
    if (signUpError) {
      setError(signUpError)
      return
    }

    // No email confirmation — go straight to profile setup
    window.location.href = '/account/setup'
  }

  return (
    <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md overflow-hidden">
      {/* Header */}
      <div className="bg-orange-500 px-6 py-5">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 bg-white rounded-full flex items-center justify-center shadow">
            <span className="text-orange-500 font-bold text-base">C</span>
          </div>
          <div>
            <h2 className="text-white font-bold text-lg leading-tight">Cantina</h2>
            <p className="text-orange-100 text-xs">School Lunch Ordering</p>
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex border-b border-gray-200">
        <button
          onClick={() => switchTab('signin')}
          className={`flex-1 py-3 text-sm font-semibold transition-colors ${
            tab === 'signin'
              ? 'text-orange-600 border-b-2 border-orange-500'
              : 'text-gray-500 hover:text-gray-700'
          }`}
        >
          Sign In
        </button>
        <button
          onClick={() => switchTab('signup')}
          className={`flex-1 py-3 text-sm font-semibold transition-colors ${
            tab === 'signup'
              ? 'text-orange-600 border-b-2 border-orange-500'
              : 'text-gray-500 hover:text-gray-700'
          }`}
        >
          Create Account
        </button>
      </div>

      <div className="px-6 py-6">
        {tab === 'signin' ? (
          <form onSubmit={handleSignIn} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Email</label>
              <input
                type="email"
                autoComplete="email"
                className="w-full border border-gray-300 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-orange-400"
                placeholder="you@example.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                disabled={loading}
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Password</label>
              <input
                type="password"
                autoComplete="current-password"
                className="w-full border border-gray-300 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-orange-400"
                placeholder="••••••••"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                disabled={loading}
              />
            </div>

            {error && (
              <div className="bg-red-50 border border-red-200 rounded-lg px-3 py-2 text-sm text-red-600">
                {error}
              </div>
            )}

            <button
              type="submit"
              disabled={loading}
              className="w-full bg-orange-500 hover:bg-orange-600 disabled:bg-orange-300 disabled:cursor-not-allowed text-white font-semibold py-2.5 rounded-xl transition-colors text-sm flex items-center justify-center gap-2"
            >
              {loading ? (
                <>
                  <span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                  Signing in…
                </>
              ) : (
                'Sign In'
              )}
            </button>

            <p className="text-center text-xs text-gray-500">
              No account yet?{' '}
              <button
                type="button"
                onClick={() => switchTab('signup')}
                className="text-orange-600 font-medium hover:text-orange-700"
              >
                Create one
              </button>
            </p>
          </form>
        ) : (
          <form onSubmit={handleSignUp} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Email</label>
              <input
                type="email"
                autoComplete="email"
                className="w-full border border-gray-300 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-orange-400"
                placeholder="you@example.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                disabled={loading}
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Password</label>
              <input
                type="password"
                autoComplete="new-password"
                className="w-full border border-gray-300 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-orange-400"
                placeholder="Min. 6 characters"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                disabled={loading}
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Confirm Password</label>
              <input
                type="password"
                autoComplete="new-password"
                className="w-full border border-gray-300 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-orange-400"
                placeholder="Re-enter password"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                disabled={loading}
              />
            </div>

            {error && (
              <div className="bg-red-50 border border-red-200 rounded-lg px-3 py-2 text-sm text-red-600">
                {error}
              </div>
            )}

            <button
              type="submit"
              disabled={loading}
              className="w-full bg-orange-500 hover:bg-orange-600 disabled:bg-orange-300 disabled:cursor-not-allowed text-white font-semibold py-2.5 rounded-xl transition-colors text-sm flex items-center justify-center gap-2"
            >
              {loading ? (
                <>
                  <span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                  Creating account…
                </>
              ) : (
                'Create Account'
              )}
            </button>

            <p className="text-center text-xs text-gray-500">
              Already have an account?{' '}
              <button
                type="button"
                onClick={() => switchTab('signin')}
                className="text-orange-600 font-medium hover:text-orange-700"
              >
                Sign in
              </button>
            </p>
          </form>
        )}
      </div>
    </div>
  )
}
