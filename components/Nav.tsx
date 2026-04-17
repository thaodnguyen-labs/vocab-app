'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { Home, ListMusic, Play, Settings, LucideIcon } from 'lucide-react'

interface NavLink {
  href: string
  label: string
  Icon: LucideIcon
  color: string
}

const links: NavLink[] = [
  { href: '/', label: 'Home', Icon: Home, color: 'var(--brand-purple)' },
  { href: '/playlists', label: 'Lists', Icon: ListMusic, color: 'var(--brand-blue)' },
  { href: '/player', label: 'Player', Icon: Play, color: 'var(--brand-amber-dark)' },
  { href: '/settings', label: 'Source', Icon: Settings, color: 'var(--muted)' },
]

export default function Nav() {
  const pathname = usePathname()

  if (pathname === '/login') return null

  return (
    <nav className="fixed bottom-0 left-0 right-0 bg-card border-t-2 border-border z-50">
      <div className="flex justify-around items-center h-16 max-w-lg mx-auto">
        {links.map(({ href, label, Icon, color }) => {
          const active =
            pathname === href ||
            (href === '/playlists' && pathname.startsWith('/learn'))
          return (
            <Link
              key={href}
              href={href}
              className="flex flex-col items-center justify-center px-3 py-2 text-[11px] font-semibold transition-colors"
              style={{ color: active ? color : 'var(--muted)' }}
            >
              <Icon size={22} strokeWidth={active ? 2.5 : 2} />
              <span className="mt-0.5">{label}</span>
            </Link>
          )
        })}
      </div>
    </nav>
  )
}
