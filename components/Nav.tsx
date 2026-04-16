'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'

const links = [
  { href: '/', label: 'Home' },
  { href: '/vocab', label: 'Vocab' },
  { href: '/playlists', label: 'Lists' },
  { href: '/player', label: 'Player' },
  { href: '/sync', label: 'Sync' },
]

export default function Nav() {
  const pathname = usePathname()

  if (pathname === '/login') return null

  return (
    <nav className="fixed bottom-0 left-0 right-0 bg-card border-t border-border z-50">
      <div className="flex justify-around items-center h-14 max-w-lg mx-auto">
        {links.map((link) => {
          const active =
            pathname === link.href ||
            (link.href === '/playlists' && pathname.startsWith('/learn')) ||
            (link.href === '/sync' && pathname === '/import')
          return (
            <Link
              key={link.href}
              href={link.href}
              className={`flex items-center justify-center px-3 py-2 text-sm transition-colors ${
                active ? 'text-foreground font-semibold' : 'text-muted'
              }`}
            >
              {link.label}
            </Link>
          )
        })}
      </div>
    </nav>
  )
}
