'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import AdminNav from './AdminNav'

export default function AdminGuard({ children }: { children: React.ReactNode }) {
  const [authorized, setAuthorized] = useState<boolean | null>(null)
  const router = useRouter()

  useEffect(() => {
    const isAdmin = sessionStorage.getItem('cantina_admin') === 'true'
    if (!isAdmin) {
      router.push('/admin')
    } else {
      setAuthorized(true)
    }
  }, [router])

  if (authorized === null) {
    return (
      <div className="min-h-screen bg-gray-900 flex items-center justify-center">
        <div className="w-8 h-8 border-4 border-orange-500 border-t-transparent rounded-full animate-spin" />
      </div>
    )
  }

  return (
    <div className="flex min-h-screen bg-gray-100">
      <AdminNav />
      <main className="flex-1 overflow-auto">
        {children}
      </main>
    </div>
  )
}
