import type { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'Cantina Admin',
  description: 'Cantina school lunch management',
}

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>
}
